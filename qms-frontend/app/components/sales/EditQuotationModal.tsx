'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { apiClient } from '../../lib/api';

interface EditQuotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotationId: string;
  onQuotationUpdated?: () => void;
}

interface QuotationItem {
  id: string;
  product_id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  tax_percent: number;
  line_total: number;
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
    notes: ''
  });
  const [items, setItems] = useState<QuotationItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const [isLoadingQuotation, setIsLoadingQuotation] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    }
  }, [isOpen, quotationId]);

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
          notes: quotation.notes || ''
        });

        // Set items
        const quotationItems = quotation.quotation_items?.map((item: any) => ({
          id: item.id.toString(),
          product_id: item.product_id || '',
          description: item.description || '',
          quantity: item.quantity || 1,
          unit_price: parseFloat(item.unit_price) || 0,
          discount_percent: parseFloat(item.discount_percent) || 0,
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
      description: '',
      quantity: 1,
      unit_price: 0,
      discount_percent: 0,
      tax_percent: 18, // Default tax rate
      line_total: 0
    };
    setItems([...items, newItem]);
  };

  const updateItem = (id: string, field: keyof QuotationItem, value: string | number) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        
        // Recalculate line total for numeric fields
        if (field === 'quantity' || field === 'unit_price' || field === 'discount_percent' || field === 'tax_percent') {
          const quantity = Number(updatedItem.quantity);
          const unitPrice = Number(updatedItem.unit_price);
          const discountPercent = Number(updatedItem.discount_percent);
          const taxPercent = Number(updatedItem.tax_percent);
          
          const lineTotal = quantity * unitPrice;
          const discountAmount = lineTotal * (discountPercent / 100);
          const taxableAmount = lineTotal - discountAmount;
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

  const calculateTotals = () => {
    let subtotal = 0;
    let discountAmount = 0;
    let taxAmount = 0;

    items.forEach(item => {
      const lineTotal = item.quantity * item.unit_price;
      const discount = lineTotal * (item.discount_percent / 100);
      const taxableAmount = lineTotal - discount;
      const tax = taxableAmount * (item.tax_percent / 100);

      subtotal += lineTotal;
      discountAmount += discount;
      taxAmount += tax;
    });

    const total = subtotal - discountAmount + taxAmount;

    return {
      subtotal,
      discountAmount,
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
          ...(item.discount_percent > 0 && { discount_percent: Number(item.discount_percent) }),
          ...(item.tax_percent > 0 && { tax_percent: Number(item.tax_percent) })
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

      const response = await apiClient.updateQuotation(quotationId, cleanedData);
      
      if (response.success) {
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
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100 modal-widget"
             style={{
               boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 10px 25px -5px rgba(59, 130, 246, 0.15)',
               minHeight: '600px'
             }}>
          <div className="max-h-[90vh] overflow-y-auto" style={{ minHeight: '600px' }}>
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-gray-800 to-gray-900">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Edit Quotation</h2>
                  <p className="text-white/70 text-sm">Update quotation details and items</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-white/80 hover:text-white transition-colors duration-200 p-2 rounded-full hover:bg-white/20"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

                  {/* Valid Until and Additional Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
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
                  </div>

                  {/* Terms & Conditions */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Terms & Conditions</label>
                    <textarea
                      value={formData.terms_conditions}
                      onChange={(e) => setFormData({ ...formData, terms_conditions: e.target.value })}
                      className="w-full px-4 py-3 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                      placeholder="Payment terms, delivery conditions..."
                      rows={4}
                    />
                  </div>

                  {/* Items Section */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-6">
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
                      <button
                        onClick={addItem}
                        className="bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-900 transition-colors duration-200 flex items-center space-x-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span>Add Item</span>
                      </button>
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
                      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                        {/* Header Row */}
                        <div className="grid grid-cols-12 gap-3 items-center p-4 bg-gray-50 border-b border-gray-200 font-medium text-sm text-gray-700">
                          <div className="col-span-4">Description</div>
                          <div className="col-span-2">Quantity</div>
                          <div className="col-span-2">Unit Price</div>
                          <div className="col-span-1">Discount %</div>
                          <div className="col-span-1">Tax %</div>
                          <div className="col-span-1">Total</div>
                          <div className="col-span-1">Action</div>
                        </div>
                        
                        {/* Items */}
                        <div className="divide-y divide-gray-200">
                          {items.map((item, index) => (
                            <div key={item.id} className="grid grid-cols-12 gap-3 items-center p-4 hover:bg-gray-50 transition-colors duration-150">
                              <div className="col-span-4">
                                <input
                                  type="text"
                                  value={item.description}
                                  onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                                  className="w-full px-3 py-2 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                  placeholder="Item description"
                                />
                              </div>
                              <div className="col-span-2">
                                <input
                                  type="number"
                                  value={item.quantity}
                                  onChange={(e) => {
                                    const value = e.target.value === '' ? 1 : parseInt(e.target.value) || 1;
                                    updateItem(item.id, 'quantity', value);
                                  }}
                                  className="w-full px-3 py-2 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                  placeholder="Qty"
                                  min="1"
                                />
                              </div>
                              <div className="col-span-2">
                                <input
                                  type="number"
                                  value={item.unit_price === 0 ? '' : item.unit_price}
                                  onChange={(e) => {
                                    const value = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
                                    updateItem(item.id, 'unit_price', value);
                                  }}
                                  onFocus={(e) => {
                                    if (e.target.value === '0') {
                                      e.target.select();
                                    }
                                  }}
                                  className="w-full px-3 py-2 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                  placeholder="Unit Price"
                                  min="0"
                                  step="0.01"
                                />
                              </div>
                              <div className="col-span-1">
                                <input
                                  type="number"
                                  value={item.discount_percent === 0 ? '' : item.discount_percent}
                                  onChange={(e) => {
                                    const value = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
                                    updateItem(item.id, 'discount_percent', value);
                                  }}
                                  onFocus={(e) => {
                                    if (e.target.value === '0') {
                                      e.target.select();
                                    }
                                  }}
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
                                  onChange={(e) => {
                                    const value = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
                                    updateItem(item.id, 'tax_percent', value);
                                  }}
                                  onFocus={(e) => {
                                    if (e.target.value === '0') {
                                      e.target.select();
                                    }
                                  }}
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
                                <button
                                  onClick={() => removeItem(item.id)}
                                  className="text-red-600 hover:text-red-800 transition-colors duration-200 p-2 rounded-lg hover:bg-red-50"
                                  title="Remove item"
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

                  {/* Totals */}
                  {items.length > 0 && (
                    <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Subtotal:</span>
                            <span>Rs. {totals.subtotal.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Discount:</span>
                            <span>-Rs. {totals.discountAmount.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
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
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
                  <div className="text-sm text-gray-500">
                    {items.length > 0 && (
                      <span>{items.length} item{items.length !== 1 ? 's' : ''} • Total: Rs. {totals.total.toFixed(2)}</span>
                    )}
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={onClose}
                      disabled={isLoading}
                      className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={isLoading || !formData.customer_id || items.length === 0}
                      className="px-6 py-2 text-white bg-gray-800 rounded-lg hover:bg-gray-900 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                      {isLoading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Updating...</span>
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
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );

  // Render modal using portal to document.body for full screen overlay
  return createPortal(modalContent, document.body);
}
