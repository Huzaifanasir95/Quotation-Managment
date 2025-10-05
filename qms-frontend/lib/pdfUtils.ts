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
    let subtotal = 0;

    quotationData.items.forEach((item, index) => {
      const itemTotal = item.line_total || (item.quantity * item.unit_price);
      subtotal += itemTotal;

      // Check if we need a new page
      if (yPosition > pageHeight - 50) {
        pdf.addPage();
        yPosition = margin;
      }

      pdf.text(item.description, colPositions[0] + 2, yPosition);
      pdf.text(item.quantity.toString(), colPositions[1] + 2, yPosition);
  pdf.text(`Rs. ${item.unit_price.toFixed(2)}`, colPositions[2] + 2, yPosition);
  pdf.text(`Rs. ${itemTotal.toFixed(2)}`, colPositions[3] + 2, yPosition);
      yPosition += lineHeight;
    });

    // Total Section
    yPosition += 10;
    pdf.line(colPositions[2], yPosition - 5, pageWidth - margin, yPosition - 5);
    
    pdf.setFont('helvetica', 'bold');
    pdf.text('Subtotal:', colPositions[2] + 2, yPosition);
  pdf.text(`Rs. ${quotationData.subtotal.toFixed(2)}`, colPositions[3] + 2, yPosition);
    yPosition += lineHeight;

    if (quotationData.tax_amount && quotationData.tax_amount > 0) {
      pdf.text('Tax:', colPositions[2] + 2, yPosition);
  pdf.text(`Rs. ${quotationData.tax_amount.toFixed(2)}`, colPositions[3] + 2, yPosition);
      yPosition += lineHeight;
    }

    pdf.setFontSize(14);
    pdf.text('Total:', colPositions[2] + 2, yPosition);
  pdf.text(`Rs. ${quotationData.total_amount.toFixed(2)}`, colPositions[3] + 2, yPosition);
    yPosition += 15;

    // Terms and Conditions
    if (quotationData.terms_conditions) {
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Terms & Conditions:', margin, yPosition);
      yPosition += lineHeight + 2;

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      yPosition = addWrappedText(quotationData.terms_conditions, margin, yPosition, pageWidth - 2 * margin, 10);
      yPosition += 10;
    }

    // Notes
    if (quotationData.notes && quotationData.notes !== 'NULL') {
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Notes:', margin, yPosition);
      yPosition += lineHeight + 2;

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      yPosition = addWrappedText(quotationData.notes, margin, yPosition, pageWidth - 2 * margin, 10);
    }

    // Footer
    const footerY = pageHeight - 20;
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

export const generateDetailedQuotationPDF = async (items: any[], companyInfo?: any, refNo?: string) => {
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
    
    // Function to add header only on first page
    const addFirstPageHeader = () => {
      pdf.setLineWidth(0.8);
      pdf.rect(margin, margin, pageWidth - (margin * 2), 35);
      
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Directorate of Technical Procurement (L),', margin + 5, margin + 12);
      pdf.text('KRL, Rawalpindi.', margin + 5, margin + 25);
      
      const infoBoxX = pageWidth - 85;
      const infoBoxY = margin;
      const infoBoxWidth = 70;
      const infoBoxHeight = 35;
      
      pdf.rect(infoBoxX, infoBoxY, infoBoxWidth, infoBoxHeight);
      pdf.line(infoBoxX, infoBoxY + 17.5, infoBoxX + infoBoxWidth, infoBoxY + 17.5);
      pdf.line(infoBoxX + 25, infoBoxY, infoBoxX + 25, infoBoxY + infoBoxHeight);
      
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      
      pdf.text('Date', infoBoxX + 2, infoBoxY + 8);
      pdf.text(':', infoBoxX + 20, infoBoxY + 8);
      pdf.text(new Date().toLocaleDateString('en-GB'), infoBoxX + 27, infoBoxY + 8);
      
      pdf.text('Ref.No', infoBoxX + 2, infoBoxY + 25);
      pdf.text(':', infoBoxX + 20, infoBoxY + 25);
      pdf.text(refNo || '-', infoBoxX + 27, infoBoxY + 25);
      
      return margin + 55;
    };
    
    // Function for continuation pages (no header, just start with margin)
    const addContinuationPage = () => {
      return margin + 10; // Small top margin for continuation pages
    };
    
    // Function to add table header
    const addTableHeader = (yPosition: number) => {
      const tableHeaders = ['Sr.No', 'Description of Goods/Services', 'UOM', 'Qty', 'Unit Price', 'Total Price', 'GST Rate'];
      const colWidths = [15, 70, 18, 15, 25, 25, 20];
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
        unitPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        lineTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        `${gstRate}%`
      ];
      
      const alignments = ['center', 'left', 'center', 'center', 'right', 'right', 'center'];
      
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
    
    // Totals section
    const totalsBoxX = pageWidth - 90;
    const totalsBoxWidth = 75;
    const totalsBoxHeight = 45;
    
    pdf.setLineWidth(0.5);
    pdf.rect(totalsBoxX, footerStartY - 5, totalsBoxWidth, totalsBoxHeight);
    
    pdf.line(totalsBoxX, footerStartY + 8, totalsBoxX + totalsBoxWidth, footerStartY + 8);
    pdf.line(totalsBoxX, footerStartY + 21, totalsBoxX + totalsBoxWidth, footerStartY + 21);
    pdf.line(totalsBoxX + 45, footerStartY - 5, totalsBoxX + 45, footerStartY + 40);
    
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    
    pdf.text('Sub Total', totalsBoxX + 2, footerStartY + 5);
    pdf.text(subTotal.toLocaleString('en-US', { minimumFractionDigits: 2 }), totalsBoxX + totalsBoxWidth - 3, footerStartY + 5, { align: 'right' });
    
    pdf.text('GST @ 18%', totalsBoxX + 2, footerStartY + 18);
    pdf.text(totalGST.toLocaleString('en-US', { minimumFractionDigits: 2 }), totalsBoxX + totalsBoxWidth - 3, footerStartY + 18, { align: 'right' });
    
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.text('Total', totalsBoxX + 2, footerStartY + 31);
    pdf.text(grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 }), totalsBoxX + totalsBoxWidth - 3, footerStartY + 31, { align: 'right' });
    
    // Terms & Conditions
    const termsStartY = footerStartY + 60;
    
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.text('Terms & Conditions:', margin, termsStartY);
    
    const termIndent = margin + 40;
    pdf.setFontSize(9);
    
    const terms = [
      { label: 'Validity', value: 'Prices are valid for 25 Days Only.' },
      { label: 'Delivery', value: '6-10 Days after receiving the PO. (F.O.R Rawalpindi).' },
      { label: 'Optional Items', value: 'Optional items other than quoted will be charged separately' }
    ];
    
    terms.forEach((term, index) => {
      const yPos = termsStartY + 15 + (index * 10);
      pdf.setFont('helvetica', 'bold');
      pdf.text(term.label, margin + 5, yPos);
      pdf.text(':', termIndent, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.text(term.value, termIndent + 5, yPos);
    });
    
    // Authorized Signature
    const signatureY = termsStartY + 55;
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
