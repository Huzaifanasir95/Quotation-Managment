'use client';

import { useState } from 'react';
import { useAuth, RoleGuard } from '../../../lib/useAuth';
import NewQuotationModal from './NewQuotationModal';
import UploadInquiryModal from './UploadInquiryModal';
import ConvertQuoteModal from './ConvertQuoteModal';
import CreateInvoiceModal from './CreateInvoiceModal';
import QuickReorderModal from './QuickReorderModal';

export default function RoleBasedDashboard() {
  const { user } = useAuth();
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

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`max-w-7xl mx-auto transition-all duration-300 ${
      (showNewQuotation || showUploadInquiry || showConvertQuote || showCreateInvoice || showQuickReorder) 
        ? 'filter brightness-95' : ''
    }`}>
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome back, {user.first_name}!
        </h1>
        <p className="text-gray-600">
          {user.role === 'admin' && 'You have full system access as an administrator.'}
          {user.role === 'sales' && 'Manage your sales operations and customer relationships.'}
          {user.role === 'procurement' && 'Handle purchasing, vendors, and inventory management.'}
          {user.role === 'finance' && 'Oversee financial operations and compliance.'}
          {user.role === 'auditor' && 'Review and audit all system operations.'}
        </p>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        
        {/* New Quotation - Available to Admin, Sales */}
        <RoleGuard roles={['admin', 'sales']}>
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
        </RoleGuard>

        {/* Upload Inquiry OCR - Available to Admin, Sales */}
        <RoleGuard roles={['admin', 'sales']}>
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
        </RoleGuard>

        {/* Convert Quote to Order - Available to Admin, Sales */}
        <RoleGuard roles={['admin', 'sales']}>
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
        </RoleGuard>

        {/* Create Invoice & FBR Sync - Available to Admin, Finance */}
        <RoleGuard roles={['admin', 'finance']}>
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
        </RoleGuard>

        {/* Quick Reorder - Available to Admin, Procurement */}
        <RoleGuard roles={['admin', 'procurement']}>
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
        </RoleGuard>

        {/* Pending Approvals - Available to Admin */}
        <RoleGuard roles={['admin']}>
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
        </RoleGuard>

        {/* System Analytics - Available to All Roles */}
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-indigo-500 hover:shadow-lg transition-shadow duration-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <span className="text-sm text-indigo-600 font-medium">Analytics</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">System Overview</h3>
          <p className="text-gray-600 text-sm mb-4">View system metrics and performance</p>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-indigo-600">24</div>
              <div className="text-xs text-gray-500">Active Users</div>
            </div>
            <div>
              <div className="text-lg font-bold text-indigo-600">156</div>
              <div className="text-xs text-gray-500">Total Orders</div>
            </div>
          </div>
        </div>

      </div>

      {/* Role-specific Information Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Low Stock Alert - For Procurement and Admin */}
        <RoleGuard roles={['admin', 'procurement']}>
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Low Stock Alerts</h3>
            <div className="space-y-3">
              {lowStockItems.slice(0, 3).map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{item.name}</p>
                    <p className="text-sm text-gray-600">SKU: {item.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-red-600">Stock: {item.current}</p>
                    <p className="text-xs text-gray-500">Reorder: {item.reorder}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </RoleGuard>

        {/* Recent Activity - For All Roles */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">New quotation created</p>
                <p className="text-xs text-gray-500">2 minutes ago</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Order approved</p>
                <p className="text-xs text-gray-500">15 minutes ago</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Invoice pending</p>
                <p className="text-xs text-gray-500">1 hour ago</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <NewQuotationModal 
        isOpen={showNewQuotation} 
        onClose={() => setShowNewQuotation(false)}
        onQuotationCreated={() => {
          console.log('Quotation created successfully');
        }}
      />
      <UploadInquiryModal isOpen={showUploadInquiry} onClose={() => setShowUploadInquiry(false)} />
      <ConvertQuoteModal isOpen={showConvertQuote} onClose={() => setShowConvertQuote(false)} />
      <CreateInvoiceModal isOpen={showCreateInvoice} onClose={() => setShowCreateInvoice(false)} />
      <QuickReorderModal isOpen={showQuickReorder} onClose={() => setShowQuickReorder(false)} />
    </div>
  );
}
