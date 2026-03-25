/*
 * Bid Equalization Service – CDS Service Definition
 * =====================================================================
 * Exposes entities and custom actions for the Bid Equalization app.
 * Base path: /api
 * =====================================================================
 */

using BidEqualization from '../db/schema';

service BidEqualizationService @(path: '/api') {

    // ─────────────────────────────────────────────
    // Entity Projections
    // ─────────────────────────────────────────────

    entity RFQEvents      as projection on BidEqualization.RFQEvent;

    entity RFQItems       as projection on BidEqualization.RFQItem;

    entity Suppliers      as projection on BidEqualization.Supplier;

    entity SupplierBids   as projection on BidEqualization.SupplierBid;

    entity BidComparisons as projection on BidEqualization.BidComparison;

    entity BidFormulas    as projection on BidEqualization.BidFormula;

    // ─────────────────────────────────────────────
    // Actions
    // ─────────────────────────────────────────────

    /**
     * Calculate equalized bids for two suppliers on a given RFQ Item.
     * Uses the active BidFormula expression to compute totals.
     * Returns equalized values and the winning supplier ID.
     */
    action calculateComparison(rfqItemID: UUID,
                               supplierLeft: UUID,
                               supplierRight: UUID) returns {
        equalizedLeft  : Decimal;
        equalizedRight : Decimal;
        winner         : UUID;
        formulaName    : String;
        formulaExpr    : String;
    };

    /**
     * Persist a completed comparison to the BidComparison table.
     */
    action saveComparison(rfqItemID: UUID,
                          supplierLeftID: UUID,
                          supplierRightID: UUID,
                          equalizedLeft: Decimal,
                          equalizedRight: Decimal,
                          winnerID: UUID,
                          notes: String)            returns BidComparisons;

    /**
     * Mark a supplier as the benchmark for a given RFQ item.
     * Clears any previous benchmark on the same item.
     */
    action markBenchmark(rfqItemID: UUID,
                         supplierID: UUID)          returns Boolean;

    /**
     * Generate a PDF report for a saved BidComparison.
     * Returns raw PDF binary data.
     */
    action generatePDF(comparisonID: UUID)          returns LargeBinary;
}

// ─────────────────────────────────────────────
// Annotations for Fiori Elements
// ─────────────────────────────────────────────

annotate BidEqualizationService.RFQEvents with @(UI: {
    HeaderInfo         : {
        TypeName      : 'RFQ Event',
        TypeNamePlural: 'RFQ Events',
        Title         : {Value: eventName},
        Description   : {Value: eventID}
    },
    LineItem           : [
        {
            Value: eventID,
            Label: 'RFQ ID'
        },
        {
            Value: eventName,
            Label: 'RFQ Name'
        },
        {
            Value: description,
            Label: 'Description'
        },
        {
            Value: status,
            Label: 'Status'
        }
    ],
    SelectionFields    : [
        eventID,
        eventName,
        status
    ],
    Facets             : [
        {
            $Type : 'UI.ReferenceFacet',
            Label : 'General Information',
            Target: '@UI.FieldGroup#General'
        },
        {
            $Type : 'UI.ReferenceFacet',
            Label : 'Line Items',
            Target: 'items/@UI.LineItem'
        }
    ],
    FieldGroup #General: {Data: [
        {Value: eventID},
        {Value: eventName},
        {Value: description},
        {Value: status}
    ]}
});

annotate BidEqualizationService.RFQItems with @(UI: {
    HeaderInfo             : {
        TypeName      : 'RFQ Item',
        TypeNamePlural: 'RFQ Items',
        Title         : {Value: commodity},
        Description   : {Value: itemNo}
    },
    LineItem               : [
        {
            Value: itemNo,
            Label: 'Item No'
        },
        {
            Value: commodity,
            Label: 'Commodity'
        },
        {
            Value: quantity,
            Label: 'Quantity'
        },
        {
            Value: unit,
            Label: 'Unit'
        }
    ],
    Facets                 : [{
        $Type : 'UI.ReferenceFacet',
        Label : 'Item Details',
        Target: '@UI.FieldGroup#ItemDetails'
    }],
    FieldGroup #ItemDetails: {Data: [
        {Value: itemNo},
        {Value: commodity},
        {Value: quantity},
        {Value: unit}
    ]}
});
