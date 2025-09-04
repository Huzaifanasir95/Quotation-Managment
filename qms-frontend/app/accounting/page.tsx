'use client';

import { useState, useEffect } from 'react';
import AppLayout from '../components/AppLayout';
import GeneratePLReportModal from '../components/accounting/GeneratePLReportModal';
import PendingInvoicesReportModal from '../components/accounting/PendingInvoicesReportModal';
import AddLedgerEntryModal from '../components/accounting/AddLedgerEntryModal';
import LedgerEntryDetailsModal from '../components/accounting/LedgerEntryDetailsModal';
import apiClient, { LedgerEntry, FinancialMetrics } from '../lib/api';

export default function AccountingPage() {
  const [showPLReport, setShowPLReport] = useState(false);
  const [showPendingInvoices, setShowPendingInvoices] = useState(false);
  const [showAddLedger, setShowAddLedger] = useState(false);
  const [showEntryDetails, setShowEntryDetails] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<LedgerEntry | null>(null);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [financialMetrics, setFinancialMetrics] = useState<FinancialMetrics>({
    totalSales: 0,
    totalPurchases: 0,
    expenses: 0,
    netProfit: 0,
    pendingInvoices: 0,
    pendingAmount: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters state
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    customer: 'All',
    vendor: 'All',
    accountType: 'All',
    entryType: 'All'
  });

  // Active tab for ledger view
  const [activeTab, setActiveTab] = useState<'sales' | 'purchases' | 'expenses' | 'all'>('all');

  // Filter options
  const customers = ['All', 'Customer A', 'Customer B', 'Customer C'];
  const vendors = ['All', 'Vendor A', 'Vendor B', 'Vendor C'];
  const accountTypes = ['All', 'Assets', 'Liabilities', 'Equity', 'Revenue', 'Expenses'];
  const entryTypes = ['All', 'Sale', 'Purchase', 'Expense', 'Adjustment'];

  // Fetch ledger data from API
  const fetchLedgerData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Refresh token before making API calls
      await apiClient.refreshToken();
      
      // Fetch ledger entries with filters
      const ledgerParams = {
        page: 1,
        limit: 100,
        ...(filters.dateFrom && { date_from: filters.dateFrom }),
        ...(filters.dateTo && { date_to: filters.dateTo }),
        ...(filters.entryType !== 'All' && { reference_type: filters.entryType }),
        ...(filters.accountType !== 'All' && { account_type: filters.accountType })
      };
      
      const [ledgerResponse, metricsResponse] = await Promise.all([
        apiClient.getLedgerEntries(ledgerParams),
        apiClient.getFinancialMetrics({
          ...(filters.dateFrom && { date_from: filters.dateFrom }),
          ...(filters.dateTo && { date_to: filters.dateTo })
        })
      ]);
      
      if (ledgerResponse.success) {
        setLedgerEntries(ledgerResponse.data.entries || []);
      }
      
      if (metricsResponse.success) {
        setFinancialMetrics(metricsResponse.data.metrics);
      }
      
    } catch (err: any) {
      setError(err.message || 'Failed to fetch ledger data');
      console.error('Error fetching ledger data:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Load data on component mount and filter changes
  useEffect(() => {
    fetchLedgerData();
  }, [filters, activeTab]);


  // Filter ledger entries based on active tab and filters
  const getFilteredEntries = () => {
    let filtered = ledgerEntries;

    // Filter by tab
    if (activeTab === 'sales') {
      filtered = filtered.filter(entry => entry.reference_type === 'sale');
    } else if (activeTab === 'purchases') {
      filtered = filtered.filter(entry => entry.reference_type === 'purchase');
    } else if (activeTab === 'expenses') {
      filtered = filtered.filter(entry => entry.reference_type === 'expense');
    }

    // Apply date filters
    if (filters.dateFrom) {
      filtered = filtered.filter(entry => 
        new Date(entry.entry_date) >= new Date(filters.dateFrom)
      );
    }
    if (filters.dateTo) {
      filtered = filtered.filter(entry => 
        new Date(entry.entry_date) <= new Date(filters.dateTo)
      );
    }
    if (filters.entryType !== 'All') {
      filtered = filtered.filter(entry => entry.reference_type === filters.entryType.toLowerCase());
    }

    return filtered;
  };

  const entriesWithBalance = getFilteredEntries();

  const handleEntryClick = (entry: LedgerEntry) => {
    setSelectedEntry(entry);
    setShowEntryDetails(true);
  };
  
  const handleLedgerEntryAdded = () => {
    fetchLedgerData(); // Refresh data after adding new entry
  };

  const clearFilters = () => {
    setFilters({
      dateFrom: '',
      dateTo: '',
      customer: 'All',
      vendor: 'All',
      accountType: 'All',
      entryType: 'All'
    });
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8"></div>

        {/* KPI Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Sales</p>
                <p className="text-2xl font-bold text-green-600">${financialMetrics.totalSales.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m6 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Purchases</p>
                <p className="text-2xl font-bold text-red-600">${financialMetrics.totalPurchases.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Expenses</p>
                <p className="text-2xl font-bold text-orange-600">${financialMetrics.expenses.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Net Profit</p>
                <p className={`text-2xl font-bold ${financialMetrics.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${financialMetrics.netProfit.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending Invoices</p>
                <p className="text-2xl font-bold text-yellow-600">{financialMetrics.pendingInvoices}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending Amount</p>
                <p className="text-2xl font-bold text-purple-600">${financialMetrics.pendingAmount.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <button
              onClick={() => setShowPLReport(true)}
              className="flex items-center justify-center p-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 border border-gray-300 transition-colors duration-200"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Generate P&L Report
            </button>

            <button
              onClick={() => setShowPendingInvoices(true)}
              className="flex items-center justify-center p-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 border border-gray-300 transition-colors duration-200"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Pending Invoices
            </button>

            <button
              onClick={() => setShowAddLedger(true)}
              className="flex items-center justify-center p-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 border border-gray-300 transition-colors duration-200"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Ledger Entry
            </button>

            <button
              onClick={clearFilters}
              className="flex items-center justify-center p-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 border border-gray-400 transition-colors duration-200"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Clear Filters
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date From</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                className="w-full px-4 py-2 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date To</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                className="w-full px-4 py-2 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Customer</label>
              <select
                value={filters.customer}
                onChange={(e) => setFilters({ ...filters, customer: e.target.value })}
                className="w-full px-4 py-2 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                {customers.map(customer => (
                  <option key={customer} value={customer}>{customer}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Vendor</label>
              <select
                value={filters.vendor}
                onChange={(e) => setFilters({ ...filters, vendor: e.target.value })}
                className="w-full px-4 py-2 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                {vendors.map(vendor => (
                  <option key={vendor} value={vendor}>{vendor}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Account Type</label>
              <select
                value={filters.accountType}
                onChange={(e) => setFilters({ ...filters, accountType: e.target.value })}
                className="w-full px-4 py-2 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                {accountTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Entry Type</label>
              <select
                value={filters.entryType}
                onChange={(e) => setFilters({ ...filters, entryType: e.target.value })}
                className="w-full px-4 py-2 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                {entryTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

          {/* Ledger Table */}
          <div className="bg-white rounded-lg shadow-md">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">General Ledger</h3>
                <div className="flex space-x-1">
                  <button
                    onClick={() => setActiveTab('all')}
                    className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                      activeTab === 'all' 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    All Entries
                  </button>
                  <button
                    onClick={() => setActiveTab('sales')}
                    className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                      activeTab === 'sales' 
                        ? 'bg-green-100 text-green-700' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Sales Ledger
                  </button>
                  <button
                    onClick={() => setActiveTab('purchases')}
                    className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                      activeTab === 'purchases' 
                        ? 'bg-red-100 text-red-700' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Purchase Ledger
                  </button>
                  <button
                    onClick={() => setActiveTab('expenses')}
                    className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                      activeTab === 'expenses' 
                        ? 'bg-orange-100 text-orange-700' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Expense Ledger
                  </button>
                </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                <p className="text-gray-500 mt-2">Loading ledger entries...</p>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <p className="text-red-500">Error: {error}</p>
                <button 
                  onClick={fetchLedgerData}
                  className="mt-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Retry
                </button>
              </div>
            ) : entriesWithBalance.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No ledger entries found.</p>
                <p className="text-sm text-gray-400 mt-1">Total Entries: {ledgerEntries.length} | Filtered: {entriesWithBalance.length}</p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entry ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {entriesWithBalance.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(entry.entry_date).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">#{entry.id}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          entry.reference_type === 'sale' ? 'bg-green-100 text-green-800' :
                          entry.reference_type === 'purchase' ? 'bg-red-100 text-red-800' :
                          entry.reference_type === 'expense' ? 'bg-orange-100 text-orange-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {entry.reference_type ? entry.reference_type.charAt(0).toUpperCase() + entry.reference_type.slice(1) : 'General'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-blue-600 hover:text-blue-800 cursor-pointer font-medium">
                          {entry.reference_number || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 truncate max-w-xs">{entry.description}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          ${Math.max(entry.total_debit || 0, entry.total_credit || 0).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
                          entry.status === 'posted' ? 'bg-green-100 text-green-800' :
                          entry.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {entry.status?.charAt(0).toUpperCase() + entry.status?.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button
                          onClick={() => handleEntryClick(entry)}
                          className="text-blue-600 hover:text-blue-700 font-medium"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <GeneratePLReportModal isOpen={showPLReport} onClose={() => setShowPLReport(false)} />
      <PendingInvoicesReportModal isOpen={showPendingInvoices} onClose={() => setShowPendingInvoices(false)} />
      <AddLedgerEntryModal isOpen={showAddLedger} onClose={() => setShowAddLedger(false)} onEntryAdded={handleLedgerEntryAdded} />
      <LedgerEntryDetailsModal isOpen={showEntryDetails} onClose={() => setShowEntryDetails(false)} entry={selectedEntry} />
    </AppLayout>
  );
}
