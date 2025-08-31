'use client';

import { useState } from 'react';
import { apiClient } from '../../lib/api';

interface GeneratePLReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GeneratePLReportModal({ isOpen, onClose }: GeneratePLReportModalProps) {
  const [reportConfig, setReportConfig] = useState({
    dateFrom: '',
    dateTo: '',
    includeTaxes: true,
    includeExpenses: true,
    groupBy: 'month',
    format: 'pdf'
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportData, setReportData] = useState<any>(null);

  const groupByOptions = [
    { value: 'month', label: 'Monthly' },
    { value: 'quarter', label: 'Quarterly' },
    { value: 'year', label: 'Yearly' }
  ];

  const formatOptions = [
    { value: 'pdf', label: 'PDF', icon: '📄' },
    { value: 'excel', label: 'Excel', icon: '📊' },
    { value: 'csv', label: 'CSV', icon: '📋' }
  ];

  const generateReport = async () => {
    if (!reportConfig.dateFrom || !reportConfig.dateTo) {
      alert('Please select both start and end dates');
      return;
    }

    setIsGenerating(true);
    
    try {
      // Fetch real financial metrics from the backend
      const metricsResponse = await apiClient.getFinancialMetrics({
        date_from: reportConfig.dateFrom,
        date_to: reportConfig.dateTo
      });
      
      if (metricsResponse.success) {
        const metrics = metricsResponse.data.metrics;
        
        // Transform backend data to match the expected report structure
        const reportData = {
          period: `${reportConfig.dateFrom} to ${reportConfig.dateTo}`,
          revenue: {
            sales: metrics.totalSales || 0,
            otherIncome: 0, // Can be calculated from other revenue accounts if needed
            total: metrics.totalSales || 0
          },
          costs: {
            purchases: metrics.totalPurchases || 0,
            directExpenses: 0, // Can be calculated from specific expense accounts
            total: metrics.totalPurchases || 0
          },
          expenses: {
            salaries: 0, // These would need to be calculated from specific accounts
            rent: 0,
            utilities: 0,
            office: 0,
            marketing: 0,
            other: metrics.expenses || 0,
            total: metrics.expenses || 0
          },
          summary: {
            grossProfit: (metrics.totalSales || 0) - (metrics.totalPurchases || 0),
            netProfit: metrics.netProfit || 0,
            margin: metrics.totalSales > 0 ? 
              ((metrics.netProfit || 0) / metrics.totalSales * 100).toFixed(2) : '0.00'
          }
        };
        
        setReportData(reportData);
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

  const downloadReport = () => {
    if (!reportData) return;
    
    // Simulate file download
    const content = `Profit & Loss Report\nPeriod: ${reportData.period}\n\nRevenue: $${reportData.revenue.total.toLocaleString()}\nCosts: $${reportData.costs.total.toLocaleString()}\nExpenses: $${reportData.expenses.total.toLocaleString()}\nNet Profit: $${reportData.summary.netProfit.toLocaleString()}`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `P&L_Report_${reportConfig.dateFrom}_to_${reportConfig.dateTo}.${reportConfig.format}`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    alert('Report downloaded successfully!');
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
                    <span className="ml-2 font-medium">${reportData.revenue.sales.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-green-700">Other Income:</span>
                    <span className="ml-2 font-medium">${reportData.revenue.otherIncome.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-green-700">Total Revenue:</span>
                    <span className="ml-2 font-medium text-lg">${reportData.revenue.total.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Costs Section */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-medium text-red-900 mb-3">Cost of Goods Sold</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-red-700">Purchases:</span>
                    <span className="ml-2 font-medium">${reportData.costs.purchases.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-red-700">Direct Expenses:</span>
                    <span className="ml-2 font-medium">${reportData.costs.directExpenses.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-red-700">Total Costs:</span>
                    <span className="ml-2 font-medium text-lg">${reportData.costs.total.toLocaleString()}</span>
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
                      <span className="ml-2 font-medium">${reportData.expenses.salaries.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-orange-700">Rent:</span>
                      <span className="ml-2 font-medium">${reportData.expenses.rent.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-orange-700">Utilities:</span>
                      <span className="ml-2 font-medium">${reportData.expenses.utilities.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-orange-700">Office:</span>
                      <span className="ml-2 font-medium">${reportData.expenses.office.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-orange-700">Marketing:</span>
                      <span className="ml-2 font-medium">${reportData.expenses.marketing.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-orange-700">Other:</span>
                      <span className="ml-2 font-medium">${reportData.expenses.other.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-orange-200">
                    <span className="text-orange-700 font-medium">Total Expenses:</span>
                    <span className="ml-2 font-medium text-lg">${reportData.expenses.total.toLocaleString()}</span>
                  </div>
                </div>
              )}

              {/* Summary Section */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Summary</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Gross Profit:</span>
                    <span className="ml-2 font-medium text-green-600">${reportData.summary.grossProfit.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Net Profit:</span>
                    <span className={`ml-2 font-medium text-lg ${reportData.summary.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${reportData.summary.netProfit.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Profit Margin:</span>
                    <span className={`ml-2 font-medium ${reportData.summary.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {reportData.summary.margin}%
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
