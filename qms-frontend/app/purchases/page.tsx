'use client';

import { useState, useEffect } from 'react';
import AppLayout from '../components/AppLayout';
import CreatePurchaseOrderModal from '../components/purchases/CreatePurchaseOrderModal';
import UploadVendorBillModal from '../components/purchases/UploadVendorBillModal';
import GenerateDeliveryChallanModal from '../components/purchases/GenerateDeliveryChallanModal';
import PurchaseOrderDetailsModal from '../components/purchases/PurchaseOrderDetailsModal';
import { apiClient, type PurchaseOrder, type Vendor } from '../lib/api';

export default function PurchasesPage() {
  const [showCreatePO, setShowCreatePO] = useState(false);
  const [showUploadBill, setShowUploadBill] = useState(false);
  const [showGenerateChallan, setShowGenerateChallan] = useState(false);
  const [showPODetails, setShowPODetails] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  
  // Data state
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters state
  const [filters, setFilters] = useState({
    vendor: 'All',
    status: 'All',
    dateFrom: '',
    dateTo: '',
    poId: ''
  });

  // Fetch data from backend
  const loadPurchaseOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch purchase orders and vendors in parallel
      const [poResponse, vendorsResponse] = await Promise.all([
        apiClient.getPurchaseOrders({ limit: 100 }),
        apiClient.getVendors({ limit: 100 })
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
      const response = await apiClient.getPurchaseOrders({ limit: 100 });
      if (response.success) {
        setPurchaseOrders(response.data.purchaseOrders || []);
      }
    } catch (error) {
      console.error('Failed to refresh purchase orders:', error);
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
    console.log('Editing PO:', po);
    alert(`Editing ${po.po_number}`);
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

  // Loading state
  if (loading) {
    return (
      <AppLayout>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </AppLayout>
    );
  }

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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => setShowCreatePO(true)}
              className="flex items-center justify-center p-4 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 text-white rounded-lg hover:from-blue-700 hover:via-purple-700 hover:to-blue-900 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              New Purchase Order
            </button>

            <button
              onClick={() => setShowUploadBill(true)}
              className="flex items-center justify-center p-4 bg-gradient-to-r from-green-500 via-emerald-600 to-green-700 text-white rounded-lg hover:from-green-600 hover:via-emerald-700 hover:to-green-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Upload Vendor Bill
            </button>

            <button
              onClick={() => setShowGenerateChallan(true)}
              className="flex items-center justify-center p-4 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-800 text-white rounded-lg hover:from-purple-700 hover:via-indigo-700 hover:to-purple-900 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Generate Delivery Challan
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters</h3>
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

        {/* Purchase Orders Table */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Purchase Orders</h3>
          </div>

          <div className="overflow-x-auto">
            {filteredPOs.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No purchase orders found.</p>
                <p className="text-sm text-gray-400 mt-1">Total POs: {purchaseOrders.length} | Filtered: {filteredPOs.length}</p>
              </div>
            ) : (
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
                {filteredPOs.map((po) => (
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
                        <span className="text-gray-400">No bills</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => handleViewPODetails(po)}
                          className="text-blue-600 hover:text-blue-700 font-medium"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleEditPO(po)}
                          className="text-green-600 hover:text-green-700 font-medium"
                        >
                          Edit
                        </button>
                        {po.status === 'pending_approval' && (
                          <button
                            onClick={() => handleApprovePO(po)}
                            className="text-purple-600 hover:text-purple-700 font-medium"
                          >
                            Approve
                          </button>
                        )}
                        <button
                          onClick={() => handleAttachBill(po)}
                          className="text-orange-600 hover:text-orange-700 font-medium"
                        >
                          Attach Bill
                        </button>
                        <button
                          onClick={() => handleGenerateChallan(po)}
                          className="text-indigo-600 hover:text-indigo-700 font-medium"
                        >
                          Challan
                        </button>
                      </div>
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
        <CreatePurchaseOrderModal
          isOpen={showCreatePO}
          onClose={() => setShowCreatePO(false)}
          onPOCreated={loadPurchaseOrders}
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
