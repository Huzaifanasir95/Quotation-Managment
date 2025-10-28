'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { apiClient, type Vendor } from '../lib/api';
import AppLayout from '../components/AppLayout';
import { whatsappService, type VendorBillData } from '../lib/whatsapp';

interface VendorBill {
  id: string;
  bill_number: string;
  vendor_id: string;
  purchase_order_id?: string;
  bill_date: string;
  due_date: string;
  status: 'pending'  | 'approved' | 'paid' | 'overdue';
  total_amount: number;
  paid_amount: number;
  notes?: string;
  vendors?: { name: string; email: string; contact_person: string; phone?: string };
  purchase_orders?: { po_number: string };
  created_at: string;
}

interface PurchaseOrder {
  id: string;
  po_number: string;
  vendor_id: string;
  total_amount: number;
  status: string;
  vendors?: { name: string; email: string };
  purchase_order_items?: Array<{
    id: string;
    description: string;
    quantity: number;
    unit_price: number;
    line_total: number;
  }>;
  created_at: string;
}


const PayableInvoicesPage = () => {
  const [vendorBills, setVendorBills] = useState<VendorBill[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [poSearchQuery, setPOSearchQuery] = useState('');
  
  // Filters and search
  const [filters, setFilters] = useState({
    search: '',
    status: 'All',
    vendor_id: 'All',
    date_from: '',
    date_to: ''
  });
  
  // Modals
  const [showCreateFromPO, setShowCreateFromPO] = useState(false);
  const [showCreateExpense, setShowCreateExpense] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showBillDetails, setShowBillDetails] = useState(false);
  const [selectedBill, setSelectedBill] = useState<VendorBill | null>(null);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);

  // Form data states
  const [billFromPOData, setBillFromPOData] = useState({
    bill_number: '',
    bill_date: new Date().toISOString().split('T')[0],
    due_date: '',
    notes: ''
  });

  const [expenseBillData, setExpenseBillData] = useState({
    bill_number: '',
    vendor_id: '',
    bill_date: new Date().toISOString().split('T')[0],
    due_date: '',
    expense_category: '',
    description: '',
    subtotal: 0,
    tax_amount: 0,
    total_amount: 0,
    notes: ''
  });

  const [manualBillData, setManualBillData] = useState({
    bill_number: '',
    vendor_id: '',
    bill_date: new Date().toISOString().split('T')[0],
    due_date: '',
    subtotal: 0,
    tax_amount: 0,
    total_amount: 0,
    notes: ''
  });

  const [paymentData, setPaymentData] = useState({
    paid_amount: 0,
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'bank_transfer',
    payment_reference: '',
    payment_notes: ''
  });

  const statusOptions = ['All', 'pending', 'approved', 'paid', 'overdue'];
  const expenseCategories = [
    'Office Supplies', 'Utilities', 'Rent', 'Insurance', 'Marketing', 
    'Travel', 'Professional Services', 'Maintenance', 'Software', 'Other'
  ];
  const paymentMethods = ['bank_transfer', 'cash', 'check', 'card', 'other'];

  // Fetch data
  useEffect(() => {
    fetchVendorBills();
    fetchPendingPOs();
    fetchVendors();
  }, []);

  const fetchVendorBills = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.getVendorBills({ 
        limit: 100,
        ...filters.status !== 'All' && { status: filters.status },
        ...filters.vendor_id !== 'All' && { vendor_id: filters.vendor_id }
      });
      
      if (response.success) {
        setVendorBills(response.data.vendorBills || []);
      } else {
        setError('Failed to fetch vendor bills');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch vendor bills');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPendingPOs = async () => {
    try {
      const response = await apiClient.getPendingPurchaseOrders();
      
      if (response.success) {
        setPurchaseOrders(response.data.purchaseOrders || []);
      }
    } catch (err: any) {
      console.error('Failed to fetch purchase orders:', err);
    }
  };

  const fetchVendors = async () => {
    try {
      const response = await apiClient.getVendors({ limit: 100 });
      
      if (response.success) {
        setVendors(response.data.vendors || []);
      }
    } catch (err: any) {
      console.error('Failed to fetch vendors:', err);
    }
  };

  // Filter vendor bills
  const filteredVendorBills = useMemo(() => {
    return vendorBills.filter(bill => {
      const matchesSearch = !filters.search || 
        bill.bill_number.toLowerCase().includes(filters.search.toLowerCase()) ||
        bill.vendors?.name.toLowerCase().includes(filters.search.toLowerCase());
      
      const matchesStatus = filters.status === 'All' || bill.status === filters.status;
      const matchesVendor = filters.vendor_id === 'All' || bill.vendor_id === filters.vendor_id;
      
      let matchesDateRange = true;
      if (filters.date_from) {
        matchesDateRange = matchesDateRange && bill.bill_date >= filters.date_from;
      }
      if (filters.date_to) {
        matchesDateRange = matchesDateRange && bill.bill_date <= filters.date_to;
      }

      return matchesSearch && matchesStatus && matchesVendor && matchesDateRange;
    });
  }, [vendorBills, filters]);

  // Handle form submissions
  const handleCreateFromPO = async () => {
    if (!selectedPO) return;

    try {
      setIsLoading(true);
      const response = await apiClient.createVendorBillFromPO({
        purchase_order_id: selectedPO.id,
        ...billFromPOData
      });

      if (response.success) {
        alert(`Vendor bill created successfully: ${response.data.vendorBill.bill_number}`);
        setShowCreateFromPO(false);
        setSelectedPO(null);
        setBillFromPOData({
          bill_number: '',
          bill_date: new Date().toISOString().split('T')[0],
          due_date: '',
          notes: ''
        });
        fetchVendorBills();
        fetchPendingPOs();
      } else {
        setError('Failed to create vendor bill');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create vendor bill');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateExpense = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.createExpenseBill(expenseBillData);

      if (response.success) {
        alert(`Expense bill created successfully: ${response.data.vendorBill.bill_number}`);
        setShowCreateExpense(false);
        setExpenseBillData({
          bill_number: '',
          vendor_id: '',
          bill_date: new Date().toISOString().split('T')[0],
          due_date: '',
          expense_category: '',
          description: '',
          subtotal: 0,
          tax_amount: 0,
          total_amount: 0,
          notes: ''
        });
        fetchVendorBills();
      } else {
        setError('Failed to create expense bill');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create expense bill');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateManual = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.createVendorBill(manualBillData);

      if (response.success) {
        alert(`Manual bill created successfully: ${response.data.vendorBill.bill_number}`);
        setShowManualEntry(false);
        setManualBillData({
          bill_number: '',
          vendor_id: '',
          bill_date: new Date().toISOString().split('T')[0],
          due_date: '',
          subtotal: 0,
          tax_amount: 0,
          total_amount: 0,
          notes: ''
        });
        fetchVendorBills();
      } else {
        setError('Failed to create manual bill');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create manual bill');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecordPayment = async () => {
    if (!selectedBill) return;

    try {
      setIsLoading(true);
      const response = await apiClient.updateVendorBillPayment(selectedBill.id, paymentData);

      if (response.success) {
        alert(`Payment of Rs. ${paymentData.paid_amount} recorded successfully`);
        setShowPaymentModal(false);
        setSelectedBill(null);
        setPaymentData({
          paid_amount: 0,
          payment_date: new Date().toISOString().split('T')[0],
          payment_method: 'bank_transfer',
          payment_reference: '',
          payment_notes: ''
        });
        fetchVendorBills();
      } else {
        setError('Failed to record payment');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to record payment');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendViaWhatsApp = async (bill: VendorBill) => {
    try {
      setIsSendingWhatsApp(true);

      // Prepare vendor bill data for WhatsApp
      const vendorBillData: VendorBillData = {
        id: bill.id,
        bill_number: bill.bill_number,
        vendor_name: bill.vendors?.name || 'Unknown Vendor',
        vendor_phone: bill.vendors?.phone,
        total_amount: bill.total_amount,
        due_date: bill.due_date,
        status: bill.status
      };

      // Send via WhatsApp (will open WhatsApp with or without phone number)
      await whatsappService.sendVendorBillViaWhatsApp(vendorBillData);
      
      // Show success message
      const message = bill.vendors?.phone 
        ? `Vendor bill ${bill.bill_number} sent via WhatsApp to ${bill.vendors?.name}`
        : `WhatsApp opened with bill ${bill.bill_number} details. Please select the contact manually.`;
      alert(message);
      
    } catch (error: any) {
      console.error('Error sending vendor bill via WhatsApp:', error);
      alert(error.message || 'Failed to open WhatsApp');
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'approved': return 'bg-blue-100 text-blue-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Calculate summary stats
  const totalBills = filteredVendorBills.length;
  const totalAmount = filteredVendorBills.reduce((sum, bill) => sum + bill.total_amount, 0);
  const paidAmount = filteredVendorBills.reduce((sum, bill) => sum + bill.paid_amount, 0);
  const pendingAmount = totalAmount - paidAmount;
  const overdueBills = filteredVendorBills.filter(bill => 
    bill.status === 'overdue' || (new Date(bill.due_date) < new Date() && bill.status !== 'paid')
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
                <p className="text-sm font-medium text-gray-600">Total Bills</p>
                <p className="text-2xl font-bold text-blue-600">{totalBills}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Amount</p>
                <p className="text-2xl font-bold text-orange-600">Rs. {totalAmount.toLocaleString()}</p>
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
                <p className="text-2xl font-bold text-red-600">{overdueBills}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bill Management & Actions */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-wrap items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Bill Management & Actions</h3>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => setShowCreateFromPO(true)}
              className="flex flex-col items-center justify-center p-5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <svg className="w-6 h-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <span className="text-sm font-medium text-center">Create from Purchase Order</span>
              <span className="text-xs opacity-90 mt-1">Convert PO to Bill</span>
            </button>

            <button
              onClick={() => setShowCreateExpense(true)}
              className="flex flex-col items-center justify-center p-5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <svg className="w-6 h-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
              <span className="text-sm font-medium text-center">Record Expense</span>
              <span className="text-xs opacity-90 mt-1">Direct Expense Entry</span>
            </button>
          </div>
        </div>

        {/* Filters - Conditionally Rendered */}
        {showFilters && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters</h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                placeholder="Search bills..."
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Vendor</label>
              <select
                value={filters.vendor_id}
                onChange={(e) => setFilters({ ...filters, vendor_id: e.target.value })}
                className="w-full px-4 py-2 text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="All">All Vendors</option>
                {vendors.map(vendor => (
                  <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
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
              Showing {filteredVendorBills.length} of {totalBills} bills
            </p>
            <button
              onClick={() => setFilters({
                search: '',
                status: 'All',
                vendor_id: 'All',
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

        {/* Vendor Bills - Grid and List Views */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Vendor Bills</h3>
          </div>

          {viewMode === 'grid' ? (
            // Grid View
            <div className="p-6">
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="text-gray-500 mt-2">Loading vendor bills...</p>
                </div>
              ) : filteredVendorBills.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-gray-500">No vendor bills found</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredVendorBills.map((bill) => (
                    <div key={bill.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer" onClick={() => {
                      setSelectedBill(bill);
                      setShowBillDetails(true);
                    }}>
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Bill #</p>
                          <p className="font-semibold text-blue-600">{bill.bill_number}</p>
                        </div>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          bill.status === 'paid' ? 'bg-green-100 text-green-800' :
                          bill.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                          bill.status === 'overdue' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {bill.status.charAt(0).toUpperCase() + bill.status.slice(1)}
                        </span>
                      </div>
                      
                      <div className="space-y-2 mb-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Vendor:</span>
                          <span className="font-medium text-gray-900">{bill.vendors?.name || 'N/A'}</span>
                        </div>
                        {bill.purchase_order_id && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">PO #:</span>
                            <span className="text-gray-900">{bill.purchase_order_id}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Bill Date:</span>
                          <span className="text-gray-900">{new Date(bill.bill_date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Due Date:</span>
                          <span className="text-gray-900">{new Date(bill.due_date).toLocaleDateString()}</span>
                        </div>
                      </div>
                      
                      <div className="pt-3 border-t border-gray-200">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-xs text-gray-500">Total Amount</p>
                            <p className="text-lg font-bold text-gray-900">Rs. {bill.total_amount.toLocaleString()}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500">Paid</p>
                            <p className="text-sm font-semibold text-green-600">Rs. {(bill.paid_amount || 0).toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-3 flex justify-end gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedBill(bill);
                            setShowPaymentModal(true);
                          }}
                          disabled={bill.status === 'paid'}
                          className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                          Pay
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedBill(bill);
                            setShowBillDetails(true);
                          }}
                          className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          View
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            // List View (Table)
            <div className="overflow-x-auto">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="text-gray-500 mt-2">Loading vendor bills...</p>
              </div>
            ) : filteredVendorBills.length === 0 ? (
              <div className="text-center py-8">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-gray-500">No vendor bills found</p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bill #</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PO #</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bill Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paid</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredVendorBills.map((bill) => (
                    <tr key={bill.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-blue-600 hover:text-blue-800 cursor-pointer"
                             onClick={() => {
                               setSelectedBill(bill);
                               setShowBillDetails(true);
                             }}>
                          {bill.bill_number}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{bill.vendors?.name || 'Unknown'}</div>
                        <div className="text-sm text-gray-500">{bill.vendors?.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {bill.purchase_orders?.po_number || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(bill.bill_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(bill.due_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        Rs. {bill.total_amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        Rs. {bill.paid_amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(bill.status)}`}>
                          {bill.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button
                          onClick={() => {
                            setSelectedBill(bill);
                            setShowBillDetails(true);
                          }}
                          className="text-blue-600 hover:text-blue-700 mr-3"
                        >
                          View
                        </button>
                        <button 
                          onClick={() => handleSendViaWhatsApp(bill)}
                          disabled={isSendingWhatsApp}
                          className="text-green-600 hover:text-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center mr-3"
                          title={bill.vendors?.phone ? `Send via WhatsApp to ${bill.vendors.name}` : 'Open WhatsApp to send bill'}
                        >
                          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.109"/>
                          </svg>
                          {isSendingWhatsApp ? 'Sending...' : 'WhatsApp'}
                        </button>
                        {bill.status !== 'paid' && (
                          <button
                            onClick={() => {
                              setSelectedBill(bill);
                              setPaymentData({
                                ...paymentData,
                                paid_amount: bill.total_amount - bill.paid_amount
                              });
                              setShowPaymentModal(true);
                            }}
                            className="text-purple-600 hover:text-purple-700"
                          >
                            Pay
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            </div>
          )}
        </div>

        {/* Create from Purchase Order Modal */}
        {showCreateFromPO && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full h-[85vh] flex flex-col">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Create Bill from Purchase Order</h2>
                <button
                  onClick={() => {
                    setShowCreateFromPO(false);
                    setPOSearchQuery('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 overflow-hidden min-h-0">
                {/* Left: Purchase Orders List */}
                <div className="lg:col-span-1 flex flex-col min-h-0">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Select Purchase Order</h3>
                  
                  {/* Search Bar */}
                  <div className="mb-4">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search by PO number or vendor..."
                        value={poSearchQuery}
                        onChange={(e) => setPOSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <svg className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                  </div>

                  {/* Purchase Orders List */}
                  <div className="flex-1 overflow-y-auto min-h-0 space-y-2">
                    {purchaseOrders.length === 0 ? (
                      <div className="text-center py-8">
                        <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                        <p className="text-sm text-gray-500">No purchase orders available</p>
                      </div>
                    ) : (
                      purchaseOrders
                        .filter(po => 
                          !poSearchQuery || 
                          po.po_number.toLowerCase().includes(poSearchQuery.toLowerCase()) ||
                          po.vendors?.name?.toLowerCase().includes(poSearchQuery.toLowerCase())
                        )
                        .map((po) => (
                          <div
                            key={po.id}
                            onClick={() => setSelectedPO(po)}
                            className={`p-3 border rounded-lg cursor-pointer transition-all ${
                              selectedPO?.id === po.id 
                                ? 'border-blue-500 bg-blue-50 shadow-sm' 
                                : 'border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex justify-between items-start mb-1">
                              <h4 className="font-semibold text-gray-900 text-sm">{po.po_number}</h4>
                              <span className="text-xs bg-gray-100 px-2 py-1 rounded">{po.status}</span>
                            </div>
                            <p className="text-sm text-gray-600 mb-1">{po.vendors?.name}</p>
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-gray-500">{po.purchase_order_items?.length || 0} items</span>
                              <span className="font-semibold text-gray-900">Rs. {po.total_amount.toLocaleString()}</span>
                            </div>
                            <p className="text-xs text-gray-400 mt-1">{new Date(po.created_at).toLocaleDateString()}</p>
                          </div>
                        ))
                    )}
                  </div>
                </div>

                {/* Right: Bill Details Form */}
                <div className="lg:col-span-2 flex flex-col min-h-0">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Bill Details</h3>
                  
                  {!selectedPO ? (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center">
                        <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-gray-500">Select a purchase order to create a bill</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 overflow-y-auto min-h-0">
                      {/* Selected PO Summary */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold text-gray-900">{selectedPO.po_number}</h4>
                            <p className="text-sm text-gray-600">{selectedPO.vendors?.name}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {selectedPO.purchase_order_items?.length || 0} items
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-gray-900">Rs. {selectedPO.total_amount.toLocaleString()}</p>
                            <p className="text-xs text-gray-500">{new Date(selectedPO.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </div>

                      {/* Bill Form */}
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Bill Number *</label>
                          <input
                            type="text"
                            value={billFromPOData.bill_number}
                            onChange={(e) => setBillFromPOData({ ...billFromPOData, bill_number: e.target.value })}
                            className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Enter bill number"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Bill Date *</label>
                            <input
                              type="date"
                              value={billFromPOData.bill_date}
                              onChange={(e) => setBillFromPOData({ ...billFromPOData, bill_date: e.target.value })}
                              className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
                            <input
                              type="date"
                              value={billFromPOData.due_date}
                              onChange={(e) => setBillFromPOData({ ...billFromPOData, due_date: e.target.value })}
                              className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                          <textarea
                            value={billFromPOData.notes}
                            onChange={(e) => setBillFromPOData({ ...billFromPOData, notes: e.target.value })}
                            rows={4}
                            className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Additional notes..."
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
                <button
                  onClick={() => {
                    setShowCreateFromPO(false);
                    setPOSearchQuery('');
                  }}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateFromPO}
                  disabled={!selectedPO || !billFromPOData.bill_number || isLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isLoading ? 'Creating...' : 'Create Bill'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Additional modals for expense creation, manual entry, payment, etc. would be added here */}
        {/* For brevity, showing the basic structure. The full implementation would include all modals */}

        {/* Create Expense Bill Modal */}
        {showCreateExpense && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Create Expense Bill</h2>
                <button
                  onClick={() => setShowCreateExpense(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Bill Number *</label>
                    <input
                      type="text"
                      value={expenseBillData.bill_number}
                      onChange={(e) => setExpenseBillData({ ...expenseBillData, bill_number: e.target.value })}
                      className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter bill number"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Vendor *</label>
                    <select
                      value={expenseBillData.vendor_id}
                      onChange={(e) => setExpenseBillData({ ...expenseBillData, vendor_id: e.target.value })}
                      className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select Vendor</option>
                      {vendors.map(vendor => (
                        <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Bill Date *</label>
                    <input
                      type="date"
                      value={expenseBillData.bill_date}
                      onChange={(e) => setExpenseBillData({ ...expenseBillData, bill_date: e.target.value })}
                      className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
                    <input
                      type="date"
                      value={expenseBillData.due_date}
                      onChange={(e) => setExpenseBillData({ ...expenseBillData, due_date: e.target.value })}
                      className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Amount *</label>
                    <input
                      type="number"
                      value={expenseBillData.total_amount}
                      onChange={(e) => setExpenseBillData({ ...expenseBillData, total_amount: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Expense Category</label>
                    <select
                      value={expenseBillData.expense_category}
                      onChange={(e) => setExpenseBillData({ ...expenseBillData, expense_category: e.target.value })}
                      className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select Category</option>
                      <option value="utilities">Utilities</option>
                      <option value="office_supplies">Office Supplies</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="professional_services">Professional Services</option>
                      <option value="marketing">Marketing</option>
                      <option value="travel">Travel</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <textarea
                      value={expenseBillData.description}
                      onChange={(e) => setExpenseBillData({ ...expenseBillData, description: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Expense description..."
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
                <button
                  onClick={() => setShowCreateExpense(false)}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateExpense}
                  disabled={!expenseBillData.bill_number || !expenseBillData.vendor_id || !expenseBillData.total_amount || isLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isLoading ? 'Creating...' : 'Create Expense Bill'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Payment Recording Modal */}
        {showPaymentModal && selectedBill && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Record Payment</h2>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-6">
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">Bill Total:</span>
                    <span className="font-semibold text-gray-900">Rs. {selectedBill.total_amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">Paid Amount:</span>
                    <span className="font-semibold text-gray-900">Rs. {selectedBill.paid_amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Remaining:</span>
                    <span className="font-semibold text-red-600">
                      Rs. {(selectedBill.total_amount - selectedBill.paid_amount).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Payment Amount *</label>
                    <input
                      type="number"
                      value={paymentData.paid_amount}
                      onChange={(e) => setPaymentData({ ...paymentData, paid_amount: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      min="0"
                      max={selectedBill.total_amount - selectedBill.paid_amount}
                      step="0.01"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                    <select
                      value={paymentData.payment_method}
                      onChange={(e) => setPaymentData({ ...paymentData, payment_method: e.target.value })}
                      className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="cash">Cash</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="check">Check</option>
                      <option value="credit_card">Credit Card</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Payment Date</label>
                    <input
                      type="date"
                      value={paymentData.payment_date}
                      onChange={(e) => setPaymentData({ ...paymentData, payment_date: e.target.value })}
                      className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Reference/Notes</label>
                    <textarea
                      value={paymentData.payment_notes}
                      onChange={(e) => setPaymentData({ ...paymentData, payment_notes: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Payment reference or notes..."
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRecordPayment}
                  disabled={!paymentData.paid_amount || paymentData.paid_amount <= 0 || isLoading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {isLoading ? 'Recording...' : 'Record Payment'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bill Details Modal */}
        {showBillDetails && selectedBill && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Bill Details - {selectedBill.bill_number}</h2>
                <button
                  onClick={() => setShowBillDetails(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Bill Information</h3>
                    <div className="space-y-3">
                      <div>
                        <span className="text-sm font-medium text-gray-700">Bill Number:</span>
                        <p className="font-semibold text-gray-900">{selectedBill.bill_number}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-700">Bill Date:</span>
                        <p className="font-semibold text-gray-900">{new Date(selectedBill.bill_date).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-700">Due Date:</span>
                        <p className="font-semibold text-gray-900">{new Date(selectedBill.due_date).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-700">Status:</span>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedBill.status)}`}>
                          {selectedBill.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Vendor Information</h3>
                    <div className="space-y-3">
                      <div>
                        <span className="text-sm font-medium text-gray-700">Vendor Name:</span>
                        <p className="font-semibold text-gray-900">{selectedBill.vendors?.name || 'Unknown'}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-700">Email:</span>
                        <p className="font-semibold text-gray-900">{selectedBill.vendors?.email || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-700">Phone:</span>
                        <p className="font-semibold text-gray-900">{selectedBill.vendors?.phone || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Amount Details</h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-gray-700">Total Amount:</span>
                        <span className="text-lg font-bold text-gray-900">Rs. {selectedBill.total_amount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-gray-700">Paid Amount:</span>
                        <span className="font-bold text-green-600">Rs. {selectedBill.paid_amount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-gray-700">Remaining:</span>
                        <span className="font-bold text-red-600">
                          Rs. {(selectedBill.total_amount - selectedBill.paid_amount).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {selectedBill.notes && (
                    <div className="md:col-span-2">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Notes</h3>
                      <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">{selectedBill.notes}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
                <button
                  onClick={() => setShowBillDetails(false)}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Close
                </button>
                {selectedBill.status !== 'paid' && (
                  <button
                    onClick={() => {
                      setPaymentData({
                        ...paymentData,
                        paid_amount: selectedBill.total_amount - selectedBill.paid_amount
                      });
                      setShowBillDetails(false);
                      setShowPaymentModal(true);
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Record Payment
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default PayableInvoicesPage;
