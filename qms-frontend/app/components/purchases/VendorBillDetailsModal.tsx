'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '../../lib/api';

interface VendorBillDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  billId: string | null;
}

interface VendorBill {
  id: string;
  bill_number: string;
  bill_date: string;
  due_date?: string;
  status: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  paid_amount: number;
  notes?: string;
  created_at: string;
  vendors?: {
    name: string;
    email: string;
    phone?: string;
    gst_number?: string;
    contact_person?: string;
  };
  purchase_orders?: {
    po_number: string;
    status: string;
  };
  attachments?: Array<{
    id: string;
    file_name: string;
    file_size: number;
    mime_type: string;
    created_at: string;
  }>;
}

export default function VendorBillDetailsModal({ isOpen, onClose, billId }: VendorBillDetailsModalProps) {
  const [bill, setBill] = useState<VendorBill | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && billId) {
      fetchBillDetails();
    }
  }, [isOpen, billId]);

  const fetchBillDetails = async () => {
    if (!billId) return;
    
    setLoading(true);
    try {
      const response = await apiClient.getVendorBillById(billId);
      if (response.success) {
        setBill(response.data.vendorBill);
      }
    } catch (error) {
      console.error('Failed to fetch bill details:', error);
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

  const getStatusColor = (status: string) => {
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

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!isOpen || !billId) return null;

  return (
    <div className="fixed top-4 right-4 z-50 w-96 max-h-[90vh] overflow-y-auto pointer-events-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-t-xl">
          <div className="flex items-center space-x-3">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <div>
              <h2 className="text-lg font-bold">Vendor Bill Details</h2>
              <p className="text-green-100 text-sm">{bill?.bill_number || 'Loading...'}</p>
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
          ) : bill ? (
            <div className="space-y-4">
              {/* Header Info - Compact */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-3 border border-green-100">
                  <p className="text-xs text-green-600 font-medium">Status</p>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(bill.status)}`}>
                    {formatStatus(bill.status)}
                  </span>
                </div>
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-3 border border-purple-100">
                  <p className="text-xs text-purple-600 font-medium">Total Amount</p>
                  <p className="text-lg font-bold text-green-600">Rs. {bill.total_amount?.toFixed(2)}</p>
                </div>
              </div>

              {/* Bill Information - Compact */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3">
                <h4 className="font-semibold text-blue-900 mb-3 text-sm flex items-center">
                  <svg className="w-4 h-4 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Bill Information
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-blue-600 font-medium">Bill Date:</span>
                    <span className="font-medium text-blue-900">{new Date(bill.bill_date).toLocaleDateString()}</span>
                  </div>
                  {bill.due_date && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-blue-600 font-medium">Due Date:</span>
                      <span className="font-medium text-blue-900">{new Date(bill.due_date).toLocaleDateString()}</span>
                    </div>
                  )}
                  {bill.purchase_orders && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-blue-600 font-medium">Purchase Order:</span>
                      <span className="font-medium text-blue-900">{bill.purchase_orders.po_number}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Vendor Information - Compact */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-3">
                <h4 className="font-semibold text-green-900 mb-3 text-sm flex items-center">
                  <svg className="w-4 h-4 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Vendor Information
                </h4>
                {bill.vendors ? (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-green-600 font-medium">Name:</span>
                      <span className="font-bold text-green-900">{bill.vendors.name}</span>
                    </div>
                    {bill.vendors.email && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-green-600 font-medium">Email:</span>
                        <span className="font-medium text-green-900 text-xs">{bill.vendors.email}</span>
                      </div>
                    )}
                    {bill.vendors.phone && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-green-600 font-medium">Phone:</span>
                        <span className="font-medium text-green-900">{bill.vendors.phone}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">Vendor information not available</p>
                )}
              </div>

              {/* Amount Breakdown - Compact */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-3">
                <h4 className="font-semibold text-purple-900 mb-3 text-sm flex items-center">
                  <svg className="w-4 h-4 text-purple-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  Amount Breakdown
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-center">
                    <span className="text-xs text-purple-600 font-medium block">Subtotal</span>
                    <p className="text-sm font-bold text-purple-900">Rs. {bill.subtotal?.toFixed(2) || '0.00'}</p>
                  </div>
                  <div className="text-center">
                    <span className="text-xs text-purple-600 font-medium block">Tax</span>
                    <p className="text-sm font-bold text-purple-900">Rs. {bill.tax_amount?.toFixed(2) || '0.00'}</p>
                  </div>
                  <div className="text-center">
                    <span className="text-xs text-purple-600 font-medium block">Paid</span>
                    <p className="text-sm font-bold text-green-600">Rs. {bill.paid_amount?.toFixed(2) || '0.00'}</p>
                  </div>
                  <div className="text-center">
                    <span className="text-xs text-purple-600 font-medium block">Outstanding</span>
                    <p className="text-sm font-bold text-red-600">Rs. {(bill.total_amount - bill.paid_amount).toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {/* Notes - Compact */}
              {bill.notes && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <h4 className="font-semibold text-yellow-900 mb-2 text-sm">Notes</h4>
                  <p className="text-xs text-yellow-800 whitespace-pre-wrap">{bill.notes}</p>
                </div>
              )}

              {/* Attachments - Compact */}
              {bill.attachments && bill.attachments.length > 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <h4 className="font-semibold text-gray-900 mb-3 text-sm flex items-center">
                    <svg className="w-4 h-4 text-gray-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    Attachments ({bill.attachments.length})
                  </h4>
                  <div className="space-y-2">
                    {bill.attachments.map((attachment, index) => (
                      <div key={index} className="bg-white border border-gray-200 rounded-lg p-2 flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center">
                            <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                          className="inline-flex items-center px-2 py-1 border border-transparent text-xs leading-4 font-medium rounded text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
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
              <p className="text-gray-500">Failed to load bill details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
