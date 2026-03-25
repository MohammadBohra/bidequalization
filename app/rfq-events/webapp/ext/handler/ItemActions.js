sap.ui.define(["sap/m/MessageToast"], function (MessageToast) {
  "use strict";

  return {
    /**
     * Custom table action – opens the Bid Equalization freestyle app.
     *
     * sap.fe.templates calls custom action handlers with:
     *   oBindingContext  – the Object Page binding context (RFQEvent)
     *   aSelectedContexts – array of selected table row contexts (RFQItems)
     */
    openEqualization: function (oBindingContext, aSelectedContexts) {
      if (!aSelectedContexts || aSelectedContexts.length === 0) {
        MessageToast.show("Please select an RFQ Item first.");
        return;
      }

      var oCtx = aSelectedContexts[0];
      var sItemId = oCtx.getProperty("ID");
      var sCommodity = oCtx.getProperty("commodity") || sItemId;

      if (!sItemId) {
        MessageToast.show("Could not read item ID.");
        return;
      }

      MessageToast.show("Opening Bid Equalization for: " + sCommodity, {
        duration: 2500,
      });

      var sUrl =
        "/freestyle-app/webapp/index.html?rfqItemID=" +
        encodeURIComponent(sItemId);
      setTimeout(function () {
        window.open(sUrl, "_blank");
      }, 500);
    },
  };
});
