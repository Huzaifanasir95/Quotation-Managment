'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '../../lib/api';
import DeliveryAcceptanceModal from '../sales/DeliveryAcceptanceModal';
import RejectionHandlingModal from '../sales/RejectionHandlingModal';

interface DeliveryChallanDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  challanId: string | null;
}

interface DeliveryChallan {
  id: string;
  challan_number: string;
  challan_date: string;
  delivery_date?: string;
  delivery_address?: string;
  contact_person?: string;
  phone?: string;
  status: string;
  notes?: string;
  created_at: string;
  purchase_orders?: {
    po_number: string;
    status: string;
    total_amount: number;
    vendors?: {
      name: string;
      email: string;
      phone?: string;
      contact_person?: string;
    };
    purchase_order_items?: Array<{
      quantity: number;
      description: string;
      unit_price: number;
      line_total: number;
    }>;
  };
  attachments?: Array<{
    id: string;
    file_name: string;
    file_size: number;
    mime_type: string;
    created_at: string;
  }>;
}

export default function DeliveryChallanDetailsModal({ isOpen, onClose, challanId }: DeliveryChallanDetailsModalProps) {
  const [challan, setChallan] = useState<DeliveryChallan | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  
  // Delivery Acceptance & Rejection Modal states
  const [showAcceptanceModal, setShowAcceptanceModal] = useState(false);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [selectedDeliveryId, setSelectedDeliveryId] = useState<string | null>(null);
  const [selectedRejectionId, setSelectedRejectionId] = useState<string | null>(null);
  
  // Status update states
  const [showStatusUpdate, setShowStatusUpdate] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    if (isOpen && challanId) {
      fetchChallanDetails();
    }
  }, [isOpen, challanId]);

  const fetchChallanDetails = async () => {
    if (!challanId) return;
    
    setLoading(true);
    try {
      const response = await apiClient.getDeliveryChallanById(challanId);
      if (response.success) {
        setChallan(response.data.deliveryChallan);
      }
    } catch (error) {
      console.error('Failed to fetch challan details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadAttachment = async (documentId: string, fileName: string) => {
    setDownloading(documentId);
    try {
      const blob = await apiClient.downloadDocument(documentId);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to download document:', error);
      alert('Failed to download document. Please try again.');
    } finally {
      setDownloading(null);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!challanId) return;
    
    setUpdatingStatus(true);
    try {
      const response = await apiClient.updateDeliveryChallanStatus(challanId, newStatus);
      if (response.success) {
        // Refresh challan details
        await fetchChallanDetails();
        setShowStatusUpdate(false);
        alert(`Delivery challan status updated to ${formatStatus(newStatus)} successfully!`);
      } else {
        alert('Failed to update status. Please try again.');
      }
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Failed to update status. Please try again.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'dispatched': return 'bg-blue-100 text-blue-800';
      case 'in_transit': return 'bg-yellow-100 text-yellow-800';
      case 'generated': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatStatus = (status: string) => {
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!isOpen || !challanId) return null;

  return (
    <div className="fixed top-4 right-4 z-50 w-96 max-h-[90vh] overflow-y-auto pointer-events-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-t-xl">
          <div className="flex items-center space-x-3">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM21 17a2 2 0 11-4 0 2 2 0 014 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M1 13h16.586a1 1 0 00.707-.293l2.414-2.414a1 1 0 000-1.414l-2.414-2.414A1 1 0 0017.586 6H1a1 1 0 00-1 1v5a1 1 0 001 1z" />
            </svg>
            <div>
              <h2 className="text-lg font-bold">Delivery Challan Details</h2>
              <p className="text-purple-100 text-sm">{challan?.challan_number || 'Loading...'}</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-white hover:text-gray-200 transition-colors duration-200 text-xl font-light"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <svg className="animate-spin w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="ml-2 text-gray-600">Loading...</span>
            </div>
          ) : challan ? (
            <div className="space-y-4">
              {/* Header Info - Compact */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-3 border border-purple-100">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-purple-600 font-medium">Status</p>
                    <button
                      onClick={() => setShowStatusUpdate(true)}
                      className="text-xs text-purple-600 hover:text-purple-800 underline"
                    >
                      Update
                    </button>
                  </div>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(challan.status)}`}>
                    {formatStatus(challan.status)}
                  </span>
                  <p className="text-xs text-purple-500 mt-1">Raw: {challan.status}</p>
                </div>
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-3 border border-green-100">
                  <p className="text-xs text-green-600 font-medium">PO Amount</p>
                  <p className="text-lg font-bold text-green-600">Rs. {challan.purchase_orders?.total_amount?.toFixed(2) || '0.00'}</p>
                </div>
              </div>

              {/* Delivery Acceptance & Rejection Actions */}
              {(challan.status === 'delivered' || challan.status === 'in_transit' || challan.status === 'dispatched') && (
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-3">
                  <h4 className="font-semibold text-indigo-900 mb-3 text-sm flex items-center">
                    <svg className="w-4 h-4 text-indigo-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Delivery Management
                  </h4>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        setSelectedDeliveryId(challan.id);
                        setShowAcceptanceModal(true);
                      }}
                      className="flex-1 px-3 py-2 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition-colors duration-200 flex items-center justify-center space-x-1"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Manage Acceptance</span>
                    </button>
                    <button
                      onClick={() => {
                        setSelectedRejectionId(challan.id);
                        setShowRejectionModal(true);
                      }}
                      className="flex-1 px-3 py-2 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700 transition-colors duration-200 flex items-center justify-center space-x-1"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <span>Handle Rejections</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Challan Information - Compact */}
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-3">
                <h4 className="font-semibold text-purple-900 mb-3 text-sm flex items-center">
                  <svg className="w-4 h-4 text-purple-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM21 17a2 2 0 11-4 0 2 2 0 014 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M1 13h16.586a1 1 0 00.707-.293l2.414-2.414a1 1 0 000-1.414l-2.414-2.414A1 1 0 0017.586 6H1a1 1 0 00-1 1v5a1 1 0 001 1z" />
                  </svg>
                  Challan Information
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-purple-600 font-medium">Challan Date:</span>
                    <span className="font-medium text-purple-900">{new Date(challan.challan_date).toLocaleDateString()}</span>
                  </div>
                  {challan.delivery_date && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-purple-600 font-medium">Delivery Date:</span>
                      <span className="font-medium text-purple-900">{new Date(challan.delivery_date).toLocaleDateString()}</span>
                    </div>
                  )}
                  {challan.purchase_orders && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-purple-600 font-medium">Purchase Order:</span>
                      <span className="font-medium text-purple-900">{challan.purchase_orders.po_number}</span>
                    </div>
                  )}
                  {challan.contact_person && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-purple-600 font-medium">Contact Person:</span>
                      <span className="font-medium text-purple-900">{challan.contact_person}</span>
                    </div>
                  )}
                  {challan.phone && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-purple-600 font-medium">Phone:</span>
                      <span className="font-medium text-purple-900">{challan.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Delivery Address */}
              {challan.delivery_address && (
                <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg p-3">
                  <h4 className="font-semibold text-blue-900 mb-2 text-sm flex items-center">
                    <svg className="w-4 h-4 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Delivery Address
                  </h4>
                  <p className="text-sm text-blue-800 whitespace-pre-wrap">{challan.delivery_address}</p>
                </div>
              )}

              {/* Vendor Information - Compact */}
              {challan.purchase_orders?.vendors && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-3">
                  <h4 className="font-semibold text-green-900 mb-3 text-sm flex items-center">
                    <svg className="w-4 h-4 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Vendor Information
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-green-600 font-medium">Name:</span>
                      <span className="font-bold text-green-900">{challan.purchase_orders.vendors.name}</span>
                    </div>
                    {challan.purchase_orders.vendors.email && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-green-600 font-medium">Email:</span>
                        <span className="font-medium text-green-900 text-xs">{challan.purchase_orders.vendors.email}</span>
                      </div>
                    )}
                    {challan.purchase_orders.vendors.phone && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-green-600 font-medium">Phone:</span>
                        <span className="font-medium text-green-900">{challan.purchase_orders.vendors.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Items Summary */}
              {challan.purchase_orders?.purchase_order_items && challan.purchase_orders.purchase_order_items.length > 0 && (
                <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-lg p-3">
                  <h4 className="font-semibold text-orange-900 mb-3 text-sm flex items-center">
                    <svg className="w-4 h-4 text-orange-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    Items ({challan.purchase_orders.purchase_order_items.length})
                  </h4>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {challan.purchase_orders.purchase_order_items.map((item, index) => (
                      <div key={index} className="bg-white rounded p-2 border border-orange-100">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="text-xs font-medium text-gray-900">{item.description}</p>
                            <p className="text-xs text-gray-500">Qty: {item.quantity} × Rs. {item.unit_price?.toFixed(2)}</p>
                          </div>
                          <span className="text-xs font-bold text-orange-600">Rs. {item.line_total?.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes - Compact */}
              {challan.notes && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <h4 className="font-semibold text-yellow-900 mb-2 text-sm">Notes</h4>
                  <p className="text-xs text-yellow-800 whitespace-pre-wrap">{challan.notes}</p>
                </div>
              )}

              {/* Attachments - Compact */}
              {challan.attachments && challan.attachments.length > 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <h4 className="font-semibold text-gray-900 mb-3 text-sm flex items-center">
                    <svg className="w-4 h-4 text-gray-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    Attachments ({challan.attachments.length})
                  </h4>
                  <div className="space-y-2">
                    {challan.attachments.map((attachment, index) => (
                      <div key={index} className="bg-white border border-gray-200 rounded-lg p-2 flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 bg-purple-100 rounded flex items-center justify-center">
                            <svg className="w-3 h-3 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-900">{attachment.file_name}</p>
                            <p className="text-xs text-gray-500">{formatFileSize(attachment.file_size)}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDownloadAttachment(attachment.id, attachment.file_name)}
                          disabled={downloading === attachment.id}
                          className="inline-flex items-center px-2 py-1 border border-transparent text-xs leading-4 font-medium rounded text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
                        >
                          {downloading === attachment.id ? (
                            <>
                              <svg className="animate-spin -ml-1 mr-1 h-3 w-3 text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Downloading...
                            </>
                          ) : (
                            <>
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              Download
                            </>
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">Failed to load challan details</p>
            </div>
          )}
        </div>
      </div>

      {/* Delivery Acceptance Modal */}
      <DeliveryAcceptanceModal
        isOpen={showAcceptanceModal}
        onClose={() => {
          setShowAcceptanceModal(false);
          setSelectedDeliveryId(null);
        }}
        deliveryId={selectedDeliveryId}
        onAcceptanceUpdated={() => {
          // Refresh challan data
          fetchChallanDetails();
        }}
      />

      {/* Rejection Handling Modal */}
      <RejectionHandlingModal
        isOpen={showRejectionModal}
        onClose={() => {
          setShowRejectionModal(false);
          setSelectedRejectionId(null);
        }}
        rejectionId={selectedRejectionId}
        onRejectionUpdated={() => {
          // Refresh challan data
          fetchChallanDetails();
        }}
      />

      {/* Status Update Modal */}
      {showStatusUpdate && challan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Update Delivery Status</h2>
              <button
                onClick={() => setShowStatusUpdate(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">
                Current status: <span className="font-semibold">{formatStatus(challan.status)}</span>
              </p>

              <div className="space-y-3">
                {challan.status !== 'dispatched' && (
                  <button
                    onClick={() => handleStatusUpdate('dispatched')}
                    disabled={updatingStatus}
                    className="w-full p-3 text-left border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors disabled:opacity-50"
                  >
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                      <div>
                        <p className="font-medium text-gray-900">Dispatched</p>
                        <p className="text-sm text-gray-500">Goods have been sent out</p>
                      </div>
                    </div>
                  </button>
                )}

                {challan.status !== 'in_transit' && (
                  <button
                    onClick={() => handleStatusUpdate('in_transit')}
                    disabled={updatingStatus}
                    className="w-full p-3 text-left border border-gray-200 rounded-lg hover:bg-yellow-50 hover:border-yellow-300 transition-colors disabled:opacity-50"
                  >
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full mr-3"></div>
                      <div>
                        <p className="font-medium text-gray-900">In Transit</p>
                        <p className="text-sm text-gray-500">Goods are on the way</p>
                      </div>
                    </div>
                  </button>
                )}

                {challan.status !== 'delivered' && (
                  <button
                    onClick={() => handleStatusUpdate('delivered')}
                    disabled={updatingStatus}
                    className="w-full p-3 text-left border border-gray-200 rounded-lg hover:bg-green-50 hover:border-green-300 transition-colors disabled:opacity-50"
                  >
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                      <div>
                        <p className="font-medium text-gray-900">Delivered</p>
                        <p className="text-sm text-gray-500">Goods have reached destination</p>
                      </div>
                    </div>
                  </button>
                )}

                {challan.status !== 'cancelled' && (
                  <button
                    onClick={() => handleStatusUpdate('cancelled')}
                    disabled={updatingStatus}
                    className="w-full p-3 text-left border border-gray-200 rounded-lg hover:bg-red-50 hover:border-red-300 transition-colors disabled:opacity-50"
                  >
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-red-500 rounded-full mr-3"></div>
                      <div>
                        <p className="font-medium text-gray-900">Cancelled</p>
                        <p className="text-sm text-gray-500">Delivery has been cancelled</p>
                      </div>
                    </div>
                  </button>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowStatusUpdate(false)}
                disabled={updatingStatus}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
