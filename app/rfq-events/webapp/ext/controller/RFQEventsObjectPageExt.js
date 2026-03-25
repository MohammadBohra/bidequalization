sap.ui.define(
  ["sap/ui/core/mvc/ControllerExtension", "sap/m/MessageToast"],
  function (ControllerExtension, MessageToast) {
    "use strict";

    return ControllerExtension.extend(
      "rfqevents.ext.controller.RFQEventsObjectPageExt",
      {
        /**
         * Custom table action - opens the Bid Equalization freestyle app
         * for the selected RFQ Item.
         *
         * Wired via manifest controlConfiguration:
         *   items/@com.sap.vocabularies.UI.v1.LineItem → actions → OpenEqualization
         */
        openEqualization: function (oEvent) {
          // For table toolbar actions, selected contexts are passed as event parameter
          var aContexts = oEvent.getParameter("contexts");

          if (!aContexts || aContexts.length === 0) {
            // Fallback: try the event source's binding context (inline / row action)
            var oCtx = oEvent.getSource().getBindingContext();
            if (oCtx) {
              aContexts = [oCtx];
            }
          }

          if (!aContexts || aContexts.length === 0) {
            MessageToast.show("Please select an RFQ Item first.");
            return;
          }

          var sItemId = aContexts[0].getProperty("ID");
          if (!sItemId) {
            MessageToast.show("Could not read item ID.");
            return;
          }

          var sCommodity = aContexts[0].getProperty("commodity") || sItemId;
          MessageToast.show("Opening Bid Equalization for: " + sCommodity, {
            duration: 2000,
          });

          var sUrl =
            "/freestyle-app/webapp/index.html?rfqItemID=" +
            encodeURIComponent(sItemId);
          setTimeout(function () {
            window.open(sUrl, "_blank");
          }, 500);
        },
      },
    );
  },
);
