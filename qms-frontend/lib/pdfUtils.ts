import { loadJsPDF, loadHtml2Canvas } from './dynamicImports';

interface QuotationItem {
  description: string;
  quantity: number;
  unit_price: number;
  line_total?: number;
}

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  contact_person?: string;
}

interface QuotationData {
  id?: string;
  quotation_number?: string;
  customer: Customer;
  quotation_date: string;
  valid_until: string;
  items: QuotationItem[];
  subtotal: number;
  tax_amount?: number;
  total_amount: number;
  terms_conditions?: string;
  notes?: string;
}

export const generateQuotationPDF = async (quotationData: QuotationData): Promise<void> => {
  try {
    const jsPDF = await loadJsPDF();
    if (!jsPDF) {
      throw new Error('PDF generation library not available');
    }

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const lineHeight = 7;
    let yPosition = margin;

    // Helper function to add text with word wrapping
    const addWrappedText = (text: string, x: number, y: number, maxWidth: number, fontSize: number = 10) => {
      pdf.setFontSize(fontSize);
      const lines = pdf.splitTextToSize(text, maxWidth);
      pdf.text(lines, x, y);
      return y + (lines.length * lineHeight);
    };

    // Header
    pdf.setFontSize(24);
    pdf.setFont('helvetica', 'bold');
    pdf.text('QUOTATION', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;

    // Company Info (you can customize this)
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text('QMS - Quotation Management System', margin, yPosition);
    yPosition += lineHeight;
    pdf.text('Professional Quotation Services', margin, yPosition);
    yPosition += lineHeight;
    pdf.text('Email: info@qms.com | Web: www.qms.com', margin, yPosition);
    yPosition += 15;

    // Line separator
    pdf.setDrawColor(0, 0, 0);
    pdf.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 10;

    // Quotation Details
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Quotation Details:', margin, yPosition);
    yPosition += lineHeight + 2;

    pdf.setFont('helvetica', 'normal');
    if (quotationData.quotation_number) {
      pdf.text(`Quotation #: ${quotationData.quotation_number}`, margin, yPosition);
      yPosition += lineHeight;
    }
    pdf.text(`Date: ${new Date(quotationData.quotation_date).toLocaleDateString()}`, margin, yPosition);
    yPosition += lineHeight;
    pdf.text(`Valid Until: ${new Date(quotationData.valid_until).toLocaleDateString()}`, margin, yPosition);
    yPosition += 15;

    // Customer Information
    pdf.setFont('helvetica', 'bold');
    pdf.text('Bill To:', margin, yPosition);
    yPosition += lineHeight + 2;

    pdf.setFont('helvetica', 'normal');
    pdf.text(quotationData.customer.name, margin, yPosition);
    yPosition += lineHeight;
    if (quotationData.customer.contact_person) {
      pdf.text(`Contact: ${quotationData.customer.contact_person}`, margin, yPosition);
      yPosition += lineHeight;
    }
    if (quotationData.customer.email) {
      pdf.text(`Email: ${quotationData.customer.email}`, margin, yPosition);
      yPosition += lineHeight;
    }
    if (quotationData.customer.phone) {
      pdf.text(`Phone: ${quotationData.customer.phone}`, margin, yPosition);
      yPosition += lineHeight;
    }
    if (quotationData.customer.address) {
      yPosition = addWrappedText(quotationData.customer.address, margin, yPosition, pageWidth - 2 * margin);
    }
    yPosition += 15;

    // Items Table Header
    const tableStartY = yPosition;
    const colWidths = [80, 20, 30, 30]; // Description, Qty, Unit Price, Total
    const colPositions = [margin, margin + colWidths[0], margin + colWidths[0] + colWidths[1], margin + colWidths[0] + colWidths[1] + colWidths[2]];

    pdf.setFont('helvetica', 'bold');
    pdf.setFillColor(240, 240, 240);
    pdf.rect(margin, yPosition, pageWidth - 2 * margin, 10, 'F');
    
    yPosition += 7;
    pdf.text('Description', colPositions[0] + 2, yPosition);
    pdf.text('Qty', colPositions[1] + 2, yPosition);
    pdf.text('Unit Price', colPositions[2] + 2, yPosition);
    pdf.text('Total', colPositions[3] + 2, yPosition);
    yPosition += 5;

    // Items
    pdf.setFont('helvetica', 'normal');
    // Calculate totals section height once (will be used for all page break checks)
    let totalsRows = 2; // Sub Total + Total
    if (quotationData.tax_amount && quotationData.tax_amount > 0) {
      totalsRows = 3; // Sub Total + GST + Total
    }
    const totalsHeight = (totalsRows * 12) + 25; // 12mm per box + spacing
    
    let subtotal = 0;

    quotationData.items.forEach((item, index) => {
      const itemTotal = item.line_total || (item.quantity * item.unit_price);
      subtotal += itemTotal;

      // Always reserve space for totals section after items table
      const spaceNeeded = lineHeight + totalsHeight; // Current item + reserved space for totals
      
      // Check if current item + totals section fit on current page
      if (yPosition + spaceNeeded > pageHeight - 10) {
        pdf.addPage();
        yPosition = margin;
      }

      pdf.text(item.description, colPositions[0] + 2, yPosition);
      pdf.text(item.quantity.toString(), colPositions[1] + 2, yPosition);
      pdf.text(`Rs. ${item.unit_price.toFixed(2)}`, colPositions[2] + 2, yPosition);
      pdf.text(`Rs. ${itemTotal.toFixed(2)}`, colPositions[3] + colWidths[3] - 2, yPosition, { align: 'right' });
      yPosition += lineHeight;
    });

    // Total Section (now attached to items - no separate page break check)
    yPosition += 10;
    pdf.line(colPositions[2], yPosition - 5, pageWidth - margin, yPosition - 5);
    
    const totalsBoxHeight = 12;
    let totalsSectionY = yPosition - 5;
    
    pdf.setFont('helvetica', 'bold');
    
    // Subtotal row with boxes
    pdf.rect(colPositions[2], totalsSectionY, colWidths[2], totalsBoxHeight);
    pdf.rect(colPositions[3], totalsSectionY, colWidths[3], totalsBoxHeight);
    pdf.text('Sub Total', colPositions[2] + 2, totalsSectionY + 8);
    pdf.text(`Rs. ${quotationData.subtotal.toFixed(2)}`, colPositions[3] + colWidths[3] - 2, totalsSectionY + 8, { align: 'right' });
    totalsSectionY += totalsBoxHeight;

    // GST/Tax row with boxes (if applicable)
    if (quotationData.tax_amount && quotationData.tax_amount > 0) {
      pdf.rect(colPositions[2], totalsSectionY, colWidths[2], totalsBoxHeight);
      pdf.rect(colPositions[3], totalsSectionY, colWidths[3], totalsBoxHeight);
      pdf.text('GST @ 18%', colPositions[2] + 2, totalsSectionY + 8);
      pdf.text(`Rs. ${quotationData.tax_amount.toFixed(2)}`, colPositions[3] + colWidths[3] - 2, totalsSectionY + 8, { align: 'right' });
      totalsSectionY += totalsBoxHeight;
    }

    // Total row with boxes
    pdf.setFontSize(14);
    pdf.rect(colPositions[2], totalsSectionY, colWidths[2], totalsBoxHeight);
    pdf.rect(colPositions[3], totalsSectionY, colWidths[3], totalsBoxHeight);
    pdf.text('Total', colPositions[2] + 2, totalsSectionY + 8);
    pdf.text(`Rs. ${quotationData.total_amount.toFixed(2)}`, colPositions[3] + colWidths[3] - 2, totalsSectionY + 8, { align: 'right' });
    
    yPosition = totalsSectionY + totalsBoxHeight + 15;

    // Terms and Conditions
    if (quotationData.terms_conditions) {
      // Only move if header absolutely won't fit (minimal 8mm margin)
      if (yPosition + 15 > pageHeight - 8) {
        pdf.addPage();
        yPosition = margin;
      }
      
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Terms & Conditions:', margin, yPosition);
      yPosition += lineHeight + 2;

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      
      // Calculate text height but be much more aggressive about keeping on same page
      const textLines = pdf.splitTextToSize(quotationData.terms_conditions, pageWidth - 2 * margin);
      const estimatedTextHeight = textLines.length * 5;
      
      // Only move content if absolutely no space (minimal 8mm bottom margin)
      if (yPosition + estimatedTextHeight > pageHeight - 8) {
        pdf.addPage();
        yPosition = margin;
      }
      
      yPosition = addWrappedText(quotationData.terms_conditions, margin, yPosition, pageWidth - 2 * margin, 10);
      yPosition += 10;
    }

    // Notes
    if (quotationData.notes && quotationData.notes !== 'NULL') {
      // Only move if header absolutely won't fit (minimal 8mm margin)
      if (yPosition + 15 > pageHeight - 8) {
        pdf.addPage();
        yPosition = margin;
      }
      
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Notes:', margin, yPosition);
      yPosition += lineHeight + 2;

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      
      // Calculate text height but be aggressive about keeping on same page
      const textLines = pdf.splitTextToSize(quotationData.notes, pageWidth - 2 * margin);
      const estimatedTextHeight = textLines.length * 5;
      
      // Only move content if absolutely no space (minimal 8mm bottom margin)
      if (yPosition + estimatedTextHeight > pageHeight - 8) {
        pdf.addPage();
        yPosition = margin;
      }
      
      yPosition = addWrappedText(quotationData.notes, margin, yPosition, pageWidth - 2 * margin, 10);
    }

    // Authorized Signature Section (independent from other sections)
    const signatureHeight = 40; // Space needed for signature section
    
    // Check if signature section fits on current page (minimal 8mm bottom margin)
    if (yPosition + signatureHeight > pageHeight - 8) {
      pdf.addPage();
      yPosition = margin;
    }
    
    yPosition += 15; // Space before signature
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Authorized Signature', margin, yPosition);
    yPosition += 10;
    
    // Signature line
    pdf.setDrawColor(0, 0, 0);
    pdf.line(margin, yPosition + 15, margin + 80, yPosition + 15);
    yPosition += 25;

    // Footer - move to next page only if very little space left (like with 8+ items)
    const footerHeight = 20;
    if (yPosition + footerHeight > pageHeight - 5) {
      pdf.addPage();
      yPosition = margin;
    }
    
    const footerY = yPosition + 10;
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Thank you for your business!', pageWidth / 2, footerY, { align: 'center' });

    // Save the PDF
    const filename = `quotation-${quotationData.quotation_number || quotationData.id || 'new'}-${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(filename);

  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF. Please try again.');
  }
};

interface VendorBillData {
  id: string;
  bill_number: string;
  bill_date: string;
  due_date?: string;
  status: string;
  subtotal: number;
  tax_amount?: number;
  total_amount: number;
  paid_amount?: number;
  notes?: string;
  vendors?: {
    name: string;
    email?: string;
    phone?: string;
    gst_number?: string;
    contact_person?: string;
  };
  purchase_orders?: {
    po_number: string;
    status?: string;
  };
}

export const generateVendorBillPDF = async (billData: VendorBillData): Promise<void> => {
  try {
    const jsPDF = await loadJsPDF();
    if (!jsPDF) {
      throw new Error('PDF generation library not available');
    }

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const lineHeight = 7;
    let yPosition = margin;

    // Helper function to add text with word wrapping
    const addWrappedText = (text: string, x: number, y: number, maxWidth: number, fontSize: number = 10) => {
      pdf.setFontSize(fontSize);
      const lines = pdf.splitTextToSize(text, maxWidth);
      pdf.text(lines, x, y);
      return y + (lines.length * lineHeight);
    };

    // Header
    pdf.setFontSize(24);
    pdf.setFont('helvetica', 'bold');
    pdf.text('VENDOR BILL', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;

    // Company Info
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text('QMS - Quotation Management System', margin, yPosition);
    yPosition += lineHeight;
    pdf.text('Professional Business Services', margin, yPosition);
    yPosition += lineHeight;
    pdf.text('Email: info@qms.com | Web: www.qms.com', margin, yPosition);
    yPosition += 15;

    // Line separator
    pdf.setDrawColor(0, 0, 0);
    pdf.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 10;

    // Bill Details
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Bill Details:', margin, yPosition);
    yPosition += lineHeight + 2;

    pdf.setFont('helvetica', 'normal');
    pdf.text(`Bill Number: ${billData.bill_number}`, margin, yPosition);
    yPosition += lineHeight;
    pdf.text(`Bill Date: ${new Date(billData.bill_date).toLocaleDateString()}`, margin, yPosition);
    yPosition += lineHeight;
    if (billData.due_date) {
      pdf.text(`Due Date: ${new Date(billData.due_date).toLocaleDateString()}`, margin, yPosition);
      yPosition += lineHeight;
    }
    pdf.text(`Status: ${billData.status.charAt(0).toUpperCase() + billData.status.slice(1)}`, margin, yPosition);
    yPosition += lineHeight;
    if (billData.purchase_orders?.po_number) {
      pdf.text(`Purchase Order: ${billData.purchase_orders.po_number}`, margin, yPosition);
      yPosition += lineHeight;
    }
    yPosition += 10;

    // Vendor Information
    if (billData.vendors) {
      pdf.setFont('helvetica', 'bold');
      pdf.text('Vendor Information:', margin, yPosition);
      yPosition += lineHeight + 2;

      pdf.setFont('helvetica', 'normal');
      pdf.text(`Name: ${billData.vendors.name}`, margin, yPosition);
      yPosition += lineHeight;
      if (billData.vendors.contact_person) {
        pdf.text(`Contact Person: ${billData.vendors.contact_person}`, margin, yPosition);
        yPosition += lineHeight;
      }
      if (billData.vendors.email) {
        pdf.text(`Email: ${billData.vendors.email}`, margin, yPosition);
        yPosition += lineHeight;
      }
      if (billData.vendors.phone) {
        pdf.text(`Phone: ${billData.vendors.phone}`, margin, yPosition);
        yPosition += lineHeight;
      }
      if (billData.vendors.gst_number) {
        pdf.text(`GST Number: ${billData.vendors.gst_number}`, margin, yPosition);
        yPosition += lineHeight;
      }
      yPosition += 15;
    }

    // Amount Details Section
    pdf.setFont('helvetica', 'bold');
    pdf.setFillColor(240, 240, 240);
    pdf.rect(margin, yPosition, pageWidth - 2 * margin, 10, 'F');
    yPosition += 7;
    pdf.text('Amount Details', margin + 2, yPosition);
    yPosition += 8;

    // Amount breakdown
    pdf.setFont('helvetica', 'normal');
    const amountCol = pageWidth - margin - 40;
    
    pdf.text('Subtotal:', margin + 10, yPosition);
    pdf.text(`Rs. ${billData.subtotal.toFixed(2)}`, amountCol, yPosition);
    yPosition += lineHeight;

    if (billData.tax_amount && billData.tax_amount > 0) {
      pdf.text('Tax Amount:', margin + 10, yPosition);
      pdf.text(`Rs. ${billData.tax_amount.toFixed(2)}`, amountCol, yPosition);
      yPosition += lineHeight;
    }

    // Line separator for total
    pdf.line(margin + 10, yPosition, pageWidth - margin - 10, yPosition);
    yPosition += 5;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.text('Total Amount:', margin + 10, yPosition);
    pdf.text(`Rs. ${billData.total_amount.toFixed(2)}`, amountCol, yPosition);
    yPosition += lineHeight + 5;

    if (billData.paid_amount && billData.paid_amount > 0) {
      pdf.setFontSize(12);
      pdf.text('Paid Amount:', margin + 10, yPosition);
      pdf.text(`Rs. ${billData.paid_amount.toFixed(2)}`, amountCol, yPosition);
      yPosition += lineHeight;

      const remainingAmount = billData.total_amount - billData.paid_amount;
      pdf.text('Remaining:', margin + 10, yPosition);
      pdf.text(`Rs. ${remainingAmount.toFixed(2)}`, amountCol, yPosition);
      yPosition += lineHeight + 10;
    }

    // Notes section
    if (billData.notes && billData.notes !== 'NULL') {
      yPosition += 10;
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Notes:', margin, yPosition);
      yPosition += lineHeight + 2;

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      yPosition = addWrappedText(billData.notes, margin, yPosition, pageWidth - 2 * margin, 10);
    }

    // Footer
    const footerY = pageHeight - 20;
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Generated by QMS - Quotation Management System', pageWidth / 2, footerY, { align: 'center' });

    // Save the PDF
    const filename = `vendor-bill-${billData.bill_number}-${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(filename);

  } catch (error) {
    console.error('Error generating vendor bill PDF:', error);
    throw new Error('Failed to generate PDF. Please try again.');
  }
};

interface DeliveryChallanData {
  id: string;
  challan_number: string;
  challan_date: string;
  delivery_date?: string;
  status: string;
  remarks?: string;
  vendors?: {
    name: string;
    email?: string;
    phone?: string;
    contact_person?: string;
  };
  purchase_orders?: {
    po_number: string;
    status?: string;
  };
}

export const generateDeliveryChallanPDF = async (challanData: DeliveryChallanData): Promise<void> => {
  try {
    const jsPDF = await loadJsPDF();
    if (!jsPDF) {
      throw new Error('PDF generation library not available');
    }

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const lineHeight = 7;
    let yPosition = margin;

    // Helper function to add text with word wrapping
    const addWrappedText = (text: string, x: number, y: number, maxWidth: number, fontSize: number = 10) => {
      pdf.setFontSize(fontSize);
      const lines = pdf.splitTextToSize(text, maxWidth);
      pdf.text(lines, x, y);
      return y + (lines.length * lineHeight);
    };

    // Header
    pdf.setFontSize(24);
    pdf.setFont('helvetica', 'bold');
    pdf.text('DELIVERY CHALLAN', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;

    // Company Info
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text('QMS - Quotation Management System', margin, yPosition);
    yPosition += lineHeight;
    pdf.text('Professional Business Services', margin, yPosition);
    yPosition += lineHeight;
    pdf.text('Email: info@qms.com | Web: www.qms.com', margin, yPosition);
    yPosition += 15;

    // Line separator
    pdf.setDrawColor(0, 0, 0);
    pdf.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 10;

    // Challan Details
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Challan Details:', margin, yPosition);
    yPosition += lineHeight + 2;

    pdf.setFont('helvetica', 'normal');
    pdf.text(`Challan Number: ${challanData.challan_number}`, margin, yPosition);
    yPosition += lineHeight;
    pdf.text(`Challan Date: ${new Date(challanData.challan_date).toLocaleDateString()}`, margin, yPosition);
    yPosition += lineHeight;
    if (challanData.delivery_date) {
      pdf.text(`Delivery Date: ${new Date(challanData.delivery_date).toLocaleDateString()}`, margin, yPosition);
      yPosition += lineHeight;
    }
    pdf.text(`Status: ${challanData.status.charAt(0).toUpperCase() + challanData.status.slice(1)}`, margin, yPosition);
    yPosition += lineHeight;
    if (challanData.purchase_orders?.po_number) {
      pdf.text(`Purchase Order: ${challanData.purchase_orders.po_number}`, margin, yPosition);
      yPosition += lineHeight;
    }
    yPosition += 10;

    // Vendor Information
    if (challanData.vendors) {
      pdf.setFont('helvetica', 'bold');
      pdf.text('Vendor Information:', margin, yPosition);
      yPosition += lineHeight + 2;

      pdf.setFont('helvetica', 'normal');
      pdf.text(`Name: ${challanData.vendors.name}`, margin, yPosition);
      yPosition += lineHeight;
      if (challanData.vendors.contact_person) {
        pdf.text(`Contact Person: ${challanData.vendors.contact_person}`, margin, yPosition);
        yPosition += lineHeight;
      }
      if (challanData.vendors.email) {
        pdf.text(`Email: ${challanData.vendors.email}`, margin, yPosition);
        yPosition += lineHeight;
      }
      if (challanData.vendors.phone) {
        pdf.text(`Phone: ${challanData.vendors.phone}`, margin, yPosition);
        yPosition += lineHeight;
      }
      yPosition += 15;
    }

    // Remarks section
    if (challanData.remarks && challanData.remarks !== 'NULL') {
      pdf.setFont('helvetica', 'bold');
      pdf.text('Remarks:', margin, yPosition);
      yPosition += lineHeight + 2;

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      yPosition = addWrappedText(challanData.remarks, margin, yPosition, pageWidth - 2 * margin, 10);
      yPosition += 10;
    }

    // Footer
    const footerY = pageHeight - 20;
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Generated by QMS - Quotation Management System', pageWidth / 2, footerY, { align: 'center' });

    // Save the PDF
    const filename = `delivery-challan-${challanData.challan_number}-${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(filename);

  } catch (error) {
    console.error('Error generating delivery challan PDF:', error);
    throw new Error('Failed to generate PDF. Please try again.');
  }
};

interface EnhancedQuotationItem {
  id: string;
  srNo: number;
  description: string;
  uom: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  gstRate: number;
  isCustom?: boolean;
  category?: string;
  serialNo?: string;
  itemName?: string;
  auField?: string;
}

interface EnhancedQuotationData {
  quotationFor?: string;
  date: string;
  refNo: string;
  companyName: string;
  companyAddress: string;
  items: EnhancedQuotationItem[];
  subTotal: number;
  gstAmount: number;
  total: number;
  termsConditions?: {
    validity?: string;
    delivery?: string;
    optionalItems?: string;
  };
}

export const generateEnhancedQuotationPDF = async (quotationData: EnhancedQuotationData): Promise<void> => {
  try {
    const jsPDF = await loadJsPDF();
    if (!jsPDF) {
      throw new Error('PDF generation library not available');
    }

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const lineHeight = 6;
    let yPosition = margin;

    // Helper function to draw bordered cell
    const drawCell = (x: number, y: number, width: number, height: number, text: string, align: 'left' | 'center' | 'right' = 'left', fontSize: number = 10, bold: boolean = false) => {
      // Draw border
      pdf.setDrawColor(0, 0, 0);
      pdf.rect(x, y, width, height);
      
      // Add text
      pdf.setFontSize(fontSize);
      pdf.setFont('helvetica', bold ? 'bold' : 'normal');
      
      const textY = y + height / 2 + 2;
      let textX = x + 2;
      if (align === 'center') textX = x + width / 2;
      if (align === 'right') textX = x + width - 2;
      
      pdf.text(text, textX, textY, { align });
    };

    // Company Header Box
    const headerHeight = 20;
    pdf.setDrawColor(0, 0, 0);
    pdf.rect(margin, yPosition, pageWidth / 2 - margin, headerHeight);
    
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text(quotationData.companyName, margin + 2, yPosition + 6);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(quotationData.companyAddress, margin + 2, yPosition + 12);

    // Date and Ref boxes on the right
    const dateBoxWidth = 30;
    const refBoxWidth = 60;
    const rightBoxX = pageWidth - margin - dateBoxWidth - refBoxWidth;
    
    drawCell(rightBoxX, yPosition, 20, 8, 'Date', 'left', 10, true);
    drawCell(rightBoxX + 20, yPosition, dateBoxWidth + refBoxWidth - 20, 8, quotationData.date, 'center');
    
    drawCell(rightBoxX, yPosition + 8, 20, 8, 'Ref.No', 'left', 10, true);
    drawCell(rightBoxX + 20, yPosition + 8, dateBoxWidth + refBoxWidth - 20, 8, quotationData.refNo, 'center');

    yPosition += headerHeight + 10;

    // Items table
    const tableStartY = yPosition;
    const rowHeight = 8;
    
    // Table headers
    const colWidths = [15, 80, 20, 15, 25, 25, 20]; // Sr.No, Description, UOM, Qty, Unit Price, Total Price, GST Rate
    const headers = ['Sr.No', 'Description of Goods/Services', 'UOM', 'Qty', 'Unit Price', 'Total Price', 'GST Rate'];
    
    let xPos = margin;
    headers.forEach((header, index) => {
      drawCell(xPos, yPosition, colWidths[index], rowHeight, header, 'center', 9, true);
      xPos += colWidths[index];
    });
    
    yPosition += rowHeight;

    // Table rows
    quotationData.items.forEach((item, index) => {
      if (yPosition + rowHeight > pageHeight - 50) {
        pdf.addPage();
        yPosition = margin;
        
        // Redraw headers on new page
        xPos = margin;
        headers.forEach((header, index) => {
          drawCell(xPos, yPosition, colWidths[index], rowHeight, header, 'center', 9, true);
          xPos += colWidths[index];
        });
        yPosition += rowHeight;
      }

      xPos = margin;
      const rowData = [
        (index + 1).toString(),
        item.description,
        item.uom,
        item.quantity.toString(),
        item.unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 }),
        item.totalPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 }),
        `${item.gstRate}%`
      ];

      rowData.forEach((data, colIndex) => {
        const align = colIndex === 1 ? 'left' : 'center'; // Description left-aligned, others centered
        drawCell(xPos, yPosition, colWidths[colIndex], rowHeight, data, align, 8);
        xPos += colWidths[colIndex];
      });
      
      yPosition += rowHeight;
    });

    // Totals section
    yPosition += 10;
    const totalBoxWidth = 60;
    const totalBoxX = pageWidth - margin - totalBoxWidth;
    
    // Sub Total
    drawCell(totalBoxX - 40, yPosition, 40, 8, 'Sub Total', 'right', 10, true);
    drawCell(totalBoxX, yPosition, totalBoxWidth, 8, quotationData.subTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 }), 'right', 10);
    yPosition += 8;
    
    // GST
    drawCell(totalBoxX - 40, yPosition, 40, 8, 'GST @ 18%', 'right', 10, true);
    drawCell(totalBoxX, yPosition, totalBoxWidth, 8, quotationData.gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 }), 'right', 10);
    yPosition += 8;
    
    // Total
    drawCell(totalBoxX - 40, yPosition, 40, 10, 'Total', 'right', 12, true);
    drawCell(totalBoxX, yPosition, totalBoxWidth, 10, quotationData.total.toLocaleString('en-IN', { minimumFractionDigits: 2 }), 'right', 12, true);
    yPosition += 20;

    // Terms & Conditions
    if (quotationData.termsConditions) {
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Terms & Conditions:', margin, yPosition);
      yPosition += 8;
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      
      if (quotationData.termsConditions.validity) {
        pdf.text(`Validity: ${quotationData.termsConditions.validity}`, margin + 20, yPosition);
        yPosition += 6;
      }
      
      if (quotationData.termsConditions.delivery) {
        pdf.text(`Delivery: ${quotationData.termsConditions.delivery}`, margin + 20, yPosition);
        yPosition += 6;
      }
      
      if (quotationData.termsConditions.optionalItems) {
        pdf.text(`Optional Items: ${quotationData.termsConditions.optionalItems}`, margin + 20, yPosition);
        yPosition += 6;
      }
      
      yPosition += 10;
    }

    // Authorized Signature
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Authorized Signature', margin, yPosition);

    // Save the PDF
    const filename = `quotation-${quotationData.refNo}-${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(filename);

  } catch (error) {
    console.error('Error generating enhanced PDF:', error);
    throw new Error('Failed to generate PDF. Please try again.');
  }
};

export const generateQuotationPDFFromHTML = async (elementId: string, filename?: string): Promise<void> => {
  try {
    const html2canvas = await loadHtml2Canvas();
    const jsPDF = await loadJsPDF();
    
    if (!html2canvas || !jsPDF) {
      throw new Error('PDF generation libraries not available');
    }

    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error('Element not found');
    }

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
    const imgX = (pdfWidth - imgWidth * ratio) / 2;
    const imgY = 0;

    pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
    
    const pdfFilename = filename || `quotation-${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(pdfFilename);

  } catch (error) {
    console.error('Error generating PDF from HTML:', error);
    throw new Error('Failed to generate PDF. Please try again.');
  }
};

export const generateDetailedQuotationPDF = async (items: any[], companyInfo?: any, refNo?: string, customerInfo?: any) => {
  try {
    const jsPDF = await loadJsPDF();
    if (!jsPDF) {
      throw new Error('PDF generation library not available');
    }

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    let currentPage = 1;
    
    // Get current date for the PDF
    const currentDate = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric'
    });
    
    // Function to add header only on first page
    const addFirstPageHeader = () => {
      // Left company info box
      const leftBoxWidth = 120;
      const leftBoxHeight = 25;
      pdf.setLineWidth(0.5);
      pdf.rect(margin, margin, leftBoxWidth, leftBoxHeight);
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Directorate of Technical Procurement (L),', margin + 3, margin + 8);
      pdf.text('KRL, Rawalpindi.', margin + 3, margin + 18);
      
      // Right info boxes
      const rightBoxX = pageWidth - 80;
      const rightBoxWidth = 65;
      const rightBoxHeight = 25;
      
      // Date and Ref.No box
      pdf.rect(rightBoxX, margin, rightBoxWidth, rightBoxHeight);
      pdf.line(rightBoxX, margin + 12.5, rightBoxX + rightBoxWidth, margin + 12.5); // Horizontal divider
      pdf.line(rightBoxX + 25, margin, rightBoxX + 25, margin + rightBoxHeight); // Vertical divider
      
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      
      // Date row - use current date and center the text
      pdf.text('Date', rightBoxX + 12.5, margin + 8, { align: 'center' });
      pdf.text(currentDate, rightBoxX + 25 + (rightBoxWidth - 25)/2, margin + 8, { align: 'center' });
      
      // Ref.No row - use actual reference number and center the text
      pdf.text('Ref.No', rightBoxX + 12.5, margin + 20, { align: 'center' });
      const referenceText = refNo && refNo.trim() !== '' && refNo !== '-' ? refNo : '-';
      pdf.text(referenceText, rightBoxX + 25 + (rightBoxWidth - 25)/2, margin + 20, { align: 'center' });
      
      // Quotation title box - show customer name
      const titleY = margin + 35;
      const titleBoxWidth = 100;
      const titleBoxX = (pageWidth - titleBoxWidth) / 2; // Center the box horizontally
      const titleBoxHeight = 12;
      
      pdf.rect(titleBoxX, titleY, titleBoxWidth, titleBoxHeight);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      const customerName = customerInfo?.name || 'Customer';
      pdf.text(`Quotation for ${customerName}`, titleBoxX + titleBoxWidth/2, titleY + 8, { align: 'center' });
      
      return titleY + titleBoxHeight + 15;
    };
    
    // Function for continuation pages (no header, just start with margin)
    const addContinuationPage = () => {
      return margin + 10; // Small top margin for continuation pages
    };
    
    // Function to add table header
    const addTableHeader = (yPosition: number) => {
      const tableHeaders = ['Sr.No', 'Description of Goods/Services', 'UOM', 'Qty', 'Unit Price', 'GST', 'Total Price'];
      const colWidths = [12, 73, 15, 12, 22, 16, 22]; // GST column before Total Price
      const colStartX = margin;
      
      const colPositions = [colStartX];
      for (let i = 0; i < colWidths.length - 1; i++) {
        colPositions.push(colPositions[i] + colWidths[i]);
      }
      
      const headerHeight = 12;
      pdf.setFillColor(240, 240, 240);
      pdf.rect(colStartX, yPosition, pageWidth - (margin * 2), headerHeight, 'F');
      
      pdf.setLineWidth(0.5);
      pdf.rect(colStartX, yPosition, pageWidth - (margin * 2), headerHeight);
      
      for (let i = 1; i < colPositions.length; i++) {
        pdf.line(colPositions[i], yPosition, colPositions[i], yPosition + headerHeight);
      }
      
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.setTextColor(0, 0, 0);
      
      tableHeaders.forEach((header, index) => {
        const cellWidth = colWidths[index];
        const headerX = colPositions[index] + cellWidth / 2;
        pdf.text(header, headerX, yPosition + 8, { align: 'center' });
      });
      
      return { nextY: yPosition + headerHeight, colPositions, colWidths };
    };
    
    // Initialize first page
    let currentY = addFirstPageHeader();
    const { nextY: tableStartY, colPositions, colWidths } = addTableHeader(currentY);
    currentY = tableStartY;
    
    const rowHeight = 10;
    let subTotal = 0;
    let totalGST = 0;
    
    items.forEach((item: any, index: number) => {
      const quantity = Number(item.quantity) || 0;
      const unitPrice = Number(item.unitPrice || item.unit_price) || 0;
      const lineTotal = quantity * unitPrice;
      const gstRate = Number(item.gstPercentage || item.gstPercent || item.gst_percent) || 18;
      const gstAmount = lineTotal * (gstRate / 100);
      
      subTotal += lineTotal;
      totalGST += gstAmount;
      
      // Check if we need a new page - only break if we're near the bottom
      if (currentY + rowHeight > pageHeight - margin - 15) {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.text(`Page ${currentPage}`, pageWidth - margin - 20, pageHeight - 10);
        
        pdf.addPage();
        currentPage++;
        currentY = addContinuationPage(); // No header on continuation pages
        const { nextY } = addTableHeader(currentY);
        currentY = nextY;
      }
      
      if (index % 2 === 1) {
        pdf.setFillColor(250, 250, 250);
        pdf.rect(margin, currentY, pageWidth - (margin * 2), rowHeight, 'F');
      }
      
      pdf.setLineWidth(0.3);
      pdf.rect(margin, currentY, pageWidth - (margin * 2), rowHeight);
      
      for (let i = 1; i < colPositions.length; i++) {
        pdf.line(colPositions[i], currentY, colPositions[i], currentY + rowHeight);
      }
      
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      
      let description = '';
      if (item.isCustom) {
        description = item.customDescription || item.description || item.item_name || 'Custom Item';
      } else {
        description = item.description || item.item_name || 'Inventory Item';
      }
      
      const rowData = [
        (index + 1).toString(),
        description,
        item.uom || item.unit_of_measure || 'No',
        quantity.toString(),
        unitPrice.toFixed(2),
        `${gstRate}%`,
        lineTotal.toFixed(2)
      ];
      
      const alignments = ['center', 'left', 'center', 'center', 'right', 'center', 'right'];
      
      rowData.forEach((data, colIndex) => {
        const cellWidth = colWidths[colIndex];
        let textX = colPositions[colIndex] + 2;
        
        if (alignments[colIndex] === 'center') {
          textX = colPositions[colIndex] + cellWidth / 2;
        } else if (alignments[colIndex] === 'right') {
          textX = colPositions[colIndex] + cellWidth - 2;
        }
        
        pdf.text(data, textX, currentY + 6, { align: alignments[colIndex] as any });
      });
      
      currentY += rowHeight;
    });
    
    // Calculate actual space needed for footer content:
    // Totals box: 45 units + 15 spacing = 60 units
    // Terms & Conditions: 3 terms * 10 + title + spacing = 50 units  
    // Signature: 20 units
    // Bottom margin buffer: 20 units
    // Total: ~100 units
    const actualFooterSpaceNeeded = 100;
    
    // Only create new page if there's genuinely not enough space
    if (currentY + actualFooterSpaceNeeded > pageHeight - margin) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.text(`Page ${currentPage}`, pageWidth - margin - 20, pageHeight - 10);
      
      pdf.addPage();
      currentPage++;
      currentY = addContinuationPage() + 10; // No header on continuation pages
    }
    
    const grandTotal = subTotal + totalGST;
    
    // Calculate MINIMUM space needed for footer sections:
    // We'll be more lenient to keep everything on one page when possible
    const totalsHeight = 50;      // Totals box (can be compact)
    const termsHeight = 45;       // Terms section (3 lines)
    const signatureHeight = 25;   // Signature section
    const bottomBuffer = 5;       // Minimal safety margin
    const totalFooterHeight = totalsHeight + termsHeight + signatureHeight + bottomBuffer; // ~125mm
    
    // Check if entire footer fits on current page
    const spaceAvailable = pageHeight - margin - currentY - 15; // Space from current position to page bottom
    
    // Only move to new page if footer genuinely won't fit (with some tolerance)
    if (totalFooterHeight > spaceAvailable) {
      // Move to new page for footer
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.text(`Page ${currentPage}`, pageWidth - margin - 20, pageHeight - 10);
      
      pdf.addPage();
      currentPage++;
      currentY = addContinuationPage() + 20;
    }
    
    // Draw footer content (totals, terms, signature) - only once
    const footerStartY = currentY + 15;
    
    // Totals section - positioned in the table area like the image
    const totalsStartX = colPositions[4] + colWidths[4] - 8; // Start slightly before GST column
    const totalsLabelWidth = colWidths[5] + 16; // GST column width + extra space for labels
    const totalsValueWidth = colWidths[6]; // Total Price column width for values
    const totalsRowHeight = 10;
    
    pdf.setLineWidth(0.3);
    
    // Sub Total row
    pdf.rect(totalsStartX, currentY, totalsLabelWidth, totalsRowHeight);
    pdf.rect(totalsStartX + totalsLabelWidth, currentY, totalsValueWidth, totalsRowHeight);
    
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.text('Sub Total', totalsStartX + totalsLabelWidth/2, currentY + 6, { align: 'center' });
    pdf.text(subTotal.toFixed(2), totalsStartX + totalsLabelWidth + totalsValueWidth - 3, currentY + 6, { align: 'right' });
    currentY += totalsRowHeight;
    
    // GST row
    pdf.rect(totalsStartX, currentY, totalsLabelWidth, totalsRowHeight);
    pdf.rect(totalsStartX + totalsLabelWidth, currentY, totalsValueWidth, totalsRowHeight);
    
    pdf.text('GST @ 18%', totalsStartX + totalsLabelWidth/2, currentY + 6, { align: 'center' });
    pdf.text(totalGST.toFixed(2), totalsStartX + totalsLabelWidth + totalsValueWidth - 3, currentY + 6, { align: 'right' });
    currentY += totalsRowHeight;
    
    // Total row
    pdf.rect(totalsStartX, currentY, totalsLabelWidth, totalsRowHeight);
    pdf.rect(totalsStartX + totalsLabelWidth, currentY, totalsValueWidth, totalsRowHeight);
    
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.text('Total', totalsStartX + totalsLabelWidth/2, currentY + 6, { align: 'center' });
    pdf.text(grandTotal.toFixed(2), totalsStartX + totalsLabelWidth + totalsValueWidth - 3, currentY + 6, { align: 'right' });
    
    // Terms & Conditions
    const termsStartY = currentY + 25;
    
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.text('Terms & Conditions:', margin, termsStartY);
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    
    // Validity line
    const validityY = termsStartY + 12;
    pdf.setFont('helvetica', 'bold');
    pdf.text('Validity', margin + 20, validityY);
    pdf.setFont('helvetica', 'normal');
    pdf.text(': Prices are valid for 25 Days Only.', margin + 55, validityY);
    
    // Delivery line
    const deliveryY = validityY + 8;
    pdf.setFont('helvetica', 'bold');
    pdf.text('Delivery', margin + 20, deliveryY);
    pdf.setFont('helvetica', 'normal');
    pdf.text(': 6-10 Days after receiving the PO. (F.O.R Rawalpindi).', margin + 55, deliveryY);
    
    // Optional Items line - grouped with other terms
    const optionalY = deliveryY + 8;
    pdf.setFont('helvetica', 'bold');
    pdf.text('Optional Items', margin + 20, optionalY);
    pdf.setFont('helvetica', 'normal');
    pdf.text(': Optional items other than quoted will be charged separately', margin + 55, optionalY);
    
    // Authorized Signature - below all terms
    const signatureY = optionalY + 20;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.text('Authorized Signature', margin, signatureY);
    
    pdf.setLineWidth(0.5);
    pdf.line(margin, signatureY + 20, margin + 60, signatureY + 20);
    
    // Final page footer
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.text(`Page ${currentPage}`, pageWidth - margin - 20, pageHeight - 10);
    pdf.text(`Generated on: ${new Date().toLocaleString('en-US')}`, margin, pageHeight - 10);
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const fileName = `Quotation_Items_${timestamp}.pdf`;
    pdf.save(fileName);
    
  } catch (error) {
    console.error('Error generating detailed PDF:', error);
    throw new Error(`PDF generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// ============================================================================
// ANOOSH INTERNATIONAL - MODERN PDF FORMAT
// Completely new design with brand identity and contemporary layout
// ============================================================================

export const generateModernQuotationPDF = async (items: any[], companyInfo?: any, refNo?: string) => {
  try {
    const jsPDF = await loadJsPDF();
    if (!jsPDF) {
      throw new Error('PDF generation library not available');
    }

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    let currentPage = 1;
    
    // Anoosh International Brand Colors
    const navyBlue = { r: 30, g: 58, b: 95 };     // Primary brand color
    const gold = { r: 201, g: 169, b: 97 };        // Accent color
    const lightBg = { r: 248, g: 250, b: 252 };    // Light background
    const textDark = { r: 31, g: 41, b: 55 };      // Dark text
    const borderLight = { r: 226, g: 232, b: 240 }; // Light borders
    
    // Helper to draw Anoosh International logo
    const drawLogo = (x: number, y: number, size: number) => {
      // Outer circle - Navy Blue
      pdf.setFillColor(navyBlue.r, navyBlue.g, navyBlue.b);
      pdf.circle(x, y, size, 'F');
      
      // Gold middle ring
      pdf.setFillColor(gold.r, gold.g, gold.b);
      pdf.circle(x, y, size * 0.85, 'F');
      
      // Inner circle - White
      pdf.setFillColor(255, 255, 255);
      pdf.circle(x, y, size * 0.75, 'F');
      
      // Navy Blue inner ring
      pdf.setDrawColor(navyBlue.r, navyBlue.g, navyBlue.b);
      pdf.setLineWidth(0.5);
      pdf.circle(x, y, size * 0.5, 'S');
      
      // Company initial 'A'
      pdf.setTextColor(navyBlue.r, navyBlue.g, navyBlue.b);
      pdf.setFontSize(size * 0.9);
      pdf.setFont('helvetica', 'bold');
      pdf.text('A', x, y + (size * 0.25), { align: 'center' });
    };
    
    // Function to add branded header
    const addBrandedHeader = (isFirstPage: boolean = true) => {
      if (isFirstPage) {
        // Top accent bar - Gold
        pdf.setFillColor(gold.r, gold.g, gold.b);
        pdf.rect(0, 0, pageWidth, 3, 'F');
        
        // Logo
        drawLogo(margin + 10, 20, 10);
        
        // Company Name
        pdf.setTextColor(navyBlue.r, navyBlue.g, navyBlue.b);
        pdf.setFontSize(22);
        pdf.setFont('helvetica', 'bold');
        pdf.text('ANOOSH INTERNATIONAL', margin + 30, 18);
        
        // Tagline
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(gold.r, gold.g, gold.b);
        pdf.text('IMPORT / EXPORT', margin + 30, 24);
        
        // Contact bar background
        pdf.setFillColor(lightBg.r, lightBg.g, lightBg.b);
        pdf.rect(margin, 30, pageWidth - (margin * 2), 12, 'F');
        
        // Contact information (without emojis to avoid encoding issues)
        pdf.setFontSize(8);
        pdf.setTextColor(textDark.r, textDark.g, textDark.b);
        pdf.setFont('helvetica', 'normal');
        pdf.text('Address: Directorate of Technical Procurement (L), KRL, Rawalpindi', margin + 3, 36);
        pdf.text('Phone: +92-XXX-XXXXXXX', pageWidth - margin - 45, 36);
        
        // Document title section
        pdf.setFillColor(navyBlue.r, navyBlue.g, navyBlue.b);
        pdf.rect(0, 48, pageWidth, 20, 'F');
        
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(18);
        pdf.setFont('helvetica', 'bold');
        pdf.text('QUOTATION', margin, 60);
        
        // Document info boxes
        const infoBoxY = 52;
        const boxWidth = 45;
        const startX = pageWidth - margin - boxWidth;
        
        pdf.setFillColor(255, 255, 255);
        pdf.setDrawColor(gold.r, gold.g, gold.b);
        pdf.setLineWidth(0.5);
        pdf.roundedRect(startX, infoBoxY, boxWidth, 13, 2, 2, 'FD');
        
        pdf.setTextColor(navyBlue.r, navyBlue.g, navyBlue.b);
        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'bold');
        pdf.text('DATE', startX + 2, infoBoxY + 4);
        pdf.setFont('helvetica', 'normal');
        pdf.text(new Date().toLocaleDateString('en-GB'), startX + 2, infoBoxY + 8);
        pdf.setFont('helvetica', 'bold');
        pdf.text('REF', startX + 25, infoBoxY + 4);
        pdf.setFont('helvetica', 'normal');
        const refText = refNo || 'N/A';
        pdf.text(refText.substring(0, 10), startX + 25, infoBoxY + 8);
        
        return 75; // Return Y position
      } else {
        // Continuation page header
        pdf.setFillColor(gold.r, gold.g, gold.b);
        pdf.rect(0, 0, pageWidth, 2, 'F');
        
        pdf.setFillColor(navyBlue.r, navyBlue.g, navyBlue.b);
        pdf.rect(0, 2, pageWidth, 15, 'F');
        
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text('ANOOSH INTERNATIONAL - QUOTATION (Continued)', margin, 12);
        
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Page ${currentPage}`, pageWidth - margin - 15, 12);
        
        return 25;
      }
    };
    
    // Modern table header with new design
    const addModernTableHeader = (yPosition: number) => {
      const headers = [
        { label: 'ITEM', width: 15 },
        { label: 'DESCRIPTION', width: 65 },
        { label: 'UNIT', width: 18 },
        { label: 'QTY', width: 15 },
        { label: 'RATE', width: 25 },
        { label: 'AMOUNT', width: 28 }
      ];
      
      let currentX = margin;
      const headerHeight = 12;
      
      // Header background with gradient effect
      pdf.setFillColor(navyBlue.r, navyBlue.g, navyBlue.b);
      pdf.rect(margin, yPosition, pageWidth - (margin * 2), headerHeight, 'F');
      
      // Gold accent line on top
      pdf.setFillColor(gold.r, gold.g, gold.b);
      pdf.rect(margin, yPosition, pageWidth - (margin * 2), 2, 'F');
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      
      const colPositions: number[] = [currentX];
      const colWidths: number[] = [];
      
      headers.forEach((header, index) => {
        colWidths.push(header.width);
        if (index > 0) {
          currentX += headers[index - 1].width;
          colPositions.push(currentX);
        }
        
        const centerX = currentX + (header.width / 2);
        pdf.text(header.label, centerX, yPosition + 8, { align: 'center' });
      });
      
      return { nextY: yPosition + headerHeight, colPositions, colWidths };
    };
    
    // Add items table
    let currentY = addBrandedHeader(true);
    currentY += 5;
    
    const { nextY: tableStartY, colPositions, colWidths } = addModernTableHeader(currentY);
    currentY = tableStartY;
    
    const rowHeight = 11;
    let subTotal = 0;
    let totalGST = 0;
    let itemNumber = 1;
    
    items.forEach((item: any) => {
      const quantity = Number(item.quantity) || 0;
      const unitPrice = Number(item.unitPrice || item.unit_price) || 0;
      const lineTotal = quantity * unitPrice;
      const gstRate = Number(item.gstPercentage || item.gstPercent || item.gst_percent) || 18;
      const gstAmount = lineTotal * (gstRate / 100);
      
      subTotal += lineTotal;
      totalGST += gstAmount;
      
      // Check for page break - allow maximum items, reserve minimal space for summary
      // Only need space for summary section initially (42mm + 10mm margin = 50mm)
      if (currentY + rowHeight + 50 > pageHeight - margin) {
        // Footer for current page
        pdf.setFillColor(gold.r, gold.g, gold.b);
        pdf.rect(0, pageHeight - 8, pageWidth, 8, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Page ${currentPage}`, pageWidth / 2, pageHeight - 4, { align: 'center' });
        
        pdf.addPage();
        currentPage++;
        currentY = addBrandedHeader(false);
        currentY += 5;
        const { nextY } = addModernTableHeader(currentY);
        currentY = nextY;
      }
      
      // Row background - alternating with modern colors
      if (itemNumber % 2 === 0) {
        pdf.setFillColor(lightBg.r, lightBg.g, lightBg.b);
        pdf.rect(margin, currentY, pageWidth - (margin * 2), rowHeight, 'F');
      }
      
      // Bottom border
      pdf.setDrawColor(borderLight.r, borderLight.g, borderLight.b);
      pdf.setLineWidth(0.3);
      pdf.line(margin, currentY + rowHeight, pageWidth - margin, currentY + rowHeight);
      
      // Row data
      pdf.setTextColor(textDark.r, textDark.g, textDark.b);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8.5);
      
      let description = '';
      if (item.isCustom) {
        description = item.customDescription || item.description || item.item_name || 'Custom Item';
      } else {
        description = item.description || item.item_name || 'Item';
      }
      
      // Truncate long descriptions
      if (description.length > 55) {
        description = description.substring(0, 52) + '...';
      }
      
      const rowData = [
        itemNumber.toString(),
        description,
        item.uom || item.unit_of_measure || 'No',
        quantity.toString(),
        'Rs. ' + unitPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        'Rs. ' + lineTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      ];
      
      const alignments = ['center', 'left', 'center', 'center', 'right', 'right'];
      
      rowData.forEach((data, colIndex) => {
        const cellWidth = colWidths[colIndex];
        let textX = colPositions[colIndex] + 2;
        
        if (alignments[colIndex] === 'center') {
          textX = colPositions[colIndex] + (cellWidth / 2);
        } else if (alignments[colIndex] === 'right') {
          textX = colPositions[colIndex] + cellWidth - 2;
        }
        
        pdf.text(data, textX, currentY + 7, { align: alignments[colIndex] as any });
      });
      
      currentY += rowHeight;
      itemNumber++;
    });
    
    // SECTION 1: Financial Summary (Independent page break check)
    currentY += 8;
    const grandTotal = subTotal + totalGST;
    
    // Check if Financial Summary fits on current page
    const summaryHeight = 50; // Card height + spacing
    if (currentY + summaryHeight > pageHeight - 15) {
      pdf.setFillColor(gold.r, gold.g, gold.b);
      pdf.rect(0, pageHeight - 8, pageWidth, 8, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(7);
      pdf.text(`Page ${currentPage}`, pageWidth / 2, pageHeight - 4, { align: 'center' });
      
      pdf.addPage();
      currentPage++;
      currentY = addBrandedHeader(false) + 10;
    }
    
    // Summary section with modern card design
    const summaryX = pageWidth - margin - 70;
    const summaryY = currentY;
    const summaryWidth = 70;
    
    // Card shadow
    pdf.setFillColor(200, 200, 200);
    pdf.roundedRect(summaryX + 1, summaryY + 1, summaryWidth, 42, 3, 3, 'F');
    
    // Main card
    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(gold.r, gold.g, gold.b);
    pdf.setLineWidth(1);
    pdf.roundedRect(summaryX, summaryY, summaryWidth, 42, 3, 3, 'FD');
    
    // Header bar
    pdf.setFillColor(navyBlue.r, navyBlue.g, navyBlue.b);
    pdf.rect(summaryX, summaryY, summaryWidth, 8, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text('SUMMARY', summaryX + (summaryWidth / 2), summaryY + 5.5, { align: 'center' });
    
    // Content
    pdf.setTextColor(textDark.r, textDark.g, textDark.b);
    pdf.setFontSize(9);
    
    // Subtotal
    pdf.setFont('helvetica', 'normal');
    pdf.text('Subtotal:', summaryX + 3, summaryY + 15);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Rs. ' + subTotal.toLocaleString('en-US', { minimumFractionDigits: 2 }), summaryX + summaryWidth - 3, summaryY + 15, { align: 'right' });
    
    // Divider
    pdf.setDrawColor(borderLight.r, borderLight.g, borderLight.b);
    pdf.line(summaryX + 3, summaryY + 18, summaryX + summaryWidth - 3, summaryY + 18);
    
    // GST
    pdf.setFont('helvetica', 'normal');
    pdf.text('GST (18%):', summaryX + 3, summaryY + 24);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Rs. ' + totalGST.toLocaleString('en-US', { minimumFractionDigits: 2 }), summaryX + summaryWidth - 3, summaryY + 24, { align: 'right' });
    
    // Divider
    pdf.line(summaryX + 3, summaryY + 27, summaryX + summaryWidth - 3, summaryY + 27);
    
    // Grand total bar
    pdf.setFillColor(gold.r, gold.g, gold.b);
    pdf.rect(summaryX, summaryY + 30, summaryWidth, 12, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text('TOTAL', summaryX + 3, summaryY + 37);
    pdf.setFontSize(12);
    pdf.text('Rs. ' + grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 }), summaryX + summaryWidth - 3, summaryY + 37, { align: 'right' });
    
    // Update current Y position after summary
    currentY = summaryY + 50;
    
    // SECTION 2: Terms & Conditions (Independent page break check)
    const termsHeight = 45; // Title + content + spacing
    if (currentY + termsHeight > pageHeight - 15) {
      pdf.setFillColor(gold.r, gold.g, gold.b);
      pdf.rect(0, pageHeight - 8, pageWidth, 8, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(7);
      pdf.text(`Page ${currentPage}`, pageWidth / 2, pageHeight - 4, { align: 'center' });
      
      pdf.addPage();
      currentPage++;
      currentY = addBrandedHeader(false) + 10;
    }
    
    // Terms & Conditions section
    const termsY = currentY;
    
    pdf.setTextColor(navyBlue.r, navyBlue.g, navyBlue.b);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text('TERMS & CONDITIONS', margin, termsY);
    
    // Decorative line
    pdf.setDrawColor(gold.r, gold.g, gold.b);
    pdf.setLineWidth(1.5);
    pdf.line(margin, termsY + 1, margin + 60, termsY + 1);
    
    pdf.setTextColor(textDark.r, textDark.g, textDark.b);
    pdf.setFontSize(8.5);
    pdf.setFont('helvetica', 'normal');
    
    const terms = [
      '• Validity: Prices are valid for 25 Days Only',
      '• Delivery: 6-10 Days after receiving the PO (F.O.R Rawalpindi)',
      '• Payment: As per agreed terms',
      '• Optional items other than quoted will be charged separately'
    ];
    
    terms.forEach((term, index) => {
      pdf.text(term, margin + 2, termsY + 9 + (index * 6));
    });
    
    // Update current Y position after terms
    currentY = termsY + 35;
    
    // SECTION 3: Signature (Independent page break check)
    const signatureHeight = 20; // Line + text + spacing
    if (currentY + signatureHeight > pageHeight - 15) {
      pdf.setFillColor(gold.r, gold.g, gold.b);
      pdf.rect(0, pageHeight - 8, pageWidth, 8, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(7);
      pdf.text(`Page ${currentPage}`, pageWidth / 2, pageHeight - 4, { align: 'center' });
      
      pdf.addPage();
      currentPage++;
      currentY = addBrandedHeader(false) + 10;
    }
    
    // Signature section
    const signatureY = currentY;
    
    pdf.setDrawColor(borderLight.r, borderLight.g, borderLight.b);
    pdf.setLineWidth(0.5);
    pdf.line(margin, signatureY, margin + 60, signatureY);
    
    pdf.setTextColor(textDark.r, textDark.g, textDark.b);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Authorized Signature', margin, signatureY + 5);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.text('For Anoosh International', margin, signatureY + 9);
    
    // Footer bar
    pdf.setFillColor(navyBlue.r, navyBlue.g, navyBlue.b);
    pdf.rect(0, pageHeight - 15, pageWidth, 15, 'F');
    
    // Gold accent on top
    pdf.setFillColor(gold.r, gold.g, gold.b);
    pdf.rect(0, pageHeight - 15, pageWidth, 2, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Generated on: ' + new Date().toLocaleString('en-GB'), margin, pageHeight - 8);
    pdf.text(`Page ${currentPage}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
    pdf.text('www.anooshinternational.com', pageWidth - margin, pageHeight - 8, { align: 'right' });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const fileName = `Anoosh_Quotation_${timestamp}.pdf`;
    pdf.save(fileName);
    
  } catch (error) {
    console.error('Error generating modern PDF:', error);
    throw new Error(`PDF generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// ============================================================================
// PREMIUM EXECUTIVE FORMAT - Ultra-Modern State-of-the-Art Design
// Cutting-edge design with innovative features and premium aesthetics
// ============================================================================

export const generatePremiumQuotationPDF = async (items: any[], companyInfo?: any, refNo?: string) => {
  try {
    const jsPDF = await loadJsPDF();
    if (!jsPDF) {
      throw new Error('PDF generation library not available');
    }

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 18;
    let currentPage = 1;
    
    // Premium Color Palette - Sophisticated and Bold
    const deepTeal = { r: 13, g: 71, b: 161 };      // Deep professional blue
    const brightOrange = { r: 255, g: 111, b: 0 };  // Vibrant accent
    const charcoal = { r: 44, g: 44, b: 44 };       // Dark text
    const lightCream = { r: 255, g: 251, b: 245 };  // Warm background
    const silver = { r: 189, g: 195, b: 199 };      // Subtle accent
    const white = { r: 255, g: 255, b: 255 };
    
    // Premium geometric logo
    const drawPremiumLogo = (x: number, y: number, size: number) => {
      // Diamond shape background
      pdf.setFillColor(deepTeal.r, deepTeal.g, deepTeal.b);
      pdf.triangle(x, y - size, x + size, y, x, y + size, 'F');
      pdf.triangle(x, y - size, x - size, y, x, y + size, 'F');
      
      // Orange accent diamond
      pdf.setFillColor(brightOrange.r, brightOrange.g, brightOrange.b);
      const innerSize = size * 0.6;
      pdf.triangle(x, y - innerSize, x + innerSize, y, x, y + innerSize, 'F');
      pdf.triangle(x, y - innerSize, x - innerSize, y, x, y + innerSize, 'F');
      
      // Center white circle
      pdf.setFillColor(255, 255, 255);
      pdf.circle(x, y, size * 0.35, 'F');
      
      // Company initial
      pdf.setTextColor(deepTeal.r, deepTeal.g, deepTeal.b);
      pdf.setFontSize(size * 0.5);
      pdf.setFont('helvetica', 'bold');
      pdf.text('A', x, y + (size * 0.15), { align: 'center' });
    };
    
    // Premium first page header
    const addPremiumHeader = (isFirstPage: boolean = true) => {
      if (isFirstPage) {
        // Diagonal stripe pattern background (simulated with rectangles)
        pdf.setFillColor(lightCream.r, lightCream.g, lightCream.b);
        pdf.rect(0, 0, pageWidth, 70, 'F');
        
        // Top accent stripe - Orange
        pdf.setFillColor(brightOrange.r, brightOrange.g, brightOrange.b);
        pdf.rect(0, 0, pageWidth, 4, 'F');
        
        // Diagonal accent element (using lighter color instead of opacity)
        const lightTeal = {
          r: Math.min(255, deepTeal.r + 200),
          g: Math.min(255, deepTeal.g + 200), 
          b: Math.min(255, deepTeal.b + 200)
        };
        pdf.setFillColor(lightTeal.r, lightTeal.g, lightTeal.b);
        pdf.triangle(pageWidth - 60, 0, pageWidth, 0, pageWidth, 70, 'F');
        
        // Premium logo
        drawPremiumLogo(margin + 10, 25, 10);
        
        // Company branding with modern typography
        pdf.setTextColor(deepTeal.r, deepTeal.g, deepTeal.b);
        pdf.setFontSize(24);
        pdf.setFont('helvetica', 'bold');
        pdf.text('ANOOSH', margin + 30, 20);
        
        pdf.setFontSize(24);
        pdf.setFont('helvetica', 'normal');
        pdf.text('INTERNATIONAL', margin + 30, 28);
        
        // Orange accent line
        pdf.setDrawColor(brightOrange.r, brightOrange.g, brightOrange.b);
        pdf.setLineWidth(2);
        pdf.line(margin + 30, 30, margin + 100, 30);
        
        // Subtitle
        pdf.setTextColor(charcoal.r, charcoal.g, charcoal.b);
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        pdf.text('IMPORT & EXPORT SOLUTIONS', margin + 30, 36);
        
        // Modern info card - floating design
        const cardX = pageWidth - margin - 65;
        const cardY = 12;
        const cardWidth = 60;
        const cardHeight = 32;
        
        // Card shadow (using lighter gray instead of opacity)
        pdf.setFillColor(220, 220, 220);
        pdf.roundedRect(cardX + 2, cardY + 2, cardWidth, cardHeight, 4, 4, 'F');
        
        // Main card
        pdf.setFillColor(white.r, white.g, white.b);
        pdf.setDrawColor(brightOrange.r, brightOrange.g, brightOrange.b);
        pdf.setLineWidth(1);
        pdf.roundedRect(cardX, cardY, cardWidth, cardHeight, 4, 4, 'FD');
        
        // Card header
        pdf.setFillColor(deepTeal.r, deepTeal.g, deepTeal.b);
        pdf.rect(cardX, cardY, cardWidth, 8, 'F');
        
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'bold');
        pdf.text('QUOTATION', cardX + (cardWidth / 2), cardY + 5.5, { align: 'center' });
        
        // Card content
        pdf.setTextColor(charcoal.r, charcoal.g, charcoal.b);
        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'bold');
        
        pdf.text('Date:', cardX + 3, cardY + 14);
        pdf.setFont('helvetica', 'normal');
        pdf.text(new Date().toLocaleDateString('en-GB'), cardX + 15, cardY + 14);
        
        pdf.setFont('helvetica', 'bold');
        pdf.text('Reference:', cardX + 3, cardY + 21);
        pdf.setFont('helvetica', 'normal');
        const refText = refNo || 'N/A';
        pdf.text(refText.substring(0, 12), cardX + 20, cardY + 21);
        
        pdf.setFont('helvetica', 'bold');
        pdf.text('Status:', cardX + 3, cardY + 28);
        pdf.setTextColor(brightOrange.r, brightOrange.g, brightOrange.b);
        pdf.setFont('helvetica', 'bold');
        pdf.text('DRAFT', cardX + 17, cardY + 28);
        
        // Contact strip
        pdf.setFillColor(deepTeal.r, deepTeal.g, deepTeal.b);
        pdf.rect(0, 50, pageWidth, 18, 'F');
        
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'normal');
        
        const contactY = 58;
        pdf.text('KRL, Rawalpindi', margin + 3, contactY);
        
        // Vertical separator
        pdf.setDrawColor(brightOrange.r, brightOrange.g, brightOrange.b);
        pdf.line(margin + 50, 53, margin + 50, 65);
        
        pdf.text('Phone: +92-XXX-XXXXXXX', margin + 55, contactY);
        
        pdf.line(margin + 115, 53, margin + 115, 65);
        
        pdf.text('Email: info@anoosh.com', margin + 120, contactY);
        
        return 76;
      } else {
        // Minimal continuation header
        pdf.setFillColor(brightOrange.r, brightOrange.g, brightOrange.b);
        pdf.rect(0, 0, pageWidth, 3, 'F');
        
        pdf.setFillColor(deepTeal.r, deepTeal.g, deepTeal.b);
        pdf.rect(0, 3, pageWidth, 18, 'F');
        
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('ANOOSH INTERNATIONAL', margin, 14);
        
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.text('Quotation (Continued)', pageWidth - margin, 14, { align: 'right' });
        
        pdf.setFontSize(7);
        pdf.text(`Page ${currentPage}`, pageWidth - margin, 18, { align: 'right' });
        
        return 28;
      }
    };
    
    // Ultra-modern table header
    const addPremiumTableHeader = (yPosition: number) => {
      const headers = [
        { label: 'NO', width: 12, align: 'center' },
        { label: 'ITEM DESCRIPTION', width: 70, align: 'left' },
        { label: 'UNIT', width: 18, align: 'center' },
        { label: 'QTY', width: 15, align: 'center' },
        { label: 'PRICE', width: 26, align: 'right' },
        { label: 'TOTAL', width: 28, align: 'right' }
      ];
      
      const headerHeight = 10;
      let currentX = margin;
      
      // Gradient header effect
      pdf.setFillColor(deepTeal.r, deepTeal.g, deepTeal.b);
      pdf.rect(margin, yPosition, pageWidth - (margin * 2), headerHeight, 'F');
      
      // Orange top stripe
      pdf.setFillColor(brightOrange.r, brightOrange.g, brightOrange.b);
      pdf.rect(margin, yPosition, pageWidth - (margin * 2), 2, 'F');
      
      const colPositions: number[] = [currentX];
      const colWidths: number[] = [];
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      
      headers.forEach((header, index) => {
        colWidths.push(header.width);
        if (index > 0) {
          currentX += headers[index - 1].width;
          colPositions.push(currentX);
        }
        
        let textX = currentX + (header.width / 2);
        if (header.align === 'left') textX = currentX + 2;
        if (header.align === 'right') textX = currentX + header.width - 2;
        
        pdf.text(header.label, textX, yPosition + 7, { align: header.align as any });
      });
      
      return { nextY: yPosition + headerHeight, colPositions, colWidths, headerAligns: headers.map(h => h.align) };
    };
    
    // Initialize
    let currentY = addPremiumHeader(true);
    currentY += 6;
    
    // Section title with modern design
    pdf.setFillColor(lightCream.r, lightCream.g, lightCream.b);
    pdf.rect(margin, currentY, pageWidth - (margin * 2), 10, 'F');
    
    pdf.setTextColor(deepTeal.r, deepTeal.g, deepTeal.b);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text('ITEM DETAILS', margin + 3, currentY + 6.5);
    
    // Orange accent
    pdf.setFillColor(brightOrange.r, brightOrange.g, brightOrange.b);
    pdf.rect(margin, currentY, 3, 10, 'F');
    
    currentY += 12;
    
    const { nextY: tableStartY, colPositions, colWidths, headerAligns } = addPremiumTableHeader(currentY);
    currentY = tableStartY;
    
    const rowHeight = 12;
    let subTotal = 0;
    let totalGST = 0;
    let itemNumber = 1;
    
    items.forEach((item: any) => {
      const quantity = Number(item.quantity) || 0;
      const unitPrice = Number(item.unitPrice || item.unit_price) || 0;
      const lineTotal = quantity * unitPrice;
      const gstRate = Number(item.gstPercentage || item.gstPercent || item.gst_percent) || 18;
      const gstAmount = lineTotal * (gstRate / 100);
      
      subTotal += lineTotal;
      totalGST += gstAmount;
      
      // Page break check - allow maximum items, reserve minimal space for summary
      // Only need space for summary section initially (48mm + 10mm margin = 50mm)
      if (currentY + rowHeight + 50 > pageHeight - margin) {
        // Page footer
        pdf.setFillColor(brightOrange.r, brightOrange.g, brightOrange.b);
        pdf.rect(0, pageHeight - 10, pageWidth, 10, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(7);
        pdf.text(`Page ${currentPage}`, pageWidth / 2, pageHeight - 5, { align: 'center' });
        
        pdf.addPage();
        currentPage++;
        currentY = addPremiumHeader(false);
        currentY += 5;
        const { nextY } = addPremiumTableHeader(currentY);
        currentY = nextY;
      }
      
      // Row with modern styling
      if (itemNumber % 2 === 0) {
        pdf.setFillColor(lightCream.r, lightCream.g, lightCream.b);
        pdf.rect(margin, currentY, pageWidth - (margin * 2), rowHeight, 'F');
      }
      
      // Side accent for odd rows (using lighter orange instead of opacity)
      if (itemNumber % 2 === 1) {
        const lightOrange = {
          r: Math.min(255, brightOrange.r + 100),
          g: Math.min(255, brightOrange.g + 100),
          b: Math.min(255, brightOrange.b + 100)
        };
        pdf.setFillColor(lightOrange.r, lightOrange.g, lightOrange.b);
        pdf.rect(margin, currentY, 2, rowHeight, 'F');
      }
      
      // Bottom border
      pdf.setDrawColor(silver.r, silver.g, silver.b);
      pdf.setLineWidth(0.2);
      pdf.line(margin, currentY + rowHeight, pageWidth - margin, currentY + rowHeight);
      
      pdf.setTextColor(charcoal.r, charcoal.g, charcoal.b);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8.5);
      
      let description = '';
      if (item.isCustom) {
        description = item.customDescription || item.description || item.item_name || 'Custom Item';
      } else {
        description = item.description || item.item_name || 'Item';
      }
      
      if (description.length > 60) {
        description = description.substring(0, 57) + '...';
      }
      
      const rowData = [
        itemNumber.toString(),
        description,
        item.uom || item.unit_of_measure || 'No',
        quantity.toString(),
        'Rs. ' + unitPrice.toLocaleString('en-US', { minimumFractionDigits: 2 }),
        'Rs. ' + lineTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })
      ];
      
      rowData.forEach((data, colIndex) => {
        const cellWidth = colWidths[colIndex];
        let textX = colPositions[colIndex] + 2;
        const align = headerAligns[colIndex];
        
        if (align === 'center') {
          textX = colPositions[colIndex] + (cellWidth / 2);
        } else if (align === 'right') {
          textX = colPositions[colIndex] + cellWidth - 2;
        }
        
        pdf.text(data, textX, currentY + 7.5, { align: align as any });
      });
      
      currentY += rowHeight;
      itemNumber++;
    });
    
    // SECTION 1: Financial Summary (Independent page break check)
    currentY += 10;
    const grandTotal = subTotal + totalGST;
    
    // Check if Financial Summary fits on current page
    const summaryHeight = 58; // Card height + spacing
    if (currentY + summaryHeight > pageHeight - 18) {
      pdf.setFillColor(brightOrange.r, brightOrange.g, brightOrange.b);
      pdf.rect(0, pageHeight - 10, pageWidth, 10, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(7);
      pdf.text(`Page ${currentPage}`, pageWidth / 2, pageHeight - 5, { align: 'center' });
      
      pdf.addPage();
      currentPage++;
      currentY = addPremiumHeader(false) + 10;
    }
    
    // Premium summary card with advanced design
    const summaryX = pageWidth - margin - 75;
    const summaryY = currentY;
    const summaryWidth = 75;
    
    // Multi-layer shadow effect (using progressively lighter grays)
    pdf.setFillColor(245, 245, 245);
    pdf.roundedRect(summaryX + 3, summaryY + 3, summaryWidth, 48, 4, 4, 'F');
    pdf.setFillColor(240, 240, 240);
    pdf.roundedRect(summaryX + 2, summaryY + 2, summaryWidth, 48, 4, 4, 'F');
    
    // Main card
    pdf.setFillColor(white.r, white.g, white.b);
    pdf.setDrawColor(deepTeal.r, deepTeal.g, deepTeal.b);
    pdf.setLineWidth(0.5);
    pdf.roundedRect(summaryX, summaryY, summaryWidth, 48, 4, 4, 'FD');
    
    // Gradient header bar
    pdf.setFillColor(deepTeal.r, deepTeal.g, deepTeal.b);
    pdf.rect(summaryX, summaryY, summaryWidth, 10, 'F');
    
    pdf.setFillColor(brightOrange.r, brightOrange.g, brightOrange.b);
    pdf.rect(summaryX, summaryY, 4, 10, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('FINANCIAL SUMMARY', summaryX + (summaryWidth / 2), summaryY + 6.5, { align: 'center' });
    
    // Content area
    pdf.setTextColor(charcoal.r, charcoal.g, charcoal.b);
    pdf.setFontSize(9);
    
    // Subtotal
    pdf.setFont('helvetica', 'normal');
    pdf.text('Subtotal', summaryX + 4, summaryY + 18);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Rs. ' + subTotal.toLocaleString('en-US', { minimumFractionDigits: 2 }), summaryX + summaryWidth - 4, summaryY + 18, { align: 'right' });
    
    // Divider
    pdf.setDrawColor(silver.r, silver.g, silver.b);
    pdf.line(summaryX + 4, summaryY + 21, summaryX + summaryWidth - 4, summaryY + 21);
    
    // GST
    pdf.setFont('helvetica', 'normal');
    pdf.text('GST (18%)', summaryX + 4, summaryY + 28);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Rs. ' + totalGST.toLocaleString('en-US', { minimumFractionDigits: 2 }), summaryX + summaryWidth - 4, summaryY + 28, { align: 'right' });
    
    // Strong divider
    pdf.setDrawColor(deepTeal.r, deepTeal.g, deepTeal.b);
    pdf.setLineWidth(1);
    pdf.line(summaryX + 4, summaryY + 31, summaryX + summaryWidth - 4, summaryY + 31);
    
    // Grand total with accent
    pdf.setFillColor(brightOrange.r, brightOrange.g, brightOrange.b);
    pdf.rect(summaryX, summaryY + 34, summaryWidth, 14, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text('GRAND TOTAL', summaryX + 4, summaryY + 42);
    pdf.setFontSize(13);
    pdf.text('Rs. ' + grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 }), summaryX + summaryWidth - 4, summaryY + 42, { align: 'right' });
    
    // Update current Y position after summary
    currentY = summaryY + 56;
    
    // SECTION 2: Terms & Conditions (Independent page break check)
    const termsHeight = 58; // Box height + spacing
    if (currentY + termsHeight > pageHeight - 18) {
      pdf.setFillColor(brightOrange.r, brightOrange.g, brightOrange.b);
      pdf.rect(0, pageHeight - 10, pageWidth, 10, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(7);
      pdf.text(`Page ${currentPage}`, pageWidth / 2, pageHeight - 5, { align: 'center' });
      
      pdf.addPage();
      currentPage++;
      currentY = addPremiumHeader(false) + 10;
    }
    
    // Terms section with premium design
    const termsY = currentY;
    
    pdf.setFillColor(lightCream.r, lightCream.g, lightCream.b);
    pdf.rect(margin, termsY - 3, pageWidth - (margin * 2) - summaryWidth - 5, 50, 'F');
    
    pdf.setFillColor(brightOrange.r, brightOrange.g, brightOrange.b);
    pdf.rect(margin, termsY - 3, 3, 50, 'F');
    
    pdf.setTextColor(deepTeal.r, deepTeal.g, deepTeal.b);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text('TERMS & CONDITIONS', margin + 6, termsY + 2);
    
    pdf.setTextColor(charcoal.r, charcoal.g, charcoal.b);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    
    const terms = [
      '1. Validity: Valid for 25 days from quotation date',
      '2. Delivery: 6-10 business days post-PO (F.O.R Rawalpindi)',
      '3. Payment: As per mutually agreed terms',
      '4. Additional items will be quoted separately',
      '5. Prices subject to change without notice'
    ];
    
    terms.forEach((term, index) => {
      pdf.text(term, margin + 8, termsY + 12 + (index * 7));
    });
    
    // Update current Y position after terms
    currentY = termsY + 53;
    
    // SECTION 3: Signature (Independent page break check)
    const signatureHeight = 25; // Line + text + spacing
    if (currentY + signatureHeight > pageHeight - 18) {
      pdf.setFillColor(brightOrange.r, brightOrange.g, brightOrange.b);
      pdf.rect(0, pageHeight - 10, pageWidth, 10, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(7);
      pdf.text(`Page ${currentPage}`, pageWidth / 2, pageHeight - 5, { align: 'center' });
      
      pdf.addPage();
      currentPage++;
      currentY = addPremiumHeader(false) + 10;
    }
    
    // Premium signature section
    const signY = currentY;
    
    pdf.setDrawColor(deepTeal.r, deepTeal.g, deepTeal.b);
    pdf.setLineWidth(1);
    pdf.line(pageWidth - margin - 65, signY, pageWidth - margin - 5, signY);
    
    pdf.setTextColor(charcoal.r, charcoal.g, charcoal.b);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Authorized Signatory', pageWidth - margin - 35, signY + 5, { align: 'center' });
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(brightOrange.r, brightOrange.g, brightOrange.b);
    pdf.text('Anoosh International', pageWidth - margin - 35, signY + 9, { align: 'center' });
    
    // Premium footer with geometric design
    pdf.setFillColor(deepTeal.r, deepTeal.g, deepTeal.b);
    pdf.rect(0, pageHeight - 18, pageWidth, 18, 'F');
    
    // Orange accent stripe
    pdf.setFillColor(brightOrange.r, brightOrange.g, brightOrange.b);
    pdf.rect(0, pageHeight - 18, pageWidth, 3, 'F');
    
    // Diagonal accent (using lighter teal instead of opacity)
    const lightFooterTeal = {
      r: Math.min(255, deepTeal.r + 150),
      g: Math.min(255, deepTeal.g + 150),
      b: Math.min(255, deepTeal.b + 150)
    };
    pdf.setFillColor(lightFooterTeal.r, lightFooterTeal.g, lightFooterTeal.b);
    pdf.triangle(0, pageHeight - 18, 40, pageHeight, 0, pageHeight, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    
    pdf.text('Generated: ' + new Date().toLocaleString('en-GB'), margin, pageHeight - 8);
    pdf.text(`Document ${currentPage}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
    
    pdf.setFont('helvetica', 'bold');
    pdf.text('www.anooshinternational.com', pageWidth - margin, pageHeight - 8, { align: 'right' });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const fileName = `Premium_Quotation_${timestamp}.pdf`;
    pdf.save(fileName);
    
  } catch (error) {
    console.error('Error generating premium PDF:', error);
    throw new Error(`PDF generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

