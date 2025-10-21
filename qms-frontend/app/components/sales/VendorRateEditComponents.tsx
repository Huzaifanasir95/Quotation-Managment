'use client';

import { useState, useEffect } from 'react';
import { Vendor } from '../../lib/api';
import { loadXLSX } from '../../../lib/dynamicImports';

interface VendorRate {
  id: string;
  vendorId: string;
  vendorName: string;
  costPrice: number;
  marginPercent: number;
  sellingPrice: number;
  leadTime: number;
  validFrom: string;
  validUntil: string;
  remarks: string;
  isActive: boolean;
  createdAt: string;
}

interface QuotationItem {
  id: string;
  product_id?: string | null;
  description: string;
  category?: string;
  serial_number?: string;
  item_name?: string;
  unit_of_measure?: string;
  gst_percent?: number;
  item_type?: string;
  quantity: number;
  unit_price: number;
  profit_percent: number;
  tax_percent: number;
  discount_percent?: number;
  line_total: number;
  isCustom?: boolean;
  au_field?: string;
  vendorRates?: VendorRate[];
  selectedVendorRate?: string;
  costPrice?: number;
  marginPercent?: number;
}

interface VendorRateEditComponentsProps {
  items: QuotationItem[];
  setItems: (items: QuotationItem[]) => void;
  vendors: Vendor[];
  isLoadingVendors: boolean;
  selectedItemIndex: number | null;
  setSelectedItemIndex: (index: number | null) => void;
  showVendorRateModal: boolean;
  setShowVendorRateModal: (show: boolean) => void;
}

export default function VendorRateEditComponents({
  items,
  setItems,
  vendors,
  isLoadingVendors,
  selectedItemIndex,
  setSelectedItemIndex,
  showVendorRateModal,
  setShowVendorRateModal
}: VendorRateEditComponentsProps) {
  const [uploadedRates, setUploadedRates] = useState<{[itemId: string]: VendorRate[]}>({});
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Calculate selling price from cost price and margin
  const calculateSellingPrice = (costPrice: number, marginPercent: number): number => {
    return costPrice * (1 + marginPercent / 100);
  };

  // Calculate margin from cost price and selling price
  const calculateMargin = (costPrice: number, sellingPrice: number): number => {
    if (costPrice === 0) return 0;
    return ((sellingPrice - costPrice) / costPrice) * 100;
  };

  // Update item with profit margin calculations
  const updateItemProfitMargin = (itemId: string, field: 'costPrice' | 'marginPercent' | 'sellingPrice', value: number) => {
    setItems(items.map(item => {
      if (item.id === itemId) {
        const updatedItem = { ...item };
        
        if (field === 'costPrice') {
          updatedItem.costPrice = value;
          if (updatedItem.marginPercent !== undefined) {
            updatedItem.unit_price = calculateSellingPrice(value, updatedItem.marginPercent);
          }
        } else if (field === 'marginPercent') {
          updatedItem.marginPercent = value;
          if (updatedItem.costPrice !== undefined) {
            updatedItem.unit_price = calculateSellingPrice(updatedItem.costPrice, value);
          }
        } else if (field === 'sellingPrice') {
          updatedItem.unit_price = value;
          if (updatedItem.costPrice !== undefined) {
            updatedItem.marginPercent = calculateMargin(updatedItem.costPrice, value);
          }
        }

        // Recalculate line total
        const quantity = Number(updatedItem.quantity);
        const unitPrice = Number(updatedItem.unit_price);
        const discountPercent = Number(updatedItem.discount_percent);
        const taxPercent = Number(updatedItem.tax_percent);
        
        const lineTotal = quantity * unitPrice;
        const discountAmount = lineTotal * (discountPercent / 100);
        const taxableAmount = lineTotal - discountAmount;
        const taxAmount = taxableAmount * (taxPercent / 100);
        
        updatedItem.line_total = taxableAmount + taxAmount;
        
        return updatedItem;
      }
      return item;
    }));
  };

  // Add vendor rate to item
  const addVendorRate = (itemId: string, vendorRate: Omit<VendorRate, 'id' | 'createdAt'>) => {
    const newRate: VendorRate = {
      ...vendorRate,
      id: `rate_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString()
    };

    setItems(items.map(item => {
      if (item.id === itemId) {
        const vendorRates = item.vendorRates || [];
        return {
          ...item,
          vendorRates: [...vendorRates, newRate]
        };
      }
      return item;
    }));
  };

  // Apply vendor rate to item
  const applyVendorRate = (itemId: string, rateId: string) => {
    setItems(items.map(item => {
      if (item.id === itemId) {
        const selectedRate = item.vendorRates?.find(rate => rate.id === rateId);
        if (selectedRate) {
          return {
            ...item,
            selectedVendorRate: rateId,
            costPrice: selectedRate.costPrice,
            marginPercent: selectedRate.marginPercent,
            unit_price: selectedRate.sellingPrice
          };
        }
      }
      return item;
    }));
  };

  // Handle Excel file upload for vendor rates
  const handleFileUpload = async (file: File) => {
    try {
      const XLSX = await loadXLSX();
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      // Process uploaded data and convert to vendor rates
      const processedRates: {[itemId: string]: VendorRate[]} = {};
      
      jsonData.forEach((row: any) => {
        const itemName = row['Item Name'] || row['item_name'];
        const vendorName = row['Vendor Name'] || row['vendor_name'];
        const costPrice = parseFloat(row['Cost Price'] || row['cost_price'] || 0);
        const marginPercent = parseFloat(row['Margin %'] || row['margin_percent'] || 0);
        const sellingPrice = parseFloat(row['Selling Price'] || row['selling_price'] || 0);
        const leadTime = parseInt(row['Lead Time'] || row['lead_time'] || 0);
        const validFrom = row['Valid From'] || row['valid_from'] || new Date().toISOString().split('T')[0];
        const validUntil = row['Valid Until'] || row['valid_until'] || '';
        const remarks = row['Remarks'] || row['remarks'] || '';

        // Find matching item
        const matchingItem = items.find(item => 
          item.item_name === itemName || 
          item.description === itemName
        );

        if (matchingItem && vendorName && costPrice > 0) {
          const vendor = vendors.find(v => v.name === vendorName);
          
          if (!processedRates[matchingItem.id]) {
            processedRates[matchingItem.id] = [];
          }

          processedRates[matchingItem.id].push({
            id: `rate_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            vendorId: vendor?.id || '',
            vendorName,
            costPrice,
            marginPercent,
            sellingPrice: sellingPrice || calculateSellingPrice(costPrice, marginPercent),
            leadTime,
            validFrom,
            validUntil,
            remarks,
            isActive: true,
            createdAt: new Date().toISOString()
          });
        }
      });

      // Update items with uploaded rates
      setItems(items.map(item => {
        if (processedRates[item.id]) {
          return {
            ...item,
            vendorRates: [...(item.vendorRates || []), ...processedRates[item.id]]
          };
        }
        return item;
      }));

      setUploadedRates(processedRates);
      alert(`Successfully uploaded vendor rates for ${Object.keys(processedRates).length} items`);
      setShowUploadModal(false);
    } catch (error) {
      console.error('Error processing Excel file:', error);
      alert('Failed to process Excel file. Please check the format and try again.');
    }
  };

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
          file.type === 'application/vnd.ms-excel') {
        handleFileUpload(file);
      } else {
        alert('Please upload an Excel file (.xlsx or .xls)');
      }
    }
  };

  // Profit Margin Calculator Component
  const ProfitMarginCalculator = ({ item, itemIndex }: { item: QuotationItem; itemIndex: number }) => (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
        <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
        Profit Margin Calculator
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cost Price (PKR)</label>
          <input
            type="number"
            step="0.01"
            value={item.costPrice || ''}
            onChange={(e) => updateItemProfitMargin(item.id, 'costPrice', parseFloat(e.target.value) || 0)}
            className="w-full text-black p-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter cost price"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Margin (%)</label>
          <input
            type="number"
            step="0.1"
            value={item.marginPercent || ''}
            onChange={(e) => updateItemProfitMargin(item.id, 'marginPercent', parseFloat(e.target.value) || 0)}
            className="w-full text-black p-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter margin %"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price (PKR)</label>
          <input
            type="number"
            step="0.01"
            value={item.unit_price || ''}
            onChange={(e) => updateItemProfitMargin(item.id, 'sellingPrice', parseFloat(e.target.value) || 0)}
            className="w-full text-black p-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter selling price"
          />
        </div>
      </div>
      {item.costPrice && item.unit_price && (
        <div className="mt-3 text-sm">
          <span className="text-gray-600">Profit: </span>
          <span className="font-semibold text-green-600">
            Rs. {(item.unit_price - item.costPrice).toFixed(2)}
          </span>
          <span className="text-gray-600 ml-4">Margin: </span>
          <span className="font-semibold text-blue-600">
            {item.marginPercent?.toFixed(1)}%
          </span>
        </div>
      )}
    </div>
  );

  // Vendor Rate Comparison Table Component
  const VendorRateComparisonTable = ({ item }: { item: QuotationItem }) => {
    const vendorRates = item.vendorRates || [];
    const activeRates = vendorRates.filter(rate => rate.isActive);

    if (activeRates.length === 0) {
      return (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
          <p className="text-gray-500">No vendor rates available for this item</p>
        </div>
      );
    }

    return (
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
          <h4 className="font-semibold text-gray-900 flex items-center">
            <svg className="w-4 h-4 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H9a2 2 0 00-2 2v.01" />
            </svg>
            Vendor Rate Comparison ({activeRates.length} rates)
          </h4>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost Price</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Margin %</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Selling Price</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lead Time</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valid Until</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {activeRates.map((rate) => {
                const isSelected = item.selectedVendorRate === rate.id;
                const isExpired = rate.validUntil && new Date(rate.validUntil) < new Date();
                
                return (
                  <tr key={rate.id} className={`${isSelected ? 'bg-green-50' : ''} ${isExpired ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{rate.vendorName}</div>
                          {rate.remarks && (
                            <div className="text-xs text-gray-500">{rate.remarks}</div>
                          )}
                        </div>
                        {isSelected && (
                          <svg className="w-4 h-4 ml-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      Rs. {rate.costPrice.toFixed(2)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {rate.marginPercent.toFixed(1)}%
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">Rs. {rate.sellingPrice.toFixed(2)}</div>
                      <div className="text-xs text-gray-500">
                        Profit: Rs. {(rate.sellingPrice - rate.costPrice).toFixed(2)}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {rate.leadTime} days
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {rate.validUntil ? new Date(rate.validUntil).toLocaleDateString() : 'No expiry'}
                      </div>
                      {isExpired && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                          Expired
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                      {!isSelected && !isExpired && (
                        <button
                          onClick={() => applyVendorRate(item.id, rate.id)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Apply
                        </button>
                      )}
                      {isSelected && (
                        <span className="text-green-600 font-medium">Applied</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Vendor Rate Upload Modal
  const vendorRateUploadModal = showUploadModal && (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10002] p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="bg-gradient-to-r from-green-600 to-blue-700 px-6 py-4">
          <h3 className="text-xl font-bold text-white">Upload Vendor Rates</h3>
          <p className="text-green-100 text-sm mt-1">Upload Excel file with vendor rate information</p>
        </div>
        
        <div className="p-6">
          {/* Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-lg font-medium text-gray-900 mb-2">Drop Excel file here</p>
            <p className="text-gray-500 mb-4">or click to browse</p>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileUpload(e.target.files[0]);
                }
              }}
              className="hidden"
              id="vendor-rate-upload"
            />
            <label
              htmlFor="vendor-rate-upload"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Choose File
            </label>
          </div>

          {/* Expected Format */}
          <div className="mt-6 bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Expected Excel Format:</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <p>• <strong>Item Name</strong>: Name of the quotation item</p>
              <p>• <strong>Vendor Name</strong>: Name of the vendor</p>
              <p>• <strong>Cost Price</strong>: Vendor's cost price</p>
              <p>• <strong>Margin %</strong>: Profit margin percentage</p>
              <p>• <strong>Selling Price</strong>: Final selling price (optional, calculated if not provided)</p>
              <p>• <strong>Lead Time</strong>: Delivery time in days</p>
              <p>• <strong>Valid From</strong>: Rate validity start date (YYYY-MM-DD)</p>
              <p>• <strong>Valid Until</strong>: Rate validity end date (YYYY-MM-DD)</p>
              <p>• <strong>Remarks</strong>: Additional notes (optional)</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-2 border-t border-gray-200">
          <button
            onClick={() => setShowUploadModal(false)}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  // Main Vendor Rate Modal
  const vendorRateModal = showVendorRateModal && selectedItemIndex !== null && (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10002] p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-700 px-6 py-4">
          <h3 className="text-xl font-bold text-white">Vendor Rate Management</h3>
          <p className="text-purple-100 text-sm mt-1">
            {items[selectedItemIndex]?.item_name || items[selectedItemIndex]?.description || 'Item'}
          </p>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {selectedItemIndex !== null && (
            <>
              {/* Profit Margin Calculator */}
              <ProfitMarginCalculator item={items[selectedItemIndex]} itemIndex={selectedItemIndex} />
              
              {/* Vendor Rate Comparison Table */}
              <VendorRateComparisonTable item={items[selectedItemIndex]} />
            </>
          )}
        </div>

        <div className="bg-gray-50 px-6 py-4 flex justify-between items-center border-t border-gray-200">
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Upload Rates
          </button>
          <div className="flex space-x-2">
            <button
              onClick={() => {
                setShowVendorRateModal(false);
                setSelectedItemIndex(null);
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {vendorRateModal}
      {vendorRateUploadModal}
    </>
  );
}

// Export utility functions for use in parent component
export const VendorRateUtils = {
  calculateSellingPrice: (costPrice: number, marginPercent: number): number => {
    return costPrice * (1 + marginPercent / 100);
  },
  
  calculateMargin: (costPrice: number, sellingPrice: number): number => {
    if (costPrice === 0) return 0;
    return ((sellingPrice - costPrice) / costPrice) * 100;
  },
  
  isRateExpired: (validUntil: string): boolean => {
    return !!validUntil && new Date(validUntil) < new Date();
  }
};
