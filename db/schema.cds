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
entity RFQEvent : cuid, managed {
    eventID     : String(20)                @title: 'RFQ ID';
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

    // Equalized totals computed by the service action
    equalizedBidLeft  : Decimal(15, 2) @title: 'Equalized Bid (Left)';
    equalizedBidRight : Decimal(15, 2) @title: 'Equalized Bid (Right)';
    winnerSupplier    : Association to Supplier;

    notes             : String(500)    @title: 'Notes';
}

// ─────────────────────────────────────────────
// Bid Formula (Dynamic equalization expression)
// ─────────────────────────────────────────────
entity BidFormula : cuid, managed {
    name        : String(100)           @title: 'Formula Name';
    // Expression uses variable names matching SupplierBid fields:
    // localBidValue, shippingCost, handlingCost, customDuty, premium
    // Example: "localBidValue + shippingCost + handlingCost + customDuty + premium"
    expression  : String(500)           @title: 'Expression';
    description : String(250)           @title: 'Description';
    isActive    : Boolean default false @title: 'Is Active';
}
