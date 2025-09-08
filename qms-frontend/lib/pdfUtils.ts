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
      pdf.text(`$${item.unit_price.toFixed(2)}`, colPositions[2] + 2, yPosition);
      pdf.text(`$${itemTotal.toFixed(2)}`, colPositions[3] + 2, yPosition);
      yPosition += lineHeight;
    });

    // Total Section
    yPosition += 10;
    pdf.line(colPositions[2], yPosition - 5, pageWidth - margin, yPosition - 5);
    
    pdf.setFont('helvetica', 'bold');
    pdf.text('Subtotal:', colPositions[2] + 2, yPosition);
    pdf.text(`$${quotationData.subtotal.toFixed(2)}`, colPositions[3] + 2, yPosition);
    yPosition += lineHeight;

    if (quotationData.tax_amount && quotationData.tax_amount > 0) {
      pdf.text('Tax:', colPositions[2] + 2, yPosition);
      pdf.text(`$${quotationData.tax_amount.toFixed(2)}`, colPositions[3] + 2, yPosition);
      yPosition += lineHeight;
    }

    pdf.setFontSize(14);
    pdf.text('Total:', colPositions[2] + 2, yPosition);
    pdf.text(`$${quotationData.total_amount.toFixed(2)}`, colPositions[3] + 2, yPosition);
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
