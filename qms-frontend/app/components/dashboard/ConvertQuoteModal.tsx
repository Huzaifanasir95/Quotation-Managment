'use client';

import { useState } from 'react';

interface ConvertQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface QuoteData {
  id: string;
  number: string;
  customer: string;
  amount: number;
  items: Array<{
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  validUntil: string;
}

export default function ConvertQuoteModal({ isOpen, onClose }: ConvertQuoteModalProps) {
  const [selectedQuote, setSelectedQuote] = useState<QuoteData | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [conversionType, setConversionType] = useState<'full' | 'partial'>('full');

  // Mock data for available quotes
  const availableQuotes: QuoteData[] = [
    {
      id: '1',
      number: 'Q-2024-001',
      customer: 'ABC Corporation',
      amount: 2500,
      items: [
        { id: '1', description: 'Laptop Dell XPS 13', quantity: 2, unitPrice: 1200, total: 2400 },
        { id: '2', description: 'Wireless Mouse', quantity: 2, unitPrice: 50, total: 100 }
      ],
      validUntil: '2024-12-31'
    },
    {
      id: '2',
      number: 'Q-2024-002',
      customer: 'XYZ Ltd',
      amount: 1800,
      items: [
        { id: '3', description: 'Monitor 27" 4K', quantity: 1, unitPrice: 800, total: 800 },
        { id: '4', description: 'USB-C Hub', quantity: 2, unitPrice: 45, total: 90 },
        { id: '5', description: 'Keyboard', quantity: 2, unitPrice: 75, total: 150 },
        { id: '6', description: 'Mouse Pad', quantity: 2, unitPrice: 15, total: 30 }
      ],
      validUntil: '2024-12-15'
    },
    {
      id: '3',
      number: 'Q-2024-003',
      customer: 'Tech Solutions Inc',
      amount: 4200,
      items: [
        { id: '7', description: 'Server Rack', quantity: 1, unitPrice: 2500, total: 2500 },
        { id: '8', description: 'Network Switch', quantity: 1, unitPrice: 800, total: 800 },
        { id: '9', description: 'Cables', quantity: 10, unitPrice: 25, total: 250 },
        { id: '10', description: 'Installation Service', quantity: 1, unitPrice: 650, total: 650 }
      ],
      validUntil: '2024-11-30'
    }
  ];

  const handleQuoteSelect = (quote: QuoteData) => {
    setSelectedQuote(quote);
  };

  const handleConvert = async () => {
    if (!selectedQuote) return;

    setIsConverting(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('Converting quote to order:', {
        quoteId: selectedQuote.id,
        conversionType,
        items: selectedQuote.items
      });
      
      // Here you would make the actual API call to POST /api/quotations/:id/convert
      // const response = await fetch(`/api/quotations/${selectedQuote.id}/convert`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ conversionType, items: selectedQuote.items })
      // });
      
      // Show success message and close modal
      alert(`Quote ${selectedQuote.number} successfully converted to order!`);
      onClose();
    } catch (error) {
      console.error('Failed to convert quote:', error);
      alert('Failed to convert quote. Please try again.');
    } finally {
      setIsConverting(false);
    }
  };

  const getStockStatus = (item: any) => {
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
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Quote to Convert</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableQuotes.map((quote) => (
                  <div
                    key={quote.id}
                    onClick={() => handleQuoteSelect(quote)}
                    className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all duration-200 cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-gray-900">{quote.number}</h4>
                      <span className="text-sm text-blue-600 font-medium">${quote.amount.toLocaleString()}</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{quote.customer}</p>
                    <p className="text-xs text-gray-500 mb-3">Valid until: {quote.validUntil}</p>
                    <div className="text-xs text-gray-500">
                      {quote.items.length} item(s)
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Quote Details and Conversion */
            <div className="space-y-6">
              {/* Quote Summary */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{selectedQuote.number}</h3>
                    <p className="text-gray-600">{selectedQuote.customer}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-600">${selectedQuote.amount.toLocaleString()}</p>
                    <p className="text-sm text-gray-500">Total Amount</p>
                  </div>
                </div>
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
                    />
                    <span className="text-gray-700">Convert selected items</span>
                  </label>
                </div>
              </div>

              {/* Items with Stock Check */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Items & Stock Availability</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  {selectedQuote.items.map((item) => {
                    const stockStatus = getStockStatus(item);
                    return (
                      <div key={item.id} className="flex items-center justify-between py-3 border-b border-gray-200 last:border-b-0">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{item.description}</p>
                          <p className="text-sm text-gray-600">
                            Qty: {item.quantity} × ${item.unitPrice} = ${item.total.toLocaleString()}
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
                      className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      defaultValue={new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                    <select className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
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
                      Converting this quote will automatically reserve stock for the selected items. 
                      This ensures inventory availability for the order.
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
            <button
              onClick={handleConvert}
              disabled={isConverting}
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
          )}
        </div>
      </div>
    </div>
  );
}
