sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"rfqevents/test/integration/pages/RFQEventsList",
	"rfqevents/test/integration/pages/RFQEventsObjectPage",
	"rfqevents/test/integration/pages/RFQItemsObjectPage"
], function (JourneyRunner, RFQEventsList, RFQEventsObjectPage, RFQItemsObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('rfqevents') + '/test/flp.html#app-preview',
        pages: {
			onTheRFQEventsList: RFQEventsList,
			onTheRFQEventsObjectPage: RFQEventsObjectPage,
			onTheRFQItemsObjectPage: RFQItemsObjectPage
        },
        async: true
    });

    return runner;
});

