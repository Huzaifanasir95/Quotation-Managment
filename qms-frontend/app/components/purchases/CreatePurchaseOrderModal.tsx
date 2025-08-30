'use client';

import { useState } from 'react';

interface CreatePurchaseOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Vendor {
  id: string;
  name: string;
  gst: string;
  contact: string;
  phone: string;
  email: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  category: string;
  currentStock: number;
}

interface POItem {
  id: string;
  productId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  tax: number;
  subtotal: number;
}

export default function CreatePurchaseOrderModal({ isOpen, onClose }: CreatePurchaseOrderModalProps) {
  const [formData, setFormData] = useState({
    vendorId: '',
    expectedDelivery: '',
    notes: '',
    terms: ''
  });
  const [items, setItems] = useState<POItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [action, setAction] = useState<'save' | 'approve'>('save');

  // Mock data
  const vendors: Vendor[] = [
    { id: '1', name: 'Tech Supplies Inc', gst: 'GST123456789', contact: 'John Smith', phone: '+1 (555) 123-4567', email: 'john@techsupplies.com' },
    { id: '2', name: 'Display Solutions', gst: 'GST234567890', contact: 'Sarah Johnson', phone: '+1 (555) 234-5678', email: 'sarah@displaysolutions.com' },
    { id: '3', name: 'Input Devices Co', gst: 'GST345678901', contact: 'Mike Davis', phone: '+1 (555) 345-6789', email: 'mike@inputdevices.com' }
  ];

  const products: Product[] = [
    { id: '1', name: 'Laptop Dell XPS 13', sku: 'LAP-001', price: 1200, category: 'Electronics', currentStock: 5 },
    { id: '2', name: 'Monitor 27" 4K', sku: 'MON-002', price: 800, category: 'Electronics', currentStock: 3 },
    { id: '3', name: 'Wireless Keyboard', sku: 'KEY-003', price: 50, category: 'Accessories', currentStock: 15 },
    { id: '4', name: 'USB-C Hub', sku: 'HUB-004', price: 45, category: 'Accessories', currentStock: 8 }
  ];

  const addItem = () => {
    const newItem: POItem = {
      id: Date.now().toString(),
      productId: '',
      description: '',
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      tax: 0,
      subtotal: 0
    };
    setItems([...items, newItem]);
  };

  const updateItem = (id: string, field: keyof POItem, value: string | number) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unitPrice' || field === 'discount' || field === 'tax') {
          const subtotal = Number(updatedItem.quantity) * Number(updatedItem.unitPrice);
          const discountAmount = subtotal * (Number(updatedItem.discount) / 100);
          const taxAmount = (subtotal - discountAmount) * (Number(updatedItem.tax) / 100);
          updatedItem.subtotal = subtotal - discountAmount + taxAmount;
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
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const totalDiscount = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice * item.discount / 100), 0);
    const totalTax = items.reduce((sum, item) => sum + ((item.quantity * item.unitPrice * (1 - item.discount / 100)) * item.tax / 100), 0);
    const total = subtotal - totalDiscount + totalTax;
    
    return { subtotal, totalDiscount, totalTax, total };
  };

  const handleSubmit = async () => {
    if (items.length === 0) {
      alert('Please add at least one item to the purchase order.');
      return;
    }

    setIsLoading(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const poData = {
        ...formData,
        items,
        totals: calculateTotals(),
        action
      };
      
      console.log('Creating purchase order:', poData);
      
      if (action === 'approve') {
        alert('Purchase order created and approved successfully!');
      } else {
        alert('Purchase order saved as draft successfully!');
      }
      
      onClose();
    } catch (error) {
      console.error('Failed to create purchase order:', error);
      alert('Failed to create purchase order. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Create New Purchase Order</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <div className="p-6">
          {/* Vendor and Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Vendor *</label>
              <select
                value={formData.vendorId}
                onChange={(e) => setFormData({ ...formData, vendorId: e.target.value })}
                className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Choose a vendor</option>
                {vendors.map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.name} - {vendor.gst}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Expected Delivery</label>
              <input
                type="date"
                value={formData.expectedDelivery}
                onChange={(e) => setFormData({ ...formData, expectedDelivery: e.target.value })}
                className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Additional notes for the purchase order..."
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Terms & Conditions</label>
              <textarea
                value={formData.terms}
                onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                rows={3}
                className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Terms and conditions..."
              />
            </div>
          </div>

          {/* Items Section */}
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
              <div className="space-y-4">
                {items.map((item) => (
                  <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-12 gap-4 items-center">
                      <div className="col-span-4">
                        <select
                          value={item.productId}
                          onChange={(e) => {
                            const product = products.find(p => p.id === e.target.value);
                            updateItem(item.id, 'productId', e.target.value);
                            if (product) {
                              updateItem(item.id, 'description', product.name);
                              updateItem(item.id, 'unitPrice', product.price);
                            }
                          }}
                          className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Select product</option>
                          {products.map((product) => (
                            <option key={product.id} value={product.id}>
                              {product.name} - ${product.price} (Stock: {product.currentStock})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-2">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, 'quantity', Number(e.target.value))}
                          className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Qty"
                          min="1"
                        />
                      </div>

                      <div className="col-span-2">
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(item.id, 'unitPrice', Number(e.target.value))}
                          className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Unit Price"
                          min="0"
                          step="0.01"
                        />
                      </div>

                      <div className="col-span-2">
                        <div className="px-3 text-black py-2 bg-gray-50 border border-gray-300 rounded-lg">
                          ${item.subtotal.toFixed(2)}
                        </div>
                      </div>

                      <div className="col-span-2">
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-red-600 hover:text-red-800 transition-colors duration-200"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Summary */}
          {items.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h4 className="font-medium text-blue-900 mb-2">Order Summary</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-blue-700">Subtotal:</span>
                  <span className="float-right font-medium">${calculateTotals().subtotal.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-blue-700">Total Discount:</span>
                  <span className="float-right font-medium">-${calculateTotals().totalDiscount.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-blue-700">Total Tax:</span>
                  <span className="float-right font-medium">+${calculateTotals().totalTax.toFixed(2)}</span>
                </div>
                <div className="border-t border-blue-200 pt-2">
                  <span className="text-blue-900 font-semibold">Grand Total:</span>
                  <span className="float-right font-bold text-lg">${calculateTotals().total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
          >
            Cancel
          </button>

          <div className="flex space-x-3">
            <select
              value={action}
              onChange={(e) => setAction(e.target.value as 'save' | 'approve')}
              className="px-3 text-black py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="save">Save as Draft</option>
              <option value="approve">Save & Approve</option>
            </select>

            <button
              onClick={handleSubmit}
              disabled={isLoading || items.length === 0}
              className={`px-6 py-2 text-white rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                action === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isLoading ? 'Creating...' : action === 'approve' ? 'Create & Approve' : 'Save as Draft'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
