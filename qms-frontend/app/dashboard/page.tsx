'use client';

import { useState } from 'react';
import AppLayout from '../components/AppLayout';
import NewQuotationModal from '../components/dashboard/NewQuotationModal';
import UploadInquiryModal from '../components/dashboard/UploadInquiryModal';
import ConvertQuoteModal from '../components/dashboard/ConvertQuoteModal';
import CreateInvoiceModal from '../components/dashboard/CreateInvoiceModal';
import QuickReorderModal from '../components/dashboard/QuickReorderModal';

export default function DashboardPage() {
  const [showNewQuotation, setShowNewQuotation] = useState(false);
  const [showUploadInquiry, setShowUploadInquiry] = useState(false);
  const [showConvertQuote, setShowConvertQuote] = useState(false);
  const [showCreateInvoice, setShowCreateInvoice] = useState(false);
  const [showQuickReorder, setShowQuickReorder] = useState(false);

  // Mock data for dashboard
  const pendingApprovals = [
    { id: 1, type: 'Quotation', title: 'Q-2024-001', customer: 'ABC Corp', amount: '$2,500', days: 2 },
    { id: 2, type: 'Invoice', title: 'INV-2024-015', customer: 'XYZ Ltd', amount: '$1,800', days: 1 },
    { id: 3, type: 'Purchase Order', title: 'PO-2024-008', supplier: 'Tech Supplies', amount: '$3,200', days: 3 },
  ];

  const lowStockItems = [
    { id: 1, sku: 'LAP-001', name: 'Laptop Dell XPS 13', current: 2, reorder: 5, suggested: 8 },
    { id: 2, sku: 'MON-002', name: 'Monitor 27" 4K', current: 1, reorder: 3, suggested: 5 },
    { id: 3, sku: 'KEY-003', name: 'Wireless Keyboard', current: 0, reorder: 10, suggested: 15 },
  ];

  const recentQuotations = [
    { id: 1, number: 'Q-2024-001', customer: 'ABC Corp', amount: '$2,500', status: 'Pending' },
    { id: 2, number: 'Q-2024-002', customer: 'XYZ Ltd', amount: '$1,800', status: 'Approved' },
    { id: 3, number: 'Q-2024-003', customer: 'Tech Solutions', amount: '$4,200', status: 'Draft' },
  ];

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* New Quotation */}
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500 hover:shadow-lg transition-shadow duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <span className="text-sm text-blue-600 font-medium">Sales</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">New Quotation</h3>
            <p className="text-gray-600 text-sm mb-4">Quick create quotation with customer, items, and pricing</p>
            <button
              onClick={() => setShowNewQuotation(true)}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors duration-200"
            >
              Create Quotation
            </button>
          </div>

          {/* Upload Inquiry OCR */}
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500 hover:shadow-lg transition-shadow duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <span className="text-sm text-green-600 font-medium">Automation</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload Inquiry (OCR)</h3>
            <p className="text-gray-600 text-sm mb-2">Upload PDF/image for OCR parsing</p>
            <p className="text-gray-500 text-xs mb-4">Supports PNG/PDF</p>
            <button
              onClick={() => setShowUploadInquiry(true)}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors duration-200"
            >
              Upload & Parse
            </button>
          </div>

          {/* Convert Quote to Order */}
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500 hover:shadow-lg transition-shadow duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <span className="text-sm text-purple-600 font-medium">Sales</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Convert Quote → Order</h3>
            <p className="text-gray-600 text-sm mb-4">One-click conversion with stock reservation</p>
            <button
              onClick={() => setShowConvertQuote(true)}
              className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors duration-200"
            >
              Convert to Order
            </button>
          </div>

          {/* Create Invoice & FBR Sync */}
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-orange-500 hover:shadow-lg transition-shadow duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <span className="text-sm text-orange-600 font-medium">Finance</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Create Invoice & FBR Sync</h3>
            <p className="text-gray-600 text-sm mb-4">Generate invoice and sync with FBR compliance</p>
            <button
              onClick={() => setShowCreateInvoice(true)}
              className="w-full bg-orange-600 text-white py-2 px-4 rounded-lg hover:bg-orange-700 transition-colors duration-200"
            >
              Create & Sync
            </button>
          </div>

          {/* Quick Reorder */}
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-red-500 hover:shadow-lg transition-shadow duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <span className="text-sm text-red-600 font-medium">Procurement</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Quick Reorder (Low-stock)</h3>
            <p className="text-gray-600 text-sm mb-4">Prevent stockouts with suggested quantities</p>
            <button
              onClick={() => setShowQuickReorder(true)}
              className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors duration-200"
            >
              Reorder Low Stock
            </button>
          </div>

          {/* Pending Approvals */}
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-500 hover:shadow-lg transition-shadow duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-sm text-yellow-600 font-medium">Management</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Pending Approvals</h3>
            <p className="text-gray-600 text-sm mb-4">Keep workflow moving with quick approvals</p>
            <div className="text-2xl font-bold text-yellow-600 mb-2">{pendingApprovals.length}</div>
            <p className="text-gray-500 text-xs">Items awaiting approval</p>
          </div>
        </div>

        {/* Dashboard Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pending Approvals List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Pending Approvals</h3>
                <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                  View All
                </button>
              </div>
              <div className="space-y-3">
                {pendingApprovals.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${
                        item.type === 'Quotation' ? 'bg-blue-500' : 
                        item.type === 'Invoice' ? 'bg-green-500' : 'bg-purple-500'
                      }`}></div>
                      <div>
                        <p className="font-medium text-gray-900">{item.title}</p>
                        <p className="text-sm text-gray-600">
                          {item.customer || item.supplier} • {item.amount}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500">{item.days}d ago</span>
                      <button className="text-green-600 hover:text-green-700 text-sm font-medium">
                        Approve
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Low Stock Alerts */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Low Stock Alerts</h3>
              <div className="space-y-3">
                {lowStockItems.map((item) => (
                  <div key={item.id} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-gray-900 text-sm">{item.sku}</p>
                      <span className="text-xs text-red-600 font-medium">Low Stock</span>
                    </div>
                    <p className="text-xs text-gray-600 mb-2">{item.name}</p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Current: {item.current}</span>
                      <span className="text-red-600">Reorder: {item.reorder}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Quotations */}
        <div className="mt-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Recent Quotations</h3>
              <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                View All
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Number</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentQuotations.map((quotation) => (
                    <tr key={quotation.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{quotation.number}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{quotation.customer}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{quotation.amount}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          quotation.status === 'Approved' ? 'bg-green-100 text-green-800' :
                          quotation.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {quotation.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button className="text-blue-600 hover:text-blue-700 mr-3">View</button>
                        <button className="text-green-600 hover:text-green-700">Convert</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <NewQuotationModal isOpen={showNewQuotation} onClose={() => setShowNewQuotation(false)} />
      <UploadInquiryModal isOpen={showUploadInquiry} onClose={() => setShowUploadInquiry(false)} />
      <ConvertQuoteModal isOpen={showConvertQuote} onClose={() => setShowConvertQuote(false)} />
      <CreateInvoiceModal isOpen={showCreateInvoice} onClose={() => setShowCreateInvoice(false)} />
      <QuickReorderModal isOpen={showQuickReorder} onClose={() => setShowQuickReorder(false)} />
    </AppLayout>
  );
}
