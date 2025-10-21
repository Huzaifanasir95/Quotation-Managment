// WhatsApp Integration Utility
// This utility provides functions to send invoices and bills via WhatsApp

interface WhatsAppMessage {
  to: string;
  message: string;
  documentUrl?: string;
  documentName?: string;
}

interface InvoiceData {
  id: string;
  invoice_number: string;
  customer_name: string;
  customer_phone?: string;
  total_amount: number;
  due_date?: string;
  status: string;
}

interface VendorBillData {
  id: string;
  bill_number: string;
  vendor_name: string;
  vendor_phone?: string;
  total_amount: number;
  due_date?: string;
  status: string;
}

interface VendorRateRequestData {
  vendor_name: string;
  vendor_phone?: string;
  vendor_email?: string;
  category: string;
  reference_no?: string;
  items_count: number;
  items: Array<{
    item_name: string;
    description: string;
    quantity: number;
    uom: string;
  }>;
}

class WhatsAppService {
  private baseUrl = process.env.NEXT_PUBLIC_WHATSAPP_API_URL || 'https://api.whatsapp.com/send';
  
  /**
   * Format phone number for WhatsApp (remove special characters, add country code if needed)
   */
  private formatPhoneNumber(phone: string): string {
    // Remove all non-numeric characters
    let cleanPhone = phone.replace(/\D/g, '');
    
    // Add Pakistan country code if not present
    if (cleanPhone.length === 10 && !cleanPhone.startsWith('92')) {
      cleanPhone = '92' + cleanPhone;
    } else if (cleanPhone.length === 11 && cleanPhone.startsWith('0')) {
      cleanPhone = '92' + cleanPhone.substring(1);
    }
    
    return cleanPhone;
  }

  /**
   * Generate invoice message template
   */
  private generateInvoiceMessage(invoice: InvoiceData): string {
    const dueDate = invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'N/A';
    
    return `🧾 *Invoice from QMS*

📋 *Invoice Details:*
• Invoice No: ${invoice.invoice_number}
• Customer: ${invoice.customer_name}
• Amount: Rs. ${invoice.total_amount.toLocaleString()}
• Due Date: ${dueDate}
• Status: ${invoice.status.toUpperCase()}

💳 *Payment Information:*
Please make payment by the due date to avoid any late fees.

📞 For any queries, please contact us.

Thank you for your business! 🙏`;
  }

  /**
   * Generate vendor bill message template
   */
  private generateVendorBillMessage(bill: VendorBillData): string {
    const dueDate = bill.due_date ? new Date(bill.due_date).toLocaleDateString() : 'N/A';
    
    return `📄 *Vendor Bill from QMS*

📋 *Bill Details:*
• Bill No: ${bill.bill_number}
• Vendor: ${bill.vendor_name}
• Amount: Rs. ${bill.total_amount.toLocaleString()}
• Due Date: ${dueDate}
• Status: ${bill.status.toUpperCase()}

💰 *Payment Schedule:*
Payment will be processed as per agreed terms.

📞 For any queries, please contact our accounts department.

Thank you for your services! 🤝`;
  }

  /**
   * Send invoice via WhatsApp Web (opens in browser)
   */
  async sendInvoiceViaWhatsApp(invoice: InvoiceData): Promise<void> {
    try {
      const message = this.generateInvoiceMessage(invoice);
      const encodedMessage = encodeURIComponent(message);
      
      let whatsappUrl;
      
      if (invoice.customer_phone && this.isValidPhoneNumber(invoice.customer_phone)) {
        // If phone number is available, pre-fill it
        const formattedPhone = this.formatPhoneNumber(invoice.customer_phone);
        whatsappUrl = `${this.baseUrl}?phone=${formattedPhone}&text=${encodedMessage}`;
      } else {
        // If no phone number, just open WhatsApp with the message
        whatsappUrl = `${this.baseUrl}?text=${encodedMessage}`;
      }
      
      // Open WhatsApp Web in a new tab
      window.open(whatsappUrl, '_blank');
      
    } catch (error) {
      console.error('Error sending invoice via WhatsApp:', error);
      throw error;
    }
  }

  /**
   * Send vendor bill via WhatsApp Web (opens in browser)
   */
  async sendVendorBillViaWhatsApp(bill: VendorBillData): Promise<void> {
    try {
      const message = this.generateVendorBillMessage(bill);
      const encodedMessage = encodeURIComponent(message);
      
      let whatsappUrl;
      
      if (bill.vendor_phone && this.isValidPhoneNumber(bill.vendor_phone)) {
        // If phone number is available, pre-fill it
        const formattedPhone = this.formatPhoneNumber(bill.vendor_phone);
        whatsappUrl = `${this.baseUrl}?phone=${formattedPhone}&text=${encodedMessage}`;
      } else {
        // If no phone number, just open WhatsApp with the message
        whatsappUrl = `${this.baseUrl}?text=${encodedMessage}`;
      }
      
      // Open WhatsApp Web in a new tab
      window.open(whatsappUrl, '_blank');
      
    } catch (error) {
      console.error('Error sending vendor bill via WhatsApp:', error);
      throw error;
    }
  }

  /**
   * Send custom WhatsApp message
   */
  async sendCustomMessage(phone: string, message: string): Promise<void> {
    try {
      const formattedPhone = this.formatPhoneNumber(phone);
      const encodedMessage = encodeURIComponent(message);
      
      const whatsappUrl = `${this.baseUrl}?phone=${formattedPhone}&text=${encodedMessage}`;
      
      // Open WhatsApp Web in a new tab
      window.open(whatsappUrl, '_blank');
      
    } catch (error) {
      console.error('Error sending custom WhatsApp message:', error);
      throw error;
    }
  }

  /**
   * Validate phone number format
   */
  isValidPhoneNumber(phone: string): boolean {
    const cleanPhone = phone.replace(/\D/g, '');
    return cleanPhone.length >= 10 && cleanPhone.length <= 15;
  }

  /**
   * Send invoice reminder via WhatsApp
   */
  async sendInvoiceReminder(invoice: InvoiceData): Promise<void> {
    const reminderMessage = `🔔 *Payment Reminder*

Dear ${invoice.customer_name},

This is a friendly reminder that your invoice is due for payment:

📋 *Invoice Details:*
• Invoice No: ${invoice.invoice_number}
• Amount: Rs. ${invoice.total_amount.toLocaleString()}
• Due Date: ${invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'N/A'}

Please make the payment at your earliest convenience to avoid any late fees.

Thank you for your prompt attention to this matter! 🙏`;

    if (!invoice.customer_phone) {
      throw new Error('Customer phone number is required');
    }

    const formattedPhone = this.formatPhoneNumber(invoice.customer_phone);
    const encodedMessage = encodeURIComponent(reminderMessage);
    
    const whatsappUrl = `${this.baseUrl}?phone=${formattedPhone}&text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  }

  /**
   * Generate vendor rate request message template
   */
  private generateVendorRateRequestMessage(data: VendorRateRequestData): string {
    const itemsList = data.items.slice(0, 5).map((item, idx) => 
      `${idx + 1}. ${item.item_name} - Qty: ${item.quantity} ${item.uom}`
    ).join('\n');

    const moreItems = data.items.length > 5 ? `\n... and ${data.items.length - 5} more items` : '';
    
    return `📋 *Rate Request from Anoosh International*

Dear ${data.vendor_name},

We would like to request competitive rates for the following items:

📦 *Request Details:*
• Category: ${data.category}
• Reference: ${data.reference_no || 'N/A'}
• Total Items: ${data.items_count}
• Date: ${new Date().toLocaleDateString()}

🛒 *Items (Sample):*
${itemsList}${moreItems}

📊 *Required Information:*
Please provide us with:
• Your best rate per unit (PKR)
• Lead time for delivery (days)
• Any special terms or remarks

⏰ Please respond within 3-5 business days.

Thank you for your cooperation! 🤝

_This is an automated message from Anoosh International_`;
  }

  /**
   * Send vendor rate request via WhatsApp
   */
  async sendVendorRateRequest(data: VendorRateRequestData): Promise<void> {
    try {
      const message = this.generateVendorRateRequestMessage(data);
      const encodedMessage = encodeURIComponent(message);
      
      let whatsappUrl;
      
      if (data.vendor_phone && this.isValidPhoneNumber(data.vendor_phone)) {
        // If phone number is available, pre-fill it
        const formattedPhone = this.formatPhoneNumber(data.vendor_phone);
        whatsappUrl = `${this.baseUrl}?phone=${formattedPhone}&text=${encodedMessage}`;
      } else {
        // If no phone number, just open WhatsApp with the message
        whatsappUrl = `${this.baseUrl}?text=${encodedMessage}`;
      }
      
      // Open WhatsApp Web in a new tab
      window.open(whatsappUrl, '_blank');
      
    } catch (error) {
      console.error('Error sending vendor rate request via WhatsApp:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const whatsappService = new WhatsAppService();

// Export types for use in components
export type { InvoiceData, VendorBillData, WhatsAppMessage, VendorRateRequestData };
