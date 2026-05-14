sap.ui.define(
  ["sap/ui/core/mvc/ControllerExtension", "sap/m/MessageToast"],
  function (ControllerExtension, MessageToast) {
    "use strict";

    return ControllerExtension.extend(
      "rfqevents.ext.controller.RFQEventsObjectPageExt",
      {
        onInit: function () {


          // Call the user API provided by the approuter
    var sUrl = "/user-api/currentUser";
    var oUserModel1 = new sap.ui.model.json.JSONModel(sUrl);
    
    oUserModel1.attachRequestCompleted(function() {
        if (oUserModel1.getData().email) {
            console.log("Logged in user: " + oUserModel1.getData().email);
        }
    });
    
  const oRouter = this.base.getExtensionAPI().getRouter();
console.log("in int *************************** RFQEventsObjectPageExt");
  oRouter.getRoute("RFQEventsObjectPage").attachPatternMatched(
    this._onRouteMatched,
    this
  );
},

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
          var sUrl = "https://sao-corp-dev-9bgapsnr.launchpad.cfapps.sa30.hana.ondemand.com/230b382f-590f-406d-b028-cc31d3139fca.bidequalizationservice.bidequalization-1.0.0/index.html" + "?rfqItemID=" + encodeURIComponent(sItemId);

          setTimeout(function () {
            window.open(sUrl, "_blank");
          }, 500);

          // var sUrl =
          //   "/freestyle-app/webapp/index.html?rfqItemID=" +
          //   encodeURIComponent(sItemId);
          // setTimeout(function () {
          //   window.open(sUrl, "_blank");
          // }, 500);
        },
      },
    );
  },
);
