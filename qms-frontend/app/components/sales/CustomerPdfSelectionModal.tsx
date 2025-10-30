'use client';

import React, { useState } from 'react';
import { Customer } from '../../lib/api';

interface CustomerPdfSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  onGeneratePDF: (selectedCustomers: Customer[], combinedPDF: boolean, format?: 'format1' | 'format2' | 'enhanced') => Promise<void>;
  isGenerating?: boolean;
}

const CustomerPdfSelectionModal: React.FC<CustomerPdfSelectionModalProps> = ({
  isOpen,
  onClose,
  customers,
  onGeneratePDF,
  isGenerating = false
}) => {
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [pdfType, setPdfType] = useState<'individual' | 'combined'>('individual');
  const [pdfFormat, setPdfFormat] = useState<'format1' | 'format2' | 'enhanced'>('format1');

  if (!isOpen) return null;

  const handleCustomerToggle = (customerId: string) => {
    setSelectedCustomerIds(prev =>
      prev.includes(customerId)
        ? prev.filter(id => id !== customerId)
        : [...prev, customerId]
    );
  };

  const handleSelectAll = () => {
    if (selectedCustomerIds.length === customers.length) {
      setSelectedCustomerIds([]);
    } else {
      setSelectedCustomerIds(customers.map(c => c.id));
    }
  };

  const handleGenerate = () => {
    if (pdfType === 'individual' && selectedCustomerIds.length === 0) {
      alert('Please select at least one customer');
      return;
    }

    // For combined PDF, use all customers; for individual, use selected ones
    const selectedCustomers = pdfType === 'combined' 
      ? customers 
      : customers.filter(c => selectedCustomerIds.includes(c.id));
    
    onGeneratePDF(selectedCustomers, pdfType === 'combined', pdfFormat);
  };

  const handleClose = () => {
    if (!isGenerating) {
      setSelectedCustomerIds([]);
      setPdfType('individual');
      setPdfFormat('format1');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="relative w-full max-w-2xl bg-white rounded-lg shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Select Customers for PDF
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Choose which customers to include in the quotation PDF
              </p>
            </div>
            <button
              onClick={handleClose}
              disabled={isGenerating}
              className="text-gray-400 hover:text-gray-500 disabled:opacity-50"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4">
            {/* PDF Type Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                PDF Generation Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setPdfType('individual')}
                  disabled={isGenerating}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    pdfType === 'individual'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  } disabled:opacity-50`}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      pdfType === 'individual' ? 'border-blue-500' : 'border-gray-300'
                    }`}>
                      {pdfType === 'individual' && (
                        <div className="w-3 h-3 bg-blue-500 rounded-full" />
                      )}
                    </div>
                    <div className="text-left flex-1">
                      <div className="font-medium text-gray-900 text-sm">Individual PDFs</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Generate separate PDF for each selected customer
                      </div>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setPdfType('combined')}
                  disabled={isGenerating}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    pdfType === 'combined'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  } disabled:opacity-50`}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      pdfType === 'combined' ? 'border-blue-500' : 'border-gray-300'
                    }`}>
                      {pdfType === 'combined' && (
                        <div className="w-3 h-3 bg-blue-500 rounded-full" />
                      )}
                    </div>
                    <div className="text-left flex-1">
                      <div className="font-medium text-gray-900 text-sm">Combined PDF</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Generate one PDF with all selected customers
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* PDF Format Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                PDF Format
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setPdfFormat('format1')}
                  disabled={isGenerating}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    pdfFormat === 'format1'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  } disabled:opacity-50`}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      pdfFormat === 'format1' ? 'border-blue-500' : 'border-gray-300'
                    }`}>
                      {pdfFormat === 'format1' && (
                        <div className="w-3 h-3 bg-blue-500 rounded-full" />
                      )}
                    </div>
                    <div className="text-left flex-1">
                      <div className="font-medium text-gray-900 text-sm">Format 1 - Premium</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Modern design with teal/orange theme
                      </div>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setPdfFormat('format2')}
                  disabled={isGenerating}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    pdfFormat === 'format2'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  } disabled:opacity-50`}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      pdfFormat === 'format2' ? 'border-blue-500' : 'border-gray-300'
                    }`}>
                      {pdfFormat === 'format2' && (
                        <div className="w-3 h-3 bg-blue-500 rounded-full" />
                      )}
                    </div>
                    <div className="text-left flex-1">
                      <div className="font-medium text-gray-900 text-sm">Format 2 - Corporate</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Navy blue & gold professional design
                      </div>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setPdfFormat('enhanced')}
                  disabled={isGenerating}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    pdfFormat === 'enhanced'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  } disabled:opacity-50`}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      pdfFormat === 'enhanced' ? 'border-blue-500' : 'border-gray-300'
                    }`}>
                      {pdfFormat === 'enhanced' && (
                        <div className="w-3 h-3 bg-blue-500 rounded-full" />
                      )}
                    </div>
                    <div className="text-left flex-1">
                      <div className="font-medium text-gray-900 text-sm">Enhanced - Detailed</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Comprehensive format with detailed specifications
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Customer Selection */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  {pdfType === 'combined' 
                    ? `All Customers Included (${customers.length})` 
                    : `Select Customers (${selectedCustomerIds.length} of ${customers.length})`
                  }
                </label>
                {pdfType === 'individual' && (
                  <button
                    onClick={handleSelectAll}
                    disabled={isGenerating}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
                  >
                    {selectedCustomerIds.length === customers.length ? 'Deselect All' : 'Select All'}
                  </button>
                )}
              </div>

              {/* Customer List */}
              <div className="border border-gray-200 rounded-lg max-h-80 overflow-y-auto">
                {customers.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <p className="text-sm">No customers available</p>
                  </div>
                ) : (
                  customers.map((customer, index) => (
                    <div
                      key={customer.id}
                      className={`${
                        index !== customers.length - 1 ? 'border-b border-gray-200' : ''
                      }`}
                    >
                      <label
                        className={`flex items-center p-4 transition-colors ${
                          pdfType === 'combined' 
                            ? 'bg-blue-50 cursor-default' 
                            : `cursor-pointer hover:bg-gray-50 ${isGenerating ? 'cursor-not-allowed opacity-50' : ''}`
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={pdfType === 'combined' ? true : selectedCustomerIds.includes(customer.id)}
                          onChange={() => handleCustomerToggle(customer.id)}
                          disabled={isGenerating || pdfType === 'combined'}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <div className="ml-3 flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-900">
                              {customer.name}
                            </span>
                          </div>
                          {(customer.email || customer.phone) && (
                            <div className="flex items-center space-x-3 mt-1 text-xs text-gray-500">
                              {customer.email && (
                                <span className="flex items-center">
                                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                  </svg>
                                  {customer.email}
                                </span>
                              )}
                              {customer.phone && (
                                <span className="flex items-center">
                                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                  </svg>
                                  {customer.phone}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </label>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
            <div className="text-sm text-gray-600">
              {(pdfType === 'combined' ? customers.length > 0 : selectedCustomerIds.length > 0) && (
                <span>
                  {pdfType === 'individual' 
                    ? `${selectedCustomerIds.length} PDF${selectedCustomerIds.length > 1 ? 's' : ''} will be generated`
                    : `1 combined PDF with ${customers.length} customer${customers.length > 1 ? 's' : ''}`
                  }
                </span>
              )}
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleClose}
                disabled={isGenerating}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                disabled={isGenerating || (pdfType === 'individual' && selectedCustomerIds.length === 0)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isGenerating ? (
                  <>
                    <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Generate PDF</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerPdfSelectionModal;
