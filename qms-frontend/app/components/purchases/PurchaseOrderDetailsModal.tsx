'use client';

import { useState, useEffect } from 'react';
import { apiClient, type PurchaseOrder } from '../../lib/api';
import VendorBillDetailsModal from './VendorBillDetailsModal';

interface PurchaseOrderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  po: PurchaseOrder | null;
}

export default function PurchaseOrderDetailsModal({ isOpen, onClose, po }: PurchaseOrderDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'items' | 'bills' | 'challans' | 'history'>('details');
  const [detailedPO, setDetailedPO] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [billDetailsModal, setBillDetailsModal] = useState<{ isOpen: boolean; billId: string | null }>({ isOpen: false, billId: null });
  const [downloading, setDownloading] = useState<string | null>(null);

  // Fetch detailed PO data when modal opens
  useEffect(() => {
    if (isOpen && po?.id) {
      fetchDetailedPO();
    }
  }, [isOpen, po?.id]);

  const fetchDetailedPO = async () => {
    if (!po?.id) return;
    
    setLoading(true);
    try {
      const response = await apiClient.getPurchaseOrderById(po.id);
      if (response.success) {
        setDetailedPO(response.data.purchaseOrder);
      }
    } catch (error) {
      console.error('Failed to fetch detailed PO:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !po) return null;

  const currentPO = detailedPO || po;

  const tabs = [
    { id: 'details', name: 'Details', icon: '📋', count: null },
    { id: 'items', name: 'Items', icon: '📦', count: currentPO.purchase_order_items?.length || 0 },
    { id: 'bills', name: 'Vendor Bills', icon: '🧾', count: currentPO.vendor_bills?.length || 0 },
    { id: 'challans', name: 'Challans', icon: '🚚', count: (currentPO.delivery_challans?.length || 0) + (currentPO.challans?.length || 0) },
    { id: 'history', name: 'History', icon: '📈', count: null }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'pending_approval': return 'bg-yellow-100 text-yellow-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'closed': return 'bg-blue-100 text-blue-800';
      case 'received': return 'bg-green-100 text-green-800';
      case 'sent': return 'bg-purple-100 text-purple-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getBillStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'approved': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatStatus = (status: string) => {
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const handleViewBillDetails = (billId: string) => {
    setBillDetailsModal({ isOpen: true, billId });
  };

  const handleDownloadBill = async (billId: string, billNumber: string) => {
    setDownloading(billId);
    try {
      // Get the bill documents
      const response = await apiClient.getDocuments('vendor_bill', billId);
      if (response.success && response.data.documents.length > 0) {
        const document = response.data.documents[0]; // Download the first document
        const blob = await apiClient.downloadDocument(document.id);
        
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = document.file_name || `${billNumber}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('No documents found for this bill');
      }
    } catch (error) {
      console.error('Failed to download bill:', error);
      alert('Failed to download bill. Please try again.');
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none">
      <div className="bg-white rounded-xl shadow-2xl max-w-7xl w-full max-h-[95vh] overflow-y-auto pointer-events-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-xl">
          <div className="flex items-center space-x-3">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <div>
              <h2 className="text-2xl font-bold">Purchase Order Details</h2>
              <p className="text-blue-100 text-sm">{currentPO.po_number}</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-white hover:text-gray-200 transition-colors duration-200 text-2xl font-light"
          >
            ✕
          </button>
        </div>

        {/* Header Info */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg p-4 border border-blue-100">
              <p className="text-sm text-blue-600 font-medium">PO Number</p>
              <p className="text-lg font-bold text-blue-900">{currentPO.po_number}</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-blue-100">
              <p className="text-sm text-blue-600 font-medium">Vendor</p>
              <p className="text-lg font-bold text-blue-900">{currentPO.vendors?.name || 'Unknown Vendor'}</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-blue-100">
              <p className="text-sm text-blue-600 font-medium">Total Amount</p>
              <p className="text-lg font-bold text-green-600">${currentPO.total_amount?.toLocaleString() || '0'}</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-blue-100">
              <p className="text-sm text-blue-600 font-medium">Status</p>
              <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(currentPO.status)}`}>
                {formatStatus(currentPO.status)}
              </span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 bg-gray-50">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.name}</span>
                {tab.count !== null && (
                  <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    activeTab === tab.id ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <svg className="animate-spin w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="ml-3 text-gray-600">Loading details...</span>
            </div>
          )}
          {/* Details Tab */}
          {!loading && activeTab === 'details' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
                  <h4 className="font-semibold text-blue-900 mb-4 flex items-center">
                    <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Purchase Order Information
                  </h4>
                  <div className="space-y-4">
                    <div className="bg-white rounded-lg p-3 border border-blue-100">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-blue-600 font-medium">PO Number:</span>
                        <span className="font-bold text-blue-900">{currentPO.po_number}</span>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-blue-100">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-blue-600 font-medium">Status:</span>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(currentPO.status)}`}>
                          {formatStatus(currentPO.status)}
                        </span>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-blue-100">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-blue-600 font-medium">Date Created:</span>
                        <span className="font-medium text-blue-900">{new Date(currentPO.po_date).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-blue-100">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-blue-600 font-medium">Expected Delivery:</span>
                        <span className="font-medium text-blue-900">{currentPO.expected_delivery_date ? new Date(currentPO.expected_delivery_date).toLocaleDateString() : 'Not specified'}</span>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-blue-100">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-blue-600 font-medium">Linked Quote:</span>
                        <span className="font-medium text-blue-900">{currentPO.quotation_id ? `Quote: ${currentPO.quotation_id}` : 'N/A'}</span>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-blue-100">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-blue-600 font-medium">Linked Order:</span>
                        <span className="font-medium text-blue-900">{currentPO.sales_order_id ? `Order: ${currentPO.sales_order_id}` : 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
                  <h4 className="font-semibold text-green-900 mb-4 flex items-center">
                    <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Vendor Information
                  </h4>
                  <div className="space-y-4">
                    <div className="bg-white rounded-lg p-3 border border-green-100">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-green-600 font-medium">Name:</span>
                        <span className="font-bold text-green-900">{currentPO.vendors?.name || 'Unknown'}</span>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-green-100">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-green-600 font-medium">GST Number:</span>
                        <span className="font-medium text-green-900">{currentPO.vendors?.gst_number || 'N/A'}</span>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-green-100">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-green-600 font-medium">Contact Person:</span>
                        <span className="font-medium text-green-900">{currentPO.vendors?.contact_person || 'N/A'}</span>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-green-100">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-green-600 font-medium">Phone:</span>
                        <span className="font-medium text-green-900">{currentPO.vendors?.phone || 'N/A'}</span>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-green-100">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-green-600 font-medium">Email:</span>
                        <span className="font-medium text-green-900">{currentPO.vendors?.email || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Amount Summary */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-6">
                <h4 className="font-semibold text-purple-900 mb-4 flex items-center">
                  <svg className="w-5 h-5 text-purple-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  Amount Summary
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-lg p-4 border border-purple-100">
                    <span className="text-sm text-purple-600 font-medium">Subtotal</span>
                    <p className="text-lg font-bold text-purple-900">${(currentPO.subtotal || 0).toFixed(2)}</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-purple-100">
                    <span className="text-sm text-purple-600 font-medium">Tax Amount</span>
                    <p className="text-lg font-bold text-purple-900">${(currentPO.tax_amount || 0).toFixed(2)}</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-purple-100">
                    <span className="text-sm text-purple-600 font-medium">Discount</span>
                    <p className="text-lg font-bold text-purple-900">${(currentPO.discount_amount || 0).toFixed(2)}</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-purple-100">
                    <span className="text-sm text-purple-600 font-medium">Total Amount</span>
                    <p className="text-xl font-bold text-green-600">${(currentPO.total_amount || 0).toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {/* Notes and Terms */}
              {(currentPO.notes || currentPO.terms_conditions) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {currentPO.notes && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
                      <h4 className="font-semibold text-yellow-900 mb-3">Notes</h4>
                      <p className="text-sm text-yellow-800 whitespace-pre-wrap">{currentPO.notes}</p>
                    </div>
                  )}
                  {currentPO.terms_conditions && (
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
                      <h4 className="font-semibold text-gray-900 mb-3">Terms & Conditions</h4>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{currentPO.terms_conditions}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Items Tab */}
          {!loading && activeTab === 'items' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-gray-900 flex items-center">
                  <svg className="w-6 h-6 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  Order Items ({currentPO.purchase_order_items?.length || 0})
                </h4>
              </div>
              
              {currentPO.purchase_order_items && currentPO.purchase_order_items.length > 0 ? (
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Discount</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tax</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Line Total</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {currentPO.purchase_order_items.map((item: any, index: number) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <div className="text-sm font-medium text-gray-900">{item.description}</div>
                              {item.product_id && (
                                <div className="text-sm text-gray-500">Product ID: {item.product_id}</div>
                              )}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">{item.quantity}</td>
                            <td className="px-6 py-4 text-sm text-gray-900">${item.unit_price?.toFixed(2) || '0.00'}</td>
                            <td className="px-6 py-4 text-sm text-gray-900">{item.discount_percent || 0}%</td>
                            <td className="px-6 py-4 text-sm text-gray-900">{item.tax_percent || 0}%</td>
                            <td className="px-6 py-4 text-sm font-medium text-gray-900">${item.line_total?.toFixed(2) || '0.00'}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50">
                        <tr>
                          <td colSpan={5} className="px-6 py-4 text-sm font-medium text-gray-900 text-right">Total Amount:</td>
                          <td className="px-6 py-4 text-sm font-bold text-blue-600">
                            ${currentPO.total_amount?.toFixed(2) || '0.00'}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <p className="text-gray-500 text-lg font-medium">No items found</p>
                  <p className="text-sm text-gray-400 mt-1">This purchase order doesn't have any items yet.</p>
                </div>
              )}
            </div>
          )}

          {/* Vendor Bills Tab */}
          {!loading && activeTab === 'bills' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-gray-900 flex items-center">
                  <svg className="w-6 h-6 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Attached Vendor Bills ({currentPO.vendor_bills?.length || 0})
                </h4>
              </div>

              {currentPO.vendor_bills && currentPO.vendor_bills.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {currentPO.vendor_bills.map((bill: any, index: number) => (
                    <div key={index} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow duration-200">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <div>
                            <h5 className="font-semibold text-gray-900">{bill.bill_number}</h5>
                            <p className="text-sm text-gray-500">Bill #{index + 1}</p>
                          </div>
                        </div>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getBillStatusColor(bill.status)}`}>
                          {formatStatus(bill.status)}
                        </span>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-sm text-gray-500">Bill Date</span>
                            <p className="text-sm font-medium text-gray-900">{bill.bill_date ? new Date(bill.bill_date).toLocaleDateString() : 'N/A'}</p>
                          </div>
                          <div>
                            <span className="text-sm text-gray-500">Due Date</span>
                            <p className="text-sm font-medium text-gray-900">{bill.due_date ? new Date(bill.due_date).toLocaleDateString() : 'N/A'}</p>
                          </div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-700">Total Amount</span>
                            <span className="text-lg font-bold text-green-600">${bill.total_amount?.toFixed(2) || '0.00'}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex justify-end space-x-2 mt-4 pt-4 border-t border-gray-100">
                        <button 
                          onClick={() => handleViewBillDetails(bill.id)}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium px-3 py-1 rounded-md hover:bg-blue-50 transition-colors duration-200"
                        >
                          View Details
                        </button>
                        <button 
                          onClick={() => handleDownloadBill(bill.id, bill.bill_number)}
                          disabled={downloading === bill.id}
                          className="text-green-600 hover:text-green-700 text-sm font-medium px-3 py-1 rounded-md hover:bg-green-50 transition-colors duration-200 disabled:opacity-50"
                        >
                          {downloading === bill.id ? 'Downloading...' : 'Download'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-gray-500 text-lg font-medium">No vendor bills attached</p>
                  <p className="text-sm text-gray-400 mt-1">Upload bills using the "Attach Bill" action in the purchase orders table.</p>
                </div>
              )}
            </div>
          )}

          {/* Challans Tab */}
          {!loading && activeTab === 'challans' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-gray-900 flex items-center">
                  <svg className="w-6 h-6 text-purple-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM21 17a2 2 0 11-4 0 2 2 0 014 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M1 13h16.586a1 1 0 00.707-.293l2.414-2.414a1 1 0 000-1.414l-2.414-2.414A1 1 0 0017.586 6H1a1 1 0 00-1 1v5a1 1 0 001 1z" />
                  </svg>
                  Delivery Challans ({(currentPO.delivery_challans?.length || 0) + (currentPO.challans?.length || 0)})
                </h4>
              </div>

              {(currentPO.delivery_challans && currentPO.delivery_challans.length > 0) || (currentPO.challans && currentPO.challans.length > 0) ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* New delivery_challans */}
                  {currentPO.delivery_challans && currentPO.delivery_challans.map((challan: any, index: number) => (
                    <div key={`dc-${index}`} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow duration-200">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM21 17a2 2 0 11-4 0 2 2 0 014 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M1 13h16.586a1 1 0 00.707-.293l2.414-2.414a1 1 0 000-1.414l-2.414-2.414A1 1 0 0017.586 6H1a1 1 0 00-1 1v5a1 1 0 001 1z" />
                            </svg>
                          </div>
                          <div>
                            <h5 className="font-semibold text-gray-900">{challan.challan_number}</h5>
                            <p className="text-sm text-gray-500">Delivery Challan</p>
                          </div>
                        </div>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(challan.status)}`}>
                          {formatStatus(challan.status)}
                        </span>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-sm text-gray-500">Challan Date</span>
                            <p className="text-sm font-medium text-gray-900">{challan.challan_date ? new Date(challan.challan_date).toLocaleDateString() : 'N/A'}</p>
                          </div>
                          <div>
                            <span className="text-sm text-gray-500">Delivery Date</span>
                            <p className="text-sm font-medium text-gray-900">{challan.delivery_date ? new Date(challan.delivery_date).toLocaleDateString() : 'N/A'}</p>
                          </div>
                        </div>
                        {challan.notes && (
                          <div className="bg-gray-50 rounded-lg p-3">
                            <span className="text-sm text-gray-500">Notes</span>
                            <p className="text-sm text-gray-900 mt-1">{challan.notes}</p>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex justify-end space-x-2 mt-4 pt-4 border-t border-gray-100">
                        <button className="text-blue-600 hover:text-blue-700 text-sm font-medium px-3 py-1 rounded-md hover:bg-blue-50 transition-colors duration-200">
                          View Details
                        </button>
                        <button className="text-green-600 hover:text-green-700 text-sm font-medium px-3 py-1 rounded-md hover:bg-green-50 transition-colors duration-200">
                          Download PDF
                        </button>
                        <button className="text-purple-600 hover:text-purple-700 text-sm font-medium px-3 py-1 rounded-md hover:bg-purple-50 transition-colors duration-200">
                          Print
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {/* Legacy challans for backward compatibility */}
                  {currentPO.challans && currentPO.challans.map((challan: any, index: number) => (
                    <div key={`legacy-${index}`} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow duration-200">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM21 17a2 2 0 11-4 0 2 2 0 014 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M1 13h16.586a1 1 0 00.707-.293l2.414-2.414a1 1 0 000-1.414l-2.414-2.414A1 1 0 0017.586 6H1a1 1 0 00-1 1v5a1 1 0 001 1z" />
                            </svg>
                          </div>
                          <div>
                            <h5 className="font-semibold text-gray-900">{challan.challan_number}</h5>
                            <p className="text-sm text-gray-500">Legacy Challan</p>
                          </div>
                        </div>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(challan.status)}`}>
                          {formatStatus(challan.status)}
                        </span>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-sm text-gray-500">Challan Date</span>
                            <p className="text-sm font-medium text-gray-900">{challan.challan_date ? new Date(challan.challan_date).toLocaleDateString() : 'N/A'}</p>
                          </div>
                          <div>
                            <span className="text-sm text-gray-500">Delivery Date</span>
                            <p className="text-sm font-medium text-gray-900">{challan.delivery_date ? new Date(challan.delivery_date).toLocaleDateString() : 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex justify-end space-x-2 mt-4 pt-4 border-t border-gray-100">
                        <button className="text-blue-600 hover:text-blue-700 text-sm font-medium px-3 py-1 rounded-md hover:bg-blue-50 transition-colors duration-200">
                          View Details
                        </button>
                        <button className="text-green-600 hover:text-green-700 text-sm font-medium px-3 py-1 rounded-md hover:bg-green-50 transition-colors duration-200">
                          Download PDF
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM21 17a2 2 0 11-4 0 2 2 0 014 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M1 13h16.586a1 1 0 00.707-.293l2.414-2.414a1 1 0 000-1.414l-2.414-2.414A1 1 0 0017.586 6H1a1 1 0 00-1 1v5a1 1 0 001 1z" />
                  </svg>
                  <p className="text-gray-500 text-lg font-medium">No delivery challans generated</p>
                  <p className="text-sm text-gray-400 mt-1">Generate challans using the "Generate Challan" action in the purchase orders table.</p>
                </div>
              )}
            </div>
          )}

          {/* History Tab */}
          {!loading && activeTab === 'history' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-gray-900 flex items-center">
                  <svg className="w-6 h-6 text-indigo-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Status History & Timeline
                </h4>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="space-y-6">
                  {/* Current Status */}
                  <div className="flex items-start space-x-4">
                    <div className="w-4 h-4 rounded-full mt-2 bg-blue-500 ring-4 ring-blue-100" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-gray-900">{formatStatus(currentPO.status)}</p>
                          <p className="text-sm text-blue-600 font-medium">Current Status</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500">{new Date(currentPO.updated_at || currentPO.created_at).toLocaleDateString()}</p>
                          <p className="text-xs text-gray-400">{new Date(currentPO.updated_at || currentPO.created_at).toLocaleTimeString()}</p>
                        </div>
                      </div>
                      <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-700">
                          Purchase order is currently in <strong>{formatStatus(currentPO.status)}</strong> status.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Approval History */}
                  {currentPO.approved_by && currentPO.approved_at && (
                    <div className="flex items-start space-x-4">
                      <div className="w-4 h-4 rounded-full mt-2 bg-green-500 ring-4 ring-green-100" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-gray-900">Approved</p>
                            <p className="text-sm text-green-600 font-medium">By: {currentPO.approved_by}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-500">{new Date(currentPO.approved_at).toLocaleDateString()}</p>
                            <p className="text-xs text-gray-400">{new Date(currentPO.approved_at).toLocaleTimeString()}</p>
                          </div>
                        </div>
                        <div className="mt-2 p-3 bg-green-50 rounded-lg">
                          <p className="text-sm text-green-700">
                            Purchase order was approved and is ready for processing.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Bills History */}
                  {currentPO.vendor_bills && currentPO.vendor_bills.length > 0 && (
                    <div className="flex items-start space-x-4">
                      <div className="w-4 h-4 rounded-full mt-2 bg-orange-500 ring-4 ring-orange-100" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-gray-900">Bills Attached</p>
                            <p className="text-sm text-orange-600 font-medium">{currentPO.vendor_bills.length} vendor bill{currentPO.vendor_bills.length > 1 ? 's' : ''}</p>
                          </div>
                        </div>
                        <div className="mt-2 p-3 bg-orange-50 rounded-lg">
                          <p className="text-sm text-orange-700">
                            Vendor bills have been attached to this purchase order.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Creation History */}
                  <div className="flex items-start space-x-4">
                    <div className="w-4 h-4 rounded-full mt-2 bg-gray-400 ring-4 ring-gray-100" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-gray-900">Purchase Order Created</p>
                          <p className="text-sm text-gray-600 font-medium">By: {currentPO.created_by || 'System'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500">{new Date(currentPO.created_at).toLocaleDateString()}</p>
                          <p className="text-xs text-gray-400">{new Date(currentPO.created_at).toLocaleTimeString()}</p>
                        </div>
                      </div>
                      <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-700">
                          Purchase order was created with {currentPO.purchase_order_items?.length || 0} item{(currentPO.purchase_order_items?.length || 0) !== 1 ? 's' : ''} for a total of ${(currentPO.total_amount || 0).toFixed(2)}.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
          >
            Close
          </button>
        </div>
      </div>

      {/* Vendor Bill Details Modal */}
      <VendorBillDetailsModal
        isOpen={billDetailsModal.isOpen}
        onClose={() => setBillDetailsModal({ isOpen: false, billId: null })}
        billId={billDetailsModal.billId}
      />
    </div>
  );
}
