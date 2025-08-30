'use client';

import { useState } from 'react';
import AppLayout from '../components/AppLayout';
import GeneratePLReportModal from '../components/accounting/GeneratePLReportModal';
import PendingInvoicesReportModal from '../components/accounting/PendingInvoicesReportModal';
import AddLedgerEntryModal from '../components/accounting/AddLedgerEntryModal';
import LedgerEntryDetailsModal from '../components/accounting/LedgerEntryDetailsModal';

export default function AccountingPage() {
  const [showPLReport, setShowPLReport] = useState(false);
  const [showPendingInvoices, setShowPendingInvoices] = useState(false);
  const [showAddLedger, setShowAddLedger] = useState(false);
  const [showEntryDetails, setShowEntryDetails] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  
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

  // Mock data for financial metrics
  const financialMetrics = {
    totalPurchases: 125000,
    totalSales: 189000,
    expenses: 45600,
    netProfit: 189000 - 125000 - 45600,
    pendingInvoices: 8,
    pendingAmount: 23400
  };

  // Mock data for ledger entries
  const ledgerEntries = [
    {
      id: 'LE-2024-001',
      date: '2024-01-20',
      type: 'Sale',
      reference: 'INV-2024-001',
      customerVendor: 'ABC Corp',
      description: 'Laptop and Monitor Sale',
      debit: 0,
      credit: 2500,
      balance: 2500,
      accountType: 'Sales',
      taxBreakdown: {
        subtotal: 2200,
        gst: 300,
        total: 2500
      },
      fbrSync: 'Synced',
      linkedTransactions: ['Q-2024-001', 'SO-2024-001', 'INV-2024-001'],
      auditTrail: [
        { action: 'Created', user: 'Sales Team', timestamp: '2024-01-20 10:30' },
        { action: 'Invoice Generated', user: 'Finance', timestamp: '2024-01-20 14:15' }
      ]
    },
    {
      id: 'LE-2024-002',
      date: '2024-01-19',
      type: 'Purchase',
      reference: 'PO-2024-001',
      customerVendor: 'Tech Supplies Inc',
      description: 'Hardware Purchase',
      debit: 1800,
      credit: 0,
      balance: 700,
      accountType: 'Purchases',
      taxBreakdown: {
        subtotal: 1600,
        gst: 200,
        total: 1800
      },
      fbrSync: 'Pending',
      linkedTransactions: ['PO-2024-001', 'DC-2024-001'],
      auditTrail: [
        { action: 'PO Created', user: 'Procurement', timestamp: '2024-01-19 09:00' },
        { action: 'Goods Received', user: 'Warehouse', timestamp: '2024-01-19 16:30' }
      ]
    },
    {
      id: 'LE-2024-003',
      date: '2024-01-18',
      type: 'Expense',
      reference: 'EXP-2024-001',
      customerVendor: 'Office Supplies Co',
      description: 'Office Supplies',
      debit: 450,
      credit: 0,
      balance: 250,
      accountType: 'Expenses',
      taxBreakdown: {
        subtotal: 400,
        gst: 50,
        total: 450
      },
      fbrSync: 'N/A',
      linkedTransactions: ['EXP-2024-001'],
      auditTrail: [
        { action: 'Expense Created', user: 'Admin', timestamp: '2024-01-18 11:45' },
        { action: 'Approved', user: 'Manager', timestamp: '2024-01-18 15:20' }
      ]
    },
    {
      id: 'LE-2024-004',
      date: '2024-01-17',
      type: 'Sale',
      reference: 'INV-2024-002',
      customerVendor: 'XYZ Ltd',
      description: 'Software License',
      debit: 0,
      credit: 1200,
      balance: 3700,
      accountType: 'Sales',
      taxBreakdown: {
        subtotal: 1050,
        gst: 150,
        total: 1200
      },
      fbrSync: 'Synced',
      linkedTransactions: ['Q-2024-002', 'INV-2024-002'],
      auditTrail: [
        { action: 'Created', user: 'Sales Team', timestamp: '2024-01-17 13:20' },
        { action: 'Invoice Generated', user: 'Finance', timestamp: '2024-01-17 16:45' }
      ]
    },
    {
      id: 'LE-2024-005',
      date: '2024-01-16',
      type: 'Purchase',
      reference: 'PO-2024-002',
      customerVendor: 'Display Solutions',
      description: 'Monitor Purchase',
      debit: 800,
      credit: 0,
      balance: 2900,
      accountType: 'Purchases',
      taxBreakdown: {
        subtotal: 700,
        gst: 100,
        total: 800
      },
      fbrSync: 'Failed',
      linkedTransactions: ['PO-2024-002'],
      auditTrail: [
        { action: 'PO Created', user: 'Procurement', timestamp: '2024-01-16 08:15' },
        { action: 'FBR Sync Failed', user: 'System', timestamp: '2024-01-16 10:30' }
      ]
    }
  ];

  const customers = ['All', ...Array.from(new Set(ledgerEntries.filter(entry => entry.type === 'Sale').map(entry => entry.customerVendor)))];
  const vendors = ['All', ...Array.from(new Set(ledgerEntries.filter(entry => entry.type === 'Purchase').map(entry => entry.customerVendor)))];
  const accountTypes = ['All', 'Sales', 'Purchases', 'Expenses', 'Assets', 'Liabilities'];
  const entryTypes = ['All', 'Sale', 'Purchase', 'Expense', 'Payment', 'Receipt'];

  const filteredEntries = ledgerEntries.filter(entry => {
    const matchesDateFrom = !filters.dateFrom || entry.date >= filters.dateFrom;
    const matchesDateTo = !filters.dateTo || entry.date <= filters.dateTo;
    const matchesCustomer = filters.customer === 'All' || entry.customerVendor === filters.customer;
    const matchesVendor = filters.vendor === 'All' || entry.customerVendor === filters.vendor;
    const matchesAccountType = filters.accountType === 'All' || entry.accountType === filters.accountType;
    const matchesEntryType = filters.entryType === 'All' || entry.type === filters.entryType;
    
    // Additional tab filtering
    const matchesTab = activeTab === 'all' || 
      (activeTab === 'sales' && entry.type === 'Sale') ||
      (activeTab === 'purchases' && entry.type === 'Purchase') ||
      (activeTab === 'expenses' && entry.type === 'Expense');
    
    return matchesDateFrom && matchesDateTo && matchesCustomer && matchesVendor && 
           matchesAccountType && matchesEntryType && matchesTab;
  });

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

  const handleViewEntryDetails = (entry: any) => {
    setSelectedEntry(entry);
    setShowEntryDetails(true);
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

  const calculateRunningBalance = () => {
    let balance = 0;
    return filteredEntries.map(entry => {
      if (entry.type === 'Sale' || entry.type === 'Payment') {
        balance += entry.credit;
      } else {
        balance -= entry.debit;
      }
      return { ...entry, runningBalance: balance };
    });
  };

  const entriesWithBalance = calculateRunningBalance();

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
        </div>

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
              className="flex items-center justify-center p-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Generate P&L Report
            </button>

            <button
              onClick={() => setShowPendingInvoices(true)}
              className="flex items-center justify-center p-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Pending Invoices
            </button>

            <button
              onClick={() => setShowAddLedger(true)}
              className="flex items-center justify-center p-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-200"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Ledger Entry
            </button>

            <button
              onClick={clearFilters}
              className="flex items-center justify-center p-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200"
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

          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Found {filteredEntries.length} entry(s) out of {ledgerEntries.length} total
            </p>
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
            {entriesWithBalance.length === 0 ? (
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer/Vendor</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Debit</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Credit</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">FBR Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {entriesWithBalance.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{entry.date}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{entry.id}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          entry.type === 'Sale' ? 'bg-green-100 text-green-800' :
                          entry.type === 'Purchase' ? 'bg-red-100 text-red-800' :
                          'bg-orange-100 text-orange-800'
                        }`}>
                          {entry.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-blue-600 hover:text-blue-800 cursor-pointer font-medium">
                          {entry.reference}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{entry.customerVendor}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 truncate max-w-xs">{entry.description}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {entry.debit > 0 ? `$${entry.debit.toLocaleString()}` : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {entry.credit > 0 ? `$${entry.credit.toLocaleString()}` : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm font-medium ${
                          entry.runningBalance >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          ${entry.runningBalance.toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getFBRStatusColor(entry.fbrSync)}`}>
                          <span className="mr-1">{getFBRStatusIcon(entry.fbrSync)}</span>
                          {entry.fbrSync}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button
                          onClick={() => handleViewEntryDetails(entry)}
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
      <AddLedgerEntryModal isOpen={showAddLedger} onClose={() => setShowAddLedger(false)} />
      <LedgerEntryDetailsModal isOpen={showEntryDetails} onClose={() => setShowEntryDetails(false)} entry={selectedEntry} />
    </AppLayout>
  );
}
