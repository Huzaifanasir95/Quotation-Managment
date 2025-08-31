'use client';

import { useState, useEffect } from 'react';
import { apiClient, type Customer } from '../../lib/api';

interface Quotation {
  id: string;
  quotation_number: string;
  quotation_date: string;
  valid_until: string;
  status: string;
  total_amount: number;
  notes?: string;
  quotation_items: Array<{
    id: string;
    description: string;
    quantity: number;
    unit_price: number;
  }>;
}

interface ViewCustomerQuotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
}

export default function ViewCustomerQuotesModal({ isOpen, onClose, customer }: ViewCustomerQuotesModalProps) {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);

  useEffect(() => {
    if (isOpen && customer) {
      loadCustomerQuotations();
    }
  }, [isOpen, customer]);

  const loadCustomerQuotations = async () => {
    if (!customer) return;

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.getQuotations({ 
        limit: 100 
      });
      
      if (response.success) {
        // Filter quotations for this specific customer
        const customerQuotations = (response.data.quotations || []).filter(
          (q: any) => q.customer_id === customer.id
        );
        setQuotations(customerQuotations);
      } else {
        throw new Error(response.message || 'Failed to load quotations');
      }
    } catch (error) {
      console.error('Failed to load customer quotations:', error);
      setError(error instanceof Error ? error.message : 'Failed to load quotations');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'sent':
        return 'bg-blue-100 text-blue-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'converted':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (!isOpen || !customer) return null;

  return (
    <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50" style={{ backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Quotations for {customer.name}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          {!loading && !error && quotations.length === 0 && (
            <div className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No quotations found</h3>
              <p className="mt-1 text-sm text-gray-500">
                This customer doesn't have any quotations yet.
              </p>
            </div>
          )}

          {!loading && !error && quotations.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Quotations List */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Quotations ({quotations.length})
                </h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {quotations.map((quotation) => (
                    <div
                      key={quotation.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedQuotation?.id === quotation.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedQuotation(quotation)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">
                          {quotation.quotation_number || `QUO-${quotation.id}`}
                        </h4>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(quotation.status)}`}>
                          {quotation.status}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        <p>Date: {new Date(quotation.quotation_date).toLocaleDateString()}</p>
                        <p>Valid Until: {new Date(quotation.valid_until).toLocaleDateString()}</p>
                        <p className="font-medium text-gray-900">
                          Total: {formatCurrency(quotation.total_amount)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quotation Details */}
              <div>
                {selectedQuotation ? (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      Quotation Details
                    </h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Number</label>
                          <p className="text-sm text-gray-900">
                            {selectedQuotation.quotation_number || `QUO-${selectedQuotation.id}`}
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Status</label>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedQuotation.status)}`}>
                            {selectedQuotation.status}
                          </span>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Date</label>
                          <p className="text-sm text-gray-900">
                            {new Date(selectedQuotation.quotation_date).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Valid Until</label>
                          <p className="text-sm text-gray-900">
                            {new Date(selectedQuotation.valid_until).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      {selectedQuotation.notes && (
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                          <p className="text-sm text-gray-900 bg-white p-2 rounded border">
                            {selectedQuotation.notes}
                          </p>
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Items</label>
                        <div className="bg-white rounded border">
                          <table className="min-w-full">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {selectedQuotation.quotation_items.map((item) => (
                                <tr key={item.id}>
                                  <td className="px-3 py-2 text-sm text-gray-900">{item.description}</td>
                                  <td className="px-3 py-2 text-sm text-gray-900">{item.quantity}</td>
                                  <td className="px-3 py-2 text-sm text-gray-900">{formatCurrency(item.unit_price)}</td>
                                  <td className="px-3 py-2 text-sm text-gray-900">{formatCurrency(item.quantity * item.unit_price)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div className="mt-2 text-right">
                          <p className="text-lg font-semibold text-gray-900">
                            Total: {formatCurrency(selectedQuotation.total_amount)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Select a quotation</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Click on a quotation from the list to view its details.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
