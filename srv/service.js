"use strict";

/**
 * Bid Equalization Service – Request Handler
 * =====================================================================
 * Implements custom action logic for:
 *   - calculateComparison  : evaluate active formula for two suppliers
 *   - saveComparison       : persist result to BidComparison table
 *   - markBenchmark        : set benchmark supplier per RFQ item
 *   - generatePDF          : create PDF report using pdfkit
 * =====================================================================
 */

const cds = require("@sap/cds");

module.exports = class BidEqualizationService extends cds.ApplicationService {
  async init() {
    // ─────────────────────────────────────────────────────────────
    // ACTION: calculateComparison
    // ─────────────────────────────────────────────────────────────
    this.on("calculateComparison", async (req) => {
  try {
    const data = req.data;

    const bidValue = parseFloat(data.leftBidValue) || 0;

    // ================= FETCH MATCHING FORMULA =================
    const formula = await SELECT.one.from("BidEqualization.BidFormula")
      .where({
        isActive: true,
        leftBenchmarkBidType: data.leftBenchmarkBidType,
        leftDevelopmentType: data.leftDevelopmentType,
        leftDeliveryMode: data.leftDeliveryMode,
        leftExceptionalWeight: data.leftExceptionalWeight,
        leftBidValueRange: data.leftBidValueRange,
        rightLocalBidType:data.rightLocalBidType
      });
    if (!formula) {
      req.error(400, "No matching formula found");
      return data;
    }

    // ================= EVALUATE =================
    const leftEqualizedBid = _evaluateFormula(formula, {
      bidValue,
      shippingCost: parseFloat(data.leftShippingCost) || 0,
      handlingCost: parseFloat(data.leftHandlingCost) || 0,
      euc: parseFloat(data.leftEUC) || 0,
      customDuty: (data.leftSaudiCustomsRate || 0) / 100,
      premiumRate: (data.leftSaudiManufacturerPremium || 0) / 100      
    });

    return {
      leftEqualizedBid,
      formulaName: formula.name,
      formulaExpr: formula.expression
    };

  } catch (err) {
    console.error(err);
    req.error(500, "Error calculating comparison");
  }
});



    this.on("calculateComparison1", async (req) => {
      const { rfqItemID, supplierLeft, supplierRight } = req.data;
      const db = cds.db;

      // 1. Fetch the active formula
      const formula = await db.run(
        SELECT.one.from("BidEqualization.BidFormula").where({ isActive: true }),
      );
      if (!formula) {
        return req.error(
          404,
          "No active formula found. Please activate a BidFormula record.",
        );
      }

      // 2. Fetch the bid for Left supplier
      const bidLeft = await db.run(
        SELECT.one
          .from("BidEqualization.SupplierBid")
          .where({ rfqItem_ID: rfqItemID, supplier_ID: supplierLeft }),
      );
      if (!bidLeft) {
        return req.error(
          404,
          `No bid found for left supplier ${supplierLeft} on item ${rfqItemID}`,
        );
      }

      // 3. Fetch the bid for Right supplier
      const bidRight = await db.run(
        SELECT.one
          .from("BidEqualization.SupplierBid")
          .where({ rfqItem_ID: rfqItemID, supplier_ID: supplierRight }),
      );
      if (!bidRight) {
        return req.error(
          404,
          `No bid found for right supplier ${supplierRight} on item ${rfqItemID}`,
        );
      }

      // 4. Evaluate formula dynamically for each bid
      const equalizedLeft = _evaluateFormula(formula.expression, bidLeft);
      const equalizedRight = _evaluateFormula(formula.expression, bidRight);

      // 5. Determine winner (lower equalized bid wins)
      const winner =
        equalizedLeft <= equalizedRight ? supplierLeft : supplierRight;

      return {
        equalizedLeft,
        equalizedRight,
        winner,
        formulaName: formula.name,
        formulaExpr: formula.expression,
      };
    });

    // ─────────────────────────────────────────────────────────────
    // ACTION: saveComparison
    // ─────────────────────────────────────────────────────────────
    this.on("saveComparison", async (req) => {
      const {
        rfqItemID,
        supplierLeftID,
        supplierRightID,
        equalizedLeft,
        equalizedRight,
        winnerID,
        notes,
      } = req.data;
      const db = cds.db;

      // Insert new BidComparison record
      const id = cds.utils.uuid();
      await db.run(
        INSERT.into("BidEqualization.BidComparison").entries({
          ID: id,
          rfqItem_ID: rfqItemID,
          supplierLeft_ID: supplierLeftID,
          supplierRight_ID: supplierRightID,
          equalizedBidLeft: equalizedLeft,
          equalizedBidRight: equalizedRight,
          winnerSupplier_ID: winnerID,
          notes: notes || "",
          createdAt: new Date().toISOString(),
          modifiedAt: new Date().toISOString(),
          createdBy: req.user?.id || "system",
          modifiedBy: req.user?.id || "system",
        }),
      );

      // Return the saved comparison
      const saved = await db.run(
        SELECT.one.from("BidEqualization.BidComparison").where({ ID: id }),
      );
      return saved;
    });

    // ─────────────────────────────────────────────────────────────
    // ACTION: markBenchmark
    // ─────────────────────────────────────────────────────────────
    this.on("markBenchmark", async (req) => {
      const { rfqItemID, supplierID } = req.data;
      const db = cds.db;

      // Clear existing benchmark for this item
      await db.run(
        UPDATE("BidEqualization.SupplierBid")
          .set({ isBenchmark: false })
          .where({ rfqItem_ID: rfqItemID }),
      );

      // Set new benchmark
      await db.run(
        UPDATE("BidEqualization.SupplierBid")
          .set({ isBenchmark: true })
          .where({ rfqItem_ID: rfqItemID, supplier_ID: supplierID }),
      );

      return true;
    });

    // ─────────────────────────────────────────────────────────────
    // ACTION: generatePDF
    // ─────────────────────────────────────────────────────────────
    
    this.on("generatePDF", async (req) => {
      const { comparisonID } = req.data;
      const db = cds.db;

      // Fetch the comparison record
      const comparison = await db.run(
        SELECT.one
          .from("BidEqualization.BidComparison")
          .where({ ID: comparisonID }),
      );
      if (!comparison) {
        return req.error(404, `BidComparison ${comparisonID} not found`);
      }

      // Fetch related entities for report content
      const [rfqItem] = await Promise.all([
        db.run(
          SELECT.one
            .from("BidEqualization.RFQItem")
            .where({ ID: comparison.rfqItem_ID }),
        ),
      ]);

      // Fetch RFQ event
      const rfqEvent = rfqItem
        ? await db.run(
            SELECT.one
              .from("BidEqualization.RFQEvent")
              .where({ eventID: rfqItem.rfq_eventID }),
          )
        : null;
       const pdfBuffer = await _generatePDFBuffer({
        comparison,
        rfqEvent,
        rfqItem
      });


      const res = req._.res; 

res.setHeader("Content-Type", "application/pdf");
res.setHeader(
  "Content-Disposition",
  `attachment; filename="BidComparison_${comparisonID}.pdf"`
);
res.setHeader("Content-Length", pdfBuffer.length);

// Send binary directly
res.end(pdfBuffer);

// Tell CAP: response already handled
return;







    });

    // Register default CRUD handlers
    await super.init();
  }
};

// ─────────────────────────────────────────────────────────────────────
// HELPER: _evaluateFormula
// Safely evaluates the formula expression by substituting variable
// values from the SupplierBid record.
//
// Allowed variable names (must match SupplierBid field names):
//   localBidValue, shippingCost, handlingCost, customDuty, premium
// ─────────────────────────────────────────────────────────────────────


function _evaluateFormula(formulaObj, context) {
  try {
    if (!formulaObj) {
      return { result: null, error: "No formula" };
    }

    const safeEval = (expr, ctx) => {
      if (!expr) return 0;

      let evaluated = expr;

      // replace variables
      Object.keys(ctx).forEach(key => {
        const value = ctx[key] ?? 0;
        const regex = new RegExp(`\\b${key}\\b`, "g");
        evaluated = evaluated.replace(regex, value);
      });

      // handle ROUND(x, y)
      evaluated = evaluated.replace(/ROUND\(([^,]+),\s*(\d+)\)/g, (_, val, decimals) => {
        return `Math.round((${val}) * ${Math.pow(10, decimals)}) / ${Math.pow(10, decimals)}`;
      });

      return new Function(`return (${evaluated})`)();
    };

    // 1. TRAFFIC
    const traffic = safeEval(formulaObj.trafficexpression, context) || 0;

    // 2. DUTY
    const dutyContext = { ...context, traffic };
    const duty = safeEval(formulaObj.dutyexpression, dutyContext) || 0;

    // 3. LDOR
    const ldorContext = { ...dutyContext, duty };
    const ldor = safeEval(formulaObj.ldorexpression, ldorContext) || 0;

    // 3. PREMIUM
    const premiumContext = { ...ldorContext, ldor };
    const premium = safeEval(formulaObj.premiumexpression, premiumContext) || 0;

    // 4. FINAL
    const finalContext = {
      ...context,
      traffic,
      duty,
      ldor,
      premium
    };

    let finalExpr = formulaObj.expression;

    Object.keys(finalContext).forEach(key => {
      const value = finalContext[key] ?? 0;
      finalExpr = finalExpr.replace(new RegExp(`\\b${key}\\b`, "g"), value);
    });

    const resultRaw = new Function(`return (${finalExpr})`)();

    const result = Math.round(resultRaw * 100) / 100;

    return {
      result,
      breakdown: {
        traffic: Math.round(traffic * 100) / 100,
        duty: Math.round(duty * 100) / 100,
        ldor: Math.round(ldor * 100) / 100,
        premium: Math.round(premium * 100) / 100
      },
      evaluated: {
        trafficExpr: formulaObj.trafficexpression,
        dutyExpr: formulaObj.dutyexpression,
        ldorExpr: formulaObj.ldorexpression,
        premiumExpr: formulaObj.premiumexpression,
        finalExpr
      },
      variables: context
    };

  } catch (err) {
    return {
      result: null,
      error: err.message,
      variables: context
    };
  }
}







// ─────────────────────────────────────────────────────────────────────
// HELPER: _generatePDFBuffer
// Builds a PDF document using pdfkit and returns a Buffer.
// ─────────────────────────────────────────────────────────────────────
function _generatePDFBuffer({
  comparison,
  rfqEvent,
  rfqItem,
  bidLeft  
}) {
  return new Promise((resolve, reject) => {
    let PDFDocument;
    try {
      PDFDocument = require("pdfkit");
    } catch (e) {
      reject(new Error("pdfkit is not installed. Run: npm install pdfkit"));
      return;
    }

    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const currency = bidLeft?.currency || "SAR";
    const fmt = (v) =>
      `${currency} ${Number(v || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

    // ── Header ─────────────────────────────────────────────────
    doc
      .fontSize(20)
      .font("Helvetica-Bold")
      .text("BID EQUALIZATION REPORT", { align: "center" });
    doc.moveDown(0.5);
    doc
      .fontSize(10)
      .font("Helvetica")
      .text(`Generated: ${new Date().toUTCString()}`, { align: "center" });
    doc.moveDown(1.5);

    // ── RFQ Details ────────────────────────────────────────────
    doc.fontSize(13).font("Helvetica-Bold").text("RFQ Information");
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.3);
    doc.fontSize(10).font("Helvetica");

    const rfqRows = [
      ["RFQ ID", rfqEvent?.eventID || "-"],
      ["RFQ Name", rfqEvent?.eventName || "-"],
      ["Item No", rfqItem?.itemNo || "-"],
      ["Commodity", rfqItem?.commodity || "-"],
      ["Quantity", `${rfqItem?.quantity || "-"} ${rfqItem?.unit || ""}`],
      ["Comparison ID", comparison.ID],
    ];
    rfqRows.forEach(([label, value]) => {
      doc
        .font("Helvetica-Bold")
        .text(label + ": ", { continued: true })
        .font("Helvetica")
        .text(value);
    });

    doc.moveDown(1.5);

    // ── Formula ────────────────────────────────────────────────
    doc.fontSize(13).font("Helvetica-Bold").text("Equalization Formula");
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.3);
    doc.fontSize(10).font("Helvetica");
    
    doc
      .font("Helvetica-Bold")
      .text("Expression: ", { continued: true })
      .font("Helvetica")
      .text(comparison?.formulaExpr || "N/A");
    doc.moveDown(1.5);

    // ── Comparison Table ───────────────────────────────────────
    doc.fontSize(13).font("Helvetica-Bold").text("Supplier Comparison");
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.3);

    const colField = 50;
    const colLeft = 250;
    const colRight = 400;
    const rowH = 20;

    // Table header
    var headerY = doc.y;
    doc.fontSize(10).font("Helvetica-Bold");
    doc.text("Cost Component", colField, headerY, { width: 130 });
    
    doc.text(comparison?.leftVendorName || "Left Supplier", colLeft, headerY, {
      width: 140,
    });
    doc.text(
      comparison?.rightVendorName || "Right Supplier",
      colRight,
      headerY,
      { width: 140 },
    );
    headerY = doc.y + 2;

    doc.fontSize(7).font("Helvetica");
    doc.text("(Benchmark Bid - Foreign / Imported Supplier)", colLeft, headerY, {
      width: 160,
    });
    doc.text("(Local Bid - Domestic Supplier)", colRight, headerY, {
      width: 140,
    });

    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.3);

    const tableRows = [
  // Benchmark (Left)
  
  ["Benchmark Bid Type", comparison?.leftBenchmarkBidTypeText || "", "NA"],
  ["Port of Export", comparison?.leftPortOfExportText || "", "NA"],
  ["Benchmark Bid Value", fmt(comparison?.leftBenchmarkBidValue || ""),"NA"],
  ["Development Type", comparison?.leftDevelopmentTypeText || "", "NA"],
  ["Delivery Mode", comparison?.leftDeliveryModeText || "", "NA"],
  ["Bid Value Range", comparison?.leftBidValueRangeText || "", "NA"],
  ["Exceptional Weight / Curve Ratio", comparison?.leftCurveRatioText || "", "NA"],
  ["End Use Cost", fmt(comparison?.leftEndUseCost || ""), "NA"],
  ["Shipping Cost", fmt(comparison?.leftShippingCost || ""), "NA"],
  ["Handling Cost", fmt(comparison?.leftHandlingCost || ""), "NA"],
  ["Saudi Customs Rate (%)", fmt(comparison?.leftSaudiCustomsRate || ""), "NA"],
  ["Saudi Manufacturer Premium (%)", fmt(comparison?.leftSaudiManufacturerPremium || ""), "NA"],
  ["Freight", fmt(comparison?.leftFreight || ""), "NA"],
  ["Duty", fmt(comparison?.leftDuty || ""), "NA"],
  ["Premium", fmt(comparison?.leftPremium || ""), "NA"],

  // // Local (Right)
  ["Local Bid Type", "NA", comparison?.rightLocalBidTypeText || ""],
  ["Local Bid Value", "NA",fmt(comparison?.rightLocalBidValue || "")],

  ["Local End Use Cost", "NA", fmt(comparison?.rightLocalEndUseCost || "")],
  // ["Total Local Bid", "NA", fmt(comparison?.rightTotalLocalBid || "")],

  ["Equalization Basis", "NA", comparison?.rightEqualizationBasisText || ""],
  //["Commodity Difference","NA",fmt(comparison?.rightCommodityDifference || "")],
  ["Difference(%)","NA",comparison?.rightDifference || "" ]
];

  doc.font("Helvetica").fontSize(10);
  tableRows.forEach(([field, left, right]) => {
  const fieldHeight = doc.heightOfString(field, { width: 130 });
  const leftHeight  = doc.heightOfString(left, { width: 140 });
  const rightHeight = doc.heightOfString(right, { width: 140 });

  const rowHeight = Math.max(fieldHeight, leftHeight, rightHeight);

  const y = doc.y;

  doc.text(field, colField, y, { width: 130 });
  doc.text(left, colLeft, y, { width: 140 });
  doc.text(right, colRight, y, { width: 140 });

  // Move down by actual tallest content
  doc.y = y + rowHeight + 5; // add small padding
  });

    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.3);

    // Equalized Totals Row
    doc.font("Helvetica-Bold").fontSize(11);
    const totalY = doc.y;
    doc.text("EQUALIZED BID TOTAL", colField, totalY, { width: 180 });
    doc.text(fmt(comparison.leftEqualizedBid), colLeft, totalY, { width: 140 });
    doc.text(fmt(comparison.rightTotalLocalBid), colRight, totalY, {
      width: 140,
    });
    doc.moveDown(1.5);

    // ── Winner ─────────────────────────────────────────────────
    // doc.fontSize(13).font("Helvetica-Bold").text("Result");
    // doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    // doc.moveDown(0.3);
    // doc
    //   .fontSize(12)
    //   .font("Helvetica-Bold")
    //   .fillColor("green")
    //   .text(`Winner: ${winner?.supplierName || "N/A"}`, { align: "center" });
   const diff = Number(comparison?.rightCommodityDifference || 0);
const diffperc = Number(comparison?.rightDifference || 0);

const y = doc.y;

doc.fontSize(10).font("Helvetica").moveDown(0.5);

if (diff > 0) doc.fillColor("green");
else if (diff < 0) doc.fillColor("red");
else doc.fillColor("black");

// slightly shift left + control width to avoid wrapping
doc.text(`Cost Advantage: ${fmt(diff)}`, 40, doc.y, {
  width: 500,
  align: "left"
});

doc.text(`Difference (%): ${diffperc}`, 40, doc.y, {
  width: 500,
  align: "left"
});

// reset color back (IMPORTANT for next text)
doc.fillColor("black");

    // ── Footer ─────────────────────────────────────────────────
    doc.moveDown(3);
    doc
      .fontSize(8)
      .fillColor("gray")
      .text(
        "This report was generated by the SAP Bid Equalization System. " +
          "All values are for reference purposes only.",
        { align: "center" },
      );

    doc.end();
  });
}
