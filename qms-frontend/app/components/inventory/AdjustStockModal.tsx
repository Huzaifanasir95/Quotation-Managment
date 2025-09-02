'use client';

import { useState } from 'react';
import { apiClient } from '../../lib/api';

interface AdjustStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: any;
  onStockAdjusted?: () => void;
}

export default function AdjustStockModal({ isOpen, onClose, item, onStockAdjusted }: AdjustStockModalProps) {
  const [adjustmentData, setAdjustmentData] = useState({
    type: 'increase',
    quantity: 0,
    reason: '',
    reference: '',
    notes: ''
  });
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [isProcessing, setIsProcessing] = useState(false);

  const adjustmentTypes = [
    { value: 'increase', label: 'Increase Stock', icon: '+', color: 'bg-green-700 hover:bg-green-800 text-white' },
    { value: 'decrease', label: 'Decrease Stock', icon: '-', color: 'bg-red-700 hover:bg-red-800 text-white' },
    { value: 'correction', label: 'Stock Correction', icon: '↻', color: 'bg-blue-700 hover:bg-blue-800 text-white' },
    { value: 'damage', label: 'Damaged/Lost', icon: '⚠', color: 'bg-orange-700 hover:bg-orange-800 text-white' },
    { value: 'return', label: 'Return/Refund', icon: '↩', color: 'bg-purple-700 hover:bg-purple-800 text-white' }
  ];

  const commonReasons = [
    'Physical count adjustment',
    'Damaged goods',
    'Quality control rejection',
    'Theft/Loss',
    'Return from customer',
    'Vendor return',
    'Production consumption',
    'Manual correction'
  ];

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

    if (adjustmentData.quantity < 0) {
      newErrors.quantity = 'Quantity cannot be negative';
    } else if (adjustmentData.type === 'correction' && adjustmentData.quantity === 0) {
      newErrors.quantity = 'Correction quantity must be greater than 0';
    } else if (adjustmentData.type !== 'correction' && adjustmentData.quantity <= 0) {
      newErrors.quantity = 'Quantity must be greater than 0';
    }
    
    if (!adjustmentData.reason.trim()) newErrors.reason = 'Reason is required';
    if (!adjustmentData.reference.trim()) newErrors.reference = 'Reference is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsProcessing(true);
    
    try {
      // Calculate new stock level
      let newStock;
      if (adjustmentData.type === 'correction') {
        newStock = adjustmentData.quantity;
      } else if (adjustmentData.type === 'increase') {
        newStock = (item?.current_stock || 0) + adjustmentData.quantity;
      } else {
        newStock = Math.max(0, (item?.current_stock || 0) - adjustmentData.quantity);
      }

      // Create stock movement record
      let movementType = 'adjustment_in';
      let adjustmentQuantity = adjustmentData.quantity;
      
      // Determine movement type based on adjustment type
      if (adjustmentData.type === 'correction') {
        // For correction, we need to calculate the difference
        const currentStock = item?.current_stock || 0;
        if (adjustmentData.quantity > currentStock) {
          movementType = 'adjustment_in';
          adjustmentQuantity = adjustmentData.quantity - currentStock;
        } else if (adjustmentData.quantity < currentStock) {
          movementType = 'adjustment_out';
          adjustmentQuantity = currentStock - adjustmentData.quantity;
        } else {
          // No change needed
          alert('No adjustment needed - new stock level is same as current.');
          setIsProcessing(false);
          return;
        }
      } else if (['decrease', 'damage', 'return'].includes(adjustmentData.type)) {
        movementType = 'adjustment_out';
      } else {
        movementType = 'adjustment_in';
      }

      const stockMovementData = {
        product_id: item.id,
        movement_type: movementType,
        quantity: adjustmentQuantity,
        reference_type: 'adjustment',
        reference_id: adjustmentData.reference,
        notes: `${adjustmentData.reason}${adjustmentData.notes ? ` - ${adjustmentData.notes}` : ''}`,
        unit_cost: item.last_purchase_price || 0,
        movement_date: new Date().toISOString()
      };
      
      const response = await apiClient.createStockMovement(stockMovementData);
      
      if (response.success) {
        alert(`Stock adjustment processed successfully! New stock level: ${response.data.new_stock_level} ${item?.unit_of_measure || 'units'}`);
        
        // Call callback to refresh data if provided
        if (onStockAdjusted) {
          onStockAdjusted();
        }
        
        onClose();
        
        // Reset form
        setAdjustmentData({
          type: 'increase',
          quantity: 0,
          reason: '',
          reference: '',
          notes: ''
        });
        setErrors({});
      } else {
        throw new Error(response.message || 'Failed to process stock adjustment');
      }
    } catch (error) {
      console.error('Failed to process stock adjustment:', error);
      alert(`Failed to process stock adjustment: ${error instanceof Error ? error.message : 'Please try again.'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setAdjustmentData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const getNewStockLevel = () => {
    if (!item || typeof item.current_stock !== 'number') return 0;
    
    if (adjustmentData.type === 'correction') {
      return adjustmentData.quantity;
    } else if (adjustmentData.type === 'increase') {
      return item.current_stock + adjustmentData.quantity;
    } else if (['decrease', 'damage', 'return'].includes(adjustmentData.type)) {
      return Math.max(0, item.current_stock - adjustmentData.quantity);
    }
    return item.current_stock;
  };

  const getStockStatus = (stockLevel: number) => {
    if (!item || typeof item.reorder_point !== 'number') return { status: 'Unknown', color: 'text-gray-600', bg: 'bg-gray-100' };
    
    if (stockLevel === 0) return { status: 'Out of Stock', color: 'text-red-600', bg: 'bg-red-100' };
    if (stockLevel <= item.reorder_point) return { status: 'Low Stock', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    return { status: 'In Stock', color: 'text-green-600', bg: 'bg-green-100' };
  };

  const newStockLevel = getNewStockLevel();
  const newStockStatus = getStockStatus(newStockLevel);

  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                 <div className="flex items-center justify-between p-6 border-b border-gray-200">
           <h2 className="text-2xl font-bold text-gray-900">Adjust Stock - {item?.name || 'Unknown Item'}</h2>
           <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
         </div>

        <div className="p-6">
          {/* Current Stock Info */}
          <div className="bg-gray-800 text-white rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-white mb-3">Current Stock Information</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-300">Current Stock:</span>
                <span className="ml-2 font-medium text-white">{item?.current_stock || 0} {item?.unit_of_measure || 'units'}</span>
              </div>
              <div>
                <span className="text-gray-300">Reorder Point:</span>
                <span className="ml-2 font-medium text-white">{item?.reorder_point || 0} {item?.unit_of_measure || 'units'}</span>
              </div>
              <div>
                <span className="text-gray-300">Unit Cost:</span>
                <span className="ml-2 font-medium text-white">${(item?.last_purchase_price || 0).toFixed(2)}</span>
              </div>
              <div>
                <span className="text-gray-300">Total Value:</span>
                <span className="ml-2 font-medium text-white">${((item?.current_stock || 0) * (item?.last_purchase_price || 0)).toLocaleString()}</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Adjustment Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Adjustment Type *</label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {adjustmentTypes.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => handleInputChange('type', type.value)}
                    className={`p-4 rounded-lg text-center transition-all duration-200 font-medium border-2 ${
                      adjustmentData.type === type.value
                        ? `${type.color} border-gray-800 shadow-lg`
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-700 border-gray-300'
                    }`}
                  >
                    <div className="text-xl mb-2">{type.icon}</div>
                    <div className="text-xs font-semibold">{type.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {adjustmentData.type === 'correction' ? 'New Stock Level *' : 'Quantity *'}
              </label>
              <input
                type="number"
                value={adjustmentData.quantity}
                onChange={(e) => handleInputChange('quantity', Number(e.target.value))}
                className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-all duration-200 bg-white ${
                  errors.quantity ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder={adjustmentData.type === 'correction' ? 'Enter new stock level' : 'Enter quantity to adjust'}
                min={adjustmentData.type === 'correction' ? '0' : '0'}
                step="0.01"
              />
              {adjustmentData.type === 'correction' && (
                <p className="text-xs text-gray-600 mt-1">
                  Current stock: {item?.current_stock || 0} {item?.unit_of_measure || 'units'}
                </p>
              )}
              {errors.quantity && <p className="text-red-500 text-xs mt-1">{errors.quantity}</p>}
            </div>

            {/* Reason */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Reason for Adjustment *</label>
              <select
                value={adjustmentData.reason}
                onChange={(e) => handleInputChange('reason', e.target.value)}
                className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-all duration-200 bg-white ${
                  errors.reason ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Select a reason</option>
                {commonReasons.map(reason => (
                  <option key={reason} value={reason}>{reason}</option>
                ))}
              </select>
              {errors.reason && <p className="text-red-500 text-xs mt-1">{errors.reason}</p>}
            </div>

            {/* Reference */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Reference Number/ID *</label>
              <input
                type="text"
                value={adjustmentData.reference}
                onChange={(e) => handleInputChange('reference', e.target.value)}
                className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-all duration-200 bg-white ${
                  errors.reference ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="e.g., PO-2024-001, SO-2024-001, or manual adjustment ID"
              />
              {errors.reference && <p className="text-red-500 text-xs mt-1">{errors.reference}</p>}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Additional Notes</label>
              <textarea
                value={adjustmentData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                rows={3}
                className="w-full text-black px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-all duration-200 bg-white"
                placeholder="Additional details about this adjustment..."
              />
            </div>

            {/* Preview */}
            <div className="bg-gray-100 border-2 border-gray-300 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3">Adjustment Preview</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-700 font-medium">Current Stock:</span>
                  <span className="ml-2 font-semibold text-gray-900">{item?.current_stock || 0} {item?.unit_of_measure || 'units'}</span>
                </div>
                <div>
                  <span className="text-gray-700 font-medium">Adjustment:</span>
                  <span className={`ml-2 font-semibold ${
                    adjustmentData.type === 'correction' ? 'text-blue-700' :
                    adjustmentData.type === 'increase' ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {adjustmentData.type === 'correction' 
                      ? `Set to ${adjustmentData.quantity}` 
                      : `${adjustmentData.type === 'increase' ? '+' : '-'}${adjustmentData.quantity}`
                    } {item?.unit_of_measure || 'units'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-700 font-medium">New Stock:</span>
                  <span className="ml-2 font-semibold text-gray-900">{newStockLevel} {item?.unit_of_measure || 'units'}</span>
                </div>
                <div>
                  <span className="text-gray-700 font-medium">New Status:</span>
                  <span className={`ml-2 inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                    newStockStatus.status === 'In Stock' ? 'bg-green-700 text-white' :
                    newStockStatus.status === 'Low Stock' ? 'bg-yellow-600 text-white' :
                    'bg-red-700 text-white'
                  }`}>
                    {newStockStatus.status}
                  </span>
                </div>
              </div>

               {/* Stock Level Warning */}
               {newStockLevel <= (item?.reorder_point || 0) && (
                 <div className="mt-3 p-3 bg-yellow-600 text-white rounded-lg">
                   <div className="flex items-center space-x-2">
                     <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                     </svg>
                     <span className="text-sm font-medium">
                       Warning: New stock level ({newStockLevel}) is at or below reorder point ({item?.reorder_point || 0})
                     </span>
                   </div>
                 </div>
               )}

              {/* Out of Stock Warning */}
              {newStockLevel === 0 && (
                <div className="mt-3 p-3 bg-red-700 text-white rounded-lg">
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-medium">
                      Critical: This adjustment will result in zero stock
                    </span>
                  </div>
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-3 text-white bg-gray-700 border border-gray-700 rounded-lg hover:bg-gray-800 transition-all duration-200 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isProcessing}
            className="px-8 py-3 text-white bg-slate-700 rounded-lg hover:bg-slate-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {isProcessing ? 'Processing...' : 'Process Adjustment'}
          </button>
        </div>
      </div>
    </div>
  );
}
