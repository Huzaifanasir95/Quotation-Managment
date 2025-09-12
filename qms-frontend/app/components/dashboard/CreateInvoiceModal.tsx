'use client';

import { useState } from 'react';

interface CreateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface OrderData {
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
  orderDate: string;
}

export default function CreateInvoiceModal({ isOpen, onClose }: CreateInvoiceModalProps) {
  const [selectedOrder, setSelectedOrder] = useState<OrderData | null>(null);
  const [invoiceDetails, setInvoiceDetails] = useState({
    invoiceNumber: '',
    dueDate: '',
    paymentTerms: 'net30',
    notes: ''
  });
  const [isCreating, setIsCreating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showFBRModal, setShowFBRModal] = useState(false);

  // Mock data for available orders
  const availableOrders: OrderData[] = [
    {
      id: '1',
      number: 'SO-2024-001',
      customer: 'ABC Corporation',
      amount: 2500,
      items: [
        { id: '1', description: 'Laptop Dell XPS 13', quantity: 2, unitPrice: 1200, total: 2400 },
        { id: '2', description: 'Wireless Mouse', quantity: 2, unitPrice: 50, total: 100 }
      ],
      orderDate: '2024-01-15'
    },
    {
      id: '2',
      number: 'SO-2024-002',
      customer: 'XYZ Ltd',
      amount: 1800,
      items: [
        { id: '3', description: 'Monitor 27" 4K', quantity: 1, unitPrice: 800, total: 800 },
        { id: '4', description: 'USB-C Hub', quantity: 2, unitPrice: 45, total: 90 },
        { id: '5', description: 'Keyboard', quantity: 2, unitPrice: 75, total: 150 },
        { id: '6', description: 'Mouse Pad', quantity: 2, unitPrice: 15, total: 30 }
      ],
      orderDate: '2024-01-18'
    },
    {
      id: '3',
      number: 'SO-2024-003',
      customer: 'Tech Solutions Inc',
      amount: 4200,
      items: [
        { id: '7', description: 'Server Rack', quantity: 1, unitPrice: 2500, total: 2500 },
        { id: '8', description: 'Network Switch', quantity: 1, unitPrice: 800, total: 800 },
        { id: '9', description: 'Cables', quantity: 10, unitPrice: 25, total: 250 },
        { id: '10', description: 'Installation Service', quantity: 1, unitPrice: 650, total: 650 }
      ],
      orderDate: '2024-01-20'
    }
  ];

  const handleOrderSelect = (order: OrderData) => {
    setSelectedOrder(order);
    // Auto-generate invoice number
    setInvoiceDetails(prev => ({
      ...prev,
      invoiceNumber: `INV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    }));
  };

  const handleCreateInvoice = async () => {
    if (!selectedOrder) return;

    setIsCreating(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      
      // Here you would make the actual API call to POST /api/invoices
      // const response = await fetch('/api/invoices', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ orderId: selectedOrder.id, ...invoiceDetails })
      // });
      
      // Show FBR sync modal
      setShowFBRModal(true);
    } catch (error) {
      console.error('Failed to create invoice:', error);
      alert('Failed to create invoice. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleFBRSync = async () => {
    setIsSyncing(true);
    
    try {
      // Simulate FBR sync
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Here you would make the actual API call to POST /api/invoices/:id/sync-fbr
      // const response = await fetch(`/api/invoices/${invoiceDetails.invoiceNumber}/sync-fbr`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' }
      // });
      
      alert('Invoice created and synced with FBR successfully!');
      onClose();
    } catch (error) {
      console.error('Failed to sync with FBR:', error);
      alert('Invoice created but FBR sync failed. Please try again.');
    } finally {
      setIsSyncing(false);
      setShowFBRModal(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Create Invoice & FBR Sync</h2>
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
          {!selectedOrder ? (
            /* Order Selection */
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Order to Invoice</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableOrders.map((order) => (
                  <div
                    key={order.id}
                    onClick={() => handleOrderSelect(order)}
                    className="border border-gray-200 rounded-lg p-4 hover:border-orange-300 hover:shadow-md transition-all duration-200 cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-gray-900">{order.number}</h4>
                      <span className="text-sm text-orange-600 font-medium">${order.amount.toLocaleString()}</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{order.customer}</p>
                    <p className="text-xs text-gray-500 mb-3">Order date: {order.orderDate}</p>
                    <div className="text-xs text-gray-500">
                      {order.items.length} item(s)
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Invoice Creation */
            <div className="space-y-6">
              {/* Order Summary */}
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{selectedOrder.number}</h3>
                    <p className="text-gray-600">{selectedOrder.customer}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-orange-600">${selectedOrder.amount.toLocaleString()}</p>
                    <p className="text-sm text-gray-500">Order Total</p>
                  </div>
                </div>
              </div>

              {/* Invoice Details */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Invoice Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Number</label>
                    <input
                      type="text"
                      value={invoiceDetails.invoiceNumber}
                      onChange={(e) => setInvoiceDetails({ ...invoiceDetails, invoiceNumber: e.target.value })}
                      className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="Auto-generated"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
                    <input
                      type="date"
                      value={invoiceDetails.dueDate}
                      onChange={(e) => setInvoiceDetails({ ...invoiceDetails, dueDate: e.target.value })}
                      className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Payment Terms</label>
                    <select
                      value={invoiceDetails.paymentTerms}
                      onChange={(e) => setInvoiceDetails({ ...invoiceDetails, paymentTerms: e.target.value })}
                      className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                      <option value="net15">Net 15</option>
                      <option value="net30">Net 30</option>
                      <option value="net45">Net 45</option>
                      <option value="net60">Net 60</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                    <input
                      type="text"
                      value={invoiceDetails.notes}
                      onChange={(e) => setInvoiceDetails({ ...invoiceDetails, notes: e.target.value })}
                      className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="Additional notes..."
                    />
                  </div>
                </div>
              </div>

              {/* Items */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Invoice Items</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  {selectedOrder.items.map((item) => (
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

              {/* Invoice Preview */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Invoice Preview</h4>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h5 className="font-semibold text-gray-900">Invoice #{invoiceDetails.invoiceNumber}</h5>
                      <p className="text-sm text-gray-600">Due: {invoiceDetails.dueDate}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900">${selectedOrder.amount.toLocaleString()}</p>
                      <p className="text-sm text-gray-500">Total Amount</p>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    Payment Terms: {invoiceDetails.paymentTerms.toUpperCase()}
                  </div>
                </div>
              </div>

              {/* FBR Compliance Notice */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-blue-600 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h5 className="font-medium text-blue-800">FBR Compliance</h5>
                    <p className="text-sm text-blue-700 mt-1">
                      This invoice will be automatically synced with the Federal Board of Revenue (FBR) 
                      for tax compliance. Ensure all details are accurate before proceeding.
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
          {selectedOrder && (
            <button
              onClick={handleCreateInvoice}
              disabled={isCreating}
              className="px-6 py-2 text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"></path>
                  </svg>
                  Creating...
                </span>
              ) : (
                'Create Invoice'
              )}
            </button>
          )}
        </div>
      </div>

      {/* FBR Sync Confirmation Modal */}
      {showFBRModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Invoice Created Successfully!</h3>
                  <p className="text-sm text-gray-600">Ready to sync with FBR</p>
                </div>
              </div>
              
              <p className="text-gray-700 mb-6">
                Your invoice has been created. Would you like to proceed with FBR synchronization now?
              </p>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowFBRModal(false)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                >
                  Sync Later
                </button>
                <button
                  onClick={handleFBRSync}
                  disabled={isSyncing}
                  className="flex-1 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSyncing ? 'Syncing...' : 'Sync Now'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
