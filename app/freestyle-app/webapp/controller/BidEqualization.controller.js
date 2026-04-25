/**
 * Bid Equalization – Main Controller
 * =====================================================================
 * Handles all user interactions for the bid comparison screen:
 *   - Reads rfqItemID from URL parameters
 *   - Loads RFQ item details, suppliers, and saved comparisons
 *   - Calls CAP actions: calculateComparison, saveComparison, markBenchmark, generatePDF
 *   - Manages appModel (JSON model) state for the view bindings
 * =====================================================================
 */
sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/m/Dialog",
    "sap/m/Button",
    "sap/m/TextArea",
    "sap/m/VBox",
    "sap/m/Label",
    "sap/m/Input",
    "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator"
  ],
  function (
    Controller,
    JSONModel,
    MessageToast,
    MessageBox,
    Dialog,
    Button,
    TextArea,
    VBox,
    Label,
    Input,
    Filter,
    FilterOperator
  ) {
    "use strict";

    // OData service path
    const SERVICE_URL = "/odata/v4/bid-equalization/";

    return Controller.extend("bidequalization.controller.BidEqualization", {
      // ──────────────────────────────────────────────────────────
      // Lifecycle
      // ──────────────────────────────────────────────────────────

      onInit: function () {
        
        this._handleStartupNavigation();
        const oRouter = this.getOwnerComponent().getRouter();
        oRouter
          .getRoute("BidEqualization")
          .attachPatternMatched(this._onRouteMatched, this);
           
      },
      
      _handleStartupNavigation: async function () {
  const oParams = new URLSearchParams(window.location.search);
  const rfqEvent = oParams.get("eventId");

  // If no param → normal app behavior
  if (!rfqEvent)
    {
      this.getView().byId("mainPage").setVisible(true);
      return;
    }

  try {
    // 1. Get full current path
const sHref = window.location.href;

// 2. Extract common CF base (up to service)
const sBase = sHref.split("bidequalizationservice.")[0] + "bidequalizationservice.";

// 3. Hardcode target app
const sTargetApp = "rfqevents-0.0.1/index.html";

// 4. Build final URL
const sTargetUrl =
  sBase +
  sTargetApp +
  "#/RFQEvents('" +
  encodeURIComponent(rfqEvent) +
  "')";

// 5. Redirect
window.location.replace(sTargetUrl);

    
  } catch (e) {
    console.error("RFQ mapping failed", e);
  }
},

      _onRouteMatched: function () {
        // Read rfqItemID from the browser URL query string
        const sSearch = window.location.search;
        const oParams = new URLSearchParams(sSearch);
        const sItemID = oParams.get("rfqItemID");

        const oModel = this.getOwnerComponent().getModel("appModel");
        const oModelOdata = this.getOwnerComponent().getModel();
        oModel.setProperty("/rfqItemID", sItemID);
        // Create NEW comparison (transient)
        const oListBinding = oModelOdata.bindList("/BidComparisons");
        if (sItemID) {
    const oTable = this.byId("comparisonsTable");
    const oBinding = oTable.getBinding("items");

    const oFilter = new Filter("rfqItem_ID", FilterOperator.EQ, sItemID);
    oBinding.filter([oFilter]);
  }

  if (sItemID) {
    try {
      const oHeader = this.byId("headerData");
       
  oHeader.bindElement({
    path: `/RFQItems('${sItemID}')`,
    parameters: {
      $expand: "rfq"
    }
  });


    } catch (e) {
      console.error("Failed to load RFQ data", e);
    }
  }
       
        
      },


      _createDetailContext: function () {
        const oModel = this.getOwnerComponent().getModel();

        const oDetailList = oModel.bindList("/BidComparisonDetail");

        this._oDetailContext = oDetailList.create({
          comparison_ID: this._oContext.getProperty("ID") // may be undefined initially (ok)
        });

        // Bind named context for details
        this.getView().setBindingContext(this._oDetailContext, "details");
      },

      // ──────────────────────────────────────────────────────────
      // Data Loading
      // ──────────────────────────────────────────────────────────

      /**
       * Load all data needed for the page:
       *  1. RFQ Item details
       *  2. Suppliers who bid on this item
       *  3. Active formula (name + expression for header display)
       *  4. Saved comparisons for this item
       */
      // _loadPageData: function (sItemID, oModel) {
      //   oModel.setProperty("/busy", true);

      //   Promise.all([
      //     this._fetchJSON(`${SERVICE_URL}RFQItems('${sItemID}')?$expand=rfq`),
      //     this._fetchJSON(
      //       `${SERVICE_URL}SupplierBids?$filter=rfqItem_ID eq ${sItemID}&$expand=supplier`,
      //     ),
      //     this._fetchJSON(
      //       `${SERVICE_URL}BidFormulas?$filter=isActive eq true&$top=1`,
      //     ),
      //     //this._loadComparisons(sItemID),
      //   ])
      //     .then(([itemData, bidsData, formulaData, comparisons]) => {
      //       // ── RFQ Item ─────────────────────────────────────
      //       const oItem = itemData;
      //       oModel.setProperty(
      //         "/rfqItemTitle",
      //         `${oItem.itemNo} – ${oItem.commodity}`,
      //       );
      //       oModel.setProperty(
      //         "/rfqEventTitle",
      //         oItem.rfq ? oItem.rfq.eventName : "",
      //       );
      //       oModel.setProperty("/commodity", oItem.commodity);
      //       oModel.setProperty("/quantity", `${oItem.quantity} ${oItem.unit}`);

      //       // ── Suppliers ─────────────────────────────────────
      //       const aBids = bidsData.value || [];
      //       const aSuppliers = aBids.map((b) => ({
      //         ID: b.supplier_ID,
      //         supplierName: b.supplier
      //           ? b.supplier.supplierName
      //           : b.supplier_ID,
      //       }));
      //       oModel.setProperty("/suppliers", aSuppliers);

      //       // Pre-select first two distinct suppliers
      //       if (aSuppliers.length >= 1) {
      //         oModel.setProperty("/supplierLeftID", aSuppliers[0].ID);
      //         oModel.setProperty(
      //           "/supplierLeftName",
      //           aSuppliers[0].supplierName,
      //         );
      //       }
      //       if (aSuppliers.length >= 2) {
      //         oModel.setProperty("/supplierRightID", aSuppliers[1].ID);
      //         oModel.setProperty(
      //           "/supplierRightName",
      //           aSuppliers[1].supplierName,
      //         );
      //       }

      //       // ── Formula ────────────────────────────────────────
      //       const aFormulas = formulaData.value || [];
      //       if (aFormulas.length > 0) {
      //         oModel.setProperty("/formulaName", aFormulas[0].name);
      //         oModel.setProperty("/formulaExpr", aFormulas[0].expression);
      //       }

      //       // ── Comparisons ────────────────────────────────────
      //       oModel.setProperty("/comparisons", comparisons);
      //     })
      //     .catch((err) => {
      //       MessageBox.error(
      //         "Failed to load data: " + (err.message || String(err)),
      //       );
      //     })
      //     .finally(() => {
      //       oModel.setProperty("/busy", false);
      //     });
      // },

      /**
       * Fetch saved comparisons for this RFQ item, enriched with supplier names.
       */
      // _loadComparisons: async function (sItemID) {
      //   const data = await this._fetchJSON(
      //     `${SERVICE_URL}BidComparisons?$filter=rfqItem_ID eq ${sItemID}` +
      //       `&$expand=supplierLeft,supplierRight,winnerSupplier&$orderby=createdAt desc`,
      //   );
      //   return (data.value || []).map((c) => ({
      //     ID: c.ID,
      //     createdAt: c.createdAt ? new Date(c.createdAt).toLocaleString() : "",
      //     supplierLeftName: c.supplierLeft
      //       ? c.supplierLeft.supplierName
      //       : c.supplierLeft_ID,
      //     supplierRightName: c.supplierRight
      //       ? c.supplierRight.supplierName
      //       : c.supplierRight_ID,
      //     equalizedBidLeft: c.equalizedBidLeft,
      //     equalizedBidRight: c.equalizedBidRight,
      //     currency: "USD",
      //     winnerName: c.winnerSupplier ? c.winnerSupplier.supplierName : "",
      //     notes: c.notes || "",
      //   }));
      // },

      // ──────────────────────────────────────────────────────────
      // Event Handlers
      // ──────────────────────────────────────────────────────────

      /**
       * Generic handler for ALL Select dropdowns in the comparison form.
       * sap.m.Select.selectedKey two-way binding can be unreliable, so we
       * explicitly write the selected key back to the correct model path.
       */
      onDropdownChange: function (oEvent) {
        const oSelect = oEvent.getSource();
        const oItem = oEvent.getParameter("selectedItem");
        if (!oItem) return;
        const sKey = oItem.getKey();

        // Read the binding path from the selectedKey property binding
        const oBindingInfo = oSelect.getBindingInfo("selectedKey");
        if (!oBindingInfo || !oBindingInfo.parts || !oBindingInfo.parts[0])
          return;

        const sPart = oBindingInfo.parts[0];
        const sModelName = sPart.model; // "appModel"
        const sPath = sPart.path; // e.g. "/left/benchmarkBidType"

        const oModel = this.getOwnerComponent().getModel(sModelName);
        if (oModel) {
          oSelect.setSelectedKey(sKey);
          // oModel.setProperty(sPath, sKey);
          // oModel.refresh(true); 
        }
      },

      /** Update supplier name labels when dropdowns change */
      onSupplierChange: function () {
        const oModel = this.getOwnerComponent().getModel("appModel");
        const aSuppliers = oModel.getProperty("/suppliers");
        const sLeftID = oModel.getProperty("/supplierLeftID");
        const sRightID = oModel.getProperty("/supplierRightID");

        const findName = (id) => {
          const sup = aSuppliers.find((s) => s.ID === id);
          return sup ? sup.supplierName : "";
        };

        oModel.setProperty("/supplierLeftName", findName(sLeftID));
        oModel.setProperty("/supplierRightName", findName(sRightID));

        // Reset calculation results when suppliers change
        oModel.setProperty("/calculated", false);
        oModel.setProperty("/equalizedLeft", null);
        oModel.setProperty("/equalizedRight", null);
        oModel.setProperty("/winner", null);
        oModel.setProperty("/winnerName", "");
        oModel.setProperty("/savings", "");
        oModel.setProperty("/leftState", "None");
        oModel.setProperty("/rightState", "None");
      },

      onLocalValuesChange: function () {
  const oView = this.getView();

  const bidValue = this._formatDecimal(
    oView.byId("rightLocalBidValue").getValue()
  ) || 0;

  const euc = this._formatDecimal(
    oView.byId("rightLocalEndUseCost").getValue()
  ) || 0;

  const total = bidValue + euc;

  oView.byId("rightTotalLocalBid").setValue(total);
},



      onCalculate: async function () {
  const oView = this.getView();
  const oModel = this.getOwnerComponent().getModel();

  // Validate first
  if (!this._validateMandatoryFields(oView)) {
    sap.m.MessageBox.error("Please fill all mandatory fields correctly.");
    return;
  }

  // ================= BUILD FLAT PAYLOAD =================
  const payload = {

    // ===== LEFT =====
    leftBenchmarkBidType: oView.byId("leftBenchmarkBidType").getSelectedKey() || "",    
    leftDevelopmentType: oView.byId("leftDevelopmentType").getSelectedKey() || "",
    leftDeliveryMode: oView.byId("leftDeliveryMode").getSelectedKey() || "",

    leftBidValue: parseFloat(this._formatDecimal(oView.byId("leftBenchmarkBidValue").getValue())) || 0,
    leftBidValueRange: oView.byId("leftBidValueRange").getSelectedKey() || "",
    leftExceptionalWeight: oView.byId("leftCurveRatio").getSelectedKey() || "",

    leftShippingCost: parseFloat(this._formatDecimal(oView.byId("leftShippingCost").getValue())) || 0,
    leftHandlingCost: parseFloat(this._formatDecimal(oView.byId("leftHandlingCost").getValue())) || 0,
    leftEUC: parseFloat(this._formatDecimal(oView.byId("leftEndUseCost").getValue())) || 0,

    leftSaudiCustomsRate: parseFloat(this._formatDecimal(oView.byId("leftSaudiCustomsRate").getValue())) || 0,
    leftSaudiManufacturerPremium: parseFloat(this._formatDecimal(oView.byId("leftSaudiManufacturerPremium").getValue())) || 0,

    // ===== RIGHT =====
    rightLocalBidType: oView.byId("rightLocalBidType").getSelectedKey() || "",

    rightBidValue: parseFloat(this._formatDecimal(oView.byId("rightLocalBidValue").getValue())) || 0,
    rightEUC: parseFloat(this._formatDecimal(oView.byId("rightLocalEndUseCost").getValue())) || 0
  };

  try {
    const oAction = oModel.bindContext("/calculateComparison(...)");
    Object.keys(payload).forEach(key => {
    oAction.setParameter(key, payload[key]);
      });


   // oAction.setParameter("data", JSON.stringify(payload));

    await oAction.execute();
    const response = oAction.getBoundContext().getObject();

    // Update UI
    oView.byId("leftEqualizedBid").setValue(response.leftEqualizedBid.result);
    oView.byId("leftFreight").setValue(response.leftEqualizedBid.breakdown.traffic);
oView.byId("leftDuty").setValue(response.leftEqualizedBid.breakdown.duty);
oView.byId("leftPremium").setValue(response.leftEqualizedBid.breakdown.premium);
oView.byId("leftldor").setValue(response.leftEqualizedBid.breakdown.ldor);

    // Success popup with details
  const vars = response.leftEqualizedBid.variables;

// Build variables string dynamically
const variablesText = Object.entries(vars)
  .map(([key, value]) => `${key}: ${value}`)
  .join('\n');

sap.m.MessageBox.success(
  `Benchmark equalized bid calculated successfully\n\n` +
  `Benchmark equalized bid value: ${response.leftEqualizedBid.result}\n` +
  `Formula: ${response.formulaExpr}\n\n` +
  `Variables used:\n${variablesText}`
);

// Calculate the difference
 
 this.getView().byId("formulaExpr").setText(response.formulaExpr);
  const rightTotalLocalBid = this._formatDecimal(this.getView().byId("rightTotalLocalBid").getValue()) || 0;
  const difference = response.leftEqualizedBid.result - rightTotalLocalBid;
  const leftequalizedBid = response.leftEqualizedBid.result;
  //Populate difference
  this.getView().byId("rightCommodityDifference").setValue(difference.toFixed(2));

  // Calculate percentage difference
let differencePercent = 0;

if (rightTotalLocalBid !== 0) {
  differencePercent = (difference / leftequalizedBid) * 100;
}
const formattedPercent = `${differencePercent.toFixed(2)} %`;

// Populate percentage
this.getView().byId("rightDifference").setValue(formattedPercent);

  } catch (err) {
    let errorMsg = "Calculation failed";

  try {
    // CAP OData V4 error structure
    if (err?.error?.message) {
      errorMsg = err.error.message;
    } 
    else if (err?.message) {
      errorMsg = err.message;
    }
    else if (err?.responseText) {
      const parsed = JSON.parse(err.responseText);
      errorMsg = parsed?.error?.message || errorMsg;
    }
  } catch (parseErr) {
    console.error("Error parsing backend message:", parseErr);
  }

  sap.m.MessageBox.error(errorMsg);
    console.error(err);
  }
},

      /** Calculate equalized bids via CAP action */
      onCalculateOld: async function () {
        const oModel = this.getOwnerComponent().getModel("appModel");
        const sItemID = oModel.getProperty("/rfqItemID");
        const sLeftID = oModel.getProperty("/supplierLeftID");
        const sRightID = oModel.getProperty("/supplierRightID");

        if (!sItemID || !sLeftID || !sRightID) {
          MessageBox.warning(
            "Please select both suppliers before calculating.",
          );
          return;
        }
        if (sLeftID === sRightID) {
          MessageBox.warning("Please select two different suppliers.");
          return;
        }

        oModel.setProperty("/busy", true);

        try {
          // Call CAP action
          const result = await this._callAction("calculateComparison", {
            rfqItemID: sItemID,
            supplierLeft: sLeftID,
            supplierRight: sRightID,
          });

          const {
            equalizedLeft,
            equalizedRight,
            winner,
            formulaName,
            formulaExpr,
          } = result;

          // Compute savings
          const savings = Math.abs(
            Number(equalizedLeft || 0) - Number(equalizedRight || 0),
          ).toFixed(2);

          // Update formula in header
          if (formulaName) oModel.setProperty("/formulaName", formulaName);
          if (formulaExpr) oModel.setProperty("/formulaExpr", formulaExpr);

          // Determine winner name
          const aSuppliers = oModel.getProperty("/suppliers");
          const winnerSupplier = aSuppliers.find((s) => s.ID === winner);
          const sWinnerName = winnerSupplier
            ? winnerSupplier.supplierName
            : winner;

          // Set state for ObjectNumber coloring (Success = green, Error = red)
          const leftState = winner === sLeftID ? "Success" : "Error";
          const rightState = winner === sRightID ? "Success" : "Error";

          oModel.setProperty(
            "/equalizedLeft",
            Number(equalizedLeft).toFixed(2),
          );
          oModel.setProperty(
            "/equalizedRight",
            Number(equalizedRight).toFixed(2),
          );
          oModel.setProperty("/winner", winner);
          oModel.setProperty("/winnerName", sWinnerName);
          oModel.setProperty("/savings", savings);
          oModel.setProperty("/leftState", leftState);
          oModel.setProperty("/rightState", rightState);
          oModel.setProperty("/calculated", true);

          // Load bid details for the table rows
          await this._loadBidDetails(sItemID, sLeftID, sRightID, oModel);

          MessageToast.show(`Calculation complete. Winner: ${sWinnerName}`);
        } catch (err) {
          MessageBox.error(
            "Calculation failed: " + (err.message || String(err)),
          );
        } finally {
          oModel.setProperty("/busy", false);
        }
      },

      /** Load bid detail rows for the comparison table */
      _loadBidDetails: async function (sItemID, sLeftID, sRightID, oModel) {
        const [leftBids, rightBids] = await Promise.all([
          this._fetchJSON(
            `${SERVICE_URL}SupplierBids?$filter=rfqItem_ID eq ${sItemID} and supplier_ID eq ${sLeftID}`,
          ),
          this._fetchJSON(
            `${SERVICE_URL}SupplierBids?$filter=rfqItem_ID eq ${sItemID} and supplier_ID eq ${sRightID}`,
          ),
        ]);

        const bidLeft = (leftBids.value || [])[0] || {};
        const bidRight = (rightBids.value || [])[0] || {};

        oModel.setProperty("/bidLeft", bidLeft);
        oModel.setProperty("/bidRight", bidRight);
      },

      onComparisonSelected: function (oEvent) {
  const oItem = oEvent.getParameter("listItem");
  const oCtx = oItem.getBindingContext("appModel"); // your table model
  const oDataCtx = oItem.getBindingContext();

  //const sPath = oCtx.getPath(); // e.g. /comparisons/0
  const oData = oCtx.getObject();
  const sID = oData.ID;

  const oView = this.getView();
   // Calculate total (Local Bid + EUC)
  const bidValue = this._formatDecimal(oDataCtx.getObject().rightLocalBidValue) || 0;
  const euc = this._formatDecimal(oDataCtx.getObject().rightLocalEndUseCost) || 0;
  const total = bidValue + euc;

  // Populate field
  oView.byId("totalLocalBidValue").setValue(total);
  const oODataModel = this.getOwnerComponent().getModel();

  // Bind entire view to OData entity
  oView.bindElement({
    path: `/BidComparison('${sID}')`,
    parameters: {
      expand: "details,supplierLeft,supplierRight"
    }
  });
},

_formatDecimal: function (vValue) {
  if (vValue === "" || vValue === null || vValue === undefined) {
    return null;
  }

  // Convert to string and remove commas
  const cleaned = String(vValue).replace(/,/g, "");

  const f = parseFloat(cleaned);
  return isNaN(f) ? null : f;
},


_validateMandatoryFields: function (oView) {
  let bValid = true;

  const aFields = [
    // ===== EXISTING =====
    {
      id: "leftVendorInput",
      type: "input",
      message: "Left Vendor Name is required"
    },
    {
      id: "leftBenchmarkBidValue",
      type: "number",
      message: "Benchmark Bid Value is required and must be a number"
    },
    {
      id: "rightVendorInput",
      type: "input",
      message: "Local Vendor Name is required"
    },
    {
      id: "rightLocalBidValue",
      type: "number",
      message: "Local Bid Value is required and must be a number"
    },

    // ===== NEW (FOR CALCULATION LOGIC) =====
    {
      id: "leftBenchmarkBidType",
      type: "select",
      message: "Benchmark Bid Type is required"
    },
    {
      id: "rightLocalBidType",
      type: "select",
      message: "Local Bid Type is required"
    },
    {
      id: "leftDevelopmentType",
      type: "select",
      message: "Development Type is required"
    },
    {
      id: "leftDeliveryMode",
      type: "select",
      message: "Delivery Mode is required"
    },
    {
      id: "leftBidValueRange",
      type: "select",
      message: "Benchmark Bid Value Range is required"
    },
    {
      id: "leftCurveRatio",
      type: "select",
      message: "Exceptional Weight/Cube Ratio is required"
    },

    {
      id: "leftShippingCost",
      type: "number",
      message: "Left Shipping Cost is required and must be a number"
    },
    {
      id: "leftHandlingCost",
      type: "number",
      message: "Left Handling Cost is required and must be a number"
    },
    {
      id: "leftEndUseCost",
      type: "number",
      message: "Left End Use Cost is required and must be a number"
    },
    {
      id: "rightLocalEndUseCost",
      type: "number",
      message: "Right End Use Cost is required and must be a number"
    }
  ];

  aFields.forEach((f) => {
    const oControl = oView.byId(f.id);
    let vValue;

    // ✅ Get value safely
    if (oControl.getValue) {
      vValue = oControl.getValue();
    } else if (oControl.getSelectedKey) {
      vValue = oControl.getSelectedKey();
    }

    // ✅ Validation
    if (!vValue) {
      oControl.setValueState("Error");
      oControl.setValueStateText(f.message);
      bValid = false;

    } else if (f.type === "number" && isNaN(parseFloat(vValue))) {
      oControl.setValueState("Error");
      oControl.setValueStateText("Must be a valid number");
      bValid = false;

    } else {
      oControl.setValueState("None");
    }
  });

  return bValid;
},

_validateMandatoryFields1: function (oView) {
  let bValid = true;

  const aFields = [
    {
      id: "leftVendorInput",
      type: "input",
      message: "Left Vendor Name is required"
    },
    {
      id: "leftBenchmarkBidValue",
      type: "number",
      message: "Benchmark Bid Value is required and must be a number"
    },
    {
      id: "rightVendorInput",
      type: "input",
      message: "Local Vendor Name is required"
    },
    {
      id: "rightLocalBidValue",
      type: "number",
      message: "Local Bid Value is required and must be a number"
    }
  ];

  aFields.forEach((f) => {
    const oControl = oView.byId(f.id);
    let vValue;

    // Get value based on control type
    if (oControl.getValue) {
      vValue = oControl.getValue();
    } else if (oControl.getSelectedKey) {
      vValue = oControl.getSelectedKey();
    }

    // Validation
    if (!vValue) {
      oControl.setValueState("Error");
      oControl.setValueStateText(f.message);
      bValid = false;
    } else if (f.type === "number" && isNaN(parseFloat(vValue))) {
      oControl.setValueState("Error");
      oControl.setValueStateText("Must be a valid number");
      bValid = false;
    } else {
      oControl.setValueState("None");
    }
  });

  return bValid;
},

_getInputValue: function (oView, sId, defaultValue = "") {
  const oControl = oView.byId(sId);
  return oControl && oControl.getValue ? (oControl.getValue() || defaultValue) : defaultValue;
},

_getSelectedKey: function (oView, sId, defaultValue = "") {
  const oControl = oView.byId(sId);
  return oControl && oControl.getSelectedKey ? (oControl.getSelectedKey() || defaultValue) : defaultValue;
},

_getSelectedText(oView, id) {
  const oItem = oView.byId(id)?.getSelectedItem();
  return oItem ? oItem.getText() : "";
},


onSaveComparison: function () {
  const oView = this.getView();
  const oModel = this.getOwnerComponent().getModel("appModel");
  const oModelOdata = this.getOwnerComponent().getModel();

  // Validate first
  if (!this._validateMandatoryFields(oView)) {
    sap.m.MessageBox.error("Please fill all mandatory fields correctly.");
    return;
  }

  const oNotesInput = new TextArea({
    placeholder: "Enter notes (optional)",
    rows: 2,
    width: "100%"
  });

  const oDialog = new Dialog({
    title: "Save Comparison",
    content: [
      new VBox({
        items: [
          new Label({ text: "Notes", labelFor: oNotesInput }),
          oNotesInput
        ]
      })
    ],

    beginButton: new Button({
      text: "Save",
      type: "Emphasized",

      press: async () => {
        oDialog.close();
        oModel.setProperty("/busy", true);
        
        // ================= LEFT =================
  const leftVendorName = oView.byId("leftVendorInput").getValue() || "";
  const leftBenchmarkBidType = oView.byId("leftBenchmarkBidType").getSelectedKey() || "";
  const leftBenchmarkBidTypeText = this._getSelectedText(oView, "leftBenchmarkBidType");
  const leftPortOfExport = oView.byId("leftPortOfExport").getSelectedKey() || "";
  const leftPortOfExportText = this._getSelectedText(oView, "leftPortOfExport");
  const leftBenchmarkBidValue = this._formatDecimal(oView.byId("leftBenchmarkBidValue").getValue() || "");
  const leftBenchmarkCurrency = oView.byId("leftBenchmarkCurrency").getSelectedKey() || "";

  const leftDevelopmentType = oView.byId("leftDevelopmentType").getSelectedKey() || "";
  const leftDevelopmentTypeText = this._getSelectedText(oView, "leftDevelopmentType");
  const leftDeliveryMode = oView.byId("leftDeliveryMode").getSelectedKey() || "";
  const leftDeliveryModeText = this._getSelectedText(oView, "leftDeliveryMode");
  const leftBidValueRange = oView.byId("leftBidValueRange").getSelectedKey() || "";
  const leftBidValueRangeText = this._getSelectedText(oView, "leftBidValueRange");
  const leftCurveRatio = oView.byId("leftCurveRatio").getSelectedKey() || "";
  const leftCurveRatioText = this._getSelectedText(oView, "leftCurveRatio");

  const leftEndUseCost = this._formatDecimal(oView.byId("leftEndUseCost").getValue() || "");
  const leftEndUseCostCurrency = oView.byId("leftEndUseCostCurrency").getSelectedKey() || "";

  const leftShippingCost = this._formatDecimal(oView.byId("leftShippingCost").getValue() || "");
  const leftShippingCostCurrency = oView.byId("leftShippingCostCurrency").getSelectedKey() || "";

  const leftHandlingCost = this._formatDecimal(oView.byId("leftHandlingCost").getValue() || "");
  const leftHandlingCostCurrency = oView.byId("leftHandlingCostCurrency").getSelectedKey() || "";
  

  // Optional fields (safe handling)
const leftSaudiCustomsRate =this._formatDecimal( this._getInputValue(oView, "leftSaudiCustomsRate"));
const leftSaudiManufacturerPremium = this._formatDecimal(this._getInputValue(oView, "leftSaudiManufacturerPremium"));

const leftFreight = this._formatDecimal(this._getInputValue(oView, "leftFreight"));
const leftFreightCurrency = this._getSelectedKey(oView, "leftFreightCurrency");

const leftDuty = this._formatDecimal(this._getInputValue(oView, "leftDuty"));
const leftDutyCurrency = this._getSelectedKey(oView, "leftDutyCurrency");

const leftPremium = this._formatDecimal(this._getInputValue(oView, "leftPremium"));
const leftPremiumCurrency = this._getSelectedKey(oView, "leftPremiumCurrency");

const leftEqualizedBid = this._formatDecimal(this._getInputValue(oView, "leftEqualizedBid"));

  // // ================= RIGHT =================
  const rightVendorName = oView.byId("rightVendorInput").getValue() || "";
  const rightLocalBidType = oView.byId("rightLocalBidType").getSelectedKey() || "";
  const rightLocalBidTypeText = this._getSelectedText(oView, "rightLocalBidType");
  const rightLocalBidValue = this._formatDecimal(oView.byId("rightLocalBidValue").getValue() || "");
  const rightLocalBidCurrency = oView.byId("rightLocalBidCurrency").getSelectedKey() || "";

  const rightLocalEndUseCost = this._formatDecimal(oView.byId("rightLocalEndUseCost").getValue() || "");
  const rightLocalEndUseCostCurrency = oView.byId("rightLocalEndUseCostCurrency").getSelectedKey() || "";

  const rightTotalLocalBid = this._formatDecimal(oView.byId("rightTotalLocalBid").getValue() || "");
  const rightEqualizationBasis = oView.byId("rightEqualizationBasis").getSelectedKey() || "";
  const rightEqualizationBasisText = this._getSelectedText(oView, "rightEqualizationBasis");
  const rightCommodityDifference = this._formatDecimal(oView.byId("rightCommodityDifference").getValue() || "");
  const rightDifference = this._formatDecimal(oView.byId("rightDifference").getValue() || "");
  const formulaExpr = oView.byId("formulaExpr").getText();
  const leftldor = this._formatDecimal(oView.byId("leftldor").getValue() || "");

  try {
    const oPayload = {
      rfqItem_ID: oModel.getProperty("/rfqItemID"),
      notes: oNotesInput.getValue() || "",

      // LEFT
      leftVendorName,
      leftBenchmarkBidType,
      leftBenchmarkBidTypeText,
      leftPortOfExport,
      leftPortOfExportText,
      leftBenchmarkBidValue,
      leftBenchmarkCurrency,
      leftDevelopmentType,
      leftDevelopmentTypeText,
      leftDeliveryMode,
      leftDeliveryModeText,
      leftBidValueRange,
      leftBidValueRangeText,
      leftCurveRatio,
      leftCurveRatioText,
      leftEndUseCost,
      leftEndUseCostCurrency,
      leftShippingCost,
      leftShippingCostCurrency,
      leftHandlingCost,
      leftHandlingCostCurrency,
      leftSaudiCustomsRate,
      leftSaudiManufacturerPremium,
      leftFreight,
      leftFreightCurrency,
      leftDuty,
      leftDutyCurrency,
      leftPremium,
      leftPremiumCurrency,
      
      leftEqualizedBid,

      // // RIGHT
      rightVendorName,
      rightLocalBidType,
      rightLocalBidTypeText,
      rightLocalBidValue,
      rightLocalBidCurrency,
      rightLocalEndUseCost,
      rightLocalEndUseCostCurrency,
      rightTotalLocalBid,
      rightEqualizationBasis,
      rightEqualizationBasisText,
      rightCommodityDifference,
      rightDifference,
      formulaExpr,
      leftldor
    };
          // create binding once (reuse if you want)
const oListBinding = oModelOdata.bindList("/BidComparisons");

// create entry
const oContext = oListBinding.create(oPayload);

// wait until it's persisted
await oContext.created();

const sID = oContext.getProperty("ID");
// refresh table (IMPORTANT)
  const oTable = this.byId("comparisonsTable");
  oTable.getBinding("items").refresh();

          MessageToast.show("Comparison saved successfully!");

        } catch (err) {
          MessageBox.error("Save failed: " + (err.message || err));
        } finally {
          oModel.setProperty("/busy", false);
        }
      }
    }),

    endButton: new Button({
      text: "Cancel",
      press: () => oDialog.close()
    }),

    afterClose: () => oDialog.destroy()
  });

  this.getView().addDependent(oDialog);
  oDialog.open();
},






onSaveComparison1: function () {

    const oView = this.getView();
    const oODataModel = this.getOwnerComponent().getModel();

    // Dialog (unchanged)
    const oNotesInput = new sap.m.TextArea({
        placeholder: "Enter notes (optional)",
        rows: 3,
        width: "100%"
    });

    const oDialog = new sap.m.Dialog({
        title: "Save Comparison",
        content: [
            new sap.m.VBox({
                items: [
                    new sap.m.Label({ text: "Notes", labelFor: oNotesInput }),
                    oNotesInput
                ]
            })
        ],

        beginButton: new sap.m.Button({
            text: "Save",
            type: "Emphasized",

            press: async () => {
                oDialog.close();

                try {
                    sap.ui.core.BusyIndicator.show(0);

                    // 🔥 Get current binding context (IMPORTANT)
                    const oCtx = oView.getBindingContext();
                    const oData = oCtx?.getObject() || {};

                    // 🔥 Deep insert payload
                    const payload = {
                        rfqItem_ID: oData.rfqItem_ID,

                        supplierLeft_ID: oData.supplierLeft_ID,
                        supplierRight_ID: oData.supplierRight_ID,

                        equalizedBidLeft: oData.equalizedBidLeft,
                        equalizedBidRight: oData.equalizedBidRight,

                        winnerSupplier_ID: oData.winnerSupplier_ID,

                        notes: oNotesInput.getValue(),

                        // ✅ DETAILS
                        details: {
                            leftVendorName: oData.details?.leftVendorName,
                            leftBenchmarkBidType: oData.details?.leftBenchmarkBidType,
                            leftPortOfExport: oData.details?.leftPortOfExport,

                            leftBenchmarkBidValue: oData.details?.leftBenchmarkBidValue,
                            leftBenchmarkCurrency: oData.details?.leftBenchmarkCurrency,

                            leftDevelopmentType: oData.details?.leftDevelopmentType,
                            leftDeliveryMode: oData.details?.leftDeliveryMode,

                            leftShippingCost: oData.details?.leftShippingCost,
                            leftHandlingCost: oData.details?.leftHandlingCost,

                            // RIGHT
                            rightVendorName: oData.details?.rightVendorName,
                            rightLocalBidType: oData.details?.rightLocalBidType,

                            rightLocalBidValue: oData.details?.rightLocalBidValue,
                            rightLocalCurrency: oData.details?.rightLocalCurrency,

                            rightTotalLocalBid: oData.details?.rightTotalLocalBid,
                            rightDifference: oData.details?.rightDifference
                        }
                    };

                    // 🔥 CREATE (instead of action)
                    const oListBinding = oODataModel.bindList("/BidComparison");
                    const oCreated = await oListBinding.create(payload);

                    const oCreatedObj = await oCreated.requestObject();

                    // Store ID for later (PDF etc.)
                    this._lastComparisonID = oCreatedObj.ID;

                    sap.m.MessageToast.show("Comparison saved successfully!");

                    // 🔥 Refresh list binding (no manual load needed)
                    oODataModel.refresh();

                } catch (err) {
                    sap.m.MessageBox.error(
                        "Save failed: " + (err.message || String(err))
                    );
                } finally {
                    sap.ui.core.BusyIndicator.hide();
                }
            }
        }),

        endButton: new sap.m.Button({
            text: "Cancel",
            press: () => oDialog.close()
        }),

        afterClose: () => oDialog.destroy()
    });

    oView.addDependent(oDialog);
    oDialog.open();
},

      /** Save the current comparison result */
      onSaveComparisonOld: function () {
        const oModel = this.getOwnerComponent().getModel("appModel");

        // Show dialog to capture optional notes
        const oNotesInput = new TextArea({
          placeholder: "Enter notes (optional)",
          rows: 3,
          width: "100%",
        });

        const oDialog = new Dialog({
          title: "Save Comparison",
          content: [
            new VBox({
              items: [
                new Label({ text: "Notes", labelFor: oNotesInput }),
                oNotesInput,
              ],
            }),
          ],
          beginButton: new Button({
            text: "Save",
            type: "Emphasized",
            press: async () => {
              oDialog.close();
              oModel.setProperty("/busy", true);

              try {
                const result = await this._callAction("saveComparison", {
                  rfqItemID: oModel.getProperty("/rfqItemID"),
                  supplierLeftID: oModel.getProperty("/supplierLeftID"),
                  supplierRightID: oModel.getProperty("/supplierRightID"),
                  equalizedLeft: parseFloat(
                    oModel.getProperty("/equalizedLeft"),
                  ),
                  equalizedRight: parseFloat(
                    oModel.getProperty("/equalizedRight"),
                  ),
                  winnerID: oModel.getProperty("/winner"),
                  notes: oNotesInput.getValue(),
                });

                // Store for PDF generation
                oModel.setProperty("/lastComparisonID", result.ID);

                // Refresh comparisons list
                const sItemID = oModel.getProperty("/rfqItemID");
                const comparisons = await this._loadComparisons(sItemID);
                oModel.setProperty("/comparisons", comparisons);

                MessageToast.show("Comparison saved successfully!");
              } catch (err) {
                MessageBox.error(
                  "Save failed: " + (err.message || String(err)),
                );
              } finally {
                oModel.setProperty("/busy", false);
              }
            },
          }),
          endButton: new Button({
            text: "Cancel",
            press: () => oDialog.close(),
          }),
          afterClose: () => oDialog.destroy(),
        });

        this.getView().addDependent(oDialog);
        oDialog.open();
      },

      /** Mark the winner supplier as benchmark for this RFQ item */
      onMarkBenchmark: async function () {
        const oModel = this.getOwnerComponent().getModel("appModel");
        const sItemID = oModel.getProperty("/rfqItemID");
        const sWinnerID = oModel.getProperty("/winner");
        const sWinnerName = oModel.getProperty("/winnerName");

        if (!sWinnerID) {
          MessageBox.warning("Please calculate first to determine the winner.");
          return;
        }

        MessageBox.confirm(
          `Mark "${sWinnerName}" as the benchmark supplier for this item?`,
          {
            title: "Mark as Benchmark",
            onClose: async (sAction) => {
              if (sAction !== MessageBox.Action.OK) return;

              oModel.setProperty("/busy", true);
              try {
                await this._callAction("markBenchmark", {
                  rfqItemID: sItemID,
                  supplierID: sWinnerID,
                });
                MessageToast.show(`${sWinnerName} marked as benchmark!`);
              } catch (err) {
                MessageBox.error(
                  "Mark benchmark failed: " + (err.message || String(err)),
                );
              } finally {
                oModel.setProperty("/busy", false);
              }
            },
          },
        );
      },

      /** Generate and download a PDF report for the last saved comparison */

      onGeneratePDFnew: async function (oEvent) {

    const oButton = oEvent.getSource();
    const oCtx = oButton.getBindingContext();

    if (!oCtx) {
        sap.m.MessageBox.error("No context found for this record.");
        return;
    }

    const sComparisonID = oCtx.getProperty("ID");

    if (!sComparisonID) {
        sap.m.MessageBox.warning(
            "Please save the comparison before generating a PDF."
        );
        return;
    }

    try {
        const oModel = this.getOwnerComponent().getModel();

        // 🔴 V4 ACTION CALL (replaces callFunction)
        const oAction = oModel.bindContext("/generatePDF(...)");

        oAction.setParameter("comparisonID", sComparisonID);

        await oAction.execute();

        // 🔵 Get result from action
        const oResultContext = oAction.getBoundContext();
        const oData = oResultContext.getObject();

        // ⚠️ ASSUMPTION: backend returns base64 PDF OR URL
        const sPdfBase64 = oData.pdfContent;   // adjust to your backend field
        const sFileName = `BidComparison_${sComparisonID}.pdf`;

        if (!sPdfBase64) {
            throw new Error("No PDF content returned from backend");
        }

        // Convert base64 → blob
        const byteCharacters = atob(sPdfBase64);
        const byteNumbers = new Array(byteCharacters.length);

        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }

        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: "application/pdf" });

        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = sFileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        URL.revokeObjectURL(url);

        sap.m.MessageToast.show("PDF downloaded successfully!");

    } catch (err) {
        sap.m.MessageBox.error(
            "PDF generation failed: " + (err.message || String(err))
        );
    }
},
      onGeneratePDF: async function (oEvent) {
        


        const oButton = oEvent.getSource();
        const oCtx = oButton.getBindingContext(); // IMPORTANT

  if (!oCtx) {
    sap.m.MessageBox.error("No context found for this record.");
    return;
  }

  const sComparisonID = oCtx.getProperty("ID");


        if (!sComparisonID) {
          MessageBox.warning(
            "Please save the comparison before generating a PDF.",
          );
          return;
        }

        try {

          const oModel = this.getOwnerComponent().getModel();
// 🔥 Get service root dynamically (WORKZONE SAFE)
        const sServiceUrl = oModel.getServiceUrl();

        // CAP function import style URL (V4)
        const sUrl =
            sServiceUrl +
            `generatePDF(comparisonID=${encodeURIComponent(sComparisonID)})`;

        const response = await fetch(sUrl, {
            method: "GET",
            headers: {
                "Accept": "application/pdf"
            }
        });


          if (!response.ok) {
            const errText = await response.text();
            throw new Error(errText);
          }

          const blob = await response.blob();
          const url = URL.createObjectURL(blob);

          // Trigger browser download
          const a = document.createElement("a");
          a.href = url;
          a.download = `BidComparison_${sComparisonID}.pdf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);

          MessageToast.show("PDF downloaded successfully!");
        } catch (err) {
          MessageBox.error(
            "PDF generation failed: " + (err.message || String(err)),
          );
        } finally {
          //oModel.setProperty("/busy", false);
        }
      },

      /** Reset the comparison form */
      onReset: function () {
        const oModel = this.getOwnerComponent().getModel("appModel");
        // Calculation results
        oModel.setProperty("/equalizedLeft", null);
        oModel.setProperty("/equalizedRight", null);
        oModel.setProperty("/winner", null);
        oModel.setProperty("/winnerName", "");
        oModel.setProperty("/savings", "");
        oModel.setProperty("/calculated", false);
        oModel.setProperty("/leftState", "None");
        oModel.setProperty("/rightState", "None");
        oModel.setProperty("/bidLeft", {});
        oModel.setProperty("/bidRight", {});
        oModel.setProperty("/lastComparisonID", null);

        // Benchmark (left) form fields
        oModel.setProperty("/left", {
          vendorName: "",
          benchmarkBidType: "",
          portOfExport: "",
          benchmarkBidValue: "",
          benchmarkBidCurrency: "USD",
          developmentType: "PO",
          deliveryMode: "",
          bidValueRange: "",
          curveRatio: "",
          endUseCost: "",
          endUseCostCurrency: "USD",
          shippingCost: "",
          shippingCostCurrency: "USD",
          handlingCost: "",
          handlingCostCurrency: "USD",
          saudiCustomsRate: "",
          saudiManufacturerPremium: "",
          freight: "",
          freightCurrency: "USD",
          duty: "",
          dutyCurrency: "USD",
          premium: "",
          premiumCurrency: "USD",
        });

        // Local (right) form fields
        oModel.setProperty("/right", {
          vendorName: "",
          localBidType: "",
          localBidValue: "",
          localBidCurrency: "SAR",
          localEndUseCost: "",
          localEndUseCostCurrency: "SAR",
          totalLocalBid: "",
          equalizationBasis: "",
          commodityDifference: "",
          difference: "",
        });

        MessageToast.show("Form reset.");
      },

      /**
       * Value Help for Vendor Name inputs on left/right panels.
       * Reads 'side' (left|right) from the source Input's customData.
       * @param {sap.ui.base.Event} oEvent
       */

      onVendorHelp: function (oEvent) {
  const oSource = oEvent.getSource();
  const sSide = oSource.data("side") || "left";

  sap.ui.require(
    ["sap/m/SelectDialog", "sap/m/StandardListItem"],
    (SelectDialog, StandardListItem) => {

      const oDialog = new SelectDialog({
        title: "Select Supplier",
        noDataText: "No suppliers found",

        items: {
          path: "/Suppliers", // OData entity
          template: new StandardListItem({
            title: "{supplierName}",
            description: "{supplierCode}"
          })
        },

        confirm: (oEvt) => {
          const oItem = oEvt.getParameter("selectedItem");
          if (!oItem) return;

          const oCtx = oItem.getBindingContext();
          const sName = oCtx.getProperty("supplierName");
          const sCode = oCtx.getProperty("supplierCode");

          // Set value back to input
          oSource.setValue(sName);

          // OPTIONAL: store in your binding context instead of JSON
          const oInputCtx = oSource.getBindingContext();
          if (oInputCtx) {
            oInputCtx.setProperty(`${sSide}SupplierName`, sName);
            oInputCtx.setProperty(`${sSide}SupplierCode`, sCode);
          }

          oDialog.destroy();
        },

        cancel: () => oDialog.destroy()
      });

      // 🔥 IMPORTANT: use OData model (default model)
      oDialog.setModel(this.getView().getModel());

      oDialog.open();
    }
  );
},

      onVendorHelpOld: function (oEvent) {
        const oSource = oEvent.getSource();
        const sSide = oSource.data("side") || "left"; // 'left' | 'right'
        const oModel = this.getOwnerComponent().getModel("appModel");
        const aSuppliers = oModel.getProperty("/suppliers") || [];

        if (aSuppliers.length === 0) {
          MessageBox.information(
            "No suppliers available for this RFQ item. Ensure supplier bids exist in the system.",
          );
          return;
        }

        // Build a simple SelectDialog on the fly
        sap.ui.require(
          ["sap/m/SelectDialog", "sap/m/StandardListItem"],
          function (SelectDialog, StandardListItem) {
            const oDialog = new SelectDialog({
              title: "Select Vendor",
              noDataText: "No vendors found",
              items: {
                path: "/suppliers",
                model: "appModel",
                template: new StandardListItem({
                  title: "{appModel>supplierName}",
                  description: "{appModel>ID}",
                }),
              },
              confirm: function (oEvt) {
                const oSelected = oEvt.getParameter("selectedItem");
                if (oSelected) {
                  const sName = oSelected.getTitle();
                  const sID = oSelected.getDescription();
                  // oModel.setProperty(`/${sSide}/vendorName`, sName);
                  var sId = "";
                  if(sSide == "left")
                  {
                    sId = "leftVendorInput"
                    var aData = oModel.getData();
                    aData.data.left.vendorName = sName;
                    oModel.setData(aData);

                    oModel.refresh();
                  }else{
                      sId = "righttVendorInput"
                      oModel.getData().data.right.vendorName = sName;
                      oModel.refresh();
                  }
                    
                  oSource.setValue(sName);
                  
                }
                oDialog.destroy();
              },
              cancel: function () {
                oDialog.destroy();
              },
            });

            // NOTE: must set the model on the dialog so item binding resolves
            oDialog.setModel(oModel, "appModel");
            oDialog.open();
          },
        );
      },

      onChangebenchmarkBidValue:function(oEvent)
      {
        
      },


      onDeleteComparison: async function (oEvent) {
  const oItem = oEvent.getSource().getParent(); // ColumnListItem
  const oCtx = oItem.getBindingContext();       // OData context

  if (!oCtx) {
    return;
  }

  const sID = oCtx.getProperty("ID");

  MessageBox.confirm("Delete this comparison?", {
    actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
    onClose: async (sAction) => {
      if (sAction !== MessageBox.Action.OK) {
        return;
      }

      try {
        // 🔥 OData V4 delete (correct way)
        await oCtx.delete();

        MessageToast.show("Deleted successfully");

        // refresh list model (if needed for JSON aggregation)
        // const oAppModel = this.getOwnerComponent().getModel("appModel");
        // const aList = oAppModel.getProperty("/comparisons");

        // const aFiltered = aList.filter((c) => c.ID !== sID);
        // oAppModel.setProperty("/comparisons", aFiltered);

      } catch (err) {
        MessageBox.error("Delete failed: " + err.message);
      }
    }
  });
},

      onComparisonSelected: function (oEvent) {
  const oListItem = oEvent.getParameter("listItem");
  const oCtx = oListItem?.getBindingContext();

  if (!oCtx) {
    return;
  }

  // Get ID (optional for tracking)
  const sID = oCtx.getProperty("ID");

  // Store selected ID (optional)
  const oAppModel = this.getOwnerComponent().getModel("appModel");
  oAppModel.setProperty("/lastComparisonID", sID);

  // CRITICAL: bind VIEW to selected OData context
  this.getView().setBindingContext(oCtx);

   // ✅ Calculate Total Local Bid Value
  const bidValue = this._formatDecimal(oCtx.getProperty("rightLocalBidValue")) || 0;
  const euc = this._formatDecimal(oCtx.getProperty("rightLocalEndUseCost")) || 0;
  const total = bidValue + euc;

  // ✅ Populate field
  this.getView().byId("rightTotalLocalBid").setValue(total);

  MessageToast.show("Comparison loaded.");
},

      // ──────────────────────────────────────────────────────────
      // Private Helpers
      // ──────────────────────────────────────────────────────────

      /**
       * Fetch JSON from the OData service.
       * @param {string} sUrl  Full URL
       * @returns {Promise<Object>}
       */
      _fetchJSON: async function (sUrl) {
        const response = await fetch(sUrl, {
          headers: { Accept: "application/json" },
        });
        if (!response.ok) {
          const text = await response.text();
          throw new Error(`HTTP ${response.status}: ${text}`);
        }
        return response.json();
      },

      /**
       * Invoke an unbound CAP action via POST.
       * @param {string}  sActionName  Action name (without namespace)
       * @param {Object}  oParams      Action parameters
       * @returns {Promise<Object>}    Action return value
       */
      _callAction: async function (sActionName, oParams) {
        const response = await fetch(`${SERVICE_URL}${sActionName}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(oParams),
        });

        const text = await response.text();
        let parsed;
        try {
          parsed = JSON.parse(text);
        } catch (e) {
          parsed = text;
        }

        if (!response.ok) {
          const errMsg = parsed?.error?.message || text;
          throw new Error(errMsg);
        }

        // OData v4 action results are wrapped in { value: ... }
        return parsed?.value !== undefined ? parsed.value : parsed;
      },
    });
  },
);
