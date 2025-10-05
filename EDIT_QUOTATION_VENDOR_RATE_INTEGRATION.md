# EditQuotationModal Vendor Rate Integration Guide

This guide explains how to integrate the comprehensive vendor rate functionality into the `EditQuotationModal.tsx` component.

## Overview

The vendor rate functionality for EditQuotationModal includes:
1. **Vendor Rate Upload/Input Section** - Excel file upload and manual rate entry
2. **Profit Margin Calculation Fields** - Cost price + margin % = selling price calculations
3. **Rate Validity Tracking** - Track rate expiration dates and validity periods
4. **Vendor Rate Comparison Table** - Compare rates from multiple vendors with visual indicators

## Files Created

- `VendorRateEditComponents.tsx` - Contains all vendor rate functionality for editing quotations

## Integration Steps

### Step 1: Import Required Components and Types

Add these imports at the top of `EditQuotationModal.tsx` (around line 5):

```typescript
import VendorRateEditComponents from './VendorRateEditComponents';
import { Vendor } from '../../lib/api';
```

### Step 2: Add State Variables

Add these state variables after the existing state declarations (around line 69):

```typescript
// Vendor rate states
const [vendors, setVendors] = useState<Vendor[]>([]);
const [isLoadingVendors, setIsLoadingVendors] = useState(false);
const [showVendorRateModal, setShowVendorRateModal] = useState(false);
const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);
```

### Step 3: Update QuotationItem Interface

Extend the existing `QuotationItem` interface (around line 14) to include vendor rate fields:

```typescript
interface QuotationItem {
  id: string;
  product_id?: string | null;
  description: string;
  category?: string;
  serial_number?: string;
  item_name?: string;
  unit_of_measure?: string;
  gst_percent?: number;
  item_type?: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  tax_percent: number;
  line_total: number;
  isCustom?: boolean;
  au_field?: string;
  // New vendor rate fields
  vendorRates?: VendorRate[];
  selectedVendorRate?: string;
  costPrice?: number;
  marginPercent?: number;
}

interface VendorRate {
  id: string;
  vendorId: string;
  vendorName: string;
  costPrice: number;
  marginPercent: number;
  sellingPrice: number;
  leadTime: number;
  validFrom: string;
  validUntil: string;
  remarks: string;
  isActive: boolean;
  createdAt: string;
}
```

### Step 4: Add Vendor Loading Function

Add this function after the existing `loadProducts` function (around line 154):

```typescript
const loadVendors = async () => {
  setIsLoadingVendors(true);
  try {
    const response = await apiClient.getVendors({ limit: 100 });
    if (response.success) {
      setVendors(response.data.vendors || []);
    }
  } catch (error) {
    console.error('Failed to load vendors:', error);
  } finally {
    setIsLoadingVendors(false);
  }
};
```

### Step 5: Update useEffect to Load Vendors

Modify the existing useEffect (around line 111) to include vendor loading:

```typescript
useEffect(() => {
  if (isOpen && quotationId) {
    fetchCustomers();
    fetchQuotation();
    fetchExistingAttachments();
    loadProducts();
    loadVendors(); // Add this line
  }
}, [isOpen, quotationId]);
```

### Step 6: Add "Manage Rates" Button to Items

Find the items rendering section and add a "Manage Rates" button to each item. Look for where items are displayed (around the item cards/rows) and add:

**For Grid View Items:**
```typescript
{/* Add this button in the item card actions area */}
<button
  onClick={() => {
    setSelectedItemIndex(index);
    setShowVendorRateModal(true);
  }}
  className="text-xs text-purple-600 hover:text-purple-700 font-medium flex items-center"
>
  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H9a2 2 0 00-2 2v.01" />
  </svg>
  Manage Rates
</button>
```

### Step 7: Add Profit Margin Display to Items

Add profit margin information display in the item cards. Find where unit price is displayed and add:

```typescript
{/* Add this after the unit price display */}
{item.costPrice && (
  <div className="text-xs text-gray-500 mt-1">
    Cost: Rs. {item.costPrice.toFixed(2)} | 
    Margin: {item.marginPercent?.toFixed(1)}% | 
    Profit: Rs. {(item.unit_price - item.costPrice).toFixed(2)}
  </div>
)}
{item.selectedVendorRate && (
  <div className="text-xs text-green-600 mt-1 flex items-center">
    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
    Vendor rate applied
  </div>
)}
```

### Step 8: Add Bulk Rate Management Button

Add a bulk rate management button in the items header section (where "Add Item" buttons are):

```typescript
{/* Add this button alongside existing item management buttons */}
<button 
  onClick={() => setShowVendorRateModal(true)} 
  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center space-x-2"
  disabled={items.length === 0}
>
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H9a2 2 0 00-2 2v.01" />
  </svg>
  <span>Manage Vendor Rates</span>
</button>
```

### Step 9: Render the VendorRateEditComponents

At the end of the component, before the return statement (around line 1669), add the VendorRateEditComponents:

Find this section:
```typescript
// Render modal using portal to document.body for full screen overlay
return createPortal(
  <>
    {modalContent}
    {filePreviewModal}
  </>,
  document.body
);
```

Replace it with:
```typescript
// Render modal using portal to document.body for full screen overlay
return createPortal(
  <>
    {modalContent}
    {filePreviewModal}
    <VendorRateEditComponents
      items={items}
      setItems={setItems}
      vendors={vendors}
      isLoadingVendors={isLoadingVendors}
      selectedItemIndex={selectedItemIndex}
      setSelectedItemIndex={setSelectedItemIndex}
      showVendorRateModal={showVendorRateModal}
      setShowVendorRateModal={setShowVendorRateModal}
    />
  </>,
  document.body
);
```

## Features Explained

### 1. Vendor Rate Upload/Input Section
- **Excel Upload**: Drag & drop or click to upload Excel files with vendor rates
- **Expected Format**: Structured columns for Item Name, Vendor Name, Cost Price, Margin %, etc.
- **Automatic Processing**: Matches uploaded data to existing quotation items
- **Bulk Import**: Upload rates for multiple items and vendors at once

### 2. Profit Margin Calculation Fields
- **Cost Price Input**: Enter the actual cost from vendor
- **Margin Percentage**: Set desired profit margin
- **Selling Price**: Automatically calculated or manually entered
- **Real-time Updates**: Changes in any field update the others automatically
- **Profit Display**: Shows actual profit amount and margin percentage

### 3. Rate Validity Tracking
- **Valid From/Until Dates**: Track when vendor rates are active
- **Expiration Indicators**: Visual warnings for expired rates
- **Active Rate Filtering**: Only show currently valid rates
- **Automatic Validation**: Prevent applying expired rates

### 4. Vendor Rate Comparison Table
- **Multi-Vendor Display**: Compare rates from different vendors side by side
- **Visual Indicators**: Highlight selected rates and expired rates
- **Profit Calculations**: Show profit amounts for each vendor rate
- **One-Click Apply**: Apply selected vendor rate to item with single click
- **Rate History**: Track all vendor rates for each item

## Excel Upload Format

The system expects Excel files with these columns:

| Column Name | Description | Required |
|-------------|-------------|----------|
| Item Name | Name of the quotation item | Yes |
| Vendor Name | Name of the vendor | Yes |
| Cost Price | Vendor's cost price | Yes |
| Margin % | Profit margin percentage | No |
| Selling Price | Final selling price | No |
| Lead Time | Delivery time in days | No |
| Valid From | Rate validity start date (YYYY-MM-DD) | No |
| Valid Until | Rate validity end date (YYYY-MM-DD) | No |
| Remarks | Additional notes | No |

## Usage Workflow

1. **Edit Quotation**: Open existing quotation for editing
2. **Upload Vendor Rates**: Click "Manage Vendor Rates" → "Upload Rates" → Select Excel file
3. **Set Profit Margins**: Use profit margin calculator for each item
4. **Compare Rates**: View vendor rate comparison table
5. **Apply Best Rates**: Click "Apply" on preferred vendor rates
6. **Track Validity**: Monitor rate expiration dates
7. **Save Changes**: Update quotation with new rates and margins

## Testing

1. **Open EditQuotationModal** with an existing quotation
2. **Click "Manage Vendor Rates"** - should open vendor rate modal
3. **Upload Excel file** with vendor rates - should process and display rates
4. **Use profit margin calculator** - should update selling prices automatically
5. **Compare vendor rates** - should show comparison table with apply buttons
6. **Apply vendor rate** - should update item cost price and selling price
7. **Check rate validity** - should show expiration warnings for old rates

## Troubleshooting

- **Modal not opening**: Check that state variables are properly added
- **Excel upload failing**: Verify Excel file format matches expected columns
- **Calculations not working**: Ensure profit margin functions are properly integrated
- **Rates not displaying**: Check that vendor loading function is called
- **Apply button not working**: Verify item update functions are connected

## Notes

- The system automatically calculates selling price from cost price + margin
- Expired rates are visually indicated but not automatically removed
- Multiple rates per vendor per item are supported for rate history
- The profit margin calculator works bidirectionally (cost→selling or selling→cost)
- Rate validity is checked in real-time when displaying rates
