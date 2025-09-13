'use client';

import React, { useState, useEffect, useMemo } from 'react';
import AppLayout from '../components/AppLayout';
import { apiClient } from '../lib/api';

interface VendorBill {
  id: string;
  bill_number: string;
  vendor_id: string;
  purchase_order_id?: string;
  bill_date: string;
  due_date: string;
  status: 'pending' | 'approved' | 'paid' | 'overdue';
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

interface Vendor {
  id: string;
  name: string;
  email: string;
  contact_person: string;
  status: string;
}

const PayableInvoicesPage = () => {
  const [vendorBills, setVendorBills] = useState<VendorBill[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
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
          <h1 className="text-3xl font-bold text-gray-900">Payable Invoices (Vendor Bills)</h1>
          <p className="mt-2 text-gray-600">Manage vendor bills and payables</p>
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

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => setShowCreateFromPO(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              Create from Purchase Order
            </button>

            <button
              onClick={() => setShowCreateExpense(true)}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
              Record Expense
            </button>

            <button
              onClick={() => setShowManualEntry(true)}
              className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Manual Entry
            </button>

            <button
              onClick={fetchVendorBills}
              className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>

            {purchaseOrders.length > 0 && (
              <div className="flex items-center px-3 py-2 bg-blue-100 text-blue-800 rounded-lg">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {purchaseOrders.length} purchase order(s) ready for billing
              </div>
            )}
          </div>
        </div>

        {/* Rest of the component continues... */}
        {/* Filters */}
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

        {/* Vendor Bills Table */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Vendor Bills</h3>
          </div>

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
                            className="text-green-600 hover:text-green-700"
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
        </div>

        {/* Create from Purchase Order Modal */}
        {showCreateFromPO && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Create Bill from Purchase Order</h2>
                <button
                  onClick={() => setShowCreateFromPO(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-6">
                {/* Select Purchase Order */}
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Select Purchase Order</h3>
                  {purchaseOrders.length === 0 ? (
                    <div className="text-center py-8">
                      <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                      <h4 className="text-lg font-medium text-gray-900 mb-2">No Purchase Orders Available</h4>
                      <p className="text-gray-500">No purchase orders are ready for billing. Create purchase orders first.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3">
                      {purchaseOrders.map((po) => (
                        <div
                          key={po.id}
                          onClick={() => setSelectedPO(po)}
                          className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                            selectedPO?.id === po.id 
                              ? 'border-blue-500 bg-blue-50' 
                              : 'border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium text-gray-900">{po.po_number}</h4>
                              <p className="text-sm text-gray-600">{po.vendors?.name}</p>
                              <p className="text-sm text-gray-500">
                                {po.purchase_order_items?.length || 0} items • Status: {po.status}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-gray-900">Rs. {po.total_amount.toLocaleString()}</p>
                              <p className="text-sm text-gray-500">{new Date(po.created_at).toLocaleDateString()}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bill Details Form */}
                {selectedPO && (
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Bill Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                        <textarea
                          value={billFromPOData.notes}
                          onChange={(e) => setBillFromPOData({ ...billFromPOData, notes: e.target.value })}
                          rows={3}
                          className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Additional notes..."
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
                <button
                  onClick={() => setShowCreateFromPO(false)}
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
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
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
                    <span className="text-sm text-gray-600">Bill Total:</span>
                    <span className="font-medium">Rs. {selectedBill.total_amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">Paid Amount:</span>
                    <span className="font-medium">Rs. {selectedBill.paid_amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Remaining:</span>
                    <span className="font-semibold text-red-600">
                      Rs. {(selectedBill.total_amount - selectedBill.paid_amount).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
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
                        <span className="text-sm text-gray-600">Bill Number:</span>
                        <p className="font-medium">{selectedBill.bill_number}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Bill Date:</span>
                        <p className="font-medium">{new Date(selectedBill.bill_date).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Due Date:</span>
                        <p className="font-medium">{new Date(selectedBill.due_date).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Status:</span>
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
                        <span className="text-sm text-gray-600">Vendor Name:</span>
                        <p className="font-medium">{selectedBill.vendors?.name || 'Unknown'}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Email:</span>
                        <p className="font-medium">{selectedBill.vendors?.email || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Phone:</span>
                        <p className="font-medium">{selectedBill.vendors?.phone || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Amount Details</h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-600">Total Amount:</span>
                        <span className="text-lg font-semibold">Rs. {selectedBill.total_amount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-600">Paid Amount:</span>
                        <span className="font-medium text-green-600">Rs. {selectedBill.paid_amount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Remaining:</span>
                        <span className="font-semibold text-red-600">
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
