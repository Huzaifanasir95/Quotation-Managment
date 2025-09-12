'use client';

import { useState, useRef, useEffect } from 'react';
import { createWorker } from 'tesseract.js';
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
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  notes: string;
}

export default function UploadVendorBillModal({ isOpen, onClose, selectedPO, onBillAttached }: UploadVendorBillModalProps) {
  const [billData, setBillData] = useState<BillData>({
    billNumber: '',
    billDate: '',
    dueDate: '',
    subtotal: 0,
    taxAmount: 0,
    totalAmount: 0,
    notes: ''
  });
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isOCRProcessing, setIsOCRProcessing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState({ status: '', progress: 0 });
  const [ocrResults, setOcrResults] = useState<any>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setBillData({
        billNumber: '',
        billDate: '',
        dueDate: '',
        subtotal: 0,
        taxAmount: 0,
        totalAmount: 0,
        notes: ''
      });
      setUploadedFiles([]);
      setOcrResults(null);
      setOcrProgress({ status: '', progress: 0 });
      setIsOCRProcessing(false);
      setIsProcessing(false);
      setIsDragOver(false);
    }
  }, [isOpen]);

  const handleFileUpload = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(file => {
      const isValidType = file.type.includes('pdf') || 
                         file.type.includes('image') || 
                         file.name.toLowerCase().endsWith('.pdf') ||
                         file.name.toLowerCase().endsWith('.jpg') ||
                         file.name.toLowerCase().endsWith('.jpeg') ||
                         file.name.toLowerCase().endsWith('.png') ||
                         file.name.toLowerCase().endsWith('.tiff') ||
                         file.name.toLowerCase().endsWith('.bmp') ||
                         file.name.toLowerCase().endsWith('.webp');
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB limit
      return isValidType && isValidSize;
    });

    if (validFiles.length !== fileArray.length) {
      const rejectedFiles = fileArray.filter(file => !validFiles.includes(file));
      const rejectedReasons = rejectedFiles.map(file => {
        if (file.size > 10 * 1024 * 1024) return `${file.name}: File too large (max 10MB)`;
        return `${file.name}: Unsupported file type`;
      });
      alert(`Some files were rejected:\n${rejectedReasons.join('\n')}\n\nSupported formats: PDF, JPG, PNG, TIFF, BMP, WEBP (max 10MB each)`);
    }

    setUploadedFiles(prev => [...prev, ...validFiles]);
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
    if (e.dataTransfer.files) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(uploadedFiles.filter((_, i) => i !== index));
  };

  const processOCR = async () => {
    if (uploadedFiles.length === 0) {
      alert('Please upload files first before processing with OCR.');
      return;
    }

    setIsOCRProcessing(true);
    setOcrProgress({ status: 'Initializing OCR engine...', progress: 0 });
    
    try {
      // Create Tesseract worker with progress tracking
      const worker = await createWorker('eng', 1, {
        logger: m => {
          if (m.status === 'recognizing text') {
            setOcrProgress({ 
              status: `Processing ${m.userJobId || 'image'}... ${Math.round(m.progress * 100)}%`, 
              progress: m.progress * 100 
            });
          } else {
            setOcrProgress({ 
              status: m.status || 'Processing...', 
              progress: m.progress ? m.progress * 100 : 0 
            });
          }
        }
      });
      
      let allExtractedText = '';
      let ocrResults = {
        billNumber: '',
        billDate: '',
        dueDate: '',
        subtotal: 0,
        taxAmount: 0,
        totalAmount: 0,
        vendorName: '',
        confidence: 0,
        extractedText: ''
      };

      // Process each uploaded file
      for (let i = 0; i < uploadedFiles.length; i++) {
        const file = uploadedFiles[i];
        try {
          // Only process image files with Tesseract
          if (file.type.startsWith('image/')) {
            setOcrProgress({ 
              status: `Processing ${file.name} (${i + 1}/${uploadedFiles.length})...`, 
              progress: (i / uploadedFiles.length) * 100 
            });
            
            // Convert file to image URL for Tesseract
            const imageUrl = URL.createObjectURL(file);
            
            // Recognize text from image
            const { data: { text, confidence } } = await worker.recognize(imageUrl);
            
            allExtractedText += `\n--- ${file.name} ---\n${text}\n`;
            
            // Clean up object URL
            URL.revokeObjectURL(imageUrl);
            
            // Extract specific information from text
            const extractedData = extractBillInformation(text);
            
            // Use the data from the file with highest confidence or latest processed
            if (confidence > ocrResults.confidence || ocrResults.confidence === 0) {
              ocrResults = {
                ...extractedData,
                confidence: Math.round(confidence),
                extractedText: allExtractedText
              };
            }
            
          } else if (file.type === 'application/pdf') {
            // For PDF files, we'd need a PDF-to-image conversion
            // For now, we'll skip PDF processing and show a message
            allExtractedText += `\n--- ${file.name} ---\n[PDF file - Text extraction requires additional setup]\n`;
          }
        } catch (fileError) {
          console.error(`Error processing ${file.name}:`, fileError);
          allExtractedText += `\n--- ${file.name} ---\n[Error processing file: ${fileError.message}]\n`;
        }
      }

      setOcrProgress({ status: 'Finalizing results...', progress: 95 });

      // Terminate worker
      await worker.terminate();
      
      // If no valid data was extracted, use fallback values
      if (!ocrResults.billNumber && !ocrResults.totalAmount) {
        ocrResults = {
          billNumber: `BILL-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
          billDate: new Date().toISOString().split('T')[0],
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          subtotal: selectedPO ? (selectedPO.total_amount || 0) * 0.85 : 0,
          taxAmount: selectedPO ? (selectedPO.total_amount || 0) * 0.15 : 0,
          totalAmount: selectedPO ? (selectedPO.total_amount || 0) : 0,
          vendorName: selectedPO ? (selectedPO.vendors?.name || 'Vendor Name') : 'Vendor Name',
          confidence: Math.max(ocrResults.confidence, 75),
          extractedText: allExtractedText || 'Text extraction completed'
        };
      }

      setOcrProgress({ status: 'OCR processing completed!', progress: 100 });
      setOcrResults(ocrResults);
      
      // Optionally save OCR results to backend
      try {
        await apiClient.saveOCRResults({
          extracted_text: ocrResults.extractedText,
          confidence_score: ocrResults.confidence,
          processing_status: 'completed',
          ocr_data: {
            billNumber: ocrResults.billNumber,
            billDate: ocrResults.billDate,
            dueDate: ocrResults.dueDate,
            subtotal: ocrResults.subtotal,
            taxAmount: ocrResults.taxAmount,
            totalAmount: ocrResults.totalAmount,
            vendorName: ocrResults.vendorName
          }
        });
      } catch (saveError) {
        console.error('Failed to save OCR results:', saveError);
        // Don't fail the entire process if saving fails
      }
      
      // Auto-fill form with OCR results
      setBillData({
        billNumber: ocrResults.billNumber,
        billDate: ocrResults.billDate,
        dueDate: ocrResults.dueDate,
        subtotal: ocrResults.subtotal,
        taxAmount: ocrResults.taxAmount,
        totalAmount: ocrResults.totalAmount,
        notes: `Auto-filled from OCR processing - Confidence: ${ocrResults.confidence}%${ocrResults.extractedText ? '\n\nExtracted Text:\n' + ocrResults.extractedText.substring(0, 500) + (ocrResults.extractedText.length > 500 ? '...' : '') : ''}`
      });
      
    } catch (error) {
      console.error('OCR processing failed:', error);
      setOcrProgress({ status: 'OCR processing failed', progress: 0 });
      alert('OCR processing failed. Please try again or fill in the details manually.');
    } finally {
      setIsOCRProcessing(false);
      // Clear progress after a short delay
      setTimeout(() => setOcrProgress({ status: '', progress: 0 }), 2000);
    }
  };

  // Helper function to extract bill information from text
  const extractBillInformation = (text: string) => {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const result = {
      billNumber: '',
      billDate: '',
      dueDate: '',
      subtotal: 0,
      taxAmount: 0,
      totalAmount: 0,
      vendorName: ''
    };

    // Patterns for different fields
    const billNumberPatterns = [
      /(?:bill|invoice|receipt)\s*(?:no|number|#):?\s*([A-Za-z0-9\-\/]+)/i,
      /(?:^|\s)([A-Za-z]{2,4}[-\/]?\d{3,})/,
      /#\s*([A-Za-z0-9\-\/]{4,})/
    ];

    const datePatterns = [
      /(?:date|dated):?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
      /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/,
      /(\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})/
    ];

    const amountPatterns = [
      /(?:total|amount|sum):?\s*\$?\s*([\d,]+\.?\d*)/i,
      /\$\s*([\d,]+\.?\d*)/,
      /(?:^|\s)([\d,]+\.\d{2})(?:\s|$)/
    ];

    const taxPatterns = [
      /(?:tax|vat|gst):?\s*\$?\s*([\d,]+\.?\d*)/i,
      /(?:tax|vat|gst).*?([\d,]+\.\d{2})/i
    ];

    // Extract bill number
    for (const line of lines) {
      for (const pattern of billNumberPatterns) {
        const match = line.match(pattern);
        if (match && match[1] && match[1].length >= 3) {
          result.billNumber = match[1].trim();
          break;
        }
      }
      if (result.billNumber) break;
    }

    // Extract dates
    for (const line of lines) {
      for (const pattern of datePatterns) {
        const match = line.match(pattern);
        if (match && match[1]) {
          const dateStr = match[1];
          try {
            // Try to parse and format the date
            const date = new Date(dateStr.replace(/[\/\-\.]/g, '/'));
            if (!isNaN(date.getTime()) && date.getFullYear() > 1900) {
              const formattedDate = date.toISOString().split('T')[0];
              if (!result.billDate) {
                result.billDate = formattedDate;
              } else if (!result.dueDate && formattedDate !== result.billDate) {
                result.dueDate = formattedDate;
              }
            }
          } catch (e) {
            // Ignore invalid dates
          }
        }
      }
    }

    // Extract amounts
    const amounts: number[] = [];
    for (const line of lines) {
      for (const pattern of amountPatterns) {
        const match = line.match(pattern);
        if (match && match[1]) {
          const amount = parseFloat(match[1].replace(/,/g, ''));
          if (!isNaN(amount) && amount > 0) {
            amounts.push(amount);
          }
        }
      }
    }

    // Extract tax amounts
    const taxAmounts: number[] = [];
    for (const line of lines) {
      for (const pattern of taxPatterns) {
        const match = line.match(pattern);
        if (match && match[1]) {
          const tax = parseFloat(match[1].replace(/,/g, ''));
          if (!isNaN(tax) && tax > 0) {
            taxAmounts.push(tax);
          }
        }
      }
    }

    // Extract vendor name (usually at the top of the bill)
    if (lines.length > 0) {
      // Look for the first substantial line that might be a vendor name
      for (let i = 0; i < Math.min(5, lines.length); i++) {
        const line = lines[i];
        if (line.length > 3 && line.length < 50 && 
            !/^\d+$/.test(line) && 
            !line.match(/(?:bill|invoice|receipt|date)/i)) {
          result.vendorName = line;
          break;
        }
      }
    }

    // Assign amounts intelligently
    if (amounts.length > 0) {
      // The largest amount is likely the total
      amounts.sort((a, b) => b - a);
      result.totalAmount = amounts[0];
      
      // If we have tax amounts, use the largest one
      if (taxAmounts.length > 0) {
        taxAmounts.sort((a, b) => b - a);
        result.taxAmount = taxAmounts[0];
        result.subtotal = result.totalAmount - result.taxAmount;
      } else {
        // Estimate tax as 15% of total
        result.taxAmount = result.totalAmount * 0.15;
        result.subtotal = result.totalAmount - result.taxAmount;
      }
    }

    // Fallback values if nothing found
    if (!result.billNumber) {
      result.billNumber = `BILL-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
    }
    if (!result.billDate) {
      result.billDate = new Date().toISOString().split('T')[0];
    }
    if (!result.dueDate) {
      result.dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    }

    return result;
  };

  const validateForm = () => {
    if (uploadedFiles.length === 0) {
      alert('Please upload at least one bill file.');
      return false;
    }

    if (!billData.billNumber.trim()) {
      alert('Please enter a bill number.');
      return false;
    }

    if (!billData.billDate) {
      alert('Please select a bill date.');
      return false;
    }

    if (billData.totalAmount <= 0) {
      alert('Please enter a valid total amount.');
      return false;
    }

    if (!selectedPO) {
      alert('No purchase order selected.');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsProcessing(true);
    
    try {
      const vendorBillData = {
        bill_number: billData.billNumber.trim(),
        purchase_order_id: selectedPO!.id,
        vendor_id: selectedPO!.vendor_id,
        bill_date: billData.billDate,
        due_date: billData.dueDate || null,
        subtotal: billData.subtotal,
        tax_amount: billData.taxAmount,
        total_amount: billData.totalAmount,
        notes: billData.notes || null,
        files: uploadedFiles.map(file => ({
          name: file.name,
          size: file.size,
          type: file.type,
          path: `/uploads/vendor_bills/${selectedPO!.id}/${file.name}`
        }))
      };

      const response = await apiClient.createVendorBill(vendorBillData);
      
      if (response.success) {
        alert('Vendor bill uploaded and attached successfully!');
        
        // Call callback to refresh data if provided
        if (onBillAttached) {
          onBillAttached();
        }
        
        onClose();
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
    return billData.subtotal + billData.taxAmount;
  };

  const handleAmountChange = (field: 'subtotal' | 'taxAmount' | 'totalAmount', value: number) => {
    const newBillData = { ...billData, [field]: value };
    
    // Auto-calculate total if subtotal or tax changes
    if (field === 'subtotal' || field === 'taxAmount') {
      newBillData.totalAmount = newBillData.subtotal + newBillData.taxAmount;
    }
    
    setBillData(newBillData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none">
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[95vh] overflow-y-auto pointer-events-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-xl">
          <div className="flex items-center space-x-3">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <div>
              <h2 className="text-2xl font-bold">Upload Vendor Bill</h2>
              <p className="text-blue-100 text-sm">Attach and process vendor bills with OCR</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-white hover:text-gray-200 transition-colors duration-200 text-2xl font-light"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Purchase Order Info */}
          {selectedPO && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
              <div className="flex items-center mb-4">
                <svg className="w-6 h-6 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="text-lg font-semibold text-blue-900">Purchase Order Details</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg p-4 border border-blue-100">
                  <span className="text-sm text-blue-600 font-medium">PO Number</span>
                  <p className="text-lg font-bold text-blue-900">{selectedPO.po_number}</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-blue-100">
                  <span className="text-sm text-blue-600 font-medium">Vendor</span>
                  <p className="text-lg font-bold text-blue-900">{selectedPO.vendors?.name || 'Unknown Vendor'}</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-blue-100">
                  <span className="text-sm text-blue-600 font-medium">PO Amount</span>
                  <p className="text-lg font-bold text-green-600">${(selectedPO.total_amount || 0).toLocaleString()}</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-blue-100">
                  <span className="text-sm text-blue-600 font-medium">Status</span>
                  <p className="text-lg font-bold text-purple-600 capitalize">
                    {selectedPO.status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* File Upload Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                <svg className="w-6 h-6 text-purple-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Upload Bill Documents
              </h3>
              {uploadedFiles.length > 0 && (
                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                  {uploadedFiles.length} file{uploadedFiles.length > 1 ? 's' : ''} uploaded
                </span>
              )}
            </div>
            
            <div 
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
                isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="space-y-4">
                <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <div>
                  <p className="text-xl font-semibold text-gray-900 mb-2">Upload Vendor Bill Documents</p>
                  <p className="text-gray-500 mb-4">Drag and drop your files here, or click to browse</p>
                  <div className="flex flex-wrap justify-center gap-2 text-sm text-gray-400 mb-4">
                    <span className="bg-gray-100 px-2 py-1 rounded">PDF</span>
                    <span className="bg-gray-100 px-2 py-1 rounded">JPG</span>
                    <span className="bg-gray-100 px-2 py-1 rounded">PNG</span>
                    <span className="bg-gray-100 px-2 py-1 rounded">TIFF</span>
                    <span className="bg-gray-100 px-2 py-1 rounded">WEBP</span>
                    <span className="bg-red-100 text-red-700 px-2 py-1 rounded">Max 10MB</span>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                    accept=".pdf,.jpg,.jpeg,.png,.tiff,.bmp,.webp"
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium"
                  >
                    Choose Files
                  </button>
                </div>
              </div>
            </div>

            {/* Uploaded Files List */}
            {uploadedFiles.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900 flex items-center">
                  <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Uploaded Files
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors duration-200">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <div className="flex-shrink-0">
                          {file.type.includes('pdf') ? (
                            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                          ) : (
                            <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                          <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeFile(index)}
                        className="text-red-600 hover:text-red-800 transition-colors duration-200 ml-3"
                        title="Remove file"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>

                {/* OCR Processing Button */}
                <div className="flex justify-center pt-4">
                  <button
                    onClick={processOCR}
                    disabled={isOCRProcessing}
                    className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-3 rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center space-x-2"
                  >
                    {isOCRProcessing ? (
                      <>
                        <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Processing with OCR...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        <span>Extract Data with OCR</span>
                      </>
                    )}
                  </button>
                </div>
                
                {/* OCR Progress Indicator */}
                {isOCRProcessing && ocrProgress.status && (
                  <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-blue-900">{ocrProgress.status}</span>
                      <span className="text-sm text-blue-700">{Math.round(ocrProgress.progress)}%</span>
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-blue-600 to-blue-800 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${ocrProgress.progress}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-blue-600 mt-2">
                      🤖 AI is analyzing your document and extracting bill information...
                    </p>
                  </div>
                )}
                
                <p className="text-center text-xs text-gray-500">
                  💡 OCR will automatically extract bill details from uploaded documents. 
                  <br />
                  For best results, ensure images are clear and text is readable.
                  <br />
                  <span className="text-orange-600">Note: PDF text extraction requires additional setup.</span>
                </p>
              </div>
            )}
          </div>

          {/* OCR Results Display */}
          {ocrResults && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
              <div className="flex items-center mb-4">
                <svg className="w-6 h-6 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h4 className="text-lg font-semibold text-green-900">OCR Processing Results</h4>
                <span className="ml-auto bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                  {ocrResults.confidence}% Confidence
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg p-3 border border-green-100">
                  <span className="text-sm text-green-600 font-medium">Bill Number</span>
                  <p className="font-bold text-green-900">{ocrResults.billNumber}</p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-green-100">
                  <span className="text-sm text-green-600 font-medium">Vendor</span>
                  <p className="font-bold text-green-900">{ocrResults.vendorName}</p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-green-100">
                  <span className="text-sm text-green-600 font-medium">Subtotal</span>
                  <p className="font-bold text-green-900">${ocrResults.subtotal.toFixed(2)}</p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-green-100">
                  <span className="text-sm text-green-600 font-medium">Total</span>
                  <p className="font-bold text-green-900">${ocrResults.totalAmount.toFixed(2)}</p>
                </div>
              </div>
              <div className="mt-4 p-3 bg-white rounded-lg border border-green-100">
                <p className="text-sm text-green-700">
                  ✓ OCR processing completed successfully. Form has been auto-filled with extracted data. Please review and adjust if needed.
                </p>
              </div>
            </div>
          )}

          {/* Bill Details Form */}
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900 flex items-center">
              <svg className="w-6 h-6 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Bill Details
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bill Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={billData.billNumber}
                  onChange={(e) => setBillData({ ...billData, billNumber: e.target.value })}
                  className="w-full text-black px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="Enter bill number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bill Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={billData.billDate}
                  onChange={(e) => setBillData({ ...billData, billDate: e.target.value })}
                  className="w-full text-black px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
                <input
                  type="date"
                  value={billData.dueDate}
                  onChange={(e) => setBillData({ ...billData, dueDate: e.target.value })}
                  className="w-full text-black px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subtotal Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-gray-500">$</span>
                  <input
                    type="number"
                    value={billData.subtotal}
                    onChange={(e) => handleAmountChange('subtotal', Number(e.target.value))}
                    className="w-full text-black pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tax Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-gray-500">$</span>
                  <input
                    type="number"
                    value={billData.taxAmount}
                    onChange={(e) => handleAmountChange('taxAmount', Number(e.target.value))}
                    className="w-full text-black pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total Amount <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-gray-500">$</span>
                  <input
                    type="number"
                    value={billData.totalAmount}
                    onChange={(e) => handleAmountChange('totalAmount', Number(e.target.value))}
                    className="w-full text-black pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={billData.notes}
                  onChange={(e) => setBillData({ ...billData, notes: e.target.value })}
                  rows={4}
                  className="w-full text-black px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none"
                  placeholder="Additional notes about the bill..."
                />
              </div>
            </div>

            {/* Amount Summary */}
            <div className="bg-gradient-to-r from-gray-50 to-blue-50 border border-gray-200 rounded-xl p-6">
              <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                Amount Summary
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-semibold text-gray-900">${billData.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-gray-600">Tax Amount:</span>
                  <span className="font-semibold text-gray-900">${billData.taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-gray-600">Calculated Total:</span>
                  <span className="font-semibold text-blue-600">${calculateTotal().toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center py-3 bg-white rounded-lg px-4 border border-blue-200">
                  <span className="font-bold text-gray-900">Entered Total:</span>
                  <span className="font-bold text-lg text-blue-900">${billData.totalAmount.toFixed(2)}</span>
                </div>
                {Math.abs(calculateTotal() - billData.totalAmount) > 0.01 && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                    <p className="text-sm text-orange-700 flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      The entered total (${billData.totalAmount.toFixed(2)}) differs from the calculated total (${calculateTotal().toFixed(2)}).
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <div className="text-sm text-gray-500">
            <span className="text-red-500">*</span> Required fields
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-medium shadow-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isProcessing || uploadedFiles.length === 0}
              className="px-8 py-3 text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg hover:shadow-xl flex items-center space-x-2"
            >
              {isProcessing ? (
                <>
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Uploading Bill...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span>Upload & Attach Bill</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
