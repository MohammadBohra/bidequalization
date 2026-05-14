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
    onInit: function () {
       // Call the user API provided by the approuter
    
  const oRouter = this.base.getExtensionAPI().getRouter();
  oRouter.getRoute("RFQEventsObjectPage").attachPatternMatched(
    this._onRouteMatched,
    this
  );
},
    openEqualization: function (oBindingContext, aSelectedContexts) {


      var sUrl = "/user-api/currentUser";
    var oUserModel1 = new sap.ui.model.json.JSONModel(sUrl);
    
    oUserModel1.attachRequestCompleted(function() {
        if (oUserModel1.getData().email) {
            console.log("Logged in user: " + oUserModel1.getData().email);
        }
    });
    
      if (!aSelectedContexts || aSelectedContexts.length === 0) {
        MessageToast.show("Please select an RFQ Item first.");
        return;
      }

      var oCtx = aSelectedContexts[0];
      var sItemId = oCtx.getProperty("itemNo");
      var sCommodity = oCtx.getProperty("commodity") || sItemId;

      if (!sItemId) {
        MessageToast.show("Could not read item ID.");
        return;
      }

      MessageToast.show("Opening Bid Equalization for: " + sCommodity, {
        duration: 2500,
      });

      // var sUrl =
      //   "/freestyle-app/webapp/index.html?rfqItemID=" +
      //   encodeURIComponent(sItemId);
      // setTimeout(function () {
      //   window.open(sUrl, "_blank");
      // }, 500);

      var sUrl = "https://sao-corp-dev-9bgapsnr.launchpad.cfapps.sa30.hana.ondemand.com/230b382f-590f-406d-b028-cc31d3139fca.bidequalizationservice.bidequalization-1.0.0/index.html" + "?rfqItemID=" + encodeURIComponent(sItemId);

          setTimeout(function () {
            window.open(sUrl, "_blank");
          }, 500);
    },
  };
});
