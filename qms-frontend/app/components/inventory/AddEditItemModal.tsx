'use client';

import { useState, useEffect } from 'react';
import { apiClient, ProductCategory } from '../../lib/api';

interface AddEditItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingItem?: any;
  onItemSaved?: () => void;
  categories?: ProductCategory[];
}

export default function AddEditItemModal({ isOpen, onClose, editingItem, onItemSaved, categories }: AddEditItemModalProps) {
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    description: '',
    category_id: '',
    type: 'finished_good' as 'raw_material' | 'finished_good' | 'service' | 'spare_parts',
    unit_of_measure: 'Piece',
    last_purchase_price: 0,
    reorder_point: 0,
    current_stock: 0,
    selling_price: 0,
    max_stock_level: 0
  });
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [isLoading, setIsLoading] = useState(false);

  const units = ['Piece', 'KG', 'Litre', 'Meter', 'Hour', 'Box', 'Set', 'Gram', 'Ton', 'Milliliter', 'Centimeter', 'Inch', 'Foot', 'Yard', 'Square Meter', 'Cubic Meter'];
  const productTypes = [
    { value: 'raw_material', label: 'Raw Material' },
    { value: 'finished_good', label: 'Finished Good' },
    { value: 'service', label: 'Service' },
    { value: 'spare_parts', label: 'Spare Parts' }
  ];
  
  // Get category options from props - don't use hardcoded fallback with invalid IDs
  const categoryOptions = categories && categories.length > 0 ? categories : [];

  useEffect(() => {
    if (editingItem) {
      setFormData({
        sku: editingItem.sku || '',
        name: editingItem.name || '',
        description: editingItem.description || '',
        category_id: editingItem.category_id || '',
        type: editingItem.type || 'finished_good',
        unit_of_measure: editingItem.unit_of_measure || 'Piece',
        last_purchase_price: editingItem.last_purchase_price || 0,
        reorder_point: editingItem.reorder_point || 0,
        current_stock: editingItem.current_stock || 0,
        selling_price: editingItem.selling_price || 0,
        max_stock_level: editingItem.max_stock_level || 0
      });
    } else {
      setFormData({
        sku: '',
        name: '',
        description: '',
        category_id: '',
        type: 'finished_good',
        unit_of_measure: 'Piece',
        last_purchase_price: 0,
        reorder_point: 0,
        current_stock: 0,
        selling_price: 0,
        max_stock_level: 0
      });
    }
    setErrors({});
  }, [editingItem, isOpen]);

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

    // Required fields validation
    if (!formData.sku.trim()) newErrors.sku = 'SKU is required';
    if (!formData.name.trim()) newErrors.name = 'Item name is required';
    if (!formData.type) newErrors.type = 'Product type is required';
    if (!formData.unit_of_measure.trim()) newErrors.unit_of_measure = 'Unit of measure is required';
    
    // Optional field validation
    if (formData.last_purchase_price < 0) newErrors.last_purchase_price = 'Price cannot be negative';
    if (formData.selling_price < 0) newErrors.selling_price = 'Selling price cannot be negative';
    if (formData.reorder_point < 0) newErrors.reorder_point = 'Reorder point cannot be negative';
    if (formData.current_stock < 0) newErrors.current_stock = 'Stock cannot be negative';
    if (formData.max_stock_level < 0) newErrors.max_stock_level = 'Max stock level cannot be negative';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    
    try {
      // Only include category_id if it's selected
      const productData: any = {
        sku: formData.sku,
        name: formData.name,
        type: formData.type,
        unit_of_measure: formData.unit_of_measure,
        current_stock: formData.current_stock,
        reorder_point: formData.reorder_point,
        status: 'active'
      };

      // Add optional fields only if they have values
      if (formData.description) productData.description = formData.description;
      if (formData.category_id) productData.category_id = formData.category_id;
      if (formData.max_stock_level > 0) productData.max_stock_level = formData.max_stock_level;
      if (formData.last_purchase_price > 0) productData.last_purchase_price = formData.last_purchase_price;
      if (formData.selling_price > 0) productData.selling_price = formData.selling_price;
      
      let response;
      if (editingItem) {
        response = await apiClient.updateProduct(editingItem.id, productData);
      } else {
        response = await apiClient.createProduct(productData);
      }
      
      if (response.success) {
        alert(editingItem ? 'Item updated successfully!' : 'Item created successfully!');
        
        // Call callback to refresh data
        if (onItemSaved) {
          onItemSaved();
        }
        
        onClose();
        
        // Reset form for new items
        if (!editingItem) {
          setFormData({
            sku: '',
            name: '',
            description: '',
            category_id: '',
            type: 'finished_good',
            unit_of_measure: 'Piece',
            last_purchase_price: 0,
            reorder_point: 0,
            current_stock: 0,
            selling_price: 0,
            max_stock_level: 0
          });
        }
        setErrors({});
      } else {
        console.error('Failed to save item:', response);
        
        // Try to extract validation errors from response
        if (response.details && Array.isArray(response.details)) {
          const errorMessages = response.details.map((err: any) => 
            `${err.field}: ${err.message}`
          ).join('\n');
          alert(`Failed to save item:\n${errorMessages}`);
        } else {
          alert(`Failed to save item: ${response.message || 'Unknown error'}`);
        }
      }
    } catch (error) {
      console.error('Failed to save item:', error);
      
      // Try to parse error message if it's from API response
      let errorMessage = 'Please try again.';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      alert(`Failed to save item: ${errorMessage}`);
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
  <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backdropFilter: 'blur(4px)' }}>
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
                className={`w-full px-3 py-2 border text-black rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
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
                className={`w-full px-3 py-2 border text-black rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
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
                value={formData.category_id}
                onChange={(e) => handleInputChange('category_id', e.target.value)}
                className={`w-full text-black px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.category_id ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Select category (optional)</option>
                {categoryOptions.length > 0 ? (
                  categoryOptions.map(category => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))
                ) : (
                  <option value="" disabled>No categories available</option>
                )}
              </select>
              {categoryOptions.length === 0 && (
                <p className="mt-1 text-sm text-orange-600">
                  No categories found. Categories can be managed from the admin panel.
                </p>
              )}
              {errors.category_id && <p className="text-red-500 text-xs mt-1">{errors.category_id}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Product Type</label>
              <select
                value={formData.type}
                onChange={(e) => handleInputChange('type', e.target.value)}
                className={`w-full text-black px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.type ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                {productTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
              {errors.type && <p className="text-red-500 text-xs mt-1">{errors.type}</p>}
            </div>

            {/* Stock & Pricing */}
            <div className="md:col-span-2">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Stock & Pricing</h3>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Unit of Measure</label>
              <select
                value={formData.unit_of_measure}
                onChange={(e) => handleInputChange('unit_of_measure', e.target.value)}
                className={`w-full text-black px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.unit_of_measure ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                {units.map(unit => (
                  <option key={unit} value={unit}>{unit}</option>
                ))}
              </select>
              {errors.unit_of_measure && <p className="text-red-500 text-xs mt-1">{errors.unit_of_measure}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Last Purchase Price</label>
              <input
                type="number"
                value={formData.last_purchase_price}
                onChange={(e) => handleInputChange('last_purchase_price', Number(e.target.value))}
                className={`w-full px-3 py-2 text-black border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.last_purchase_price ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="0.00"
                min="0"
                step="0.01"
              />
              {errors.last_purchase_price && <p className="text-red-500 text-xs mt-1">{errors.last_purchase_price}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Selling Price</label>
              <input
                type="number"
                value={formData.selling_price}
                onChange={(e) => handleInputChange('selling_price', Number(e.target.value))}
                className="w-full px-3 py-2 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Reorder Point</label>
              <input
                type="number"
                value={formData.reorder_point}
                onChange={(e) => handleInputChange('reorder_point', Number(e.target.value))}
                className={`w-full px-3 py-2 text-black border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.reorder_point ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="0"
                min="0"
              />
              {errors.reorder_point && <p className="text-red-500 text-xs mt-1">{errors.reorder_point}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Current Stock</label>
              <input
                type="number"
                value={formData.current_stock}
                onChange={(e) => handleInputChange('current_stock', Number(e.target.value))}
                className={`w-full px-3 py-2 text-black border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.current_stock ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="0"
                min="0"
                step="0.001"
              />
              {errors.current_stock && <p className="text-red-500 text-xs mt-1">{errors.current_stock}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Max Stock Level</label>
              <input
                type="number"
                value={formData.max_stock_level}
                onChange={(e) => handleInputChange('max_stock_level', Number(e.target.value))}
                className={`w-full px-3 py-2 text-black border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.max_stock_level ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="0"
                min="0"
                step="0.001"
              />
              {errors.max_stock_level && <p className="text-red-500 text-xs mt-1">{errors.max_stock_level}</p>}
            </div>

          </div>

          {/* Summary */}
          <div className="mt-6 bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">Summary</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Estimated Value:</span>
                <span className="ml-2 font-medium text-green-600">
                  Rs. {(formData.current_stock * formData.last_purchase_price).toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Status:</span>
                <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  formData.current_stock > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {formData.current_stock > 0 ? 'In Stock' : 'Out of Stock'}
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
