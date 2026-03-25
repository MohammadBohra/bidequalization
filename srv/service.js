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
      const [rfqItem, supplierLeft, supplierRight, winner] = await Promise.all([
        db.run(
          SELECT.one
            .from("BidEqualization.RFQItem")
            .where({ ID: comparison.rfqItem_ID }),
        ),
        db.run(
          SELECT.one
            .from("BidEqualization.Supplier")
            .where({ ID: comparison.supplierLeft_ID }),
        ),
        db.run(
          SELECT.one
            .from("BidEqualization.Supplier")
            .where({ ID: comparison.supplierRight_ID }),
        ),
        db.run(
          SELECT.one
            .from("BidEqualization.Supplier")
            .where({ ID: comparison.winnerSupplier_ID }),
        ),
      ]);

      // Fetch RFQ event
      const rfqEvent = rfqItem
        ? await db.run(
            SELECT.one
              .from("BidEqualization.RFQEvent")
              .where({ ID: rfqItem.rfq_ID }),
          )
        : null;

      // Fetch bids for both suppliers
      const [bidLeft, bidRight] = await Promise.all([
        db.run(
          SELECT.one
            .from("BidEqualization.SupplierBid")
            .where({
              rfqItem_ID: comparison.rfqItem_ID,
              supplier_ID: comparison.supplierLeft_ID,
            }),
        ),
        db.run(
          SELECT.one
            .from("BidEqualization.SupplierBid")
            .where({
              rfqItem_ID: comparison.rfqItem_ID,
              supplier_ID: comparison.supplierRight_ID,
            }),
        ),
      ]);

      // Fetch active formula
      const formula = await db.run(
        SELECT.one.from("BidEqualization.BidFormula").where({ isActive: true }),
      );

      // Generate PDF buffer
      const pdfBuffer = await _generatePDFBuffer({
        comparison,
        rfqEvent,
        rfqItem,
        supplierLeft,
        supplierRight,
        winner,
        bidLeft,
        bidRight,
        formula,
      });

      // Set response headers for PDF download
      req.res?.setHeader("Content-Type", "application/pdf");
      req.res?.setHeader(
        "Content-Disposition",
        `attachment; filename="BidComparison_${comparisonID}.pdf"`,
      );

      return pdfBuffer;
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
function _evaluateFormula(expression, bid) {
  const allowedVars = {
    localBidValue: Number(bid.localBidValue || 0),
    shippingCost: Number(bid.shippingCost || 0),
    handlingCost: Number(bid.handlingCost || 0),
    customDuty: Number(bid.customDuty || 0),
    premium: Number(bid.premium || 0),
  };

  // Validate expression – only allow numbers, operators, spaces, and known variable names
  const sanitized = expression.trim();
  const identifiers = sanitized.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) || [];

  for (const id of identifiers) {
    if (!(id in allowedVars)) {
      throw new Error(
        `Formula contains unknown variable: "${id}". ` +
          `Allowed: ${Object.keys(allowedVars).join(", ")}`,
      );
    }
  }

  // Replace variable names with their numeric values
  let resolved = sanitized;
  for (const [name, value] of Object.entries(allowedVars)) {
    // Use word-boundary-safe replacement
    resolved = resolved.replace(
      new RegExp(`\\b${name}\\b`, "g"),
      value.toString(),
    );
  }

  // Evaluate using Function constructor (safe – only math operators left after substitution)
  // eslint-disable-next-line no-new-func
  const result = new Function(`"use strict"; return (${resolved});`)();
  return Math.round(result * 100) / 100; // Round to 2 decimal places
}

// ─────────────────────────────────────────────────────────────────────
// HELPER: _generatePDFBuffer
// Builds a PDF document using pdfkit and returns a Buffer.
// ─────────────────────────────────────────────────────────────────────
function _generatePDFBuffer({
  comparison,
  rfqEvent,
  rfqItem,
  supplierLeft,
  supplierRight,
  winner,
  bidLeft,
  bidRight,
  formula,
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

    const currency = bidLeft?.currency || "USD";
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
      .text("Formula Name: ", { continued: true })
      .font("Helvetica")
      .text(formula?.name || "N/A");
    doc
      .font("Helvetica-Bold")
      .text("Expression: ", { continued: true })
      .font("Helvetica")
      .text(formula?.expression || "N/A");
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
    doc.fontSize(10).font("Helvetica-Bold");
    doc.text("Cost Component", colField, doc.y, { width: 180 });
    const headerY = doc.y - rowH;
    doc.text(supplierLeft?.supplierName || "Left Supplier", colLeft, headerY, {
      width: 140,
    });
    doc.text(
      supplierRight?.supplierName || "Right Supplier",
      colRight,
      headerY,
      { width: 140 },
    );
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.3);

    const tableRows = [
      [
        "Local Bid Value",
        fmt(bidLeft?.localBidValue),
        fmt(bidRight?.localBidValue),
      ],
      [
        "Shipping Cost",
        fmt(bidLeft?.shippingCost),
        fmt(bidRight?.shippingCost),
      ],
      [
        "Handling Cost",
        fmt(bidLeft?.handlingCost),
        fmt(bidRight?.handlingCost),
      ],
      ["Custom Duty", fmt(bidLeft?.customDuty), fmt(bidRight?.customDuty)],
      ["Premium", fmt(bidLeft?.premium), fmt(bidRight?.premium)],
    ];

    doc.font("Helvetica").fontSize(10);
    tableRows.forEach(([field, left, right]) => {
      const y = doc.y;
      doc.text(field, colField, y, { width: 180 });
      doc.text(left, colLeft, y, { width: 140 });
      doc.text(right, colRight, y, { width: 140 });
      doc.moveDown(0.5);
    });

    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.3);

    // Equalized Totals Row
    doc.font("Helvetica-Bold").fontSize(11);
    const totalY = doc.y;
    doc.text("EQUALIZED BID TOTAL", colField, totalY, { width: 180 });
    doc.text(fmt(comparison.equalizedBidLeft), colLeft, totalY, { width: 140 });
    doc.text(fmt(comparison.equalizedBidRight), colRight, totalY, {
      width: 140,
    });
    doc.moveDown(1.5);

    // ── Winner ─────────────────────────────────────────────────
    doc.fontSize(13).font("Helvetica-Bold").text("Result");
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.3);
    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .fillColor("green")
      .text(`🏆 Winner: ${winner?.supplierName || "N/A"}`, { align: "center" });
    doc.fillColor("black");

    const saving = Math.abs(
      Number(comparison.equalizedBidLeft || 0) -
        Number(comparison.equalizedBidRight || 0),
    );
    doc
      .fontSize(10)
      .font("Helvetica")
      .moveDown(0.5)
      .text(`Cost Advantage: ${fmt(saving)}`, { align: "center" });

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
