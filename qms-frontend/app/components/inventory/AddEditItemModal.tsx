'use client';

import { useState, useEffect } from 'react';

interface AddEditItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingItem?: any;
}

export default function AddEditItemModal({ isOpen, onClose, editingItem }: AddEditItemModalProps) {
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    description: '',
    category: 'Finished Good',
    vendor: '',
    unitOfMeasure: 'Piece',
    lastPurchasePrice: 0,
    reorderPoint: 0,
    initialStock: 0,
    notes: ''
  });
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [isLoading, setIsLoading] = useState(false);

  const categories = ['Raw Material', 'Finished Good', 'Service', 'Spare Parts', 'Packaging'];
  const units = ['Piece', 'KG', 'Litre', 'Meter', 'Hour', 'Box', 'Set'];
  const vendors = ['Tech Supplies Inc', 'Display Solutions', 'Input Devices Co', 'Metal Suppliers Ltd', 'Service Pro Inc'];

  useEffect(() => {
    if (editingItem) {
      setFormData({
        sku: editingItem.sku || '',
        name: editingItem.name || '',
        description: editingItem.description || '',
        category: editingItem.category || 'Finished Good',
        vendor: editingItem.vendor || '',
        unitOfMeasure: editingItem.unitOfMeasure || 'Piece',
        lastPurchasePrice: editingItem.lastPurchasePrice || 0,
        reorderPoint: editingItem.reorderPoint || 0,
        initialStock: editingItem.currentStock || 0,
        notes: ''
      });
    } else {
      setFormData({
        sku: '',
        name: '',
        description: '',
        category: 'Finished Good',
        vendor: '',
        unitOfMeasure: 'Piece',
        lastPurchasePrice: 0,
        reorderPoint: 0,
        initialStock: 0,
        notes: ''
      });
    }
    setErrors({});
  }, [editingItem, isOpen]);

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

    if (!formData.sku.trim()) newErrors.sku = 'SKU is required';
    if (!formData.name.trim()) newErrors.name = 'Item name is required';
    if (!formData.vendor.trim()) newErrors.vendor = 'Vendor is required';
    if (formData.lastPurchasePrice < 0) newErrors.lastPurchasePrice = 'Price cannot be negative';
    if (formData.reorderPoint < 0) newErrors.reorderPoint = 'Reorder point cannot be negative';
    if (formData.initialStock < 0) newErrors.initialStock = 'Initial stock cannot be negative';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const itemData = {
        ...formData,
        id: editingItem?.id || Date.now().toString(),
        status: formData.initialStock > 0 ? 'In Stock' : 'Out of Stock',
        totalValue: formData.initialStock * formData.lastPurchasePrice,
        lastUpdated: new Date().toISOString()
      };
      
      console.log(editingItem ? 'Updating item:' : 'Creating item:', itemData);
      
      alert(editingItem ? 'Item updated successfully!' : 'Item created successfully!');
      onClose();
      
      // Reset form
      if (!editingItem) {
        setFormData({
          sku: '',
          name: '',
          description: '',
          category: 'Finished Good',
          vendor: '',
          unitOfMeasure: 'Piece',
          lastPurchasePrice: 0,
          reorderPoint: 0,
          initialStock: 0,
          notes: ''
        });
      }
      setErrors({});
    } catch (error) {
      console.error('Failed to save item:', error);
      alert('Failed to save item. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            {editingItem ? 'Edit Inventory Item' : 'Add New Inventory Item'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Information */}
            <div className="md:col-span-2">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">SKU/Item Code *</label>
              <input
                type="text"
                value={formData.sku}
                onChange={(e) => handleInputChange('sku', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.sku ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter SKU or item code"
              />
              {errors.sku && <p className="text-red-500 text-xs mt-1">{errors.sku}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Item Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter item name"
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
                className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter item description..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Vendor *</label>
              <select
                value={formData.vendor}
                onChange={(e) => handleInputChange('vendor', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.vendor ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Select vendor</option>
                {vendors.map(vendor => (
                  <option key={vendor} value={vendor}>{vendor}</option>
                ))}
              </select>
              {errors.vendor && <p className="text-red-500 text-xs mt-1">{errors.vendor}</p>}
            </div>

            {/* Stock & Pricing */}
            <div className="md:col-span-2">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Stock & Pricing</h3>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Unit of Measure</label>
              <select
                value={formData.unitOfMeasure}
                onChange={(e) => handleInputChange('unitOfMeasure', e.target.value)}
                className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {units.map(unit => (
                  <option key={unit} value={unit}>{unit}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Last Purchase Price</label>
              <input
                type="number"
                value={formData.lastPurchasePrice}
                onChange={(e) => handleInputChange('lastPurchasePrice', Number(e.target.value))}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.lastPurchasePrice ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="0.00"
                min="0"
                step="0.01"
              />
              {errors.lastPurchasePrice && <p className="text-red-500 text-xs mt-1">{errors.lastPurchasePrice}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Reorder Point</label>
              <input
                type="number"
                value={formData.reorderPoint}
                onChange={(e) => handleInputChange('reorderPoint', Number(e.target.value))}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.reorderPoint ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="0"
                min="0"
              />
              {errors.reorderPoint && <p className="text-red-500 text-xs mt-1">{errors.reorderPoint}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Initial Stock Quantity</label>
              <input
                type="number"
                value={formData.initialStock}
                onChange={(e) => handleInputChange('initialStock', Number(e.target.value))}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.initialStock ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="0"
                min="0"
              />
              {errors.initialStock && <p className="text-red-500 text-xs mt-1">{errors.initialStock}</p>}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                rows={3}
                className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Additional notes about the item..."
              />
            </div>
          </div>

          {/* Summary */}
          <div className="mt-6 bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">Summary</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Estimated Value:</span>
                <span className="ml-2 font-medium text-green-600">
                  ${(formData.initialStock * formData.lastPurchasePrice).toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Status:</span>
                <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  formData.initialStock > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {formData.initialStock > 0 ? 'In Stock' : 'Out of Stock'}
                </span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Saving...' : (editingItem ? 'Update Item' : 'Create Item')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
