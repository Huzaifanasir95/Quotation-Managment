'use client';

import { useState } from 'react';

interface ConvertQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Quote {
  id: string;
  number: string;
  customer: string;
  amount: number;
  status: string;
  validUntil: string;
  items: Array<{
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
}

export default function ConvertQuoteModal({ isOpen, onClose }: ConvertQuoteModalProps) {
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [orderDetails, setOrderDetails] = useState({
    expectedDelivery: '',
    priority: 'normal',
    notes: ''
  });

  // Mock data for available quotes
  const availableQuotes: Quote[] = [
    {
      id: '1',
      number: 'Q-2024-001',
      customer: 'ABC Corporation',
      amount: 2500,
      status: 'Accepted',
      validUntil: '2024-12-31',
      items: [
        { id: '1', description: 'Laptop Dell XPS 13', quantity: 2, unitPrice: 1200, total: 2400 },
        { id: '2', description: 'Wireless Mouse', quantity: 2, unitPrice: 50, total: 100 }
      ]
    },
    {
      id: '2',
      number: 'Q-2024-002',
      customer: 'XYZ Ltd',
      amount: 1800,
      status: 'Accepted',
      validUntil: '2024-12-15',
      items: [
        { id: '3', description: 'Monitor 27" 4K', quantity: 1, unitPrice: 800, total: 800 },
        { id: '4', description: 'USB-C Hub', quantity: 2, unitPrice: 45, total: 90 },
        { id: '5', description: 'Keyboard', quantity: 2, unitPrice: 75, total: 150 },
        { id: '6', description: 'Mouse Pad', quantity: 2, unitPrice: 15, total: 30 }
      ]
    },
    {
      id: '3',
      number: 'Q-2024-003',
      customer: 'Tech Solutions Inc',
      amount: 4200,
      status: 'Pending',
      validUntil: '2024-11-30',
      items: [
        { id: '7', description: 'Server Rack', quantity: 1, unitPrice: 2500, total: 2500 },
        { id: '8', description: 'Network Switch', quantity: 1, unitPrice: 800, total: 800 },
        { id: '9', description: 'Cables', quantity: 10, unitPrice: 25, total: 250 },
        { id: '10', description: 'Installation Service', quantity: 1, unitPrice: 650, total: 650 }
      ]
    }
  ];

  const handleQuoteSelect = (quote: Quote) => {
    setSelectedQuote(quote);
    // Set default delivery date (2 weeks from now)
    setOrderDetails(prev => ({
      ...prev,
      expectedDelivery: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    }));
  };

  const handleConvert = async () => {
    if (!selectedQuote) return;

    setIsConverting(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const orderData = {
        quoteId: selectedQuote.id,
        quoteNumber: selectedQuote.number,
        customer: selectedQuote.customer,
        items: selectedQuote.items,
        orderDetails,
        totalAmount: selectedQuote.amount
      };
      
      console.log('Converting quote to order:', orderData);
      
      // Here you would make the actual API call to POST /api/orders
      // const response = await fetch('/api/orders', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(orderData)
      // });
      
      alert(`Quote ${selectedQuote.number} successfully converted to order!`);
      onClose();
    } catch (error) {
      console.error('Failed to convert quote:', error);
      alert('Failed to convert quote. Please try again.');
    } finally {
      setIsConverting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Convert Quote to Order</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <div className="p-6">
          {!selectedQuote ? (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Quote to Convert</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableQuotes.map((quote) => (
                  <div
                    key={quote.id}
                    onClick={() => handleQuoteSelect(quote)}
                    className={`border rounded-lg p-4 cursor-pointer transition-all duration-200 ${
                      quote.status === 'Accepted' 
                        ? 'border-green-300 hover:border-green-400 hover:shadow-md' 
                        : 'border-yellow-300 hover:border-yellow-400 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-gray-900">{quote.number}</h4>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        quote.status === 'Accepted' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {quote.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{quote.customer}</p>
                    <p className="text-lg font-bold text-blue-600">${quote.amount.toLocaleString()}</p>
                    <p className="text-xs text-gray-500 mt-2">Valid until: {quote.validUntil}</p>
                    <p className="text-xs text-gray-500">{quote.items.length} item(s)</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{selectedQuote.number}</h3>
                    <p className="text-gray-600">{selectedQuote.customer}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-600">${selectedQuote.amount.toLocaleString()}</p>
                    <p className="text-sm text-gray-500">Quote Total</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-3">Quote Items</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  {selectedQuote.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between py-3 border-b border-gray-200 last:border-b-0">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{item.description}</p>
                        <p className="text-sm text-gray-600">
                          Qty: {item.quantity} × ${item.unitPrice} = ${item.total.toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">${item.total.toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-3">Order Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Expected Delivery</label>
                    <input
                      type="date"
                      value={orderDetails.expectedDelivery}
                      onChange={(e) => setOrderDetails({ ...orderDetails, expectedDelivery: e.target.value })}
                      className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                    <select
                      value={orderDetails.priority}
                      onChange={(e) => setOrderDetails({ ...orderDetails, priority: e.target.value })}
                      className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="low">Low</option>
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                    <input
                      type="text"
                      value={orderDetails.notes}
                      onChange={(e) => setOrderDetails({ ...orderDetails, notes: e.target.value })}
                      className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Additional notes..."
                    />
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start">
                  <span className="text-yellow-600 mr-2">⚠️</span>
                  <div>
                    <h5 className="font-medium text-yellow-800">Order Conversion</h5>
                    <p className="text-sm text-yellow-700 mt-1">
                      Converting this quote will create a sales order and reserve inventory. 
                      The quote status will be updated to "Converted".
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

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
              className="px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isConverting ? 'Converting...' : 'Convert to Order'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
