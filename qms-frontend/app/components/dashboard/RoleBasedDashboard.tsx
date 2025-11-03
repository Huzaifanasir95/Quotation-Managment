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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600 mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-rose-600 mb-4">
            <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-slate-700 mb-4 font-medium">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-slate-700 text-white px-6 py-2.5 rounded-lg hover:bg-slate-800 transition-colors font-medium shadow-sm"
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
      {/* Quick Actions - Card Style Buttons */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-8 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          
          {/* Receive RFQ / Create Quotation */}
          <RoleGuard roles={['admin', 'sales']}>
            <button
              onClick={() => setShowNewQuotation(true)}
              className="group relative flex flex-col items-center justify-center p-8 bg-gradient-to-br from-slate-700 to-slate-800 text-white rounded-xl hover:from-slate-800 hover:to-slate-900 transition-all duration-300 shadow-sm hover:shadow-lg border border-slate-600/20 min-h-[180px] overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.07] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10 flex flex-col items-center">
                <div className="w-14 h-14 bg-white/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-white/15 transition-colors">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <span className="text-base font-semibold text-center mb-1">Receive RFQ</span>
                <span className="text-sm text-slate-300">Create Quotation</span>
              </div>
            </button>
          </RoleGuard>

          {/* Convert Quote to Order */}
          <RoleGuard roles={['admin', 'sales']}>
            <button
              onClick={() => setShowConvertQuote(true)}
              className="group relative flex flex-col items-center justify-center p-8 bg-gradient-to-br from-emerald-600 to-emerald-700 text-white rounded-xl hover:from-emerald-700 hover:to-emerald-800 transition-all duration-300 shadow-sm hover:shadow-lg border border-emerald-500/20 min-h-[180px] overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.07] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10 flex flex-col items-center">
                <div className="w-14 h-14 bg-white/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-white/15 transition-colors">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
                <span className="text-base font-semibold text-center mb-1">Convert to Order</span>
                <span className="text-sm text-emerald-100">Order Received</span>
              </div>
            </button>
          </RoleGuard>

          {/* Add Customer */}
          <RoleGuard roles={['admin', 'sales']}>
            <button
              onClick={() => window.location.href = '/sales'}
              className="group relative flex flex-col items-center justify-center p-8 bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-sm hover:shadow-lg border border-blue-500/20 min-h-[180px] overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.07] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10 flex flex-col items-center">
                <div className="w-14 h-14 bg-white/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-white/15 transition-colors">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </div>
                <span className="text-base font-semibold text-center mb-1">Add Customer</span>
                <span className="text-sm text-blue-100">New Client</span>
              </div>
            </button>
          </RoleGuard>

          {/* Add Vendor */}
          <RoleGuard roles={['admin', 'procurement']}>
            <button
              onClick={() => window.location.href = '/purchases'}
              className="group relative flex flex-col items-center justify-center p-8 bg-gradient-to-br from-amber-600 to-amber-700 text-white rounded-xl hover:from-amber-700 hover:to-amber-800 transition-all duration-300 shadow-sm hover:shadow-lg border border-amber-500/20 min-h-[180px] overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.07] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10 flex flex-col items-center">
                <div className="w-14 h-14 bg-white/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-white/15 transition-colors">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <span className="text-base font-semibold text-center mb-1">Add Vendor</span>
                <span className="text-sm text-amber-100">New Supplier</span>
              </div>
            </button>
          </RoleGuard>

          {/* Create Invoice */}
          <RoleGuard roles={['admin', 'finance']}>
            <button
              onClick={() => setShowCreateInvoice(true)}
              className="group relative flex flex-col items-center justify-center p-8 bg-gradient-to-br from-violet-600 to-violet-700 text-white rounded-xl hover:from-violet-700 hover:to-violet-800 transition-all duration-300 shadow-sm hover:shadow-lg border border-violet-500/20 min-h-[180px] overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.07] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10 flex flex-col items-center">
                <div className="w-14 h-14 bg-white/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-white/15 transition-colors">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <span className="text-base font-semibold text-center mb-1">Create Invoice</span>
                <span className="text-sm text-violet-100">Generate Bill</span>
              </div>
            </button>
          </RoleGuard>

          {/* Manage Inventory */}
          <RoleGuard roles={['admin', 'procurement']}>
            <button
              onClick={() => window.location.href = '/inventory'}
              className="group relative flex flex-col items-center justify-center p-8 bg-gradient-to-br from-cyan-600 to-cyan-700 text-white rounded-xl hover:from-cyan-700 hover:to-cyan-800 transition-all duration-300 shadow-sm hover:shadow-lg border border-cyan-500/20 min-h-[180px] overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.07] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10 flex flex-col items-center">
                <div className="w-14 h-14 bg-white/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-white/15 transition-colors">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <span className="text-base font-semibold text-center mb-1">Manage Inventory</span>
                <span className="text-sm text-cyan-100">Stock Control</span>
              </div>
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
