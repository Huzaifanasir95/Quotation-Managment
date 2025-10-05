'use client';

import { useState } from 'react';
import { Vendor } from '../../lib/api';
import { loadXLSX } from '../../../lib/dynamicImports';

interface RFQExportSystemProps {
  quotationId: string;
  quotationNumber: string;
  customerName: string;
  items: any[];
  vendors: Vendor[];
  categoryVendors: {[key: string]: string[]};
  showModal: boolean;
  setShowModal: (show: boolean) => void;
}

interface ExportOptions {
  includeRFQReference: boolean;
  includeCustomerDetails: boolean;
  includeItemImages: boolean;
  includeSpecifications: boolean;
  groupByCategory: boolean;
  separateVendorFiles: boolean;
  exportFormat: 'excel' | 'pdf' | 'both';
  rfqValidityDays: number;
  customRFQNumber?: string;
}

export default function RFQExportSystem({
  quotationId,
  quotationNumber,
  customerName,
  items,
  vendors,
  categoryVendors,
  showModal,
  setShowModal
}: RFQExportSystemProps) {
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    includeRFQReference: true,
    includeCustomerDetails: true,
    includeItemImages: false,
    includeSpecifications: true,
    groupByCategory: true,
    separateVendorFiles: true,
    exportFormat: 'excel',
    rfqValidityDays: 7
  });
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  // Generate RFQ reference number
  const generateRFQReference = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    return `RFQ-${year}${month}${day}-${random}`;
  };

  const rfqReference = exportOptions.customRFQNumber || generateRFQReference();

  // Generate vendor-specific Excel files
  const generateVendorSpecificFiles = async () => {
    setIsExporting(true);
    setExportProgress(0);

    try {
      const XLSX = await loadXLSX();
      const totalFiles = Object.values(categoryVendors).flat().length;
      let filesGenerated = 0;

      // Group items by category
      const itemsByCategory: {[key: string]: any[]} = {};
      items.forEach(item => {
        const category = item.category || 'Uncategorized';
        if (!itemsByCategory[category]) {
          itemsByCategory[category] = [];
        }
        itemsByCategory[category].push(item);
      });

      // Generate files for each category-vendor combination
      for (const [category, vendorIds] of Object.entries(categoryVendors)) {
        const categoryItems = itemsByCategory[category] || [];
        
        if (categoryItems.length === 0) continue;

        for (const vendorId of vendorIds) {
          const vendor = vendors.find(v => v.id === vendorId);
          if (!vendor) continue;

          // Create workbook
          const wb = XLSX.utils.book_new();

          // RFQ Cover Sheet
          const coverData = [
            ['REQUEST FOR QUOTATION (RFQ)'],
            [''],
            ['RFQ Reference:', rfqReference],
            ['Date:', new Date().toLocaleDateString()],
            ['Quotation Reference:', quotationNumber],
            ['Customer:', customerName],
            ['Category:', category],
            ['Vendor:', vendor.name],
            [''],
            ['VALIDITY INFORMATION'],
            ['RFQ Valid Until:', new Date(Date.now() + exportOptions.rfqValidityDays * 24 * 60 * 60 * 1000).toLocaleDateString()],
            ['Response Required By:', new Date(Date.now() + (exportOptions.rfqValidityDays - 1) * 24 * 60 * 60 * 1000).toLocaleDateString()],
            [''],
            ['INSTRUCTIONS'],
            ['1. Please provide your best rates for the items listed in the "Items" sheet'],
            ['2. Include lead times and any minimum order quantities'],
            ['3. Specify payment terms and delivery conditions'],
            ['4. Return this file with your rates filled in the designated columns'],
            ['5. Contact us for any clarifications needed'],
            [''],
            ['CONTACT INFORMATION'],
            ['Email: procurement@company.com'],
            ['Phone: +92-XXX-XXXXXXX'],
            [''],
            ['Thank you for your prompt response!']
          ];

          const coverWs = XLSX.utils.aoa_to_sheet(coverData);
          XLSX.utils.book_append_sheet(wb, coverWs, 'RFQ Cover');

          // Items Sheet
          const itemsData = [
            [
              'S.No',
              'Category',
              'Item Name',
              'Description',
              'Specifications',
              'Quantity',
              'Unit of Measure',
              'Your Rate (PKR)',
              'Lead Time (Days)',
              'MOQ',
              'Payment Terms',
              'Delivery Terms',
              'Remarks'
            ]
          ];

          categoryItems.forEach((item, index) => {
            itemsData.push([
              index + 1,
              category,
              item.item_name || item.description || 'N/A',
              item.description || 'N/A',
              item.specifications || 'As per standard specifications',
              item.quantity,
              item.unit_of_measure || 'pcs',
              '', // Empty for vendor to fill
              '', // Empty for vendor to fill
              '', // Empty for vendor to fill
              '', // Empty for vendor to fill
              '', // Empty for vendor to fill
              '' // Empty for vendor to fill
            ]);
          });

          const itemsWs = XLSX.utils.json_to_sheet(itemsData.slice(1), { header: itemsData[0] });
          
          // Set column widths
          itemsWs['!cols'] = [
            { wch: 8 },   // S.No
            { wch: 15 },  // Category
            { wch: 25 },  // Item Name
            { wch: 35 },  // Description
            { wch: 30 },  // Specifications
            { wch: 12 },  // Quantity
            { wch: 15 },  // Unit of Measure
            { wch: 18 },  // Your Rate
            { wch: 15 },  // Lead Time
            { wch: 12 },  // MOQ
            { wch: 20 },  // Payment Terms
            { wch: 20 },  // Delivery Terms
            { wch: 25 }   // Remarks
          ];

          XLSX.utils.book_append_sheet(wb, itemsWs, 'Items');

          // Terms & Conditions Sheet
          const termsData = [
            ['TERMS & CONDITIONS'],
            [''],
            ['GENERAL TERMS'],
            ['1. All rates should be quoted in Pakistani Rupees (PKR)'],
            ['2. Rates should be inclusive of all taxes unless specified otherwise'],
            ['3. Delivery should be made to our warehouse address'],
            ['4. Quality certificates must be provided with delivery'],
            ['5. Payment terms are negotiable but typically 30-60 days'],
            [''],
            ['TECHNICAL REQUIREMENTS'],
            ['1. All items must meet specified quality standards'],
            ['2. Proper packaging and labeling required'],
            ['3. Compliance with local regulations mandatory'],
            ['4. Warranty/guarantee terms to be specified'],
            [''],
            ['SUBMISSION REQUIREMENTS'],
            ['1. Submit quotation within the specified validity period'],
            ['2. Include company profile and relevant certifications'],
            ['3. Provide references from previous clients'],
            ['4. Specify delivery schedule and logistics'],
            [''],
            ['EVALUATION CRITERIA'],
            ['1. Competitive pricing'],
            ['2. Quality and compliance'],
            ['3. Delivery timeline'],
            ['4. Payment terms'],
            ['5. Past performance and reliability']
          ];

          const termsWs = XLSX.utils.aoa_to_sheet(termsData);
          XLSX.utils.book_append_sheet(wb, termsWs, 'Terms & Conditions');

          // Generate filename
          const sanitizedVendorName = vendor.name.replace(/[^a-z0-9]/gi, '_');
          const sanitizedCategory = category.replace(/[^a-z0-9]/gi, '_');
          const filename = `RFQ_${rfqReference}_${sanitizedVendorName}_${sanitizedCategory}.xlsx`;
          
          // Save file
          XLSX.writeFile(wb, filename);

          filesGenerated++;
          setExportProgress((filesGenerated / totalFiles) * 100);
        }
      }

      // Generate master RFQ summary
      await generateMasterRFQSummary();

      alert(`Successfully generated ${filesGenerated} vendor-specific RFQ files!`);
      setShowModal(false);
    } catch (error) {
      console.error('Error generating RFQ files:', error);
      alert('Failed to generate RFQ files. Please try again.');
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  // Generate master RFQ summary
  const generateMasterRFQSummary = async () => {
    try {
      const XLSX = await loadXLSX();
      const wb = XLSX.utils.book_new();

      // Summary Sheet
      const summaryData = [
        ['RFQ MASTER SUMMARY'],
        [''],
        ['RFQ Reference:', rfqReference],
        ['Generated Date:', new Date().toLocaleDateString()],
        ['Quotation Reference:', quotationNumber],
        ['Customer:', customerName],
        ['Total Categories:', Object.keys(categoryVendors).length],
        ['Total Vendors:', Object.values(categoryVendors).flat().length],
        ['Total Items:', items.length],
        [''],
        ['CATEGORY BREAKDOWN']
      ];

      // Add category breakdown
      Object.entries(categoryVendors).forEach(([category, vendorIds]) => {
        const categoryItems = items.filter(item => (item.category || 'Uncategorized') === category);
        summaryData.push([
          `${category}:`,
          `${categoryItems.length} items`,
          `${vendorIds.length} vendors`,
          vendorIds.map(id => vendors.find(v => v.id === id)?.name).join(', ')
        ]);
      });

      const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summaryWs, 'RFQ Summary');

      // Vendor Distribution Sheet
      const vendorDistData = [
        ['VENDOR DISTRIBUTION'],
        [''],
        ['Vendor Name', 'Email', 'Categories', 'Items Count', 'Files Generated']
      ];

      const vendorStats: {[key: string]: {categories: string[], itemCount: number}} = {};
      
      Object.entries(categoryVendors).forEach(([category, vendorIds]) => {
        const categoryItems = items.filter(item => (item.category || 'Uncategorized') === category);
        vendorIds.forEach(vendorId => {
          if (!vendorStats[vendorId]) {
            vendorStats[vendorId] = { categories: [], itemCount: 0 };
          }
          vendorStats[vendorId].categories.push(category);
          vendorStats[vendorId].itemCount += categoryItems.length;
        });
      });

      Object.entries(vendorStats).forEach(([vendorId, stats]) => {
        const vendor = vendors.find(v => v.id === vendorId);
        if (vendor) {
          vendorDistData.push([
            vendor.name,
            vendor.email || 'N/A',
            stats.categories.join(', '),
            stats.itemCount.toString(),
            stats.categories.length.toString()
          ]);
        }
      });

      const vendorDistWs = XLSX.utils.json_to_sheet(vendorDistData.slice(2), { header: vendorDistData[2] });
      XLSX.utils.book_append_sheet(wb, vendorDistWs, 'Vendor Distribution');

      // Items Master List
      const itemsMasterData = [
        ['ITEMS MASTER LIST'],
        [''],
        ['S.No', 'Category', 'Item Name', 'Description', 'Quantity', 'UOM', 'Vendors Contacted']
      ];

      items.forEach((item, index) => {
        const category = item.category || 'Uncategorized';
        const vendorIds = categoryVendors[category] || [];
        const vendorNames = vendorIds.map(id => vendors.find(v => v.id === id)?.name).filter(Boolean);
        
        itemsMasterData.push([
          index + 1,
          category,
          item.item_name || item.description || 'N/A',
          item.description || 'N/A',
          item.quantity,
          item.unit_of_measure || 'pcs',
          vendorNames.join(', ')
        ]);
      });

      const itemsMasterWs = XLSX.utils.json_to_sheet(itemsMasterData.slice(2), { header: itemsMasterData[2] });
      XLSX.utils.book_append_sheet(wb, itemsMasterWs, 'Items Master');

      // Save master file
      XLSX.writeFile(wb, `RFQ_Master_Summary_${rfqReference}.xlsx`);
    } catch (error) {
      console.error('Error generating master RFQ summary:', error);
    }
  };

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="bg-gradient-to-r from-green-600 to-blue-700 px-6 py-4">
          <h3 className="text-xl font-bold text-white">RFQ Export System</h3>
          <p className="text-green-100 text-sm mt-1">Generate vendor-specific RFQ files with references and tracking</p>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* RFQ Reference */}
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-3">RFQ Reference Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">RFQ Reference Number</label>
                <input
                  type="text"
                  value={exportOptions.customRFQNumber || rfqReference}
                  onChange={(e) => setExportOptions({...exportOptions, customRFQNumber: e.target.value})}
                  className="w-full text-black p-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Auto-generated if empty"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Validity Period (Days)</label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={exportOptions.rfqValidityDays}
                  onChange={(e) => setExportOptions({...exportOptions, rfqValidityDays: parseInt(e.target.value) || 7})}
                  className="w-full text-black p-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Export Options */}
          <div className="mb-6">
            <h4 className="font-semibold text-gray-900 mb-3">Export Options</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={exportOptions.includeRFQReference}
                    onChange={(e) => setExportOptions({...exportOptions, includeRFQReference: e.target.checked})}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Include RFQ Reference</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={exportOptions.includeCustomerDetails}
                    onChange={(e) => setExportOptions({...exportOptions, includeCustomerDetails: e.target.checked})}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Include Customer Details</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={exportOptions.includeSpecifications}
                    onChange={(e) => setExportOptions({...exportOptions, includeSpecifications: e.target.checked})}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Include Item Specifications</span>
                </label>
              </div>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={exportOptions.groupByCategory}
                    onChange={(e) => setExportOptions({...exportOptions, groupByCategory: e.target.checked})}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Group Items by Category</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={exportOptions.separateVendorFiles}
                    onChange={(e) => setExportOptions({...exportOptions, separateVendorFiles: e.target.checked})}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Generate Separate Vendor Files</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={exportOptions.includeItemImages}
                    onChange={(e) => setExportOptions({...exportOptions, includeItemImages: e.target.checked})}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Include Item Images (if available)</span>
                </label>
              </div>
            </div>
          </div>

          {/* Export Preview */}
          <div className="mb-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-3">Export Preview</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Total Categories:</span>
                <p className="font-medium text-gray-900">{Object.keys(categoryVendors).length}</p>
              </div>
              <div>
                <span className="text-gray-600">Total Vendors:</span>
                <p className="font-medium text-gray-900">{Object.values(categoryVendors).flat().length}</p>
              </div>
              <div>
                <span className="text-gray-600">Files to Generate:</span>
                <p className="font-medium text-gray-900">
                  {Object.values(categoryVendors).flat().length + 1} (+ 1 master summary)
                </p>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          {isExporting && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Generating RFQ Files...</span>
                <span className="text-sm text-gray-500">{Math.round(exportProgress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${exportProgress}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-gray-50 px-6 py-4 flex justify-between items-center border-t border-gray-200">
          <div className="text-sm text-gray-600">
            RFQ Reference: <span className="font-medium">{rfqReference}</span>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowModal(false)}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              disabled={isExporting}
            >
              Cancel
            </button>
            <button
              onClick={generateVendorSpecificFiles}
              disabled={isExporting || Object.values(categoryVendors).flat().length === 0}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              {isExporting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Generate RFQ Files
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
