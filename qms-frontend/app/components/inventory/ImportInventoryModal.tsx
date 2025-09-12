'use client';

import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { apiClient } from '../../lib/api';

interface ImportInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => Promise<void>;
}

interface ParsedInventoryItem {
  sku: string;
  name: string;
  description?: string;
  category: string;
  type: string;
  unitOfMeasure: string;
  currentStock: number;
  reorderPoint: number;
  maxStockLevel?: number;
  lastPurchasePrice: number;
  averageCost?: number;
  sellingPrice?: number;
  status: string;
  errors?: string[];
}

export default function ImportInventoryModal({ isOpen, onClose, onImportComplete }: ImportInventoryModalProps) {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [importResults, setImportResults] = useState<any>(null);
  const [previewData, setPreviewData] = useState<ParsedInventoryItem[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (file: File) => {
    if (file) {
      setUploadedFile(file);
      setParseErrors([]);
      setImportResults(null);
      parseFile(file);
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const parseFile = async (file: File) => {
    setIsParsing(true);
    setPreviewData([]);
    setParseErrors([]);

    try {
      let jsonData: any[] = [];
      
      if (file.name.toLowerCase().endsWith('.csv')) {
        // Parse CSV file
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            if (results.errors.length > 0) {
              setParseErrors(results.errors.map(err => err.message));
            }
            jsonData = results.data as any[];
            processData(jsonData);
          },
          error: (error) => {
            setParseErrors([`CSV parsing error: ${error.message}`]);
            setIsParsing(false);
          }
        });
      } else if (file.name.toLowerCase().match(/\.(xlsx|xls)$/)) {
        // Parse Excel file
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        jsonData = XLSX.utils.sheet_to_json(worksheet);
        processData(jsonData);
      } else {
        setParseErrors(['Unsupported file format. Please upload CSV or Excel files.']);
        setIsParsing(false);
      }
    } catch (error) {
      console.error('File parsing error:', error);
      setParseErrors([`File parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`]);
      setIsParsing(false);
    }
  };

  const processData = (rawData: any[]) => {
    const processedData: ParsedInventoryItem[] = [];
    const errors: string[] = [];

    rawData.forEach((row, index) => {
      const rowNumber = index + 2; // +2 because index starts at 0 and we skip header
      const item: ParsedInventoryItem = {
        sku: '',
        name: '',
        description: '',
        category: '',
        type: 'finished_good',
        unitOfMeasure: '',
        currentStock: 0,
        reorderPoint: 0,
        maxStockLevel: 0,
        lastPurchasePrice: 0,
        averageCost: 0,
        sellingPrice: 0,
        status: 'active',
        errors: []
      };

      // Map and validate fields
      try {
        // Required fields
        item.sku = String(row.SKU || row.sku || '').trim();
        item.name = String(row.Name || row.name || '').trim();
        item.category = String(row.Category || row.category || '').trim();
        item.unitOfMeasure = String(row.UnitOfMeasure || row['Unit of Measure'] || row.unit_of_measure || '').trim();
        
        // Optional fields
        item.description = String(row.Description || row.description || '').trim();
        item.type = String(row.Type || row.type || 'finished_good').toLowerCase().replace(/\s+/g, '_');
        item.status = String(row.Status || row.status || 'active').toLowerCase();
        
        // Numeric fields
        item.currentStock = parseFloat(row.CurrentStock || row['Current Stock'] || row.current_stock || '0') || 0;
        item.reorderPoint = parseFloat(row.ReorderPoint || row['Reorder Point'] || row.reorder_point || '0') || 0;
        item.maxStockLevel = parseFloat(row.MaxStockLevel || row['Max Stock Level'] || row.max_stock_level || '0') || 0;
        item.lastPurchasePrice = parseFloat(row.LastPurchasePrice || row['Last Purchase Price'] || row.last_purchase_price || '0') || 0;
        item.averageCost = parseFloat(row.AverageCost || row['Average Cost'] || row.average_cost || item.lastPurchasePrice) || item.lastPurchasePrice;
        item.sellingPrice = parseFloat(row.SellingPrice || row['Selling Price'] || row.selling_price || '0') || 0;

        // Validation
        if (!item.sku) item.errors?.push('SKU is required');
        if (!item.name) item.errors?.push('Name is required');
        if (!item.category) item.errors?.push('Category is required');
        if (!item.unitOfMeasure) item.errors?.push('Unit of Measure is required');
        if (item.lastPurchasePrice < 0) item.errors?.push('Price cannot be negative');
        if (item.currentStock < 0) item.errors?.push('Stock cannot be negative');

        // Valid types
        const validTypes = ['raw_material', 'finished_good', 'service', 'spare_parts'];
        if (!validTypes.includes(item.type)) {
          item.type = 'finished_good';
          item.errors?.push('Invalid type, defaulted to finished_good');
        }

        // Valid statuses
        const validStatuses = ['active', 'inactive', 'discontinued'];
        if (!validStatuses.includes(item.status)) {
          item.status = 'active';
          item.errors?.push('Invalid status, defaulted to active');
        }

        processedData.push(item);

      } catch (error) {
        errors.push(`Row ${rowNumber}: Failed to process - ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });

    if (errors.length > 0) {
      setParseErrors(errors);
    }

    setPreviewData(processedData);
    setIsParsing(false);
  };

  const handleImport = async () => {
    if (!previewData.length) return;

    setIsProcessing(true);
    
    try {
      const validItems = previewData.filter(item => !item.errors || item.errors.length === 0);
      const itemsWithErrors = previewData.filter(item => item.errors && item.errors.length > 0);
      
      let successCount = 0;
      let errorCount = 0;
      const importErrors: string[] = [];

      for (const item of validItems) {
        try {
          const productData = {
            sku: item.sku,
            name: item.name,
            description: item.description || '',
            type: item.type,
            unit_of_measure: item.unitOfMeasure,
            current_stock: item.currentStock,
            reorder_point: item.reorderPoint,
            max_stock_level: item.maxStockLevel || null,
            last_purchase_price: item.lastPurchasePrice,
            average_cost: item.averageCost || item.lastPurchasePrice,
            selling_price: item.sellingPrice || null,
            status: item.status
          };

          const response = await apiClient.createProduct(productData);
          
          if (response.success || response.data) {
            successCount++;
          } else {
            errorCount++;
            importErrors.push(`${item.sku}: Failed to create product`);
          }
        } catch (error: any) {
          errorCount++;
          const errorMessage = error.response?.data?.error || error.message || 'Unknown error';
          importErrors.push(`${item.sku}: ${errorMessage}`);
        }
      }

      // Count items that had validation errors
      errorCount += itemsWithErrors.length;
      itemsWithErrors.forEach(item => {
        importErrors.push(`${item.sku}: ${item.errors?.join(', ')}`);
      });

      setImportResults({
        totalRows: previewData.length,
        successful: successCount,
        failed: errorCount,
        errors: importErrors.map((error, index) => ({
          row: index + 2,
          field: 'general',
          message: error
        })),
        warnings: []
      });

      if (successCount > 0) {
        await onImportComplete();
      }

    } catch (error) {
      console.error('Import error:', error);
      setImportResults({
        totalRows: previewData.length,
        successful: 0,
        failed: previewData.length,
        errors: [{
          row: 1,
          field: 'general',
          message: 'Failed to process import: ' + (error instanceof Error ? error.message : 'Unknown error')
        }],
        warnings: []
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadSampleFile = () => {
    const sampleData = [
      {
        SKU: 'COMP-001',
        Name: 'Dell Laptop',
        Description: 'Dell Inspiron 15 3000 Series',
        Category: 'Electronics',
        Type: 'finished_good',
        'Unit of Measure': 'Piece',
        'Current Stock': 10,
        'Reorder Point': 5,
        'Max Stock Level': 50,
        'Last Purchase Price': 45000,
        'Average Cost': 45000,
        'Selling Price': 52000,
        Status: 'active'
      },
      {
        SKU: 'RAW-001',
        Name: 'Steel Rod',
        Description: 'High grade steel rod',
        Category: 'Raw Materials',
        Type: 'raw_material',
        'Unit of Measure': 'KG',
        'Current Stock': 500,
        'Reorder Point': 100,
        'Max Stock Level': 1000,
        'Last Purchase Price': 85,
        'Average Cost': 85,
        'Selling Price': 120,
        Status: 'active'
      }
    ];

    const csv = Papa.unparse(sampleData);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sample-inventory-import.csv';
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const resetModal = () => {
    setUploadedFile(null);
    setPreviewData([]);
    setImportResults(null);
    setParseErrors([]);
    setIsProcessing(false);
    setIsParsing(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Import Inventory from CSV/Excel</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <div className="p-6">
          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-blue-900 mb-2">Import Instructions</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Supported formats: CSV, Excel (.xlsx, .xls)</li>
              <li>• Required columns: SKU, Name, Category, Vendor, Unit of Measure, Last Purchase Price</li>
              <li>• Optional columns: Description, Reorder Point, Initial Stock</li>
              <li>• Maximum file size: 10MB</li>
              <li>• Download the template below for reference</li>
            </ul>
          </div>

          {/* File Upload */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload File</h3>
            
            {!uploadedFile ? (
              <div
                className={`border-2 border-dashed ${isDragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300'} rounded-lg p-8 text-center transition-colors`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-lg font-medium text-gray-900 mb-2">Upload Inventory File</p>
                <p className="text-sm text-gray-500 mb-4">Drag and drop your CSV/Excel file here, or click to browse</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleInputChange}
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200"
                >
                  Choose File
                </button>
                <p className="text-xs text-gray-500 mt-2">Supports CSV, XLS, and XLSX files (max 10MB)</p>
              </div>
            ) : (
              <div className="border border-gray-300 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <svg className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">{uploadedFile.name}</p>
                      <p className="text-xs text-gray-500">
                        {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={resetModal}
                    className="text-red-600 hover:text-red-500"
                    disabled={isProcessing || isParsing}
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}

            {/* Parsing Status */}
            {isParsing && (
              <div className="text-center py-4">
                <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-sm shadow rounded-md text-blue-500 bg-blue-100">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Parsing file...
                </div>
              </div>
            )}

            {/* Parse Errors */}
            {parseErrors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4 mt-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      File parsing errors:
                    </h3>
                    <div className="mt-2 text-sm text-red-700">
                      <ul className="list-disc pl-5 space-y-1">
                        {parseErrors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Download Sample File */}
          <div className="text-center mb-6">
            <button
              onClick={downloadSampleFile}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download Sample File
            </button>
          </div>

          {/* File Preview */}
          {previewData.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Preview</h3>
              <div className="bg-gray-50 rounded-lg p-4 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-2">SKU</th>
                      <th className="text-left py-2 px-2">Name</th>
                      <th className="text-left py-2 px-2">Category</th>
                      <th className="text-left py-2 px-2">Vendor</th>
                      <th className="text-left py-2 px-2">Unit</th>
                      <th className="text-left py-2 px-2">Price</th>
                      <th className="text-left py-2 px-2">Reorder</th>
                      <th className="text-left py-2 px-2">Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((row, index) => (
                      <tr key={index} className="border-b border-gray-200 last:border-b-0">
                        <td className="py-2 px-2">{row.sku}</td>
                        <td className="py-2 px-2">{row.name}</td>
                        <td className="py-2 px-2">{row.category}</td>
                        <td className="py-2 px-2">{row.description}</td>
                        <td className="py-2 px-2">{row.unitOfMeasure}</td>
                        <td className="py-2 px-2">Rs. {row.lastPurchasePrice}</td>
                        <td className="py-2 px-2">{row.reorderPoint}</td>
                        <td className="py-2 px-2">{row.maxStockLevel}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Import Results */}
          {importResults && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Import Results</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{importResults.totalRows}</div>
                    <div className="text-sm text-gray-600">Total Rows</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{importResults.successful}</div>
                    <div className="text-sm text-gray-600">Successful</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{importResults.failed}</div>
                    <div className="text-sm text-gray-600">Failed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">{importResults.warnings.length}</div>
                    <div className="text-sm text-gray-600">Warnings</div>
                  </div>
                </div>

                {importResults.errors.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-medium text-red-900 mb-2">Errors</h4>
                    <div className="space-y-2">
                      {importResults.errors.map((error: any, index: number) => (
                        <div key={index} className="text-sm text-red-700 bg-red-50 p-2 rounded">
                          Row {error.row}: {error.field} - {error.message}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {importResults.warnings.length > 0 && (
                  <div>
                    <h4 className="font-medium text-yellow-900 mb-2">Warnings</h4>
                    <div className="space-y-2">
                      {importResults.warnings.map((warning: any, index: number) => (
                        <div key={index} className="text-sm text-yellow-700 bg-yellow-50 p-2 rounded">
                          Row {warning.row}: {warning.field} - {warning.message}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
            Cancel
          </button>
          {uploadedFile && !importResults && (
            <button
              onClick={handleImport}
              disabled={isProcessing}
              className="px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? 'Processing...' : 'Process Import'}
            </button>
          )}
          {importResults && (
            <button
              onClick={onClose}
              className="px-6 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors duration-200"
            >
              Complete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
