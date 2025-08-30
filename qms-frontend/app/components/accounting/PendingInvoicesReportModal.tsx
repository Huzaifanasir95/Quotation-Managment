'use client';

import { useState } from 'react';

interface PendingInvoicesReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PendingInvoicesReportModal({ isOpen, onClose }: PendingInvoicesReportModalProps) {
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    customer: 'All',
    status: 'All',
    amountRange: 'All'
  });
  const [isExporting, setIsExporting] = useState(false);

  // Mock data for pending invoices
  const pendingInvoices = [
    {
      id: 'INV-2024-001',
      customer: 'ABC Corp',
      amount: 2500,
      dueDate: '2024-02-15',
      status: 'Overdue',
      daysOverdue: 5,
      fbrSync: 'Synced',
      lastReminder: '2024-02-10',
      notes: 'Customer requested payment extension'
    },
    {
      id: 'INV-2024-002',
      customer: 'XYZ Ltd',
      amount: 1200,
      dueDate: '2024-02-20',
      status: 'Due Soon',
      daysOverdue: 0,
      fbrSync: 'Synced',
      lastReminder: '2024-02-12',
      notes: 'Follow up scheduled for next week'
    },
    {
      id: 'INV-2024-003',
      customer: 'Tech Solutions Inc',
      amount: 4500,
      dueDate: '2024-02-05',
      status: 'Overdue',
      daysOverdue: 15,
      fbrSync: 'Pending',
      lastReminder: '2024-02-08',
      notes: 'Payment plan discussed, awaiting confirmation'
    },
    {
      id: 'INV-2024-004',
      customer: 'Global Industries',
      amount: 800,
      dueDate: '2024-02-25',
      status: 'Due Soon',
      daysOverdue: 0,
      fbrSync: 'Synced',
      lastReminder: '2024-02-14',
      notes: 'Standard reminder sent'
    },
    {
      id: 'INV-2024-005',
      customer: 'Startup Ventures',
      amount: 3200,
      dueDate: '2024-01-30',
      status: 'Overdue',
      daysOverdue: 20,
      fbrSync: 'Failed',
      lastReminder: '2024-02-01',
      notes: 'Legal action may be required'
    },
    {
      id: 'INV-2024-006',
      customer: 'Enterprise Solutions',
      amount: 1800,
      dueDate: '2024-02-28',
      status: 'Due Soon',
      daysOverdue: 0,
      fbrSync: 'Synced',
      lastReminder: '2024-02-15',
      notes: 'Customer confirmed payment this week'
    },
    {
      id: 'INV-2024-007',
      customer: 'Innovation Labs',
      amount: 6500,
      dueDate: '2024-02-01',
      status: 'Overdue',
      daysOverdue: 19,
      fbrSync: 'Synced',
      lastReminder: '2024-02-05',
      notes: 'Payment arrangement in progress'
    },
    {
      id: 'INV-2024-008',
      customer: 'Digital Dynamics',
      amount: 950,
      dueDate: '2024-02-22',
      status: 'Due Soon',
      daysOverdue: 0,
      fbrSync: 'Pending',
      lastReminder: '2024-02-16',
      notes: 'Customer acknowledged receipt'
    }
  ];

  const customers = ['All', ...Array.from(new Set(pendingInvoices.map(invoice => invoice.customer)))];
  const statuses = ['All', 'Overdue', 'Due Soon', 'Paid'];
  const amountRanges = ['All', 'Under $1000', '$1000-$5000', 'Over $5000'];

  const filteredInvoices = pendingInvoices.filter(invoice => {
    const matchesDateFrom = !filters.dateFrom || invoice.dueDate >= filters.dateFrom;
    const matchesDateTo = !filters.dateTo || invoice.dueDate <= filters.dateTo;
    const matchesCustomer = filters.customer === 'All' || invoice.customer === filters.customer;
    const matchesStatus = filters.status === 'All' || invoice.status === filters.status;
    
    let matchesAmount = true;
    if (filters.amountRange === 'Under $1000') matchesAmount = invoice.amount < 1000;
    else if (filters.amountRange === '$1000-$5000') matchesAmount = invoice.amount >= 1000 && invoice.amount <= 5000;
    else if (filters.amountRange === 'Over $5000') matchesAmount = invoice.amount > 5000;
    
    return matchesDateFrom && matchesDateTo && matchesCustomer && matchesStatus && matchesAmount;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Overdue': return 'bg-red-100 text-red-800';
      case 'Due Soon': return 'bg-yellow-100 text-yellow-800';
      case 'Paid': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

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

  const exportReport = async (format: 'csv' | 'excel' | 'pdf') => {
    setIsExporting(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (format === 'csv') {
        const csvContent = [
          ['Invoice ID', 'Customer', 'Amount', 'Due Date', 'Status', 'Days Overdue', 'FBR Sync', 'Last Reminder', 'Notes'],
          ...filteredInvoices.map(invoice => [
            invoice.id,
            invoice.customer,
            invoice.amount,
            invoice.dueDate,
            invoice.status,
            invoice.daysOverdue,
            invoice.fbrSync,
            invoice.lastReminder,
            invoice.notes
          ])
        ].map(row => row.join(',')).join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pending_invoices_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
      
      alert(`${format.toUpperCase()} report exported successfully!`);
      
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const clearFilters = () => {
    setFilters({
      dateFrom: '',
      dateTo: '',
      customer: 'All',
      status: 'All',
      amountRange: 'All'
    });
  };

  const totalPendingAmount = filteredInvoices.reduce((sum, invoice) => sum + invoice.amount, 0);
  const overdueInvoices = filteredInvoices.filter(invoice => invoice.status === 'Overdue');
  const totalOverdueAmount = overdueInvoices.reduce((sum, invoice) => sum + invoice.amount, 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Pending Invoices Report</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <div className="p-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{filteredInvoices.length}</div>
              <div className="text-sm text-blue-800">Total Pending</div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{overdueInvoices.length}</div>
              <div className="text-sm text-red-800">Overdue</div>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">${totalPendingAmount.toLocaleString()}</div>
              <div className="text-sm text-yellow-800">Total Amount</div>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">${totalOverdueAmount.toLocaleString()}</div>
              <div className="text-sm text-orange-800">Overdue Amount</div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters</h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date From</label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                  className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date To</label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                  className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Customer</label>
                <select
                  value={filters.customer}
                  onChange={(e) => setFilters({ ...filters, customer: e.target.value })}
                  className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {customers.map(customer => (
                    <option key={customer} value={customer}>{customer}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {statuses.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount Range</label>
                <select
                  value={filters.amountRange}
                  onChange={(e) => setFilters({ ...filters, amountRange: e.target.value })}
                  className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {amountRanges.map(range => (
                    <option key={range} value={range}>{range}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Found {filteredInvoices.length} invoice(s) out of {pendingInvoices.length} total
              </p>
              <button
                onClick={clearFilters}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Clear Filters
              </button>
            </div>
          </div>

          {/* Export Options */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-green-900 mb-3">Export Options</h3>
            <div className="flex space-x-3">
              <button
                onClick={() => exportReport('csv')}
                disabled={isExporting}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                📋 Export CSV
              </button>
              <button
                onClick={() => exportReport('excel')}
                disabled={isExporting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                📊 Export Excel
              </button>
              <button
                onClick={() => exportReport('pdf')}
                disabled={isExporting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                📄 Export PDF
              </button>
            </div>
            {isExporting && (
              <p className="text-sm text-green-700 mt-2">Exporting report...</p>
            )}
          </div>

          {/* Invoices Table */}
          <div className="bg-white rounded-lg shadow-md">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Pending Invoices</h3>
            </div>

            <div className="overflow-x-auto">
              {filteredInvoices.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No pending invoices found.</p>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Days Overdue</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">FBR Sync</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Reminder</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredInvoices.map((invoice) => (
                      <tr key={invoice.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-blue-600 hover:text-blue-800 cursor-pointer">
                            {invoice.id}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{invoice.customer}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">${invoice.amount.toLocaleString()}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{invoice.dueDate}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                            {invoice.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`text-sm font-medium ${
                            invoice.daysOverdue > 0 ? 'text-red-600' : 'text-gray-900'
                          }`}>
                            {invoice.daysOverdue > 0 ? `${invoice.daysOverdue} days` : 'On time'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getFBRStatusColor(invoice.fbrSync)}`}>
                            <span className="mr-1">{getFBRStatusIcon(invoice.fbrSync)}</span>
                            {invoice.fbrSync}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{invoice.lastReminder}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 truncate max-w-xs">{invoice.notes}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
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
