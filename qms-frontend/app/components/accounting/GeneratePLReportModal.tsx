'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '../../lib/api';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

interface GeneratePLReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PLReportData {
  period: string;
  companyInfo: {
    name: string;
    address: string;
    phone: string;
    email: string;
  };
  revenue: {
    sales: number;
    services: number;
    otherIncome: number;
    discountsReturns: number;
    netRevenue: number;
  };
  costOfGoodsSold: {
    beginningInventory: number;
    purchases: number;
    directLabor: number;
    manufacturingOverhead: number;
    endingInventory: number;
    totalCogs: number;
  };
  operatingExpenses: {
    salariesWages: number;
    rentUtilities: number;
    marketing: number;
    officeExpenses: number;
    insurance: number;
    depreciation: number;
    professionalFees: number;
    travelEntertainment: number;
    bankCharges: number;
    otherExpenses: number;
    totalOperatingExpenses: number;
  };
  otherIncomeExpenses: {
    interestIncome: number;
    gainOnAssetSale: number;
    interestExpense: number;
    lossOnAssetSale: number;
    netOtherIncomeExpenses: number;
  };
  taxExpenses: {
    incomeTaxExpense: number;
    otherTaxes: number;
    totalTaxExpenses: number;
  };
  summary: {
    grossProfit: number;
    grossProfitMargin: number;
    operatingIncome: number;
    operatingMargin: number;
    earningsBeforeTax: number;
    netIncome: number;
    netProfitMargin: number;
  };
  monthlyBreakdown?: Array<{
    month: string;
    revenue: number;
    expenses: number;
    netIncome: number;
  }>;
  comparison?: {
    previousPeriod: {
      netIncome: number;
      revenue: number;
    };
    growth: {
      revenueGrowth: number;
      profitGrowth: number;
    };
  };
}

export default function GeneratePLReportModal({ isOpen, onClose }: GeneratePLReportModalProps) {
  const [reportConfig, setReportConfig] = useState({
    dateFrom: '',
    dateTo: '',
    includeTaxes: true,
    includeExpenses: true,
    includeComparison: false,
    includeMonthlyBreakdown: false,
    groupBy: 'month',
    format: 'pdf',
    currency: 'PKR'
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportData, setReportData] = useState<PLReportData | null>(null);
  const [ledgerEntries, setLedgerEntries] = useState<any[]>([]);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  const groupByOptions = [
    { value: 'month', label: 'Monthly' },
    { value: 'quarter', label: 'Quarterly' },
    { value: 'year', label: 'Yearly' },
    { value: 'custom', label: 'Custom Period' }
  ];

  const formatOptions = [
    { value: 'pdf', label: 'PDF Report', icon: '📄' },
    { value: 'excel', label: 'Excel Workbook', icon: '📊' },
    { value: 'csv', label: 'CSV Data', icon: '📋' }
  ];

  const currencyOptions = [
    { value: 'PKR', label: 'Pakistani Rupee (PKR)', symbol: 'Rs.' },
    { value: 'USD', label: 'US Dollar (USD)', symbol: '$' },
    { value: 'EUR', label: 'Euro (EUR)', symbol: '€' }
  ];

  // Fetch ledger entries for calculations
  useEffect(() => {
    if (reportConfig.dateFrom && reportConfig.dateTo) {
      fetchLedgerData();
    }
  }, [reportConfig.dateFrom, reportConfig.dateTo]);

  const fetchLedgerData = async () => {
    try {
      const response = await apiClient.getLedgerEntries({
        date_from: reportConfig.dateFrom,
        date_to: reportConfig.dateTo,
        limit: 1000 // Get more entries for comprehensive analysis
      });
      
      if (response.success) {
        setLedgerEntries(response.data.entries || []);
      }
    } catch (error) {
      console.error('Failed to fetch ledger data:', error);
    }
  };

  const generateReport = async () => {
    if (!reportConfig.dateFrom || !reportConfig.dateTo) {
      alert('Please select both start and end dates');
      return;
    }

    setIsGenerating(true);
    
    try {
      // Fetch comprehensive financial data
      const [metricsResponse, accountingResponse] = await Promise.all([
        apiClient.getFinancialMetrics({
          date_from: reportConfig.dateFrom,
          date_to: reportConfig.dateTo
        }),
        apiClient.getAccountingMetrics()
      ]);
      
      if (metricsResponse.success) {
        const metrics = metricsResponse.data.metrics;
        const accounting = accountingResponse?.data || {};
        
        // Calculate comprehensive P&L data
        const plData = calculatePLData(metrics, accounting, ledgerEntries);
        
        // Generate monthly breakdown if requested
        if (reportConfig.includeMonthlyBreakdown) {
          plData.monthlyBreakdown = await generateMonthlyBreakdown();
        }
        
        // Generate comparison data if requested
        if (reportConfig.includeComparison) {
          plData.comparison = await generateComparisonData();
        }
        
        setReportData(plData);
      } else {
        throw new Error('Failed to fetch financial metrics');
      }
      
    } catch (error: any) {
      console.error('Failed to generate report:', error);
      alert(`Failed to generate report: ${error.message || 'Please try again.'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const calculatePLData = (metrics: any, accounting: any, entries: any[]): PLReportData => {
    // Calculate revenue from ledger entries
    const revenueEntries = entries.filter(entry => 
      entry.reference_type === 'sale' || entry.reference_type === 'invoice'
    );
    const expenseEntries = entries.filter(entry => 
      entry.reference_type === 'expense' || entry.reference_type === 'purchase'
    );

    const totalRevenue = revenueEntries.reduce((sum, entry) => 
      sum + (entry.total_credit || 0), 0
    );
    const totalExpenses = expenseEntries.reduce((sum, entry) => 
      sum + (entry.total_debit || 0), 0
    );

    // Company information
    const companyInfo = {
      name: 'Anoosh International',
      address: 'Business Address, City, Country',
      phone: '+92-XXX-XXXXXXX',
      email: 'info@anooshinternational.com'
    };

    // Revenue breakdown
    const revenue = {
      sales: metrics.totalSales || totalRevenue || 0,
      services: 0, // Can be calculated from specific service accounts
      otherIncome: 0, // From other income accounts
      discountsReturns: 0, // From discount/returns accounts
      netRevenue: 0
    };
    revenue.netRevenue = revenue.sales + revenue.services + revenue.otherIncome - revenue.discountsReturns;

    // Cost of Goods Sold
    const costOfGoodsSold = {
      beginningInventory: 0, // From inventory accounts at period start
      purchases: metrics.totalPurchases || 0,
      directLabor: 0, // From labor cost accounts
      manufacturingOverhead: 0, // From manufacturing overhead accounts
      endingInventory: 0, // From inventory accounts at period end
      totalCogs: 0
    };
    costOfGoodsSold.totalCogs = costOfGoodsSold.beginningInventory + costOfGoodsSold.purchases + 
      costOfGoodsSold.directLabor + costOfGoodsSold.manufacturingOverhead - costOfGoodsSold.endingInventory;

    // Operating Expenses (detailed breakdown)
    const operatingExpenses = {
      salariesWages: 0, // From payroll accounts
      rentUtilities: 0, // From rent and utility accounts
      marketing: 0, // From marketing expense accounts
      officeExpenses: 0, // From office expense accounts
      insurance: 0, // From insurance expense accounts
      depreciation: 0, // From depreciation accounts
      professionalFees: 0, // From professional service accounts
      travelEntertainment: 0, // From travel expense accounts
      bankCharges: 0, // From bank charge accounts
      otherExpenses: metrics.expenses || totalExpenses || 0,
      totalOperatingExpenses: 0
    };
    operatingExpenses.totalOperatingExpenses = Object.values(operatingExpenses)
      .reduce((sum, value) => sum + value, 0) - operatingExpenses.totalOperatingExpenses;

    // Other Income/Expenses
    const otherIncomeExpenses = {
      interestIncome: 0, // From interest income accounts
      gainOnAssetSale: 0, // From asset sale gain accounts
      interestExpense: 0, // From interest expense accounts
      lossOnAssetSale: 0, // From asset sale loss accounts
      netOtherIncomeExpenses: 0
    };
    otherIncomeExpenses.netOtherIncomeExpenses = 
      (otherIncomeExpenses.interestIncome + otherIncomeExpenses.gainOnAssetSale) -
      (otherIncomeExpenses.interestExpense + otherIncomeExpenses.lossOnAssetSale);

    // Tax Expenses
    const taxExpenses = {
      incomeTaxExpense: 0, // From tax expense accounts
      otherTaxes: 0, // From other tax accounts
      totalTaxExpenses: 0
    };
    taxExpenses.totalTaxExpenses = taxExpenses.incomeTaxExpense + taxExpenses.otherTaxes;

    // Calculate summary metrics
    const grossProfit = revenue.netRevenue - costOfGoodsSold.totalCogs;
    const operatingIncome = grossProfit - operatingExpenses.totalOperatingExpenses;
    const earningsBeforeTax = operatingIncome + otherIncomeExpenses.netOtherIncomeExpenses;
    const netIncome = earningsBeforeTax - taxExpenses.totalTaxExpenses;

    const summary = {
      grossProfit,
      grossProfitMargin: revenue.netRevenue > 0 ? (grossProfit / revenue.netRevenue) * 100 : 0,
      operatingIncome,
      operatingMargin: revenue.netRevenue > 0 ? (operatingIncome / revenue.netRevenue) * 100 : 0,
      earningsBeforeTax,
      netIncome,
      netProfitMargin: revenue.netRevenue > 0 ? (netIncome / revenue.netRevenue) * 100 : 0
    };

    return {
      period: `${new Date(reportConfig.dateFrom).toLocaleDateString()} to ${new Date(reportConfig.dateTo).toLocaleDateString()}`,
      companyInfo,
      revenue,
      costOfGoodsSold,
      operatingExpenses,
      otherIncomeExpenses,
      taxExpenses,
      summary
    };
  };

  const generateMonthlyBreakdown = async (): Promise<Array<{ month: string; revenue: number; expenses: number; netIncome: number; }>> => {
    // Generate monthly data by iterating through each month in the period
    const startDate = new Date(reportConfig.dateFrom);
    const endDate = new Date(reportConfig.dateTo);
    const breakdown = [];

    let currentDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    
    while (currentDate <= endDate) {
      const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      
      try {
        const monthResponse = await apiClient.getFinancialMetrics({
          date_from: monthStart.toISOString().split('T')[0],
          date_to: monthEnd.toISOString().split('T')[0]
        });
        
        if (monthResponse.success) {
          const monthMetrics = monthResponse.data.metrics;
          breakdown.push({
            month: currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
            revenue: monthMetrics.totalSales || 0,
            expenses: (monthMetrics.totalPurchases || 0) + (monthMetrics.expenses || 0),
            netIncome: monthMetrics.netProfit || 0
          });
        }
      } catch (error) {
        console.error(`Failed to fetch data for ${currentDate.toLocaleDateString()}:`, error);
      }
      
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
    
    return breakdown;
  };

  const generateComparisonData = async (): Promise<{ previousPeriod: { netIncome: number; revenue: number; }; growth: { revenueGrowth: number; profitGrowth: number; }; }> => {
    // Calculate previous period dates (same duration)
    const currentStart = new Date(reportConfig.dateFrom);
    const currentEnd = new Date(reportConfig.dateTo);
    const periodLength = currentEnd.getTime() - currentStart.getTime();
    
    const previousStart = new Date(currentStart.getTime() - periodLength);
    const previousEnd = new Date(currentStart.getTime() - 1);
    
    try {
      const previousResponse = await apiClient.getFinancialMetrics({
        date_from: previousStart.toISOString().split('T')[0],
        date_to: previousEnd.toISOString().split('T')[0]
      });
      
      if (previousResponse.success) {
        const previousMetrics = previousResponse.data.metrics;
        const currentMetrics = reportData?.summary;
        
        const revenueGrowth = previousMetrics.totalSales > 0 ? 
          (((currentMetrics?.netIncome || 0) - previousMetrics.totalSales) / previousMetrics.totalSales) * 100 : 0;
        
        const profitGrowth = previousMetrics.netProfit > 0 ? 
          (((currentMetrics?.netIncome || 0) - previousMetrics.netProfit) / previousMetrics.netProfit) * 100 : 0;
        
        return {
          previousPeriod: {
            netIncome: previousMetrics.netProfit || 0,
            revenue: previousMetrics.totalSales || 0
          },
          growth: {
            revenueGrowth,
            profitGrowth
          }
        };
      }
    } catch (error) {
      console.error('Failed to fetch comparison data:', error);
    }
    
    return {
      previousPeriod: { netIncome: 0, revenue: 0 },
      growth: { revenueGrowth: 0, profitGrowth: 0 }
    };
  };

  const downloadReport = async () => {
    if (!reportData) return;
    
    const currencySymbol = currencyOptions.find(c => c.value === reportConfig.currency)?.symbol || 'Rs.';
    
    if (reportConfig.format === 'csv') {
      // Generate CSV format
      const csvData = [
        ['Profit & Loss Report'],
        ['Period', reportData.period],
        ['Generated', new Date().toLocaleDateString()],
        [''],
        ['REVENUE'],
        ['Sales', reportData.revenue.sales],
        ['Services', reportData.revenue.services],
        ['Other Income', reportData.revenue.otherIncome],
        ['Less: Discounts & Returns', -reportData.revenue.discountsReturns],
        ['Net Revenue', reportData.revenue.netRevenue],
        [''],
        ['COST OF GOODS SOLD'],
        ['Beginning Inventory', reportData.costOfGoodsSold.beginningInventory],
        ['Purchases', reportData.costOfGoodsSold.purchases],
        ['Direct Labor', reportData.costOfGoodsSold.directLabor],
        ['Manufacturing Overhead', reportData.costOfGoodsSold.manufacturingOverhead],
        ['Less: Ending Inventory', -reportData.costOfGoodsSold.endingInventory],
        ['Total Cost of Goods Sold', reportData.costOfGoodsSold.totalCogs],
        [''],
        ['GROSS PROFIT', reportData.summary.grossProfit],
        [''],
        ['OPERATING EXPENSES'],
        ['Salaries & Wages', reportData.operatingExpenses.salariesWages],
        ['Rent & Utilities', reportData.operatingExpenses.rentUtilities],
        ['Marketing', reportData.operatingExpenses.marketing],
        ['Office Expenses', reportData.operatingExpenses.officeExpenses],
        ['Insurance', reportData.operatingExpenses.insurance],
        ['Depreciation', reportData.operatingExpenses.depreciation],
        ['Professional Fees', reportData.operatingExpenses.professionalFees],
        ['Travel & Entertainment', reportData.operatingExpenses.travelEntertainment],
        ['Bank Charges', reportData.operatingExpenses.bankCharges],
        ['Other Expenses', reportData.operatingExpenses.otherExpenses],
        ['Total Operating Expenses', reportData.operatingExpenses.totalOperatingExpenses],
        [''],
        ['OPERATING INCOME', reportData.summary.operatingIncome],
        [''],
        ['OTHER INCOME/EXPENSES'],
        ['Interest Income', reportData.otherIncomeExpenses.interestIncome],
        ['Gain on Asset Sale', reportData.otherIncomeExpenses.gainOnAssetSale],
        ['Interest Expense', -reportData.otherIncomeExpenses.interestExpense],
        ['Loss on Asset Sale', -reportData.otherIncomeExpenses.lossOnAssetSale],
        ['Net Other Income/Expenses', reportData.otherIncomeExpenses.netOtherIncomeExpenses],
        [''],
        ['EARNINGS BEFORE TAX', reportData.summary.earningsBeforeTax],
        [''],
        ['TAX EXPENSES'],
        ['Income Tax', reportData.taxExpenses.incomeTaxExpense],
        ['Other Taxes', reportData.taxExpenses.otherTaxes],
        ['Total Tax Expenses', reportData.taxExpenses.totalTaxExpenses],
        [''],
        ['NET INCOME', reportData.summary.netIncome],
        [''],
        ['KEY RATIOS'],
        ['Gross Profit Margin %', reportData.summary.grossProfitMargin.toFixed(2)],
        ['Operating Margin %', reportData.summary.operatingMargin.toFixed(2)],
        ['Net Profit Margin %', reportData.summary.netProfitMargin.toFixed(2)]
      ];
      
      const csv = Papa.unparse(csvData);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PL_Report_${reportData.period.replace(/[^\w\s]/gi, '_')}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } 
    else if (reportConfig.format === 'excel') {
      // Generate Excel format with multiple sheets
      const workbook = XLSX.utils.book_new();
      
      // Summary Sheet
      const summaryData = [
        ['Profit & Loss Report - Summary'],
        ['Company', reportData.companyInfo.name],
        ['Period', reportData.period],
        ['Generated', new Date().toLocaleDateString()],
        ['Currency', reportConfig.currency],
        [''],
        ['KEY METRICS', '', 'Amount', 'Percentage'],
        ['Net Revenue', '', reportData.revenue.netRevenue, '100.00%'],
        ['Gross Profit', '', reportData.summary.grossProfit, `${reportData.summary.grossProfitMargin.toFixed(2)}%`],
        ['Operating Income', '', reportData.summary.operatingIncome, `${reportData.summary.operatingMargin.toFixed(2)}%`],
        ['Net Income', '', reportData.summary.netIncome, `${reportData.summary.netProfitMargin.toFixed(2)}%`],
      ];
      
      // Detailed P&L Sheet
      const detailedData = [
        ['PROFIT & LOSS STATEMENT'],
        ['Period:', reportData.period],
        [''],
        ['REVENUE'],
        ['Sales Revenue', reportData.revenue.sales],
        ['Service Revenue', reportData.revenue.services],
        ['Other Income', reportData.revenue.otherIncome],
        ['Less: Discounts & Returns', -reportData.revenue.discountsReturns],
        ['NET REVENUE', reportData.revenue.netRevenue],
        [''],
        ['COST OF GOODS SOLD'],
        ['Beginning Inventory', reportData.costOfGoodsSold.beginningInventory],
        ['Purchases', reportData.costOfGoodsSold.purchases],
        ['Direct Labor', reportData.costOfGoodsSold.directLabor],
        ['Manufacturing Overhead', reportData.costOfGoodsSold.manufacturingOverhead],
        ['Less: Ending Inventory', -reportData.costOfGoodsSold.endingInventory],
        ['TOTAL COST OF GOODS SOLD', reportData.costOfGoodsSold.totalCogs],
        [''],
        ['GROSS PROFIT', reportData.summary.grossProfit],
        [''],
        ['OPERATING EXPENSES'],
        ['Salaries & Wages', reportData.operatingExpenses.salariesWages],
        ['Rent & Utilities', reportData.operatingExpenses.rentUtilities],
        ['Marketing Expenses', reportData.operatingExpenses.marketing],
        ['Office Expenses', reportData.operatingExpenses.officeExpenses],
        ['Insurance', reportData.operatingExpenses.insurance],
        ['Depreciation', reportData.operatingExpenses.depreciation],
        ['Professional Fees', reportData.operatingExpenses.professionalFees],
        ['Travel & Entertainment', reportData.operatingExpenses.travelEntertainment],
        ['Bank Charges', reportData.operatingExpenses.bankCharges],
        ['Other Operating Expenses', reportData.operatingExpenses.otherExpenses],
        ['TOTAL OPERATING EXPENSES', reportData.operatingExpenses.totalOperatingExpenses],
        [''],
        ['OPERATING INCOME', reportData.summary.operatingIncome],
        [''],
        ['OTHER INCOME & EXPENSES'],
        ['Interest Income', reportData.otherIncomeExpenses.interestIncome],
        ['Gain on Asset Sale', reportData.otherIncomeExpenses.gainOnAssetSale],
        ['Interest Expense', -reportData.otherIncomeExpenses.interestExpense],
        ['Loss on Asset Sale', -reportData.otherIncomeExpenses.lossOnAssetSale],
        ['NET OTHER INCOME/EXPENSES', reportData.otherIncomeExpenses.netOtherIncomeExpenses],
        [''],
        ['EARNINGS BEFORE TAX', reportData.summary.earningsBeforeTax],
        [''],
        ['TAX EXPENSES'],
        ['Income Tax Expense', reportData.taxExpenses.incomeTaxExpense],
        ['Other Taxes', reportData.taxExpenses.otherTaxes],
        ['TOTAL TAX EXPENSES', reportData.taxExpenses.totalTaxExpenses],
        [''],
        ['NET INCOME', reportData.summary.netIncome]
      ];
      
      // Create worksheets
      const summaryWS = XLSX.utils.aoa_to_sheet(summaryData);
      const detailedWS = XLSX.utils.aoa_to_sheet(detailedData);
      
      // Add monthly breakdown if available
      if (reportData.monthlyBreakdown) {
        const monthlyData = [
          ['Monthly Breakdown'],
          ['Month', 'Revenue', 'Expenses', 'Net Income'],
          ...reportData.monthlyBreakdown.map(month => [
            month.month, month.revenue, month.expenses, month.netIncome
          ])
        ];
        const monthlyWS = XLSX.utils.aoa_to_sheet(monthlyData);
        XLSX.utils.book_append_sheet(workbook, monthlyWS, 'Monthly Breakdown');
      }
      
      // Add sheets to workbook
      XLSX.utils.book_append_sheet(workbook, summaryWS, 'Summary');
      XLSX.utils.book_append_sheet(workbook, detailedWS, 'Detailed P&L');
      
      // Save Excel file
      XLSX.writeFile(workbook, `PL_Report_${reportData.period.replace(/[^\w\s]/gi, '_')}.xlsx`);
    } 
    else if (reportConfig.format === 'pdf') {
      // Generate comprehensive PDF
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.width;
      const margin = 20;
      let yPosition = margin;
      
      // Company Header
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text(reportData.companyInfo.name, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;
      
      pdf.setFontSize(16);
      pdf.text('PROFIT & LOSS STATEMENT', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 8;
      
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Period: ${reportData.period}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;
      
      // Revenue Section
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('REVENUE', margin, yPosition);
      yPosition += 8;
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      const revenueItems = [
        ['Sales Revenue', reportData.revenue.sales],
        ['Service Revenue', reportData.revenue.services],
        ['Other Income', reportData.revenue.otherIncome],
        ['Less: Discounts & Returns', -reportData.revenue.discountsReturns]
      ];
      
      revenueItems.forEach(([label, amount]) => {
        pdf.text(label, margin + 10, yPosition);
        pdf.text(`${currencySymbol} ${amount.toLocaleString()}`, pageWidth - margin - 50, yPosition, { align: 'right' });
        yPosition += 6;
      });
      
      // Net Revenue
      pdf.setFont('helvetica', 'bold');
      pdf.text('NET REVENUE', margin + 10, yPosition);
      pdf.text(`${currencySymbol} ${reportData.revenue.netRevenue.toLocaleString()}`, pageWidth - margin - 50, yPosition, { align: 'right' });
      yPosition += 12;
      
      // Cost of Goods Sold
      pdf.setFontSize(14);
      pdf.text('COST OF GOODS SOLD', margin, yPosition);
      yPosition += 8;
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      const cogsItems = [
        ['Beginning Inventory', reportData.costOfGoodsSold.beginningInventory],
        ['Purchases', reportData.costOfGoodsSold.purchases],
        ['Direct Labor', reportData.costOfGoodsSold.directLabor],
        ['Manufacturing Overhead', reportData.costOfGoodsSold.manufacturingOverhead],
        ['Less: Ending Inventory', -reportData.costOfGoodsSold.endingInventory]
      ];
      
      cogsItems.forEach(([label, amount]) => {
        pdf.text(label, margin + 10, yPosition);
        pdf.text(`${currencySymbol} ${amount.toLocaleString()}`, pageWidth - margin - 50, yPosition, { align: 'right' });
        yPosition += 6;
      });
      
      pdf.setFont('helvetica', 'bold');
      pdf.text('TOTAL COST OF GOODS SOLD', margin + 10, yPosition);
      pdf.text(`${currencySymbol} ${reportData.costOfGoodsSold.totalCogs.toLocaleString()}`, pageWidth - margin - 50, yPosition, { align: 'right' });
      yPosition += 12;
      
      // Gross Profit
      pdf.setFontSize(12);
      pdf.text('GROSS PROFIT', margin, yPosition);
      pdf.text(`${currencySymbol} ${reportData.summary.grossProfit.toLocaleString()}`, pageWidth - margin - 50, yPosition, { align: 'right' });
      yPosition += 15;
      
      // Check if we need a new page
      if (yPosition > 250) {
        pdf.addPage();
        yPosition = margin;
      }
      
      // Operating Expenses
      pdf.setFontSize(14);
      pdf.text('OPERATING EXPENSES', margin, yPosition);
      yPosition += 8;
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      const expenseItems = [
        ['Salaries & Wages', reportData.operatingExpenses.salariesWages],
        ['Rent & Utilities', reportData.operatingExpenses.rentUtilities],
        ['Marketing', reportData.operatingExpenses.marketing],
        ['Office Expenses', reportData.operatingExpenses.officeExpenses],
        ['Insurance', reportData.operatingExpenses.insurance],
        ['Depreciation', reportData.operatingExpenses.depreciation],
        ['Professional Fees', reportData.operatingExpenses.professionalFees],
        ['Travel & Entertainment', reportData.operatingExpenses.travelEntertainment],
        ['Bank Charges', reportData.operatingExpenses.bankCharges],
        ['Other Expenses', reportData.operatingExpenses.otherExpenses]
      ];
      
      expenseItems.forEach(([label, amount]) => {
        pdf.text(label, margin + 10, yPosition);
        pdf.text(`${currencySymbol} ${amount.toLocaleString()}`, pageWidth - margin - 50, yPosition, { align: 'right' });
        yPosition += 6;
      });
      
      pdf.setFont('helvetica', 'bold');
      pdf.text('TOTAL OPERATING EXPENSES', margin + 10, yPosition);
      pdf.text(`${currencySymbol} ${reportData.operatingExpenses.totalOperatingExpenses.toLocaleString()}`, pageWidth - margin - 50, yPosition, { align: 'right' });
      yPosition += 12;
      
      // Operating Income
      pdf.setFontSize(12);
      pdf.text('OPERATING INCOME', margin, yPosition);
      pdf.text(`${currencySymbol} ${reportData.summary.operatingIncome.toLocaleString()}`, pageWidth - margin - 50, yPosition, { align: 'right' });
      yPosition += 15;
      
      // Net Income
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('NET INCOME', margin, yPosition);
      pdf.text(`${currencySymbol} ${reportData.summary.netIncome.toLocaleString()}`, pageWidth - margin - 50, yPosition, { align: 'right' });
      yPosition += 15;
      
      // Key Ratios
      pdf.setFontSize(12);
      pdf.text('KEY FINANCIAL RATIOS', margin, yPosition);
      yPosition += 8;
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Gross Profit Margin: ${reportData.summary.grossProfitMargin.toFixed(2)}%`, margin + 10, yPosition);
      yPosition += 6;
      pdf.text(`Operating Margin: ${reportData.summary.operatingMargin.toFixed(2)}%`, margin + 10, yPosition);
      yPosition += 6;
      pdf.text(`Net Profit Margin: ${reportData.summary.netProfitMargin.toFixed(2)}%`, margin + 10, yPosition);
      
      // Footer
      const pageCount = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.text(`Generated: ${new Date().toLocaleDateString()}`, margin, pdf.internal.pageSize.height - 10);
        pdf.text(`Page ${i} of ${pageCount}`, pageWidth - margin - 20, pdf.internal.pageSize.height - 10);
      }
      
      // Save PDF
      pdf.save(`PL_Report_${reportData.period.replace(/[^\w\s]/gi, '_')}.pdf`);
    }
    
    alert(`${reportConfig.format.toUpperCase()} report downloaded successfully!`);
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setReportConfig(prev => ({ ...prev, [field]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Generate Profit & Loss Report</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <div className="p-6">
          {/* Report Configuration */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Report Configuration</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date From *</label>
                <input
                  type="date"
                  value={reportConfig.dateFrom}
                  onChange={(e) => handleInputChange('dateFrom', e.target.value)}
                  className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date To *</label>
                <input
                  type="date"
                  value={reportConfig.dateTo}
                  onChange={(e) => handleInputChange('dateTo', e.target.value)}
                  className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Group By</label>
                <select
                  value={reportConfig.groupBy}
                  onChange={(e) => handleInputChange('groupBy', e.target.value)}
                  className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {groupByOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Export Format</label>
                <select
                  value={reportConfig.format}
                  onChange={(e) => handleInputChange('format', e.target.value)}
                  className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {formatOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.icon} {option.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={reportConfig.includeTaxes}
                  onChange={(e) => handleInputChange('includeTaxes', e.target.checked)}
                  className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">Include Tax Breakdown</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={reportConfig.includeExpenses}
                  onChange={(e) => handleInputChange('includeExpenses', e.target.checked)}
                  className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">Include Detailed Expenses</span>
              </label>
            </div>
          </div>

          {/* Generate Button */}
          {!reportData && (
            <div className="text-center mb-6">
              <button
                onClick={generateReport}
                disabled={isGenerating || !reportConfig.dateFrom || !reportConfig.dateTo}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? 'Generating Report...' : 'Generate Report'}
              </button>
            </div>
          )}

          {/* Report Preview */}
          {reportData && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-3">Report Generated Successfully!</h4>
                <p className="text-sm text-blue-800">
                  Period: {reportData.period} | Format: {reportConfig.format.toUpperCase()}
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  Data sourced from live accounting ledger entries
                </p>
              </div>

              {/* Revenue Section */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-medium text-green-900 mb-3">Revenue</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-green-700">Sales:</span>
                    <span className="ml-2 font-medium">Rs. {reportData.revenue.sales.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-green-700">Other Income:</span>
                    <span className="ml-2 font-medium">Rs. {reportData.revenue.otherIncome.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-green-700">Total Revenue:</span>
                    <span className="ml-2 font-medium text-lg">Rs. {reportData.revenue.netRevenue.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Costs Section */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-medium text-red-900 mb-3">Cost of Goods Sold</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-red-700">Purchases:</span>
                    <span className="ml-2 font-medium">Rs. {reportData.costOfGoodsSold.purchases.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-red-700">Direct Expenses:</span>
                    <span className="ml-2 font-medium">Rs. {reportData.costOfGoodsSold.directLabor.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-red-700">Total Costs:</span>
                    <span className="ml-2 font-medium text-lg">Rs. {reportData.costOfGoodsSold.totalCogs.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Expenses Section */}
              {reportConfig.includeExpenses && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <h4 className="font-medium text-orange-900 mb-3">Operating Expenses</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-orange-700">Salaries:</span>
                      <span className="ml-2 font-medium">Rs. {reportData.operatingExpenses.salariesWages.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-orange-700">Rent:</span>
                      <span className="ml-2 font-medium">Rs. {reportData.operatingExpenses.rentUtilities.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-orange-700">Utilities:</span>
                      <span className="ml-2 font-medium">Rs. {reportData.operatingExpenses.officeExpenses.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-orange-700">Office:</span>
                      <span className="ml-2 font-medium">Rs. {reportData.operatingExpenses.insurance.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-orange-700">Marketing:</span>
                      <span className="ml-2 font-medium">Rs. {reportData.operatingExpenses.marketing.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-orange-700">Other:</span>
                      <span className="ml-2 font-medium">Rs. {reportData.operatingExpenses.otherExpenses.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-orange-200">
                    <span className="text-orange-700 font-medium">Total Expenses:</span>
                    <span className="ml-2 font-medium text-lg">Rs. {reportData.operatingExpenses.totalOperatingExpenses.toLocaleString()}</span>
                  </div>
                </div>
              )}

              {/* Summary Section */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Summary</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Gross Profit:</span>
                    <span className="ml-2 font-medium text-green-600">Rs. {reportData.summary.grossProfit.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Net Profit:</span>
                    <span className={`ml-2 font-medium text-lg Rs. {reportData.summary.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      Rs. {reportData.summary.netIncome.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Profit Margin:</span>
                    <span className={`ml-2 font-medium Rs. {reportData.summary.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {reportData.summary.netProfitMargin.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Download Section */}
              <div className="text-center">
                <button
                  onClick={downloadReport}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200"
                >
                  <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download {reportConfig.format.toUpperCase()} Report
                </button>
              </div>
            </div>
          )}
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
