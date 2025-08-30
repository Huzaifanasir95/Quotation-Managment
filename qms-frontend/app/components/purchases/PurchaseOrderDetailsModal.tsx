'use client';

import { useState } from 'react';

interface PurchaseOrderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  po: any;
}

export default function PurchaseOrderDetailsModal({ isOpen, onClose, po }: PurchaseOrderDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'items' | 'bills' | 'challans' | 'history'>('details');

  if (!isOpen || !po) return null;

  const tabs = [
    { id: 'details', name: 'Details', icon: '📋' },
    { id: 'items', name: 'Items', icon: '📦' },
    { id: 'bills', name: 'Bills', icon: '🧾' },
    { id: 'challans', name: 'Challans', icon: '🚚' },
    { id: 'history', name: 'History', icon: '📈' }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved': return 'bg-green-100 text-green-800';
      case 'Pending Approval': return 'bg-yellow-100 text-yellow-800';
      case 'Draft': return 'bg-gray-100 text-gray-800';
      case 'Closed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Purchase Order Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        {/* Header Info */}
        <div className="p-6 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{po.id}</h3>
              <p className="text-sm text-gray-600">Purchase Order</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Vendor</p>
              <p className="font-medium text-gray-900">{po.vendor}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Total Amount</p>
              <p className="text-2xl font-bold text-blue-600">${po.totalAmount.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Details Tab */}
          {activeTab === 'details' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Purchase Order Information</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-500">PO ID:</span>
                      <span className="font-medium">{po.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Status:</span>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(po.status)}`}>
                        {po.status}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Date Created:</span>
                      <span className="font-medium">{po.dateCreated}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Linked Quote:</span>
                      <span className="font-medium">{po.linkedQuotation}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Linked Order:</span>
                      <span className="font-medium">{po.linkedOrder}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Vendor Information</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Name:</span>
                      <span className="font-medium">{po.vendorDetails.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">GST:</span>
                      <span className="font-medium">{po.vendorDetails.gst}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Contact:</span>
                      <span className="font-medium">{po.vendorDetails.contact}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Phone:</span>
                      <span className="font-medium">{po.vendorDetails.phone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Email:</span>
                      <span className="font-medium">{po.vendorDetails.email}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Items Tab */}
          {activeTab === 'items' && (
            <div>
              <h4 className="font-medium text-gray-900 mb-4">Order Items</h4>
              <div className="bg-gray-50 rounded-lg p-4">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left text-xs font-medium text-gray-500 uppercase py-2">Description</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase py-2">Quantity</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase py-2">Unit Price</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase py-2">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {po.items.map((item: any, index: number) => (
                      <tr key={index} className="border-b border-gray-200 last:border-b-0">
                        <td className="py-3 text-sm text-gray-900">{item.description}</td>
                        <td className="py-3 text-sm text-gray-900">{item.quantity}</td>
                        <td className="py-3 text-sm text-gray-900">${item.unitPrice.toFixed(2)}</td>
                        <td className="py-3 text-sm text-gray-900">${item.subtotal.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-300">
                      <td colSpan={3} className="py-3 text-sm font-medium text-gray-900 text-right">Total:</td>
                      <td className="py-3 text-sm font-bold text-gray-900">
                        ${po.totalAmount.toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Bills Tab */}
          {activeTab === 'bills' && (
            <div>
              <h4 className="font-medium text-gray-900 mb-4">Attached Vendor Bills</h4>
              {po.attachedBills.length > 0 ? (
                <div className="space-y-3">
                  {po.attachedBills.map((bill: string, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="text-sm text-gray-900">{bill}</span>
                      </div>
                      <div className="flex space-x-2">
                        <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">View</button>
                        <button className="text-green-600 hover:text-green-700 text-sm font-medium">Download</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p>No vendor bills attached yet.</p>
                  <p className="text-sm text-gray-400 mt-1">Upload bills using the "Attach Bill" action.</p>
                </div>
              )}
            </div>
          )}

          {/* Challans Tab */}
          {activeTab === 'challans' && (
            <div>
              <h4 className="font-medium text-gray-900 mb-4">Delivery Challans</h4>
              {po.deliveryChallans.length > 0 ? (
                <div className="space-y-3">
                  {po.deliveryChallans.map((challan: string, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="text-sm text-gray-900">{challan}</span>
                      </div>
                      <div className="flex space-x-2">
                        <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">View</button>
                        <button className="text-green-600 hover:text-green-700 text-sm font-medium">Download</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <p>No delivery challans generated yet.</p>
                  <p className="text-sm text-gray-400 mt-1">Generate challans using the "Generate Challan" action.</p>
                </div>
              )}
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div>
              <h4 className="font-medium text-gray-900 mb-4">Status History</h4>
              <div className="space-y-4">
                {po.statusHistory.map((status: any, index: number) => (
                  <div key={index} className="flex items-start space-x-4">
                    <div className={`w-3 h-3 rounded-full mt-2 ${
                      index === po.statusHistory.length - 1 ? 'bg-blue-500' : 'bg-gray-300'
                    }`} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-gray-900">{status.status}</p>
                        <p className="text-sm text-gray-500">{status.date}</p>
                      </div>
                      <p className="text-sm text-gray-600">Updated by: {status.user}</p>
                    </div>
                  </div>
                ))}
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
    </div>
  );
}
