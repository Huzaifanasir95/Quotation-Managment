'use client';

import { useState } from 'react';
import { Vendor } from '../../lib/api';
import { loadXLSX } from '../../../lib/dynamicImports';

interface VendorRateRequestModalsProps {
  showVendorRateModal: boolean;
  setShowVendorRateModal: (show: boolean) => void;
  showRateComparison: boolean;
  setShowRateComparison: (show: boolean) => void;
  selectedItemForRates: number | null;
  setSelectedItemForRates: (index: number | null) => void;
  items: any[];
  setItems: (items: any[]) => void;
  vendors: Vendor[];
  isLoadingVendors: boolean;
  products: any[];
  formData: any;
  categoryVendors: {[key: string]: string[]};
  setCategoryVendors: (vendors: {[key: string]: string[]}) => void;
  vendorRates: {[key: string]: any};
  setVendorRates: (rates: {[key: string]: any}) => void;
}

export default function VendorRateRequestModals({
  showVendorRateModal,
  setShowVendorRateModal,
  showRateComparison,
  setShowRateComparison,
  selectedItemForRates,
  setSelectedItemForRates,
  items,
  setItems,
  vendors,
  isLoadingVendors,
  products,
  formData,
  categoryVendors,
  setCategoryVendors,
  vendorRates,
  setVendorRates
}: VendorRateRequestModalsProps) {
  const [isRequestingRates, setIsRequestingRates] = useState(false);

  // Generate category-based vendor Excel files
  const generateVendorRateRequestFiles = async () => {
    if (items.length === 0) {
      alert('No items to request rates for');
      return;
    }

    setIsRequestingRates(true);
    try {
      const XLSX = await loadXLSX();
      
      // Group items by category
      const itemsByCategory: {[key: string]: any[]} = {};
      items.forEach((item, index) => {
        const category = item.category || 'Uncategorized';
        if (!itemsByCategory[category]) {
          itemsByCategory[category] = [];
        }
        itemsByCategory[category].push({ ...item, originalIndex: index });
      });

      // Get selected vendors for each category
      const categoriesToProcess = Object.keys(itemsByCategory);
      
      for (const category of categoriesToProcess) {
        const selectedVendorIds = categoryVendors[category] || [];
        
        if (selectedVendorIds.length === 0) {
          continue; // Skip categories with no vendors selected
        }

        const categoryItems = itemsByCategory[category];
        
        // Generate a file for each selected vendor
        for (const vendorId of selectedVendorIds) {
          const vendor = vendors.find(v => v.id === vendorId);
          if (!vendor) continue;

          // Prepare data for Excel
          const excelData = categoryItems.map((item, idx) => {
            const product = products.find(p => p.id === item.productId);
            const itemName = item.itemName || (item.isCustom ? item.customDescription : product?.name) || 'N/A';
            const description = item.isCustom ? item.customDescription : (product?.description || product?.name) || 'N/A';
            
            return {
              'S.No': idx + 1,
              'Category': item.category || 'Uncategorized',
              'Item Name': itemName,
              'Description': description,
              'Quantity': item.quantity || 0,
              'Unit of Measure': item.uom || 'pcs',
              'Your Rate (PKR)': '', // Empty for vendor to fill
              'Lead Time (Days)': '', // Empty for vendor to fill
              'Remarks': '' // Empty for vendor to fill
            };
          });

          // Create workbook with header information first
          const headerData = [
            [`Rate Request for ${vendor.name}`],
            [`Category: ${category}`],
            [`Date: ${new Date().toLocaleDateString()}`],
            [`Reference: ${formData.referenceNo || 'N/A'}`],
            [], // Empty row
            // Column headers
            ['S.No', 'Category', 'Item Name', 'Description', 'Quantity', 'Unit of Measure', 'Your Rate (PKR)', 'Lead Time (Days)', 'Remarks']
          ];

          // Add data rows
          const dataRows = excelData.map(row => [
            row['S.No'],
            row['Category'],
            row['Item Name'],
            row['Description'],
            row['Quantity'],
            row['Unit of Measure'],
            row['Your Rate (PKR)'],
            row['Lead Time (Days)'],
            row['Remarks']
          ]);

          const allData = [...headerData, ...dataRows];
          const ws = XLSX.utils.aoa_to_sheet(allData);
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, 'Rate Request');

          // Set column widths
          ws['!cols'] = [
            { wch: 8 },  // S.No
            { wch: 20 }, // Category
            { wch: 30 }, // Item Name
            { wch: 40 }, // Description
            { wch: 12 }, // Quantity
            { wch: 18 }, // Unit of Measure
            { wch: 18 }, // Your Rate
            { wch: 18 }, // Lead Time
            { wch: 25 }  // Remarks
          ];

          // Generate filename
          const sanitizedVendorName = vendor.name.replace(/[^a-z0-9]/gi, '_');
          const sanitizedCategory = category.replace(/[^a-z0-9]/gi, '_');
          const filename = `Rate_Request_${sanitizedVendorName}_${sanitizedCategory}_${new Date().toISOString().split('T')[0]}.xlsx`;
          
          // Save file
          XLSX.writeFile(wb, filename);
        }
      }

      alert('Vendor rate request files generated successfully!');
      setShowVendorRateModal(false);
    } catch (error) {
      console.error('Error generating vendor rate files:', error);
      alert('Failed to generate vendor rate request files. Please try again.');
    } finally {
      setIsRequestingRates(false);
    }
  };

  // Vendor Rate Request Modal
  const vendorRateModal = showVendorRateModal && (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="bg-white px-6 py-4 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900">Request Vendor Rates</h3>
          <p className="text-gray-600 text-sm mt-1">Select vendors by category to request competitive rates</p>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Group items by category */}
          {(Object.entries(
            items.reduce((acc, item) => {
              const category = item.category || 'Uncategorized';
              if (!acc[category]) acc[category] = [];
              acc[category].push(item);
              return acc;
            }, {} as {[key: string]: any[]})
          ) as [string, any[]][]).map(([category, categoryItems]) => (
            <div key={category} className="mb-6 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-gray-900">
                  {category}
                  <span className="ml-2 text-sm font-normal text-gray-500">({categoryItems.length} items)</span>
                </h4>
              </div>

              {/* Items in this category */}
              <div className="mb-4 bg-gray-50 rounded-lg p-3">
                <p className="text-sm font-medium text-gray-700 mb-2">Items:</p>
                <div className="space-y-1">
                  {categoryItems.map((item, idx) => {
                    const product = products.find(p => p.id === item.productId);
                    const itemName = item.isCustom 
                      ? (item.customDescription || item.itemName || 'Custom Item')
                      : (product?.name || 'Product');
                    return (
                      <div key={idx} className="text-sm text-gray-600">
                        • {itemName} (Qty: {item.quantity})
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Vendor selection for this category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Vendors for {category}
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2">
                  {isLoadingVendors ? (
                    <div className="col-span-2 text-center py-4 text-gray-500">
                      Loading vendors...
                    </div>
                  ) : vendors.length === 0 ? (
                    <div className="col-span-2 text-center py-4 text-gray-500">
                      No vendors available
                    </div>
                  ) : (
                    vendors.map(vendor => (
                      <label key={vendor.id} className="flex items-center space-x-2 p-2 border border-gray-200 rounded hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={(categoryVendors[category] || []).includes(vendor.id)}
                          onChange={(e) => {
                            const currentVendors = categoryVendors[category] || [];
                            if (e.target.checked) {
                              setCategoryVendors({
                                ...categoryVendors,
                                [category]: [...currentVendors, vendor.id]
                              });
                            } else {
                              setCategoryVendors({
                                ...categoryVendors,
                                [category]: currentVendors.filter(id => id !== vendor.id)
                              });
                            }
                          }}
                          className="h-4 w-4 text-gray-900 focus:ring-gray-500 border-gray-300 rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">{vendor.name}</div>
                          {vendor.email && (
                            <div className="text-xs text-gray-500 truncate">{vendor.email}</div>
                          )}
                        </div>
                      </label>
                    ))
                  )}
                </div>
                {(categoryVendors[category] || []).length > 0 && (
                  <p className="text-sm text-green-600 mt-2">
                    ✓ {(categoryVendors[category] || []).length} vendor(s) selected
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="bg-gray-50 px-6 py-4 flex justify-between items-center border-t border-gray-200">
          <div className="text-sm text-gray-600">
            {Object.values(categoryVendors).flat().length} total vendor(s) selected across all categories
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => {
                setShowVendorRateModal(false);
                setCategoryVendors({});
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={generateVendorRateRequestFiles}
              disabled={isRequestingRates || Object.values(categoryVendors).flat().length === 0}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              {isRequestingRates ? (
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
                  Generate Excel Files
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Rate Comparison Modal
  const rateComparisonModal = showRateComparison && selectedItemForRates !== null && (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
        <div className="bg-white px-6 py-4 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900">Vendor Rate Comparison</h3>
          <p className="text-gray-600 text-sm mt-1">
            {(() => {
              const item = items[selectedItemForRates];
              const product = products.find(p => p.id === item?.productId);
              return item?.isCustom 
                ? (item.customDescription || item.itemName || 'Custom Item')
                : (product?.name || 'Product');
            })()}
          </p>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Current Item Details */}
          <div className="mb-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2">Current Item Details</h4>
            {(() => {
              const item = items[selectedItemForRates];
              const product = products.find(p => p.id === item?.productId);
              return (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Quantity:</span>
                    <p className="font-medium text-gray-900">{item?.quantity}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Current Price:</span>
                    <p className="font-medium text-gray-900">Rs. {item?.unitPrice}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Category:</span>
                    <p className="font-medium text-gray-900">{item?.category || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Total:</span>
                    <p className="font-medium text-gray-900">Rs. {((item?.quantity || 0) * (item?.unitPrice || 0)).toFixed(2)}</p>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Vendor Rates Input */}
          <div className="mb-4">
            <h4 className="font-semibold text-gray-900 mb-3">Vendor Rates</h4>
            <div className="space-y-3">
              {vendors.map(vendor => {
                const itemKey = `item_${selectedItemForRates}_vendor_${vendor.id}`;
                const currentRate = vendorRates[itemKey] || { rate: '', leadTime: '', remarks: '' };
                
                return (
                  <div key={vendor.id} className="border border-gray-200 rounded-lg p-4 hover:border-gray-400 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h5 className="font-medium text-gray-900">{vendor.name}</h5>
                        {vendor.email && <p className="text-xs text-gray-500">{vendor.email}</p>}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Rate (PKR)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={currentRate.rate}
                          onChange={(e) => {
                            setVendorRates({
                              ...vendorRates,
                              [itemKey]: { ...currentRate, rate: e.target.value }
                            });
                          }}
                          className="w-full text-black p-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-gray-500 focus:border-gray-500"
                          placeholder="Enter rate"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Lead Time (Days)</label>
                        <input
                          type="number"
                          value={currentRate.leadTime}
                          onChange={(e) => {
                            setVendorRates({
                              ...vendorRates,
                              [itemKey]: { ...currentRate, leadTime: e.target.value }
                            });
                          }}
                          className="w-full text-black p-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-gray-500 focus:border-gray-500"
                          placeholder="Days"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Remarks</label>
                        <input
                          type="text"
                          value={currentRate.remarks}
                          onChange={(e) => {
                            setVendorRates({
                              ...vendorRates,
                              [itemKey]: { ...currentRate, remarks: e.target.value }
                            });
                          }}
                          className="w-full text-black p-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-gray-500 focus:border-gray-500"
                          placeholder="Optional notes"
                        />
                      </div>
                    </div>
                    {currentRate.rate && (
                      <div className="mt-2 text-sm">
                        <span className="text-gray-600">Total: </span>
                        <span className="font-semibold text-green-600">
                          Rs. {((items[selectedItemForRates]?.quantity || 0) * parseFloat(currentRate.rate || '0')).toFixed(2)}
                        </span>
                        {items[selectedItemForRates]?.unitPrice && currentRate.rate && (
                          <span className={`ml-2 text-xs ${
                            parseFloat(currentRate.rate) < items[selectedItemForRates].unitPrice
                              ? 'text-green-600'
                              : parseFloat(currentRate.rate) > items[selectedItemForRates].unitPrice
                              ? 'text-red-600'
                              : 'text-gray-600'
                          }`}>
                            ({parseFloat(currentRate.rate) < items[selectedItemForRates].unitPrice ? '↓' : parseFloat(currentRate.rate) > items[selectedItemForRates].unitPrice ? '↑' : '='} 
                            {Math.abs(((parseFloat(currentRate.rate) - items[selectedItemForRates].unitPrice) / items[selectedItemForRates].unitPrice * 100)).toFixed(1)}%)
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Best Rate Summary */}
          {(() => {
            const ratesForItem = Object.entries(vendorRates)
              .filter(([key]) => key.startsWith(`item_${selectedItemForRates}_`))
              .map(([key, value]) => ({
                vendorId: key.split('_vendor_')[1],
                ...value
              }))
              .filter(r => r.rate && parseFloat(r.rate) > 0);

            if (ratesForItem.length > 0) {
              const bestRate = ratesForItem.reduce((min, r) => 
                parseFloat(r.rate) < parseFloat(min.rate) ? r : min
              );
              const bestVendor = vendors.find(v => v.id === bestRate.vendorId);

              return (
                <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold text-green-900 mb-2">💰 Best Rate</h4>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">{bestVendor?.name}</span> offers the best rate
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        Lead Time: {bestRate.leadTime || 'N/A'} days
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-600">Rs. {bestRate.rate}</p>
                      <button
                        onClick={() => {
                          const newItems = [...items];
                          newItems[selectedItemForRates].unitPrice = parseFloat(bestRate.rate);
                          setItems(newItems);
                          alert(`Price updated to Rs. ${bestRate.rate} from ${bestVendor?.name}`);
                        }}
                        className="mt-1 text-xs text-green-700 hover:text-green-800 font-medium"
                      >
                        Apply This Rate
                      </button>
                    </div>
                  </div>
                </div>
              );
            }
            return null;
          })()}
        </div>

        <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-2 border-t border-gray-200">
          <button
            onClick={() => {
              setShowRateComparison(false);
              setSelectedItemForRates(null);
            }}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {vendorRateModal}
      {rateComparisonModal}
    </>
  );
}

