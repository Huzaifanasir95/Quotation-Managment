'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { apiClient, Customer } from '../../lib/api';
import { generateQuotationPDF } from '../../../lib/pdfUtils';

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
    customerId: '',
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
      customerId: '',
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

  // Load customers and products when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchCustomers();
      fetchTermsAndConditions();
      loadProducts();
    }
  }, [isOpen]);

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
          name: `${product.name} - $${product.selling_price || product.price || 0}`,
          price: parseFloat(product.selling_price || product.price || 0),
          description: product.description || '',
          sku: product.sku || ''
        })) || [];
        setProducts(transformedProducts);
      } else {
        console.error('Failed to load products:', response);
        // Fallback to mock data if API fails
        setProducts([
          { id: '1', name: 'Laptop Dell XPS 13 - $1200', price: 1200 },
          { id: '2', name: 'Monitor 27" 4K - $800', price: 800 },
          { id: '3', name: 'Wireless Mouse - $50', price: 50 },
          { id: '4', name: 'USB-C Hub - $45', price: 45 }
        ]);
      }
    } catch (error) {
      console.error('Failed to load products:', error);
      // Fallback to mock data if API call fails
      setProducts([
        { id: '1', name: 'Laptop Dell XPS 13 - $1200', price: 1200 },
        { id: '2', name: 'Monitor 27" 4K - $800', price: 800 },
        { id: '3', name: 'Wireless Mouse - $50', price: 50 },
        { id: '4', name: 'USB-C Hub - $45', price: 45 }
      ]);
    }
  };

  const addItem = () => {
    setItems([...items, { id: Date.now(), productId: '', quantity: 1, unitPrice: 0 }]);
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
    console.log('Handling files:', files);
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

    console.log('Valid files:', validFiles);
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
    console.log('File input changed:', e.target.files);
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
    if (!formData.customerId) {
      alert('Please select a customer to generate PDF');
      return;
    }
    
    if (items.length === 0) {
      alert('Please add at least one item to generate PDF');
      return;
    }

    setIsGeneratingPDF(true);
    
    try {
      // Find the selected customer
      const selectedCustomer = customers.find(c => c.id === formData.customerId);
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
            description: product?.name?.replace(/\s-\s\$[\d,.]+$/, '') || 'Unknown Product',
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

  const handleSubmit = async () => {
    if (!formData.customerId) {
      alert('Please select a customer');
      return;
    }
    
    if (items.length === 0) {
      alert('Please add at least one item');
      return;
    }

    setIsLoading(true);
    
    try {
      const quotationData = {
        customer_id: formData.customerId,
        quotation_date: new Date().toISOString().split('T')[0],
        valid_until: formData.validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
        notes: formData.notes,
        terms_conditions: formData.termsConditions,
        items: items.map(item => ({
          description: products.find(p => p.id === item.productId)?.name || 'Unknown Product',
          quantity: item.quantity,
          unit_price: item.unitPrice
        }))
      };

      const response = await apiClient.createQuotation(quotationData);
      
      if (response.success) {
        const quotationId = response.data.quotation.id;
        
        // Upload attachments if any
        if (attachments.length > 0) {
          setIsUploading(true);
          
          for (const file of attachments) {
            try {
              const formData = new FormData();
              formData.append('file', file);
              formData.append('reference_type', 'quotation');
              formData.append('reference_id', quotationId);
              formData.append('document_type', 'quotation_attachment');
              
              const uploadResponse = await apiClient.uploadDocument(formData);
              console.log('File uploaded successfully:', uploadResponse);
            } catch (uploadError) {
              console.error(`Failed to upload ${file.name}:`, uploadError);
              // Continue with other files even if one fails
              alert(`Warning: Failed to upload ${file.name}. The quotation was created successfully, but you may need to upload this file later.`);
            }
          }
          
          setIsUploading(false);
        }
        
        alert('Quotation created successfully!');
        
        // Call callback to refresh quotation list
        if (onQuotationCreated) {
          onQuotationCreated();
        }
        
        // Close modal and reset state
        handleClose();
      } else {
        throw new Error(response.message || 'Failed to create quotation');
      }
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
                        <label className="block text-sm font-medium text-gray-700 mb-2">Select Customer *</label>
                        <select
                          value={formData.customerId}
                          onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                          className="w-full text-black p-3 border border-gray-300 rounded-lg focus:ring-1 focus:ring-gray-500 focus:border-gray-500"
                        >
                          <option value="">Choose a customer...</option>
                          {customers.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
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
                    </div>
                  </div>
                </div>
                
                {/* Customer Preview Card - Takes 1 column */}
                <div className="lg:col-span-1">
                  {formData.customerId ? (
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h4 className="text-sm font-medium text-gray-900 mb-4">Customer Preview</h4>
                      {(() => {
                        const selectedCustomer = customers.find(c => c.id === formData.customerId);
                        return selectedCustomer ? (
                          <div className="space-y-3">
                            <div>
                              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Name</span>
                              <p className="text-sm text-gray-900 mt-1">{selectedCustomer.name}</p>
                            </div>
                            {selectedCustomer.email && (
                              <div>
                                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email</span>
                                <p className="text-sm text-gray-900 mt-1">{selectedCustomer.email}</p>
                              </div>
                            )}
                            {selectedCustomer.phone && (
                              <div>
                                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Phone</span>
                                <p className="text-sm text-gray-900 mt-1">{selectedCustomer.phone}</p>
                              </div>
                            )}
                            {selectedCustomer.address && (
                              <div>
                                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Address</span>
                                <p className="text-sm text-gray-900 mt-1">{selectedCustomer.address}</p>
                              </div>
                            )}
                          </div>
                        ) : null;
                      })()}
                    </div>
                  ) : (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                      <div className="text-center">
                        <div className="text-gray-400 mb-3">
                          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <p className="text-sm text-gray-500">Select a customer to see their details</p>
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
                    className="bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-900"
                  >
                    Add Item
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
                      {items.map((item, index) => (
                        <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium text-gray-900">Item #{index + 1}</h4>
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
                                  <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                              </select>
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
                            
                            {item.productId && (
                              <div className="bg-gray-50 p-2 border-t border-gray-200 rounded-lg">
                                <p className="text-sm text-gray-900">
                                  <span className="font-medium">Total:</span> ${(item.quantity * item.unitPrice).toFixed(2)}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* List View */
                    <div className="space-y-4">
                      {items.map((item, index) => (
                        <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium text-gray-900">Item #{index + 1}</h4>
                            <button
                              onClick={() => removeItem(index)}
                              className="text-red-500 hover:text-red-700 p-1 rounded"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
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
                                  <option key={p.id} value={p.id}>{p.name} - ${p.price}</option>
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
                          {item.productId && (
                            <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                              <p className="text-sm text-gray-900">
                                <span className="font-medium">Subtotal:</span> ${(item.quantity * item.unitPrice).toFixed(2)}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Total Summary */}
                  <div className="mt-6 bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-medium text-gray-900">Total Amount:</span>
                      <span className="text-xl font-bold text-gray-900">
                        ${items.reduce((total, item) => total + (item.quantity * item.unitPrice), 0).toFixed(2)}
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
                    console.log('Upload area clicked');
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
                      console.log('Choose Files button clicked');
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
                    disabled={isGeneratingPDF || !formData.customerId || items.length === 0}
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
                        {customers.find(c => c.id === formData.customerId)?.name || 'No customer selected'}
                      </p>
                      {formData.customerId && (
                        <div className="mt-2 text-sm text-gray-500">
                          {customers.find(c => c.id === formData.customerId)?.email && (
                            <p>📧 {customers.find(c => c.id === formData.customerId)?.email}</p>
                          )}
                          {customers.find(c => c.id === formData.customerId)?.phone && (
                            <p>📞 {customers.find(c => c.id === formData.customerId)?.phone}</p>
                          )}
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
                          {items.map((item, index) => (
                            <div key={item.id} className="flex justify-between items-center text-sm bg-gray-50 p-2 rounded">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 truncate">
                                  {products.find(p => p.id === item.productId)?.name || 'Product'}
                                </p>
                                <p className="text-gray-500">Qty: {item.quantity} × ${item.unitPrice}</p>
                              </div>
                              <span className="font-medium text-gray-900">${(item.quantity * item.unitPrice).toFixed(2)}</span>
                            </div>
                          ))}
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
                          ${items.reduce((total, item) => total + (item.quantity * item.unitPrice), 0).toFixed(2)}
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
                    disabled={isGeneratingPDF || !formData.customerId || items.length === 0}
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
                    disabled={isLoading || isUploading || !formData.customerId || items.length === 0}
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
