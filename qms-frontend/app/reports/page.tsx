'use client';

import { useState } from 'react';
import AppLayout from '../components/AppLayout';

export default function ReportsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('month');

  // Mock data for KPI Dashboard
  const kpiData = {
    pendingQuotations: 12,
    totalOrders: 45,
    totalInvoices: 38,
    stockAlerts: 7,
    totalRevenue: 125000,
    profitMargin: 18.5,
    pendingInvoiceAmount: 25000,
    lowStockItems: 7
  };

  // Mock data for Financial Reports
  const financialData = {
    profitLoss: {
      revenue: 125000,
      cogs: 85000,
      grossProfit: 40000,
      expenses: 25000,
      netProfit: 15000
    },
    pendingInvoices: [
      { id: 1, customer: 'ABC Corp', amount: 8500, dueDate: '2024-09-05', overdue: false },
      { id: 2, customer: 'XYZ Ltd', amount: 12000, dueDate: '2024-08-25', overdue: true },
      { id: 3, customer: 'Tech Solutions', amount: 4500, dueDate: '2024-09-10', overdue: false }
    ]
  };

  // Mock data for Sales & Procurement
  const salesData = {
    monthlySales: [
      { month: 'Jan', amount: 95000, orders: 32 },
      { month: 'Feb', amount: 110000, orders: 38 },
      { month: 'Mar', amount: 125000, orders: 45 }
    ],
    topCustomers: [
      { name: 'ABC Corp', amount: 35000, orders: 12 },
      { name: 'XYZ Ltd', amount: 28000, orders: 8 },
      { name: 'Tech Solutions', amount: 22000, orders: 15 }
    ]
  };

  const procurementData = {
    monthlyPurchases: [
      { month: 'Jan', amount: 65000, orders: 18 },
      { month: 'Feb', amount: 72000, orders: 22 },
      { month: 'Mar', amount: 85000, orders: 28 }
    ],
    topVendors: [
      { name: 'Tech Supplies Co', amount: 25000, orders: 8 },
      { name: 'Office Equipment Ltd', amount: 18000, orders: 12 },
      { name: 'Industrial Parts Inc', amount: 15000, orders: 6 }
    ]
  };

  // Mock data for Inventory
  const inventoryData = {
    totalItems: 245,
    lowStockItems: 7,
    outOfStock: 2,
    totalValue: 185000,
    criticalItems: [
      { sku: 'LAP-001', name: 'Laptop Dell XPS 13', current: 2, reorder: 5, status: 'critical' },
      { sku: 'MON-002', name: 'Monitor 27" 4K', current: 1, reorder: 3, status: 'critical' },
      { sku: 'KEY-003', name: 'Wireless Keyboard', current: 0, reorder: 10, status: 'out-of-stock' },
      { sku: 'MOU-004', name: 'Wireless Mouse', current: 3, reorder: 8, status: 'low' }
    ]
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
        </div>

        {/* KPI Dashboard */}
        <div className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Pending Quotations */}
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending Quotations</p>
                  <p className="text-3xl font-bold text-gray-900">{kpiData.pendingQuotations}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-2">Awaiting customer response</p>
            </div>

            {/* Total Orders */}
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Orders</p>
                  <p className="text-3xl font-bold text-gray-900">{kpiData.totalOrders}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m6 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
                  </svg>
                </div>
              </div>
              <p className="text-sm text-green-600 mt-2">+12% from last month</p>
            </div>

            {/* Total Invoices */}
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Invoices</p>
                  <p className="text-3xl font-bold text-gray-900">{kpiData.totalInvoices}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-2">This month</p>
            </div>

            {/* Stock Alerts */}
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-red-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Stock Alerts</p>
                  <p className="text-3xl font-bold text-gray-900">{kpiData.stockAlerts}</p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
              </div>
              <p className="text-sm text-red-600 mt-2">Requires immediate attention</p>
            </div>
          </div>
        </div>

        {/* Financial Reports */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Financial Reports</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Profit & Loss Statement */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Profit & Loss Statement</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-gray-600">Total Revenue</span>
                  <span className="font-semibold text-green-600">${financialData.profitLoss.revenue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-gray-600">Cost of Goods Sold</span>
                  <span className="font-semibold text-red-600">-${financialData.profitLoss.cogs.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-gray-600">Gross Profit</span>
                  <span className="font-semibold text-blue-600">${financialData.profitLoss.grossProfit.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-gray-600">Operating Expenses</span>
                  <span className="font-semibold text-red-600">-${financialData.profitLoss.expenses.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-2 bg-gray-50 px-4 rounded-lg">
                  <span className="font-semibold text-gray-900">Net Profit</span>
                  <span className="font-bold text-green-600 text-lg">${financialData.profitLoss.netProfit.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Pending Invoice Report */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Pending Invoice Report</h3>
              <div className="space-y-3">
                {financialData.pendingInvoices.map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{invoice.customer}</p>
                      <p className="text-sm text-gray-600">Due: {invoice.dueDate}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">${invoice.amount.toLocaleString()}</p>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        invoice.overdue ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {invoice.overdue ? 'Overdue' : 'Pending'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-900">Total Pending</span>
                  <span className="font-bold text-orange-600">${kpiData.pendingInvoiceAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sales & Procurement Reports */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Sales & Procurement Reports</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Sales Summary */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Sales Summary</h3>
              <div className="space-y-4">
                {salesData.monthlySales.map((month, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{month.month} 2024</p>
                      <p className="text-sm text-gray-600">{month.orders} orders</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">${month.amount.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h4 className="font-medium text-gray-900 mb-3">Top Customers</h4>
                <div className="space-y-2">
                  {salesData.topCustomers.map((customer, index) => (
                    <div key={index} className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">{customer.name}</span>
                      <span className="font-medium text-gray-900">${customer.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Purchase Summary */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Purchase Summary</h3>
              <div className="space-y-4">
                {procurementData.monthlyPurchases.map((month, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{month.month} 2024</p>
                      <p className="text-sm text-gray-600">{month.orders} purchase orders</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-blue-600">${month.amount.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h4 className="font-medium text-gray-900 mb-3">Top Vendors</h4>
                <div className="space-y-2">
                  {procurementData.topVendors.map((vendor, index) => (
                    <div key={index} className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">{vendor.name}</span>
                      <span className="font-medium text-gray-900">${vendor.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Inventory Report */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Inventory Report</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Inventory Overview */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Inventory Overview</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Items</span>
                  <span className="font-semibold text-gray-900">{inventoryData.totalItems}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Low Stock Items</span>
                  <span className="font-semibold text-yellow-600">{inventoryData.lowStockItems}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Out of Stock</span>
                  <span className="font-semibold text-red-600">{inventoryData.outOfStock}</span>
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                  <span className="font-medium text-gray-900">Total Value</span>
                  <span className="font-bold text-green-600">${inventoryData.totalValue.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Critical Stock Alerts */}
            <div className="lg:col-span-2 bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Critical Stock Alerts</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reorder Level</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {inventoryData.criticalItems.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.sku}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{item.name}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{item.current}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{item.reorder}</td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            item.status === 'critical' ? 'bg-red-100 text-red-800' :
                            item.status === 'out-of-stock' ? 'bg-gray-100 text-gray-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {item.status === 'out-of-stock' ? 'Out of Stock' : 
                             item.status === 'critical' ? 'Critical' : 'Low Stock'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
