'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '../../lib/api';

interface ConvertQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface QuoteData {
  id: string;
  quotation_number: string;
  customer_id: string;
  total_amount: number;
  status: string;
  valid_until: string;
  quotation_items: Array<{
    id: string;
    description: string;
    quantity: number;
    unit_price: number;
    line_total: number;
    product_id?: string;
  }>;
  customers: {
    id: string;
    name: string;
    email?: string;
  };
}

export default function ConvertQuoteModal({ isOpen, onClose }: ConvertQuoteModalProps) {
  const [selectedQuote, setSelectedQuote] = useState<QuoteData | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [conversionType, setConversionType] = useState<'full' | 'partial'>('full');
  const [availableQuotes, setAvailableQuotes] = useState<QuoteData[]>([]);
  const [expectedDelivery, setExpectedDelivery] = useState<string>('');
  const [priority, setPriority] = useState<'normal' | 'high' | 'urgent'>('normal');
  const [notes, setNotes] = useState<string>('');

  // Set default delivery date to 14 days from now
  useEffect(() => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 14);
    setExpectedDelivery(futureDate.toISOString().split('T')[0]);
  }, []);

  // Fetch available quotations when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchAvailableQuotes();
    }
  }, [isOpen]);

  const fetchAvailableQuotes = async () => {
    try {
      setIsLoading(true);
      // Fetch all quotations and then filter on the frontend
      const response = await apiClient.getQuotations({ 
        limit: 50 
      });
      
      if (response.success) {
        // Filter for quotes that can be converted (not converted and not expired)
        const convertibleQuotes = response.data.quotations.filter(
          (quote: QuoteData) => {
            const isConvertible = ['draft', 'sent', 'approved'].includes(quote.status);
            const isNotConverted = quote.status !== 'converted';
            return isConvertible && isNotConverted;
          }
        );
        setAvailableQuotes(convertibleQuotes);
      }
    } catch (error) {
      console.error('Failed to fetch quotations:', error);
      alert('Failed to load available quotations. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuoteSelect = (quote: QuoteData) => {
    setSelectedQuote(quote);
  };

  const handleConvert = async () => {
    if (!selectedQuote) return;

    setIsConverting(true);
    
    try {
      // If quotation is in draft status, we need to approve it first
      if (selectedQuote.status === 'draft') {
        const approveConfirm = confirm(
          'This quotation is in draft status. It will be automatically approved before conversion. Continue?'
        );
        if (!approveConfirm) {
          setIsConverting(false);
          return;
        }
        
        // Update quotation status to approved
        await apiClient.updateQuotationStatus(selectedQuote.id, 'approved');
      }

      const conversionData = {
        quotation_id: selectedQuote.id,
        expected_delivery: expectedDelivery,
        notes: priority !== 'normal' ? `Priority: ${priority.charAt(0).toUpperCase() + priority.slice(1)}\n${notes}` : notes,
        status: 'pending'
      };

      console.log('Converting quote to order:', conversionData);
      
      const response = await apiClient.convertQuoteToOrder(conversionData);
      
      if (response.success) {
        alert(`Quote ${selectedQuote.quotation_number} successfully converted to order ${response.data.order_number}!`);
        onClose();
        // Reset form
        setSelectedQuote(null);
        setNotes('');
        setPriority('normal');
      } else {
        throw new Error(response.message || 'Failed to convert quote');
      }
    } catch (error) {
      console.error('Failed to convert quote:', error);
      
      // Extract more specific error message
      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        try {
          // Try to parse JSON error details
          const errorDetails = JSON.parse(error.message);
          errorMessage = errorDetails.details || errorDetails.error || error.message;
        } catch {
          errorMessage = error.message;
        }
      }
      
      alert(`Failed to convert quote: ${errorMessage}`);
    } finally {
      setIsConverting(false);
    }
  };

  const getStockStatus = (item: QuoteData['quotation_items'][0]) => {
    // Mock stock check - in real app this would come from inventory API
    const mockStock = Math.floor(Math.random() * 20);
    if (mockStock >= item.quantity) {
      return { status: 'available', stock: mockStock, color: 'text-green-600' };
    } else if (mockStock > 0) {
      return { status: 'partial', stock: mockStock, color: 'text-yellow-600' };
    } else {
      return { status: 'out', stock: 0, color: 'text-red-600' };
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Convert Quote to Order</h2>
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
          {!selectedQuote ? (
            /* Quote Selection */
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Select Quote to Convert</h3>
              <p className="text-sm text-gray-600 mb-4">
                You can convert quotations with draft, sent, or approved status to sales orders.
              </p>
              
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"></path>
                  </svg>
                  <span className="ml-2 text-gray-600">Loading quotations...</span>
                </div>
              ) : availableQuotes.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No quotations available</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    No approved quotations are available for conversion to orders.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {availableQuotes.map((quote) => (
                    <div
                      key={quote.id}
                      onClick={() => handleQuoteSelect(quote)}
                      className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all duration-200 cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-gray-900">{quote.quotation_number}</h4>
                        <span className="text-sm text-blue-600 font-medium">${quote.total_amount.toLocaleString()}</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{quote.customers.name}</p>
                      <p className="text-xs text-gray-500 mb-3">Valid until: {quote.valid_until}</p>
                      <div className="text-xs text-gray-500">
                        {quote.quotation_items.length} item(s)
                      </div>
                      <div className="mt-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          quote.status === 'approved' ? 'bg-green-100 text-green-800' : 
                          quote.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                          quote.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Quote Details and Conversion */
            <div className="space-y-6">
              {/* Quote Summary */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{selectedQuote.quotation_number}</h3>
                    <p className="text-gray-600">{selectedQuote.customers.name}</p>
                    <div className="mt-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        selectedQuote.status === 'approved' ? 'bg-green-100 text-green-800' : 
                        selectedQuote.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                        selectedQuote.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedQuote.status.charAt(0).toUpperCase() + selectedQuote.status.slice(1)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-600">${selectedQuote.total_amount.toLocaleString()}</p>
                    <p className="text-sm text-gray-500">Total Amount</p>
                  </div>
                </div>
                
                {/* Status-specific information */}
                {selectedQuote.status === 'draft' && (
                  <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                    <strong>Note:</strong> This draft quotation will be automatically approved before conversion.
                  </div>
                )}
                {selectedQuote.status === 'sent' && (
                  <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                    <strong>Status:</strong> This quotation has been sent to the customer and is ready for conversion.
                  </div>
                )}
                {selectedQuote.status === 'approved' && (
                  <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-800">
                    <strong>Status:</strong> This quotation has been approved and is ready for conversion.
                  </div>
                )}
              </div>

              {/* Conversion Type */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Conversion Type</h4>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="full"
                      checked={conversionType === 'full'}
                      onChange={(e) => setConversionType(e.target.value as 'full' | 'partial')}
                      className="mr-2"
                    />
                    <span className="text-gray-700">Convert entire quote</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="partial"
                      checked={conversionType === 'partial'}
                      onChange={(e) => setConversionType(e.target.value as 'full' | 'partial')}
                      className="mr-2"
                      disabled
                    />
                    <span className="text-gray-400">Convert selected items (Coming soon)</span>
                  </label>
                </div>
              </div>

              {/* Items with Stock Check */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Items & Stock Availability</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  {selectedQuote.quotation_items.map((item) => {
                    const stockStatus = getStockStatus(item);
                    return (
                      <div key={item.id} className="flex items-center justify-between py-3 border-b border-gray-200 last:border-b-0">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{item.description}</p>
                          <p className="text-sm text-gray-600">
                            Qty: {item.quantity} × ${item.unit_price} = ${item.line_total.toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-medium ${stockStatus.color}`}>
                            Stock: {stockStatus.stock}
                          </p>
                          <p className="text-xs text-gray-500">
                            {stockStatus.status === 'available' ? 'Available' :
                             stockStatus.status === 'partial' ? 'Partial' : 'Out of Stock'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Order Details */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Order Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Expected Delivery Date</label>
                    <input
                      type="date"
                      value={expectedDelivery}
                      onChange={(e) => setExpectedDelivery(e.target.value)}
                      className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                    <select 
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as 'normal' | 'high' | 'urgent')}
                      className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Additional notes for the order..."
                    className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Stock Reservation Warning */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <div>
                    <h5 className="font-medium text-yellow-800">Stock Reservation</h5>
                    <p className="text-sm text-yellow-700 mt-1">
                      Converting this quote will automatically create a sales order in pending status. 
                      Stock will be reserved when the order is approved.
                    </p>
                  </div>
                </div>
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
          {selectedQuote && (
            <>
              <button
                onClick={() => setSelectedQuote(null)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
              >
                Back to Selection
              </button>
              <button
                onClick={handleConvert}
                disabled={isConverting || !expectedDelivery}
                className="px-6 py-2 text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isConverting ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"></path>
                    </svg>
                    Converting...
                  </span>
                ) : (
                  'Convert to Order'
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
