'use client';

import { useState, useRef } from 'react';

interface ImportInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ImportInventoryModal({ isOpen, onClose }: ImportInventoryModalProps) {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResults, setImportResults] = useState<any>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      // Simulate file preview
      simulateFilePreview(file);
    }
  };

  const simulateFilePreview = (file: File) => {
    // Mock preview data - in real app, you'd parse the actual file
    const mockPreviewData = [
      {
        sku: 'LAP-002',
        name: 'Laptop HP EliteBook',
        description: 'Business laptop with Intel i5',
        category: 'Finished Good',
        vendor: 'Tech Supplies Inc',
        unitOfMeasure: 'Piece',
        lastPurchasePrice: 950,
        reorderPoint: 3,
        initialStock: 8
      },
      {
        sku: 'MON-003',
        name: 'Monitor 24" HD',
        description: 'Standard HD monitor',
        category: 'Finished Good',
        vendor: 'Display Solutions',
        unitOfMeasure: 'Piece',
        lastPurchasePrice: 180,
        reorderPoint: 5,
        initialStock: 12
      },
      {
        sku: 'RAW-005',
        name: 'Steel Sheet',
        description: 'Industrial steel sheets',
        category: 'Raw Material',
        vendor: 'Metal Suppliers Ltd',
        unitOfMeasure: 'KG',
        lastPurchasePrice: 2.5,
        reorderPoint: 500,
        initialStock: 1000
      }
    ];
    setPreviewData(mockPreviewData);
  };

  const removeFile = () => {
    setUploadedFile(null);
    setPreviewData([]);
    setImportResults(null);
  };

  const processImport = async () => {
    if (!uploadedFile) return;

    setIsProcessing(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Simulate import processing
      const mockResults = {
        totalRows: previewData.length,
        successful: previewData.length - 1,
        failed: 1,
        errors: [
          { row: 3, field: 'vendor', message: 'Vendor not found in system' }
        ],
        warnings: [
          { row: 2, field: 'reorderPoint', message: 'Reorder point is very low' }
        ]
      };
      
      setImportResults(mockResults);
      
    } catch (error) {
      console.error('Import processing failed:', error);
      alert('Import processing failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadTemplate = () => {
    const template = [
      'SKU,Name,Description,Category,Vendor,Unit of Measure,Last Purchase Price,Reorder Point,Initial Stock',
      'LAP-001,Laptop Dell XPS 13,13-inch premium laptop,Finished Good,Tech Supplies Inc,Piece,1200,5,15',
      'MON-002,Monitor 27" 4K,Ultra HD monitor,Finished Good,Display Solutions,Piece,800,3,5'
    ].join('\n');

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'inventory_import_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
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
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-lg font-medium text-gray-900 mb-2">Upload Inventory File</p>
                <p className="text-sm text-gray-500 mb-4">Drag and drop or click to browse</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileUpload}
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200"
                >
                  Choose File
                </button>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="font-medium text-gray-900">{uploadedFile.name}</p>
                      <p className="text-sm text-gray-500">{(uploadedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                  <button
                    onClick={removeFile}
                    className="text-red-600 hover:text-red-800"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Template Download */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Template</h3>
            <button
              onClick={downloadTemplate}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors duration-200"
            >
              <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download CSV Template
            </button>
          </div>

          {/* Data Preview */}
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
                        <td className="py-2 px-2">{row.vendor}</td>
                        <td className="py-2 px-2">{row.unitOfMeasure}</td>
                        <td className="py-2 px-2">${row.lastPurchasePrice}</td>
                        <td className="py-2 px-2">{row.reorderPoint}</td>
                        <td className="py-2 px-2">{row.initialStock}</td>
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
              onClick={processImport}
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
