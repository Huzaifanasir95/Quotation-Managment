'use client';

import { useState, useEffect } from 'react';
import apiClient, { ChartOfAccount } from '../../lib/api';

interface AddLedgerEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEntryAdded?: () => void;
}

export default function AddLedgerEntryModal({ isOpen, onClose, onEntryAdded }: AddLedgerEntryModalProps) {
  const [entryData, setEntryData] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'manual',
    reference: '',
    description: '',
    lines: [
      { accountId: '', debitAmount: 0, creditAmount: 0, description: '' },
      { accountId: '', debitAmount: 0, creditAmount: 0, description: '' }
    ]
  });
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  const entryTypes = [
    { value: 'manual', label: 'Manual Adjustment', icon: '✏️' },
    { value: 'correction', label: 'Correction Entry', icon: '🔄' },
    { value: 'reversal', label: 'Reversal Entry', icon: '↩️' },
    { value: 'opening', label: 'Opening Balance', icon: '🚪' },
    { value: 'closing', label: 'Closing Entry', icon: '🔒' }
  ];

  // Fetch chart of accounts
  useEffect(() => {
    const fetchAccounts = async () => {
      if (!isOpen) return;
      
      try {
        setLoadingAccounts(true);
        await apiClient.refreshToken();
        const response = await apiClient.getChartOfAccounts();
        
        if (response.success) {
          setAccounts(response.data.accounts || []);
        }
      } catch (error) {
        console.error('Failed to fetch chart of accounts:', error);
      } finally {
        setLoadingAccounts(false);
      }
    };
    
    fetchAccounts();
  }, [isOpen]);

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};
    
    if (!entryData.date) newErrors.date = 'Date is required';
    if (!entryData.description) newErrors.description = 'Description is required';
    
    // Validate each line
    entryData.lines.forEach((line, index) => {
      if (!line.accountId) {
        newErrors[`line${index}Account`] = 'Account is required';
      }
      if (line.debitAmount === 0 && line.creditAmount === 0) {
        newErrors[`line${index}Amount`] = 'Amount is required';
      }
      if (line.debitAmount > 0 && line.creditAmount > 0) {
        newErrors[`line${index}Amount`] = 'Cannot have both debit and credit';
      }
    });
    
    // Check if debits equal credits
    const totalDebits = entryData.lines.reduce((sum, line) => sum + line.debitAmount, 0);
    const totalCredits = entryData.lines.reduce((sum, line) => sum + line.creditAmount, 0);
    
    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      newErrors.balance = 'Total debits must equal total credits';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsProcessing(true);
    
    try {
      // Prepare ledger entry data for API
      const ledgerEntryData = {
        entry_date: entryData.date,
        reference_type: entryData.type,
        reference_number: entryData.reference || undefined,
        description: entryData.description,
        lines: entryData.lines.map(line => ({
          account_id: line.accountId,
          debit_amount: line.debitAmount,
          credit_amount: line.creditAmount,
          description: line.description || entryData.description
        }))
      };
      
      await apiClient.refreshToken();
      const response = await apiClient.createLedgerEntry(ledgerEntryData);
      
      if (response.success) {
        alert('Ledger entry added successfully!');
        onClose();
        
        // Call the callback to refresh parent data
        if (onEntryAdded) {
          onEntryAdded();
        }
        
        // Reset form
        setEntryData({
          date: new Date().toISOString().split('T')[0],
          type: 'manual',
          reference: '',
          description: '',
          lines: [
            { accountId: '', debitAmount: 0, creditAmount: 0, description: '' },
            { accountId: '', debitAmount: 0, creditAmount: 0, description: '' }
          ]
        });
        setErrors({});
      } else {
        throw new Error(response.error || 'Failed to create ledger entry');
      }
    } catch (error: any) {
      console.error('Failed to add ledger entry:', error);
      alert(`Failed to add ledger entry: ${error.message}`);
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
  
  const handleLineChange = (index: number, field: string, value: string | number) => {
    setEntryData(prev => ({
      ...prev,
      lines: prev.lines.map((line, i) => 
        i === index ? { ...line, [field]: value } : line
      )
    }));
    
    // Clear line-specific errors
    const errorKey = `line${index}${field.charAt(0).toUpperCase() + field.slice(1)}`;
    if (errors[errorKey]) {
      setErrors(prev => ({ ...prev, [errorKey]: '' }));
    }
  };
  
  const addLine = () => {
    setEntryData(prev => ({
      ...prev,
      lines: [...prev.lines, { accountId: '', debitAmount: 0, creditAmount: 0, description: '' }]
    }));
  };
  
  const removeLine = (index: number) => {
    if (entryData.lines.length > 2) {
      setEntryData(prev => ({
        ...prev,
        lines: prev.lines.filter((_, i) => i !== index)
      }));
    }
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
    <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50 p-4" style={{ backdropFilter: 'blur(4px)' }}>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Reference</label>
              <input
                type="text"
                value={entryData.reference}
                onChange={(e) => handleInputChange('reference', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., ADJ-2024-001, COR-2024-001"
              />
            </div>
          </div>

          {/* Description */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
            <textarea
              value={entryData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={2}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.description ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Detailed description of this ledger entry..."
            />
            {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
          </div>

          {/* Ledger Lines */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-medium text-gray-700">Ledger Lines *</label>
              <button
                type="button"
                onClick={addLine}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                + Add Line
              </button>
            </div>
            
            {loadingAccounts ? (
              <div className="text-center py-4">
                <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-sm text-gray-500">Loading accounts...</span>
              </div>
            ) : (
              <div className="space-y-4">
                {entryData.lines.map((line, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900">Line {index + 1}</h4>
                      {entryData.lines.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeLine(index)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="lg:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Account *</label>
                        <select
                          value={line.accountId}
                          onChange={(e) => handleLineChange(index, 'accountId', e.target.value)}
                          className={`w-full text-black px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                            errors[`line${index}Account`] ? 'border-red-500' : 'border-gray-300'
                          }`}
                        >
                          <option value="">Select account...</option>
                          {accounts.map(account => (
                            <option key={account.id} value={account.id}>
                              {account.account_code} - {account.account_name}
                            </option>
                          ))}
                        </select>
                        {errors[`line${index}Account`] && <p className="text-red-500 text-xs mt-1">{errors[`line${index}Account`]}</p>}
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Debit</label>
                        <input
                          type="number"
                          value={line.debitAmount}
                          onChange={(e) => handleLineChange(index, 'debitAmount', Number(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Credit</label>
                        <input
                          type="number"
                          value={line.creditAmount}
                          onChange={(e) => handleLineChange(index, 'creditAmount', Number(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                        />
                      </div>
                    </div>
                    
                    <div className="mt-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Line Description</label>
                      <input
                        type="text"
                        value={line.description}
                        onChange={(e) => handleLineChange(index, 'description', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Optional line-specific description"
                      />
                    </div>
                    
                    {errors[`line${index}Amount`] && <p className="text-red-500 text-xs mt-2">{errors[`line${index}Amount`]}</p>}
                  </div>
                ))}
                
                {/* Balance Summary */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-sm text-gray-600">Total Debits</p>
                      <p className="text-lg font-semibold text-red-600">
                        ${entryData.lines.reduce((sum, line) => sum + line.debitAmount, 0).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Credits</p>
                      <p className="text-lg font-semibold text-green-600">
                        ${entryData.lines.reduce((sum, line) => sum + line.creditAmount, 0).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Difference</p>
                      <p className={`text-lg font-semibold ${
                        Math.abs(entryData.lines.reduce((sum, line) => sum + line.debitAmount, 0) - 
                                 entryData.lines.reduce((sum, line) => sum + line.creditAmount, 0)) < 0.01 
                          ? 'text-green-600' : 'text-red-600'
                      }`}>
                        ${Math.abs(entryData.lines.reduce((sum, line) => sum + line.debitAmount, 0) - 
                                   entryData.lines.reduce((sum, line) => sum + line.creditAmount, 0)).toFixed(2)}
                      </p>
                    </div>
                  </div>
                  {errors.balance && <p className="text-red-500 text-sm mt-2 text-center">{errors.balance}</p>}
                </div>
              </div>
            )}

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
