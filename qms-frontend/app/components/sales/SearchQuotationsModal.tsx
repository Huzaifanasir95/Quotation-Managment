'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '../../lib/api';
import EditQuotationModal from './EditQuotationModal';

interface SearchQuotationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Quotation {
  id: string;
  number: string;
  customer: string;
  customerEmail?: string;
  amount: number;
  status: string;
  date: string;
  validUntil: string;
  notes?: string;
  items: Array<{
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
  }>;
}

export default function SearchQuotationsModal({ isOpen, onClose }: SearchQuotationsModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [customerFilter, setCustomerFilter] = useState('All');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [amountRange, setAmountRange] = useState({ min: '', max: '' });
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'customer' | 'status'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [isFiltersCollapsed, setIsFiltersCollapsed] = useState(false);
  const [editingQuotationId, setEditingQuotationId] = useState<string | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      resetFilters();
      loadQuotations();
    }
  }, [isOpen]);

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('All');
    setCustomerFilter('All');
    setDateRange({ from: '', to: '' });
    setAmountRange({ min: '', max: '' });
    setSortBy('date');
    setSortOrder('desc');
    setSelectedQuotation(null);
    setIsFiltersCollapsed(false);
    setEditingQuotationId(null);
  };

  const loadQuotations = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.getQuotations({ limit: 200 });
      if (response.success) {
        // Transform API data to match our Quotation interface
        const transformedQuotations = response.data.quotations.map((q: any) => ({
          id: q.id.toString(),
          number: q.quotation_number || `QUO-${q.id}`,
          customer: q.customers?.name || 'Unknown Customer',
          customerEmail: q.customers?.email || '',
          amount: parseFloat(q.total_amount) || 0,
          status: q.status || 'Draft',
          date: q.quotation_date || (q.created_at ? new Date(q.created_at).toISOString().split('T')[0] : ''),
          validUntil: q.valid_until || '',
          notes: q.notes || '',
          items: q.quotation_items?.map((item: any) => ({
            id: item.id.toString(),
            description: item.description || 'No description',
            quantity: item.quantity || 0,
            unitPrice: parseFloat(item.unit_price) || 0
          })) || []
        }));
        setQuotations(transformedQuotations);
      }
    } catch (error) {
      console.error('Failed to load quotations:', error);
      setQuotations([]);
    } finally {
      setIsLoading(false);
    }
  };

  const statuses = ['All', 'Draft', 'Pending', 'Accepted', 'Rejected', 'Expired'];
  const customers = ['All', ...Array.from(new Set(quotations.map(q => q.customer)))];

  const filteredQuotations = quotations.filter(quotation => {
    const matchesSearch = 
      quotation.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quotation.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quotation.customerEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quotation.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quotation.items.some(item => 
        item.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    
    const matchesStatus = statusFilter === 'All' || quotation.status === statusFilter;
    const matchesCustomer = customerFilter === 'All' || quotation.customer === customerFilter;
    
    const matchesDateRange = 
      (!dateRange.from || quotation.date >= dateRange.from) &&
      (!dateRange.to || quotation.date <= dateRange.to);
    
    const matchesAmountRange = 
      (!amountRange.min || quotation.amount >= parseFloat(amountRange.min)) &&
      (!amountRange.max || quotation.amount <= parseFloat(amountRange.max));
    
    return matchesSearch && matchesStatus && matchesCustomer && matchesDateRange && matchesAmountRange;
  }).sort((a, b) => {
    let compareValue = 0;
    
    switch (sortBy) {
      case 'date':
        compareValue = new Date(a.date).getTime() - new Date(b.date).getTime();
        break;
      case 'amount':
        compareValue = a.amount - b.amount;
        break;
      case 'customer':
        compareValue = a.customer.localeCompare(b.customer);
        break;
      case 'status':
        compareValue = a.status.localeCompare(b.status);
        break;
    }
    
    return sortOrder === 'asc' ? compareValue : -compareValue;
  });

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'accepted': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'draft': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'expired': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'accepted':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'pending':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'rejected':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      case 'expired':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
    }
  };

  const isExpired = (validUntil: string) => {
    if (!validUntil) return false;
    return new Date(validUntil) < new Date();
  };

  const handleViewQuotation = (quotation: Quotation) => {
    setSelectedQuotation(quotation);
  };

  const handleEditQuotation = (quotation: Quotation) => {
    console.log('Editing quotation:', quotation);
    setEditingQuotationId(quotation.id);
  };

  const handleQuotationUpdated = () => {
    // Refresh the quotations list
    loadQuotations();
  };

  const handleExportQuotations = () => {
    // Create CSV content
    const headers = ['Quote Number', 'Customer', 'Date', 'Amount', 'Status', 'Valid Until', 'Items Count'];
    const csvContent = [
      headers.join(','),
      ...filteredQuotations.map(q => [
        q.number,
        `"${q.customer}"`,
        q.date,
        q.amount,
        q.status,
        q.validUntil,
        q.items.length
      ].join(','))
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quotations_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-7xl w-full max-h-[95vh] flex flex-col border border-gray-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-50 to-gray-50 px-8 py-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Search Quotations</h2>
              <p className="text-gray-600 mt-1">Find and manage your quotations</p>
            </div>
            <button 
              onClick={onClose} 
              className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-colors duration-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Advanced Search Filters */}
        <div className="border-b border-gray-200 bg-gray-50 flex-shrink-0">
          {/* Filter Header with Toggle */}
          <div className="px-6 py-4 border-b border-gray-200 bg-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <h3 className="text-lg font-semibold text-gray-900">Search Filters</h3>
                <span className="text-sm text-gray-500">
                  {filteredQuotations.length} quotation(s) found
                  {quotations.length > 0 && (
                    <span className="ml-2">
                      • Total: <span className="font-medium text-green-600">
                        ${filteredQuotations.reduce((sum, q) => sum + q.amount, 0).toLocaleString()}
                      </span>
                    </span>
                  )}
                </span>
              </div>
              <div className="flex items-center space-x-3">
                {/* View Mode Toggles */}
                <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-md transition-colors duration-200 ${
                      viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                    }`}
                    title="List View"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-md transition-colors duration-200 ${
                      viewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                    }`}
                    title="Grid View"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                  </button>
                </div>
                
                {/* Collapse/Expand Toggle */}
                <button
                  onClick={() => setIsFiltersCollapsed(!isFiltersCollapsed)}
                  className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                  title={isFiltersCollapsed ? "Expand Filters" : "Collapse Filters"}
                >
                  <span className="text-sm font-medium">
                    {isFiltersCollapsed ? 'Show Filters' : 'Hide Filters'}
                  </span>
                  <svg 
                    className={`w-4 h-4 transition-transform duration-200 ${isFiltersCollapsed ? 'rotate-180' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Collapsible Filter Content */}
          <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
            isFiltersCollapsed ? 'max-h-0 opacity-0' : 'max-h-96 opacity-100'
          }`}>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {/* Search Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Quote number, customer, items..."
                  className="w-full text-black pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
                <svg className="w-5 h-5 text-gray-400 absolute left-3 top-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full text-black px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              >
                {statuses.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>

            {/* Customer Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Customer</label>
              <select
                value={customerFilter}
                onChange={(e) => setCustomerFilter(e.target.value)}
                className="w-full text-black px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              >
                {customers.map(customer => (
                  <option key={customer} value={customer}>{customer}</option>
                ))}
              </select>
            </div>

            {/* Sort Options */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="text-black px-2 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="date">Date</option>
                  <option value="amount">Amount</option>
                  <option value="customer">Customer</option>
                  <option value="status">Status</option>
                </select>
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="px-2 py-3 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors duration-200 flex items-center justify-center"
                >
                  {sortOrder === 'asc' ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Advanced Filters Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={dateRange.from}
                  onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                  className="px-3 text-black py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="date"
                  value={dateRange.to}
                  onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                  className="px-3 text-black py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Amount Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Amount Range</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={amountRange.min}
                  onChange={(e) => setAmountRange({ ...amountRange, min: e.target.value })}
                  className="px-3 text-black py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={amountRange.max}
                  onChange={(e) => setAmountRange({ ...amountRange, max: e.target.value })}
                  className="px-3 text-black py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* View Controls */}
            <div className="flex items-end">
              <div className="grid grid-cols-2 gap-2 w-full">
                <button
                  onClick={resetFilters}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200 text-sm"
                >
                  Clear All
                </button>
                <button
                  onClick={handleExportQuotations}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 text-sm flex items-center justify-center"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export
                </button>
              </div>
            </div>
              </div>
            </div>
          </div>
        </div>

        {/* Results Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Loading quotations...</span>
              </div>
            ) : filteredQuotations.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No quotations found</h3>
                <p className="text-gray-500">Try adjusting your search criteria or filters.</p>
              </div>
            ) : viewMode === 'list' ? (
              <div className="space-y-4">
                {filteredQuotations.map((quotation) => (
                  <div 
                    key={quotation.id} 
                    className="border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-200 bg-white"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-4">
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">{quotation.number}</h3>
                          <p className="text-gray-600">{quotation.customer}</p>
                          {quotation.customerEmail && (
                            <p className="text-sm text-gray-500">{quotation.customerEmail}</p>
                          )}
                        </div>
                        <div className={`flex items-center space-x-1 px-3 py-1 rounded-full border text-sm font-medium ${getStatusColor(quotation.status)}`}>
                          {getStatusIcon(quotation.status)}
                          <span>{quotation.status}</span>
                        </div>
                        {isExpired(quotation.validUntil) && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            Expired
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-blue-600">${quotation.amount.toLocaleString()}</p>
                        <p className="text-sm text-gray-500">{new Date(quotation.date).toLocaleDateString()}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-sm font-medium text-gray-500">Valid Until</p>
                        <p className="text-gray-900">{quotation.validUntil ? new Date(quotation.validUntil).toLocaleDateString() : 'Not specified'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Items</p>
                        <p className="text-gray-900">{quotation.items.length} item(s)</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Average Item Value</p>
                        <p className="text-gray-900">
                          ${quotation.items.length > 0 ? (quotation.amount / quotation.items.length).toFixed(2) : '0.00'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Created</p>
                        <p className="text-gray-900">{new Date(quotation.date).toLocaleDateString()}</p>
                      </div>
                    </div>

                    {quotation.items.length > 0 && (
                      <div className="mb-4">
                        <p className="text-sm font-medium text-gray-500 mb-2">Items Summary</p>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex flex-wrap gap-2">
                            {quotation.items.slice(0, 3).map((item, index) => (
                              <span key={item.id} className="inline-flex items-center px-2 py-1 rounded-md bg-blue-100 text-blue-800 text-xs">
                                {item.description} (×{item.quantity})
                              </span>
                            ))}
                            {quotation.items.length > 3 && (
                              <span className="inline-flex items-center px-2 py-1 rounded-md bg-gray-200 text-gray-600 text-xs">
                                +{quotation.items.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                      {quotation.notes && (
                        <div className="flex-1 mr-4">
                          <p className="text-sm text-gray-600 italic">"{quotation.notes}"</p>
                        </div>
                      )}
                      <div className="flex space-x-3">
                        <button
                          onClick={() => handleViewQuotation(quotation)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          View Details
                        </button>
                        <button
                          onClick={() => handleEditQuotation(quotation)}
                          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200 flex items-center"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredQuotations.map((quotation) => (
                  <div 
                    key={quotation.id} 
                    className="border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-200 bg-white"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{quotation.number}</h3>
                        <p className="text-gray-600 text-sm">{quotation.customer}</p>
                      </div>
                      <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(quotation.status)}`}>
                        {getStatusIcon(quotation.status)}
                        <span>{quotation.status}</span>
                      </div>
                    </div>

                    <div className="mb-4">
                      <p className="text-2xl font-bold text-blue-600">${quotation.amount.toLocaleString()}</p>
                      <p className="text-sm text-gray-500">{quotation.items.length} items</p>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Created:</span>
                        <span className="text-gray-900">{new Date(quotation.date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Valid Until:</span>
                        <span className="text-gray-900">
                          {quotation.validUntil ? new Date(quotation.validUntil).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleViewQuotation(quotation)}
                        className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 text-sm"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleEditQuotation(quotation)}
                        className="flex-1 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200 text-sm"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-white border-t border-gray-200 px-8 py-6 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              {filteredQuotations.length > 0 && (
                <p>
                  Showing {filteredQuotations.length} of {quotations.length} quotations
                  {filteredQuotations.length !== quotations.length && ' (filtered)'}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
            >
              Close
            </button>
          </div>
        </div>

        {/* Quotation Detail Modal */}
        {selectedQuotation && (
          <div className="fixed inset-0 flex items-center justify-center z-60 p-4" style={{ backdropFilter: 'blur(8px)' }}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-100">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-8 py-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">{selectedQuotation.number}</h3>
                    <p className="text-gray-600">{selectedQuotation.customer}</p>
                  </div>
                  <button 
                    onClick={() => setSelectedQuotation(null)} 
                    className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-colors duration-200"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Quotation Details</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Status:</span>
                        <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedQuotation.status)}`}>
                          {getStatusIcon(selectedQuotation.status)}
                          <span>{selectedQuotation.status}</span>
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Date Created:</span>
                        <span className="text-gray-900">{new Date(selectedQuotation.date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Valid Until:</span>
                        <span className="text-gray-900">
                          {selectedQuotation.validUntil ? new Date(selectedQuotation.validUntil).toLocaleDateString() : 'Not specified'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Total Amount:</span>
                        <span className="text-2xl font-bold text-blue-600">${selectedQuotation.amount.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Customer Information</h4>
                    <div className="space-y-3">
                      <div>
                        <span className="text-gray-500">Name:</span>
                        <p className="text-gray-900 font-medium">{selectedQuotation.customer}</p>
                      </div>
                      {selectedQuotation.customerEmail && (
                        <div>
                          <span className="text-gray-500">Email:</span>
                          <p className="text-gray-900">{selectedQuotation.customerEmail}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {selectedQuotation.notes && (
                  <div className="mb-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">Notes</h4>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-gray-700 italic">"{selectedQuotation.notes}"</p>
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Items ({selectedQuotation.items.length})</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {selectedQuotation.items.map((item) => (
                          <tr key={item.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.description}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.quantity}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${item.unitPrice.toFixed(2)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              ${(item.quantity * item.unitPrice).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50">
                        <tr>
                          <td colSpan={3} className="px-6 py-4 text-right text-sm font-medium text-gray-900">Total:</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-600">
                            ${selectedQuotation.amount.toFixed(2)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
                  <button
                    onClick={() => setSelectedQuotation(null)}
                    className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => handleEditQuotation(selectedQuotation)}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                  >
                    Edit Quotation
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Edit Quotation Modal */}
      {editingQuotationId && (
        <EditQuotationModal
          isOpen={!!editingQuotationId}
          onClose={() => setEditingQuotationId(null)}
          quotationId={editingQuotationId}
          onQuotationUpdated={handleQuotationUpdated}
        />
      )}
    </div>
  );
}
