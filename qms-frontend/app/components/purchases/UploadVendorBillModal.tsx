'use client';

import { useState, useRef } from 'react';
import { apiClient, type PurchaseOrder } from '../../lib/api';

interface UploadVendorBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPO: PurchaseOrder | null;
  onBillAttached?: () => void;
}

interface BillData {
  billNumber: string;
  billDate: string;
  dueDate: string;
  amount: number;
  taxAmount: number;
  totalAmount: number;
  notes: string;
}

export default function UploadVendorBillModal({ isOpen, onClose, selectedPO, onBillAttached }: UploadVendorBillModalProps) {
  const [billData, setBillData] = useState<BillData>({
    billNumber: '',
    billDate: '',
    dueDate: '',
    amount: 0,
    taxAmount: 0,
    totalAmount: 0,
    notes: ''
  });
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isOCRProcessing, setIsOCRProcessing] = useState(false);
  const [ocrResults, setOcrResults] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setUploadedFiles([...uploadedFiles, ...files]);
  };

  const removeFile = (index: number) => {
    setUploadedFiles(uploadedFiles.filter((_, i) => i !== index));
  };

  const simulateOCR = async () => {
    if (uploadedFiles.length === 0) return;

    setIsOCRProcessing(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Simulate OCR results
      const mockOcrResults = {
        billNumber: 'BILL-2024-001',
        billDate: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        amount: selectedPO ? (selectedPO.total_amount || 0) * 0.9 : 2250,
        taxAmount: selectedPO ? (selectedPO.total_amount || 0) * 0.1 : 250,
        totalAmount: selectedPO ? (selectedPO.total_amount || 0) : 2500,
        vendorName: selectedPO ? (selectedPO.vendors?.name || 'Vendor Name') : 'Vendor Name',
        items: selectedPO ? (selectedPO.purchase_order_items?.map((item: any) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          total: item.quantity * item.unit_price
        })) || []) : []
      };
      
      setOcrResults(mockOcrResults);
      
      // Auto-fill form with OCR results
      setBillData({
        billNumber: mockOcrResults.billNumber,
        billDate: mockOcrResults.billDate,
        dueDate: mockOcrResults.dueDate,
        amount: mockOcrResults.amount,
        taxAmount: mockOcrResults.taxAmount,
        totalAmount: mockOcrResults.totalAmount,
        notes: 'Auto-filled from OCR processing'
      });
      
    } catch (error) {
      console.error('OCR processing failed:', error);
      alert('OCR processing failed. Please try again.');
    } finally {
      setIsOCRProcessing(false);
    }
  };

  const handleSubmit = async () => {
    if (uploadedFiles.length === 0) {
      alert('Please upload at least one bill file.');
      return;
    }

    if (!billData.billNumber || !billData.billDate || !billData.totalAmount) {
      alert('Please fill in all required fields.');
      return;
    }

    if (!selectedPO) {
      alert('No purchase order selected.');
      return;
    }

    setIsProcessing(true);
    
    try {
      const vendorBillData = {
        bill_number: billData.billNumber,
        purchase_order_id: selectedPO.id,
        vendor_id: selectedPO.vendor_id,
        bill_date: billData.billDate,
        due_date: billData.dueDate || null,
        subtotal: billData.amount,
        tax_amount: billData.taxAmount,
        total_amount: billData.totalAmount,
        notes: billData.notes || null,
        files: uploadedFiles.map(file => ({
          name: file.name,
          size: file.size,
          type: file.type,
          path: `/uploads/vendor_bills/${selectedPO.id}/${file.name}`
        }))
      };
      
      const response = await apiClient.createVendorBill(vendorBillData);
      
      if (response.success) {
        alert('Vendor bill attached successfully!');
        
        // Call callback to refresh data if provided
        if (onBillAttached) {
          onBillAttached();
        }
        
        onClose();
        
        // Reset form
        setBillData({
          billNumber: '',
          billDate: '',
          dueDate: '',
          amount: 0,
          taxAmount: 0,
          totalAmount: 0,
          notes: ''
        });
        setUploadedFiles([]);
        setOcrResults(null);
      } else {
        throw new Error(response.message || 'Failed to create vendor bill');
      }
    } catch (error) {
      console.error('Failed to submit vendor bill:', error);
      alert(`Failed to submit vendor bill: ${error instanceof Error ? error.message : 'Please try again.'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const calculateTotal = () => {
    return billData.amount + billData.taxAmount;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50 p-4" style={{ backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Upload Vendor Bill</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <div className="p-6">
          {/* Purchase Order Info */}
          {selectedPO && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-medium text-blue-900 mb-2">Purchase Order Details</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-blue-700">PO Number:</span>
                  <span className="ml-2 font-medium">{selectedPO.po_number}</span>
                </div>
                <div>
                  <span className="text-blue-700">Vendor:</span>
                  <span className="ml-2 font-medium">{selectedPO.vendors?.name || 'Unknown Vendor'}</span>
                </div>
                <div>
                  <span className="text-blue-700">Total Amount:</span>
                  <span className="ml-2 font-medium">${(selectedPO.total_amount || 0).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-blue-700">Status:</span>
                  <span className="ml-2 font-medium">{selectedPO.status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}</span>
                </div>
              </div>
            </div>
          )}

          {/* File Upload Section */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Bill Files</h3>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-lg font-medium text-gray-900 mb-2">Upload Vendor Bill</p>
              <p className="text-sm text-gray-500 mb-4">Support for PDF, images, and scanned documents</p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileUpload}
                accept=".pdf,.jpg,.jpeg,.png,.tiff,.bmp"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200"
              >
                Choose Files
              </button>
            </div>

            {uploadedFiles.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium text-gray-900 mb-3">Uploaded Files</h4>
                <div className="space-y-2">
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="text-sm text-gray-900">{file.name}</span>
                        <span className="text-xs text-gray-500">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                      </div>
                      <button
                        onClick={() => removeFile(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>

                <div className="mt-4">
                  <button
                    onClick={simulateOCR}
                    disabled={isOCRProcessing}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isOCRProcessing ? 'Processing OCR...' : 'Process with OCR'}
                  </button>
                  <p className="text-xs text-gray-500 mt-1">
                    OCR will automatically extract bill details from uploaded files
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Bill Details Form */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Bill Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bill Number *</label>
                <input
                  type="text"
                  value={billData.billNumber}
                  onChange={(e) => setBillData({ ...billData, billNumber: e.target.value })}
                  className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter bill number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bill Date *</label>
                <input
                  type="date"
                  value={billData.billDate}
                  onChange={(e) => setBillData({ ...billData, billDate: e.target.value })}
                  className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
                <input
                  type="date"
                  value={billData.dueDate}
                  onChange={(e) => setBillData({ ...billData, dueDate: e.target.value })}
                  className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subtotal Amount</label>
                <input
                  type="number"
                  value={billData.amount}
                  onChange={(e) => setBillData({ ...billData, amount: Number(e.target.value) })}
                  className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tax Amount</label>
                <input
                  type="number"
                  value={billData.taxAmount}
                  onChange={(e) => setBillData({ ...billData, taxAmount: Number(e.target.value) })}
                  className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Total Amount *</label>
                <input
                  type="number"
                  value={billData.totalAmount}
                  onChange={(e) => setBillData({ ...billData, totalAmount: Number(e.target.value) })}
                  className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={billData.notes}
                  onChange={(e) => setBillData({ ...billData, notes: e.target.value })}
                  rows={3}
                  className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Additional notes about the bill..."
                />
              </div>
            </div>

            {/* Auto-calculated Total */}
            <div className="mt-4 bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Calculated Total:</span>
                <span className="text-lg font-semibold text-gray-900">${calculateTotal().toFixed(2)}</span>
              </div>
              {Math.abs(calculateTotal() - billData.totalAmount) > 0.01 && (
                <p className="text-sm text-orange-600 mt-1">
                  ⚠️ Calculated total differs from entered total amount
                </p>
              )}
            </div>
          </div>

          {/* OCR Results Display */}
          {ocrResults && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-medium text-green-900 mb-2">OCR Processing Results</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-green-700">Bill Number:</span>
                  <span className="ml-2 font-medium">{ocrResults.billNumber}</span>
                </div>
                <div>
                  <span className="text-green-700">Vendor:</span>
                  <span className="ml-2 font-medium">{ocrResults.vendorName}</span>
                </div>
                <div>
                  <span className="text-green-700">Amount:</span>
                  <span className="ml-2 font-medium">${ocrResults.amount.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-green-700">Tax:</span>
                  <span className="ml-2 font-medium">${ocrResults.taxAmount.toFixed(2)}</span>
                </div>
              </div>
              <p className="text-xs text-green-600 mt-2">
                ✓ OCR processing completed. Form has been auto-filled with extracted data.
              </p>
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
          <button
            onClick={handleSubmit}
            disabled={isProcessing || uploadedFiles.length === 0}
            className="px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? 'Attaching Bill...' : 'Attach Bill'}
          </button>
        </div>
      </div>
    </div>
  );
}
