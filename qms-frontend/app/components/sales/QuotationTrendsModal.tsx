'use client';

import { useState } from 'react';

interface QuotationTrend {
  month: string;
  quotations: number;
  accepted: number;
  revenue: number;
}

interface QuotationTrendsModalProps {
  isOpen: boolean;
  onClose: () => void;
  trends: QuotationTrend[];
}

export default function QuotationTrendsModal({ isOpen, onClose, trends }: QuotationTrendsModalProps) {
  const [sortBy, setSortBy] = useState<'month' | 'quotations' | 'revenue'>('month');

  if (!isOpen) return null;

  const sortedTrends = [...trends].sort((a, b) => {
    switch (sortBy) {
      case 'quotations':
        return (b.quotations || 0) - (a.quotations || 0);
      case 'revenue':
        return (b.revenue || 0) - (a.revenue || 0);
      case 'month':
      default:
        // Sort by month order (assuming month is like "Jan", "Feb", etc.)
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return months.indexOf(a.month) - months.indexOf(b.month);
    }
  });

  const totalQuotations = trends.reduce((sum, trend) => sum + (trend.quotations || 0), 0);
  const totalAccepted = trends.reduce((sum, trend) => sum + (trend.accepted || 0), 0);
  const totalRevenue = trends.reduce((sum, trend) => sum + (trend.revenue || 0), 0);
  const acceptanceRate = totalQuotations > 0 ? ((totalAccepted / totalQuotations) * 100).toFixed(1) : '0';

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-blue-100">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Quotation Trends (Last 6 Months)</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Summary Stats */}
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-3 rounded-lg shadow-sm border">
              <p className="text-sm text-blue-600 font-medium">Total Quotations</p>
              <p className="text-2xl font-bold text-blue-900">{totalQuotations}</p>
            </div>
            <div className="bg-white p-3 rounded-lg shadow-sm border">
              <p className="text-sm text-green-600 font-medium">Accepted</p>
              <p className="text-2xl font-bold text-green-900">{totalAccepted}</p>
            </div>
            <div className="bg-white p-3 rounded-lg shadow-sm border">
              <p className="text-sm text-purple-600 font-medium">Acceptance Rate</p>
              <p className="text-2xl font-bold text-purple-900">{acceptanceRate}%</p>
            </div>
            <div className="bg-white p-3 rounded-lg shadow-sm border">
              <p className="text-sm text-orange-600 font-medium">Total Revenue</p>
              <p className="text-2xl font-bold text-orange-900">${(totalRevenue || 0).toLocaleString()}</p>
            </div>
          </div>

          <div className="mt-4 flex space-x-3">
            <button
              onClick={() => setSortBy('month')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors duration-200 ${
                sortBy === 'month'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
              }`}
            >
              Sort by Month
            </button>
            <button
              onClick={() => setSortBy('quotations')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors duration-200 ${
                sortBy === 'quotations'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
              }`}
            >
              Sort by Quotations
            </button>
            <button
              onClick={() => setSortBy('revenue')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors duration-200 ${
                sortBy === 'revenue'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
              }`}
            >
              Sort by Revenue
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[55vh]">
          {sortedTrends.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-20 h-20 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p className="text-gray-500 text-lg">No quotation data available</p>
              <p className="text-gray-400 text-sm mt-2">Data will appear here once quotations are created</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedTrends.map((trend, index) => {
                const quotations = trend.quotations || 0;
                const accepted = trend.accepted || 0;
                const revenue = trend.revenue || 0;
                const acceptancePercentage = quotations > 0 ? ((accepted / quotations) * 100).toFixed(1) : '0';
                
                return (
                  <div
                    key={trend.month}
                    className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg hover:from-blue-50 hover:to-blue-100 transition-all duration-200 border border-gray-200"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-md">
                        <span className="text-lg font-bold text-white">{trend.month}</span>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {quotations} Quotations
                        </h3>
                        <p className="text-sm text-gray-600">
                          {accepted} accepted ({acceptancePercentage}% acceptance rate)
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-600">
                        ${revenue.toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-600">Revenue</p>
                    </div>
                    
                    {/* Progress bar for acceptance rate */}
                    <div className="w-24">
                      <div className="w-full bg-gray-200 rounded-full h-3 shadow-inner">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500 shadow-sm"
                          style={{ width: `${acceptancePercentage}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 text-center font-medium">{acceptancePercentage}%</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Showing {sortedTrends.length} months of data
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-lg hover:from-gray-700 hover:to-gray-800 transition-all duration-200 shadow-md font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
