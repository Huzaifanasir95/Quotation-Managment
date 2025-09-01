'use client';

import { useState, useEffect } from 'react';

interface TopCustomer {
  name: string;
  quotesCount: number;
  totalQuotes: number;
}

interface TopCustomersModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: TopCustomer[];
}

export default function TopCustomersModal({ isOpen, onClose, customers }: TopCustomersModalProps) {
  const [sortBy, setSortBy] = useState<'value' | 'count'>('value');

  if (!isOpen) return null;

  const sortedCustomers = [...customers].sort((a, b) => {
    if (sortBy === 'value') {
      return b.totalQuotes - a.totalQuotes;
    } else {
      return b.quotesCount - a.quotesCount;
    }
  });

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-purple-100">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Top Customers</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="mt-4 flex space-x-3">
            <button
              onClick={() => setSortBy('value')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors duration-200 ${
                sortBy === 'value'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
              }`}
            >
              Sort by Value
            </button>
            <button
              onClick={() => setSortBy('count')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors duration-200 ${
                sortBy === 'count'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
              }`}
            >
              Sort by Quote Count
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[65vh]">
          {sortedCustomers.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-20 h-20 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="text-gray-500 text-lg">No customer data available</p>
              <p className="text-gray-400 text-sm mt-2">Customer rankings will appear here once quotations are created</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedCustomers.map((customer, index) => (
                <div
                  key={customer.name}
                  className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-purple-50 rounded-lg hover:from-purple-50 hover:to-purple-100 transition-all duration-200 border border-gray-200"
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-md ${
                      index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' : 
                      index === 1 ? 'bg-gradient-to-br from-gray-400 to-gray-600' : 
                      index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600' : 'bg-gradient-to-br from-blue-500 to-blue-600'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{customer.name}</h3>
                      <p className="text-sm text-gray-600">{customer.quotesCount} quotations</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">${customer.totalQuotes.toLocaleString()}</p>
                    <p className="text-sm text-gray-600">Total Value</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Showing {sortedCustomers.length} customers
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
