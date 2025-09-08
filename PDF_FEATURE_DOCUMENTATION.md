# PDF Download Feature for Create New Quotation

## Overview
Added PDF download functionality to the "Create New Quotation" modal in the sales module. Users can now generate and download quotations as PDF files during the creation process.

## Features
- **PDF Generation**: Generate professional-looking PDF quotations
- **Dynamic Content**: PDF includes all quotation details, customer information, items, and totals
- **Multiple Access Points**: PDF can be downloaded from both the preview tab header and the footer action buttons
- **Loading States**: Visual feedback during PDF generation
- **Error Handling**: Proper error messages if PDF generation fails

## Technical Implementation

### Files Modified
1. **CreateQuotationModal.tsx** - Added PDF download functionality
2. **pdfUtils.ts** - Created PDF generation utilities
3. **dynamicImports.ts** - Added PDF library dynamic imports
4. **package.json** - Added jsPDF and html2canvas dependencies

### Dependencies Added
- `jspdf` - PDF generation library
- `html2canvas` - HTML to image conversion
- `@types/jspdf` - TypeScript types for jsPDF

### PDF Features
- **Professional Layout**: Clean, business-appropriate design
- **Company Branding**: Customizable company information
- **Complete Details**: Includes all quotation information
- **Proper Formatting**: Tables, totals, and terms properly formatted
- **Automatic Naming**: Files named with quotation number and date

## Usage Instructions

### For Users
1. **Navigate to Sales** → Create New Quotation
2. **Fill in Customer Details** in the Customer Info tab
3. **Add Items** in the Items tab
4. **Review Terms** in the Terms & Conditions tab
5. **Skip Attachments** (optional tab)
6. **Preview & Download**: In the Review tab, click "Download PDF" button
   - The PDF will be automatically generated and downloaded
   - File will be named: `quotation-QUOTE-[timestamp]-[date].pdf`

### PDF Download Locations
- **Preview Tab Header**: Red "Download PDF" button next to the title
- **Footer Actions**: Red "Download PDF" button next to "Create Quotation"

### Error Handling
- Validates that customer is selected
- Validates that at least one item is added
- Shows loading spinner during generation
- Displays error messages if generation fails

## PDF Content Structure
1. **Header**: Company name and quotation title
2. **Company Information**: Customizable business details
3. **Quotation Details**: Quote number, date, valid until
4. **Customer Information**: Bill-to details
5. **Items Table**: Description, quantity, unit price, totals
6. **Totals Section**: Subtotal, tax (if applicable), grand total
7. **Terms & Conditions**: Legal terms and conditions
8. **Notes**: Additional notes if provided
9. **Footer**: Professional closing message

## Customization
The PDF layout and company information can be customized by modifying the `pdfUtils.ts` file:
- Company name and details
- Logo (can be added)
- Colors and styling
- Additional fields

## Performance
- Uses dynamic imports for PDF libraries to avoid bundle bloat
- Libraries only loaded when PDF generation is requested
- Efficient memory usage with proper cleanup

## Browser Compatibility
- Works in all modern browsers
- Requires JavaScript enabled
- No server-side processing needed

## Future Enhancements
- Company logo integration
- Custom PDF templates
- Email PDF functionality
- Print preview option
- Batch PDF generation
