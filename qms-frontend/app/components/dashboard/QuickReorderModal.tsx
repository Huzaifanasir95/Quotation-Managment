'use client';

import { useState } from 'react';

interface QuickReorderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface LowStockItem {
  id: string;
  sku: string;
  name: string;
  currentStock: number;
  reorderPoint: number;
  suggestedQuantity: number;
  unitCost: number;
  supplier: string;
}

export default function QuickReorderModal({ isOpen, onClose }: QuickReorderModalProps) {
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  const lowStockItems = [
    {
      id: '1',
      sku: 'LAP-001',
      name: 'Laptop Dell XPS 13',
      currentStock: 2,
      reorderPoint: 5,
      suggestedQuantity: 8,
      unitCost: 950,
      supplier: 'Tech Supplies Inc'
    },
    {
      id: '2',
      sku: 'MON-002',
      name: 'Monitor 27" 4K',
      currentStock: 1,
      reorderPoint: 3,
      suggestedQuantity: 5,
      unitCost: 650,
      supplier: 'Display Solutions'
    },
    {
      id: '3',
      sku: 'KEY-003',
      name: 'Wireless Keyboard',
      currentStock: 0,
      reorderPoint: 10,
      suggestedQuantity: 15,
      unitCost: 45,
      supplier: 'Input Devices Co'
    }
  ];

  const handleItemToggle = (itemId: string) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleSelectAll = () => {
    if (selectedItems.length === lowStockItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(lowStockItems.map(item => item.id));
    }
  };

  const getSelectedItemsData = () => {
    return lowStockItems.filter(item => selectedItems.includes(item.id));
  };

  const calculateTotalCost = () => {
    return getSelectedItemsData().reduce((total, item) => {
      return total + (item.suggestedQuantity * item.unitCost);
    }, 0);
  };

  const handleCreatePO = async () => {
    if (selectedItems.length === 0) return;

    setIsCreating(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const poData = {
        items: getSelectedItemsData(),
        totalCost: calculateTotalCost()
      };
      
      console.log('Creating purchase order:', poData);
      alert('Purchase order created successfully!');
      onClose();
    } catch (error) {
      console.error('Failed to create purchase order:', error);
      alert('Failed to create purchase order. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Quick Reorder (Low Stock)</h2>
            <p className="text-gray-600 mt-1">Prevent stockouts with suggested quantities</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Low Stock Items</h3>
            <div className="flex items-center space-x-3">
              <button onClick={handleSelectAll} className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                {selectedItems.length === lowStockItems.length ? 'Deselect All' : 'Select All'}
              </button>
              <span className="text-sm text-gray-500">
                {selectedItems.length} of {lowStockItems.length} selected
              </span>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedItems.length === lowStockItems.length}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reorder</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Suggested</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit Cost</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {lowStockItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(item.id)}
                        onChange={() => handleItemToggle(item.id)}
                        className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{item.name}</p>
                        <p className="text-sm text-gray-500">{item.sku}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`text-sm font-medium ${
                        item.currentStock === 0 ? 'text-red-600' : 'text-yellow-600'
                      }`}>
                        {item.currentStock}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-gray-900">{item.reorderPoint}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-gray-900">{item.suggestedQuantity}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-gray-900">${item.unitCost.toLocaleString()}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-gray-900">{item.supplier}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selectedItems.length > 0 && (
            <div className="mt-6 bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Selected Items: {selectedItems.length}</p>
                  <p className="text-lg font-semibold text-red-600">Total Cost: ${calculateTotalCost().toLocaleString()}</p>
                </div>
                <button
                  onClick={handleCreatePO}
                  disabled={isCreating}
                  className="px-6 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {isCreating ? 'Creating PO...' : 'Create Purchase Order'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
