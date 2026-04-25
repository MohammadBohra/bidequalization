/**
 * Freestyle UI5 App – Application Component
 */
sap.ui.define(
  [
    "sap/ui/core/UIComponent",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/odata/v4/ODataModel",
  ],
  function (UIComponent, JSONModel, ODataModel) {
    "use strict";

    return UIComponent.extend("bidequalization", {
      metadata: {
        manifest: "json",
      },

      init: function () {
        // Call parent init
        UIComponent.prototype.init.apply(this, arguments);
        

        // Initialize router
        this.getRouter().initialize();
        //this.setModel(oODataModel);
      },
    });
  },
);
