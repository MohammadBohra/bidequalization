/*
 * Bid Equalization System – Data Model
 * =====================================================================
 * Entities:
 *   RFQEvent      – RFQ header (Request for Quotation)
 *   RFQItem       – Line items inside an RFQ
 *   Supplier      – Vendor master
 *   SupplierBid   – Price components submitted by a supplier for an item
 *   BidComparison – Result of a side-by-side equalized comparison
 *   BidFormula    – Dynamic formula used for equalization calculation
 * =====================================================================
 */

namespace BidEqualization;

using {
    cuid,
    managed
} from '@sap/cds/common';

// ─────────────────────────────────────────────
// RFQ Event (Header)
// ─────────────────────────────────────────────
entity RFQEvent : managed {
    key eventID     : String(20)                @title: 'RFQ ID';
    eventName   : String(150)               @title: 'RFQ Name';
    description : String(500)               @title: 'Description';
    status      : String(20) default 'Open' @title: 'Status';

    // Composition – items owned by this RFQ
    items       : Composition of many RFQItem
                      on items.rfq = $self;
}

// ─────────────────────────────────────────────
// RFQ Item (Line Item)
// ─────────────────────────────────────────────
entity RFQItem : cuid, managed {
    rfq         : Association to RFQEvent;
    itemNo      : String(10)              @title: 'Item No';
    commodity   : String(150)             @title: 'Commodity';
    quantity    : Decimal(10, 2)          @title: 'Quantity';
    unit        : String(10) default 'EA' @title: 'Unit';

    // Navigation back to bids and comparisons
    bids        : Composition of many SupplierBid
                      on bids.rfqItem = $self;
    comparisons : Composition of many BidComparison
                      on comparisons.rfqItem = $self;
}

// ─────────────────────────────────────────────
// Supplier (Vendor Master)
// ─────────────────────────────────────────────
entity Supplier : cuid, managed {
    supplierCode : String(20)  @title: 'Supplier Code';
    supplierName : String(150) @title: 'Supplier Name';
    country      : String(50)  @title: 'Country';
    contactEmail : String(100) @title: 'Contact Email';
}

// ─────────────────────────────────────────────
// Supplier Bid (Price components per item)
// ─────────────────────────────────────────────
entity SupplierBid : cuid, managed {
    rfqItem       : Association to RFQItem;
    supplier      : Association to Supplier;

    // Price components used in equalization formula
    localBidValue : Decimal(15, 2) default 0 @title: 'Local Bid Value';
    shippingCost  : Decimal(15, 2) default 0 @title: 'Shipping Cost';
    handlingCost  : Decimal(15, 2) default 0 @title: 'Handling Cost';
    customDuty    : Decimal(15, 2) default 0 @title: 'Custom Duty';
    premium       : Decimal(15, 2) default 0 @title: 'Premium';
    currency      : String(3) default 'USD'  @title: 'Currency';

    // Benchmark flag – marks this supplier as reference for this item
    isBenchmark   : Boolean default false    @title: 'Is Benchmark';
}

// ─────────────────────────────────────────────
// Bid Comparison (Saved comparison results)
// ─────────────────────────────────────────────

entity BidComparison : cuid, managed {
    rfqItem           : Association to RFQItem;
    supplierLeft      : Association to Supplier;
    supplierRight     : Association to Supplier;

    leftEqualizedBid  : Decimal(15, 2);
    equalizedBidRight : Decimal(15, 2);
    winnerSupplier    : Association to Supplier;

    notes             : String(500);

    // ========================
    // LEFT (Benchmark Supplier)
    // ========================
    leftVendorName : String(100);

    leftBenchmarkBidType     : String(20);
    leftBenchmarkBidTypeText : String(100);

    leftPortOfExport     : String(50);
    leftPortOfExportText : String(100);

    leftBenchmarkBidValue : Decimal(15,2);
    leftBenchmarkCurrency : String(3);

    leftDevelopmentType     : String(20);
    leftDevelopmentTypeText : String(50);

    leftDeliveryMode     : String(20);
    leftDeliveryModeText : String(50);

    leftBidValueRange     : String(20);
    leftBidValueRangeText : String(50);

    leftCurveRatio     : String(20);
    leftCurveRatioText : String(20);

    leftEndUseCost         : Decimal(15,2);
    leftEndUseCostCurrency : String(3);

    leftShippingCost         : Decimal(15,2);
    leftShippingCostCurrency : String(3);

    leftHandlingCost         : Decimal(15,2);
    leftHandlingCostCurrency : String(3);

    leftSaudiCustomsRate        : Decimal(5,2);
    leftSaudiManufacturerPremium: Decimal(5,2);

    leftFreight         : Decimal(15,2);
    leftFreightCurrency : String(3);

    leftDuty         : Decimal(15,2);
    leftDutyCurrency : String(3);

    leftPremium         : Decimal(15,2);
    leftPremiumCurrency : String(3);

    // ========================
    // RIGHT (Local Supplier)
    // ========================
    rightVendorName : String(100);

    rightLocalBidType     : String(20);
    rightLocalBidTypeText : String(100);

    rightLocalBidValue    : Decimal(15,2);
    rightLocalBidCurrency : String(3);

    rightLocalEndUseCost         : Decimal(15,2);
    rightLocalEndUseCostCurrency : String(3);

    rightTotalLocalBid : Decimal(15,2);

    rightEqualizationBasis     : String(20);
    rightEqualizationBasisText : String(100);

    rightCommodityDifference : Decimal(15,2);
    rightDifference          : Decimal(15,2);

    formulaExpr : String;
    leftldor: Decimal(15,2);

    additionalFields : Composition of many BidComparisonAdditionalField
        on additionalFields.comparison = $self;
}

// ─────────────────────────────────────────────
// Bid Formula (Dynamic equalization expression)
// ─────────────────────────────────────────────
entity BidFormula : cuid, managed {
    name        : String(100)           @title: 'Formula Name';
    expression  : String(500)           @title: 'Expression';
    trafficexpression  : String(500)           @title: 'Expression';
    dutyexpression  : String(500)           @title: 'Expression';
    premiumexpression  : String(500)           @title: 'Expression';
    description : String(250)           @title: 'Description';
    isActive    : Boolean default false @title: 'Is Active';

    // ===== LEFT CONDITIONS =====
  leftBenchmarkBidType      : String;
  leftDevelopmentType       : String;
  leftDeliveryMode          : String;

  leftBidValueRange           : String;

  leftExceptionalWeight     : String;

  // ===== RIGHT CONDITIONS (if needed for matching) =====  
  rightLocalBidType         : String;
  ldorexpression  : String(500)
}



entity SelectItems {
    key ID        : UUID;
    category      : String(50);   
    code          : String(20);   
    text          : String(255);  
    sequence      : Integer;      
    isActive      : Boolean default true;

}

entity BidComparisonAdditionalField : cuid, managed {
    comparison : Association to BidComparison;

    fieldName  : String(100);
    fieldValue : String(500);

    side       : String(10); // 'LEFT' or 'RIGHT' (important!)
}
