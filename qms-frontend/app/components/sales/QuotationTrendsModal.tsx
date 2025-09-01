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
        return b.quotations - a.quotations;
      case 'revenue':
        return b.revenue - a.revenue;
      case 'month':
      default:
        // Sort by month order (assuming month is like "Jan", "Feb", etc.)
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return months.indexOf(a.month) - months.indexOf(b.month);
    }
  });

  const totalQuotations = trends.reduce((sum, trend) => sum + trend.quotations, 0);
  const totalAccepted = trends.reduce((sum, trend) => sum + trend.accepted, 0);
  const totalRevenue = trends.reduce((sum, trend) => sum + trend.revenue, 0);
  const acceptanceRate = totalQuotations > 0 ? ((totalAccepted / totalQuotations) * 100).toFixed(1) : '0';

  return (
    <div className="fixed inset-0 bg-blue-900 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Quotation Trends (Last 6 Months)</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Summary Stats */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-blue-600 font-medium">Total Quotations</p>
              <p className="text-xl font-bold text-blue-900">{totalQuotations}</p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <p className="text-sm text-green-600 font-medium">Accepted</p>
              <p className="text-xl font-bold text-green-900">{totalAccepted}</p>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg">
              <p className="text-sm text-purple-600 font-medium">Acceptance Rate</p>
              <p className="text-xl font-bold text-purple-900">{acceptanceRate}%</p>
            </div>
            <div className="bg-orange-50 p-3 rounded-lg">
              <p className="text-sm text-orange-600 font-medium">Total Revenue</p>
              <p className="text-xl font-bold text-orange-900">${totalRevenue.toLocaleString()}</p>
            </div>
          </div>

          <div className="mt-4 flex space-x-4">
            <button
              onClick={() => setSortBy('month')}
              className={`px-3 py-1 rounded-md text-sm font-medium ${
                sortBy === 'month'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Sort by Month
            </button>
            <button
              onClick={() => setSortBy('quotations')}
              className={`px-3 py-1 rounded-md text-sm font-medium ${
                sortBy === 'quotations'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Sort by Quotations
            </button>
            <button
              onClick={() => setSortBy('revenue')}
              className={`px-3 py-1 rounded-md text-sm font-medium ${
                sortBy === 'revenue'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Sort by Revenue
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {sortedTrends.length === 0 ? (
            <div className="text-center py-8">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p className="text-gray-500">No quotation data available</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedTrends.map((trend, index) => {
                const acceptancePercentage = trend.quotations > 0 ? ((trend.accepted / trend.quotations) * 100).toFixed(1) : '0';
                
                return (
                  <div
                    key={trend.month}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <span className="text-lg font-bold text-blue-600">{trend.month}</span>
                      </div>
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">
                          {trend.quotations} Quotations
                        </h3>
                        <p className="text-sm text-gray-600">
                          {trend.accepted} accepted ({acceptancePercentage}% acceptance rate)
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-xl font-bold text-green-600">
                        ${trend.revenue.toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-600">Revenue</p>
                    </div>
                    
                    {/* Progress bar for acceptance rate */}
                    <div className="w-20">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${acceptancePercentage}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 text-center">{acceptancePercentage}%</p>
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
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
