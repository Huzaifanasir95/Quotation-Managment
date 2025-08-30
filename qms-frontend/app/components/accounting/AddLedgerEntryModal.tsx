'use client';

import { useState } from 'react';

interface AddLedgerEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddLedgerEntryModal({ isOpen, onClose }: AddLedgerEntryModalProps) {
  const [entryData, setEntryData] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'manual',
    accountType: 'Expense',
    reference: '',
    customerVendor: '',
    description: '',
    debit: 0,
    credit: 0,
    taxAmount: 0,
    taxType: 'GST',
    notes: '',
    attachments: [] as File[]
  });
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [isProcessing, setIsProcessing] = useState(false);

  const entryTypes = [
    { value: 'manual', label: 'Manual Adjustment', icon: '✏️' },
    { value: 'correction', label: 'Correction Entry', icon: '🔄' },
    { value: 'reversal', label: 'Reversal Entry', icon: '↩️' },
    { value: 'opening', label: 'Opening Balance', icon: '🚪' },
    { value: 'closing', label: 'Closing Entry', icon: '🔒' }
  ];

  const accountTypes = [
    'Assets',
    'Liabilities',
    'Equity',
    'Revenue',
    'Expenses',
    'Cost of Goods Sold',
    'Other Income',
    'Other Expenses'
  ];

  const taxTypes = [
    'GST',
    'VAT',
    'Sales Tax',
    'Withholding Tax',
    'Custom Duty',
    'None'
  ];

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

    if (!entryData.date) newErrors.date = 'Date is required';
    if (!entryData.accountType) newErrors.accountType = 'Account type is required';
    if (!entryData.reference.trim()) newErrors.reference = 'Reference is required';
    if (!entryData.description.trim()) newErrors.description = 'Description is required';
    
    // Either debit or credit must be greater than 0, but not both
    if (entryData.debit <= 0 && entryData.credit <= 0) {
      newErrors.debit = 'Either debit or credit amount must be greater than 0';
    }
    if (entryData.debit > 0 && entryData.credit > 0) {
      newErrors.debit = 'Cannot have both debit and credit amounts';
    }

    // Validate tax amount
    if (entryData.taxAmount < 0) newErrors.taxAmount = 'Tax amount cannot be negative';
    if (entryData.taxAmount > 0 && entryData.taxType === 'None') {
      newErrors.taxType = 'Tax type must be selected when tax amount is specified';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsProcessing(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const ledgerEntry = {
        ...entryData,
        id: `LE-${Date.now()}`,
        timestamp: new Date().toISOString(),
        userId: 'Current User',
        balance: entryData.credit - entryData.debit,
        fbrSync: 'Pending',
        auditTrail: [
          { action: 'Created', user: 'Current User', timestamp: new Date().toISOString() }
        ]
      };
      
      console.log('Processing ledger entry:', ledgerEntry);
      
      alert('Ledger entry added successfully!');
      onClose();
      
      // Reset form
      setEntryData({
        date: new Date().toISOString().split('T')[0],
        type: 'manual',
        accountType: 'Expense',
        reference: '',
        customerVendor: '',
        description: '',
        debit: 0,
        credit: 0,
        taxAmount: 0,
        taxType: 'GST',
        notes: '',
        attachments: []
      });
      setErrors({});
    } catch (error) {
      console.error('Failed to add ledger entry:', error);
      alert('Failed to add ledger entry. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setEntryData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setEntryData(prev => ({ ...prev, attachments: [...prev.attachments, ...files] }));
  };

  const removeAttachment = (index: number) => {
    setEntryData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
  };

  const getAccountTypeColor = (type: string) => {
    switch (type) {
      case 'Assets': return 'text-blue-600';
      case 'Liabilities': return 'text-red-600';
      case 'Equity': return 'text-purple-600';
      case 'Revenue': return 'text-green-600';
      case 'Expenses': return 'text-orange-600';
      case 'Cost of Goods Sold': return 'text-red-600';
      case 'Other Income': return 'text-green-600';
      case 'Other Expenses': return 'text-orange-600';
      default: return 'text-gray-600';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Add Ledger Entry</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* Entry Type Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">Entry Type *</label>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {entryTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => handleInputChange('type', type.value)}
                  className={`p-3 border rounded-lg text-center transition-colors duration-200 ${
                    entryData.type === type.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="text-lg mb-1">{type.icon}</div>
                  <div className="text-xs font-medium">{type.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date *</label>
              <input
                type="date"
                value={entryData.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.date ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Account Type *</label>
              <select
                value={entryData.accountType}
                onChange={(e) => handleInputChange('accountType', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.accountType ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                {accountTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              {errors.accountType && <p className="text-red-500 text-xs mt-1">{errors.accountType}</p>}
            </div>
          </div>

          {/* Reference and Description */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Reference *</label>
              <input
                type="text"
                value={entryData.reference}
                onChange={(e) => handleInputChange('reference', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.reference ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="e.g., ADJ-2024-001, COR-2024-001"
              />
              {errors.reference && <p className="text-red-500 text-xs mt-1">{errors.reference}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Customer/Vendor</label>
              <input
                type="text"
                value={entryData.customerVendor}
                onChange={(e) => handleInputChange('customerVendor', e.target.value)}
                className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Leave empty if not applicable"
              />
            </div>
          </div>

          {/* Description */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
            <textarea
              value={entryData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.description ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Detailed description of this ledger entry..."
            />
            {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
          </div>

          {/* Amounts */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Debit Amount</label>
              <input
                type="number"
                value={entryData.debit}
                onChange={(e) => handleInputChange('debit', Number(e.target.value))}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.debit ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="0.00"
                min="0"
                step="0.01"
              />
              {errors.debit && <p className="text-red-500 text-xs mt-1">{errors.debit}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Credit Amount</label>
              <input
                type="number"
                value={entryData.credit}
                onChange={(e) => handleInputChange('credit', Number(e.target.value))}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.credit ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="0.00"
                min="0"
                step="0.01"
              />
              {errors.credit && <p className="text-red-500 text-xs mt-1">{errors.credit}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Net Amount</label>
              <div className="px-3 text-black py-2 bg-gray-50 border border-gray-300 rounded-lg">
                <span className={`text-lg font-medium ${
                  entryData.credit - entryData.debit >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  ${Math.abs(entryData.credit - entryData.debit).toFixed(2)}
                </span>
                <span className="text-sm text-gray-500 ml-2">
                  {entryData.credit - entryData.debit >= 0 ? 'Credit' : 'Debit'}
                </span>
              </div>
            </div>
          </div>

          {/* Tax Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tax Amount</label>
              <input
                type="number"
                value={entryData.taxAmount}
                onChange={(e) => handleInputChange('taxAmount', Number(e.target.value))}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.taxAmount ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="0.00"
                min="0"
                step="0.01"
              />
              {errors.taxAmount && <p className="text-red-500 text-xs mt-1">{errors.taxAmount}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tax Type</label>
              <select
                value={entryData.taxType}
                onChange={(e) => handleInputChange('taxType', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.taxType ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                {taxTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              {errors.taxType && <p className="text-red-500 text-xs mt-1">{errors.taxType}</p>}
            </div>
          </div>

          {/* Attachments */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Attachments</label>
            <input
              type="file"
              multiple
              onChange={handleFileUpload}
              className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
            />
            {entryData.attachments.length > 0 && (
              <div className="mt-3 space-y-2">
                {entryData.attachments.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-700">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Additional Notes</label>
            <textarea
              value={entryData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={3}
              className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Any additional notes or explanations..."
            />
          </div>

          {/* Preview */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h4 className="font-medium text-gray-900 mb-3">Entry Preview</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Account Type:</span>
                <span className={`ml-2 font-medium ${getAccountTypeColor(entryData.accountType)}`}>
                  {entryData.accountType}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Entry Type:</span>
                <span className="ml-2 font-medium">{entryData.type}</span>
              </div>
              <div>
                <span className="text-gray-600">Reference:</span>
                <span className="ml-2 font-medium">{entryData.reference}</span>
              </div>
              <div>
                <span className="text-gray-600">Date:</span>
                <span className="ml-2 font-medium">{entryData.date}</span>
              </div>
              <div>
                <span className="text-gray-600">Net Amount:</span>
                <span className={`ml-2 font-medium ${
                  entryData.credit - entryData.debit >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  ${Math.abs(entryData.credit - entryData.debit).toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Tax Amount:</span>
                <span className="ml-2 font-medium">${entryData.taxAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isProcessing}
            className="px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? 'Processing...' : 'Add Entry'}
          </button>
        </div>
      </div>
    </div>
  );
}
