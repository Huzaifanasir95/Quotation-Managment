# Vendor Rate Request Integration Guide

This guide explains how to integrate the vendor rate request functionality into the `CreateQuotationModal.tsx` component.

## Overview

The vendor rate request feature allows users to:
1. **Request rates from vendors** by category - generates Excel files for each vendor
2. **Compare vendor rates** for individual items
3. **Apply best rates** directly to quotation items

## Files Created

- `VendorRateRequestModals.tsx` - Contains the vendor rate request and comparison modals

## Integration Steps

### Step 1: Import the Component

Add this import at the top of `CreateQuotationModal.tsx` (around line 7):

```typescript
import VendorRateRequestModals from './VendorRateRequestModals';
```

### Step 2: Add State Variable

The state variable `selectedItemForRates` has already been added (line 53). Verify it exists:

```typescript
const [selectedItemForRates, setSelectedItemForRates] = useState<number | null>(null);
```

### Step 3: Add "Request Rates" Button

In the items tab section (around line 1237), add the "Request Rates" button **before** the "View Mode Toggle" div:

```typescript
{/* Request Vendor Rates Button */}
<button 
  onClick={() => setShowVendorRateModal(true)} 
  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center space-x-2"
  disabled={items.length === 0}
>
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
  <span>Request Rates</span>
</button>
```

### Step 4: Add "Compare Rates" Buttons to Items

Find the two locations where items show their totals (grid view around line 1491 and list view around line 1594). Replace the simple total display with this enhanced version:

**For Grid View (around line 1491-1495):**

Replace:
```typescript
<div className="bg-gray-50 p-2 border-t border-gray-200 rounded-lg">
  <p className="text-sm text-gray-900">
    <span className="font-medium">Total:</span> Rs. {(item.quantity * item.unitPrice).toFixed(2)}
  </p>
</div>
```

With:
```typescript
<div className="bg-gray-50 p-2 border-t border-gray-200 rounded-lg">
  <div className="flex justify-between items-center">
    <p className="text-sm text-gray-900">
      <span className="font-medium">Total:</span> Rs. {(item.quantity * item.unitPrice).toFixed(2)}
    </p>
    <button
      onClick={() => {
        setSelectedItemForRates(index);
        setShowRateComparison(true);
      }}
      className="text-xs text-purple-600 hover:text-purple-700 font-medium"
    >
      Compare Rates
    </button>
  </div>
</div>
```

**For List View (around line 1594-1598):**

Make the same replacement for the list view section.

### Step 5: Render the Modals Component

At the end of the component, before the return statement that renders the portal (around line 2384), add the VendorRateRequestModals component:

Find this section:
```typescript
// Render modal using portal to document.body for proper screen centering
return createPortal(
  <>
    {modalContent}
    {pdfFormatModal}
  </>,
  document.body
);
```

Replace it with:
```typescript
// Render modal using portal to document.body for proper screen centering
return createPortal(
  <>
    {modalContent}
    {pdfFormatModal}
    <VendorRateRequestModals
      showVendorRateModal={showVendorRateModal}
      setShowVendorRateModal={setShowVendorRateModal}
      showRateComparison={showRateComparison}
      setShowRateComparison={setShowRateComparison}
      selectedItemForRates={selectedItemForRates}
      setSelectedItemForRates={setSelectedItemForRates}
      items={items}
      setItems={setItems}
      vendors={vendors}
      isLoadingVendors={isLoadingVendors}
      products={products}
      formData={formData}
      categoryVendors={categoryVendors}
      setCategoryVendors={setCategoryVendors}
      vendorRates={vendorRates}
      setVendorRates={setVendorRates}
    />
  </>,
  document.body
);
```

## Features Explained

### 1. Request Vendor Rates
- Click "Request Rates" button in the items tab
- Items are automatically grouped by category
- Select vendors for each category
- Generates Excel files with:
  - Vendor-specific headers
  - Category information
  - Item details (name, description, quantity, UOM)
  - Empty fields for vendors to fill in rates and lead times

### 2. Compare Vendor Rates
- Click "Compare Rates" button on any item
- Enter rates from different vendors
- See percentage differences from current price
- Automatically identifies the best (lowest) rate
- Apply the best rate with one click

### 3. Excel File Format
Each generated Excel file includes:
- Vendor name and category in header
- Date and reference number
- Structured table with:
  - S.No, Category, Serial No, Item Name
  - Description, Quantity, Unit of Measure
  - Empty columns for: Your Rate (PKR), Lead Time (Days), Remarks

## Testing

1. **Create a quotation** with multiple items
2. **Assign categories** to items (e.g., "Electronics", "Furniture")
3. **Click "Request Rates"** - should open vendor selection modal
4. **Select vendors** for each category
5. **Click "Generate Excel Files"** - should download Excel files
6. **Click "Compare Rates"** on an item - should open comparison modal
7. **Enter rates** from vendors
8. **Apply best rate** - should update item price

## Troubleshooting

- **Button not showing**: Verify the button code is added in the correct location (items tab, before View Mode Toggle)
- **Modals not appearing**: Check that the VendorRateRequestModals component is rendered in the portal
- **Excel not downloading**: Ensure `loadXLSX()` function is working correctly
- **State not updating**: Verify all state variables are properly passed as props

## Notes

- The feature requires items to have a `category` field for optimal grouping
- Items without categories are grouped under "Uncategorized"
- Excel files are named with vendor name, category, and date for easy identification
- The rate comparison shows percentage differences to help identify savings
