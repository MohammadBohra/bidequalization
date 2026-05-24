/*
 * Bid Equalization Service – CDS Service Definition
 * =====================================================================
 * Exposes entities and custom actions for the Bid Equalization app.

 * =====================================================================
 */

using BidEqualization from '../db/schema';


service BidEqualizationService @(requires: 'authenticated-user'){

    // ─────────────────────────────────────────────
    // Entity Projections
    // ─────────────────────────────────────────────

// @UI.SelectionFields: [
  //   leftBenchmarkBidType,
// ]
 
// entity BidFormula as projection on BidEqualization.BidFormula;
    entity Events      as projection on BidEqualization.Events;
    
    entity RFQItems       as projection on BidEqualization.RFQItem;

    entity EventSuppliers      as projection on BidEqualization.EventSuppliers;

    entity SupplierBids   as projection on BidEqualization.SupplierBid;

    entity BidComparisons as projection on BidEqualization.BidComparison {
        *,
        additionalFields
    };
    @odata.draft.enabled
    entity BidFormulas    as projection on BidEqualization.BidFormula;
    entity SelectItems as projection on BidEqualization.SelectItems;

    // Inside your service definition (e.g., CatService)

// 1. Create a view helper to fetch unique filter values
// Inside your service block

@readonly
entity VH_leftBenchmarkBidTypeDesc as select from BidEqualization.BidFormula {
    key leftBenchmarkBidTypeDesc
} group by leftBenchmarkBidTypeDesc;

@readonly
entity VH_leftDevelopmentType as select from BidEqualization.BidFormula {
    key leftDevelopmentType
} group by leftDevelopmentType;

@readonly
entity VH_leftDeliveryModeDesc as select from BidEqualization.BidFormula {
    key leftDeliveryModeDesc
} group by leftDeliveryModeDesc;

@readonly
entity VH_leftBidValueRangeDesc as select from BidEqualization.BidFormula {
    key leftBidValueRangeDesc
} group by leftBidValueRangeDesc;

@readonly
entity VH_leftExceptionalWeight as select from BidEqualization.BidFormula {
    key leftExceptionalWeight
} group by leftExceptionalWeight;

@readonly
entity VH_rightLocalBidTypeDesc as select from BidEqualization.BidFormula {
    key rightLocalBidTypeDesc
} group by rightLocalBidTypeDesc;


    
  // ─────────────────────────────────────────────
    // Actions
    // ─────────────────────────────────────────────

  

    action calculateComparison(
    leftBenchmarkBidType   : String,
    
    leftDevelopmentType    : String,
    leftDeliveryMode       : String,
    leftBidValue           : Decimal(15,2),
    leftBidValueRange      : String,
    leftExceptionalWeight  : String,
    leftShippingCost       : Decimal(15,2),
    leftHandlingCost       : Decimal(15,2),
    leftEUC                : Decimal(15,2),
    leftSaudiCustomsRate   : Decimal(5,2),
    leftSaudiManufacturerPremium: Decimal(5,2),

    
    rightLocalBidType      : String,
    
    
    rightBidValue          : Decimal(15,2),
    
    rightEUC               : Decimal(15,2)

) returns {
    leftEqualizedBid  : Decimal(15,2);
    formulaName   : String;
    formulaExpr   : String;
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
    // action generatePDF(comparisonID: UUID)          returns LargeBinary;
    function generatePDF(comparisonID: UUID) returns LargeBinary;
}

// ─────────────────────────────────────────────
// Annotations for Fiori Elements
// ─────────────────────────────────────────────

annotate BidEqualizationService.Events with @(UI: {
    HeaderInfo         : {
        TypeName      : 'RFQ Event',
        TypeNamePlural: 'RFQ Events',
        Title         : {Value: EventId},
        Description   : {Value: EventDescription}
    },
    LineItem           : [
        {
            Value: EventId,
            Label: 'RFQ ID'
        },
        {
            Value: EventDescription,
            Label: 'Description'
        },
        {Value: EventStartDate},
        {Value: EventEndDate},
        {Value: SourcingProject},
        {
            Value: EventStatus,
            Label: 'Status'
        }
    ],
    SelectionFields    : [
        EventId,
        EventDescription,
        EventStatus
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
        {Value: EventId},
        {Value: EventDescription},
        // {Value: description},
        {Value: EventStatus}
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
