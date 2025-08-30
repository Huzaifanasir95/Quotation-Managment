'use client';

import { useState } from 'react';
import AppLayout from '../components/AppLayout';
import CreatePurchaseOrderModal from '../components/purchases/CreatePurchaseOrderModal';
import UploadVendorBillModal from '../components/purchases/UploadVendorBillModal';
import GenerateDeliveryChallanModal from '../components/purchases/GenerateDeliveryChallanModal';
import PurchaseOrderDetailsModal from '../components/purchases/PurchaseOrderDetailsModal';

export default function PurchasesPage() {
  const [showCreatePO, setShowCreatePO] = useState(false);
  const [showUploadBill, setShowUploadBill] = useState(false);
  const [showGenerateChallan, setShowGenerateChallan] = useState(false);
  const [showPODetails, setShowPODetails] = useState(false);
  const [selectedPO, setSelectedPO] = useState<any>(null);
  
  // Filters state
  const [filters, setFilters] = useState({
    vendor: 'All',
    status: 'All',
    dateFrom: '',
    dateTo: '',
    poId: ''
  });

  // Mock data for purchase orders
  const purchaseOrders = [
    {
      id: 'PO-2024-001',
      vendor: 'Tech Supplies Inc',
      linkedQuotation: 'Q-2024-001',
      linkedOrder: 'SO-2024-001',
      dateCreated: '2024-01-15',
      status: 'Approved',
      totalAmount: 2500,
      attachedBills: ['bill_001.pdf', 'bill_002.pdf'],
      items: [
        { name: 'Laptop Dell XPS 13', quantity: 2, unitPrice: 1200, subtotal: 2400 },
        { name: 'Wireless Mouse', quantity: 2, unitPrice: 50, subtotal: 100 }
      ],
      vendorDetails: {
        name: 'Tech Supplies Inc',
        gst: 'GST123456789',
        contact: 'John Smith',
        phone: '+1 (555) 123-4567',
        email: 'john@techsupplies.com'
      },
      statusHistory: [
        { status: 'Draft', date: '2024-01-15', user: 'Admin' },
        { status: 'Pending Approval', date: '2024-01-16', user: 'Manager' },
        { status: 'Approved', date: '2024-01-17', user: 'Finance' }
      ],
      deliveryChallans: ['DC-2024-001', 'DC-2024-002']
    },
    {
      id: 'PO-2024-002',
      vendor: 'Display Solutions',
      linkedQuotation: 'Q-2024-002',
      linkedOrder: 'SO-2024-002',
      dateCreated: '2024-01-18',
      status: 'Pending Approval',
      totalAmount: 1800,
      attachedBills: ['bill_003.pdf'],
      items: [
        { name: 'Monitor 27" 4K', quantity: 1, unitPrice: 800, subtotal: 800 },
        { name: 'USB-C Hub', quantity: 2, unitPrice: 45, subtotal: 90 },
        { name: 'Keyboard', quantity: 2, unitPrice: 75, subtotal: 150 },
        { name: 'Mouse Pad', quantity: 2, unitPrice: 15, subtotal: 30 }
      ],
      vendorDetails: {
        name: 'Display Solutions',
        gst: 'GST234567890',
        contact: 'Sarah Johnson',
        phone: '+1 (555) 234-5678',
        email: 'sarah@displaysolutions.com'
      },
      statusHistory: [
        { status: 'Draft', date: '2024-01-18', user: 'Admin' },
        { status: 'Pending Approval', date: '2024-01-19', user: 'Manager' }
      ],
      deliveryChallans: []
    },
    {
      id: 'PO-2024-003',
      vendor: 'Input Devices Co',
      linkedQuotation: 'Q-2024-003',
      linkedOrder: 'SO-2024-003',
      dateCreated: '2024-01-20',
      status: 'Draft',
      totalAmount: 4200,
      attachedBills: [],
      items: [
        { name: 'Server Rack', quantity: 1, unitPrice: 2500, subtotal: 2500 },
        { name: 'Network Switch', quantity: 1, unitPrice: 800, subtotal: 800 },
        { name: 'Cables', quantity: 10, unitPrice: 25, subtotal: 250 },
        { name: 'Installation Service', quantity: 1, unitPrice: 650, subtotal: 650 }
      ],
      vendorDetails: {
        name: 'Input Devices Co',
        gst: 'GST345678901',
        contact: 'Mike Davis',
        phone: '+1 (555) 345-6789',
        email: 'mike@inputdevices.com'
      },
      statusHistory: [
        { status: 'Draft', date: '2024-01-20', user: 'Admin' }
      ],
      deliveryChallans: []
    }
  ];

  const vendors = ['All', ...Array.from(new Set(purchaseOrders.map(po => po.vendor)))];
  const statuses = ['All', 'Draft', 'Pending Approval', 'Approved', 'Closed'];

  const filteredPOs = purchaseOrders.filter(po => {
    const matchesVendor = filters.vendor === 'All' || po.vendor === filters.vendor;
    const matchesStatus = filters.status === 'All' || po.status === filters.status;
    const matchesDateFrom = !filters.dateFrom || po.dateCreated >= filters.dateFrom;
    const matchesDateTo = !filters.dateTo || po.dateCreated <= filters.dateTo;
    const matchesPOId = !filters.poId || po.id.toLowerCase().includes(filters.poId.toLowerCase());
    
    return matchesVendor && matchesStatus && matchesDateFrom && matchesDateTo && matchesPOId;
  });

  // Debug logging
  console.log('Purchase Orders:', purchaseOrders);
  console.log('Filters:', filters);
  console.log('Filtered POs:', filteredPOs);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved': return 'bg-green-100 text-green-800';
      case 'Pending Approval': return 'bg-yellow-100 text-yellow-800';
      case 'Draft': return 'bg-gray-100 text-gray-800';
      case 'Closed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleViewPODetails = (po: any) => {
    setSelectedPO(po);
    setShowPODetails(true);
  };

  const handleEditPO = (po: any) => {
    console.log('Editing PO:', po);
    alert(`Editing ${po.id}`);
  };

  const handleApprovePO = (po: any) => {
    console.log('Approving PO:', po);
    alert(`Approving ${po.id}`);
  };

  const handleAttachBill = (po: any) => {
    setSelectedPO(po);
    setShowUploadBill(true);
  };

  const handleGenerateChallan = (po: any) => {
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
              className="flex items-center justify-center p-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              New Purchase Order
            </button>

            <button
              onClick={() => setShowUploadBill(true)}
              className="flex items-center justify-center p-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Upload Vendor Bill
            </button>

            <button
              onClick={() => setShowGenerateChallan(true)}
              className="flex items-center justify-center p-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-200"
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
                {vendors.map(vendor => (
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
                  <option key={status} value={status}>{status}</option>
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
                <p className="text-sm text-gray-400">Filters: Vendor={filters.vendor}, Status={filters.status}</p>
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
                      <div className="text-sm font-medium text-gray-900">{po.id}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{po.vendor}</div>
                        <div className="text-sm text-gray-500">{po.vendorDetails.gst}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        <div>Quote: {po.linkedQuotation}</div>
                        <div>Order: {po.linkedOrder}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{po.dateCreated}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(po.status)}`}>
                        {po.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">${po.totalAmount.toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {po.attachedBills.length > 0 ? (
                          <div className="space-y-1">
                            {po.attachedBills.map((bill, index) => (
                              <div key={index} className="flex items-center space-x-2">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span className="text-blue-600 hover:text-blue-800 cursor-pointer">{bill}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400">No bills</span>
                        )}
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
                        {po.status === 'Pending Approval' && (
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
      <CreatePurchaseOrderModal isOpen={showCreatePO} onClose={() => setShowCreatePO(false)} />
      <UploadVendorBillModal isOpen={showUploadBill} onClose={() => setShowUploadBill(false)} selectedPO={selectedPO} />
      <GenerateDeliveryChallanModal isOpen={showGenerateChallan} onClose={() => setShowGenerateChallan(false)} selectedPO={selectedPO} />
      <PurchaseOrderDetailsModal isOpen={showPODetails} onClose={() => setShowPODetails(false)} po={selectedPO} />
    </AppLayout>
  );
}
