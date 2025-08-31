'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '../../lib/api';

interface NewQuotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onQuotationCreated?: () => void;
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

export default function NewQuotationModal({ isOpen, onClose, onQuotationCreated }: NewQuotationModalProps) {
  const [formData, setFormData] = useState({
    customer_id: '',
    quotation_date: new Date().toISOString().split('T')[0],
    valid_until: '',
    terms_conditions: '',
    notes: ''
  });
  const [items, setItems] = useState<QuotationItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch customers when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchCustomers();
      // Set default valid until date (30 days from now)
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + 30);
      setFormData(prev => ({
        ...prev,
        valid_until: validUntil.toISOString().split('T')[0]
      }));
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

  const addItem = () => {
    const newItem: QuotationItem = {
      id: Date.now().toString(),
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

  const handleSubmit = async (status: 'draft' | 'sent') => {
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

      console.log('Sending quotation data:', cleanedData);

      const response = await apiClient.createQuotation(cleanedData);
      
      if (response.success) {
        console.log('Quotation created successfully:', response.data);
        
        // After successful creation, update status if needed
        if (status === 'sent' && response.data?.id) {
          try {
            console.log('Updating quotation status to sent for ID:', response.data.id);
            await apiClient.updateQuotationStatus(response.data.id, 'sent');
          } catch (statusError) {
            console.warn('Failed to update quotation status to sent:', statusError);
            // Don't throw error here since the quotation was created successfully
          }
        }
        
        onQuotationCreated?.();
        onClose();
        // Reset form
        setFormData({
          customer_id: '',
          quotation_date: new Date().toISOString().split('T')[0],
          valid_until: '',
          terms_conditions: '',
          notes: ''
        });
        setItems([]);
      } else {
        throw new Error(response.message || 'Failed to create quotation');
      }
    } catch (err: any) {
      console.error('Failed to create quotation:', err);
      
      let errorMessage = 'Failed to create quotation';
      
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Create New Quotation</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <div className="p-6">
          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Customer Selection and Dates */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Customer *</label>
              <select
                value={formData.customer_id}
                onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                className="w-full px-4 py-2 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
                disabled={isLoadingCustomers}
              >
                <option value="">
                  {isLoadingCustomers ? 'Loading customers...' : 'Select a customer'}
                </option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Quotation Date *</label>
              <input
                type="date"
                value={formData.quotation_date}
                onChange={(e) => setFormData({ ...formData, quotation_date: e.target.value })}
                className="w-full px-4 py-2 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Valid Until</label>
              <input
                type="date"
                value={formData.valid_until}
                onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                className="w-full px-4 py-2 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Terms & Conditions</label>
              <textarea
                value={formData.terms_conditions}
                onChange={(e) => setFormData({ ...formData, terms_conditions: e.target.value })}
                className="w-full px-4 py-2 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Payment terms, delivery conditions..."
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-4 py-2 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Additional notes..."
                rows={3}
              />
            </div>
          </div>

          {/* Items */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Items</h3>
              <button
                onClick={addItem}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200"
              >
                Add Item
              </button>
            </div>

            {items.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <p>No items added yet. Click "Add Item" to get started.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-12 gap-3 items-center p-3 bg-gray-100 rounded-lg font-medium text-sm text-gray-700">
                  <div className="col-span-4">Description</div>
                  <div className="col-span-2">Quantity</div>
                  <div className="col-span-2">Unit Price</div>
                  <div className="col-span-1">Discount %</div>
                  <div className="col-span-1">Tax %</div>
                  <div className="col-span-1">Total</div>
                  <div className="col-span-1">Action</div>
                </div>
                {items.map((item) => (
                  <div key={item.id} className="grid grid-cols-12 gap-3 items-center p-3 bg-gray-50 rounded-lg">
                    <div className="col-span-4">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                        className="w-full px-3 py-2 text-black border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                        placeholder="Item description"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, 'quantity', Number(e.target.value))}
                        className="w-full px-3 py-2 text-black border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                        placeholder="Qty"
                        min="1"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        value={item.unit_price}
                        onChange={(e) => updateItem(item.id, 'unit_price', Number(e.target.value))}
                        className="w-full px-3 py-2 text-black border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                        placeholder="Unit Price"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div className="col-span-1">
                      <input
                        type="number"
                        value={item.discount_percent}
                        onChange={(e) => updateItem(item.id, 'discount_percent', Number(e.target.value))}
                        className="w-full px-3 py-2 text-black border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                        placeholder="0"
                        min="0"
                        max="100"
                        step="0.1"
                      />
                    </div>
                    <div className="col-span-1">
                      <input
                        type="number"
                        value={item.tax_percent}
                        onChange={(e) => updateItem(item.id, 'tax_percent', Number(e.target.value))}
                        className="w-full px-3 py-2 text-black border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                        placeholder="18"
                        min="0"
                        max="100"
                        step="0.1"
                      />
                    </div>
                    <div className="col-span-1">
                      <div className="px-3 py-2 text-black bg-white border border-gray-300 rounded text-sm">
                        ${item.line_total.toFixed(2)}
                      </div>
                    </div>
                    <div className="col-span-1">
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-red-600 hover:text-red-800 transition-colors duration-200 p-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
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
                    <span>${totals.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Discount:</span>
                    <span>-${totals.discountAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Tax:</span>
                    <span>${totals.taxAmount.toFixed(2)}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900">
                    Total: ${totals.total.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => handleSubmit('draft')}
            disabled={isLoading || !formData.customer_id || items.length === 0}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Saving...' : 'Save Draft'}
          </button>
          <button
            onClick={() => handleSubmit('sent')}
            disabled={isLoading || !formData.customer_id || items.length === 0}
            className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Sending...' : 'Send to Customer'}
          </button>
        </div>
      </div>
    </div>
  );
}
