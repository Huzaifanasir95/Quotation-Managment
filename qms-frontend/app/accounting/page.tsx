'use client';

import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import AppLayout from '../components/AppLayout';
import { SuspenseWrapper, ModalLoadingFallback } from '../components/SuspenseWrapper';
import { 
  LazyGeneratePLReportModal,
  LazyPendingInvoicesReportModal,
  LazyAddLedgerEntryModal,
  LazyLedgerEntryDetailsModal
} from '../components/LazyComponents';
import { LedgerEntry, FinancialMetrics } from '../lib/api';
import { useLedgerEntries, useFinancialMetrics } from '../../lib/hooks/useApi';

// Memoized KPI Card component to prevent unnecessary re-renders
const KPICard = memo(({ title, value, color, icon }: {
  title: string;
  value: string | number;
  color: string;
  icon: React.ReactNode;
}) => (
  <div className="bg-white rounded-lg shadow-md p-6">
    <div className="flex items-center">
      <div className={`p-2 ${color} rounded-lg`}>
        {icon}
      </div>
      <div className="ml-4">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className={`text-2xl font-bold ${color.replace('bg-', 'text-').replace('-100', '-600')}`}>
          {typeof value === 'number' ? `Rs. ${value.toLocaleString()}` : value}
        </p>
      </div>
    </div>
  </div>
));

KPICard.displayName = 'KPICard';

const AccountingPage = () => {
  const [showPLReport, setShowPLReport] = useState(false);
  const [showPendingInvoices, setShowPendingInvoices] = useState(false);
  const [showAddLedger, setShowAddLedger] = useState(false);
  const [showEntryDetails, setShowEntryDetails] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<LedgerEntry | null>(null);
  
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

  // Memoized filter options to prevent unnecessary re-renders
  const filterOptions = useMemo(() => ({
    customers: ['All', 'Customer A', 'Customer B', 'Customer C'],
    vendors: ['All', 'Vendor A', 'Vendor B', 'Vendor C'],
    accountTypes: ['All', 'Assets', 'Liabilities', 'Equity', 'Revenue', 'Expenses'],
    entryTypes: ['All', 'Sale', 'Purchase', 'Expense', 'Adjustment']
  }), []);

  // Memoized API parameters to prevent unnecessary re-fetches
  const ledgerParams = useMemo(() => ({
    page: 1,
    limit: 100,
    ...(filters.dateFrom && { date_from: filters.dateFrom }),
    ...(filters.dateTo && { date_to: filters.dateTo }),
    ...(filters.entryType !== 'All' && { reference_type: filters.entryType }),
    ...(filters.accountType !== 'All' && { account_type: filters.accountType })
  }), [filters]);

  const metricsParams = useMemo(() => ({
    ...(filters.dateFrom && { date_from: filters.dateFrom }),
    ...(filters.dateTo && { date_to: filters.dateTo })
  }), [filters.dateFrom, filters.dateTo]);

  // Use React Query hooks for data fetching with automatic caching
  const { 
    data: ledgerResponse, 
    isLoading: ledgerLoading, 
    error: ledgerError,
    refetch: refetchLedger
  } = useLedgerEntries(ledgerParams);

  const { 
    data: metricsResponse, 
    isLoading: metricsLoading, 
    error: metricsError 
  } = useFinancialMetrics(metricsParams);

  // Extract data with fallbacks
  const ledgerEntries = ledgerResponse?.data?.entries || [];
  const financialMetrics = metricsResponse?.data?.metrics || {
    totalSales: 0,
    totalPurchases: 0,
    expenses: 0,
    netProfit: 0,
    pendingInvoices: 0,
    pendingAmount: 0
  };

  const loading = ledgerLoading || metricsLoading;
  const error = ledgerError?.message || metricsError?.message || null;

  // Memoized filtered entries to prevent unnecessary recalculations
  const entriesWithBalance = useMemo(() => {
    let filtered = ledgerEntries;

    // Filter by tab
    if (activeTab === 'sales') {
      filtered = filtered.filter((entry: any) => entry.reference_type === 'sale');
    } else if (activeTab === 'purchases') {
      filtered = filtered.filter((entry: any) => entry.reference_type === 'purchase');
    } else if (activeTab === 'expenses') {
      filtered = filtered.filter((entry: any) => entry.reference_type === 'expense');
    }

    // Apply date filters
    if (filters.dateFrom) {
      filtered = filtered.filter((entry: any) => 
        new Date(entry.entry_date) >= new Date(filters.dateFrom)
      );
    }
    if (filters.dateTo) {
      filtered = filtered.filter((entry: any) => 
        new Date(entry.entry_date) <= new Date(filters.dateTo)
      );
    }
    if (filters.entryType !== 'All') {
      filtered = filtered.filter((entry: any) => entry.reference_type === filters.entryType.toLowerCase());
    }

    return filtered;
  }, [ledgerEntries, activeTab, filters]);

  // Memoized event handlers to prevent unnecessary re-renders
  const handleEntryClick = useCallback((entry: LedgerEntry) => {
    setSelectedEntry(entry);
    setShowEntryDetails(true);
  }, []);
  
  const handleLedgerEntryAdded = useCallback(() => {
    refetchLedger(); // Use React Query refetch instead of manual API call
  }, [refetchLedger]);

  const clearFilters = useCallback(() => {
    setFilters({
      dateFrom: '',
      dateTo: '',
      customer: 'All',
      vendor: 'All',
      accountType: 'All',
      entryType: 'All'
    });
  }, []);

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8"></div>


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
                {filterOptions.customers.map((customer: string) => (
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
                {filterOptions.vendors.map((vendor: string) => (
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
                {filterOptions.accountTypes.map((type: string) => (
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
                {filterOptions.entryTypes.map((type: string) => (
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
                  onClick={() => refetchLedger()}
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
                  {entriesWithBalance.map((entry: any) => (
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
                          Rs. {Math.max(entry.total_debit || 0, entry.total_credit || 0).toLocaleString()}
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

      {/* Modals - Lazy loaded to reduce initial bundle size */}
      {showPLReport && (
        <SuspenseWrapper fallback={<ModalLoadingFallback />}>
          <LazyGeneratePLReportModal isOpen={showPLReport} onClose={() => setShowPLReport(false)} />
        </SuspenseWrapper>
      )}
      {showPendingInvoices && (
        <SuspenseWrapper fallback={<ModalLoadingFallback />}>
          <LazyPendingInvoicesReportModal isOpen={showPendingInvoices} onClose={() => setShowPendingInvoices(false)} />
        </SuspenseWrapper>
      )}
      {showAddLedger && (
        <SuspenseWrapper fallback={<ModalLoadingFallback />}>
          <LazyAddLedgerEntryModal isOpen={showAddLedger} onClose={() => setShowAddLedger(false)} onEntryAdded={handleLedgerEntryAdded} />
        </SuspenseWrapper>
      )}
      {showEntryDetails && (
        <SuspenseWrapper fallback={<ModalLoadingFallback />}>
          <LazyLedgerEntryDetailsModal isOpen={showEntryDetails} onClose={() => setShowEntryDetails(false)} entry={selectedEntry} />
        </SuspenseWrapper>
      )}
    </AppLayout>
  );
};

// Export the memoized component to prevent unnecessary re-renders
export default memo(AccountingPage);
