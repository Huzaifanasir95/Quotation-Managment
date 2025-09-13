'use client';

import { useState, useEffect } from 'react';
import AppLayout from '../components/AppLayout';
import CreateQuotationModal from '../components/sales/CreateQuotationModal';
import AddCustomerModal from '../components/sales/AddCustomerModalMultiStep';
import ConvertQuoteModal from '../components/sales/ConvertQuoteModal';
import SearchQuotationsModal from '../components/sales/SearchQuotationsModal';
import EditCustomerModal from '../components/sales/EditCustomerModal';
import ViewCustomerQuotesModal from '../components/sales/ViewCustomerQuotesModal';
import QuotationTrendsModal from '../components/sales/QuotationTrendsModal';
import TopCustomersModal from '../components/sales/TopCustomersModal';
import { apiClient, type SalesDashboardData, type QuotationTrend, type Customer } from '../lib/api';

interface SalesOrder {
  id: string;
  order_number: string;
  customer_id: string;
  status: string;
  total_amount: number;
  order_date: string;
  expected_delivery_date: string;
  customers?: { name: string; email: string };
  created_at: string;
}

export default function SalesPage() {
  const [showCreateQuotation, setShowCreateQuotation] = useState(false);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [showConvertQuote, setShowConvertQuote] = useState(false);
  const [showSearchQuotations, setShowSearchQuotations] = useState(false);
  const [showEditCustomer, setShowEditCustomer] = useState(false);
  const [showViewQuotes, setShowViewQuotes] = useState(false);
  const [showQuotationTrends, setShowQuotationTrends] = useState(false);
  const [showTopCustomers, setShowTopCustomers] = useState(false);
  const [showOrderManagement, setShowOrderManagement] = useState(false);
  const [showUpdateDeliveryStatus, setShowUpdateDeliveryStatus] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);

  // State for real data
  const [salesData, setSalesData] = useState<SalesDashboardData | null>(null);
  const [quotationTrends, setQuotationTrends] = useState<QuotationTrend[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(false); // Changed to false for immediate UI
  const [dataLoading, setDataLoading] = useState({
    customers: true,
    dashboard: true,
    trends: true,
    orders: true
  });
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [customersViewMode, setCustomersViewMode] = useState<'list' | 'grid'>('grid');

  // Fetch data from backend - Optimized for performance
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setError(null);
        const startTime = Date.now();
        
        // Load customers first (most important for user interaction)
        const fetchCustomers = async () => {
          try {
            const customersResponse = await apiClient.getSalesCustomers({ limit: 50 });
            
            if (customersResponse.success) {
              setCustomers(customersResponse.data.customers);
            }
          } catch (err) {
            console.error('❌ Failed to fetch customers:', err);
          } finally {
            setDataLoading(prev => ({ ...prev, customers: false }));
          }
        };

        // Load dashboard data (for stats)
        const fetchDashboard = async () => {
          try {
            const dashboardResponse = await apiClient.getSalesDashboard();
            
            if (dashboardResponse.success) {
              setSalesData(dashboardResponse.data);
            }
          } catch (err) {
            console.error('❌ Failed to fetch dashboard data:', err);
          } finally {
            setDataLoading(prev => ({ ...prev, dashboard: false }));
          }
        };

        // Load trends data (least critical)
        const fetchTrends = async () => {
          try {
            const trendsResponse = await apiClient.getQuotationTrends();
            
            if (trendsResponse.success) {
              setQuotationTrends(trendsResponse.data.trends);
            }
          } catch (err) {
            console.error('❌ Failed to fetch trends:', err);
          } finally {
            setDataLoading(prev => ({ ...prev, trends: false }));
          }
        };

        // Load sales orders
        const fetchOrders = async () => {
          try {
            const ordersResponse = await apiClient.getSalesOrders({ limit: 50 });
            
            if (ordersResponse.success) {
              setSalesOrders(ordersResponse.data.orders || []);
            }
          } catch (err) {
            console.error('❌ Failed to fetch orders:', err);
          } finally {
            setDataLoading(prev => ({ ...prev, orders: false }));
          }
        };

        // Start all fetches in parallel for fastest loading
        Promise.all([
          fetchCustomers(),
          fetchDashboard(),
          fetchTrends(),
          fetchOrders()
        ]).then(() => {
        });
        
      } catch (err) {
        console.error('❌ Critical error in sales data fetch:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      }
    };
    
    fetchInitialData();
  }, []);
  
  // Filter customers based on search term
  const filteredCustomers = customers.filter(customer => 
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.contact_person?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handler functions for customer actions
  const handleEditCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowEditCustomer(true);
  };

  const handleViewQuotes = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowViewQuotes(true);
  };

  const handleDeleteCustomer = async (customer: Customer) => {
    if (confirm(`Are you sure you want to delete customer "${customer.name}"? This action cannot be undone.`)) {
      try {
        const response = await apiClient.deleteCustomer(customer.id);
        if (response.success) {
          alert('Customer deleted successfully!');
          // Refresh customer list
          const customersResponse = await apiClient.getSalesCustomers({ limit: 50 });
          if (customersResponse.success) {
            setCustomers(customersResponse.data.customers);
          }
        } else {
          throw new Error(response.message || 'Failed to delete customer');
        }
      } catch (error) {
        console.error('Failed to delete customer:', error);
        alert(`Failed to delete customer: ${error instanceof Error ? error.message : 'Please try again.'}`);
      }
    }
  };

  const refreshCustomers = async () => {
    try {
      const customersResponse = await apiClient.getSalesCustomers({ limit: 20 });
      if (customersResponse.success) {
        setCustomers(customersResponse.data.customers);
      }
    } catch (error) {
      console.error('Failed to refresh customers:', error);
    }
  };

  const refreshDashboardData = async () => {
    try {
      const [dashboardResponse, trendsResponse, ordersResponse] = await Promise.all([
        apiClient.getSalesDashboard(),
        apiClient.getQuotationTrends(),
        apiClient.getSalesOrders({ limit: 50 })
      ]);
      
      if (dashboardResponse.success) {
        setSalesData(dashboardResponse.data);
      }
      
      if (trendsResponse.success) {
        setQuotationTrends(trendsResponse.data.trends);
      }

      if (ordersResponse.success) {
        setSalesOrders(ordersResponse.data.orders || []);
      }
    } catch (error) {
      console.error('Failed to refresh dashboard data:', error);
    }
  };

  const handleUpdateDeliveryStatus = async (orderId: string, status: string, deliveryDate?: string) => {
    try {
      const response = await apiClient.updateDeliveryStatus(orderId, {
        delivery_status: status,
        delivery_date: deliveryDate || new Date().toISOString().split('T')[0],
        delivery_notes: `Status updated to ${status}`
      });

      if (response.success) {
        if (response.data.auto_generated_invoice) {
          alert(`Order status updated and invoice ${response.data.auto_generated_invoice.invoice_number} was automatically generated!`);
        } else {
          alert('Order delivery status updated successfully!');
        }
        
        // Refresh orders
        const ordersResponse = await apiClient.getSalesOrders({ limit: 50 });
        if (ordersResponse.success) {
          setSalesOrders(ordersResponse.data.orders || []);
        }
        
        setShowUpdateDeliveryStatus(false);
        setSelectedOrder(null);
      } else {
        alert('Failed to update delivery status');
      }
    } catch (error) {
      console.error('Failed to update delivery status:', error);
      alert('Failed to update delivery status');
    }
  };
  
  // Error state
  if (error) {
    return (
      <AppLayout>
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error loading sales data</h3>
                <p className="mt-1 text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
      <div className="mb-8"></div>
        {/* KPI Widgets */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Pending Quotations */}
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-md font-medium text-gray-600">Pending Quotations</p>
                <p className="text-4xl font-bold text-gray-900">
                  {salesData?.pendingQuotations ?? (
                    <span className="inline-block w-8 h-8 bg-gray-200 rounded animate-pulse"></span>
                  )}
                </p>
              </div> 
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Top Customers */}
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-md font-medium text-gray-600">Top Customers</p>
                <p className="text-4xl font-bold text-gray-900">
                  {salesData?.topCustomers?.length ?? (
                    <span className="inline-block w-8 h-8 bg-gray-200 rounded animate-pulse"></span>
                  )}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Recent Inquiries */}
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-md font-medium text-gray-600">Recent Inquiries</p>
                <p className="text-4xl font-bold text-gray-900">
                  {salesData?.recentInquiries ?? (
                    <span className="inline-block w-8 h-8 bg-gray-200 rounded animate-pulse"></span>
                  )}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
            </div>
            <p className="mt-2 text-sm text-orange-600">Unprocessed</p>
          </div>
        </div>

        {/* High-Frequency Sales Tasks */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <button
              onClick={() => setShowCreateQuotation(true)}
              className="flex items-center justify-center p-4 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors duration-200"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Create New Quotation
            </button>

            <button
              onClick={() => setShowAddCustomer(true)}
              className="flex items-center justify-center p-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              Add New Customer
            </button>

            <button
              onClick={() => setShowConvertQuote(true)}
              className="flex items-center justify-center p-4 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors duration-200"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              Convert Quote to Order
            </button>

            <button
              onClick={() => setShowOrderManagement(true)}
              className="flex items-center justify-center p-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              Manage Orders
            </button>

            <button
              onClick={() => setShowSearchQuotations(true)}
              className="flex items-center justify-center p-4 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors duration-200"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Search Quotations
            </button>
          </div>
        </div>

        {/* Customers List */}
        <div className="bg-white rounded-lg shadow-md mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Customers</h3>
              <div className="flex items-center space-x-4">
                {/* View Mode Toggles */}
                <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setCustomersViewMode('list')}
                    className={`p-2 rounded-md transition-colors duration-200 ${
                      customersViewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                    }`}
                    title="List View"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setCustomersViewMode('grid')}
                    className={`p-2 rounded-md transition-colors duration-200 ${
                      customersViewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                    }`}
                    title="Grid View"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                  </button>
                </div>
                
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search customers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {customersViewMode === 'list' ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tax/GST Info</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Quotes</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {dataLoading.customers ? (
                    // Skeleton rows while loading
                    Array.from({ length: 5 }).map((_, index) => (
                      <tr key={`skeleton-${index}`} className="animate-pulse">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-48"></div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-32"></div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="h-6 bg-gray-200 rounded-full w-20"></div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="h-4 bg-gray-200 rounded w-16 mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-12"></div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="h-6 bg-gray-200 rounded-full w-16"></div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-3">
                            <div className="h-8 w-8 bg-gray-200 rounded"></div>
                            <div className="h-8 w-8 bg-gray-200 rounded"></div>
                            <div className="h-8 w-8 bg-gray-200 rounded"></div>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <div className="text-gray-500">
                          <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          <p className="text-lg">No customers found</p>
                          <p className="text-sm">Try adjusting your search criteria</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers.map((customer) => (
                      <tr key={customer.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <p className="font-medium text-gray-900">{customer.name}</p>
                            <p className="text-sm text-gray-500">{customer.email}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <p className="text-sm text-gray-900">{customer.contact_person || 'N/A'}</p>
                            <p className="text-sm text-gray-500">{customer.phone}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            {customer.gst_number || 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <p className="text-sm font-medium text-gray-900">Rs. {(customer.totalQuotes || 0).toLocaleString()}</p>
                            <p className="text-xs text-gray-500">{customer.quotesCount || 0} quotes</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            customer.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {customer.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center space-x-3">
                            <button 
                              onClick={() => handleEditCustomer(customer)}
                              className="text-blue-600 hover:text-blue-700 p-1 rounded hover:bg-blue-50 transition-colors duration-200"
                              title="Edit Customer"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button 
                              onClick={() => handleViewQuotes(customer)}
                              className="text-green-600 hover:text-green-700 p-1 rounded hover:bg-green-50 transition-colors duration-200"
                              title="View Quotes"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                            <button 
                              onClick={() => handleDeleteCustomer(customer)}
                              className="text-red-600 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors duration-200"
                              title="Delete Customer"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6">
              {dataLoading.customers ? (
                // Skeleton grid while loading
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div key={`grid-skeleton-${index}`} className="border border-gray-200 rounded-xl p-6 animate-pulse">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="h-5 bg-gray-200 rounded w-32 mb-2"></div>
                          <div className="h-4 bg-gray-200 rounded w-48"></div>
                        </div>
                        <div className="h-6 bg-gray-200 rounded-full w-16"></div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <div className="h-4 bg-gray-200 rounded w-20"></div>
                          <div className="h-4 bg-gray-200 rounded w-24"></div>
                        </div>
                        <div className="flex justify-between">
                          <div className="h-4 bg-gray-200 rounded w-16"></div>
                          <div className="h-4 bg-gray-200 rounded w-20"></div>
                        </div>
                      </div>
                      <div className="flex space-x-2 mt-4">
                        <div className="h-8 bg-gray-200 rounded flex-1"></div>
                        <div className="h-8 bg-gray-200 rounded flex-1"></div>
                        <div className="h-8 bg-gray-200 rounded flex-1"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredCustomers.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No customers found</h3>
                  <p className="text-gray-500">Try adjusting your search criteria</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredCustomers.map((customer) => (
                    <div 
                      key={customer.id} 
                      className="border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-200 bg-white"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h4 className="text-lg font-bold text-gray-900">{customer.name}</h4>
                          <p className="text-gray-600 text-sm">{customer.email}</p>
                          {customer.contact_person && (
                            <p className="text-gray-500 text-xs">{customer.contact_person}</p>
                          )}
                        </div>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          customer.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {customer.status}
                        </span>
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Phone:</span>
                          <span className="text-gray-900">{customer.phone || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">GST:</span>
                          <span className="text-gray-900">{customer.gst_number || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Total Quotes:</span>
                          <span className="text-gray-900 font-medium">Rs. {(customer.totalQuotes || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Quotes Count:</span>
                          <span className="text-gray-900">{customer.quotesCount || 0}</span>
                        </div>
                      </div>

                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEditCustomer(customer)}
                          className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 text-sm flex items-center justify-center"
                          title="Edit Customer"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit
                        </button>
                        <button
                          onClick={() => handleViewQuotes(customer)}
                          className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 text-sm flex items-center justify-center"
                          title="View Quotes"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          View
                        </button>
                        <button
                          onClick={() => handleDeleteCustomer(customer)}
                          className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 text-sm flex items-center justify-center"
                          title="Delete Customer"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Analytics Action Buttons */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Analytics & Reports</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => setShowQuotationTrends(true)}
              className="flex items-center justify-center p-6 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <svg className="w-8 h-8 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <div className="text-left">
                <h4 className="text-lg font-semibold">Quotation Trends</h4>
                <p className="text-slate-200 text-sm">View 6-month performance</p>
              </div>
            </button>

            <button
              onClick={() => setShowTopCustomers(true)}
              className="flex items-center justify-center p-6 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <svg className="w-8 h-8 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <div className="text-left">
                <h4 className="text-lg font-semibold">Top Customers</h4>
                <p className="text-gray-200 text-sm">View customer rankings</p>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showAddCustomer && (
        <AddCustomerModal
          isOpen={showAddCustomer}
          onClose={() => setShowAddCustomer(false)}
          onCustomerAdded={() => {
            refreshCustomers();
          }}
        />
      )}

      <CreateQuotationModal 
        isOpen={showCreateQuotation} 
        onClose={() => setShowCreateQuotation(false)}
        onQuotationCreated={() => {
          refreshDashboardData();
          refreshCustomers();
        }}
      />
      
      <ConvertQuoteModal 
        isOpen={showConvertQuote} 
        onClose={() => setShowConvertQuote(false)}
        onOrderCreated={() => {
        }}
      />
      
      <SearchQuotationsModal 
        isOpen={showSearchQuotations} 
        onClose={() => setShowSearchQuotations(false)} 
      />

      <EditCustomerModal
        isOpen={showEditCustomer}
        onClose={() => {
          setShowEditCustomer(false);
          setSelectedCustomer(null);
        }}
        onCustomerUpdated={() => {
          refreshCustomers();
          setShowEditCustomer(false);
          setSelectedCustomer(null);
        }}
        customer={selectedCustomer}
      />

      <ViewCustomerQuotesModal
        isOpen={showViewQuotes}
        onClose={() => {
          setShowViewQuotes(false);
          setSelectedCustomer(null);
        }}
        customer={selectedCustomer}
      />

      <QuotationTrendsModal
        isOpen={showQuotationTrends}
        onClose={() => setShowQuotationTrends(false)}
        trends={quotationTrends}
      />

      <TopCustomersModal
        isOpen={showTopCustomers}
        onClose={() => setShowTopCustomers(false)}
        customers={salesData?.topCustomers || []}
      />

      {/* Order Management Modal */}
      {showOrderManagement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Sales Orders Management</h2>
              <button
                onClick={() => setShowOrderManagement(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              {dataLoading.orders ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-500 mt-2">Loading orders...</p>
                </div>
              ) : salesOrders.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Sales Orders Found</h3>
                  <p className="text-gray-500">Convert some quotations to orders to see them here</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order #</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expected Delivery</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {salesOrders.map((order) => (
                        <tr key={order.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-blue-600">{order.order_number}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{order.customers?.name || 'Unknown'}</div>
                            <div className="text-sm text-gray-500">{order.customers?.email}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(order.order_date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {order.expected_delivery_date ? new Date(order.expected_delivery_date).toLocaleDateString() : 'Not set'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            Rs. {order.total_amount.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                              order.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                              order.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                              order.status === 'pending' ? 'bg-gray-100 text-gray-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {order.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <button
                              onClick={() => {
                                setSelectedOrder(order);
                                setShowUpdateDeliveryStatus(true);
                              }}
                              className="text-blue-600 hover:text-blue-700 mr-3"
                            >
                              Update Status
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Update Delivery Status Modal */}
      {showUpdateDeliveryStatus && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Update Delivery Status</h2>
              <button
                onClick={() => {
                  setShowUpdateDeliveryStatus(false);
                  setSelectedOrder(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <h3 className="font-medium text-gray-900">{selectedOrder.order_number}</h3>
                <p className="text-sm text-gray-500">{selectedOrder.customers?.name}</p>
                <p className="text-sm text-gray-500">Current Status: <span className="font-medium">{selectedOrder.status}</span></p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => handleUpdateDeliveryStatus(selectedOrder.id, 'processing')}
                  className="w-full p-3 text-left border border-gray-200 rounded-lg hover:bg-yellow-50 hover:border-yellow-300 transition-colors"
                >
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full mr-3"></div>
                    <div>
                      <p className="font-medium text-gray-900">Mark as Processing</p>
                      <p className="text-sm text-gray-500">Order is being prepared</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => handleUpdateDeliveryStatus(selectedOrder.id, 'shipped')}
                  className="w-full p-3 text-left border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                    <div>
                      <p className="font-medium text-gray-900">Mark as Shipped</p>
                      <p className="text-sm text-gray-500">Order has been dispatched</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => handleUpdateDeliveryStatus(selectedOrder.id, 'delivered')}
                  className="w-full p-3 text-left border border-gray-200 rounded-lg hover:bg-green-50 hover:border-green-300 transition-colors"
                >
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                    <div>
                      <p className="font-medium text-gray-900">Mark as Delivered</p>
                      <p className="text-sm text-gray-500">Order delivered to customer (auto-generates invoice)</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => handleUpdateDeliveryStatus(selectedOrder.id, 'cancelled')}
                  className="w-full p-3 text-left border border-gray-200 rounded-lg hover:bg-red-50 hover:border-red-300 transition-colors"
                >
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-red-500 rounded-full mr-3"></div>
                    <div>
                      <p className="font-medium text-gray-900">Cancel Order</p>
                      <p className="text-sm text-gray-500">Mark order as cancelled</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => {
                  setShowUpdateDeliveryStatus(false);
                  setSelectedOrder(null);
                }}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
