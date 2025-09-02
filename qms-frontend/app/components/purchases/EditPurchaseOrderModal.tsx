'use client';

import { useState, useEffect } from 'react';
import { apiClient, type Vendor, type PurchaseOrder } from '../../lib/api';

interface EditPurchaseOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseOrder: PurchaseOrder | null;
  onPOUpdated?: () => void;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  selling_price: number;
  last_purchase_price: number;
  category: string;
  current_stock: number;
  status: string;
}

interface POItem {
  id?: string;
  productId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  tax: number;
  subtotal: number;
}

export default function EditPurchaseOrderModal({ isOpen, onClose, purchaseOrder, onPOUpdated }: EditPurchaseOrderModalProps) {
  const [formData, setFormData] = useState({
    vendorId: '',
    expectedDelivery: '',
    notes: '',
    terms: '',
    status: 'draft'
  });
  const [items, setItems] = useState<POItem[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [productsLoading, setProductsLoading] = useState(false);

  // Load vendors and products when modal opens
  useEffect(() => {
    if (isOpen) {
      loadVendors();
      loadProducts();
    }
  }, [isOpen]);

  // Populate form when purchase order is provided
  useEffect(() => {
    if (isOpen && purchaseOrder) {
      setFormData({
        vendorId: purchaseOrder.vendor_id || '',
        expectedDelivery: purchaseOrder.expected_delivery_date || '',
        notes: purchaseOrder.notes || '',
        terms: purchaseOrder.terms_conditions || '',
        status: purchaseOrder.status || 'draft'
      });

      // Load existing items
      if (purchaseOrder.purchase_order_items) {
        const existingItems = purchaseOrder.purchase_order_items.map(item => ({
          id: item.id,
          productId: item.product_id || '',
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          discount: item.discount_percent || 0,
          tax: item.tax_percent || 0,
          subtotal: item.line_total
        }));
        setItems(existingItems);
      }
    }
  }, [isOpen, purchaseOrder]);

  const loadVendors = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.getVendors({ limit: 100 });
      if (response.success) {
        const vendorsList = response.data.vendors || [];
        setVendors(vendorsList);
      } else {
        console.error('Failed to load vendors:', response.message);
        alert('Failed to load vendors. Please try again.');
      }
    } catch (error) {
      console.error('Failed to load vendors:', error);
      alert('Failed to load vendors. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadProducts = async () => {
    setProductsLoading(true);
    try {
      const response = await apiClient.getProducts({ limit: 1000, status: 'active' });
      if (response.success && response.data) {
        const productsList = response.data.products || response.data || [];
        setProducts(productsList);
      } else {
        console.error('Failed to load products:', response?.message);
        setProducts([]);
      }
    } catch (error) {
      console.error('Failed to load products:', error);
      setProducts([]);
    } finally {
      setProductsLoading(false);
    }
  };

  const addItem = () => {
    const newItem: POItem = {
      id: `new-${Date.now()}`,
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
    setItems(prevItems => {
      const newItems = prevItems.map(item => {
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
      });
      return newItems;
    });
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
    if (!purchaseOrder) return;

    if (!formData.vendorId) {
      alert('Please select a vendor.');
      return;
    }
    
    if (items.length === 0) {
      alert('Please add at least one item to the purchase order.');
      return;
    }

    // Validate that all items have descriptions
    const invalidItems = items.filter(item => !item.description.trim());
    if (invalidItems.length > 0) {
      alert('Please ensure all items have descriptions.');
      return;
    }

    setIsLoading(true);
    
    try {
      const poData = {
        vendor_id: formData.vendorId,
        expected_delivery_date: formData.expectedDelivery || null,
        status: formData.status,
        notes: formData.notes || null,
        terms_conditions: formData.terms || null,
        items: items.map(item => ({
          id: item.id?.startsWith('new-') ? undefined : item.id, // Don't send temp IDs for new items
          product_id: item.productId || null,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          discount_percent: item.discount,
          tax_percent: item.tax
        }))
      };
      
      const response = await apiClient.updatePurchaseOrder(purchaseOrder.id, poData);
      
      if (response.success) {
        alert('Purchase order updated successfully!');
        
        // Reset form
        setFormData({
          vendorId: '',
          expectedDelivery: '',
          notes: '',
          terms: '',
          status: 'draft'
        });
        setItems([]);
        
        onClose();
        
        // Call callback to refresh purchase orders list
        if (onPOUpdated) {
          onPOUpdated();
        }
      } else {
        throw new Error(response.message || 'Failed to update purchase order');
      }
    } catch (error) {
      console.error('Failed to update purchase order:', error);
      alert(`Failed to update purchase order: ${error instanceof Error ? error.message : 'Please try again.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      vendorId: '',
      expectedDelivery: '',
      notes: '',
      terms: '',
      status: 'draft'
    });
    setItems([]);
    onClose();
  };

  if (!isOpen || !purchaseOrder) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto pointer-events-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-t-xl">
          <div>
            <h2 className="text-2xl font-bold">Edit Purchase Order</h2>
            <p className="text-green-100 mt-1">PO Number: {purchaseOrder.po_number}</p>
          </div>
          <button onClick={handleClose} className="text-white hover:text-gray-200 transition-colors duration-200 text-2xl font-light">✕</button>
        </div>

        <div className="p-6">
          {/* Vendor and Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Vendor *</label>
              <select
                value={formData.vendorId}
                onChange={(e) => setFormData({ ...formData, vendorId: e.target.value })}
                className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">Choose a vendor</option>
                {vendors.length > 0 ? (
                  vendors.map((vendor) => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.name}{vendor.gst_number ? ` - ${vendor.gst_number}` : ''}
                    </option>
                  ))
                ) : (
                  <option value="" disabled>Loading vendors...</option>
                )}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="draft">Draft</option>
                <option value="pending_approval">Pending Approval</option>
                <option value="approved">Approved</option>
                <option value="sent">Sent</option>
                <option value="received">Received</option>
                <option value="closed">Closed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Expected Delivery</label>
              <input
                type="date"
                value={formData.expectedDelivery}
                onChange={(e) => setFormData({ ...formData, expectedDelivery: e.target.value })}
                className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Additional notes for the purchase order..."
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Terms & Conditions</label>
              <textarea
                value={formData.terms}
                onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                rows={3}
                className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                disabled={products.length === 0 || productsLoading}
                className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-2 rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
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
                            if (product) {
                              setItems(prevItems => prevItems.map(prevItem => {
                                if (prevItem.id === item.id) {
                                  const price = product.last_purchase_price || product.selling_price || 0;
                                  const updatedItem = {
                                    ...prevItem,
                                    productId: e.target.value,
                                    description: product.name,
                                    unitPrice: price
                                  };
                                  const subtotal = Number(updatedItem.quantity) * Number(updatedItem.unitPrice);
                                  const discountAmount = subtotal * (Number(updatedItem.discount) / 100);
                                  const taxAmount = (subtotal - discountAmount) * (Number(updatedItem.tax) / 100);
                                  updatedItem.subtotal = subtotal - discountAmount + taxAmount;
                                  return updatedItem;
                                }
                                return prevItem;
                              }));
                            } else {
                              updateItem(item.id!, 'productId', e.target.value);
                            }
                          }}
                          className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          disabled={productsLoading}
                        >
                          <option value="">
                            {productsLoading ? 'Loading products...' : 'Select product'}
                          </option>
                          {products.length > 0 ? (
                            products.map((product) => {
                              const price = product.last_purchase_price || product.selling_price || 0;
                              return (
                                <option key={product.id} value={product.id}>
                                  {product.name} - ${price.toFixed(2)} (Stock: {product.current_stock})
                                </option>
                              );
                            })
                          ) : (
                            !productsLoading && (
                              <option value="" disabled>No products available</option>
                            )
                          )}
                        </select>
                      </div>

                      <div className="col-span-2">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id!, 'quantity', Number(e.target.value))}
                          className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          placeholder="Qty"
                          min="1"
                        />
                      </div>

                      <div className="col-span-2">
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(item.id!, 'unitPrice', Number(e.target.value))}
                          className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                          onClick={() => removeItem(item.id!)}
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
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
              <h4 className="font-semibold text-green-900 mb-4 text-lg">Order Summary</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-green-200">
                  <span className="text-green-700 font-medium">Subtotal:</span>
                  <span className="font-semibold text-green-900">${calculateTotals().subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-green-200">
                  <span className="text-green-700 font-medium">Total Discount:</span>
                  <span className="font-semibold text-red-600">-${calculateTotals().totalDiscount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-green-200">
                  <span className="text-green-700 font-medium">Total Tax:</span>
                  <span className="font-semibold text-green-600">+${calculateTotals().totalTax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-t-2 border-green-300 bg-green-100 px-4 rounded-lg">
                  <span className="text-green-900 font-bold text-lg">Grand Total:</span>
                  <span className="font-bold text-xl text-green-900">${calculateTotals().total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleClose}
            className="px-6 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-medium"
          >
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            disabled={isLoading || items.length === 0}
            className="px-8 py-2.5 text-white bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg hover:shadow-xl"
          >
            {isLoading ? (
              <div className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Updating...
              </div>
            ) : (
              'Update Purchase Order'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
