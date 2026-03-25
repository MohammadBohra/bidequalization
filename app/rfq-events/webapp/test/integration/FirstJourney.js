sap.ui.define([
    "sap/ui/test/opaQunit",
    "./pages/JourneyRunner"
], function (opaTest, runner) {
    "use strict";

    function journey() {
        QUnit.module("First journey");

        opaTest("Start application", function (Given, When, Then) {
            Given.iStartMyApp();

            Then.onTheRFQEventsList.iSeeThisPage();
            Then.onTheRFQEventsList.onFilterBar().iCheckFilterField("RFQ ID");
            Then.onTheRFQEventsList.onFilterBar().iCheckFilterField("RFQ Name");
            Then.onTheRFQEventsList.onFilterBar().iCheckFilterField("Status");
            Then.onTheRFQEventsList.onTable().iCheckColumns(4, {"eventID":{"header":"RFQ ID"},"eventName":{"header":"RFQ Name"},"description":{"header":"Description"},"status":{"header":"Status"}});

        });


        opaTest("Navigate to ObjectPage", function (Given, When, Then) {
            // Note: this test will fail if the ListReport page doesn't show any data
            
            When.onTheRFQEventsList.onFilterBar().iExecuteSearch();
            
            Then.onTheRFQEventsList.onTable().iCheckRows();

            When.onTheRFQEventsList.onTable().iPressRow(0);
            Then.onTheRFQEventsObjectPage.iSeeThisPage();

        });

        opaTest("Teardown", function (Given, When, Then) { 
            // Cleanup
            Given.iTearDownMyApp();
        });
    }

    runner.run([journey]);
});