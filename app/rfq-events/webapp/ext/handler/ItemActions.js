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

  if (!aSelectedContexts || aSelectedContexts.length === 0) {

    MessageToast.show(
      "Please select an RFQ Item first."
    );

    return;

  }

  var oCtx = aSelectedContexts[0];

  var sItemId =
    oCtx.getProperty("itemNo");

  // var sCommodity =
  //   oCtx.getProperty("commodity") || sItemId;

  if (!sItemId) {

    MessageToast.show(
      "Could not read item ID."
    );

    return;

  }

  MessageToast.show(
    "Opening Bid Equalization for: " + sItemId,
    {
      duration: 2500
    }
  );

  // -----------------------------------
  // PARAMETERS
  // -----------------------------------

  var oParams = {
    rfqItemID: sItemId
  };

  // -----------------------------------
  // CASE 1:
  // RUNNING INSIDE LAUNCHPAD / WORKZONE
  // -----------------------------------

  if (
    sap.ushell &&
    sap.ushell.Container
  ) {

    sap.ushell.Container
      .getServiceAsync(
        "CrossApplicationNavigation"
      )
      .then(function (oCrossAppNav) {

        oCrossAppNav.toExternal({

          target: {

            // configure in target mapping
            semanticObject:
              "bidequalization",

            action:
              "display"

          },

          params: oParams

        });

      });

    return;

  }


  // -----------------------------------
  // CASE 2 :: LOCAL BAS TESTING
  // -----------------------------------

  var sOrigin =
    window.location.origin;

  var bLocal =
    window.location.hostname.includes(
      "applicationstudio.cloud.sap"
    );

  var sUrl = "";

  if (bLocal) {

    sUrl =
      sOrigin +
      "/freestyle-app/index.html" +
      "?rfqItemID=" +
      encodeURIComponent(sItemId);

  }

  // -----------------------------------
  // CASE 3:
  // STANDALONE HTML5 APP
  // -----------------------------------
  else{
  sUrl = sOrigin + 
    "/230b382f-590f-406d-b028-cc31d3139fca.bidequalizationservice.bidequalization-1.0.0/index.html" +
    "?rfqItemID=" +
    encodeURIComponent(sItemId);}

  setTimeout(function () {

    window.open(
      sUrl,
      "_blank"
    );

  }, 300);

},



    // openEqualization: function (oBindingContext, aSelectedContexts) {

    
    //   if (!aSelectedContexts || aSelectedContexts.length === 0) {
    //     MessageToast.show("Please select an RFQ Item first.");
    //     return;
    //   }

    //   var oCtx = aSelectedContexts[0];
    //   var sItemId = oCtx.getProperty("itemNo");
    //   var sCommodity = oCtx.getProperty("commodity") || sItemId;

    //   if (!sItemId) {
    //     MessageToast.show("Could not read item ID.");
    //     return;
    //   }

    //   MessageToast.show("Opening Bid Equalization for: " + sCommodity, {
    //     duration: 2500,
    //   });

    //   // var sUrl =
    //   //   "/freestyle-app/webapp/index.html?rfqItemID=" +
    //   //   encodeURIComponent(sItemId);
    //   // setTimeout(function () {
    //   //   window.open(sUrl, "_blank");
    //   // }, 500);

    //   var sUrl = "https://sao-corp-dev-9bgapsnr.launchpad.cfapps.sa30.hana.ondemand.com/230b382f-590f-406d-b028-cc31d3139fca.bidequalizationservice.bidequalization-1.0.0/index.html" + "?rfqItemID=" + encodeURIComponent(sItemId);

    //       setTimeout(function () {
    //         window.open(sUrl, "_blank");
    //       }, 500);
    // },
  };
});
