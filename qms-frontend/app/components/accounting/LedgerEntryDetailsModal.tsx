'use client';

import { useState } from 'react';

interface LedgerEntryDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry: any;
}

export default function LedgerEntryDetailsModal({ isOpen, onClose, entry }: LedgerEntryDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'taxes' | 'fbr' | 'audit'>('overview');

  if (!isOpen || !entry) return null;

  const getFBRStatusColor = (status: string) => {
    switch (status) {
      case 'Synced': return 'bg-green-100 text-green-800';
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      case 'Failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getFBRStatusIcon = (status: string) => {
    switch (status) {
      case 'Synced': return '✔';
      case 'Pending': return '⏳';
      case 'Failed': return '❌';
      default: return '⚠️';
    }
  };

  const getEntryTypeColor = (type: string) => {
    switch (type) {
      case 'Sale': return 'bg-green-100 text-green-800';
      case 'Purchase': return 'bg-red-100 text-red-800';
      case 'Expense': return 'bg-orange-100 text-orange-800';
      case 'Payment': return 'bg-blue-100 text-blue-800';
      case 'Receipt': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📋' },
    { id: 'transactions', label: 'Linked Transactions', icon: '🔗' },
    { id: 'taxes', label: 'Tax Breakdown', icon: '💰' },
    { id: 'fbr', label: 'FBR Status', icon: '📡' },
    { id: 'audit', label: 'Audit Trail', icon: '📝' }
  ];

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Ledger Entry Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        {/* Entry Header */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{entry.id}</h3>
              <p className="text-sm text-gray-600">{entry.description}</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">
                ${Math.abs(entry.credit - entry.debit).toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">
                {entry.credit > entry.debit ? 'Credit' : 'Debit'}
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex space-x-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                  activeTab === tab.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Entry Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Entry ID:</span>
                      <span className="font-medium">{entry.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date:</span>
                      <span className="font-medium">{entry.date}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Type:</span>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getEntryTypeColor(entry.type)}`}>
                        {entry.type}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Account Type:</span>
                      <span className={`font-medium ${getAccountTypeColor(entry.accountType)}`}>
                        {entry.accountType}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Reference:</span>
                      <span className="font-medium text-blue-600">{entry.reference}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Financial Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Debit Amount:</span>
                      <span className={`font-medium ${entry.debit > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                        {entry.debit > 0 ? `$${entry.debit.toLocaleString()}` : '-'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Credit Amount:</span>
                      <span className={`font-medium ${entry.credit > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                        {entry.credit > 0 ? `$${entry.credit.toLocaleString()}` : '-'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Net Amount:</span>
                      <span className={`font-medium text-lg ${entry.credit - entry.debit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${Math.abs(entry.credit - entry.debit).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Balance:</span>
                      <span className={`font-medium ${entry.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${entry.balance.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Additional Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Customer/Vendor</label>
                    <p className="text-sm text-gray-900">{entry.customerVendor || 'Not specified'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <p className="text-sm text-gray-900">{entry.description}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Linked Transactions Tab */}
          {activeTab === 'transactions' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-3">Transaction Chain</h4>
                <p className="text-sm text-blue-800">
                  This ledger entry is linked to the following business transactions in chronological order:
                </p>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h4 className="font-medium text-gray-900">Linked Transactions</h4>
                </div>
                <div className="overflow-x-auto">
                  {entry.linkedTransactions && entry.linkedTransactions.length > 0 ? (
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transaction ID</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {entry.linkedTransactions.map((transactionId: string, index: number) => {
                          // Mock transaction data - in real app, fetch from API
                          const mockTransaction = {
                            id: transactionId,
                            type: transactionId.startsWith('Q') ? 'Quotation' : 
                                  transactionId.startsWith('SO') ? 'Sales Order' :
                                  transactionId.startsWith('INV') ? 'Invoice' :
                                  transactionId.startsWith('PO') ? 'Purchase Order' :
                                  transactionId.startsWith('DC') ? 'Delivery Challan' : 'Other',
                            status: ['Draft', 'Pending', 'Approved', 'Completed'][Math.floor(Math.random() * 4)],
                            amount: Math.floor(Math.random() * 10000) + 1000
                          };

                          return (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-blue-600 hover:text-blue-800 cursor-pointer">
                                  {transactionId}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                                  {mockTransaction.type}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  mockTransaction.status === 'Completed' ? 'bg-green-100 text-green-800' :
                                  mockTransaction.status === 'Approved' ? 'bg-blue-100 text-blue-800' :
                                  mockTransaction.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {mockTransaction.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">
                                  ${mockTransaction.amount.toLocaleString()}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <button className="text-blue-600 hover:text-blue-700 font-medium">
                                  View Details
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-500">No linked transactions found.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tax Breakdown Tab */}
          {activeTab === 'taxes' && (
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-medium text-green-900 mb-3">Tax Information</h4>
                <p className="text-sm text-green-800">
                  Detailed breakdown of taxes applied to this transaction.
                </p>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-4">Tax Summary</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Subtotal:</span>
                        <span className="font-medium">${(entry.taxBreakdown?.subtotal || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">GST:</span>
                        <span className="font-medium text-green-600">${(entry.taxBreakdown?.gst || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Other Taxes:</span>
                        <span className="font-medium text-orange-600">$0.00</span>
                      </div>
                      <div className="border-t pt-3">
                        <div className="flex justify-between">
                          <span className="text-gray-900 font-medium">Total:</span>
                          <span className="text-gray-900 font-bold text-lg">${(entry.taxBreakdown?.total || 0).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-4">Tax Details</h4>
                    <div className="space-y-3">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="text-sm text-gray-600">Tax Rate</div>
                        <div className="text-lg font-medium">15% GST</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="text-sm text-gray-600">Tax Calculation</div>
                        <div className="text-sm font-medium">
                          ${(entry.taxBreakdown?.subtotal || 0).toLocaleString()} × 15% = ${(entry.taxBreakdown?.gst || 0).toLocaleString()}
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="text-sm text-gray-600">Tax Category</div>
                        <div className="text-sm font-medium">Standard Rate</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* FBR Status Tab */}
          {activeTab === 'fbr' && (
            <div className="space-y-6">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h4 className="font-medium text-purple-900 mb-3">FBR Integration Status</h4>
                <p className="text-sm text-purple-800">
                  Federal Board of Revenue (FBR) synchronization status and details.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="font-medium text-gray-900 mb-4">Sync Status</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Current Status:</span>
                      <span className={`inline-flex items-center px-3 py-1 text-sm font-semibold rounded-full ${getFBRStatusColor(entry.fbrSync)}`}>
                        <span className="mr-2">{getFBRStatusIcon(entry.fbrSync)}</span>
                        {entry.fbrSync}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Last Sync Attempt:</span>
                      <span className="text-sm text-gray-900">
                        {entry.fbrSync === 'Synced' ? '2 hours ago' : 
                         entry.fbrSync === 'Pending' ? '5 minutes ago' : '1 day ago'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Next Sync:</span>
                      <span className="text-sm text-gray-900">
                        {entry.fbrSync === 'Synced' ? 'Not scheduled' : 
                         entry.fbrSync === 'Pending' ? 'In 10 minutes' : 'Retry in 1 hour'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="font-medium text-gray-900 mb-4">FBR Details</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">FBR Invoice Number:</span>
                      <span className="text-sm font-medium text-gray-900">
                        {entry.fbrSync === 'Synced' ? 'FBR-2024-001234' : 'Not assigned'}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">POS ID:</span>
                      <span className="text-sm font-medium text-gray-900">POS-001</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Integration Type:</span>
                      <span className="text-sm font-medium text-gray-900">Real-time API</span>
                    </div>
                  </div>
                </div>
              </div>

              {entry.fbrSync === 'Failed' && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-medium text-red-900 mb-3">Sync Error Details</h4>
                  <div className="space-y-2 text-sm text-red-800">
                    <p><strong>Error Code:</strong> FBR_001</p>
                    <p><strong>Error Message:</strong> Invalid tax calculation or missing required fields</p>
                    <p><strong>Recommended Action:</strong> Verify tax breakdown and retry synchronization</p>
                  </div>
                </div>
              )}

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="font-medium text-gray-900 mb-4">Manual Actions</h4>
                <div className="flex space-x-3">
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200">
                    🔄 Retry Sync
                  </button>
                  <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200">
                    📤 Force Sync
                  </button>
                  <button className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200">
                    📋 View FBR Logs
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Audit Trail Tab */}
          {activeTab === 'audit' && (
            <div className="space-y-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-medium text-yellow-900 mb-3">Audit Trail</h4>
                <p className="text-sm text-yellow-800">
                  Complete history of all changes and actions performed on this ledger entry.
                </p>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h4 className="font-medium text-gray-900">Activity History</h4>
                </div>
                <div className="overflow-x-auto">
                  {entry.auditTrail && entry.auditTrail.length > 0 ? (
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {entry.auditTrail.map((audit: any, index: number) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                audit.action === 'Created' ? 'bg-green-100 text-green-800' :
                                audit.action === 'Modified' ? 'bg-blue-100 text-blue-800' :
                                audit.action === 'Deleted' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {audit.action}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{audit.user}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{formatDate(audit.timestamp)}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-900">
                                {audit.action === 'Created' ? 'Initial ledger entry creation' :
                                 audit.action === 'Modified' ? 'Entry details updated' :
                                 audit.action === 'Deleted' ? 'Entry marked for deletion' :
                                 'Action performed on entry'}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-500">No audit trail available.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="font-medium text-gray-900 mb-4">Audit Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Created By</label>
                    <p className="text-sm text-gray-900">{entry.auditTrail?.[0]?.user || 'System'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Created Date</label>
                    <p className="text-sm text-gray-900">
                      {entry.auditTrail?.[0]?.timestamp ? formatDate(entry.auditTrail[0].timestamp) : 'Unknown'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Last Modified</label>
                    <p className="text-sm text-gray-900">
                      {entry.auditTrail?.[entry.auditTrail.length - 1]?.timestamp ? 
                       formatDate(entry.auditTrail[entry.auditTrail.length - 1].timestamp) : 'Never'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Total Changes</label>
                    <p className="text-sm text-gray-900">{entry.auditTrail?.length || 0}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
