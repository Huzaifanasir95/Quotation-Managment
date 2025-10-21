'use client';

import { useState, useEffect } from 'react';
import { useAuth, RoleGuard } from '../../../lib/useAuth';
import { apiClient } from '../../lib/api';
import CreateQuotationModal from '../sales/CreateQuotationModal';
import UploadInquiryModal from './UploadInquiryModal';
import ConvertQuoteModal from '../sales/ConvertQuoteModal';
import CreateInvoiceModal from './CreateInvoiceModal';
import QuickReorderModal from './QuickReorderModal';

export default function RoleBasedDashboard() {
  const { user } = useAuth();
  const [showNewQuotation, setShowNewQuotation] = useState(false);
  const [showUploadInquiry, setShowUploadInquiry] = useState(false);
  const [showConvertQuote, setShowConvertQuote] = useState(false);
  const [showCreateInvoice, setShowCreateInvoice] = useState(false);
  const [showQuickReorder, setShowQuickReorder] = useState(false);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        setError(null);
        const response = await apiClient.getDashboardData();
        if (response.success) {
          setDashboardData(response.data);
        } else {
          setError('Failed to load dashboard data');
        }
      } catch (err: any) {
        console.error('Dashboard data fetch error:', err);
        setError(err.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  if (!user || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
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
          Welcome back, {user.role === 'admin' ? 'Admin' : 
                        user.role === 'sales' ? 'Sales Manager' :
                        user.role === 'procurement' ? 'Procurement Manager' :
                        user.role === 'finance' ? 'Finance Manager' :
                        user.role === 'auditor' ? 'Auditor' :
                        user.first_name}!
        </h1>
        <p className="text-gray-600">
          {user.role === 'admin' && 'You have full system access as an administrator.'}
          {user.role === 'sales' && 'Manage your sales operations and customer relationships.'}
          {user.role === 'procurement' && 'Handle purchasing, vendors, and inventory management.'}
          {user.role === 'finance' && 'Oversee financial operations and compliance.'}
          {user.role === 'auditor' && 'Review and audit all system operations.'}
        </p>
      </div>

      {/* Quick Actions - Card Style Buttons */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
          <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Receive RFQ / Create Quotation */}
          <RoleGuard roles={['admin', 'sales']}>
            <button
              onClick={() => setShowNewQuotation(true)}
              className="flex flex-col items-center justify-center p-8 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-md hover:shadow-lg min-h-[180px]"
            >
              <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-lg font-semibold text-center">Receive RFQ</span>
              <span className="text-sm opacity-90 mt-2">Create Quotation</span>
            </button>
          </RoleGuard>

          {/* Convert Quote to Order */}
          <RoleGuard roles={['admin', 'sales']}>
            <button
              onClick={() => setShowConvertQuote(true)}
              className="flex flex-col items-center justify-center p-8 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all duration-200 shadow-md hover:shadow-lg min-h-[180px]"
            >
              <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <span className="text-lg font-semibold text-center">Convert to Order</span>
              <span className="text-sm opacity-90 mt-2">Order Received</span>
            </button>
          </RoleGuard>

          {/* Add Customer */}
          <RoleGuard roles={['admin', 'sales']}>
            <button
              onClick={() => window.location.href = '/sales'}
              className="flex flex-col items-center justify-center p-8 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all duration-200 shadow-md hover:shadow-lg min-h-[180px]"
            >
              <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              <span className="text-lg font-semibold text-center">Add Customer</span>
              <span className="text-sm opacity-90 mt-2">New Client</span>
            </button>
          </RoleGuard>

          {/* Add Vendor */}
          <RoleGuard roles={['admin', 'procurement']}>
            <button
              onClick={() => window.location.href = '/purchases'}
              className="flex flex-col items-center justify-center p-8 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-all duration-200 shadow-md hover:shadow-lg min-h-[180px]"
            >
              <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <span className="text-lg font-semibold text-center">Add Vendor</span>
              <span className="text-sm opacity-90 mt-2">New Supplier</span>
            </button>
          </RoleGuard>

          {/* Create Invoice */}
          <RoleGuard roles={['admin', 'finance']}>
            <button
              onClick={() => setShowCreateInvoice(true)}
              className="flex flex-col items-center justify-center p-8 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all duration-200 shadow-md hover:shadow-lg min-h-[180px]"
            >
              <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-lg font-semibold text-center">Create Invoice</span>
              <span className="text-sm opacity-90 mt-2">Generate Bill</span>
            </button>
          </RoleGuard>

          {/* Manage Inventory */}
          <RoleGuard roles={['admin', 'procurement']}>
            <button
              onClick={() => window.location.href = '/inventory'}
              className="flex flex-col items-center justify-center p-8 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-all duration-200 shadow-md hover:shadow-lg min-h-[180px]"
            >
              <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <span className="text-lg font-semibold text-center">Manage Inventory</span>
              <span className="text-sm opacity-90 mt-2">Stock Control</span>
            </button>
          </RoleGuard>

        </div>
      </div>

      {/* Modals */}
      <CreateQuotationModal 
        isOpen={showNewQuotation} 
        onClose={() => setShowNewQuotation(false)}
        onQuotationCreated={() => {
        }}
      />
      <UploadInquiryModal isOpen={showUploadInquiry} onClose={() => setShowUploadInquiry(false)} />
      <ConvertQuoteModal 
        isOpen={showConvertQuote} 
        onClose={() => setShowConvertQuote(false)}
        onOrderCreated={() => {
        }}
      />
      <CreateInvoiceModal isOpen={showCreateInvoice} onClose={() => setShowCreateInvoice(false)} />
      <QuickReorderModal isOpen={showQuickReorder} onClose={() => setShowQuickReorder(false)} />
    </div>
  );
}
