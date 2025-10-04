'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { apiClient, Customer } from '../../lib/api';
import { generateQuotationPDF } from '../../../lib/pdfUtils';
import { loadJsPDF, loadXLSX } from '../../../lib/dynamicImports';

interface CreateQuotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onQuotationCreated?: () => void;
}

type TabType = 'customer' | 'items' | 'terms' | 'attachments' | 'preview';

export default function CreateQuotationModal({ isOpen, onClose, onQuotationCreated }: CreateQuotationModalProps) {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('customer');
  const [formData, setFormData] = useState({
    customerIds: [] as string[],
    validUntil: '',
    notes: 'NULL',
    termsConditions: ''
  });
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const [defaultTerms, setDefaultTerms] = useState<string>('');
  const [isLoadingTerms, setIsLoadingTerms] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [itemsViewMode, setItemsViewMode] = useState<'grid' | 'list'>('grid'); // Default to grid view
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [customerSearchTerm, setCustomerSearchTerm] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle mounting for portal
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Reset modal state when it opens or closes
  const resetModalState = () => {
    setActiveTab('customer');
    setFormData({
      customerIds: [],
      validUntil: '',
      notes: 'NULL',
      termsConditions: ''
    });
    setItems([]);
    setIsLoading(false);
    setAttachments([]);
    setIsUploading(false);
    setDragActive(false);
    setItemsViewMode('grid'); // Reset to grid view
    setCustomerSearchTerm(''); // Clear customer search
    setError(null);
  };

  // Load customers and products when modal opens, and reset state
  useEffect(() => {
    if (isOpen) {
      resetModalState();
      fetchCustomers();
      fetchTermsAndConditions();
      loadProducts();
    }
  }, [isOpen]);

  // Enhanced close handler that resets state
  const handleClose = () => {
    resetModalState();
    onClose();
  };

  const tabs = [
    { 
      id: 'customer', 
      name: 'Customer Info', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      step: 1
    },
    { 
      id: 'items', 
      name: 'Items', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      step: 2
    },
    { 
      id: 'terms', 
      name: 'Terms & Conditions', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      step: 3
    },
    { 
      id: 'attachments', 
      name: 'Attachments', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
        </svg>
      ),
      step: 4
    },
    { 
      id: 'preview', 
      name: 'Review & Create', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      step: 5
    }
  ];

  const fetchCustomers = async () => {
    setIsLoadingCustomers(true);
    try {
      const response = await apiClient.getSalesCustomers({ limit: 100 });
      if (response.success) {
        setCustomers(response.data.customers);
      }
    } catch (error) {
      console.error('Failed to fetch customers:', error);
    } finally {
      setIsLoadingCustomers(false);
    }
  };

  const fetchTermsAndConditions = async () => {
    setIsLoadingTerms(true);
    try {
      const response = await apiClient.getTermsAndConditions();
      if (response.success && response.data) {
        const terms = response.data.quotation_terms || response.data.default_terms || '';
        setDefaultTerms(terms);
        setFormData(prev => ({
          ...prev,
          termsConditions: terms
        }));
      }
    } catch (error) {
      console.error('Failed to fetch terms and conditions:', error);
      // Set fallback terms
      const fallbackTerms = '1. This quotation is valid for 30 days from the date of issue.\n2. Prices are subject to change without notice.\n3. Payment terms: 50% advance, 50% on delivery.\n4. Delivery time: 7-14 business days after order confirmation.';
      setDefaultTerms(fallbackTerms);
      setFormData(prev => ({
        ...prev,
        termsConditions: fallbackTerms
      }));
    } finally {
      setIsLoadingTerms(false);
    }
  };

  const loadProducts = async () => {
    try {
      const response = await apiClient.getProducts({ limit: 100 });
      if (response.success) {
        // Transform the API response to match the expected format
        const transformedProducts = response.data.products?.map((product: any) => ({
          id: product.id.toString(),
          name: product.name,
          price: parseFloat(product.selling_price || product.price || 0),
          description: product.description || '',
          sku: product.sku || '',
          stock: parseInt(product.current_stock || 0, 10)
        })) || [];
        setProducts(transformedProducts);
      } else {
        console.error('Failed to load products:', response);
        // Fallback to mock data if API fails
        setProducts([
          { id: '1', name: 'Laptop Dell XPS 13', price: 1200, stock: 10 },
          { id: '2', name: 'Monitor 27" 4K', price: 800, stock: 15 },
          { id: '3', name: 'Wireless Mouse', price: 50, stock: 20 },
          { id: '4', name: 'USB-C Hub', price: 45, stock: 25 }
        ]);
      }
    } catch (error) {
      console.error('Failed to load products:', error);
      // Fallback to mock data if API call fails
      setProducts([
        { id: '1', name: 'Laptop Dell XPS 13', price: 1200, stock: 10 },
        { id: '2', name: 'Monitor 27" 4K', price: 800, stock: 15 },
        { id: '3', name: 'Wireless Mouse', price: 50, stock: 20 },
        { id: '4', name: 'USB-C Hub', price: 45, stock: 25 }
      ]);
    }
  };

  const addItem = () => {
    setItems([...items, { 
      id: Date.now(), 
      productId: '', 
      quantity: 1, 
      unitPrice: 0, 
      isCustom: false, 
      customDescription: '',
      category: '',
      serialNo: '',
      itemName: '',
      auField: 'No' // A/U field with default "No"
    }]);
  };

  const addCustomItem = () => {
    setItems([...items, { 
      id: Date.now(), 
      productId: null, 
      quantity: 1, 
      unitPrice: 0, 
      isCustom: true, 
      customDescription: '',
      category: '',
      serialNo: '',
      itemName: '',
      auField: 'No' // A/U field with default "No"
    }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // File handling functions
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFiles = (files: File[]) => {
    const validFiles = files.filter(file => {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert(`File ${file.name} is too large. Maximum size is 10MB.`);
        return false;
      }
      
      // Check file type
      const allowedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        alert(`File ${file.name} is not supported. Please upload PDF, images, Word, Excel, or text files.`);
        return false;
      }
      
      return true;
    });

    setAttachments(prev => [...prev, ...validFiles]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const previewAttachment = (file: File) => {
    setPreviewFile(file);
    
    // Create URL for preview
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else if (file.type === 'application/pdf') {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      // For other file types, we'll show file info
      setPreviewUrl(null);
    }
  };

  const closePreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewFile(null);
    setPreviewUrl(null);
  };

  const downloadAttachment = (file: File) => {
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDownloadPDF = async () => {
    if (formData.customerIds.length === 0) {
      alert('Please select at least one customer to generate PDF');
      return;
    }
    
    if (items.length === 0) {
      alert('Please add at least one item to generate PDF');
      return;
    }

    setIsGeneratingPDF(true);
    
    try {
      // Find the first selected customer for PDF generation
      const selectedCustomer = customers.find(c => c.id === formData.customerIds[0]);
      if (!selectedCustomer) {
        throw new Error('Customer not found');
      }

      // Calculate totals
      const subtotal = items.reduce((total, item) => total + (item.quantity * item.unitPrice), 0);
      const taxAmount = 0; // You can add tax calculation here if needed
      const totalAmount = subtotal + taxAmount;

      // Prepare quotation data for PDF
      const quotationData = {
        quotation_number: `QUOTE-${Date.now()}`,
        customer: {
          id: selectedCustomer.id,
          name: selectedCustomer.name,
          email: selectedCustomer.email || '',
          phone: selectedCustomer.phone || '',
          contact_person: selectedCustomer.contact_person || '',
          address: selectedCustomer.address || 'Address not provided'
        },
        quotation_date: new Date().toISOString().split('T')[0],
        valid_until: formData.validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        items: items.map(item => {
          const product = products.find(p => p.id === item.productId);
          return {
            description: product?.name || 'Unknown Product',
            quantity: item.quantity,
            unit_price: item.unitPrice,
            line_total: item.quantity * item.unitPrice
          };
        }),
        subtotal: subtotal,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        terms_conditions: formData.termsConditions || 'Standard terms and conditions apply.',
        notes: formData.notes !== 'NULL' ? formData.notes : ''
      };

      await generateQuotationPDF(quotationData);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Please try again.'}`);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Export items to Excel
  const exportItemsToExcel = async () => {
    try {
      const XLSX = await loadXLSX();
      
      // Prepare data for export - ALL item fields
      const exportData = items.map((item, index) => {
        const product = products.find(p => p.id === item.productId);
        return {
          'S.No': index + 1,
          'Category': item.category || 'N/A',
          'Serial No': item.serialNo || 'N/A',
          'Item Name': item.itemName || (item.isCustom ? item.customDescription : product?.name) || 'N/A',
          'A/U': item.auField || 'No',
          'Description': item.isCustom ? item.customDescription : product?.name || 'N/A',
          'Quantity': item.quantity,
          'Unit Price': `Rs. ${item.unitPrice.toLocaleString()}`,
          'Total': `Rs. ${(item.quantity * item.unitPrice).toLocaleString()}`,
          'Type': item.isCustom ? 'Custom' : 'Inventory'
        };
      });

      // Create workbook and worksheet
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Quotation Items');

      // Set column widths
      const wscols = [
        { wch: 8 },  // S.No
        { wch: 20 }, // Category
        { wch: 15 }, // Serial No
        { wch: 30 }, // Item Name
        { wch: 8 },  // A/U
        { wch: 40 }, // Description
        { wch: 12 }, // Quantity
        { wch: 15 }, // Unit Price
        { wch: 15 }, // Total
        { wch: 12 }  // Type
      ];
      ws['!cols'] = wscols;

      // Generate filename with current date
      const filename = `Quotation_Items_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      // Save file
      XLSX.writeFile(wb, filename);
      alert('Items exported to Excel successfully!');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Failed to export items to Excel. Please try again.');
    }
  };

  // Export items to PDF
  const exportItemsToPDF = async () => {
    try {
      const jsPDF = await loadJsPDF();
      if (!jsPDF) {
        alert('PDF library failed to load. Please try again.');
        return;
      }

      const doc = new jsPDF('landscape');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      // Add title
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Quotation Items List', pageWidth / 2, 15, { align: 'center' });
      
      // Add export date
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Export Date: ${new Date().toLocaleDateString()}`, pageWidth / 2, 22, { align: 'center' });
      
      // Prepare table data
      const tableData = items.map((item, index) => {
        const product = products.find(p => p.id === item.productId);
        return [
          (index + 1).toString(),
          item.category || 'N/A',
          item.serialNo || 'N/A',
          item.itemName || (item.isCustom ? item.customDescription : product?.name) || 'N/A',
          item.auField || 'No',
          item.quantity.toString(),
          `Rs. ${item.unitPrice.toLocaleString()}`,
          `Rs. ${(item.quantity * item.unitPrice).toLocaleString()}`,
          item.isCustom ? 'Custom' : 'Inventory'
        ];
      });

      // Add table using autoTable (if available) or manual rendering
      const startY = 30;
      const headers = [['S.No', 'Category', 'Serial No', 'Item Name', 'A/U', 'Qty', 'Unit Price', 'Total', 'Type']];
      
      // Check if autoTable is available (jspdf-autotable plugin)
      if (typeof (doc as any).autoTable === 'function') {
        (doc as any).autoTable({
          startY: startY,
          head: headers,
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [59, 130, 246], fontSize: 9, fontStyle: 'bold' },
          bodyStyles: { fontSize: 8 },
          alternateRowStyles: { fillColor: [245, 247, 250] },
          margin: { left: 10, right: 10 },
          columnStyles: {
            0: { cellWidth: 15 },  // S.No
            1: { cellWidth: 25 },  // Category
            2: { cellWidth: 20 },  // Serial No
            3: { cellWidth: 40 },  // Item Name
            4: { cellWidth: 15 },  // A/U
            5: { cellWidth: 15 },  // Qty
            6: { cellWidth: 25 },  // Unit Price
            7: { cellWidth: 25 },  // Total
            8: { cellWidth: 20 }   // Type
          }
        });
      } else {
        // Manual table rendering as fallback
        doc.setFontSize(8);
        let y = startY;
        const lineHeight = 6;
        const colWidths = [15, 25, 20, 40, 15, 15, 25, 25, 20];
        let x = 10;

        // Draw headers
        doc.setFont('helvetica', 'bold');
        headers[0].forEach((header, i) => {
          doc.text(header, x, y);
          x += colWidths[i];
        });
        y += lineHeight;

        // Draw data
        doc.setFont('helvetica', 'normal');
        tableData.forEach(row => {
          if (y > pageHeight - 20) {
            doc.addPage();
            y = 20;
          }
          x = 10;
          row.forEach((cell, i) => {
            doc.text(String(cell).substring(0, 20), x, y); // Truncate long text
            x += colWidths[i];
          });
          y += lineHeight;
        });
      }
      
      // Add footer
      const totalPages = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(
          `Page ${i} of ${totalPages}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
      }

      // Generate filename with current date
      const filename = `Quotation_Items_${new Date().toISOString().split('T')[0]}.pdf`;
      
      // Save file
      doc.save(filename);
      alert('Items exported to PDF successfully!');
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      alert('Failed to export items to PDF. Please try again.');
    }
  };

  const handleSubmit = async () => {
    if (formData.customerIds.length === 0) {
      alert('Please select at least one customer');
      return;
    }
    
    if (items.length === 0) {
      alert('Please add at least one item');
      return;
    }

    // Validate items
    for (const item of items) {
      // Validate custom items have description
      if (item.isCustom && (!item.customDescription || item.customDescription.trim() === '')) {
        alert('Please provide a description for all custom items');
        return;
      }
      
      // Validate inventory items have product selected
      if (!item.isCustom && !item.productId) {
        alert('Please select a product for all inventory items');
        return;
      }
      
      // Validate stock for inventory items
      if (!item.isCustom && item.productId) {
        const product = products.find(p => p.id === item.productId);
        if (product && item.quantity > product.stock) {
          alert(`Insufficient stock for ${product.name}. Available: ${product.stock}`);
          return;
        }
      }
    }

    setIsLoading(true);
    
    try {
      // Create separate quotations for each selected customer
      const quotationPromises = formData.customerIds.map(async (customerId) => {
        const quotationData = {
          customer_id: customerId,
          quotation_date: new Date().toISOString().split('T')[0],
          valid_until: formData.validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
          notes: formData.notes,
          terms_conditions: formData.termsConditions,
          items: items.map(item => {
            if (item.isCustom) {
              // Custom item - no product_id
              return {
                product_id: null,
                description: item.customDescription || 'Custom item',
                quantity: item.quantity,
                unit_price: item.unitPrice
              };
            } else {
              // Inventory item - with product_id
              const product = products.find(p => p.id === item.productId);
              return {
                product_id: item.productId,
                description: product?.name || 'Product',
                quantity: item.quantity,
                unit_price: item.unitPrice
              };
            }
          })
        };

        return apiClient.createQuotation(quotationData);
      });

      const results = await Promise.all(quotationPromises);

      // Check if all quotations were created successfully
      const failedResults = results.filter(result => !result.success);
      if (failedResults.length > 0) {
        throw new Error(`Failed to create ${failedResults.length} quotation(s)`);
      }

      const successCount = results.length;
      alert(`Successfully created ${successCount} quotation(s) for selected customers!`);

      // Upload attachments for the first quotation if any
      if (attachments.length > 0 && results[0].success) {
        setIsUploading(true);
        const firstQuotationId = results[0].data.quotation.id;
        
        for (const file of attachments) {
          try {
            const uploadFormData = new FormData();
            uploadFormData.append('file', file);
            uploadFormData.append('reference_type', 'quotation');
            uploadFormData.append('reference_id', firstQuotationId);
            uploadFormData.append('document_type', 'quotation_attachment');
            
            await apiClient.uploadDocument(uploadFormData);
          } catch (uploadError) {
            console.error(`Failed to upload ${file.name}:`, uploadError);
            // Continue with other files even if one fails
            alert(`Warning: Failed to upload ${file.name}. The quotation was created successfully, but you may need to upload this file later.`);
          }
        }
        
        setIsUploading(false);
      }

      // Note: Quotations do not reduce inventory as they are estimates/proposals
      // Inventory will be reduced when the quotation is converted to a sales order
      
      // Call callback to refresh quotation list
      if (onQuotationCreated) {
        onQuotationCreated();
      }
      
      // Close modal and reset state
      handleClose();
    } catch (error) {
      console.error('Failed to create quotation:', error);
      alert(`Failed to create quotation: ${error instanceof Error ? error.message : 'Please try again.'}`);
    } finally {
      setIsLoading(false);
      setIsUploading(false);
    }
  };

  const currentTabIndex = tabs.findIndex(t => t.id === activeTab);
  const progress = ((currentTabIndex + 1) / tabs.length) * 100;

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div 
      className="fixed z-50" 
      style={{ 
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={handleClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full flex flex-col border border-gray-100"
        style={{ 
          maxHeight: '95vh',
          position: 'relative',
          zIndex: 51
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-white px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Create New Quotation</h2>
              <p className="text-gray-500 text-sm">Step {currentTabIndex + 1} of {tabs.length}</p>
            </div>
            <button 
              onClick={handleClose} 
              className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-gray-600">Progress</span>
              <span className="text-xs font-medium text-gray-600">{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div 
                className="bg-blue-500 h-1.5 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white border-b border-gray-200 px-8 flex-shrink-0">
          <nav className="flex space-x-1">
            {tabs.map((tab, index) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center space-x-3 px-6 py-4 text-sm font-medium rounded-t-lg transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                  activeTab === tab.id
                    ? 'bg-blue-500 text-white'
                    : index < currentTabIndex
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {index < currentTabIndex ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    tab.step
                  )}
                </div>
                <span className="hidden md:block">{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          <div className="p-8">
          {activeTab === 'customer' && (
            <div className="max-w-6xl mx-auto">
              <h3 className="text-lg font-medium text-gray-900 mb-6">Customer Information</h3>
              
              {/* Grid Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Customer Selection - Takes 2 columns */}
                <div className="lg:col-span-2">
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Select Customers *</label>
                        
                        {/* Search Bar */}
                        <div className="mb-4">
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                              </svg>
                            </div>
                            <input
                              type="text"
                              placeholder="Search customers by name or email..."
                              value={customerSearchTerm}
                              onChange={(e) => setCustomerSearchTerm(e.target.value)}
                              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-gray-500 focus:border-gray-500 text-sm text-black"
                            />
                            {customerSearchTerm && (
                              <button
                                onClick={() => setCustomerSearchTerm('')}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                              >
                                <svg className="h-4 w-4 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Customer List with Scrolling */}
                        <div className="space-y-2 max-h-80 overflow-y-auto border border-gray-200 rounded-lg p-2">
                          {customers
                            .filter(customer => {
                              if (!customerSearchTerm) return true;
                              const searchLower = customerSearchTerm.toLowerCase();
                              return (
                                customer.name.toLowerCase().includes(searchLower) ||
                                (customer.email && customer.email.toLowerCase().includes(searchLower))
                              );
                            })
                            .map(customer => (
                            <label key={customer.id} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={formData.customerIds.includes(customer.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setFormData({
                                      ...formData,
                                      customerIds: [...formData.customerIds, customer.id]
                                    });
                                  } else {
                                    setFormData({
                                      ...formData,
                                      customerIds: formData.customerIds.filter(id => id !== customer.id)
                                    });
                                  }
                                }}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                              <div className="flex-1">
                                <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                                {customer.email && (
                                  <div className="text-xs text-gray-500">{customer.email}</div>
                                )}
                              </div>
                            </label>
                          ))}
                          
                          {/* No customers found message */}
                          {customers.filter(customer => {
                            if (!customerSearchTerm) return true;
                            const searchLower = customerSearchTerm.toLowerCase();
                            return (
                              customer.name.toLowerCase().includes(searchLower) ||
                              (customer.email && customer.email.toLowerCase().includes(searchLower))
                            );
                          }).length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                              <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              <p className="text-sm">No customers found matching "{customerSearchTerm}"</p>
                              <button
                                onClick={() => setCustomerSearchTerm('')}
                                className="text-blue-600 hover:text-blue-700 text-sm mt-2"
                              >
                                Clear search
                              </button>
                            </div>
                          )}
                        </div>
                        
                        {formData.customerIds.length === 0 && (
                          <p className="text-sm text-red-500 mt-2">Please select at least one customer</p>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Valid Until</label>
                        <input
                          type="date"
                          value={formData.validUntil}
                          onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                          className="w-full text-black p-3 border border-gray-300 rounded-lg focus:ring-1 focus:ring-gray-500 focus:border-gray-500"
                          placeholder="Valid until"
                        />
                        <p className="text-sm text-gray-500 mt-1">If not specified, default is 30 days from today</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Reference No.</label>
                        <input
                          type="text"
                          value={formData.referenceNo || ''}
                          onChange={(e) => setFormData({ ...formData, referenceNo: e.target.value })}
                          className="w-full text-black p-3 border border-gray-300 rounded-lg focus:ring-1 focus:ring-gray-500 focus:border-gray-500"
                          placeholder="Enter reference number"
                        />
                        <p className="text-sm text-gray-500 mt-1">Optional reference number for this quotation</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Selected Customers Preview Card - Takes 1 column */}
                <div className="lg:col-span-1">
                  {formData.customerIds.length > 0 ? (
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h4 className="text-sm font-medium text-gray-900 mb-4">Selected Customers ({formData.customerIds.length})</h4>
                      <div className="space-y-3 max-h-64 overflow-y-auto">
                        {formData.customerIds.map(customerId => {
                          const customer = customers.find(c => c.id === customerId);
                          return customer ? (
                            <div key={customer.id} className="border border-gray-100 rounded-lg p-3">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                                  {customer.email && (
                                    <div className="text-xs text-gray-500 mt-1">{customer.email}</div>
                                  )}
                                  {customer.phone && (
                                    <div className="text-xs text-gray-500">{customer.phone}</div>
                                  )}
                                </div>
                                <button
                                  onClick={() => setFormData({
                                    ...formData,
                                    customerIds: formData.customerIds.filter(id => id !== customerId)
                                  })}
                                  className="text-red-500 hover:text-red-700 ml-2"
                                  title="Remove customer"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          ) : null;
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 flex items-center justify-center">
                      <div className="text-center">
                        <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <p className="text-sm text-gray-500">Select customers to see preview</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'items' && (
            <div className="max-w-6xl mx-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium text-gray-900">Quotation Items</h3>
                
                <div className="flex items-center space-x-4">
                  {/* Export Buttons */}
                  {items.length > 0 && (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={exportItemsToExcel}
                        className="flex items-center px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors duration-200 shadow-sm"
                        title="Export Items to Excel"
                      >
                        <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Excel
                      </button>
                      <button
                        onClick={exportItemsToPDF}
                        className="flex items-center px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors duration-200 shadow-sm"
                        title="Export Items to PDF"
                      >
                        <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        PDF
                      </button>
                    </div>
                  )}

                  {/* View Mode Toggle */}
                  <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setItemsViewMode('grid')}
                      className={`px-3 py-2 text-sm ${
                        itemsViewMode === 'grid'
                          ? 'bg-gray-800 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setItemsViewMode('list')}
                      className={`px-3 py-2 text-sm ${
                        itemsViewMode === 'list'
                          ? 'bg-gray-800 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                      </svg>
                    </button>
                  </div>
                  
                  <button 
                    onClick={addItem} 
                    className="bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-900 flex items-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    <span>From Inventory</span>
                  </button>
                  
                  <button 
                    onClick={addCustomItem} 
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Custom Item</span>
                  </button>
                </div>
              </div>
              
              {items.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="text-gray-400 mb-4">
                    <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <p className="text-gray-500 text-lg">No items added yet</p>
                  <p className="text-gray-400 text-sm">Click "Add Item" to get started</p>
                </div>
              ) : (
                <>
                  {itemsViewMode === 'grid' ? (
                    /* Grid View */
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {items.map((item, index) => {
                        const selectedProduct = products.find(p => p.id === item.productId);
                        const availableStock = selectedProduct?.stock || 0;
                        const isOverStock = item.quantity > availableStock;
                        const isCustomItem = item.isCustom === true;
                        
                        return (
                          <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center space-x-2">
                                <h4 className="font-medium text-gray-900">Item #{index + 1}</h4>
                                {isCustomItem && (
                                  <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded">Custom</span>
                                )}
                              </div>
                              <button
                                onClick={() => removeItem(index)}
                                className="text-red-500 hover:text-red-700 p-1 rounded"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                            
                            <div className="space-y-3">
                              {isCustomItem ? (
                                <>
                                  {/* Custom Item Fields */}
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                                    <textarea
                                      value={item.customDescription || ''}
                                      onChange={(e) => {
                                        const newItems = [...items];
                                        newItems[index] = { ...item, customDescription: e.target.value };
                                        setItems(newItems);
                                      }}
                                      className="w-full text-black p-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-gray-500 focus:border-gray-500"
                                      placeholder="Enter item description"
                                      rows={2}
                                    />
                                  </div>
                                                                    
                                  {/* New Fields */}
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                                      <input
                                        type="text"
                                        value={item.category || ''}
                                        onChange={(e) => {
                                          const newItems = [...items];
                                          newItems[index] = { ...item, category: e.target.value };
                                          setItems(newItems);
                                        }}
                                        className="w-full text-black p-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-gray-500 focus:border-gray-500"
                                        placeholder="Category"
                                      />
                                    </div>
                                    
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-1">Serial No</label>
                                      <input
                                        type="text"
                                        value={item.serialNo || ''}
                                        onChange={(e) => {
                                          const newItems = [...items];
                                          newItems[index] = { ...item, serialNo: e.target.value };
                                          setItems(newItems);
                                        }}
                                        className="w-full text-black p-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-gray-500 focus:border-gray-500"
                                        placeholder="Serial Number"
                                      />
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-1">Item Name</label>
                                      <input
                                        type="text"
                                        value={item.itemName || ''}
                                        onChange={(e) => {
                                          const newItems = [...items];
                                          newItems[index] = { ...item, itemName: e.target.value };
                                          setItems(newItems);
                                        }}
                                        className="w-full text-black p-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-gray-500 focus:border-gray-500"
                                        placeholder="Item Name"
                                      />
                                    </div>
                                    
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-1">A/U</label>
                                      <select
                                        value={item.auField || 'No'}
                                        onChange={(e) => {
                                          const newItems = [...items];
                                          newItems[index] = { ...item, auField: e.target.value };
                                          setItems(newItems);
                                        }}
                                        className="w-full text-black p-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-gray-500 focus:border-gray-500"
                                      >
                                        <option value="No">No</option>
                                        <option value="Yes">Yes</option>
                                      </select>
                                    </div>
                                  <div className="grid grid-cols-1 gap-2">
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-1">UOM (Unit of Measure)</label>
                                      <input
                                        type="text"
                                        value={item.uom || ''}
                                        onChange={(e) => {
                                          const newItems = [...items];
                                          newItems[index] = { ...item, uom: e.target.value };
                                          setItems(newItems);
                                        }}
                                        className="w-full text-black p-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-gray-500 focus:border-gray-500"
                                        placeholder="e.g., pcs, kg, ltr, m, etc."
                                      />
                                    </div>
                                  <div className="grid grid-cols-1 gap-2">
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-1">GST %</label>
                                      <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        max="100"
                                        value={item.gstPercentage || ''}
                                        onChange={(e) => {
                                          const newItems = [...items];
                                          newItems[index] = { ...item, gstPercentage: Number(e.target.value) };
                                          setItems(newItems);
                                        }}
                                        className="w-full text-black p-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-gray-500 focus:border-gray-500"
                                        placeholder="e.g., 18, 12, 5"
                                      />
                                    </div>
                                  </div>
                                  </div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-1">Quantity</label>
                                      <input
                                        type="number"
                                        min="1"
                                        value={item.quantity}
                                        onChange={(e) => {
                                          const newItems = [...items];
                                          newItems[index] = { ...item, quantity: Number(e.target.value) };
                                          setItems(newItems);
                                        }}
                                        className="w-full text-black p-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-gray-500 focus:border-gray-500"
                                        placeholder="Qty"
                                      />
                                    </div>
                                    
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-1">Price</label>
                                      <input
                                        type="number"
                                        step="0.01"
                                        value={item.unitPrice}
                                        onChange={(e) => {
                                          const newItems = [...items];
                                          newItems[index] = { ...item, unitPrice: Number(e.target.value) };
                                          setItems(newItems);
                                        }}
                                        className="w-full text-black p-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-gray-500 focus:border-gray-500"
                                        placeholder="Price"
                                      />
                                    </div>
                                  </div>
                                  
                                  <div className="bg-gray-50 p-2 border-t border-gray-200 rounded-lg">
                                    <p className="text-sm text-gray-900">
                                      <span className="font-medium">Total:</span> Rs. {(item.quantity * item.unitPrice).toFixed(2)}
                                    </p>
                                  </div>
                                </>
                              ) : (
                                <>
                                  {/* Inventory Item Fields */}
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Product</label>
                                    <select
                                      value={item.productId}
                                      onChange={(e) => {
                                        const product = products.find(p => p.id === e.target.value);
                                        const newItems = [...items];
                                        newItems[index] = { ...item, productId: e.target.value, unitPrice: product?.price || 0 };
                                        setItems(newItems);
                                      }}
                                      className="w-full text-black p-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-gray-500 focus:border-gray-500"
                                    >
                                      <option value="">Select product...</option>
                                      {products.map(p => (
                                        <option key={p.id} value={p.id}>{p.name} - Rs. {p.price} (Stock: {p.stock})</option>
                                      ))}
                                    </select>
                                  <div className="grid grid-cols-1 gap-2">
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-1">UOM (Unit of Measure)</label>
                                      <input
                                        type="text"
                                        value={item.uom || ''}
                                        onChange={(e) => {
                                          const newItems = [...items];
                                          newItems[index] = { ...item, uom: e.target.value };
                                          setItems(newItems);
                                        }}
                                        className="w-full text-black p-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-gray-500 focus:border-gray-500"
                                        placeholder="e.g., pcs, kg, ltr, m, etc."
                                      />
                                    </div>
                                  <div className="grid grid-cols-1 gap-2">
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-1">GST %</label>
                                      <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        max="100"
                                        value={item.gstPercentage || ''}
                                        onChange={(e) => {
                                          const newItems = [...items];
                                          newItems[index] = { ...item, gstPercentage: Number(e.target.value) };
                                          setItems(newItems);
                                        }}
                                        className="w-full text-black p-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-gray-500 focus:border-gray-500"
                                        placeholder="e.g., 18, 12, 5"
                                      />
                                    </div>
                                  </div>
                                  </div>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-1">Quantity</label>
                                      <input
                                        type="number"
                                        min="1"
                                        value={item.quantity}
                                        onChange={(e) => {
                                          const newItems = [...items];
                                          newItems[index] = { ...item, quantity: Number(e.target.value) };
                                          setItems(newItems);
                                        }}
                                        className={`w-full text-black p-2 border rounded-lg text-sm focus:ring-1 focus:ring-gray-500 focus:border-gray-500 ${isOverStock ? 'border-red-500' : 'border-gray-300'}`}
                                        placeholder="Qty"
                                      />
                                      {isOverStock && <p className="text-red-500 text-xs mt-1">Insufficient stock</p>}
                                    </div>
                                    
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-1">Price</label>
                                      <input
                                        type="number"
                                        step="0.01"
                                        value={item.unitPrice}
                                        onChange={(e) => {
                                          const newItems = [...items];
                                          newItems[index] = { ...item, unitPrice: Number(e.target.value) };
                                          setItems(newItems);
                                        }}
                                        className="w-full text-black p-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-gray-500 focus:border-gray-500"
                                        placeholder="Price"
                                      />
                                    </div>
                                  </div>
                                  
                                  {item.productId && (
                                    <>
                                      <div className="text-sm text-gray-500">
                                        Available stock: {availableStock}
                                      </div>
                                      <div className="bg-gray-50 p-2 border-t border-gray-200 rounded-lg">
                                        <p className="text-sm text-gray-900">
                                          <span className="font-medium">Total:</span> Rs. {(item.quantity * item.unitPrice).toFixed(2)}
                                        </p>
                                      </div>
                                    </>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* List View */
                    <div className="space-y-4">
                      {items.map((item, index) => {
                        const selectedProduct = products.find(p => p.id === item.productId);
                        const availableStock = selectedProduct?.stock || 0;
                        const isOverStock = item.quantity > availableStock;
                        const isCustomItem = item.isCustom === true;
                        
                        return (
                          <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center space-x-2">
                                <h4 className="font-medium text-gray-900">Item #{index + 1}</h4>
                                {isCustomItem && (
                                  <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded">Custom</span>
                                )}
                              </div>
                              <button
                                onClick={() => removeItem(index)}
                                className="text-red-500 hover:text-red-700 p-1 rounded"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                            
                            {isCustomItem ? (
                              <>
                                {/* Custom Item Fields */}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                  <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                    <textarea
                                      value={item.customDescription || ''}
                                      onChange={(e) => {
                                        const newItems = [...items];
                                        newItems[index] = { ...item, customDescription: e.target.value };
                                        setItems(newItems);
                                      }}
                                      className="w-full text-black p-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-gray-500 focus:border-gray-500"
                                      placeholder="Enter item description"
                                      rows={2}
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                                    <input
                                      type="number"
                                      min="1"
                                      value={item.quantity}
                                      onChange={(e) => {
                                        const newItems = [...items];
                                        newItems[index] = { ...item, quantity: Number(e.target.value) };
                                        setItems(newItems);
                                      }}
                                      className="w-full text-black p-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-gray-500 focus:border-gray-500"
                                      placeholder="Quantity"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price</label>
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={item.unitPrice}
                                      onChange={(e) => {
                                        const newItems = [...items];
                                        newItems[index] = { ...item, unitPrice: Number(e.target.value) };
                                        setItems(newItems);
                                      }}
                                      className="w-full text-black p-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-gray-500 focus:border-gray-500"
                                      placeholder="Price"
                                    />
                                  </div>
                                </div>
                                <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                                  <p className="text-sm text-gray-900">
                                    <span className="font-medium">Subtotal:</span> Rs. {(item.quantity * item.unitPrice).toFixed(2)}
                                  </p>
                                </div>
                              </>
                            ) : (
                              <>
                                {/* Inventory Item Fields */}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                  <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
                                    <select
                                      value={item.productId}
                                      onChange={(e) => {
                                        const product = products.find(p => p.id === e.target.value);
                                        const newItems = [...items];
                                        newItems[index] = { ...item, productId: e.target.value, unitPrice: product?.price || 0 };
                                        setItems(newItems);
                                      }}
                                      className="w-full text-black p-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-gray-500 focus:border-gray-500"
                                    >
                                      <option value="">Select product...</option>
                                      {products.map(p => (
                                        <option key={p.id} value={p.id}>{p.name} - Rs. {p.price} (Stock: {p.stock})</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                                    <input
                                      type="number"
                                      min="1"
                                      value={item.quantity}
                                      onChange={(e) => {
                                        const newItems = [...items];
                                        newItems[index] = { ...item, quantity: Number(e.target.value) };
                                        setItems(newItems);
                                      }}
                                      className={`w-full text-black p-2 border rounded-lg focus:ring-1 focus:ring-gray-500 focus:border-gray-500 ${isOverStock ? 'border-red-500' : 'border-gray-300'}`}
                                      placeholder="Quantity"
                                    />
                                    {isOverStock && <p className="text-red-500 text-xs mt-1">Insufficient stock</p>}
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price</label>
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={item.unitPrice}
                                      onChange={(e) => {
                                        const newItems = [...items];
                                        newItems[index] = { ...item, unitPrice: Number(e.target.value) };
                                        setItems(newItems);
                                      }}
                                      className="w-full text-black p-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-gray-500 focus:border-gray-500"
                                      placeholder="Price"
                                    />
                                  </div>
                                </div>
                                {item.productId && (
                                  <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                                    <p className="text-sm text-gray-500">
                                      Available stock: {availableStock}
                                    </p>
                                    <p className="text-sm text-gray-900 mt-1">
                                      <span className="font-medium">Subtotal:</span> Rs. {(item.quantity * item.unitPrice).toFixed(2)}
                                    </p>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  
                  {/* Total Summary */}
                  <div className="mt-6 bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-medium text-gray-900">Total Amount:</span>
                      <span className="text-xl font-bold text-gray-900">
                        Rs. {items.reduce((total, item) => total + (item.quantity * item.unitPrice), 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'terms' && (
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="text-base font-medium text-gray-900 mb-3 flex items-center">
                  <svg className="w-4 h-4 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Terms & Conditions
                </h3>
                
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 h-48 overflow-y-auto">
                  {isLoadingTerms ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-600"></div>
                      <span className="ml-2 text-gray-600 text-sm">Loading terms...</span>
                    </div>
                  ) : (
                    <div className="prose prose-sm max-w-none">
                      <div className="whitespace-pre-wrap text-gray-800 leading-relaxed text-sm">
                        {formData.termsConditions || 'No terms and conditions available.'}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="mt-2 flex items-center text-xs text-gray-500">
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Terms are managed in Settings and cannot be edited here
                </div>
              </div>
            </div>
          )}

          {activeTab === 'attachments' && (
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  File Attachments
                </h3>
                
                {/* File Upload Area */}
                <div
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors duration-200 cursor-pointer ${
                    dragActive 
                      ? 'border-gray-500 bg-gray-50' 
                      : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => {
                    fileInputRef.current?.click();
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileInputChange}
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx,.xls,.xlsx,.txt"
                  />
                  
                  <div className="space-y-3">
                    <svg className="w-12 h-12 text-gray-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    
                    <div>
                      <p className="text-base font-medium text-gray-900">
                        {dragActive ? 'Drop files here' : 'File Upload'}
                      </p>
                      <p className="text-gray-500 text-sm">
                        Drag and drop files or click to upload attachments
                      </p>
                      <p className="text-xs text-gray-400 mt-2">
                        Supports: PDF, Images (JPG, PNG, GIF), Word, Excel, Text files • Max: 10MB
                      </p>
                    </div>
                  </div>
                </div>

                {/* Separate Choose Files Button */}
                <div className="mt-4 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      fileInputRef.current?.click();
                    }}
                    className="inline-flex items-center px-4 py-2 bg-gray-800 text-white font-medium rounded-lg hover:bg-gray-900 transition-colors"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Choose Files
                  </button>
                </div>
                
                {/* Uploaded Files List */}
                {attachments.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-base font-medium text-gray-900 mb-3">
                      Attached Files ({attachments.length})
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {attachments.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                        >
                          <div className="flex items-center space-x-3 flex-1 min-w-0">
                            <div className="flex-shrink-0">
                              {file.type.startsWith('image/') ? (
                                <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              ) : file.type === 'application/pdf' ? (
                                <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              ) : (
                                <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {file.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatFileSize(file.size)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-1">
                            {/* View/Preview Button */}
                            <button
                              onClick={() => previewAttachment(file)}
                              className="flex-shrink-0 p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                              title="View file"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                            
                            {/* Download Button */}
                            <button
                              onClick={() => downloadAttachment(file)}
                              className="flex-shrink-0 p-1 text-green-500 hover:text-green-700 hover:bg-green-50 rounded transition-colors"
                              title="Download file"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </button>
                            
                            {/* Remove Button */}
                            <button
                              onClick={() => removeAttachment(index)}
                              className="flex-shrink-0 p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                              title="Remove file"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'preview' && (
            <div className="max-w-6xl mx-auto">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-medium text-gray-900 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Review & Create Quotation
                  </h3>
                  
                  {/* PDF Download Button */}
                  <button
                    onClick={handleDownloadPDF}
                    disabled={isGeneratingPDF || !formData.customerIds.length || items.length === 0}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                  >
                    {isGeneratingPDF ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Generating...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Download PDF
                      </>
                    )}
                  </button>
                </div>
                
                {/* Two Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Column */}
                  <div className="space-y-4">
                    {/* Customer Info */}
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                        <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Customer
                      </h4>
                      <p className="text-gray-700 font-medium">
                        {formData.customerIds.length > 0 ? `${formData.customerIds.length} customer(s) selected` : 'No customers selected'}
                      </p>
                      {formData.customerIds.length > 0 && (
                        <div className="mt-2 text-sm text-gray-500">
                          <p>Multiple customers selected - details available in preview panel</p>
                        </div>
                      )}
                    </div>
                    
                    {/* Items */}
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                        <svg className="w-4 h-4 mr-2 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                        Items ({items.length})
                      </h4>
                      {items.length > 0 ? (
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {items.map((item, index) => {
                            const isCustomItem = item.isCustom === true;
                            const itemName = isCustomItem 
                              ? (item.customDescription || 'Custom Item')
                              : (products.find(p => p.id === item.productId)?.name || 'Product');
                            const stock = isCustomItem ? 'N/A' : (products.find(p => p.id === item.productId)?.stock || 0);
                            
                            return (
                              <div key={item.id} className="flex justify-between items-center text-sm bg-gray-50 p-2 rounded">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center space-x-2">
                                    <p className="font-medium text-gray-900 truncate">
                                      {itemName}
                                    </p>
                                    {isCustomItem && (
                                      <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded">Custom</span>
                                    )}
                                  </div>
                                  <p className="text-gray-500">Qty: {item.quantity} × Rs. {item.unitPrice} {!isCustomItem && `(Stock: ${stock})`}</p>
                                </div>
                                <span className="font-medium text-gray-900">Rs. {(item.quantity * item.unitPrice).toFixed(2)}</span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm">No items added</p>
                      )}
                    </div>
                  </div>
                  
                  {/* Right Column */}
                  <div className="space-y-4">
                    {/* Attachments */}
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                        <svg className="w-4 h-4 mr-2 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                        Attachments ({attachments.length})
                      </h4>
                      {attachments.length > 0 ? (
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {attachments.map((file, index) => (
                            <div key={index} className="flex justify-between items-center text-sm bg-gray-50 p-2 rounded">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 truncate">{file.name}</p>
                                <p className="text-gray-500">{formatFileSize(file.size)}</p>
                              </div>
                              <div className="flex-shrink-0">
                                {file.type.startsWith('image/') ? (
                                  <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                ) : file.type === 'application/pdf' ? (
                                  <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                ) : (
                                  <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm">No files attached</p>
                      )}
                    </div>
                    
                    {/* Total Summary */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-medium text-gray-900">Total Amount:</span>
                        <span className="text-2xl font-bold text-green-600">
                          Rs. {items.reduce((total, item) => total + (item.quantity * item.unitPrice), 0).toFixed(2)}
                        </span>
                      </div>
                      <div className="mt-2 text-sm text-green-700">
                        {items.length} item{items.length !== 1 ? 's' : ''} • {attachments.length} attachment{attachments.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-white border-t border-gray-200 px-6 py-3 flex-shrink-0">
          <div className="flex justify-between items-center">
            <button
              onClick={() => {
                const currentIndex = tabs.findIndex(t => t.id === activeTab);
                if (currentIndex > 0) {
                  setActiveTab(tabs[currentIndex - 1].id as TabType);
                }
              }}
              disabled={activeTab === 'customer'}
              className="px-4 py-1.5 text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center text-sm"
            >
              <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Previous
            </button>

            <div className="flex space-x-2">
              <button 
                onClick={handleClose} 
                className="px-4 py-1.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                Cancel
              </button>
              {activeTab === 'preview' ? (
                <div className="flex space-x-2">
                  <button
                    onClick={handleDownloadPDF}
                    disabled={isGeneratingPDF || !formData.customerIds.length || items.length === 0}
                    className="px-4 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center text-sm"
                  >
                    {isGeneratingPDF ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Generating...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Download PDF
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={isLoading || isUploading || !formData.customerIds.length || items.length === 0}
                    className="px-4 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center text-sm"
                  >
                    {isLoading || isUploading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {isLoading ? 'Creating...' : 'Uploading Files...'}
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Create Quotation
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    const currentIndex = tabs.findIndex(t => t.id === activeTab);
                    if (currentIndex < tabs.length - 1) {
                      setActiveTab(tabs[currentIndex + 1].id as TabType);
                    }
                  }}
                  className="px-4 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center text-sm"
                >
                  Next
                  <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
        
        {/* File Preview Modal */}
        {previewFile && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] w-full overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 truncate">
                  {previewFile.name}
                </h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => downloadAttachment(previewFile)}
                    className="p-2 text-green-500 hover:text-green-700 hover:bg-green-50 rounded transition-colors"
                    title="Download file"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </button>
                  <button
                    onClick={closePreview}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              {/* Content */}
              <div className="p-4 overflow-auto max-h-[calc(90vh-120px)]">
                {previewFile.type.startsWith('image/') && previewUrl ? (
                  <div className="flex justify-center">
                    <img
                      src={previewUrl}
                      alt={previewFile.name}
                      className="max-w-full max-h-full object-contain rounded"
                    />
                  </div>
                ) : previewFile.type === 'application/pdf' && previewUrl ? (
                  <iframe
                    src={previewUrl}
                    className="w-full h-[600px] border-0 rounded"
                    title={previewFile.name}
                  />
                ) : previewFile.type.startsWith('text/') ? (
                  <div className="bg-gray-50 p-4 rounded">
                    <p className="text-sm text-gray-600 mb-2">Text File Preview:</p>
                    <div className="bg-white p-4 rounded border max-h-96 overflow-auto">
                      <pre className="text-sm whitespace-pre-wrap">
                        {/* Text content would be loaded here */}
                        <span className="text-gray-500">Text file content preview not available. Click download to view the full file.</span>
                      </pre>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-gray-400 mb-4">
                      <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h4 className="text-lg font-medium text-gray-900 mb-2">{previewFile.name}</h4>
                    <p className="text-gray-500 mb-4">File type: {previewFile.type || 'Unknown'}</p>
                    <p className="text-gray-500 mb-4">Size: {formatFileSize(previewFile.size)}</p>
                    <p className="text-gray-600">Preview not available for this file type.</p>
                    <button
                      onClick={() => downloadAttachment(previewFile)}
                      className="mt-4 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                    >
                      Download File
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Render modal using portal to document.body for proper screen centering
  return createPortal(modalContent, document.body);
}