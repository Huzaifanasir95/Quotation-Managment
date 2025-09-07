'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { apiClient, Customer } from '../../lib/api';

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
        <div className="bg-gradient-to-r from-slate-50 to-gray-50 px-8 py-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Create New Quotation</h2>
              <p className="text-gray-600 mt-1">Step {currentTabIndex + 1} of {tabs.length}</p>
            </div>
            <button 
              onClick={handleClose} 
              className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-colors duration-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Progress</span>
              <span className="text-sm font-medium text-gray-700">{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
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
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                  <svg className="w-6 h-6 mr-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Customer Information
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Customer *</label>
                    <select
                      value={formData.customerId}
                      onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                      className="w-full text-black p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
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
                      className="w-full text-black p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="Valid until"
                    />
                    <p className="text-sm text-gray-500 mt-1">If not specified, default is 30 days from today</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'items' && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                    <svg className="w-6 h-6 mr-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    Quotation Items
                  </h3>
                  <button 
                    onClick={addItem} 
                    className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg flex items-center"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add Item
                  </button>
                </div>
                
                {items.length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    <p className="text-gray-500 text-lg">No items added yet</p>
                    <p className="text-gray-400 text-sm">Click "Add Item" to get started</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {items.map((item, index) => (
                      <div key={item.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-colors duration-200">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-gray-900">Item #{index + 1}</h4>
                          <button
                            onClick={() => removeItem(index)}
                            className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors duration-200"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
                            <select
                              value={item.productId}
                              onChange={(e) => {
                                const product = products.find(p => p.id === e.target.value);
                                const newItems = [...items];
                                newItems[index] = { ...item, productId: e.target.value, unitPrice: product?.price || 0 };
                                setItems(newItems);
                              }}
                              className="w-full text-black p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                              className="w-full text-black p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Quantity"
                            />
                          </div>
                        </div>
                        {item.productId && (
                          <div className="mt-3 p-3 bg-blue-50 rounded-md">
                            <p className="text-sm text-blue-800">
                              <span className="font-medium">Subtotal:</span> ${(item.quantity * item.unitPrice).toFixed(2)}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                    
                    <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg border border-green-200">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-semibold text-gray-900">Total Amount:</span>
                        <span className="text-2xl font-bold text-green-600">
                          ${items.reduce((total, item) => total + (item.quantity * item.unitPrice), 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'terms' && (
            <div className="max-w-2xl mx-auto">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                  <svg className="w-6 h-6 mr-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Terms & Conditions
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Terms & Conditions</label>
                    <div className="relative">
                      <textarea
                        value={formData.termsConditions}
                        readOnly
                        className="w-full px-4 py-2 text-black border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed"
                        rows={8}
                      />
                      {isLoadingTerms && (
                        <div className="absolute inset-0 bg-gray-50 bg-opacity-75 flex items-center justify-center rounded-lg">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      <svg className="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      Terms are managed in Settings and cannot be edited here
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'attachments' && (
            <div className="max-w-2xl mx-auto">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                  <svg className="w-6 h-6 mr-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  File Attachments
                </h3>
                <div className="text-center py-12">
                  <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-gray-500 text-lg">File Upload</p>
                  <p className="text-gray-400 text-sm">Drag and drop files or click to upload attachments</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'preview' && (
            <div className="max-w-3xl mx-auto">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                  <svg className="w-6 h-6 mr-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Review & Create Quotation
                </h3>
                
                {/* Summary */}
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Customer</h4>
                    <p className="text-gray-600">
                      {customers.find(c => c.id === formData.customerId)?.name || 'No customer selected'}
                    </p>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Items ({items.length})</h4>
                    {items.length > 0 ? (
                      <div className="space-y-2">
                        {items.map((item, index) => (
                          <div key={item.id} className="flex justify-between text-sm">
                            <span>{products.find(p => p.id === item.productId)?.name} x {item.quantity}</span>
                            <span>${(item.quantity * item.unitPrice).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-600">No items added</p>
                    )}
                  </div>
                  
                  <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg border-2 border-green-200">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold text-gray-900">Total:</span>
                      <span className="text-2xl font-bold text-green-600">
                        ${items.reduce((total, item) => total + (item.quantity * item.unitPrice), 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-white border-t border-gray-200 px-8 py-6 flex-shrink-0">
          <div className="flex justify-between items-center">
            <button
              onClick={() => {
                const currentIndex = tabs.findIndex(t => t.id === activeTab);
                if (currentIndex > 0) {
                  setActiveTab(tabs[currentIndex - 1].id as TabType);
                }
              }}
              disabled={activeTab === 'customer'}
              className="px-6 py-2 text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Previous
            </button>

            <div className="flex space-x-3">
              <button 
                onClick={handleClose} 
                className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
              >
                Cancel
              </button>
              {activeTab === 'preview' ? (
                <button
                  onClick={handleSubmit}
                  disabled={isLoading || !formData.customerId || items.length === 0}
                  className="px-8 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg flex items-center"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating...
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
              ) : (
                <button
                  onClick={() => {
                    const currentIndex = tabs.findIndex(t => t.id === activeTab);
                    if (currentIndex < tabs.length - 1) {
                      setActiveTab(tabs[currentIndex + 1].id as TabType);
                    }
                  }}
                  className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg flex items-center"
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
      </div>
    </div>
  );

  // Render modal using portal to document.body for proper screen centering
  return createPortal(modalContent, document.body);
}
