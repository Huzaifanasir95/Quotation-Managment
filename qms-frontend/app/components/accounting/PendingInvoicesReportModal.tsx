'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '../../lib/api';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';


interface PendingInvoicesReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}


interface TransformedInvoice {
  id: string;
  party: string; // customer or vendor
  amount: number;
  dueDate: string;
  status: string;
  daysOverdue: number;
  fbrSync: string;
  lastReminder: string;
  notes: string;
}


export default function PendingInvoicesReportModal({ isOpen, onClose }: PendingInvoicesReportModalProps) {
  // Tab state: 'receivable' (customer invoices) or 'payable' (vendor bills)
  const [activeTab, setActiveTab] = useState<'receivable' | 'payable'>('receivable');
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    party: 'All', // customer or vendor
    status: 'All',
    amountRange: 'All'
  });
  const [isExporting, setIsExporting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'line'>('grid');
  const [invoices, setInvoices] = useState<TransformedInvoice[]>([]);
  const [parties, setParties] = useState<string[]>(['All']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const statuses = ['All', 'pending', 'paid', 'overdue', 'cancelled'];
  const amountRanges = ['All', 'Under Rs. 1000', 'Rs. 1000-Rs. 5000', 'Over Rs. 5000'];

  // Fetch invoices and parties data
  useEffect(() => {
    if (isOpen) {
      fetchInvoicesData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, activeTab]);

  const fetchInvoicesData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      let response;
      if (activeTab === 'receivable') {
        // Fetch customer invoices (money owed by customers)
        response = await apiClient.getReceivableInvoices({ 
          limit: 100, 
          status: undefined // Don't filter by status initially, we'll handle all non-paid invoices
        });
      } else {
        // Fetch vendor bills (money we owe to vendors)  
        response = await apiClient.getPayableInvoices({ 
          limit: 100, 
          status: undefined // Don't filter by status initially, we'll handle all non-paid bills
        });
      }
      
      if (response.success) {
        const invoicesData = activeTab === 'receivable' ? 
          response.data.invoices : response.data.vendorBills;
        
        const transformedInvoices: TransformedInvoice[] = invoicesData?.map((invoice: any) => {
          const today = new Date();
          const dueDate = new Date(invoice.due_date);
          const daysOverdue = Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));
          
          // Determine status based on payment and due date
          let status = 'Due Soon';
          if (invoice.status === 'paid') {
            status = 'Paid';
          } else if (daysOverdue > 0) {
            status = 'Overdue';
          } else if (invoice.status === 'cancelled') {
            status = 'Cancelled';
          }

          // Calculate remaining amount
          const remainingAmount = (invoice.total_amount || 0) - (invoice.paid_amount || 0);
          
          return {
            id: invoice.invoice_number || invoice.bill_number || invoice.id,
            party: activeTab === 'receivable' ? 
              (invoice.customers?.name || 'Unknown Customer') : 
              (invoice.vendors?.name || 'Unknown Vendor'),
            amount: remainingAmount,
            dueDate: invoice.due_date,
            status: status,
            daysOverdue: daysOverdue,
            fbrSync: invoice.fbr_sync_status === 'synced' ? 'Synced' : 
                     invoice.fbr_sync_status === 'pending' ? 'Pending' : 
                     invoice.fbr_sync_status === 'failed' ? 'Failed' : 'N/A',
            lastReminder: invoice.last_reminder_date || 'N/A',
            notes: invoice.notes || 'No notes'
          };
        })?.filter((inv: TransformedInvoice) => inv.status !== 'Paid' && inv.status !== 'Cancelled' && inv.amount > 0) || [];
        
        setInvoices(transformedInvoices);
        
        // Extract unique parties
        const uniqueParties = Array.from(new Set(transformedInvoices.map(inv => inv.party)));
        setParties(['All', ...uniqueParties]);
      } else {
        setError('Failed to fetch invoices');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch data');
      console.error('Error fetching invoices:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesDateFrom = !filters.dateFrom || invoice.dueDate >= filters.dateFrom;
    const matchesDateTo = !filters.dateTo || invoice.dueDate <= filters.dateTo;
    const matchesParty = filters.party === 'All' || invoice.party === filters.party;
    const matchesStatus = filters.status === 'All' || invoice.status === filters.status;
    let matchesAmount = true;
    if (filters.amountRange === 'Under Rs. 1000') matchesAmount = invoice.amount < 1000;
    else if (filters.amountRange === 'Rs. 1000-Rs. 5000') matchesAmount = invoice.amount >= 1000 && invoice.amount <= 5000;
    else if (filters.amountRange === 'Over Rs. 5000') matchesAmount = invoice.amount > 5000;
    return matchesDateFrom && matchesDateTo && matchesParty && matchesStatus && matchesAmount;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Overdue': return 'bg-red-100 text-red-800';
      case 'Due Soon': return 'bg-yellow-100 text-yellow-800';
      case 'Paid': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getFBRStatusColor = (status: string) => {
    switch (status) {
      case 'Synced': return 'bg-green-100 text-green-800';
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      case 'Failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getFBRStatusIcon = (status: string) => {
    switch (status) {
      case 'Synced': return '✔';
      case 'Pending': return '⏳';
      case 'Failed': return '❌';
      default: return '⚠️';
    }
  };

  const exportReport = async (format: 'csv' | 'excel' | 'pdf') => {
    setIsExporting(true);
    
    try {
      const timestamp = new Date().toISOString().split('T')[0];
      const reportTitle = `${activeTab === 'receivable' ? 'Receivable' : 'Payable'} Invoices Report`;
      const filename = `pending_${activeTab}_invoices_${timestamp}`;

      if (format === 'csv') {
        // Enhanced CSV export with proper formatting
        const csvData = filteredInvoices.map(invoice => ({
          'Invoice ID': invoice.id,
          [activeTab === 'receivable' ? 'Customer' : 'Vendor']: invoice.party,
          'Amount (PKR)': invoice.amount.toLocaleString(),
          'Due Date': invoice.dueDate,
          'Status': invoice.status,
          'Days Overdue': invoice.daysOverdue > 0 ? invoice.daysOverdue : 0,
          'FBR Sync Status': invoice.fbrSync,
          'Last Reminder': invoice.lastReminder,
          'Notes': invoice.notes.replace(/,/g, ';') // Replace commas to avoid CSV issues
        }));

        const csv = Papa.unparse(csvData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } 
      else if (format === 'excel') {
        // Enhanced Excel export with formatting and summary
        const workbook = XLSX.utils.book_new();
        
        // Create summary data
        const summaryData = [
          ['Pending Invoices Report Summary', ''],
          ['Report Type:', activeTab === 'receivable' ? 'Receivable Invoices' : 'Payable Invoices'],
          ['Generated Date:', new Date().toLocaleDateString()],
          ['Total Invoices:', filteredInvoices.length],
          ['Total Amount:', `PKR ${totalPendingAmount.toLocaleString()}`],
          ['Overdue Invoices:', overdueInvoices.length],
          ['Overdue Amount:', `PKR ${totalOverdueAmount.toLocaleString()}`],
          ['', ''], // Empty row
          ['Filters Applied:', ''],
          ['Date From:', filters.dateFrom || 'Not Set'],
          ['Date To:', filters.dateTo || 'Not Set'],
          ['Party Filter:', filters.party],
          ['Status Filter:', filters.status],
          ['Amount Range:', filters.amountRange],
          ['', ''] // Empty row before data
        ];

        // Create main data
        const mainData = [
          ['Invoice ID', activeTab === 'receivable' ? 'Customer' : 'Vendor', 'Amount (PKR)', 'Due Date', 'Status', 'Days Overdue', 'FBR Sync Status', 'Last Reminder', 'Notes'],
          ...filteredInvoices.map(invoice => [
            invoice.id,
            invoice.party,
            invoice.amount,
            invoice.dueDate,
            invoice.status,
            invoice.daysOverdue > 0 ? invoice.daysOverdue : 0,
            invoice.fbrSync,
            invoice.lastReminder,
            invoice.notes
          ])
        ];

        // Create summary worksheet
        const summaryWS = XLSX.utils.aoa_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(workbook, summaryWS, 'Summary');

        // Create main data worksheet
        const dataWS = XLSX.utils.aoa_to_sheet(mainData);
        XLSX.utils.book_append_sheet(workbook, dataWS, 'Invoices Data');

        // Set column widths for better readability
        const wscols = [
          { width: 15 }, // Invoice ID
          { width: 25 }, // Party
          { width: 15 }, // Amount
          { width: 12 }, // Due Date
          { width: 12 }, // Status
          { width: 15 }, // Days Overdue
          { width: 15 }, // FBR Sync
          { width: 15 }, // Last Reminder
          { width: 30 }  // Notes
        ];
        dataWS['!cols'] = wscols;

        // Write Excel file
        XLSX.writeFile(workbook, `${filename}.xlsx`);
      } 
      else if (format === 'pdf') {
        // Enhanced PDF export with proper formatting
        const pdf = new jsPDF();
        const pageWidth = pdf.internal.pageSize.width;
        const margin = 20;
        let yPosition = margin;

        // Add title
        pdf.setFontSize(18);
        pdf.setFont('helvetica', 'bold');
        pdf.text(reportTitle, pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 15;

        // Add metadata
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, margin, yPosition);
        yPosition += 8;
        pdf.text(`Total Invoices: ${filteredInvoices.length} | Total Amount: PKR ${totalPendingAmount.toLocaleString()}`, margin, yPosition);
        yPosition += 8;
        pdf.text(`Overdue: ${overdueInvoices.length} invoices | Overdue Amount: PKR ${totalOverdueAmount.toLocaleString()}`, margin, yPosition);
        yPosition += 15;

        // Add filters info if applied
        const appliedFilters = [];
        if (filters.dateFrom) appliedFilters.push(`Date From: ${filters.dateFrom}`);
        if (filters.dateTo) appliedFilters.push(`Date To: ${filters.dateTo}`);
        if (filters.party !== 'All') appliedFilters.push(`Party: ${filters.party}`);
        if (filters.status !== 'All') appliedFilters.push(`Status: ${filters.status}`);
        if (filters.amountRange !== 'All') appliedFilters.push(`Amount: ${filters.amountRange}`);

        if (appliedFilters.length > 0) {
          pdf.setFontSize(9);
          pdf.text('Applied Filters: ' + appliedFilters.join(', '), margin, yPosition);
          yPosition += 12;
        }

        // Add table header
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'bold');
        const headers = ['ID', 'Party', 'Amount', 'Due Date', 'Status', 'Overdue'];
        const colWidths = [25, 40, 25, 25, 20, 20];
        let xPosition = margin;
        
        headers.forEach((header, index) => {
          pdf.text(header, xPosition, yPosition);
          xPosition += colWidths[index];
        });
        yPosition += 8;

        // Add line separator
        pdf.line(margin, yPosition, pageWidth - margin, yPosition);
        yPosition += 5;

        // Add table data
        pdf.setFont('helvetica', 'normal');
        filteredInvoices.slice(0, 30).forEach((invoice, index) => { // Limit to first 30 items for PDF
          if (yPosition > 270) { // Start new page if needed
            pdf.addPage();
            yPosition = margin;
            
            // Re-add headers on new page
            pdf.setFont('helvetica', 'bold');
            xPosition = margin;
            headers.forEach((header, index) => {
              pdf.text(header, xPosition, yPosition);
              xPosition += colWidths[index];
            });
            yPosition += 8;
            pdf.line(margin, yPosition, pageWidth - margin, yPosition);
            yPosition += 5;
            pdf.setFont('helvetica', 'normal');
          }

          xPosition = margin;
          const rowData = [
            invoice.id.substring(0, 10), // Truncate long IDs
            invoice.party.substring(0, 15), // Truncate long names
            `${invoice.amount.toLocaleString()}`,
            invoice.dueDate,
            invoice.status,
            invoice.daysOverdue > 0 ? `${invoice.daysOverdue}d` : 'On time'
          ];

          rowData.forEach((data, colIndex) => {
            pdf.text(data.toString(), xPosition, yPosition);
            xPosition += colWidths[colIndex];
          });
          yPosition += 6;
        });

        // Add footer note if data was truncated
        if (filteredInvoices.length > 30) {
          yPosition += 10;
          pdf.setFontSize(8);
          pdf.setFont('helvetica', 'italic');
          pdf.text(`Note: Only first 30 invoices shown. Total: ${filteredInvoices.length} invoices.`, margin, yPosition);
          pdf.text('For complete data, please use Excel export.', margin, yPosition + 6);
        }

        // Add page numbers
        const pageCount = pdf.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
          pdf.setPage(i);
          pdf.setFontSize(8);
          pdf.text(`Page ${i} of ${pageCount}`, pageWidth - 30, pdf.internal.pageSize.height - 10);
        }

        // Save PDF
        pdf.save(`${filename}.pdf`);
      }
      
      // Success message
      const exportMessages = {
        csv: 'CSV file downloaded successfully!',
        excel: 'Excel file downloaded successfully with summary and detailed data sheets!',
        pdf: 'PDF report generated successfully!'
      };
      
      alert(exportMessages[format]);
      
    } catch (error) {
      console.error('Export failed:', error);
      alert(`Failed to export ${format.toUpperCase()} report. Please try again.`);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const currentDate = new Date().toLocaleDateString();
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Pending Invoices Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
            .summary { display: flex; justify-content: space-around; margin: 20px 0; }
            .summary-item { text-align: center; }
            .summary-value { font-size: 18px; font-weight: bold; }
            .summary-label { font-size: 12px; color: #666; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            .overdue { color: #dc2626; font-weight: bold; }
            .due-soon { color: #f59e0b; }
            .footer { margin-top: 20px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Pending Invoices Report</h1>
            <h3>${activeTab === 'receivable' ? 'Receivable Invoices' : 'Payable Invoices'}</h3>
            <p>Generated on: ${currentDate}</p>
          </div>
          
          <div class="summary">
            <div class="summary-item">
              <div class="summary-value">${filteredInvoices.length}</div>
              <div class="summary-label">Total Invoices</div>
            </div>
            <div class="summary-item">
              <div class="summary-value">PKR ${totalPendingAmount.toLocaleString()}</div>
              <div class="summary-label">Total Amount</div>
            </div>
            <div class="summary-item">
              <div class="summary-value">${overdueInvoices.length}</div>
              <div class="summary-label">Overdue</div>
            </div>
            <div class="summary-item">
              <div class="summary-value">PKR ${totalOverdueAmount.toLocaleString()}</div>
              <div class="summary-label">Overdue Amount</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Invoice ID</th>
                <th>${activeTab === 'receivable' ? 'Customer' : 'Vendor'}</th>
                <th>Amount</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Days Overdue</th>
              </tr>
            </thead>
            <tbody>
              ${filteredInvoices.map(invoice => `
                <tr>
                  <td>${invoice.id}</td>
                  <td>${invoice.party}</td>
                  <td>PKR ${invoice.amount.toLocaleString()}</td>
                  <td>${invoice.dueDate}</td>
                  <td class="${invoice.status === 'Overdue' ? 'overdue' : invoice.status === 'Due Soon' ? 'due-soon' : ''}">${invoice.status}</td>
                  <td class="${invoice.daysOverdue > 0 ? 'overdue' : ''}">${invoice.daysOverdue > 0 ? `${invoice.daysOverdue} days` : 'On time'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">
            <p>Anoosh International - QMS Report</p>
            <p>This report contains ${filteredInvoices.length} pending invoices totaling PKR ${totalPendingAmount.toLocaleString()}</p>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const clearFilters = () => {
    setFilters({
      dateFrom: '',
      dateTo: '',
      party: 'All',
      status: 'All',
      amountRange: 'All'
    });
  };

  const totalPendingAmount = filteredInvoices.reduce((sum, invoice) => sum + invoice.amount, 0);
  const overdueInvoices = filteredInvoices.filter(invoice => invoice.status === 'Overdue');
  const totalOverdueAmount = overdueInvoices.reduce((sum, invoice) => sum + invoice.amount, 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Pending Invoices Report</h2>
            <p className="text-sm text-gray-600 mt-1">
              {filteredInvoices.length} {activeTab} invoice(s) • Total: PKR {totalPendingAmount.toLocaleString()}
              {overdueInvoices.length > 0 && (
                <span className="text-red-600 font-medium"> • {overdueInvoices.length} overdue</span>
              )}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {/* Quick Export Buttons */}
            <div className="hidden sm:flex space-x-2">
              <button
                onClick={() => exportReport('csv')}
                disabled={isExporting || filteredInvoices.length === 0}
                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Export CSV"
              >
                📋
              </button>
              <button
                onClick={() => exportReport('excel')}
                disabled={isExporting || filteredInvoices.length === 0}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Export Excel"
              >
                📊
              </button>
              <button
                onClick={() => exportReport('pdf')}
                disabled={isExporting || filteredInvoices.length === 0}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Export PDF"
              >
                📄
              </button>
              <button
                onClick={handlePrint}
                disabled={isExporting || filteredInvoices.length === 0}
                className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Print Report"
              >
                🖨️
              </button>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
          </div>
        </div>

        {/* Tabs for Receivable/Payable */}
        <div className="flex space-x-2 px-6 pt-4">
          <button
            className={`px-4 py-2 rounded-t-lg font-medium border-b-2 transition-colors duration-200 ${activeTab === 'receivable' ? 'border-blue-600 text-blue-700 bg-blue-50' : 'border-transparent text-gray-500 bg-gray-100 hover:text-blue-700'}`}
            onClick={() => setActiveTab('receivable')}
          >
            Receivable Invoices
          </button>
          <button
            className={`px-4 py-2 rounded-t-lg font-medium border-b-2 transition-colors duration-200 ${activeTab === 'payable' ? 'border-red-600 text-red-700 bg-red-50' : 'border-transparent text-gray-500 bg-gray-100 hover:text-red-700'}`}
            onClick={() => setActiveTab('payable')}
          >
            Payable Invoices
          </button>
        </div>

        <div className="p-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className={`${activeTab === 'receivable' ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'} border rounded-lg p-4 text-center`}>
              <div className={`text-2xl font-bold ${activeTab === 'receivable' ? 'text-blue-600' : 'text-red-600'}`}>{filteredInvoices.length}</div>
              <div className={`text-sm ${activeTab === 'receivable' ? 'text-blue-800' : 'text-red-800'}`}>{activeTab === 'receivable' ? 'Total Receivable' : 'Total Payable'}</div>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">{overdueInvoices.length}</div>
              <div className="text-sm text-yellow-800">Overdue</div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600">Rs. {totalPendingAmount.toLocaleString()}</div>
              <div className="text-sm text-green-800">Total Amount</div>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">Rs. {totalOverdueAmount.toLocaleString()}</div>
              <div className="text-sm text-orange-800">Overdue Amount</div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                <span className="mr-1">{showFilters ? '▼' : '▶'}</span>
                {showFilters ? 'Hide Filters' : 'Show Filters'}
              </button>
            </div>
            
            {showFilters && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date From</label>
                    <input
                      type="date"
                      value={filters.dateFrom}
                      onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                      className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date To</label>
                    <input
                      type="date"
                      value={filters.dateTo}
                      onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                      className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{activeTab === 'receivable' ? 'Customer' : 'Vendor'}</label>
                    <select
                      value={filters.party}
                      onChange={(e) => setFilters({ ...filters, party: e.target.value })}
                      className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {parties.map(party => (
                        <option key={party} value={party}>{party}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                    <select
                      value={filters.status}
                      onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                      className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {statuses.map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Amount Range</label>
                    <select
                      value={filters.amountRange}
                      onChange={(e) => setFilters({ ...filters, amountRange: e.target.value })}
                      className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {amountRanges.map(range => (
                        <option key={range} value={range}>{range}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    Found {filteredInvoices.length} invoice(s) out of {invoices.length} total
                  </p>
                  <button
                    onClick={clearFilters}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Clear Filters
                  </button>
                </div>
              </>
            )}
            
            {!showFilters && (
              <p className="text-sm text-gray-600">
                Found {filteredInvoices.length} invoice(s) out of {invoices.length} total
              </p>
            )}
          </div>

          {/* Export Options */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-green-900 mb-3">Export Options</h3>
            <p className="text-sm text-green-800 mb-4">Export {filteredInvoices.length} {activeTab} invoice(s) • Total: PKR {totalPendingAmount.toLocaleString()}</p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => exportReport('csv')}
                disabled={isExporting || filteredInvoices.length === 0}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="mr-2">📋</span>
                {isExporting ? 'Exporting...' : 'Export CSV'}
              </button>
              <button
                onClick={() => exportReport('excel')}
                disabled={isExporting || filteredInvoices.length === 0}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="mr-2">📊</span>
                {isExporting ? 'Exporting...' : 'Export Excel'}
              </button>
              <button
                onClick={() => exportReport('pdf')}
                disabled={isExporting || filteredInvoices.length === 0}
                className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="mr-2">📄</span>
                {isExporting ? 'Exporting...' : 'Export PDF'}
              </button>
              <button
                onClick={handlePrint}
                disabled={isExporting || filteredInvoices.length === 0}
                className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="mr-2">🖨️</span>
                Print Report
              </button>
            </div>
            {isExporting && (
              <div className="mt-3 flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600 mr-2"></div>
                <p className="text-sm text-green-700">Processing export...</p>
              </div>
            )}
            {filteredInvoices.length === 0 && (
              <p className="text-sm text-gray-500 mt-2">No data available to export. Please adjust your filters.</p>
            )}
          </div>

          {/* Invoices Table */}
          <div className="bg-white rounded-lg shadow-md">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">{activeTab === 'receivable' ? 'Receivable Invoices' : 'Payable Invoices'}</h3>
              
              {/* View Mode Toggle - Only show for payable invoices */}
              {activeTab === 'payable' && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">View:</span>
                  <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`px-3 py-1 text-sm font-medium transition-colors ${
                        viewMode === 'grid' 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      📊 Grid
                    </button>
                    <button
                      onClick={() => setViewMode('line')}
                      className={`px-3 py-1 text-sm font-medium transition-colors border-l border-gray-300 ${
                        viewMode === 'line' 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      📋 Line
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              {isLoading ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">Loading invoices...</p>
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <p className="text-red-500">Error: {error}</p>
                  <button 
                    onClick={fetchInvoicesData}
                    className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Retry
                  </button>
                </div>
              ) : filteredInvoices.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No pending {activeTab === 'receivable' ? 'receivable invoices' : 'payable invoices'} found.</p>
                </div>
              ) : (
                <>
                  {/* Grid View - Default for receivable and optional for payable */}
                  {(activeTab === 'receivable' || viewMode === 'grid') && (
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice ID</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{activeTab === 'receivable' ? 'Customer' : 'Vendor'}</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Days Overdue</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">FBR Sync</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Reminder</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredInvoices.map((invoice) => (
                          <tr key={invoice.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-blue-600 hover:text-blue-800 cursor-pointer">
                                {invoice.id}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{invoice.party}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">Rs. {invoice.amount.toLocaleString()}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{invoice.dueDate}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                                {invoice.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className={`text-sm font-medium ${
                                invoice.daysOverdue > 0 ? 'text-red-600' : 'text-gray-900'
                              }`}>
                                {invoice.daysOverdue > 0 ? `${invoice.daysOverdue} days` : 'On time'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getFBRStatusColor(invoice.fbrSync)}`}>
                                <span className="mr-1">{getFBRStatusIcon(invoice.fbrSync)}</span>
                                {invoice.fbrSync}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{invoice.lastReminder}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-900 truncate max-w-xs">{invoice.notes}</div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {/* Line View - Only for payable invoices */}
                  {activeTab === 'payable' && viewMode === 'line' && (
                    <div className="divide-y divide-gray-200">
                      {filteredInvoices.map((invoice) => (
                        <div key={invoice.id} className="p-4 hover:bg-gray-50 transition-colors">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <h4 className="text-lg font-semibold text-blue-600 hover:text-blue-800 cursor-pointer">
                                  {invoice.id}
                                </h4>
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                                  {invoice.status}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 mb-1">
                                <span className="font-medium">Vendor:</span> {invoice.party}
                              </p>
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Due Date:</span> {invoice.dueDate}
                                {invoice.daysOverdue > 0 && (
                                  <span className="ml-2 text-red-600 font-medium">
                                    ({invoice.daysOverdue} days overdue)
                                  </span>
                                )}
                              </p>
                            </div>
                            <div className="text-right">
                              <div className="text-xl font-bold text-gray-900 mb-1">
                                Rs. {invoice.amount.toLocaleString()}
                              </div>
                              <div className="flex items-center justify-end space-x-2">
                                <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getFBRStatusColor(invoice.fbrSync)}`}>
                                  <span className="mr-1">{getFBRStatusIcon(invoice.fbrSync)}</span>
                                  {invoice.fbrSync}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="font-medium text-gray-700">Last Reminder:</span>
                              <span className="ml-2 text-gray-600">{invoice.lastReminder}</span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Notes:</span>
                              <span className="ml-2 text-gray-600">{invoice.notes || 'No notes'}</span>
                            </div>
                          </div>
                          
                          {/* Action buttons for line view */}
                          <div className="mt-3 flex space-x-2">
                            <button className="text-xs px-3 py-1 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 transition-colors">
                              View Details
                            </button>
                            <button className="text-xs px-3 py-1 bg-green-100 text-green-800 rounded-lg hover:bg-green-200 transition-colors">
                              Mark Paid
                            </button>
                            {invoice.daysOverdue > 3 && (
                              <button className="text-xs px-3 py-1 bg-orange-100 text-orange-800 rounded-lg hover:bg-orange-200 transition-colors">
                                Send Reminder
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
