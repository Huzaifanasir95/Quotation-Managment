                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              'use client';

import { useState, useEffect } from 'react';
import { apiClient, type Vendor } from '../../lib/api';

interface CreatePurchaseOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPOCreated?: () => void;
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
  id: string;
  productId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  tax: number;
  subtotal: number;
}

export default function CreatePurchaseOrderModal({ isOpen, onClose, onPOCreated }: CreatePurchaseOrderModalProps) {
  const [formData, setFormData] = useState({
    vendorIds: [] as string[],
    expectedDelivery: '',
    notes: 'None',
    terms: 'Standard terms and conditions apply. Payment due within 30 days of delivery. All items subject to quality inspection upon receipt.'
  });
  const [items, setItems] = useState<POItem[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [productsLoading, setProductsLoading] = useState(false);
  const [action, setAction] = useState<'save' | 'approve'>('save');

  // Load vendors and products when modal opens
  useEffect(() => {
    if (isOpen) {
      loadVendors();
      loadProducts();
      // Reset form when modal opens
      setFormData({
        vendorIds: [],
        expectedDelivery: '',
        notes: 'None',
        terms: 'Standard terms and conditions apply. Payment due within 30 days of delivery. All items subject to quality inspection upon receipt.'
      });
      setItems([]);
    }
  }, [isOpen]);

  const loadVendors = async () => {
    setIsLoading(true);
    try {
      console.log('Loading vendors...');
      const response = await apiClient.getVendors({ limit: 100 });
      console.log('Vendors response:', response);
      if (response.success) {
        const vendorsList = response.data.vendors || [];
        console.log('Loaded vendors:', vendorsList);
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
      console.log('Loading products...');
      const response = await apiClient.getProducts({ limit: 1000, status: 'active' });
      console.log('Products response:', response);
      if (response.success && response.data) {
        // Handle different response structures
        const productsList = response.data.products || response.data || [];
        console.log('Loaded products:', productsList);
        // Log first product to see structure
        if (productsList.length > 0) {
          console.log('Sample product:', productsList[0]);
        }
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
    console.log(`Updating item ${id}, field ${field}, value:`, value);
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
          console.log('Updated item:', updatedItem);
          return updatedItem;
        }
        return item;
      });
      console.log('All items after update:', newItems);
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
    if (formData.vendorIds.length === 0) {
      alert('Please select at least one vendor.');
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
      // Create separate purchase orders for each selected vendor
      const poPromises = formData.vendorIds.map(async (vendorId) => {
        const poData = {
          vendor_id: vendorId,
          po_date: new Date().toISOString().split('T')[0],
          expected_delivery_date: formData.expectedDelivery || null,
          status: action === 'approve' ? 'approved' : 'draft',
          notes: formData.notes || null,
          terms_conditions: formData.terms || null,
          items: items.map(item => ({
            product_id: item.productId || null,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            discount_percent: item.discount,
            tax_percent: item.tax
          }))
        };
        
        return apiClient.createPurchaseOrder(poData);
      });
      
      const results = await Promise.all(poPromises);
      
      // Check if all purchase orders were created successfully
      const failedResults = results.filter(result => !result.success);
      if (failedResults.length > 0) {
        throw new Error(`Failed to create ${failedResults.length} purchase order(s)`);
      }
      
      const successCount = results.length;
      if (action === 'approve') {
        alert(`Successfully created and approved ${successCount} purchase order(s) for selected vendors!`);
      } else {
        alert(`Successfully saved ${successCount} purchase order(s) as draft for selected vendors!`);
      }
      
      // Reset form
      setFormData({
        vendorIds: [],
        expectedDelivery: '',
        notes: 'None',
        terms: 'Standard terms and conditions apply. Payment due within 30 days of delivery. All items subject to quality inspection upon receipt.'
      });
      setItems([]);
      setAction('save');
      
      onClose();
      
      // Call callback to refresh purchase orders list
      if (onPOCreated) {
        onPOCreated();
      }
    } catch (error) {
      console.error('Failed to create purchase order:', error);
      alert(`Failed to create purchase order: ${error instanceof Error ? error.message : 'Please try again.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto pointer-events-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-xl">
          <h2 className="text-2xl font-bold">Create Multi-Vendor Purchase Orders</h2>
          <button onClick={onClose} className="text-white hover:text-gray-200 transition-colors duration-200 text-2xl font-light">✕</button>
        </div>

        <div className="p-6">
          {/* Vendor Selection Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Vendor Selection - Takes 2 columns */}
            <div className="lg:col-span-2">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <svg className="w-6 h-6 text-purple-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Select Vendors *
                  </h3>
                  {formData.vendorIds.length > 0 && (
                    <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">
                      {formData.vendorIds.length} vendor{formData.vendorIds.length > 1 ? 's' : ''} selected
                    </span>
                  )}
                </div>
                
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <svg className="animate-spin w-8 h-8 text-purple-600" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="ml-3 text-gray-600">Loading vendors...</span>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {vendors.map(vendor => (
                      <label key={vendor.id} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.vendorIds.includes(vendor.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                vendorIds: [...formData.vendorIds, vendor.id]
                              });
                            } else {
                              setFormData({
                                ...formData,
                                vendorIds: formData.vendorIds.filter(id => id !== vendor.id)
                              });
                            }
                          }}
                          className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-gray-900">{vendor.name}</h4>
                            {vendor.contact_person && <span className="text-sm text-gray-500">{vendor.contact_person}</span>}
                          </div>
                          <p className="text-sm text-gray-600">{vendor.email}</p>
                          {vendor.gst_number && <p className="text-sm text-gray-500">GST: {vendor.gst_number}</p>}
                        </div>
                      </label>
                    ))}
                  </div>
                )}
                
                {formData.vendorIds.length === 0 && !isLoading && (
                  <p className="text-sm text-red-500 mt-2">Please select at least one vendor</p>
                )}
                
                {vendors.length === 0 && !isLoading && (
                  <p className="text-sm text-gray-500 mt-2">No vendors available. Please add vendors first.</p>
                )}
              </div>
            </div>

            {/* Selected Vendors Preview - Takes 1 column */}
            <div className="lg:col-span-1">
              {formData.vendorIds.length > 0 ? (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="text-sm font-medium text-gray-900 mb-4">Selected Vendors ({formData.vendorIds.length})</h4>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {formData.vendorIds.map(vendorId => {
                      const vendor = vendors.find(v => v.id === vendorId);
                      return vendor ? (
                        <div key={vendor.id} className="border border-gray-100 rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <h5 className="font-medium text-gray-900 truncate">{vendor.name}</h5>
                              {vendor.contact_person && <p className="text-sm text-gray-600 truncate">{vendor.contact_person}</p>}
                              <p className="text-xs text-gray-500 truncate">{vendor.email}</p>
                            </div>
                            <button
                              onClick={() => setFormData({
                                ...formData,
                                vendorIds: formData.vendorIds.filter(id => id !== vendorId)
                              })}
                              className="text-red-500 hover:text-red-700 ml-2"
                              title="Remove vendor"
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
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                  <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <p className="text-gray-500 text-sm">No vendors selected</p>
                  <p className="text-gray-400 text-xs mt-1">Select vendors from the left panel</p>
                </div>
              )}
            </div>
          </div>

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Expected Delivery</label>
              <input
                type="date"
                value={formData.expectedDelivery}
                onChange={(e) => setFormData({ ...formData, expectedDelivery: e.target.value })}
                className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div></div> {/* Empty div to maintain grid layout */}

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
              <div className="flex items-center space-x-3">
                {products.length === 0 && !productsLoading && (
                  <span className="text-sm text-orange-600">
                    Add products in{' '}
                    <button
                      type="button"
                      onClick={() => window.open('/inventory', '_blank')}
                      className="text-blue-600 hover:text-blue-800 underline font-medium"
                    >
                      Inventory
                    </button>{' '}
                    first
                  </span>
                )}
                <button
                  onClick={addItem}
                  disabled={products.length === 0 || productsLoading}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Item
                </button>
              </div>
            </div>

            {items.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <p className="mb-4">No items added yet. Click "Add Item" to get started.</p>
                {products.length === 0 && !productsLoading && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 max-w-md mx-auto">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-orange-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <div className="text-sm">
                        <p className="text-orange-800 font-medium">No products available!</p>
                        <p className="text-orange-700 mt-1">
                          You need to add products first.{' '}
                          <button
                            type="button"
                            onClick={() => window.open('/inventory', '_blank')}
                            className="text-blue-600 hover:text-blue-800 underline font-medium"
                          >
                            Go to Inventory →
                          </button>
                        </p>
                      </div>
                    </div>
                  </div>
                )}
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
                            console.log('Product selected:', e.target.value);
                            console.log('Current item before update:', item);
                            const product = products.find(p => p.id === e.target.value);
                            console.log('Found product:', product);
                            
                            if (product) {
                              // Batch all updates in a single setState call
                              setItems(prevItems => prevItems.map(prevItem => {
                                if (prevItem.id === item.id) {
                                  const price = product.last_purchase_price || product.selling_price || 0;
                                  const updatedItem = {
                                    ...prevItem,
                                    productId: e.target.value,
                                    description: product.name,
                                    unitPrice: price
                                  };
                                  // Recalculate subtotal
                                  const subtotal = Number(updatedItem.quantity) * Number(updatedItem.unitPrice);
                                  const discountAmount = subtotal * (Number(updatedItem.discount) / 100);
                                  const taxAmount = (subtotal - discountAmount) * (Number(updatedItem.tax) / 100);
                                  updatedItem.subtotal = subtotal - discountAmount + taxAmount;
                                  
                                  console.log('Updated item:', updatedItem);
                                  return updatedItem;
                                }
                                return prevItem;
                              }));
                            } else {
                              // Just update productId if no product found
                              updateItem(item.id, 'productId', e.target.value);
                            }
                          }}
                          className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                                  {product.name} - Rs. {price.toFixed(2)} (Stock: {product.current_stock})
                                </option>
                              );
                            })
                          ) : (
                            !productsLoading && (
                              <option value="" disabled>No products available</option>
                            )
                          )}
                        </select>
                        {products.length === 0 && !productsLoading && (
                          <p className="mt-1 text-sm text-orange-600">
                            No products found.{' '}
                            <button
                              type="button"
                              onClick={() => window.open('/inventory', '_blank')}
                              className="text-blue-600 hover:text-blue-800 underline"
                            >
                              Add products in Inventory →
                            </button>
                          </p>
                        )}
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
                          Rs. {item.subtotal.toFixed(2)}
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
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
              <h4 className="font-semibold text-blue-900 mb-4 text-lg">Order Summary</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-blue-200">
                  <span className="text-blue-700 font-medium">Subtotal:</span>
                  <span className="font-semibold text-blue-900">Rs. {calculateTotals().subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-blue-200">
                  <span className="text-blue-700 font-medium">Total Discount:</span>
                  <span className="font-semibold text-red-600">-Rs. {calculateTotals().totalDiscount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-blue-200">
                  <span className="text-blue-700 font-medium">Total Tax:</span>
                  <span className="font-semibold text-green-600">+Rs. {calculateTotals().totalTax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-t-2 border-blue-300 bg-blue-100 px-4 rounded-lg">
                  <span className="text-blue-900 font-bold text-lg">Grand Total:</span>
                  <span className="font-bold text-xl text-blue-900">Rs. {calculateTotals().total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-medium"
          >
            Cancel
          </button>

          <div className="flex items-center space-x-3">
            <select
              value={action}
              onChange={(e) => setAction(e.target.value as 'save' | 'approve')}
              className="px-4 text-black py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white font-medium"
            >
              <option value="save">Save as Draft</option>
              <option value="approve">Save & Approve</option>
            </select>

            <button
              onClick={handleSubmit}
              disabled={isLoading || items.length === 0}
              className={`px-8 py-2.5 text-white rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg hover:shadow-xl ${
                action === 'approve' 
                  ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700' 
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
              }`}
            >
              {isLoading ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating...
                </div>
              ) : (
                action === 'approve' ? 'Create & Approve' : 'Save as Draft'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
