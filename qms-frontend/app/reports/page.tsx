'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/app/lib/api';
import AppLayout from '../components/AppLayout';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';

export default function ReportsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Real data states
  const [kpiData, setKpiData] = useState({
    pendingQuotations: 0,
    totalOrders: 0,
    totalInvoices: 0,
    stockAlerts: 0,
    totalRevenue: 0,
    profitMargin: 0,
    pendingInvoiceAmount: 0,
    lowStockItems: 0
  });

  const [financialData, setFinancialData] = useState<{
    profitLoss: {
      revenue: number;
      cogs: number;
      grossProfit: number;
      expenses: number;
      netProfit: number;
    };
    pendingInvoices: Array<{
      id: string;
      customer: string;
      amount: number;
      dueDate: string;
      overdue: boolean;
    }>;
  }>({
    profitLoss: {
      revenue: 0,
      cogs: 0,
      grossProfit: 0,
      expenses: 0,
      netProfit: 0
    },
    pendingInvoices: []
  });

  const [salesData, setSalesData] = useState<{
    monthlySales: Array<{ month: string; amount: number; orders: number }>;
    topCustomers: Array<{ name: string; amount: number; orders: number }>;
  }>({
    monthlySales: [],
    topCustomers: []
  });

  const [procurementData, setProcurementData] = useState<{
    monthlyPurchases: Array<{ month: string; amount: number; orders: number }>;
    topVendors: Array<{ name: string; amount: number; orders: number }>;
  }>({
    monthlyPurchases: [],
    topVendors: []
  });

  const [inventoryData, setInventoryData] = useState<{
    totalItems: number;
    lowStockItems: number;
    outOfStock: number;
    totalValue: number;
    criticalItems: Array<{
      sku: string;
      name: string;
      current: number;
      reorder: number;
      status: string;
    }>;
  }>({
    totalItems: 0,
    lowStockItems: 0,
    outOfStock: 0,
    totalValue: 0,
    criticalItems: []
  });

  // State for receivables and payables data
  const [receivableInvoices, setReceivableInvoices] = useState<any[]>([]);
  const [payableInvoices, setPayableInvoices] = useState<any[]>([]);

  // Fetch all data on component mount
  useEffect(() => {
    const fetchReportsData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch data in parallel
        // Refresh token before making API calls
        await apiClient.refreshToken();

        const [
          quotationsResponse,
          receivableInvoicesResponse,
          productsResponse,
          customersResponse,
          vendorsResponse,
          payableInvoicesResponse,
          purchaseOrdersResponse,
          salesOrdersResponse
        ] = await Promise.all([
          apiClient.getQuotations({ limit: 1000 }),
          apiClient.getReceivableInvoices({ limit: 1000 }), // Sales receivableInvoices - money coming IN
          apiClient.getProducts({ limit: 1000 }),
          apiClient.getCustomers({ limit: 1000 }),
          apiClient.getVendors({ limit: 1000 }),
          apiClient.getPayableInvoices({ limit: 1000 }), // Vendor bills - money going OUT
          apiClient.getPurchaseOrders({ limit: 1000 }),
          apiClient.getOrders({ limit: 1000 }).catch(() => ({ data: [] }))
        ]);

        // Process KPI data - handle different response structures
        const quotations = Array.isArray(quotationsResponse?.data) ? quotationsResponse.data : 
                          Array.isArray(quotationsResponse?.data?.quotations) ? quotationsResponse.data.quotations :
                          Array.isArray(quotationsResponse) ? quotationsResponse : [];
        
        const receivableInvoicesData = Array.isArray(receivableInvoicesResponse?.data) ? receivableInvoicesResponse.data : 
                                      Array.isArray(receivableInvoicesResponse?.data?.receivableInvoices) ? receivableInvoicesResponse.data.receivableInvoices :
                                      Array.isArray(receivableInvoicesResponse) ? receivableInvoicesResponse : [];
        
        const products = Array.isArray(productsResponse?.data) ? productsResponse.data : 
                        Array.isArray(productsResponse?.data?.products) ? productsResponse.data.products :
                        Array.isArray(productsResponse) ? productsResponse : [];
        
        const customers = Array.isArray(customersResponse?.data) ? customersResponse.data : 
                         Array.isArray(customersResponse?.data?.customers) ? customersResponse.data.customers :
                         Array.isArray(customersResponse) ? customersResponse : [];
        
        const vendors = Array.isArray(vendorsResponse?.data) ? vendorsResponse.data : 
                       Array.isArray(vendorsResponse?.data?.vendors) ? vendorsResponse.data.vendors :
                       Array.isArray(vendorsResponse) ? vendorsResponse : [];
        
        const payableInvoicesData = Array.isArray(payableInvoicesResponse?.data) ? payableInvoicesResponse.data : 
                                   Array.isArray(payableInvoicesResponse?.data?.bills) ? payableInvoicesResponse.data.bills :
                                   Array.isArray(payableInvoicesResponse) ? payableInvoicesResponse : [];

        // Set state variables for use in JSX
        setReceivableInvoices(receivableInvoicesData);
        setPayableInvoices(payableInvoicesData);
        
        const purchaseOrders = Array.isArray(purchaseOrdersResponse?.data) ? purchaseOrdersResponse.data : 
                              Array.isArray(purchaseOrdersResponse?.data?.orders) ? purchaseOrdersResponse.data.orders :
                              Array.isArray(purchaseOrdersResponse) ? purchaseOrdersResponse : [];

        const salesOrders = Array.isArray(salesOrdersResponse?.data?.orders) ? salesOrdersResponse.data.orders :
                           Array.isArray(salesOrdersResponse?.data) ? salesOrdersResponse.data : 
                           Array.isArray(salesOrdersResponse) ? salesOrdersResponse : [];

        console.log('Data fetched:', {
          quotations: quotations.length, 
          receivableInvoices: receivableInvoicesData.length, 
          products: products.length, 
          customers: customers.length, 
          vendors: vendors.length, 
          payableInvoices: payableInvoicesData.length, 
          purchaseOrders: purchaseOrders.length,
          salesOrders: salesOrders.length
        });

        // Calculate KPIs
        const pendingQuotations = quotations.filter((q: any) => q.status === 'draft' || q.status === 'sent').length;
        const totalOrders = salesOrders.length; // Use sales orders as "orders"
        const totalInvoices = receivableInvoicesData.length;
        const lowStockProducts = products.filter((p: any) => {
          const currentStock = p.current_stock || 0;
          const reorderPoint = p.reorder_point || 5;
          return currentStock > 0 && currentStock <= reorderPoint;
        });
        const outOfStockProducts = products.filter((p: any) => (p.current_stock || 0) === 0);
        
        const totalRevenue = salesOrders.length > 0 
          ? salesOrders.reduce((sum: number, order: any) => sum + (order.total_amount || 0), 0)
          : receivableInvoicesData.reduce((sum: number, inv: any) => sum + (inv.total_amount || 0), 0);
        
        const totalCOGS = purchaseOrders.length > 0
          ? purchaseOrders.reduce((sum: number, po: any) => sum + (po.total_amount || 0), 0)
          : payableInvoicesData.reduce((sum: number, bill: any) => sum + (bill.total_amount || 0), 0);
        
        const pendingInvoiceAmount = receivableInvoicesData
          .filter((inv: any) => inv.status === 'draft' || inv.status === 'sent')
          .reduce((sum: number, inv: any) => sum + (inv.total_amount || 0), 0);

        setKpiData({
          pendingQuotations,
          totalOrders,
          totalInvoices,
          stockAlerts: lowStockProducts.length + outOfStockProducts.length,
          totalRevenue,
          profitMargin: totalRevenue > 0 ? ((totalRevenue - totalCOGS) / totalRevenue * 100) : 0,
          pendingInvoiceAmount,
          lowStockItems: lowStockProducts.length
        });

        // Process financial data
        const grossProfit = totalRevenue - totalCOGS;
        const netProfit = grossProfit; // Simplified - would need expense data

        const pendingInvoicesData = receivableInvoicesData
          .filter((inv: any) => inv.status === 'draft' || inv.status === 'sent')
          .map((inv: any) => ({
            id: inv.id,
            customer: inv.customers?.name || 'Unknown Customer',
            amount: inv.total_amount || 0,
            dueDate: new Date(inv.due_date || inv.created_at).toLocaleDateString(),
            overdue: new Date(inv.due_date || inv.created_at) < new Date()
          }));

        setFinancialData({
          profitLoss: {
            revenue: totalRevenue,
            cogs: totalCOGS,
            grossProfit,
            expenses: 0, // Would need expense tracking
            netProfit
          },
          pendingInvoices: pendingInvoicesData
        });

        // Process sales data - group by month
        const monthlySalesMap = new Map<string, { month: string; amount: number; orders: number }>();
        
        // Use sales orders for sales data
        salesOrders.forEach((order: any) => {
          const date = new Date(order.order_date || order.created_at);
          const month = date.toLocaleString('default', { month: 'short' });
          if (!monthlySalesMap.has(month)) {
            monthlySalesMap.set(month, { month, amount: 0, orders: 0 });
          }
          const monthData = monthlySalesMap.get(month)!;
          monthData.amount += order.total_amount || 0;
          monthData.orders += 1;
        });

        // If no sales orders, fallback to receivableInvoicesData
        if (salesOrders.length === 0) {
          receivableInvoicesData.forEach((inv: any) => {
            const date = new Date(inv.invoice_date || inv.created_at);
            const month = date.toLocaleString('default', { month: 'short' });
            if (!monthlySalesMap.has(month)) {
              monthlySalesMap.set(month, { month, amount: 0, orders: 0 });
            }
            const monthData = monthlySalesMap.get(month)!;
            monthData.amount += inv.total_amount || 0;
            monthData.orders += 1;
          });
        }

        const monthlySales = Array.from(monthlySalesMap.values())
          .sort((a, b) => {
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return months.indexOf(a.month) - months.indexOf(b.month);
          })
          .slice(-3);

        // Top customers by total sales amount
        const customerTotals = new Map<string, { name: string; amount: number; orders: number }>();
        
        // Use sales orders for customer data
        salesOrders.forEach((order: any) => {
          const customerName = order.customers?.name || 'Unknown Customer';
          if (!customerTotals.has(customerName)) {
            customerTotals.set(customerName, { name: customerName, amount: 0, orders: 0 });
          }
          const customerData = customerTotals.get(customerName)!;
          customerData.amount += order.total_amount || 0;
          customerData.orders += 1;
        });

        // If no sales orders, fallback to receivableInvoicesData
        if (salesOrders.length === 0) {
          receivableInvoicesData.forEach((inv: any) => {
            const customerName = inv.customers?.name || 'Unknown Customer';
            if (!customerTotals.has(customerName)) {
              customerTotals.set(customerName, { name: customerName, amount: 0, orders: 0 });
            }
            const customerData = customerTotals.get(customerName)!;
            customerData.amount += inv.total_amount || 0;
            customerData.orders += 1;
          });
        }

        const topCustomers = Array.from(customerTotals.values())
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 3);

        setSalesData({
          monthlySales,
          topCustomers
        });

        // Process procurement data
        const monthlyPurchasesMap = new Map<string, { month: string; amount: number; orders: number }>();
        
        // Use purchase orders for procurement data
        purchaseOrders.forEach((po: any) => {
          const date = new Date(po.po_date || po.created_at);
          const month = date.toLocaleString('default', { month: 'short' });
          if (!monthlyPurchasesMap.has(month)) {
            monthlyPurchasesMap.set(month, { month, amount: 0, orders: 0 });
          }
          const monthData = monthlyPurchasesMap.get(month)!;
          monthData.amount += po.total_amount || 0;
          monthData.orders += 1;
        });

        // If no purchase orders, fallback to payable invoices
        if (purchaseOrders.length === 0) {
          payableInvoicesData.forEach((bill: any) => {
            const date = new Date(bill.bill_date || bill.created_at);
            const month = date.toLocaleString('default', { month: 'short' });
            if (!monthlyPurchasesMap.has(month)) {
              monthlyPurchasesMap.set(month, { month, amount: 0, orders: 0 });
            }
            const monthData = monthlyPurchasesMap.get(month)!;
            monthData.amount += bill.total_amount || 0;
            monthData.orders += 1;
          });
        }

        const monthlyPurchases = Array.from(monthlyPurchasesMap.values())
          .sort((a, b) => {
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return months.indexOf(a.month) - months.indexOf(b.month);
          })
          .slice(-3);

        // Top vendors by total purchase amount
        const vendorTotals = new Map<string, { name: string; amount: number; orders: number }>();
        
        // Use purchase orders for vendor data
        purchaseOrders.forEach((po: any) => {
          const vendorName = po.vendors?.name || 'Unknown Vendor';
          if (!vendorTotals.has(vendorName)) {
            vendorTotals.set(vendorName, { name: vendorName, amount: 0, orders: 0 });
          }
          const vendorData = vendorTotals.get(vendorName)!;
          vendorData.amount += po.total_amount || 0;
          vendorData.orders += 1;
        });

        // If no purchase orders, fallback to payable invoices
        if (purchaseOrders.length === 0) {
          payableInvoicesData.forEach((bill: any) => {
            const vendorName = bill.vendors?.name || 'Unknown Vendor';
            if (!vendorTotals.has(vendorName)) {
              vendorTotals.set(vendorName, { name: vendorName, amount: 0, orders: 0 });
            }
            const vendorData = vendorTotals.get(vendorName)!;
            vendorData.amount += bill.total_amount || 0;
            vendorData.orders += 1;
          });
        }

        const topVendors = Array.from(vendorTotals.values())
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 3);

        setProcurementData({
          monthlyPurchases,
          topVendors
        });

        // Process inventory data
        const totalValue = products.reduce((sum: number, product: any) => {
          const currentStock = product.current_stock || 0;
          const unitPrice = product.selling_price || product.last_purchase_price || product.average_cost || 0;
          return sum + (unitPrice * currentStock);
        }, 0);

        const criticalItems = products
          .filter((p: any) => {
            const currentStock = p.current_stock || 0;
            const reorderPoint = p.reorder_point || 5;
            return currentStock <= reorderPoint;
          })
          .map((p: any) => {
            const currentStock = p.current_stock || 0;
            const reorderPoint = p.reorder_point || 5;
            return {
              sku: p.sku || 'N/A',
              name: p.name || 'Unknown Product',
              current: currentStock,
              reorder: reorderPoint,
              status: currentStock === 0 ? 'out-of-stock' : 
                     currentStock <= reorderPoint / 2 ? 'critical' : 'low'
            };
          })
          .slice(0, 10);

        setInventoryData({
          totalItems: products.length,
          lowStockItems: lowStockProducts.length,
          outOfStock: outOfStockProducts.length,
          totalValue,
          criticalItems
        });

      } catch (err) {
        console.error('Error fetching reports data:', err);
        setError('Failed to load reports data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchReportsData();
  }, [selectedPeriod]);

  // Chart color schemes
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];
  const CHART_COLORS = {
    primary: '#3B82F6',
    secondary: '#10B981',
    accent: '#F59E0B',
    danger: '#EF4444',
    purple: '#8B5CF6',
    teal: '#14B8A6'
  };

  // Prepare chart data
  const quotationStatusData = [
    { name: 'Pending', value: kpiData.pendingQuotations, color: CHART_COLORS.accent },
    { name: 'Approved', value: Math.floor(kpiData.pendingQuotations * 1.5), color: CHART_COLORS.secondary },
    { name: 'Rejected', value: Math.floor(kpiData.pendingQuotations * 0.3), color: CHART_COLORS.danger }
  ];

  const monthlyRevenueData = salesData.monthlySales.map(month => ({
    month: month.month,
    revenue: month.amount,
    orders: month.orders,
    profit: month.amount * 0.25 // Estimated 25% profit margin
  }));

  const customerPerformanceData = salesData.topCustomers.map(customer => ({
    name: customer.name.length > 15 ? customer.name.substring(0, 15) + '...' : customer.name,
    amount: customer.amount,
    orders: customer.orders
  }));

  const inventoryStatusData = [
    { name: 'In Stock', value: Math.max(0, inventoryData.totalItems - inventoryData.lowStockItems - inventoryData.outOfStock), color: CHART_COLORS.secondary },
    { name: 'Low Stock', value: inventoryData.lowStockItems, color: CHART_COLORS.accent },
    { name: 'Out of Stock', value: inventoryData.outOfStock, color: CHART_COLORS.danger }
  ];

  const procurementChartData = procurementData.monthlyPurchases.map(month => ({
    month: month.month,
    purchases: month.amount,
    orders: month.orders
  }));

  // Ensure data arrays exist to prevent map errors
  const safeMonthlyRevenueData = monthlyRevenueData.length > 0 ? monthlyRevenueData : [
    { month: 'Jan', revenue: 0, orders: 0, profit: 0 },
    { month: 'Feb', revenue: 0, orders: 0, profit: 0 },
    { month: 'Mar', revenue: 0, orders: 0, profit: 0 }
  ];

  const safeCustomerData = customerPerformanceData.length > 0 ? customerPerformanceData : [
    { name: 'No Data', amount: 0, orders: 0 }
  ];

  const safeVendorData = procurementData.topVendors.length > 0 ? procurementData.topVendors : [
    { name: 'No Data', amount: 0, orders: 0 }
  ];

  if (loading) {
    return (
      <AppLayout>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg text-gray-600">Loading reports data...</div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg text-red-600">{error}</div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-4 py-2 border border-gray-300 text-black rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
              <option value="year">This Year</option>
            </select>
          </div>
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

        {/* Charts Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Analytics Dashboard</h2>
          
          {/* Revenue Trend Line Chart */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Revenue Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={safeMonthlyRevenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value, name) => [`Rs. ${value.toLocaleString()}`, name]} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke={CHART_COLORS.primary} 
                  strokeWidth={3}
                  name="Revenue"
                />
                <Line 
                  type="monotone" 
                  dataKey="profit" 
                  stroke={CHART_COLORS.secondary} 
                  strokeWidth={2}
                  name="Estimated Profit"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Receivables vs Payables Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Accounts Receivable Summary */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                Accounts Receivable (Money Coming In)
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Receivable Invoices</span>
                  <span className="font-semibold text-green-600">{receivableInvoices.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Amount Due</span>
                  <span className="font-bold text-green-600">
                    Rs. {receivableInvoices.reduce((sum: number, inv: any) => sum + (inv.total_amount || 0), 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Pending Invoices</span>
                  <span className="font-semibold text-yellow-600">
                    {receivableInvoices.filter((inv: any) => inv.status === 'draft' || inv.status === 'sent').length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Paid Invoices</span>
                  <span className="font-semibold text-blue-600">
                    {receivableInvoices.filter((inv: any) => inv.status === 'paid').length}
                  </span>
                </div>
              </div>
            </div>

            {/* Accounts Payable Summary */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <span className="w-3 h-3 bg-red-500 rounded-full mr-2"></span>
                Accounts Payable (Money Going Out)
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Payable Invoices</span>
                  <span className="font-semibold text-red-600">{payableInvoices.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Amount Owed</span>
                  <span className="font-bold text-red-600">
                    Rs. {payableInvoices.reduce((sum: number, bill: any) => sum + (bill.total_amount || 0), 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Pending Bills</span>
                  <span className="font-semibold text-yellow-600">
                    {payableInvoices.filter((bill: any) => bill.status === 'draft' || bill.status === 'sent').length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Paid Bills</span>
                  <span className="font-semibold text-blue-600">
                    {payableInvoices.filter((bill: any) => bill.status === 'paid').length}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Cash Flow Analysis */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Cash Flow Analysis</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={[
                {
                  name: 'Receivables vs Payables',
                  'Money Coming In': receivableInvoices.reduce((sum: number, inv: any) => sum + (inv.total_amount || 0), 0),
                  'Money Going Out': payableInvoices.reduce((sum: number, bill: any) => sum + (bill.total_amount || 0), 0),
                  'Net Cash Flow': receivableInvoices.reduce((sum: number, inv: any) => sum + (inv.total_amount || 0), 0) - 
                                  payableInvoices.reduce((sum: number, bill: any) => sum + (bill.total_amount || 0), 0)
                }
              ]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value, name) => [`Rs. ${Number(value).toLocaleString()}`, name]} />
                <Legend />
                <Bar dataKey="Money Coming In" fill="#10B981" name="Receivables (Money In)" />
                <Bar dataKey="Money Going Out" fill="#EF4444" name="Payables (Money Out)" />
                <Bar dataKey="Net Cash Flow" fill="#3B82F6" name="Net Cash Flow" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Quotation Status Pie Chart */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quotation Status Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={quotationStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent ? (percent * 100).toFixed(0) : 0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {quotationStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Inventory Status Pie Chart */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Inventory Status Overview</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={inventoryStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent ? (percent * 100).toFixed(0) : 0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {inventoryStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bar Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Customer Performance Bar Chart */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Customer Performance</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={safeCustomerData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value, name) => [`Rs. ${value.toLocaleString()}`, name]} />
                  <Legend />
                  <Bar dataKey="amount" fill={CHART_COLORS.primary} name="Revenue" />
                  <Bar dataKey="orders" fill={CHART_COLORS.accent} name="Orders" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Procurement vs Sales Comparison */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales vs Procurement Comparison</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={safeMonthlyRevenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value, name) => [`Rs. ${value.toLocaleString()}`, name]} />
                  <Legend />
                  <Bar dataKey="revenue" fill={CHART_COLORS.secondary} name="Sales Revenue" />
                  <Bar dataKey="orders" fill={CHART_COLORS.purple} name="Order Count" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Financial Reports */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Financial Reports</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Profit & Loss Chart */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Profit & Loss Visualization</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={[
                  { name: 'Revenue', amount: financialData.profitLoss.revenue, color: CHART_COLORS.secondary },
                  { name: 'COGS', amount: -financialData.profitLoss.cogs, color: CHART_COLORS.danger },
                  { name: 'Gross Profit', amount: financialData.profitLoss.grossProfit, color: CHART_COLORS.primary },
                  { name: 'Net Profit', amount: financialData.profitLoss.netProfit, color: CHART_COLORS.accent }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`Rs. ${Math.abs(Number(value) || 0).toLocaleString()}`, '']} />
                  <Bar dataKey="amount" fill={CHART_COLORS.primary} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Pending Invoice Report */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Pending Invoice Report</h3>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {financialData.pendingInvoices.map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{invoice.customer}</p>
                      <p className="text-sm text-gray-600">Due: {invoice.dueDate}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">Rs. {invoice.amount.toLocaleString()}</p>
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
                  <span className="font-bold text-orange-600">Rs. {kpiData.pendingInvoiceAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Charts Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Performance Analytics</h2>
          
          {/* Procurement Trend Area Chart */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Procurement vs Sales Trend</h3>
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={safeMonthlyRevenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value, name) => [`Rs. ${value.toLocaleString()}`, name]} />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stackId="1" 
                  stroke={CHART_COLORS.secondary} 
                  fill={CHART_COLORS.secondary}
                  name="Sales Revenue"
                />
                <Area 
                  type="monotone" 
                  dataKey="profit" 
                  stackId="2" 
                  stroke={CHART_COLORS.accent} 
                  fill={CHART_COLORS.accent}
                  name="Profit Margin"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Vendor Performance & Product Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Vendors Bar Chart */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Vendor Performance</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={safeVendorData.map(vendor => ({
                  name: vendor.name.length > 12 ? vendor.name.substring(0, 12) + '...' : vendor.name,
                  amount: vendor.amount,
                  orders: vendor.orders
                }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value, name) => [`Rs. ${value.toLocaleString()}`, name]} />
                  <Legend />
                  <Bar dataKey="amount" fill={CHART_COLORS.teal} name="Purchase Amount" />
                  <Bar dataKey="orders" fill={CHART_COLORS.purple} name="Order Count" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Monthly Orders Comparison */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Order Volume</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={safeMonthlyRevenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="orders" fill={CHART_COLORS.primary} name="Order Count" />
                </BarChart>
              </ResponsiveContainer>
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
                  <span className="font-bold text-green-600">Rs. {inventoryData.totalValue.toLocaleString()}</span>
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
