sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"com/aramco/formulaadminapp/test/integration/pages/BidFormulaList",
	"com/aramco/formulaadminapp/test/integration/pages/BidFormulaObjectPage"
], function (JourneyRunner, BidFormulaList, BidFormulaObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('com/aramco/formulaadminapp') + '/test/flp.html#app-preview',
        pages: {
			onTheBidFormulaList: BidFormulaList,
			onTheBidFormulaObjectPage: BidFormulaObjectPage
        },
        async: true
    });

    return runner;
});

