'use client';

import { useState, useEffect } from 'react';
import AppLayout from '../components/AppLayout';
import CreateQuotationModal from '../components/sales/CreateQuotationModal';
import AddCustomerModal from '../components/sales/AddCustomerModalMultiStep';
import ConvertQuoteModal from '../components/sales/ConvertQuoteModal';
import SearchQuotationsModal from '../components/sales/SearchQuotationsModal';
import EditCustomerModal from '../components/sales/EditCustomerModal';
import ViewCustomerQuotesModal from '../components/sales/ViewCustomerQuotesModal';
import QuotationTrendsModal from '../components/sales/QuotationTrendsModal';
import TopCustomersModal from '../components/sales/TopCustomersModal';
import { apiClient, type SalesDashboardData, type QuotationTrend, type Customer } from '../lib/api';
import { loadJsPDF, loadXLSX } from '../../lib/dynamicImports';

interface SalesOrder {
  id: string;
  order_number: string;
  customer_id: string;
  status: string;
  total_amount: number;
  order_date: string;
  expected_delivery_date: string;
  customers?: { name: string; email: string };
  created_at: string;
}

export default function SalesPage() {
  const [showCreateQuotation, setShowCreateQuotation] = useState(false);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [showConvertQuote, setShowConvertQuote] = useState(false);
  const [showSearchQuotations, setShowSearchQuotations] = useState(false);
  const [showEditCustomer, setShowEditCustomer] = useState(false);
  const [showViewQuotes, setShowViewQuotes] = useState(false);
  const [showQuotationTrends, setShowQuotationTrends] = useState(false);
  const [showTopCustomers, setShowTopCustomers] = useState(false);
  const [showOrderManagement, setShowOrderManagement] = useState(false);
  const [showUpdateDeliveryStatus, setShowUpdateDeliveryStatus] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
  const [orderViewMode, setOrderViewMode] = useState<'grid' | 'list'>('grid');
  const [orderSearchTerm, setOrderSearchTerm] = useState('');

  // State for real data
  const [salesData, setSalesData] = useState<SalesDashboardData | null>(null);
  const [quotationTrends, setQuotationTrends] = useState<QuotationTrend[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(false); // Changed to false for immediate UI
  const [dataLoading, setDataLoading] = useState({
    customers: true,
    dashboard: true,
    trends: true,
    orders: true
  });
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [customersViewMode, setCustomersViewMode] = useState<'list' | 'grid'>('grid');

  // Fetch data from backend - Optimized for performance
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setError(null);
        const startTime = Date.now();
        
        // Load customers first (most important for user interaction)
        const fetchCustomers = async () => {
          try {
            const customersResponse = await apiClient.getSalesCustomers({ limit: 50 });
            
            if (customersResponse.success) {
              setCustomers(customersResponse.data.customers);
            }
          } catch (err) {
            console.error('❌ Failed to fetch customers:', err);
          } finally {
            setDataLoading(prev => ({ ...prev, customers: false }));
          }
        };

        // Load dashboard data (for stats)
        const fetchDashboard = async () => {
          try {
            const dashboardResponse = await apiClient.getSalesDashboard();
            
            if (dashboardResponse.success) {
              setSalesData(dashboardResponse.data);
            }
          } catch (err) {
            console.error('❌ Failed to fetch dashboard data:', err);
          } finally {
            setDataLoading(prev => ({ ...prev, dashboard: false }));
          }
        };

        // Load trends data (least critical)
        const fetchTrends = async () => {
          try {
            const trendsResponse = await apiClient.getQuotationTrends();
            
            if (trendsResponse.success) {
              setQuotationTrends(trendsResponse.data.trends);
            }
          } catch (err) {
            console.error('❌ Failed to fetch trends:', err);
          } finally {
            setDataLoading(prev => ({ ...prev, trends: false }));
          }
        };

        // Load sales orders
        const fetchOrders = async () => {
          try {
            const ordersResponse = await apiClient.getSalesOrders({ limit: 50 });
            
            if (ordersResponse.success) {
              setSalesOrders(ordersResponse.data.orders || []);
            }
          } catch (err) {
            console.error('❌ Failed to fetch orders:', err);
          } finally {
            setDataLoading(prev => ({ ...prev, orders: false }));
          }
        };

        // Start all fetches in parallel for fastest loading
        Promise.all([
          fetchCustomers(),
          fetchDashboard(),
          fetchTrends(),
          fetchOrders()
        ]).then(() => {
        });
        
      } catch (err) {
        console.error('❌ Critical error in sales data fetch:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      }
    };
    
    fetchInitialData();
  }, []);
  
  // Filter customers based on search term
  const filteredCustomers = customers.filter(customer => 
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.contact_person?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handler functions for customer actions
  const handleEditCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowEditCustomer(true);
  };

  const handleViewQuotes = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowViewQuotes(true);
  };

  const handleDeleteCustomer = async (customer: Customer) => {
    if (confirm(`Are you sure you want to delete customer "${customer.name}"? This action cannot be undone.`)) {
      try {
        const response = await apiClient.deleteCustomer(customer.id);
        if (response.success) {
          alert('Customer deleted successfully!');
          // Refresh customer list
          const customersResponse = await apiClient.getSalesCustomers({ limit: 50 });
          if (customersResponse.success) {
            setCustomers(customersResponse.data.customers);
          }
        } else {
          throw new Error(response.message || 'Failed to delete customer');
        }
      } catch (error) {
        console.error('Failed to delete customer:', error);
        alert(`Failed to delete customer: ${error instanceof Error ? error.message : 'Please try again.'}`);
      }
    }
  };

  const refreshCustomers = async () => {
    try {
      const customersResponse = await apiClient.getSalesCustomers({ limit: 20 });
      if (customersResponse.success) {
        setCustomers(customersResponse.data.customers);
      }
    } catch (error) {
      console.error('Failed to refresh customers:', error);
    }
  };

  const refreshDashboardData = async () => {
    try {
      const [dashboardResponse, trendsResponse, ordersResponse] = await Promise.all([
        apiClient.getSalesDashboard(),
        apiClient.getQuotationTrends(),
        apiClient.getSalesOrders({ limit: 50 })
      ]);
      
      if (dashboardResponse.success) {
        setSalesData(dashboardResponse.data);
      }
      
      if (trendsResponse.success) {
        setQuotationTrends(trendsResponse.data.trends);
      }

      if (ordersResponse.success) {
        setSalesOrders(ordersResponse.data.orders || []);
      }
    } catch (error) {
      console.error('Failed to refresh dashboard data:', error);
    }
  };

  const handleUpdateDeliveryStatus = async (orderId: string, status: string, deliveryDate?: string) => {
    console.log('🚀 FRONTEND: Starting order status update');
    console.log('- Order ID:', orderId);
    console.log('- New Status:', status);
    console.log('- Should trigger inventory reduction?', status === 'shipped');
    
    try {
      console.log('📡 FRONTEND: Making API call to updateDeliveryStatus...');
      const response = await apiClient.updateDeliveryStatus(orderId, {
        delivery_status: status,
        delivery_date: deliveryDate || new Date().toISOString().split('T')[0],
        delivery_notes: `Status updated to ${status}`
      });

      console.log('📡 FRONTEND: API response received:', response);

      if (response.success) {
        console.log('✅ FRONTEND: Order status updated successfully');
        
        if (response.data.auto_generated_invoice) {
          console.log('📄 FRONTEND: Auto-generated invoice detected:', response.data.auto_generated_invoice.invoice_number);
          alert(`Order status updated and invoice ${response.data.auto_generated_invoice.invoice_number} was automatically generated!`);
        } else {
          alert('Order delivery status updated successfully!');
        }
        
        // Refresh orders
        console.log('🔄 FRONTEND: Refreshing orders list...');
        const ordersResponse = await apiClient.getSalesOrders({ limit: 50 });
        if (ordersResponse.success) {
          setSalesOrders(ordersResponse.data.orders || []);
          console.log('✅ FRONTEND: Orders list refreshed');
        }
        
        setShowUpdateDeliveryStatus(false);
        setSelectedOrder(null);
      } else {
        console.error('❌ FRONTEND: API call failed:', response);
        alert('Failed to update delivery status');
      }
    } catch (error) {
      console.error('❌ FRONTEND: Exception during status update:', error);
      alert('Failed to update delivery status');
    }
  };

  // Export customers to Excel
  const exportToExcel = async () => {
    try {
      const XLSX = await loadXLSX();
      
      // Prepare data for export - ALL customer fields
      const exportData = filteredCustomers.map(customer => ({
        'Customer Name': customer.name,
        'Email': customer.email || 'N/A',
        'Phone': customer.phone || 'N/A',
        'FAX': customer.fax || 'N/A',
        'Contact Person': customer.contact_person || 'N/A',
        'Address': customer.address || 'N/A',
        'City': customer.city || 'N/A',
        'State': customer.state || 'N/A',
        'Country': customer.country || 'N/A',
        'Postal Code': customer.postal_code || 'N/A',
        'Credit Limit': customer.credit_limit ? `Rs. ${customer.credit_limit.toLocaleString()}` : 'N/A',
        'Payment Terms (Days)': customer.payment_terms || 'N/A',
        'Total Quotes Value': `Rs. ${(customer.totalQuotes || 0).toLocaleString()}`,
        'Number of Quotes': customer.quotesCount || 0,
        'Status': customer.status
      }));

      // Create workbook and worksheet
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Customers');

      // Set column widths
      const wscols = [
        { wch: 30 }, // Customer Name
        { wch: 20 }, // Customer Ref No
        { wch: 20 }, // Customer Type
        { wch: 30 }, // Email
        { wch: 15 }, // Phone
        { wch: 15 }, // FAX
        { wch: 35 }, // Website
        { wch: 25 }, // Contact Person
        { wch: 20 }, // Designation
        { wch: 20 }, // Department
        { wch: 40 }, // Address
        { wch: 15 }, // City
        { wch: 15 }, // State
        { wch: 15 }, // Country
        { wch: 12 }, // Postal Code
        { wch: 20 }, // GST/Tax Number
        { wch: 18 }, // Credit Limit
        { wch: 18 }, // Payment Terms
        { wch: 18 }, // Total Quotes Value
        { wch: 15 }, // Number of Quotes
        { wch: 10 }, // Status
        { wch: 50 }  // Notes
      ];
      ws['!cols'] = wscols;

      // Generate filename with current date
      const filename = `Customers_Export_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      // Save file
      XLSX.writeFile(wb, filename);
      alert('Customers exported to Excel successfully!');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Failed to export customers to Excel. Please try again.');
    }
  };

  // Export customers to PDF
  const exportToPDF = async () => {
    try {
      const jsPDF = await loadJsPDF();
      if (!jsPDF) {
        alert('PDF library failed to load. Please try again.');
        return;
      }

      // Create A4 portrait document
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      // Add company name
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('Anoosh International', pageWidth / 2, 15, { align: 'center' });
      
      // Add title
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Customer List', pageWidth / 2, 25, { align: 'center' });
      
      // Add export date
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const exportDate = new Date().toLocaleDateString('en-GB', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      });
      doc.text(`Export Date: ${exportDate}`, pageWidth / 2, 32, { align: 'center' });
      
      // Prepare table data
      const tableData = filteredCustomers.map(customer => [
        customer.name,
        customer.email || 'N/A',
        customer.phone || 'N/A',
        customer.contact_person || 'N/A',
        customer.city || 'N/A',
        customer.state || 'N/A',
        customer.credit_limit ? `Rs. ${customer.credit_limit.toLocaleString()}` : 'N/A',
        customer.payment_terms ? `${customer.payment_terms}` : 'N/A',
        `Rs. ${(customer.totalQuotes || 0).toLocaleString()}`,
        customer.status
      ]);

      // Add table using autoTable with proper borders
      const startY = 40;
      const headers = [['Name', 'Email', 'Phone', 'Contact', 'City', 'State', 'Credit Limit', 'Payment Terms', 'Total Quotes', 'Status']];
      
      // Check if autoTable is available (jspdf-autotable plugin)
      if (typeof (doc as any).autoTable === 'function') {
        (doc as any).autoTable({
          startY: startY,
          head: headers,
          body: tableData,
          theme: 'grid',
          styles: {
            fontSize: 8,
            cellPadding: 2.5,
            lineColor: [44, 62, 80],  // Dark gray for borders
            lineWidth: 0.5,            // Increased from 0.1 to 0.5 for visible borders
            valign: 'middle'
          },
          headStyles: { 
            fillColor: [59, 130, 246],
            textColor: [255, 255, 255],
            fontSize: 9,
            fontStyle: 'bold',
            halign: 'center',
            lineColor: [44, 62, 80],   // Dark gray for header borders
            lineWidth: 0.75            // Thicker borders for header
          },
          bodyStyles: { 
            fontSize: 7,
            textColor: [0, 0, 0],
            lineColor: [44, 62, 80],   // Dark gray for body borders
            lineWidth: 0.5             // Visible borders for all cells
          },
          alternateRowStyles: { 
            fillColor: [245, 247, 250]
          },
          columnStyles: {
            0: { cellWidth: 22, halign: 'left' },    // Name
            1: { cellWidth: 32, halign: 'left' },    // Email
            2: { cellWidth: 18, halign: 'left' },    // Phone
            3: { cellWidth: 20, halign: 'left' },    // Contact
            4: { cellWidth: 16, halign: 'left' },    // City
            5: { cellWidth: 16, halign: 'left' },    // State
            6: { cellWidth: 18, halign: 'right' },   // Credit Limit
            7: { cellWidth: 12, halign: 'center' },  // Payment Terms
            8: { cellWidth: 20, halign: 'right' },   // Total Quotes
            9: { cellWidth: 12, halign: 'center' }   // Status
          },
          margin: { left: 10, right: 10, top: 40, bottom: 10 },
          tableLineColor: [44, 62, 80],
          tableLineWidth: 0.75
        });
        
        // Add footer with page numbers
        const pageCount = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          doc.text(
            `Page ${i} of ${pageCount}`,
            pageWidth / 2,
            pageHeight - 10,
            { align: 'center' }
          );
        }
      } else {
        // Manual table rendering as fallback
        doc.setFontSize(6);
        let y = startY;
        const lineHeight = 5;
        const colWidths = [22, 32, 18, 20, 16, 16, 18, 12, 20, 12];
        let x = 10;

        // Draw headers
        doc.setFont('helvetica', 'bold');
        headers[0].forEach((header, i) => {
          doc.text(header, x, y);
          x += colWidths[i];
        });
        y += lineHeight;

        // Draw data
        doc.setFont('helvetica', 'normal');
        tableData.forEach(row => {
          if (y > pageHeight - 20) {
            doc.addPage();
            y = 40;
            
            // Redraw headers on new page
            doc.setFont('helvetica', 'bold');
            let headerX = 10;
            headers[0].forEach((header, i) => {
              doc.text(header, headerX, y);
              headerX += colWidths[i];
            });
            y += lineHeight;
            doc.setFont('helvetica', 'normal');
          }
          x = 10;
          row.forEach((cell, i) => {
            doc.text(String(cell).substring(0, 20), x, y); // Truncate long text
            x += colWidths[i];
          });
          y += lineHeight;
        });
        
        // Add footer with page numbers for manual rendering
        const totalPages = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
          doc.setPage(i);
          doc.setFontSize(8);
          doc.text(
            `Page ${i} of ${totalPages}`,
            pageWidth / 2,
            pageHeight - 10,
            { align: 'center' }
          );
        }
      }

      // Generate filename with current date
      const filename = `Customers_Export_${new Date().toISOString().split('T')[0]}.pdf`;
      
      // Save file
      doc.save(filename);
      alert('Customers exported to PDF successfully!');
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      alert('Failed to export customers to PDF. Please try again.');
    }
  };
  
  // Error state
  if (error) {
    return (
      <AppLayout>
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error loading sales data</h3>
                <p className="mt-1 text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
      <div className="mb-8"></div>
        {/* KPI Widgets */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Pending Quotations */}
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-md font-medium text-gray-600">Pending Quotations</p>
                <p className="text-4xl font-bold text-gray-900">
                  {salesData?.pendingQuotations ?? (
                    <span className="inline-block w-8 h-8 bg-gray-200 rounded animate-pulse"></span>
                  )}
                </p>
              </div> 
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Top Customers */}
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-md font-medium text-gray-600">Top Customers</p>
                <p className="text-4xl font-bold text-gray-900">
                  {salesData?.topCustomers?.length ?? (
                    <span className="inline-block w-8 h-8 bg-gray-200 rounded animate-pulse"></span>
                  )}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Recent Inquiries */}
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-md font-medium text-gray-600">Recent Inquiries</p>
                <p className="text-4xl font-bold text-gray-900">
                  {salesData?.recentInquiries ?? (
                    <span className="inline-block w-8 h-8 bg-gray-200 rounded animate-pulse"></span>
                  )}
                </p>
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

        {/* RFQ & Sales Workflow Actions */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            RFQ & Quotation Management
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Step 1: Receive RFQ / Create Quotation */}
            <button
              onClick={() => setShowCreateQuotation(true)}
              className="flex flex-col items-center justify-center p-5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <svg className="w-6 h-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-sm font-medium text-center">Receive RFQ</span>
              <span className="text-xs opacity-90 mt-1">Create Quotation</span>
            </button>

            {/* Step 2: Manage Quotations */}
            <button
              onClick={() => setShowSearchQuotations(true)}
              className="flex flex-col items-center justify-center p-5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <svg className="w-6 h-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span className="text-sm font-medium text-center">Manage Quotations</span>
              <span className="text-xs opacity-90 mt-1">Search & Edit</span>
            </button>

            {/* Step 3: Convert to Order */}
            <button
              onClick={() => setShowConvertQuote(true)}
              className="flex flex-col items-center justify-center p-5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <svg className="w-6 h-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <span className="text-sm font-medium text-center">Convert to Order</span>
              <span className="text-xs opacity-90 mt-1">Order Received</span>
            </button>

            {/* Step 4: Manage Orders & Delivery */}
            <button
              onClick={() => setShowOrderManagement(true)}
              className="flex flex-col items-center justify-center p-5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <svg className="w-6 h-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <span className="text-sm font-medium text-center">Track Orders</span>
              <span className="text-xs opacity-90 mt-1">Delivery & Invoice</span>
            </button>

            {/* Step 5: Customer Management */}
            <button
              onClick={() => setShowAddCustomer(true)}
              className="flex flex-col items-center justify-center p-5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <svg className="w-6 h-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              <span className="text-sm font-medium text-center">Add Customer</span>
              <span className="text-xs opacity-90 mt-1">New Customer</span>
            </button>
          </div>
        </div>

        {/* Customers List */}
        <div className="bg-white rounded-lg shadow-md mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Customers</h3>
              <div className="flex items-center space-x-4">
                {/* Export Buttons */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={exportToExcel}
                    className="flex items-center px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors duration-200 shadow-sm"
                    title="Export to Excel"
                  >
                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Excel
                  </button>
                  <button
                    onClick={exportToPDF}
                    className="flex items-center px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors duration-200 shadow-sm"
                    title="Export to PDF"
                  >
                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    PDF
                  </button>
                </div>

                {/* View Mode Toggles */}
                <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setCustomersViewMode('list')}
                    className={`p-2 rounded-md transition-colors duration-200 ${
                      customersViewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                    }`}
                    title="List View"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setCustomersViewMode('grid')}
                    className={`p-2 rounded-md transition-colors duration-200 ${
                      customersViewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                    }`}
                    title="Grid View"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                  </button>
                </div>
                
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search customers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {customersViewMode === 'list' ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Quotes</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {dataLoading.customers ? (
                    // Skeleton rows while loading
                    Array.from({ length: 5 }).map((_, index) => (
                      <tr key={`skeleton-${index}`} className="animate-pulse">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-48"></div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-32"></div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="h-6 bg-gray-200 rounded-full w-20"></div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="h-4 bg-gray-200 rounded w-16 mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-12"></div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="h-6 bg-gray-200 rounded-full w-16"></div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-3">
                            <div className="h-8 w-8 bg-gray-200 rounded"></div>
                            <div className="h-8 w-8 bg-gray-200 rounded"></div>
                            <div className="h-8 w-8 bg-gray-200 rounded"></div>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <div className="text-gray-500">
                          <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          <p className="text-lg">No customers found</p>
                          <p className="text-sm">Try adjusting your search criteria</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers.map((customer) => (
                      <tr key={customer.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <p className="font-medium text-gray-900">{customer.name}</p>
                            <p className="text-sm text-gray-500">{customer.email}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <p className="text-sm text-gray-900">{customer.contact_person || 'N/A'}</p>
                            <p className="text-sm text-gray-500">{customer.phone}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <p className="text-sm text-gray-900">{customer.city || 'N/A'}</p>
                            <p className="text-sm text-gray-500">{customer.state || 'N/A'}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <p className="text-sm font-medium text-gray-900">Rs. {(customer.totalQuotes || 0).toLocaleString()}</p>
                            <p className="text-xs text-gray-500">{customer.quotesCount || 0} quotes</p>
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
                          <div className="flex items-center space-x-3">
                            <button 
                              onClick={() => handleEditCustomer(customer)}
                              className="text-blue-600 hover:text-blue-700 p-1 rounded hover:bg-blue-50 transition-colors duration-200"
                              title="Edit Customer"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button 
                              onClick={() => handleViewQuotes(customer)}
                              className="text-green-600 hover:text-green-700 p-1 rounded hover:bg-green-50 transition-colors duration-200"
                              title="View Quotes"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                            <button 
                              onClick={() => handleDeleteCustomer(customer)}
                              className="text-red-600 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors duration-200"
                              title="Delete Customer"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6">
              {dataLoading.customers ? (
                // Skeleton grid while loading
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div key={`grid-skeleton-${index}`} className="border border-gray-200 rounded-xl p-6 animate-pulse">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="h-5 bg-gray-200 rounded w-32 mb-2"></div>
                          <div className="h-4 bg-gray-200 rounded w-48"></div>
                        </div>
                        <div className="h-6 bg-gray-200 rounded-full w-16"></div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <div className="h-4 bg-gray-200 rounded w-20"></div>
                          <div className="h-4 bg-gray-200 rounded w-24"></div>
                        </div>
                        <div className="flex justify-between">
                          <div className="h-4 bg-gray-200 rounded w-16"></div>
                          <div className="h-4 bg-gray-200 rounded w-20"></div>
                        </div>
                      </div>
                      <div className="flex space-x-2 mt-4">
                        <div className="h-8 bg-gray-200 rounded flex-1"></div>
                        <div className="h-8 bg-gray-200 rounded flex-1"></div>
                        <div className="h-8 bg-gray-200 rounded flex-1"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredCustomers.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No customers found</h3>
                  <p className="text-gray-500">Try adjusting your search criteria</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredCustomers.map((customer) => (
                    <div 
                      key={customer.id} 
                      className="border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-200 bg-white"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h4 className="text-lg font-bold text-gray-900">{customer.name}</h4>
                          <p className="text-gray-600 text-sm">{customer.email}</p>
                          {customer.contact_person && (
                            <p className="text-gray-500 text-xs">{customer.contact_person}</p>
                          )}
                        </div>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          customer.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {customer.status}
                        </span>
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Phone:</span>
                          <span className="text-gray-900">{customer.phone || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Total Quotes:</span>
                          <span className="text-gray-900 font-medium">Rs. {(customer.totalQuotes || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Quotes Count:</span>
                          <span className="text-gray-900">{customer.quotesCount || 0}</span>
                        </div>
                      </div>

                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEditCustomer(customer)}
                          className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 text-sm flex items-center justify-center"
                          title="Edit Customer"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit
                        </button>
                        <button
                          onClick={() => handleViewQuotes(customer)}
                          className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 text-sm flex items-center justify-center"
                          title="View Quotes"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          View
                        </button>
                        <button
                          onClick={() => handleDeleteCustomer(customer)}
                          className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 text-sm flex items-center justify-center"
                          title="Delete Customer"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Analytics Action Buttons */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Analytics & Reports</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => setShowQuotationTrends(true)}
              className="flex items-center justify-center p-6 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <svg className="w-8 h-8 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <div className="text-left">
                <h4 className="text-lg font-semibold">Quotation Trends</h4>
                <p className="text-slate-200 text-sm">View 6-month performance</p>
              </div>
            </button>

            <button
              onClick={() => setShowTopCustomers(true)}
              className="flex items-center justify-center p-6 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <svg className="w-8 h-8 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <div className="text-left">
                <h4 className="text-lg font-semibold">Top Customers</h4>
                <p className="text-gray-200 text-sm">View customer rankings</p>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showAddCustomer && (
        <AddCustomerModal
          isOpen={showAddCustomer}
          onClose={() => setShowAddCustomer(false)}
          onCustomerAdded={() => {
            refreshCustomers();
          }}
        />
      )}

      <CreateQuotationModal 
        isOpen={showCreateQuotation} 
        onClose={() => setShowCreateQuotation(false)}
        onQuotationCreated={() => {
          refreshDashboardData();
          refreshCustomers();
        }}
      />
      
      <ConvertQuoteModal 
        isOpen={showConvertQuote} 
        onClose={() => setShowConvertQuote(false)}
        onOrderCreated={() => {
        }}
      />
      
      <SearchQuotationsModal 
        isOpen={showSearchQuotations} 
        onClose={() => setShowSearchQuotations(false)} 
      />

      <EditCustomerModal
        isOpen={showEditCustomer}
        onClose={() => {
          setShowEditCustomer(false);
          setSelectedCustomer(null);
        }}
        onCustomerUpdated={() => {
          refreshCustomers();
          setShowEditCustomer(false);
          setSelectedCustomer(null);
        }}
        customer={selectedCustomer}
      />

      <ViewCustomerQuotesModal
        isOpen={showViewQuotes}
        onClose={() => {
          setShowViewQuotes(false);
          setSelectedCustomer(null);
        }}
        customer={selectedCustomer}
      />

      <QuotationTrendsModal
        isOpen={showQuotationTrends}
        onClose={() => setShowQuotationTrends(false)}
        trends={quotationTrends}
      />

      <TopCustomersModal
        isOpen={showTopCustomers}
        onClose={() => setShowTopCustomers(false)}
        customers={salesData?.topCustomers || []}
      />

      {/* Order Management Modal */}
      {showOrderManagement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-7xl w-full max-h-[95vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-white px-4 py-3 border-b border-gray-200 flex-shrink-0 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Sales Orders Management</h2>
                <button
                  onClick={() => setShowOrderManagement(false)}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Search and View Toggle */}
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex-shrink-0">
              <div className="flex items-center justify-between gap-3">
                {/* Search Bar */}
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder="Search by order number, customer..."
                    value={orderSearchTerm}
                    onChange={(e) => setOrderSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <svg
                    className="absolute left-3 top-2.5 w-4 h-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>

                {/* View Toggle */}
                <div className="flex items-center gap-1 bg-white border border-gray-300 rounded-lg p-1">
                  <button
                    onClick={() => setOrderViewMode('grid')}
                    className={`p-1.5 rounded transition-colors ${
                      orderViewMode === 'grid'
                        ? 'bg-blue-100 text-blue-600'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                    title="Grid View"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setOrderViewMode('list')}
                    className={`p-1.5 rounded transition-colors ${
                      orderViewMode === 'list'
                        ? 'bg-blue-100 text-blue-600'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                    title="List View"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {dataLoading.orders ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-xs text-gray-500 mt-2">Loading orders...</p>
                </div>
              ) : salesOrders.filter(order => 
                  order.order_number.toLowerCase().includes(orderSearchTerm.toLowerCase()) ||
                  order.customers?.name.toLowerCase().includes(orderSearchTerm.toLowerCase())
                ).length === 0 ? (
                <div className="text-center py-8">
                  <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <h3 className="text-sm font-medium text-gray-900 mb-1">No Sales Orders Found</h3>
                  <p className="text-xs text-gray-500">{orderSearchTerm ? 'Try a different search term' : 'Convert some quotations to orders to see them here'}</p>
                </div>
              ) : orderViewMode === 'grid' ? (
                // Grid View
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {salesOrders
                    .filter(order => 
                      order.order_number.toLowerCase().includes(orderSearchTerm.toLowerCase()) ||
                      order.customers?.name.toLowerCase().includes(orderSearchTerm.toLowerCase())
                    )
                    .map((order) => (
                    <div
                      key={order.id}
                      className="border border-gray-200 rounded-lg p-3 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer bg-white"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-blue-600 truncate">{order.order_number}</p>
                          <p className="text-xs text-gray-500 truncate">{order.customers?.name || 'Unknown'}</p>
                        </div>
                        <span className={`ml-2 flex-shrink-0 inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                          order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                          order.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                          order.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                          order.status === 'pending' ? 'bg-gray-100 text-gray-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {order.status}
                        </span>
                      </div>

                      <div className="text-right mb-2">
                        <p className="text-lg font-bold text-gray-900">Rs. {order.total_amount.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">Total Amount</p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                        <div>
                          <p className="text-gray-500">Order Date</p>
                          <p className="text-gray-900 font-medium truncate">{new Date(order.order_date).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Delivery</p>
                          <p className="text-gray-900 font-medium truncate">
                            {order.expected_delivery_date ? new Date(order.expected_delivery_date).toLocaleDateString() : 'Not set'}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedOrder(order);
                          setShowUpdateDeliveryStatus(true);
                        }}
                        className="w-full px-2 py-1.5 text-xs bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-medium"
                      >
                        Update Status
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                // List View
                <div className="space-y-2">
                  {salesOrders
                    .filter(order => 
                      order.order_number.toLowerCase().includes(orderSearchTerm.toLowerCase()) ||
                      order.customers?.name.toLowerCase().includes(orderSearchTerm.toLowerCase())
                    )
                    .map((order) => (
                    <div
                      key={order.id}
                      className="border border-gray-200 rounded-lg p-3 hover:shadow-md hover:border-blue-300 transition-all bg-white"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0 grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div>
                            <p className="text-xs text-gray-500">Order Number</p>
                            <p className="text-sm font-semibold text-blue-600 truncate">{order.order_number}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Customer</p>
                            <p className="text-sm text-gray-900 truncate">{order.customers?.name || 'Unknown'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Order Date</p>
                            <p className="text-sm text-gray-900">{new Date(order.order_date).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Amount</p>
                            <p className="text-sm font-bold text-gray-900">Rs. {order.total_amount.toLocaleString()}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                            order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                            order.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                            order.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                            order.status === 'pending' ? 'bg-gray-100 text-gray-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {order.status}
                          </span>
                          <button
                            onClick={() => {
                              setSelectedOrder(order);
                              setShowUpdateDeliveryStatus(true);
                            }}
                            className="px-3 py-1.5 text-xs bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-medium"
                          >
                            Update
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Update Delivery Status Modal */}
      {showUpdateDeliveryStatus && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 rounded-t-2xl bg-white">
              <h2 className="text-sm font-semibold text-gray-900">Update Delivery Status</h2>
              <button
                onClick={() => {
                  setShowUpdateDeliveryStatus(false);
                  setSelectedOrder(null);
                }}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4">
              <div className="mb-3 bg-gray-50 rounded-lg p-3">
                <h3 className="text-sm font-medium text-gray-900">{selectedOrder.order_number}</h3>
                <p className="text-xs text-gray-500">{selectedOrder.customers?.name}</p>
                <p className="text-xs text-gray-500 mt-1">Current: <span className="font-medium text-gray-900">{selectedOrder.status}</span></p>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => handleUpdateDeliveryStatus(selectedOrder.id, 'processing')}
                  className="w-full p-2 text-left border border-gray-200 rounded-lg hover:bg-yellow-50 hover:border-yellow-300 transition-colors"
                >
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Processing</p>
                      <p className="text-xs text-gray-500">Order is being prepared</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => handleUpdateDeliveryStatus(selectedOrder.id, 'shipped')}
                  className="w-full p-2 text-left border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Shipped</p>
                      <p className="text-xs text-gray-500">Order has been dispatched</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => handleUpdateDeliveryStatus(selectedOrder.id, 'delivered')}
                  className="w-full p-2 text-left border border-gray-200 rounded-lg hover:bg-green-50 hover:border-green-300 transition-colors"
                >
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Delivered</p>
                      <p className="text-xs text-gray-500">Order delivered (auto-generates invoice)</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => handleUpdateDeliveryStatus(selectedOrder.id, 'cancelled')}
                  className="w-full p-2 text-left border border-gray-200 rounded-lg hover:bg-red-50 hover:border-red-300 transition-colors"
                >
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Cancel Order</p>
                      <p className="text-xs text-gray-500">Mark order as cancelled</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => {
                  setShowUpdateDeliveryStatus(false);
                  setSelectedOrder(null);
                }}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
