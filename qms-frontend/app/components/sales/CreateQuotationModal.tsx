'use client';

import { useState, useRef, useEffect } from 'react';
import { apiClient } from '../../lib/api';

interface CreateQuotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onQuotationCreated?: () => void;
}

type TabType = 'customer' | 'items' | 'taxes' | 'attachments' | 'preview';

export default function CreateQuotationModal({ isOpen, onClose, onQuotationCreated }: CreateQuotationModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('customer');
  const [formData, setFormData] = useState({
    customerId: '',
    validUntil: '',
    notes: 'NULL'
  });
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  const tabs = [
    { id: 'customer', name: 'Customer Info', icon: '👤' },
    { id: 'items', name: 'Items', icon: '📦' },
    { id: 'taxes', name: 'Taxes & Discounts', icon: '💰' },
    { id: 'attachments', name: 'Attachments', icon: '📎' },
    { id: 'preview', name: 'PDF Preview', icon: '👁️' }
  ];

  // Load customers and products when modal opens
  useEffect(() => {
    if (isOpen) {
      loadCustomers();
      loadProducts();
    }
  }, [isOpen]);

  const loadCustomers = async () => {
    try {
      const response = await apiClient.getCustomers({ limit: 100 });
      if (response.success) {
        setCustomers(response.data.customers);
      }
    } catch (error) {
      console.error('Failed to load customers:', error);
    }
  };

  const loadProducts = async () => {
    // For now, using mock products since we don't have a products API endpoint yet
    setProducts([
      { id: '1', name: 'Laptop Dell XPS 13', price: 1200 },
      { id: '2', name: 'Monitor 27" 4K', price: 800 },
      { id: '3', name: 'Wireless Mouse', price: 50 },
      { id: '4', name: 'USB-C Hub', price: 45 }
    ]);
  };

  const addItem = () => {
    setItems([...items, { id: Date.now(), productId: '', quantity: 1, unitPrice: 0 }]);
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
        items: items.map(item => ({
          description: products.find(p => p.id === item.productId)?.name || 'Unknown Product',
          quantity: item.quantity,
          unit_price: item.unitPrice
        }))
      };

      const response = await apiClient.createQuotation(quotationData);
      
      if (response.success) {
        alert('Quotation created successfully!');
        onClose();
        
        // Call callback to refresh quotation list
        if (onQuotationCreated) {
          onQuotationCreated();
        }
        
        // Reset form
        setFormData({
          customerId: '',
          validUntil: '',
          notes: 'NULL'
        });
        setItems([]);
        setActiveTab('customer');
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Create New Quotation</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'customer' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Customer Information</h3>
              <select
                value={formData.customerId}
                onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                className="w-full text-black p-2 border rounded"
              >
                <option value="">Select customer</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <input
                type="date"
                value={formData.validUntil}
                onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                className="w-full text-black p-2 border rounded"
                placeholder="Valid until"
              />
            </div>
          )}

          {activeTab === 'items' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Items</h3>
                <button onClick={addItem} className="bg-blue-600 text-white px-4 py-2 rounded">
                  Add Item
                </button>
              </div>
              {items.map((item, index) => (
                <div key={item.id} className="border p-4 rounded">
                  <select
                    value={item.productId}
                    onChange={(e) => {
                      const product = products.find(p => p.id === e.target.value);
                      const newItems = [...items];
                      newItems[index] = { ...item, productId: e.target.value, unitPrice: product?.price || 0 };
                      setItems(newItems);
                    }}
                    className="w-full text-black p-2 border rounded mb-2"
                  >
                    <option value="">Select product</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} - ${p.price}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => {
                      const newItems = [...items];
                      newItems[index] = { ...item, quantity: Number(e.target.value) };
                      setItems(newItems);
                    }}
                    className="w-full text-black p-2 border rounded"
                    placeholder="Quantity"
                  />
                </div>
              ))}
            </div>
          )}

          {activeTab === 'taxes' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Taxes & Discounts</h3>
              <p className="text-gray-600">Tax and discount settings will be configured here.</p>
            </div>
          )}

          {activeTab === 'attachments' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Attachments</h3>
              <p className="text-gray-600">File upload functionality will be implemented here.</p>
            </div>
          )}

          {activeTab === 'preview' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">PDF Preview</h3>
              <p className="text-gray-600">PDF preview and generation will be shown here.</p>
            </div>
          )}
        </div>

        <div className="flex justify-between p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={() => {
              const currentIndex = tabs.findIndex(t => t.id === activeTab);
              if (currentIndex > 0) {
                setActiveTab(tabs[currentIndex - 1].id as TabType);
              }
            }}
            disabled={activeTab === 'customer'}
            className="px-4 text-black py-2 border rounded disabled:opacity-50"
          >
            Previous
          </button>

          <div className="flex space-x-3">
            <button onClick={onClose} className="px-4 text-black py-2 border rounded">
              Cancel
            </button>
            {activeTab === 'preview' ? (
              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className="px-6 py-2 bg-green-600 text-white rounded disabled:opacity-50"
              >
                {isLoading ? 'Creating...' : 'Create Quotation'}
              </button>
            ) : (
              <button
                onClick={() => {
                  const currentIndex = tabs.findIndex(t => t.id === activeTab);
                  if (currentIndex < tabs.length - 1) {
                    setActiveTab(tabs[currentIndex + 1].id as TabType);
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded"
              >
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
