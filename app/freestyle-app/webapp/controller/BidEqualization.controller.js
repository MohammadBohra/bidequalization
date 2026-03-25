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
  ) {
    "use strict";

    // OData service path
    const SERVICE_URL = "/api/";

    return Controller.extend("bidequalization.controller.BidEqualization", {
      // ──────────────────────────────────────────────────────────
      // Lifecycle
      // ──────────────────────────────────────────────────────────

      onInit: function () {
        const oRouter = this.getOwnerComponent().getRouter();
        oRouter
          .getRoute("BidEqualization")
          .attachPatternMatched(this._onRouteMatched, this);
      },

      _onRouteMatched: function () {
        // Read rfqItemID from the browser URL query string
        const sSearch = window.location.search;
        const oParams = new URLSearchParams(sSearch);
        const sItemID = oParams.get("rfqItemID");

        const oModel = this.getOwnerComponent().getModel("appModel");
        oModel.setProperty("/rfqItemID", sItemID);

        if (sItemID) {
          this._loadPageData(sItemID, oModel);
        } else {
          MessageBox.warning(
            "No RFQ Item ID provided in the URL. Please navigate from the RFQ Items page.",
          );
        }
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
      _loadPageData: function (sItemID, oModel) {
        oModel.setProperty("/busy", true);

        Promise.all([
          this._fetchJSON(`${SERVICE_URL}RFQItems('${sItemID}')?$expand=rfq`),
          this._fetchJSON(
            `${SERVICE_URL}SupplierBids?$filter=rfqItem_ID eq ${sItemID}&$expand=supplier`,
          ),
          this._fetchJSON(
            `${SERVICE_URL}BidFormulas?$filter=isActive eq true&$top=1`,
          ),
          this._loadComparisons(sItemID),
        ])
          .then(([itemData, bidsData, formulaData, comparisons]) => {
            // ── RFQ Item ─────────────────────────────────────
            const oItem = itemData;
            oModel.setProperty(
              "/rfqItemTitle",
              `${oItem.itemNo} – ${oItem.commodity}`,
            );
            oModel.setProperty(
              "/rfqEventTitle",
              oItem.rfq ? oItem.rfq.eventName : "",
            );
            oModel.setProperty("/commodity", oItem.commodity);
            oModel.setProperty("/quantity", `${oItem.quantity} ${oItem.unit}`);

            // ── Suppliers ─────────────────────────────────────
            const aBids = bidsData.value || [];
            const aSuppliers = aBids.map((b) => ({
              ID: b.supplier_ID,
              supplierName: b.supplier
                ? b.supplier.supplierName
                : b.supplier_ID,
            }));
            oModel.setProperty("/suppliers", aSuppliers);

            // Pre-select first two distinct suppliers
            if (aSuppliers.length >= 1) {
              oModel.setProperty("/supplierLeftID", aSuppliers[0].ID);
              oModel.setProperty(
                "/supplierLeftName",
                aSuppliers[0].supplierName,
              );
            }
            if (aSuppliers.length >= 2) {
              oModel.setProperty("/supplierRightID", aSuppliers[1].ID);
              oModel.setProperty(
                "/supplierRightName",
                aSuppliers[1].supplierName,
              );
            }

            // ── Formula ────────────────────────────────────────
            const aFormulas = formulaData.value || [];
            if (aFormulas.length > 0) {
              oModel.setProperty("/formulaName", aFormulas[0].name);
              oModel.setProperty("/formulaExpr", aFormulas[0].expression);
            }

            // ── Comparisons ────────────────────────────────────
            oModel.setProperty("/comparisons", comparisons);
          })
          .catch((err) => {
            MessageBox.error(
              "Failed to load data: " + (err.message || String(err)),
            );
          })
          .finally(() => {
            oModel.setProperty("/busy", false);
          });
      },

      /**
       * Fetch saved comparisons for this RFQ item, enriched with supplier names.
       */
      _loadComparisons: async function (sItemID) {
        const data = await this._fetchJSON(
          `${SERVICE_URL}BidComparisons?$filter=rfqItem_ID eq ${sItemID}` +
            `&$expand=supplierLeft,supplierRight,winnerSupplier&$orderby=createdAt desc`,
        );
        return (data.value || []).map((c) => ({
          ID: c.ID,
          createdAt: c.createdAt ? new Date(c.createdAt).toLocaleString() : "",
          supplierLeftName: c.supplierLeft
            ? c.supplierLeft.supplierName
            : c.supplierLeft_ID,
          supplierRightName: c.supplierRight
            ? c.supplierRight.supplierName
            : c.supplierRight_ID,
          equalizedBidLeft: c.equalizedBidLeft,
          equalizedBidRight: c.equalizedBidRight,
          currency: "USD",
          winnerName: c.winnerSupplier ? c.winnerSupplier.supplierName : "",
          notes: c.notes || "",
        }));
      },

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
          oModel.setProperty(sPath, sKey);
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

      /** Calculate equalized bids via CAP action */
      onCalculate: async function () {
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

      /** Save the current comparison result */
      onSaveComparison: function () {
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
      onGeneratePDF: async function () {
        const oModel = this.getOwnerComponent().getModel("appModel");
        const sComparisonID = oModel.getProperty("/lastComparisonID");

        if (!sComparisonID) {
          MessageBox.warning(
            "Please save the comparison before generating a PDF.",
          );
          return;
        }

        oModel.setProperty("/busy", true);

        try {
          // Call action – returns binary blob
          const response = await fetch(`${SERVICE_URL}generatePDF`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ comparisonID: sComparisonID }),
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
          oModel.setProperty("/busy", false);
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
                  oModel.setProperty(`/${sSide}/vendorName`, sName);
                  oModel.setProperty(
                    sSide === "left" ? "/supplierLeftID" : "/supplierRightID",
                    sID,
                  );
                  oModel.setProperty(
                    sSide === "left"
                      ? "/supplierLeftName"
                      : "/supplierRightName",
                    sName,
                  );
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

      /** Handle row selection in saved comparisons table */
      onComparisonSelected: function (oEvent) {
        const oModel = this.getOwnerComponent().getModel("appModel");
        const oCtx = oEvent
          .getParameter("listItem")
          ?.getBindingContext("appModel");
        if (oCtx) {
          const sID = oCtx.getObject().ID;
          oModel.setProperty("/lastComparisonID", sID);
          MessageToast.show("Comparison selected. You can now generate a PDF.");
        }
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
