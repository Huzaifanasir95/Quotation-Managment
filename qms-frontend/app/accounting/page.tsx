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
import { useLedgerEntries, useFinancialMetrics, useAccountingMetrics } from '../../lib/hooks/useApi';

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
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
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

  const { 
    data: accountingMetricsResponse, 
    isLoading: accountingMetricsLoading, 
    error: accountingMetricsError 
  } = useAccountingMetrics();

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

  const accountingMetrics = accountingMetricsResponse?.data || {
    receivables: { count: 0, totalAmount: 0, overdueCount: 0, overdueAmount: 0 },
    payables: { count: 0, totalAmount: 0, overdueCount: 0, overdueAmount: 0 },
    pnl: { totalSales: 0, totalPurchases: 0, expenses: 0, netProfit: 0 },
    summary: { totalOutstanding: 0, netReceivables: 0, totalOverdue: 0 }
  };

  const loading = ledgerLoading || metricsLoading || accountingMetricsLoading;
  const error = ledgerError?.message || metricsError?.message || accountingMetricsError?.message || null;

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

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Accounting Dashboard</h1>
          <p className="mt-2 text-gray-600">Monitor your financial metrics, pending invoices, and accounting entries</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <KPICard
            title="Accounts Receivable"
            value={accountingMetrics.receivables.totalAmount}
            color="bg-blue-100"
            icon={
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            }
          />
          <KPICard
            title="Accounts Payable"
            value={accountingMetrics.payables.totalAmount}
            color="bg-red-100"
            icon={
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            }
          />
          <KPICard
            title="Pending Invoices"
            value={`${accountingMetrics.receivables.count} invoices`}
            color="bg-yellow-100"
            icon={
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
          />
          <KPICard
            title="Net Receivables"
            value={accountingMetrics.summary.netReceivables}
            color="bg-green-100"
            icon={
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            }
          />
        </div>


        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <button
              onClick={() => setShowPLReport(true)}
              className="flex items-center justify-center p-4 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 border border-blue-200 transition-colors duration-200"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Generate P&L Report
            </button>

            <button
              onClick={() => setShowPendingInvoices(true)}
              className="flex items-center justify-center p-4 bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100 border border-yellow-200 transition-colors duration-200"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Pending Invoices
            </button>

            <button
              onClick={() => setShowAddLedger(true)}
              className="flex items-center justify-center p-4 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 border border-green-200 transition-colors duration-200"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Ledger Entry
            </button>

            <button
              onClick={() => window.open('/invoices', '_blank')}
              className="flex items-center justify-center p-4 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 border border-purple-200 transition-colors duration-200"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Manage Invoices
            </button>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center justify-center p-4 rounded-lg border transition-colors duration-200 ${
                showFilters 
                  ? 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100' 
                  : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
              }`}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z" />
              </svg>
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </button>
          </div>
        </div>

        {/* Receivable Invoices Summary */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Accounts Receivable Summary</h3>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowPendingInvoices(true)}
                className="text-sm px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
              >
                View All
              </button>
              <button
                onClick={() => window.open('/invoices', '_blank')}
                className="text-sm px-3 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
              >
                Manage
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{accountingMetrics.receivables.count}</div>
              <div className="text-sm text-blue-700">Pending Invoices</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">Rs. {accountingMetrics.receivables.totalAmount.toLocaleString()}</div>
              <div className="text-sm text-green-700">Total Receivables</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{accountingMetrics.receivables.overdueCount}</div>
              <div className="text-sm text-red-700">Overdue Invoices</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">Rs. {accountingMetrics.receivables.overdueAmount.toLocaleString()}</div>
              <div className="text-sm text-orange-700">Overdue Amount</div>
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex justify-between items-center text-sm text-gray-600">
              <span>Collection Rate: {accountingMetrics.receivables.count > 0 ? Math.round(((accountingMetrics.receivables.count - accountingMetrics.receivables.overdueCount) / accountingMetrics.receivables.count) * 100) : 0}%</span>
              <span>Avg. Days Outstanding: {accountingMetrics.receivables.count > 0 ? '~30 days' : 'N/A'}</span>
              <span>Next Due: {accountingMetrics.receivables.count > 0 ? 'Check pending invoices' : 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Filters - Collapsible */}
        {showFilters && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
              <button
                onClick={() => setFilters({
                  dateFrom: '',
                  dateTo: '',
                  customer: 'All',
                  vendor: 'All',
                  accountType: 'All',
                  entryType: 'All'
                })}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Clear All
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date From</label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                  className="w-full px-4 py-2 text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date To</label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                  className="w-full px-4 py-2 text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Customer</label>
                <select
                  value={filters.customer}
                  onChange={(e) => setFilters({ ...filters, customer: e.target.value })}
                  className="w-full px-4 py-2 text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  className="w-full px-4 py-2 text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  className="w-full px-4 py-2 text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  className="w-full px-4 py-2 text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {filterOptions.entryTypes.map((type: string) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

          {/* Ledger Table */}
          <div className="bg-white rounded-lg shadow-md">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">General Ledger</h3>
                <div className="flex items-center space-x-4">
                  {/* View Mode Toggle */}
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">View:</span>
                    <div className="flex bg-gray-100 rounded-lg p-1">
                      <button
                        onClick={() => setViewMode('grid')}
                        className={`px-3 py-1 rounded-md text-sm font-medium transition-colors duration-200 ${
                          viewMode === 'grid'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                        title="Grid View"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setViewMode('list')}
                        className={`px-3 py-1 rounded-md text-sm font-medium transition-colors duration-200 ${
                          viewMode === 'list'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                        title="List View"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  {/* Ledger Type Tabs */}
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
            ) : viewMode === 'grid' ? (
              // Grid View
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                {entriesWithBalance.map((entry: any) => (
                  <div key={entry.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200 cursor-pointer"
                       onClick={() => handleEntryClick(entry)}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-gray-900">#{entry.id}</h4>
                        <p className="text-sm text-gray-500">{new Date(entry.entry_date).toLocaleDateString()}</p>
                      </div>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        entry.reference_type === 'sale' ? 'bg-green-100 text-green-800' :
                        entry.reference_type === 'purchase' ? 'bg-red-100 text-red-800' :
                        entry.reference_type === 'expense' ? 'bg-orange-100 text-orange-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {entry.reference_type ? entry.reference_type.charAt(0).toUpperCase() + entry.reference_type.slice(1) : 'General'}
                      </span>
                    </div>
                    
                    <div className="mb-3">
                      <p className="text-sm font-medium text-blue-600">{entry.reference_number || 'N/A'}</p>
                      <p className="text-sm text-gray-800 line-clamp-2">{entry.description}</p>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="text-sm">
                        <span className="text-gray-600">Amount: </span>
                        <span className="font-semibold text-gray-900">
                          Rs. {Math.max(entry.total_debit || 0, entry.total_credit || 0).toLocaleString()}
                        </span>
                      </div>
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
                        entry.status === 'posted' ? 'bg-green-100 text-green-800' :
                        entry.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {entry.status?.charAt(0).toUpperCase() + entry.status?.slice(1)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // List View (Table)
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
