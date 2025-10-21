'use client';

import React, { useState, useEffect, useMemo } from 'react';
import AppLayout from '../components/AppLayout';
import { apiClient } from '../lib/api';
import { whatsappService, type InvoiceData } from '../lib/whatsapp';

interface Invoice {
  id: string;
  invoice_number: string;
  customer_id: string;
  sales_order_id?: string;
  invoice_date: string;
  due_date: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  total_amount: number;
  paid_amount: number;
  fbr_sync_status: 'pending' | 'synced' | 'failed';
  customers?: { name: string; email: string; phone?: string };
  created_at: string;
}

interface SalesOrder {
  id: string;
  order_number: string;
  customer_id: string;
  status: string;
  total_amount: number;
  customers?: { name: string; email: string };
  created_at: string;
}

const InvoicePage = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  
  // Filters and search
  const [filters, setFilters] = useState({
    search: '',
    status: 'All',
    fbr_status: 'All',
    date_from: '',
    date_to: ''
  });
  
  // Modals
  const [showCreateFromOrder, setShowCreateFromOrder] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
  const [showInvoiceDetails, setShowInvoiceDetails] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isSendingReminder, setIsSendingReminder] = useState(false);
  const [isMarkingPaid, setIsMarkingPaid] = useState(false);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);

  // Create invoice form data
  const [invoiceFormData, setInvoiceFormData] = useState({
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: (() => {
      const date = new Date();
      date.setDate(date.getDate() + 30);
      return date.toISOString().split('T')[0];
    })(),
    notes: ''
  });

  const statusOptions = ['All', 'draft', 'sent', 'paid', 'overdue', 'cancelled'];
  const fbrStatusOptions = ['All', 'pending', 'synced', 'failed'];

  // Fetch data
  useEffect(() => {
    fetchInvoices();
    fetchDeliveredOrders();
  }, []);

  const fetchInvoices = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.getReceivableInvoices({ 
        limit: 100,
        ...filters.status !== 'All' && { status: filters.status },
        ...filters.fbr_status !== 'All' && { fbr_sync_status: filters.fbr_status }
      });
      
      if (response.success) {
        setInvoices(response.data.invoices || []);
      } else {
        setError('Failed to fetch invoices');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch invoices');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDeliveredOrders = async () => {
    try {
      const response = await apiClient.getSalesOrders({ 
        limit: 100
        // Remove status filter to get all orders, we'll filter on the client side
      });
      
      if (response.success) {
        // Filter for orders that can be invoiced (delivered, shipped, completed, etc.)
        const invoiceableStatuses = ['delivered', 'shipped', 'completed', 'invoiced', 'pending'];
        const invoiceableOrders = response.data.orders?.filter((order: SalesOrder) => {
          const isInvoiceable = invoiceableStatuses.includes(order.status.toLowerCase());
          const hasNoInvoice = !invoices.some(invoice => invoice.sales_order_id === order.id);
          return isInvoiceable && hasNoInvoice;
        }) || [];
        
        console.log('Found orders:', response.data.orders?.length || 0);
        console.log('Invoiceable orders:', invoiceableOrders.length);
        console.log('Order statuses:', response.data.orders?.map((o: SalesOrder) => ({ id: o.id, status: o.status })));
        
        setSalesOrders(invoiceableOrders);
      }
    } catch (err: any) {
      console.error('Failed to fetch sales orders:', err);
    }
  };

  // Filter invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter(invoice => {
      const matchesSearch = !filters.search || 
        invoice.invoice_number.toLowerCase().includes(filters.search.toLowerCase()) ||
        invoice.customers?.name.toLowerCase().includes(filters.search.toLowerCase());
      
      const matchesStatus = filters.status === 'All' || invoice.status === filters.status;
      const matchesFBRStatus = filters.fbr_status === 'All' || invoice.fbr_sync_status === filters.fbr_status;
      
      let matchesDateRange = true;
      if (filters.date_from) {
        matchesDateRange = matchesDateRange && invoice.invoice_date >= filters.date_from;
      }
      if (filters.date_to) {
        matchesDateRange = matchesDateRange && invoice.invoice_date <= filters.date_to;
      }

      return matchesSearch && matchesStatus && matchesFBRStatus && matchesDateRange;
    });
  }, [invoices, filters]);

  const handleCreateInvoiceFromOrder = async () => {
    if (!selectedOrder) return;

    try {
      setIsLoading(true);
      const response = await apiClient.createInvoiceFromOrder({
        sales_order_id: selectedOrder.id,
        ...invoiceFormData
      });

      if (response.success) {
        setShowCreateFromOrder(false);
        setSelectedOrder(null);
        fetchInvoices(); // Refresh the invoices list
        setError(null);
      } else {
        setError(response.error || 'Failed to create invoice');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create invoice');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendReminder = async () => {
    if (!selectedInvoice) return;

    setIsSendingReminder(true);
    try {
      const response = await apiClient.sendInvoiceReminder(selectedInvoice.id);
      
      if (response.success) {
        setError(null);
        // Optionally show success message
        alert('Invoice reminder sent successfully!');
      } else {
        setError(response.error || 'Failed to send reminder');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send reminder');
    } finally {
      setIsSendingReminder(false);
    }
  };

  const handleMarkAsPaid = async () => {
    if (!selectedInvoice) return;

    setIsMarkingPaid(true);
    try {
      const response = await apiClient.markInvoiceAsPaid(selectedInvoice.id);
      
      if (response.success) {
        setError(null);
        setShowInvoiceDetails(false);
        fetchInvoices(); // Refresh the invoices list
        alert('Invoice marked as paid successfully!');
      } else {
        setError(response.error || 'Failed to mark invoice as paid');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to mark invoice as paid');
    } finally {
      setIsMarkingPaid(false);
    }
  };

  const handleSendViaWhatsApp = async (invoice: Invoice) => {
    try {
      setIsSendingWhatsApp(true);

      // Prepare invoice data for WhatsApp
      const invoiceData: InvoiceData = {
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        customer_name: invoice.customers?.name || 'Unknown Customer',
        customer_phone: invoice.customers?.phone,
        total_amount: invoice.total_amount,
        due_date: invoice.due_date,
        status: invoice.status
      };

      // Send via WhatsApp (will open WhatsApp with or without phone number)
      await whatsappService.sendInvoiceViaWhatsApp(invoiceData);
      
      // Show success message
      const message = invoice.customers?.phone 
        ? `Invoice ${invoice.invoice_number} sent via WhatsApp to ${invoice.customers?.name}`
        : `WhatsApp opened with invoice ${invoice.invoice_number} details. Please select the contact manually.`;
      alert(message);
      
    } catch (error: any) {
      console.error('Error sending invoice via WhatsApp:', error);
      alert(error.message || 'Failed to open WhatsApp');
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  const handleSendReminderViaWhatsApp = async () => {
    if (!selectedInvoice) return;

    try {
      setIsSendingWhatsApp(true);
      
      // Check if customer has phone number
      if (!selectedInvoice.customers?.phone) {
        alert('Customer phone number is not available. Please update customer information first.');
        return;
      }

      // Prepare invoice data for WhatsApp reminder
      const invoiceData: InvoiceData = {
        id: selectedInvoice.id,
        invoice_number: selectedInvoice.invoice_number,
        customer_name: selectedInvoice.customers?.name || 'Unknown Customer',
        customer_phone: selectedInvoice.customers?.phone,
        total_amount: selectedInvoice.total_amount,
        due_date: selectedInvoice.due_date,
        status: selectedInvoice.status
      };

      // Send reminder via WhatsApp
      await whatsappService.sendInvoiceReminder(invoiceData);
      
      // Show success message
      alert(`Payment reminder sent via WhatsApp to ${selectedInvoice.customers?.name}`);
      
    } catch (error: any) {
      console.error('Error sending reminder via WhatsApp:', error);
      alert(error.message || 'Failed to send reminder via WhatsApp');
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  const handleAutoGenerate = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.autoGenerateInvoices();

      if (response.success) {
        const count = response.data.generatedInvoices.length;
        if (count > 0) {
          alert(`Successfully generated ${count} invoice(s) from delivered orders`);
          fetchInvoices();
          fetchDeliveredOrders();
        } else {
          alert('No delivered orders found that need invoicing');
        }
      } else {
        setError('Failed to auto-generate invoices');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to auto-generate invoices');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getFBRStatusColor = (status: string) => {
    switch (status) {
      case 'synced': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Calculate summary stats
  const totalInvoices = filteredInvoices.length;
  const totalAmount = filteredInvoices.reduce((sum, inv) => sum + inv.total_amount, 0);
  const paidAmount = filteredInvoices.reduce((sum, inv) => sum + inv.paid_amount, 0);
  const pendingAmount = totalAmount - paidAmount;
  const overdueInvoices = filteredInvoices.filter(inv => 
    inv.status === 'overdue' || (new Date(inv.due_date) < new Date() && inv.status !== 'paid')
  ).length;

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600">{error}</p>
            <button 
              onClick={() => setError(null)}
              className="mt-2 text-sm text-red-700 hover:text-red-800"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Invoices</p>
                <p className="text-2xl font-bold text-blue-600">{totalInvoices}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Amount</p>
                <p className="text-2xl font-bold text-green-600">Rs. {totalAmount.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending Amount</p>
                <p className="text-2xl font-bold text-yellow-600">Rs. {pendingAmount.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.662-.833-2.462 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Overdue</p>
                <p className="text-2xl font-bold text-red-600">{overdueInvoices}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Invoice Generation & Management */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-wrap items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Invoice Generation & Management</h3>
            <div className="flex items-center gap-3">
              {/* View Mode Toggle */}
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`flex items-center p-2 rounded-md transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  title="Grid View"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`flex items-center p-2 rounded-md transition-colors ${
                    viewMode === 'list'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  title="List View"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
              {/* Show/Hide Filters Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                {showFilters ? 'Hide Filters' : 'Show Filters'}
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => setShowCreateFromOrder(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Create Invoice from Order
            </button>

            <button
              onClick={handleAutoGenerate}
              disabled={isLoading}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Auto-Generate Invoices
            </button>
          </div>
        </div>

        {/* Filters - Conditionally Rendered */}
        {showFilters && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  placeholder="Search invoices..."
                  className="w-full px-4 py-2 text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="w-full px-4 py-2 text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {statusOptions.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date From</label>
                <input
                  type="date"
                  value={filters.date_from}
                  onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
                  className="w-full px-4 py-2 text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date To</label>
                <input
                  type="date"
                  value={filters.date_to}
                  onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
                  className="w-full px-4 py-2 text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="mt-4 flex justify-between items-center">
              <p className="text-sm text-gray-600">
                Showing {filteredInvoices.length} of {totalInvoices} invoices
              </p>
              <button
                onClick={() => setFilters({
                  search: '',
                  status: 'All',
                  fbr_status: 'All',
                  date_from: '',
                  date_to: ''
                })}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}

        {/* Invoices Display - Grid and List View */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Invoices</h3>
          </div>

          <div className={viewMode === 'list' ? 'overflow-x-auto' : 'p-6'}>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="text-gray-500 mt-2">Loading invoices...</p>
              </div>
            ) : filteredInvoices.length === 0 ? (
              <div className="text-center py-8">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-gray-500">No invoices found</p>
              </div>
            ) : viewMode === 'grid' ? (
              /* Grid View */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredInvoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="border border-gray-200 rounded-lg p-3 hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => {
                      setSelectedInvoice(invoice);
                      setShowInvoiceDetails(true);
                    }}
                  >
                    {/* Invoice Number & Status */}
                    <div className="flex justify-between items-start mb-2">
                      <div className="text-sm font-semibold text-blue-600">
                        {invoice.invoice_number}
                      </div>
                      <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                        {invoice.status}
                      </span>
                    </div>

                    {/* Customer Info */}
                    <div className="mb-2">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {invoice.customers?.name || 'Unknown'}
                      </div>
                      {invoice.customers?.email && (
                        <div className="text-xs text-gray-500 truncate">
                          {invoice.customers.email}
                        </div>
                      )}
                    </div>

                    {/* Dates */}
                    <div className="mb-2 space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Invoice:</span>
                        <span className="text-gray-900">{new Date(invoice.invoice_date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Due:</span>
                        <span className="text-gray-900">{new Date(invoice.due_date).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Amount Info */}
                    <div className="mb-2 pt-2 border-t border-gray-100">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-500">Total:</span>
                        <span className="font-semibold text-gray-900">Rs. {invoice.total_amount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Paid:</span>
                        <span className="text-green-600 font-medium">Rs. {invoice.paid_amount.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end items-center pt-2 border-t border-gray-100">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSendViaWhatsApp(invoice);
                        }}
                        disabled={isSendingWhatsApp}
                        className="text-green-600 hover:text-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        title={invoice.customers?.phone ? `Send via WhatsApp to ${invoice.customers.name}` : 'Open WhatsApp to send invoice'}
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.109"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* List View (Table) */
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice #</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paid</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">FBR</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredInvoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-blue-600 hover:text-blue-800 cursor-pointer"
                             onClick={() => {
                               setSelectedInvoice(invoice);
                               setShowInvoiceDetails(true);
                             }}>
                          {invoice.invoice_number}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{invoice.customers?.name || 'Unknown'}</div>
                        <div className="text-sm text-gray-500">{invoice.customers?.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(invoice.invoice_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(invoice.due_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        Rs. {invoice.total_amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        Rs. {invoice.paid_amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                          {invoice.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(invoice.fbr_sync_status)}`}>
                          {invoice.fbr_sync_status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button
                          onClick={() => {
                            setSelectedInvoice(invoice);
                            setShowInvoiceDetails(true);
                          }}
                          className="text-blue-600 hover:text-blue-700 mr-3"
                        >
                          View
                        </button>
                        <button 
                          onClick={() => handleSendViaWhatsApp(invoice)}
                          disabled={isSendingWhatsApp}
                          className="text-green-600 hover:text-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                          title={invoice.customers?.phone ? `Send via WhatsApp to ${invoice.customers.name}` : 'Open WhatsApp to send invoice'}
                        >
                          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.109"/>
                          </svg>
                          {isSendingWhatsApp ? 'Sending...' : 'WhatsApp'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Create Invoice from Order Modal */}
        {showCreateFromOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Create Invoice from Sales Order</h2>
                <button
                  onClick={() => setShowCreateFromOrder(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-6">
                {/* Select Sales Order */}
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Select Sales Order</h3>
                  {salesOrders.length === 0 ? (
                    <div className="text-center py-8">
                      <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <h4 className="text-lg font-medium text-gray-900 mb-2">No orders available for invoicing</h4>
                      <div className="text-sm text-gray-500 space-y-1">
                        <p>• Orders must have status: delivered, shipped, completed, or invoiced</p>
                        <p>• Orders that already have invoices are excluded</p>
                        <p>• Create some sales orders from quotations first</p>
                      </div>
                      <button
                        onClick={() => {
                          fetchDeliveredOrders();
                          fetchInvoices();
                        }}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Refresh Orders
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3">
                      {salesOrders.map((order) => (
                        <div
                          key={order.id}
                          onClick={() => setSelectedOrder(order)}
                          className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                            selectedOrder?.id === order.id 
                              ? 'border-blue-500 bg-blue-50' 
                              : 'border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium text-gray-900">{order.order_number}</h4>
                              <p className="text-sm text-gray-600">{order.customers?.name}</p>
                              <p className="text-sm text-gray-500">
                                Order Date: {new Date(order.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-gray-900">Rs. {order.total_amount.toLocaleString()}</p>
                              <p className="text-sm text-green-600">{order.status}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Invoice Details Form */}
                {selectedOrder && (
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Invoice Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Date</label>
                        <input
                          type="date"
                          value={invoiceFormData.invoice_date}
                          onChange={(e) => setInvoiceFormData({ ...invoiceFormData, invoice_date: e.target.value })}
                          className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
                        <input
                          type="date"
                          value={invoiceFormData.due_date}
                          onChange={(e) => setInvoiceFormData({ ...invoiceFormData, due_date: e.target.value })}
                          className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                        <textarea
                          value={invoiceFormData.notes}
                          onChange={(e) => setInvoiceFormData({ ...invoiceFormData, notes: e.target.value })}
                          rows={3}
                          className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Additional notes for the invoice..."
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
                <button
                  onClick={() => setShowCreateFromOrder(false)}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateInvoiceFromOrder}
                  disabled={!selectedOrder || isLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isLoading ? 'Creating...' : 'Create Invoice'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Invoice Details Modal */}
        {showInvoiceDetails && selectedInvoice && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Invoice Details</h2>
                <button
                  onClick={() => setShowInvoiceDetails(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Invoice Number</label>
                    <p className="mt-1 text-lg font-semibold text-gray-900">{selectedInvoice.invoice_number}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Status</label>
                    <span className={`mt-1 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedInvoice.status)}`}>
                      {selectedInvoice.status}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Customer</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedInvoice.customers?.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">FBR Status</label>
                    <span className={`mt-1 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getFBRStatusColor(selectedInvoice.fbr_sync_status)}`}>
                      {selectedInvoice.fbr_sync_status}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Invoice Date</label>
                    <p className="mt-1 text-sm text-gray-900">{new Date(selectedInvoice.invoice_date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Due Date</label>
                    <p className="mt-1 text-sm text-gray-900">{new Date(selectedInvoice.due_date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Total Amount</label>
                    <p className="mt-1 text-lg font-semibold text-gray-900">Rs. {selectedInvoice.total_amount.toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Paid Amount</label>
                    <p className="mt-1 text-lg font-semibold text-green-600">Rs. {selectedInvoice.paid_amount.toLocaleString()}</p>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-500">Outstanding Amount</label>
                  <p className="mt-1 text-xl font-bold text-red-600">Rs. {(selectedInvoice.total_amount - selectedInvoice.paid_amount).toLocaleString()}</p>
                </div>
              </div>

              <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
                <button
                  onClick={() => setShowInvoiceDetails(false)}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Close
                </button>
                <button 
                  onClick={handleSendReminder}
                  disabled={isSendingReminder}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSendingReminder ? 'Sending...' : 'Send Reminder'}
                </button>
                <button 
                  onClick={handleMarkAsPaid}
                  disabled={isMarkingPaid}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {isMarkingPaid ? 'Marking...' : 'Mark as Paid'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default InvoicePage;
