'use client';

import { useState, useRef } from 'react';

interface UploadInquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UploadInquiryModal({ isOpen, onClose }: UploadInquiryModalProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.includes('pdf') && !file.type.includes('image')) {
        setError('Please upload a PDF or image file (PNG, JPG, JPEG)');
        return;
      }
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }

      setError('');
      setUploadedFile(file);
      setParsedData(null);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) {
      if (!file.type.includes('pdf') && !file.type.includes('image')) {
        setError('Please upload a PDF or image file (PNG, JPG, JPEG)');
        return;
      }
      
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }

      setError('');
      setUploadedFile(file);
      setParsedData(null);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const processFile = async () => {
    if (!uploadedFile) return;

    setIsProcessing(true);
    setError('');

    try {
      // Simulate OCR processing
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Mock parsed data
      const mockParsedData = {
        customerName: 'ABC Corporation',
        customerEmail: 'procurement@abccorp.com',
        customerPhone: '+1 (555) 123-4567',
        items: [
          { description: 'Laptop Dell XPS 13', quantity: 5, unitPrice: 1200 },
          { description: 'Wireless Mouse', quantity: 10, unitPrice: 25 },
          { description: 'USB-C Hub', quantity: 5, unitPrice: 45 }
        ],
        total: 6525,
        notes: 'Urgent delivery required by end of month',
        validUntil: '2024-12-31'
      };

      setParsedData(mockParsedData);
      
      // Here you would make the actual API call to POST /api/inquiries/upload
      // const response = await fetch('/api/inquiries/upload', {
      //   method: 'POST',
      //   body: formData
      // });
      
    } catch (err) {
      setError('Failed to process file. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const createQuotationFromParsed = () => {
    if (parsedData) {
      // Here you would navigate to quotation creation with pre-filled data
      onClose();
    }
  };

  const resetForm = () => {
    setUploadedFile(null);
    setParsedData(null);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Upload Inquiry (OCR)</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {!parsedData ? (
            <>
              {/* Upload Section */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Document</h3>
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center ${
                    uploadedFile ? 'border-green-300 bg-green-50' : 'border-gray-300 hover:border-gray-400'
                  }`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                >
                  {uploadedFile ? (
                    <div className="space-y-4">
                      <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-lg font-medium text-gray-900">{uploadedFile.name}</p>
                        <p className="text-sm text-gray-500">
                          {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <button
                        onClick={resetForm}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Remove file
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-lg font-medium text-gray-900">Drop your file here</p>
                        <p className="text-sm text-gray-500">or click to browse</p>
                        <p className="text-xs text-gray-400 mt-1">Supports PNG, JPG, JPEG, PDF (max 10MB)</p>
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        onChange={handleFileUpload}
                        accept=".pdf,.png,.jpg,.jpeg"
                        className="hidden"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200"
                      >
                        Choose File
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Error Display */}
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              {/* Process Button */}
              {uploadedFile && (
                <div className="text-center">
                  <button
                    onClick={processFile}
                    disabled={isProcessing}
                    className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"></path>
                        </svg>
                        Processing with OCR...
                      </span>
                    ) : (
                      'Process with OCR'
                    )}
                  </button>
                </div>
              )}
            </>
          ) : (
            /* Parsed Data Display */
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="text-green-800 font-medium">Document processed successfully!</p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Parsed Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Customer Details</h4>
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm text-gray-500">Name:</span>
                        <p className="text-gray-900">{parsedData.customerName}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">Email:</span>
                        <p className="text-gray-900">{parsedData.customerEmail}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">Phone:</span>
                        <p className="text-gray-900">{parsedData.customerPhone}</p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Order Summary</h4>
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm text-gray-500">Total Amount:</span>
                        <p className="text-xl font-bold text-gray-900">Rs. {parsedData.total.toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">Valid Until:</span>
                        <p className="text-gray-900">{parsedData.validUntil}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <h4 className="font-medium text-gray-900 mb-3">Items</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    {parsedData.items.map((item: any, index: number) => (
                      <div key={index} className="flex justify-between py-2 border-b border-gray-200 last:border-b-0">
                        <span className="text-gray-900">{item.description}</span>
                        <span className="text-gray-600">
                          {item.quantity} × Rs. {item.unitPrice} = Rs. {(item.quantity * item.unitPrice).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {parsedData.notes && (
                  <div className="mt-6">
                    <h4 className="font-medium text-gray-900 mb-3">Notes</h4>
                    <p className="text-gray-700 bg-gray-50 rounded-lg p-3">{parsedData.notes}</p>
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
            Close
          </button>
          {parsedData && (
            <button
              onClick={createQuotationFromParsed}
              className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors duration-200"
            >
              Create Quotation
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
