'use client';

import { useState, useEffect } from 'react';
import AppLayout from '../components/AppLayout';
import CreatePurchaseOrderModal from '../components/purchases/CreatePurchaseOrderModal';
import EditPurchaseOrderModal from '../components/purchases/EditPurchaseOrderModal';
import UploadVendorBillModal from '../components/purchases/UploadVendorBillModal';
import GenerateDeliveryChallanModal from '../components/purchases/GenerateDeliveryChallanModal';
import PurchaseOrderDetailsModal from '../components/purchases/PurchaseOrderDetailsModal';
import { apiClient, type PurchaseOrder, type Vendor } from '../lib/api';

export default function PurchasesPage() {
  const [showCreatePO, setShowCreatePO] = useState(false);
  const [showEditPO, setShowEditPO] = useState(false);
  const [showUploadBill, setShowUploadBill] = useState(false);
  const [showGenerateChallan, setShowGenerateChallan] = useState(false);
  const [showPODetails, setShowPODetails] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  
  // Data state
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Data loading states for progressive loading
  const [dataLoading, setDataLoading] = useState({
    purchaseOrders: true,
    vendors: true
  });
  
  // Filters state
  const [filters, setFilters] = useState({
    vendor: 'All',
    status: 'All',
    dateFrom: '',
    dateTo: '',
    poId: ''
  });
  
  // UI state
  const [showFilters, setShowFilters] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Fetch data from backend
  const loadPurchaseOrders = async () => {
    try {
      const startTime = Date.now();
      
      setLoading(true);
      setError(null);
      setDataLoading({ purchaseOrders: true, vendors: true });
      
      // Fetch purchase orders and vendors in parallel
      const [poResponse, vendorsResponse] = await Promise.all([
        apiClient.getPurchaseOrders({ limit: 100 }).then(response => {
          setDataLoading(prev => ({ ...prev, purchaseOrders: false }));
          return response;
        }),
        apiClient.getVendors({ limit: 100 }).then(response => {
          setDataLoading(prev => ({ ...prev, vendors: false }));
          return response;
        })
      ]);
      
      if (poResponse.success) {
        setPurchaseOrders(poResponse.data.purchaseOrders || []);
      }
      
      if (vendorsResponse.success) {
        setVendors(vendorsResponse.data.vendors || []);
      }
      
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setError('Failed to load purchase orders. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPurchaseOrders();
  }, []);

  const vendorOptions = ['All', ...vendors.map(v => v.name)];
  const statuses = ['All', 'draft', 'pending_approval', 'approved', 'sent', 'received', 'closed', 'cancelled'];

  const filteredPOs = purchaseOrders.filter(po => {
    const matchesVendor = filters.vendor === 'All' || po.vendors?.name === filters.vendor;
    const matchesStatus = filters.status === 'All' || po.status === filters.status;
    const matchesDateFrom = !filters.dateFrom || po.po_date >= filters.dateFrom;
    const matchesDateTo = !filters.dateTo || po.po_date <= filters.dateTo;
    const matchesPOId = !filters.poId || po.po_number.toLowerCase().includes(filters.poId.toLowerCase());
    
    return matchesVendor && matchesStatus && matchesDateFrom && matchesDateTo && matchesPOId;
  });

  // Refresh data function
  const refreshData = async () => {
    try {
      setDataLoading(prev => ({ ...prev, purchaseOrders: true }));
      const response = await apiClient.getPurchaseOrders({ limit: 100 });
      if (response.success) {
        setPurchaseOrders(response.data.purchaseOrders || []);
      }
    } catch (error) {
      console.error('Failed to refresh purchase orders:', error);
    } finally {
      setDataLoading(prev => ({ ...prev, purchaseOrders: false }));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'pending_approval': return 'bg-yellow-100 text-yellow-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'received': return 'bg-purple-100 text-purple-800';
      case 'closed': return 'bg-indigo-100 text-indigo-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatStatus = (status: string) => {
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const handleViewPODetails = (po: PurchaseOrder) => {
    setSelectedPO(po);
    setShowPODetails(true);
  };

  const handleEditPO = (po: PurchaseOrder) => {
    setSelectedPO(po);
    setShowEditPO(true);
  };

  const handleApprovePO = async (po: PurchaseOrder) => {
    try {
      const response = await apiClient.updatePurchaseOrderStatus(po.id, 'approved');
      if (response.success) {
        alert(`Purchase Order ${po.po_number} approved successfully!`);
        refreshData();
      } else {
        throw new Error(response.message || 'Failed to approve purchase order');
      }
    } catch (error) {
      console.error('Failed to approve PO:', error);
      alert(`Failed to approve ${po.po_number}: ${error instanceof Error ? error.message : 'Please try again.'}`);
    }
  };

  const handleAttachBill = (po: PurchaseOrder) => {
    setSelectedPO(po);
    setShowUploadBill(true);
  };

  const handleGenerateChallan = (po: PurchaseOrder) => {
    setSelectedPO(po);
    setShowGenerateChallan(true);
  };

  const clearFilters = () => {
    setFilters({
      vendor: 'All',
      status: 'All',
      dateFrom: '',
      dateTo: '',
      poId: ''
    });
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
                <h3 className="text-sm font-medium text-red-800">Error loading purchase orders</h3>
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
        {/* Header */}
        <div className="mb-8"></div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="flex justify-center">
            <button
              onClick={() => setShowCreatePO(true)}
              className="flex items-center justify-center px-8 py-4 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors duration-200 shadow-md hover:shadow-lg text-lg font-medium"
            >
              <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Create New Purchase Order
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
            <div className="flex items-center gap-4">
              {/* View Mode Toggle */}
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'list' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  title="List View"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'grid' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  title="Grid View"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                  </svg>
                </button>
              </div>
              
              {/* Hide/Show Filters Button */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                <span className="text-sm font-medium">
                  {showFilters ? 'Hide Filters' : 'Show Filters'}
                </span>
                <svg 
                  className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>
          
          {showFilters && (
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Vendor</label>
                  <select
                    value={filters.vendor}
                    onChange={(e) => setFilters({ ...filters, vendor: e.target.value })}
                    className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {vendorOptions.map(vendor => (
                      <option key={vendor} value={vendor}>{vendor}</option>
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
                      <option key={status} value={status}>{status === 'All' ? 'All' : formatStatus(status)}</option>
                    ))}
                  </select>
                </div>

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
                  <label className="block text-sm font-medium text-gray-700 mb-2">PO ID</label>
                  <input
                    type="text"
                    value={filters.poId}
                    onChange={(e) => setFilters({ ...filters, poId: e.target.value })}
                    placeholder="Search PO ID..."
                    className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Found {filteredPOs.length} purchase order(s)
                </p>
                <button
                  onClick={clearFilters}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Purchase Orders */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Purchase Orders</h3>
          </div>

          <div className="p-6">
            {filteredPOs.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No purchase orders found.</p>
                <p className="text-sm text-gray-400 mt-1">Total POs: {purchaseOrders.length} | Filtered: {filteredPOs.length}</p>
              </div>
            ) : viewMode === 'list' ? (
              // List View
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PO ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Linked Ref</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Created</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attached Bills</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {dataLoading.purchaseOrders ? (
                      // Skeleton loading rows
                      Array.from({ length: 5 }, (_, index) => (
                        <tr key={`skeleton-${index}`} className="animate-pulse">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="h-4 bg-gray-200 rounded w-24"></div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="space-y-1">
                              <div className="h-4 bg-gray-200 rounded w-32"></div>
                              <div className="h-3 bg-gray-200 rounded w-20"></div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="space-y-1">
                              <div className="h-3 bg-gray-200 rounded w-16"></div>
                              <div className="h-3 bg-gray-200 rounded w-20"></div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="h-4 bg-gray-200 rounded w-20"></div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="h-6 bg-gray-200 rounded-full w-20"></div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="h-4 bg-gray-200 rounded w-16"></div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="h-4 bg-gray-200 rounded w-16"></div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex gap-1">
                              <div className="h-6 bg-gray-200 rounded w-12"></div>
                              <div className="h-6 bg-gray-200 rounded w-12"></div>
                              <div className="h-6 bg-gray-200 rounded w-16"></div>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      filteredPOs.map((po) => (
                        <tr key={po.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{po.po_number}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{po.vendors?.name || 'Unknown Vendor'}</div>
                            <div className="text-sm text-gray-500">{po.vendors?.gst_number || 'N/A'}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            <div>Quote: {po.quotation_id || 'N/A'}</div>
                            <div>Order: {po.sales_order_id || 'N/A'}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{new Date(po.po_date).toLocaleDateString()}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(po.status)}`}>
                            {formatStatus(po.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">${po.total_amount.toLocaleString()}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {po.vendor_bills && po.vendor_bills.length > 0 ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                {po.vendor_bills.length} bill{po.vendor_bills.length > 1 ? 's' : ''}
                              </span>
                            ) : (
                              <span className="text-gray-400">No bills</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex flex-wrap gap-1">
                            <button
                              onClick={() => handleViewPODetails(po)}
                              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors duration-150 text-xs font-medium"
                            >
                              View
                            </button>
                            <button
                              onClick={() => handleEditPO(po)}
                              className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors duration-150 text-xs font-medium"
                            >
                              Edit
                            </button>
                            {po.status === 'pending_approval' && (
                              <button
                                onClick={() => handleApprovePO(po)}
                                className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors duration-150 text-xs font-medium"
                              >
                                Approve
                              </button>
                            )}
                            <button
                              onClick={() => handleAttachBill(po)}
                              className="px-3 py-1 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors duration-150 text-xs font-medium"
                            >
                              Attach Bill
                            </button>
                            <button
                              onClick={() => handleGenerateChallan(po)}
                              className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors duration-150 text-xs font-medium"
                            >
                              Challan
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
              // Grid View
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {dataLoading.purchaseOrders ? (
                  // Skeleton loading cards
                  Array.from({ length: 6 }, (_, index) => (
                    <div key={`skeleton-card-${index}`} className="border border-gray-200 rounded-lg p-6 animate-pulse">
                      <div className="flex items-start justify-between mb-4">
                        <div className="space-y-2">
                          <div className="h-5 bg-gray-200 rounded w-24"></div>
                          <div className="h-4 bg-gray-200 rounded w-32"></div>
                        </div>
                        <div className="h-6 bg-gray-200 rounded-full w-20"></div>
                      </div>
                      
                      <div className="space-y-3 mb-4">
                        <div className="flex justify-between">
                          <div className="h-3 bg-gray-200 rounded w-12"></div>
                          <div className="h-3 bg-gray-200 rounded w-20"></div>
                        </div>
                        <div className="flex justify-between">
                          <div className="h-3 bg-gray-200 rounded w-16"></div>
                          <div className="h-3 bg-gray-200 rounded w-16"></div>
                        </div>
                        <div className="flex justify-between">
                          <div className="h-3 bg-gray-200 rounded w-10"></div>
                          <div className="h-3 bg-gray-200 rounded w-12"></div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <div className="h-6 bg-gray-200 rounded w-12"></div>
                        <div className="h-6 bg-gray-200 rounded w-12"></div>
                        <div className="h-6 bg-gray-200 rounded w-16"></div>
                      </div>
                    </div>
                  ))
                ) : (
                  filteredPOs.map((po) => (
                  <div key={po.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">{po.po_number}</h4>
                        <p className="text-sm text-gray-600">{po.vendors?.name || 'Unknown Vendor'}</p>
                      </div>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(po.status)}`}>
                        {formatStatus(po.status)}
                      </span>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Date:</span>
                        <span className="text-gray-900">{new Date(po.po_date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Amount:</span>
                        <span className="text-gray-900 font-medium">${po.total_amount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Bills:</span>
                        <span className="text-gray-900">
                          {po.vendor_bills && po.vendor_bills.length > 0 ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                              {po.vendor_bills.length} attached
                            </span>
                          ) : (
                            <span className="text-gray-400">None</span>
                          )}
                        </span>
                      </div>
                      {(po.quotation_id || po.sales_order_id) && (
                        <div className="text-sm">
                          <span className="text-gray-500">Linked:</span>
                          <div className="mt-1">
                            {po.quotation_id && <div className="text-xs text-gray-600">Quote: {po.quotation_id}</div>}
                            {po.sales_order_id && <div className="text-xs text-gray-600">Order: {po.sales_order_id}</div>}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleViewPODetails(po)}
                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors duration-150 text-xs font-medium"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleEditPO(po)}
                        className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors duration-150 text-xs font-medium"
                      >
                        Edit
                      </button>
                      {po.status === 'pending_approval' && (
                        <button
                          onClick={() => handleApprovePO(po)}
                          className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors duration-150 text-xs font-medium"
                        >
                          Approve
                        </button>
                      )}
                      <button
                        onClick={() => handleAttachBill(po)}
                        className="px-3 py-1 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors duration-150 text-xs font-medium"
                      >
                        Attach Bill
                      </button>
                      <button
                        onClick={() => handleGenerateChallan(po)}
                        className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors duration-150 text-xs font-medium"
                      >
                        Challan
                      </button>
                    </div>
                  </div>
                ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
        <CreatePurchaseOrderModal
          isOpen={showCreatePO}
          onClose={() => setShowCreatePO(false)}
          onPOCreated={loadPurchaseOrders}
        />
      <EditPurchaseOrderModal
        isOpen={showEditPO}
        onClose={() => setShowEditPO(false)}
        purchaseOrder={selectedPO}
        onPOUpdated={loadPurchaseOrders}
      />
      <UploadVendorBillModal 
        isOpen={showUploadBill} 
        onClose={() => setShowUploadBill(false)} 
        selectedPO={selectedPO}
        onBillAttached={loadPurchaseOrders}
      />
      <GenerateDeliveryChallanModal 
        isOpen={showGenerateChallan} 
        onClose={() => setShowGenerateChallan(false)} 
        selectedPO={selectedPO}
        onChallanGenerated={loadPurchaseOrders}
      />
      <PurchaseOrderDetailsModal 
        isOpen={showPODetails} 
        onClose={() => setShowPODetails(false)} 
        po={selectedPO} 
      />
    </AppLayout>
  );
}
