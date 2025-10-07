'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { apiClient, Vendor } from '../../lib/api';
import VendorRateEditComponents from './VendorRateEditComponents';
import VendorCategoryManager from './VendorCategoryManager';

interface EditQuotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotationId: string;
  onQuotationUpdated?: () => void;
}

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
  profit_percent: number;
  tax_percent: number;
  discount_percent?: number;
  line_total: number;
  isCustom?: boolean;
  au_field?: string; // A/U field
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

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  contact_person?: string;
}

export default function EditQuotationModal({ isOpen, onClose, quotationId, onQuotationUpdated }: EditQuotationModalProps) {
  const [mounted, setMounted] = useState(false);
  const [formData, setFormData] = useState({
    customer_id: '',
    quotation_date: '',
    valid_until: '',
    terms_conditions: '',
    notes: '',
    reference_number: ''
  });
  const [items, setItems] = useState<QuotationItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [itemsViewMode, setItemsViewMode] = useState<'grid' | 'list'>('grid');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const [isLoadingQuotation, setIsLoadingQuotation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Attachment states
  const [attachments, setAttachments] = useState<File[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewExisting, setPreviewExisting] = useState<any | null>(null);
  const [attachmentsToDelete, setAttachmentsToDelete] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Vendor rate states
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoadingVendors, setIsLoadingVendors] = useState(false);
  const [showVendorRateModal, setShowVendorRateModal] = useState(false);
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);
  const [categoryVendors, setCategoryVendors] = useState<{[key: string]: string[]}>({});

  // Enhanced vendor management states
  const [showVendorCategoryModal, setShowVendorCategoryModal] = useState(false);
  const [pdfOptions, setPdfOptions] = useState({
    showTotals: true,
    showTax: true,
    showProfit: true
  });

  // Helper function to determine file type from filename
  const getFileTypeFromName = (fileName: string): string => {
    if (!fileName) return '';
    const extension = fileName.toLowerCase().split('.').pop();
    switch (extension) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'gif':
        return 'image/gif';
      case 'bmp':
        return 'image/bmp';
      case 'webp':
        return 'image/webp';
      case 'pdf':
        return 'application/pdf';
      case 'doc':
        return 'application/msword';
      case 'docx':
        return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case 'xls':
        return 'application/vnd.ms-excel';
      case 'xlsx':
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case 'txt':
        return 'text/plain';
      default:
        return 'application/octet-stream';
    }
  };

  // Handle mounting for portal
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);



  // Fetch data when modal opens
  useEffect(() => {
    if (isOpen && quotationId) {
      fetchCustomers();
      fetchQuotation();
      fetchExistingAttachments();
      loadProducts();
      loadVendors();
    }
  }, [isOpen, quotationId]);

  const fetchExistingAttachments = async () => {
    try {
      const response = await apiClient.getDocuments('quotation', quotationId);
      console.log('Fetched attachments response:', response);
      if (response.success && response.data) {
        console.log('Setting existing attachments:', response.data);
        setExistingAttachments(response.data);
      } else {
        console.log('No attachments found or failed response:', response);
        setExistingAttachments([]);
      }
    } catch (error) {
      console.error('Failed to fetch attachments:', error);
      setExistingAttachments([]);
    }
  };

  const loadProducts = async () => {
    try {
      const response = await apiClient.getProducts({ limit: 100 });
      if (response.success) {
        const transformedProducts = response.data.products?.map((product: any) => ({
          id: product.id.toString(),
          name: product.name,
          price: parseFloat(product.selling_price || product.price || 0),
          description: product.description || '',
          sku: product.sku || '',
          stock: parseInt(product.current_stock || 0, 10)
        })) || [];
        setProducts(transformedProducts);
      }
    } catch (error) {
      console.error('Failed to load products:', error);
    }
  };

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

  const fetchQuotation = async () => {
    setIsLoadingQuotation(true);
    try {
      const response = await apiClient.getQuotationById(quotationId);
      if (response.success && response.data.quotation) {
        const quotation = response.data.quotation;
        
        // Set form data
        setFormData({
          customer_id: quotation.customer_id || '',
          quotation_date: quotation.quotation_date || '',
          valid_until: quotation.valid_until || '',
          terms_conditions: quotation.terms_conditions || '',
          notes: quotation.notes || '',
          reference_number: quotation.reference_number || ''
        });

        // Set items
        const quotationItems = quotation.quotation_items?.map((item: any) => ({
          id: item.id.toString(),
          product_id: item.product_id || '',
          description: item.description || '',
          category: item.category || '',
          serial_number: item.serial_number || '',
          item_name: item.item_name || '',
          unit_of_measure: item.unit_of_measure || '',
          gst_percent: parseFloat(item.gst_percent) || 0,
          item_type: item.item_type || 'inventory',
          isCustom: item.item_type === 'custom' || !item.product_id,
          quantity: item.quantity || 1,
          unit_price: parseFloat(item.unit_price) || 0,
          profit_percent: parseFloat(item.profit_percent || item.discount_percent || 0),
          tax_percent: parseFloat(item.tax_percent) || 18,
          line_total: parseFloat(item.line_total) || 0
        })) || [];
        
        setItems(quotationItems);
      }
    } catch (error) {
      console.error('Failed to fetch quotation:', error);
      setError('Failed to load quotation data');
    } finally {
      setIsLoadingQuotation(false);
    }
  };

  const addItem = () => {
    const newItem: QuotationItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      product_id: '',
      description: '',
      category: '',
      serial_number: '',
      item_name: '',
      unit_of_measure: '',
      gst_percent: 0,
      item_type: 'inventory',
      quantity: 1,
      unit_price: 0,
      profit_percent: 0,
      tax_percent: 18,
      line_total: 0,
      isCustom: false,
      au_field: 'No'
    };
    setItems([...items, newItem]);
  };

  const addCustomItem = () => {
    const newCustomItem: QuotationItem = {
      id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      product_id: null,
      description: '',
      category: '',
      serial_number: '',
      item_name: '',
      unit_of_measure: '',
      gst_percent: 0,
      item_type: 'custom',
      isCustom: true,
      quantity: 1,
      unit_price: 0,
      profit_percent: 0,
      tax_percent: 18, // Default tax rate
      line_total: 0,
      au_field: 'No'
    };
    setItems([...items, newCustomItem]);
  };

  const updateItem = (id: string, field: keyof QuotationItem, value: string | number) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        
        // Recalculate line total for numeric fields
        if (field === 'quantity' || field === 'unit_price' || field === 'profit_percent' || field === 'tax_percent') {
          const quantity = Number(updatedItem.quantity);
          const unitPrice = Number(updatedItem.unit_price);
          const profitPercent = Number(updatedItem.profit_percent);
          const taxPercent = Number(updatedItem.tax_percent);
          
          const lineTotal = quantity * unitPrice;
          const profitAmount = lineTotal * (profitPercent / 100);
          const taxableAmount = lineTotal + profitAmount;
          const taxAmount = taxableAmount * (taxPercent / 100);
          
          updatedItem.line_total = taxableAmount + taxAmount;
        }
        return updatedItem;
      }
      return item;
    }));
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
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

  const removeExistingAttachment = (documentId: string) => {
    setAttachmentsToDelete(prev => [...prev, documentId]);
    setExistingAttachments(prev => prev.filter(doc => doc.id !== documentId));
  };

  const previewAttachment = (file: File) => {
    setPreviewFile(file);
    setPreviewExisting(null);
    
    // Create URL for preview
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else if (file.type === 'application/pdf') {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  const previewExistingAttachment = (doc: any) => {
    setPreviewExisting(doc);
    setPreviewFile(null);
    
    // Ensure file_url is properly formatted - check both file_url and file_path
    let fileUrl = doc.file_url || doc.file_path;
    if (fileUrl && !fileUrl.startsWith('http')) {
      // If it's a relative URL, make it absolute
      fileUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}${fileUrl.startsWith('/') ? '' : '/'}${fileUrl}`;
    }
    
    setPreviewUrl(fileUrl || null);
  };

  const closePreview = () => {
    if (previewUrl && previewFile) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewFile(null);
    setPreviewExisting(null);
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

  const downloadExistingAttachment = async (doc: any) => {
    try {
      if (doc.id) {
        // Use the API download endpoint for proper file download
        const blob = await apiClient.downloadDocument(doc.id);
        
        // Create a download link
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = doc.file_name || doc.original_name || 'document';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else if (doc.file_url || doc.file_path) {
        // Fallback to opening URL if no document ID
        let fileUrl = doc.file_url || doc.file_path;
        if (!fileUrl.startsWith('http')) {
          fileUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}${fileUrl.startsWith('/') ? '' : '/'}${fileUrl}`;
        }
        window.open(fileUrl, '_blank');
      } else {
        console.error('No download method available for document:', doc);
        alert('Unable to download file. No download URL or document ID available.');
      }
    } catch (error) {
      console.error('Failed to download file:', error);
      alert('Failed to download file. Please try again.');
    }
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

  const calculateTotals = () => {
    let subtotal = 0;
    let profitAmount = 0;
    let taxAmount = 0;

    items.forEach(item => {
      const lineTotal = item.quantity * item.unit_price;
      const profit = lineTotal * (item.profit_percent / 100);
      const taxableAmount = lineTotal + profit;
      const tax = taxableAmount * (item.tax_percent / 100);

      subtotal += lineTotal;
      profitAmount += profit;
      taxAmount += tax;
    });

    const total = subtotal + profitAmount + taxAmount;

    return {
      subtotal,
      profitAmount,
      taxAmount,
      total
    };
  };

  const handleSubmit = async () => {
    setError(null);
    setIsLoading(true);
    
    try {
      if (!formData.customer_id) {
        throw new Error('Please select a customer');
      }

      if (items.length === 0) {
        throw new Error('Please add at least one item');
      }

      // Validate all items have required fields
      const invalidItem = items.find(item => 
        !item.description.trim() || 
        item.quantity <= 0 || 
        item.unit_price < 0 ||
        isNaN(Number(item.quantity)) ||
        isNaN(Number(item.unit_price))
      );
      if (invalidItem) {
        throw new Error('Please fill in all item details correctly. Description is required, quantity must be greater than 0, and prices must be valid numbers.');
      }

      // Clean and prepare quotation data for API
      const cleanedData: any = {
        customer_id: formData.customer_id,
        quotation_date: formData.quotation_date,
        items: items.map(item => ({
          description: item.description.trim(),
          quantity: Number(item.quantity),
          unit_price: Number(item.unit_price),
          ...(item.product_id && { product_id: item.product_id }),
          ...(item.profit_percent > 0 && { profit_percent: Number(item.profit_percent) }),
          ...(item.tax_percent > 0 && { tax_percent: Number(item.tax_percent) }),
          // Custom item fields
          ...(item.category && { category: item.category.trim() }),
          ...(item.serial_number && { serial_number: item.serial_number.trim() }),
          ...(item.item_name && { item_name: item.item_name.trim() }),
          ...(item.unit_of_measure && { unit_of_measure: item.unit_of_measure.trim() }),
          ...(item.gst_percent !== undefined && item.gst_percent !== null && { gst_percent: Number(item.gst_percent) }),
          item_type: item.isCustom ? 'custom' : 'inventory'
        }))
      };

      // Only add optional fields if they have values
      if (formData.valid_until) {
        cleanedData.valid_until = formData.valid_until;
      }
      if (formData.terms_conditions.trim()) {
        cleanedData.terms_conditions = formData.terms_conditions.trim();
      }
      if (formData.notes.trim()) {
        cleanedData.notes = formData.notes.trim();
      }
      if (formData.reference_number?.trim()) {
        cleanedData.reference_number = formData.reference_number.trim();
      }

      const response = await apiClient.updateQuotation(quotationId, cleanedData);
      
      if (response.success) {
        // Delete attachments marked for deletion
        if (attachmentsToDelete.length > 0) {
          for (const docId of attachmentsToDelete) {
            try {
              await apiClient.deleteDocument(docId);
            } catch (deleteError) {
              console.error(`Failed to delete attachment ${docId}:`, deleteError);
            }
          }
        }

        // Upload new attachments
        if (attachments.length > 0) {
          setIsUploading(true);
          
          for (const file of attachments) {
            try {
              const uploadFormData = new FormData();
              uploadFormData.append('file', file);
              uploadFormData.append('reference_type', 'quotation');
              uploadFormData.append('reference_id', quotationId);
              uploadFormData.append('document_type', 'quotation_attachment');
              
              await apiClient.uploadDocument(uploadFormData);
            } catch (uploadError) {
              console.error(`Failed to upload ${file.name}:`, uploadError);
              alert(`Warning: Failed to upload ${file.name}. The quotation was updated successfully, but you may need to upload this file later.`);
            }
          }
          
          setIsUploading(false);
        }

        onQuotationUpdated?.();
        onClose();
      } else {
        throw new Error(response.message || 'Failed to update quotation');
      }
    } catch (err: any) {
      console.error('Failed to update quotation:', err);
      
      let errorMessage = 'Failed to update quotation';
      
      // Try to parse detailed error information
      if (err.message) {
        try {
          // If the error message is a JSON string with validation details
          const errorDetails = JSON.parse(err.message);
          if (Array.isArray(errorDetails)) {
            errorMessage = errorDetails.map(detail => `${detail.field}: ${detail.message}`).join(', ');
          } else {
            errorMessage = err.message;
          }
        } catch {
          // If it's not JSON, use the message as is
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      setIsUploading(false);
    }
  };

  const totals = calculateTotals();

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <>
      {/* Custom CSS for animations */}
      <style jsx>{`
        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.9) translateY(30px);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1) translateY(0);
          }
        }
        
        @keyframes backdropFadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        .modal-enter {
          animation: modalSlideIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        
        .modal-backdrop {
          animation: backdropFadeIn 0.3s ease-out forwards;
          backdrop-filter: blur(8px);
          background: rgba(0, 0, 0, 0.5);
          z-index: 9999;
        }
        
        .modal-widget {
          background: linear-gradient(145deg, #ffffff 0%, #f8fafc 100%);
          border: 1px solid rgba(148, 163, 184, 0.2);
          box-shadow: 
            0 25px 50px -12px rgba(0, 0, 0, 0.25),
            0 0 0 1px rgba(255, 255, 255, 0.5) inset;
          z-index: 10000;
        }
      `}</style>
      
      {/* Full screen backdrop that covers everything including sidebar */}
      <div 
        className="fixed inset-0 modal-backdrop" 
        style={{ 
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999
        }}
        onClick={onClose} 
      />
      
      {/* Centered modal widget - positioned relative to entire viewport */}
      <div 
        className="modal-enter"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          maxWidth: '95vw',
          maxHeight: '95vh',
          width: '1100px',
          zIndex: 10000
        }}
      >
        <div className="bg-white rounded-xl shadow-xl overflow-hidden border border-gray-200 modal-widget"
             style={{
               minHeight: '600px'
             }}>
          <div className="max-h-[90vh] overflow-y-auto" style={{ minHeight: '600px' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Edit Quotation</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-colors duration-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Loading State */}
            {isLoadingQuotation ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Loading quotation data...</span>
              </div>
            ) : (
              <>
                {/* Form */}
                <div className="p-6">
                  {/* Error Display */}
                  {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-red-600 text-sm">{error}</p>
                    </div>
                  )}

                  {/* Customer Selection with Search */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Customer *</label>
                      <div className="relative">
                        <select
                          value={formData.customer_id}
                          onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                          className="w-full px-4 py-3 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm"
                          required
                          disabled={isLoadingCustomers}
                        >
                          <option value="">
                            {isLoadingCustomers ? 'Loading customers...' : 'Select a customer'}
                          </option>
                          {customers.map((customer) => (
                            <option key={customer.id} value={customer.id}>
                              {customer.name} {customer.email && `(${customer.email})`}
                            </option>
                          ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Quotation Date *</label>
                      <input
                        type="date"
                        value={formData.quotation_date}
                        onChange={(e) => setFormData({ ...formData, quotation_date: e.target.value })}
                        className="w-full px-4 py-3 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                        required
                      />
                    </div>
                  </div>

                  {/* Reference Number and Valid Until */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Reference Number</label>
                      <input
                        type="text"
                        value={formData.reference_number}
                        onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                        className="w-full px-4 py-3 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                        placeholder="e.g., REF-2024-001"
                      />
                      <p className="text-sm text-gray-500 mt-1">Optional reference number for tracking</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Valid Until</label>
                      <input
                        type="date"
                        value={formData.valid_until}
                        onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                        className="w-full px-4 py-3 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                      />
                      <p className="text-sm text-gray-500 mt-1">Leave empty for default 30 days</p>
                    </div>
                  </div>

                  {/* Notes and Terms */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                      <textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        className="w-full px-4 py-3 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                        placeholder="Additional notes..."
                        rows={3}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Terms & Conditions</label>
                      <textarea
                        value={formData.terms_conditions}
                        onChange={(e) => setFormData({ ...formData, terms_conditions: e.target.value })}
                        className="w-full px-4 py-3 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                        placeholder="Terms and conditions..."
                        rows={3}
                      />
                    </div>
                  </div>

                  {/* Items Section */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">Quotation Items</h3>
                            <p className="text-sm text-gray-500">{items.length} item{items.length !== 1 ? 's' : ''} added</p>
                          </div>
                        </div>
                        
                        {/* View Mode Toggle - Moved to left */}
                        <div className="flex border border-gray-200 rounded-md overflow-hidden">
                          <button
                            onClick={() => setItemsViewMode('grid')}
                            className={`px-2 py-1 text-xs ${
                              itemsViewMode === 'grid'
                                ? 'bg-gray-100 text-gray-700'
                                : 'bg-white text-gray-500 hover:bg-gray-50'
                            }`}
                            title="Grid View"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setItemsViewMode('list')}
                            className={`px-2 py-1 text-xs ${
                              itemsViewMode === 'list'
                                ? 'bg-gray-100 text-gray-700'
                                : 'bg-white text-gray-500 hover:bg-gray-50'
                            }`}
                            title="List View"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      
                      {/* Simplified Button Groups */}
                      <div className="flex items-center space-x-1">
                        {/* Management Actions Group */}
                        <div className="flex border border-gray-200 rounded-md overflow-hidden mr-3">
                          <button 
                            onClick={() => setShowVendorRateModal(true)} 
                            className="px-3 py-1.5 text-xs text-purple-700 bg-purple-50 hover:bg-purple-100 border-r border-gray-200 flex items-center space-x-1.5"
                            disabled={items.length === 0}
                            title="Manage Rates"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H9a2 2 0 00-2 2v.01" />
                            </svg>
                            <span>Rates</span>
                          </button>
                          
                          <button 
                            onClick={() => setShowVendorCategoryModal(true)} 
                            className="px-3 py-1.5 text-xs text-indigo-700 bg-indigo-50 hover:bg-indigo-100 flex items-center space-x-1.5"
                            disabled={items.length === 0}
                            title="Category Setup"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 00-2 2v2a2 2 0 002 2m0 0h14m-14 0a2 2 0 002 2v2a2 2 0 01-2 2M5 9V7a2 2 0 012-2h10a2 2 0 012 2v2M7 7V5a2 2 0 012-2h6a2 2 0 012 2v2" />
                            </svg>
                            <span>Category</span>
                          </button>
                        </div>
                        
                        {/* Add Items Group */}
                        <div className="flex border border-gray-200 rounded-md overflow-hidden">
                          <button
                            onClick={addItem}
                            className="px-3 py-1.5 text-xs text-gray-700 bg-gray-50 hover:bg-gray-100 border-r border-gray-200 flex items-center space-x-1.5"
                            title="From Inventory"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                            <span>From Inventory</span>
                          </button>
                          
                          <button
                            onClick={addCustomItem}
                            className="px-3 py-1.5 text-xs text-blue-700 bg-blue-50 hover:bg-blue-100 flex items-center space-x-1.5"
                            title="Custom Item"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            <span>Custom Item</span>
                          </button>
                        </div>
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
                        <p className="text-gray-400 text-sm">Click "From Inventory" or "Custom Item" to get started</p>
                      </div>
                    ) : (
                      <>
                        {itemsViewMode === 'grid' ? (
                          /* Grid View */
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {items.map((item, index) => {
                              const selectedProduct = products.find(p => p.id === item.product_id);
                              const availableStock = selectedProduct?.stock || 0;
                              const isCustomItem = item.isCustom === true;
                              const isOverStock = !isCustomItem && item.product_id && item.quantity > availableStock;
                              
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
                                      onClick={() => removeItem(item.id)}
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
                                            value={item.description || ''}
                                            onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                                            className="w-full text-black p-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-gray-500 focus:border-gray-500"
                                            placeholder="Enter item description"
                                            rows={2}
                                          />
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-2">
                                          <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                                            <input
                                              type="text"
                                              value={item.category || ''}
                                              onChange={(e) => updateItem(item.id, 'category', e.target.value)}
                                              className="w-full text-black p-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-gray-500 focus:border-gray-500"
                                              placeholder="Category"
                                            />
                                          </div>
                                          <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Serial No</label>
                                            <input
                                              type="text"
                                              value={item.serial_number || ''}
                                              onChange={(e) => updateItem(item.id, 'serial_number', e.target.value)}
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
                                              value={item.item_name || ''}
                                              onChange={(e) => updateItem(item.id, 'item_name', e.target.value)}
                                              className="w-full text-black p-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-gray-500 focus:border-gray-500"
                                              placeholder="Item Name"
                                            />
                                          </div>
                                          <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">A/U</label>
                                            <select
                                              value={item.au_field || 'No'}
                                              onChange={(e) => updateItem(item.id, 'au_field', e.target.value)}
                                              className="w-full text-black p-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-gray-500 focus:border-gray-500"
                                            >
                                              <option value="No">No</option>
                                              <option value="Yes">Yes</option>
                                            </select>
                                          </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                          <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">UOM (Unit of Measure)</label>
                                            <input
                                              type="text"
                                              value={item.unit_of_measure || ''}
                                              onChange={(e) => updateItem(item.id, 'unit_of_measure', e.target.value)}
                                              className="w-full text-black p-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-gray-500 focus:border-gray-500"
                                              placeholder="e.g., pcs, kg, ltr, m, etc."
                                            />
                                          </div>
                                          <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">GST %</label>
                                            <input
                                              type="number"
                                              step="0.01"
                                              min="0"
                                              max="100"
                                              value={item.gst_percent || ''}
                                              onChange={(e) => updateItem(item.id, 'gst_percent', Number(e.target.value) || 0)}
                                              className="w-full text-black p-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-gray-500 focus:border-gray-500"
                                              placeholder="e.g., 18, 12, 5"
                                            />
                                          </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-2">
                                          <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Quantity</label>
                                            <input
                                              type="number"
                                              min="1"
                                              value={item.quantity}
                                              onChange={(e) => updateItem(item.id, 'quantity', Number(e.target.value))}
                                              className="w-full text-black p-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-gray-500 focus:border-gray-500"
                                              placeholder="Qty"
                                            />
                                          </div>
                                          <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Price</label>
                                            <input
                                              type="number"
                                              step="0.01"
                                              value={item.unit_price}
                                              onChange={(e) => updateItem(item.id, 'unit_price', Number(e.target.value))}
                                              className="w-full text-black p-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-gray-500 focus:border-gray-500"
                                              placeholder="Price"
                                            />
                                          </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-2">
                                          <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Profit %</label>
                                            <input
                                              type="number"
                                              step="0.1"
                                              min="0"
                                              max="100"
                                              value={item.profit_percent || ''}
                                              onChange={(e) => updateItem(item.id, 'profit_percent', Number(e.target.value) || 0)}
                                              className="w-full text-black p-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-gray-500 focus:border-gray-500"
                                              placeholder="0"
                                            />
                                          </div>
                                          <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Tax %</label>
                                            <input
                                              type="number"
                                              step="0.1"
                                              min="0"
                                              max="100"
                                              value={item.tax_percent || ''}
                                              onChange={(e) => updateItem(item.id, 'tax_percent', Number(e.target.value) || 0)}
                                              className="w-full text-black p-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-gray-500 focus:border-gray-500"
                                              placeholder="18"
                                            />
                                          </div>
                                        </div>
                                        
                                        <div className="bg-gray-50 p-2 border-t border-gray-200 rounded-lg">
                                          <p className="text-sm text-gray-900">
                                            <span className="font-medium">Total:</span> Rs. {item.line_total.toFixed(2)}
                                          </p>
                                        </div>
                                      </>
                                    ) : (
                                      <>
                                        {/* Inventory Item Fields */}
                                        <div>
                                          <label className="block text-xs font-medium text-gray-700 mb-1">Product</label>
                                          <select
                                            value={item.product_id || ''}
                                            onChange={(e) => {
                                              const product = products.find(p => p.id === e.target.value);
                                              updateItem(item.id, 'product_id', e.target.value);
                                              updateItem(item.id, 'unit_price', product?.price || 0);
                                            }}
                                            className="w-full text-black p-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-gray-500 focus:border-gray-500"
                                          >
                                            <option value="">Select product...</option>
                                            {products.map(p => (
                                              <option key={p.id} value={p.id}>{p.name} - Rs. {p.price} (Stock: {p.stock})</option>
                                            ))}
                                          </select>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-2">
                                          <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">UOM (Unit of Measure)</label>
                                            <input
                                              type="text"
                                              value={item.unit_of_measure || ''}
                                              onChange={(e) => updateItem(item.id, 'unit_of_measure', e.target.value)}
                                              className="w-full text-black p-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-gray-500 focus:border-gray-500"
                                              placeholder="e.g., pcs, kg, ltr, m, etc."
                                            />
                                          </div>
                                          <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">GST %</label>
                                            <input
                                              type="number"
                                              step="0.01"
                                              min="0"
                                              max="100"
                                              value={item.gst_percent || ''}
                                              onChange={(e) => updateItem(item.id, 'gst_percent', Number(e.target.value) || 0)}
                                              className="w-full text-black p-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-gray-500 focus:border-gray-500"
                                              placeholder="e.g., 18, 12, 5"
                                            />
                                          </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-2">
                                          <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Quantity</label>
                                            <input
                                              type="number"
                                              min="1"
                                              value={item.quantity}
                                              onChange={(e) => updateItem(item.id, 'quantity', Number(e.target.value))}
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
                                              value={item.unit_price}
                                              onChange={(e) => updateItem(item.id, 'unit_price', Number(e.target.value))}
                                              className="w-full text-black p-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-gray-500 focus:border-gray-500"
                                              placeholder="Price"
                                            />
                                          </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-2">
                                          <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Profit %</label>
                                            <input
                                              type="number"
                                              step="0.1"
                                              min="0"
                                              max="100"
                                              value={item.profit_percent || ''}
                                              onChange={(e) => updateItem(item.id, 'profit_percent', Number(e.target.value) || 0)}
                                              className="w-full text-black p-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-gray-500 focus:border-gray-500"
                                              placeholder="0"
                                            />
                                          </div>
                                          <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Tax %</label>
                                            <input
                                              type="number"
                                              step="0.1"
                                              min="0"
                                              max="100"
                                              value={item.tax_percent || ''}
                                              onChange={(e) => updateItem(item.id, 'tax_percent', Number(e.target.value) || 0)}
                                              className="w-full text-black p-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-gray-500 focus:border-gray-500"
                                              placeholder="18"
                                            />
                                          </div>
                                        </div>
                                        
                                        {item.product_id && (
                                          <>
                                            <div className="text-sm text-gray-500">
                                              Available stock: {availableStock}
                                            </div>
                                            <div className="bg-gray-50 p-2 border-t border-gray-200 rounded-lg">
                                              <div className="flex justify-between items-center">
                                                <p className="text-sm text-gray-900">
                                                  <span className="font-medium">Total:</span> Rs. {item.line_total.toFixed(2)}
                                                </p>
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
                                              </div>
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
                          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                            {itemsViewMode === 'list' ? (
                              <div className="grid grid-cols-12 gap-3 items-center p-4 bg-gray-50 border-b border-gray-200 font-medium text-sm text-gray-700">
                                <div className="col-span-3">Description</div>
                                <div className="col-span-1">Type</div>
                                <div className="col-span-2">Quantity</div>
                                <div className="col-span-2">Unit Price</div>
                                <div className="col-span-1">Profit %</div>
                                <div className="col-span-1">Tax %</div>
                                <div className="col-span-1">Total</div>
                                <div className="col-span-1">Action</div>
                              </div>
                            ) : null}
                            
                            <div className="divide-y divide-gray-200">
                              {items.map((item, index) => {
                                const selectedProduct = products.find(p => p.id === item.product_id);
                                const availableStock = selectedProduct?.stock || 0;
                                const isCustomItem = item.isCustom === true;
                                const isOverStock = !isCustomItem && item.product_id && item.quantity > availableStock;
                                
                                return (
                                  <div key={item.id} className="grid grid-cols-12 gap-3 items-center p-4 hover:bg-gray-50 transition-colors duration-150">
                                    <div className="col-span-3">
                                      {isCustomItem ? (
                                        <input
                                          type="text"
                                          value={item.description || ''}
                                          onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                                          className="w-full px-3 py-2 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                          placeholder="Item description"
                                        />
                                      ) : (
                                        <select
                                          value={item.product_id || ''}
                                          onChange={(e) => {
                                            const product = products.find(p => p.id === e.target.value);
                                            updateItem(item.id, 'product_id', e.target.value);
                                            updateItem(item.id, 'unit_price', product?.price || 0);
                                          }}
                                          className="w-full px-3 py-2 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                        >
                                          <option value="">Select product...</option>
                                          {products.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                          ))}
                                        </select>
                                      )}
                                    </div>
                                    <div className="col-span-1">
                                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                                        isCustomItem 
                                          ? 'bg-blue-100 text-blue-800' 
                                          : 'bg-green-100 text-green-800'
                                      }`}>
                                        {isCustomItem ? 'Custom' : 'Inventory'}
                                      </span>
                                    </div>
                                    <div className="col-span-2">
                                      <input
                                        type="number"
                                        value={item.quantity}
                                        onChange={(e) => updateItem(item.id, 'quantity', Number(e.target.value))}
                                        className={`w-full px-3 py-2 text-black border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${isOverStock ? 'border-red-500' : 'border-gray-300'}`}
                                        placeholder="Qty"
                                        min="1"
                                      />
                                      {isOverStock && <p className="text-red-500 text-xs mt-1">Insufficient stock</p>}
                                    </div>
                                    <div className="col-span-2">
                                      <input
                                        type="number"
                                        value={item.unit_price === 0 ? '' : item.unit_price}
                                        onChange={(e) => updateItem(item.id, 'unit_price', Number(e.target.value) || 0)}
                                        className="w-full px-3 py-2 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                        placeholder="Unit Price"
                                        min="0"
                                        step="0.01"
                                      />
                                    </div>
                                    <div className="col-span-1">
                                      <input
                                        type="number"
                                        value={item.profit_percent === 0 ? '' : item.profit_percent}
                                        onChange={(e) => updateItem(item.id, 'profit_percent', Number(e.target.value) || 0)}
                                        className="w-full px-3 py-2 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                        placeholder="0"
                                        min="0"
                                        max="100"
                                        step="0.1"
                                      />
                                    </div>
                                    <div className="col-span-1">
                                      <input
                                        type="number"
                                        value={item.tax_percent === 0 ? '' : item.tax_percent}
                                        onChange={(e) => updateItem(item.id, 'tax_percent', Number(e.target.value) || 0)}
                                        className="w-full px-3 py-2 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                        placeholder="18"
                                        min="0"
                                        max="100"
                                        step="0.1"
                                      />
                                    </div>
                                    <div className="col-span-1">
                                      <div className="px-3 py-2 text-black bg-gray-100 border border-gray-200 rounded-lg text-sm font-medium">
                                        Rs. {item.line_total.toFixed(2)}
                                      </div>
                                    </div>
                                    <div className="col-span-1">
                                      <div className="flex items-center space-x-1">
                                        <button
                                          onClick={() => {
                                            setSelectedItemIndex(index);
                                            setShowVendorRateModal(true);
                                          }}
                                          className="text-purple-600 hover:text-purple-800 transition-colors duration-200 p-1 rounded-lg hover:bg-purple-50"
                                          title="Manage vendor rates"
                                        >
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H9a2 2 0 00-2 2v.01" />
                                          </svg>
                                        </button>
                                        <button
                                          onClick={() => removeItem(item.id)}
                                          className="text-red-600 hover:text-red-800 transition-colors duration-200 p-1 rounded-lg hover:bg-red-50"
                                          title="Remove item"
                                        >
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                          </svg>
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Totals */}
                  {items.length > 0 && (
                    <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm text-gray-800 font-medium">
                            <span>Subtotal:</span>
                            <span>Rs. {totals.subtotal.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-sm text-gray-800 font-medium">
                            <span>Profit:</span>
                            <span>+Rs. {totals.profitAmount.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-sm text-gray-800 font-medium">
                            <span>Tax:</span>
                            <span>Rs. {totals.taxAmount.toFixed(2)}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-gray-900">
                            Total: Rs. {totals.total.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Attachments Section */}
                  <div className="mb-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Attachments</h3>
                        <p className="text-sm text-gray-500">
                          {existingAttachments.length} existing, {attachments.length} new
                        </p>
                      </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      {/* Existing Attachments */}
                      {existingAttachments.length > 0 && (
                        <div className="mb-6">
                          <h4 className="text-base font-medium text-gray-900 mb-3">
                            Existing Files ({existingAttachments.length})
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {existingAttachments.map((doc) => (
                              <div
                                key={doc.id}
                                className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200"
                              >
                                <div className="flex items-center space-x-3 flex-1 min-w-0">
                                  <div className="flex-shrink-0">
                                    {(doc.file_type?.startsWith('image/') || getFileTypeFromName(doc.file_name || '').startsWith('image/')) ? (
                                      <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                      </svg>
                                    ) : (doc.file_type === 'application/pdf' || getFileTypeFromName(doc.file_name || '') === 'application/pdf') ? (
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
                                      {doc.file_name || 'Document'}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {doc.file_size ? formatFileSize(doc.file_size) : 'Size unknown'}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-1">
                                  {/* View Button */}
                                  <button
                                    onClick={() => {
                                      console.log('Previewing document:', doc);
                                      previewExistingAttachment(doc);
                                    }}
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
                                    onClick={() => downloadExistingAttachment(doc)}
                                    className="flex-shrink-0 p-1 text-green-500 hover:text-green-700 hover:bg-green-50 rounded transition-colors"
                                    title="Download file"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                  </button>
                                  
                                  {/* Remove Button */}
                                  <button
                                    onClick={() => removeExistingAttachment(doc.id)}
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

                      {/* File Upload Area */}
                      <div>
                        <h4 className="text-base font-medium text-gray-900 mb-3">Add New Files</h4>
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

                        {/* Choose Files Button */}
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
                      </div>

                      {/* New Uploaded Files List */}
                      {attachments.length > 0 && (
                        <div className="mt-6">
                          <h4 className="text-base font-medium text-gray-900 mb-3">
                            New Files to Upload ({attachments.length})
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {attachments.map((file, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200"
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
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end space-x-3 px-6 py-4 border-t border-gray-200">
                  <button
                    onClick={onClose}
                    disabled={isLoading || isUploading}
                    className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={isLoading || isUploading || !formData.customer_id || items.length === 0}
                    className="px-4 py-2 text-white bg-gray-800 rounded-lg hover:bg-gray-900 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {isLoading || isUploading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>{isLoading ? 'Updating...' : 'Uploading Files...'}</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Update Quotation</span>
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );

  // File Preview Modal
  const filePreviewModal = (previewFile || previewExisting) && (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10001] p-4">
      <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 truncate">
            {previewFile ? previewFile.name : (previewExisting?.file_name || 'Document')}
          </h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => previewFile ? downloadAttachment(previewFile) : downloadExistingAttachment(previewExisting)}
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
          {previewFile && previewFile.type.startsWith('image/') && previewUrl ? (
            <div className="flex justify-center">
              <img
                src={previewUrl}
                alt={previewFile.name}
                className="max-w-full max-h-full object-contain rounded"
                onError={(e) => {
                  console.error('Failed to load image:', previewUrl);
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          ) : (previewFile && previewFile.type === 'application/pdf' && previewUrl) || (previewExisting && ((previewExisting.file_type === 'application/pdf') || (getFileTypeFromName(previewExisting.file_name || '') === 'application/pdf') || previewExisting.file_name?.toLowerCase().endsWith('.pdf')) && previewUrl) ? (
            <iframe
              src={previewUrl}
              className="w-full h-[600px] border-0 rounded"
              title={previewFile ? previewFile.name : (previewExisting?.file_name || 'Document')}
              onError={(e) => {
                console.error('Failed to load PDF:', previewUrl);
              }}
            />
          ) : (previewExisting && ((previewExisting.file_type?.startsWith('image/')) || (getFileTypeFromName(previewExisting.file_name || '').startsWith('image/')) || previewExisting.file_name?.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i)) && previewUrl) ? (
            <div className="flex justify-center">
              <img
                src={previewUrl}
                alt={previewExisting.file_name || 'Image'}
                className="max-w-full max-h-full object-contain rounded"
                onError={(e) => {
                  console.error('Failed to load existing image:', previewUrl);
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          ) : previewFile && previewFile.type.startsWith('text/') ? (
            <div className="bg-gray-50 p-4 rounded">
              <p className="text-sm text-gray-600 mb-2">Text File Preview:</p>
              <div className="bg-white p-4 rounded border max-h-96 overflow-auto">
                <pre className="text-sm whitespace-pre-wrap">
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
              <h4 className="text-lg font-medium text-gray-900 mb-2">
                {previewFile ? previewFile.name : (previewExisting?.file_name || 'Document')}
              </h4>
              <p className="text-gray-500 mb-4">
                File type: {previewFile ? (previewFile.type || 'Unknown') : (previewExisting?.file_type || previewExisting?.mime_type || getFileTypeFromName(previewExisting?.file_name || '') || 'Unknown')}
              </p>
              <p className="text-gray-500 mb-4">
                Size: {previewFile ? formatFileSize(previewFile.size) : (previewExisting?.file_size ? formatFileSize(previewExisting.file_size) : 'Unknown')}
              </p>
              <p className="text-gray-600">Preview not available for this file type.</p>
              {previewUrl && (
                <p className="text-xs text-gray-400 mb-2">Debug URL: {previewUrl}</p>
              )}
              <button
                onClick={() => previewFile ? downloadAttachment(previewFile) : downloadExistingAttachment(previewExisting)}
                className="mt-4 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                Download File
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

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
      <VendorCategoryManager
        quotationId={quotationId}
        items={items}
        vendors={vendors}
        onCategoryVendorsUpdate={setCategoryVendors}
        showModal={showVendorCategoryModal}
        setShowModal={setShowVendorCategoryModal}
      />
    </>,
    document.body
  );
}
