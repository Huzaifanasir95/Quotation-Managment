'use client';

import { useState } from 'react';
import AppLayout from '../components/AppLayout';
import CreateQuotationModal from '../components/sales/CreateQuotationModal';
import AddCustomerModal from '../components/sales/AddCustomerModal';
import ConvertQuoteModal from '../components/sales/ConvertQuoteModal';
import SearchQuotationsModal from '../components/sales/SearchQuotationsModal';

export default function SalesPage() {
  const [showCreateQuotation, setShowCreateQuotation] = useState(false);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [showConvertQuote, setShowConvertQuote] = useState(false);
  const [showSearchQuotations, setShowSearchQuotations] = useState(false);

  // Mock data for KPIs
  const salesKPIs = {
    pendingQuotations: 12,
    salesThisMonth: 45600,
    topCustomers: [
      { name: 'ABC Corporation', totalQuotes: 125000, quotesCount: 8 },
      { name: 'XYZ Ltd', totalQuotes: 89000, quotesCount: 5 },
      { name: 'Tech Solutions Inc', totalQuotes: 67000, quotesCount: 4 },
      { name: 'Global Industries', totalQuotes: 54000, quotesCount: 3 },
      { name: 'Innovation Corp', totalQuotes: 42000, quotesCount: 3 }
    ],
    recentInquiries: 8
  };

  // Mock data for quotation trends (last 6 months)
  const quotationTrends = [
    { month: 'Aug', quotations: 45, accepted: 32, revenue: 38000 },
    { month: 'Sep', quotations: 52, accepted: 38, revenue: 42000 },
    { month: 'Oct', quotations: 48, accepted: 35, revenue: 41000 },
    { month: 'Nov', quotations: 61, accepted: 44, revenue: 48000 },
    { month: 'Dec', quotations: 58, accepted: 42, revenue: 45000 },
    { month: 'Jan', quotations: 67, accepted: 48, revenue: 52000 }
  ];

  // Mock data for customers
  const customers = [
    { id: 1, name: 'ABC Corporation', contact: 'John Smith', email: 'john@abc.com', phone: '+1 (555) 123-4567', gst: 'GST123456789', totalQuotes: 125000, quotesCount: 8, status: 'active' },
    { id: 2, name: 'XYZ Ltd', contact: 'Sarah Johnson', email: 'sarah@xyz.com', phone: '+1 (555) 234-5678', gst: 'GST234567890', totalQuotes: 89000, quotesCount: 5, status: 'active' },
    { id: 3, name: 'Tech Solutions Inc', contact: 'Mike Davis', email: 'mike@tech.com', phone: '+1 (555) 345-6789', gst: 'GST345678901', totalQuotes: 67000, quotesCount: 4, status: 'active' },
    { id: 4, name: 'Global Industries', contact: 'Lisa Wilson', email: 'lisa@global.com', phone: '+1 (555) 456-7890', gst: 'GST456789012', totalQuotes: 54000, quotesCount: 3, status: 'inactive' },
    { id: 5, name: 'Innovation Corp', contact: 'David Brown', email: 'david@innovation.com', phone: '+1 (555) 567-8901', gst: 'GST567890123', totalQuotes: 42000, quotesCount: 3, status: 'active' }
  ];

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
      <div className="mb-8"></div>
        {/* KPI Widgets */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Pending Quotations */}
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Quotations</p>
                <p className="text-3xl font-bold text-gray-900">{salesKPIs.pendingQuotations}</p>
              </div> 
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
            <button className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium">
              View All →
            </button>
          </div>

          {/* Sales This Month */}
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Sales This Month</p>
                <p className="text-3xl font-bold text-gray-900">${salesKPIs.salesThisMonth.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
            <p className="mt-2 text-sm text-green-600">+12% from last month</p>
          </div>

          {/* Top Customers */}
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Top Customers</p>
                <p className="text-3xl font-bold text-gray-900">{salesKPIs.topCustomers.length}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
            <p className="mt-2 text-sm text-purple-600">${salesKPIs.topCustomers.reduce((sum, c) => sum + c.totalQuotes, 0).toLocaleString()} total value</p>
          </div>

          {/* Recent Inquiries */}
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Recent Inquiries</p>
                <p className="text-3xl font-bold text-gray-900">{salesKPIs.recentInquiries}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
            </div>
            <p className="mt-2 text-sm text-orange-600">Unprocessed</p>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Quotation Trends Chart */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quotation Trends (Last 6 Months)</h3>
            <div className="space-y-4">
              {quotationTrends.map((trend, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                      <span className="text-sm font-medium text-blue-600">{trend.month}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{trend.quotations} quotations</p>
                      <p className="text-xs text-gray-500">{trend.accepted} accepted</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-green-600">${trend.revenue.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">{Math.round((trend.accepted / trend.quotations) * 100)}% success</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Customers Chart */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Customers by Value</h3>
            <div className="space-y-4">
              {salesKPIs.topCustomers.map((customer, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                      index === 0 ? 'bg-yellow-500' : 
                      index === 1 ? 'bg-gray-400' : 
                      index === 2 ? 'bg-orange-500' : 'bg-blue-500'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{customer.name}</p>
                      <p className="text-xs text-gray-500">{customer.quotesCount} quotes</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">${customer.totalQuotes.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* High-Frequency Sales Tasks */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={() => setShowCreateQuotation(true)}
              className="flex items-center justify-center p-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Create New Quotation
            </button>

            <button
              onClick={() => setShowAddCustomer(true)}
              className="flex items-center justify-center p-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              Add New Customer
            </button>

            <button
              onClick={() => setShowConvertQuote(true)}
              className="flex items-center justify-center p-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-200"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              Convert Quote to Order
            </button>

            <button
              onClick={() => setShowSearchQuotations(true)}
              className="flex items-center justify-center p-4 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors duration-200"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Search Quotations
            </button>
          </div>
        </div>

        {/* Customers List */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Customers</h3>
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search customers..."
                    className="pl-10 pr-4 py-2 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <button
                  onClick={() => setShowAddCustomer(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200"
                >
                  Add Customer
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tax/GST Info</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Quotes</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <p className="font-medium text-gray-900">{customer.name}</p>
                        <p className="text-sm text-gray-500">{customer.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <p className="text-sm text-gray-900">{customer.contact}</p>
                        <p className="text-sm text-gray-500">{customer.phone}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {customer.gst}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <p className="text-sm font-medium text-gray-900">${customer.totalQuotes.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">{customer.quotesCount} quotes</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        customer.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {customer.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button className="text-blue-600 hover:text-blue-700 mr-3">Edit</button>
                      <button className="text-green-600 hover:text-green-700 mr-3">View Quotes</button>
                      <button className="text-red-600 hover:text-red-700">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modals */}
      <CreateQuotationModal isOpen={showCreateQuotation} onClose={() => setShowCreateQuotation(false)} />
      <AddCustomerModal isOpen={showAddCustomer} onClose={() => setShowAddCustomer(false)} />
      <ConvertQuoteModal isOpen={showConvertQuote} onClose={() => setShowConvertQuote(false)} />
      <SearchQuotationsModal isOpen={showSearchQuotations} onClose={() => setShowSearchQuotations(false)} />
    </AppLayout>
  );
}
