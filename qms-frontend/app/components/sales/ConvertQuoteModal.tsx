'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { apiClient } from '../../lib/api';

interface ConvertQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCreated?: () => void;
}

interface Quote {
  id: string;
  number: string;
  customer: string;
  customerEmail?: string;
  amount: number;
  status: string;
  validUntil: string;
  quotationDate: string;
  notes?: string;
  items: Array<{
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
}

type Step = 'select' | 'configure' | 'review';

export default function ConvertQuoteModal({ isOpen, onClose, onOrderCreated }: ConvertQuoteModalProps) {
  const [mounted, setMounted] = useState(false);
  const [currentStep, setCurrentStep] = useState<Step>('select');
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [orderDetails, setOrderDetails] = useState({
    expectedDelivery: '',
    priority: 'normal',
    notes: '',
    shippingAddress: '',
    billingAddress: '',
    paymentTerms: '30',
    discountPercentage: 0,
    taxPercentage: 0,
    shippingCost: 0
  });

  const [availableQuotes, setAvailableQuotes] = useState<Quote[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Handle mounting for portal
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      resetModalState();
      loadQuotations();
    }
  }, [isOpen]);

  const resetModalState = () => {
    setCurrentStep('select');
    setSelectedQuote(null);
    setSearchTerm('');
    setStatusFilter('All');
    setOrderDetails({
      expectedDelivery: '',
      priority: 'normal',
      notes: '',
      shippingAddress: '',
      billingAddress: '',
      paymentTerms: '30',
      discountPercentage: 0,
      taxPercentage: 0,
      shippingCost: 0
    });
  };

  const loadQuotations = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.getQuotations({ limit: 100 });
      if (response.success) {
        // Transform API data to match our Quote interface
        const quotes = response.data.quotations.map((q: any) => ({
          id: q.id.toString(),
          number: q.quotation_number || `QUO-${q.id}`,
          customer: q.customers?.name || 'Unknown Customer',
          customerEmail: q.customers?.email || '',
          amount: parseFloat(q.total_amount) || 0,
          status: q.status || 'Draft',
          validUntil: q.valid_until || '',
          quotationDate: q.quotation_date || (q.created_at ? new Date(q.created_at).toISOString().split('T')[0] : ''),
          notes: q.notes || '',
          items: q.quotation_items?.map((item: any) => ({
            id: item.id.toString(),
            description: item.description || 'No description',
            quantity: item.quantity || 0,
            unitPrice: parseFloat(item.unit_price) || 0,
            total: (item.quantity || 0) * (parseFloat(item.unit_price) || 0)
          })) || []
        }));
        
        // Filter out quotes that are not ready for conversion
        const convertibleQuotes = quotes.filter((q: any) => {
          const status = q.status.toLowerCase();
          // Include approved quotes and pending quotes, exclude converted/rejected/draft
          return ['approved', 'accepted', 'pending'].includes(status) && 
                 (!q.validUntil || new Date(q.validUntil) >= new Date());
        });
        setAvailableQuotes(convertibleQuotes);
      }
    } catch (error) {
      console.error('Failed to load quotations:', error);
      setAvailableQuotes([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredQuotes = availableQuotes.filter(quote => {
    const matchesSearch = 
      quote.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quote.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quote.customerEmail?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'All' || quote.status.toLowerCase() === statusFilter.toLowerCase();
    
    return matchesSearch && matchesStatus;
  });

  const handleQuoteSelect = (quote: Quote) => {
    setSelectedQuote(quote);
    // Set default delivery date (2 weeks from now)
    setOrderDetails(prev => ({
      ...prev,
      expectedDelivery: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    }));
    setCurrentStep('configure');
  };

  const calculateOrderTotal = () => {
    if (!selectedQuote) return 0;
    
    const subtotal = selectedQuote.amount;
    const discount = (subtotal * orderDetails.discountPercentage) / 100;
    const subtotalAfterDiscount = subtotal - discount;
    const tax = (subtotalAfterDiscount * orderDetails.taxPercentage) / 100;
    const total = subtotalAfterDiscount + tax + orderDetails.shippingCost;
    
    return {
      subtotal,
      discount,
      tax,
      shipping: orderDetails.shippingCost,
      total
    };
  };

  const handleConvert = async () => {
    if (!selectedQuote) return;

    setIsConverting(true);
    
    try {
      const orderData = {
        quotation_id: parseInt(selectedQuote.id),
        expected_delivery: orderDetails.expectedDelivery,
        priority: orderDetails.priority,
        notes: orderDetails.notes,
        shipping_address: orderDetails.shippingAddress,
        billing_address: orderDetails.billingAddress,
        payment_terms: orderDetails.paymentTerms,
        discount_percentage: orderDetails.discountPercentage,
        tax_percentage: orderDetails.taxPercentage,
        shipping_cost: orderDetails.shippingCost,
        status: 'pending'
      };
      
      const response = await apiClient.convertQuoteToOrder(orderData);
      
      if (response.success) {
        alert(`Quote ${selectedQuote.number} successfully converted to order!`);
        onClose();
        
        // Call callback to refresh order list
        if (onOrderCreated) {
          onOrderCreated();
        }
        
        resetModalState();
      } else {
        throw new Error(response.message || 'Failed to convert quote');
      }
    } catch (error) {
      console.error('Failed to convert quote:', error);
      alert(`Failed to convert quote: ${error instanceof Error ? error.message : 'Please try again.'}`);
    } finally {
      setIsConverting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'accepted': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'normal': return 'bg-blue-100 text-blue-800';
      case 'low': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const steps = [
    { id: 'select', name: 'Select Quote', icon: '📋' },
    { id: 'configure', name: 'Configure Order', icon: '⚙️' },
    { id: 'review', name: 'Review & Convert', icon: '✅' }
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div 
      className="fixed z-50" 
      style={{ 
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-7xl w-full flex flex-col border border-gray-100"
        style={{ 
          maxHeight: '95vh',
          position: 'relative',
          zIndex: 51
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-green-50 to-blue-50 px-8 py-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Convert Quote to Order</h2>
              <p className="text-gray-600 mt-1">Transform approved quotations into sales orders</p>
            </div>
            <button 
              onClick={onClose} 
              className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-colors duration-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Step Indicator */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Progress</span>
              <span className="text-sm font-medium text-gray-700">{Math.round(((currentStepIndex + 1) / steps.length) * 100)}%</span>
            </div>
            <div className="flex items-center space-x-4">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-200 ${
                    index <= currentStepIndex
                      ? 'bg-green-500 border-green-500 text-white'
                      : 'bg-white border-gray-300 text-gray-400'
                  }`}>
                    {index < currentStepIndex ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <span className="text-lg">{step.icon}</span>
                    )}
                  </div>
                  <span className={`ml-3 text-sm font-medium ${
                    index <= currentStepIndex ? 'text-gray-900' : 'text-gray-500'
                  }`}>
                    {step.name}
                  </span>
                  {index < steps.length - 1 && (
                    <div className={`w-12 h-0.5 mx-4 ${
                      index < currentStepIndex ? 'bg-green-500' : 'bg-gray-300'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-8">
            {currentStep === 'select' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Select a Quote to Convert</h3>
                  
                  {/* Search and Filter */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="md:col-span-2">
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Search quotes by number, customer, or email..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full text-black pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <svg className="w-5 h-5 text-gray-400 absolute left-3 top-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                    </div>
                    <div>
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full text-black px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="All">All Statuses</option>
                        <option value="approved">Approved</option>
                        <option value="accepted">Accepted</option>
                        <option value="pending">Pending</option>
                      </select>
                    </div>
                  </div>

                  {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                      <span className="ml-3 text-gray-600">Loading quotes...</span>
                    </div>
                  ) : filteredQuotes.length === 0 ? (
                    <div className="text-center py-12">
                      <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No convertible quotes found</h3>
                      <p className="text-gray-500">Only approved, accepted, or pending quotes that haven't expired can be converted to orders.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredQuotes.map((quote) => (
                        <div
                          key={quote.id}
                          onClick={() => handleQuoteSelect(quote)}
                          className="border border-gray-200 rounded-xl p-6 cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-blue-300 bg-white"
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h4 className="text-lg font-bold text-gray-900">{quote.number}</h4>
                              <p className="text-gray-600">{quote.customer}</p>
                              {quote.customerEmail && (
                                <p className="text-sm text-gray-500">{quote.customerEmail}</p>
                              )}
                            </div>
                            <div className={`flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(quote.status)}`}>
                              {quote.status}
                            </div>
                          </div>

                          <div className="space-y-2 mb-4">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500">Amount:</span>
                              <span className="font-bold text-green-600">Rs. {quote.amount.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500">Items:</span>
                              <span className="text-gray-900">{quote.items.length}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500">Created:</span>
                              <span className="text-gray-900">{new Date(quote.quotationDate).toLocaleDateString()}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500">Valid Until:</span>
                              <span className="text-gray-900">
                                {quote.validUntil ? new Date(quote.validUntil).toLocaleDateString() : 'No expiry'}
                              </span>
                            </div>
                          </div>

                          <div className="pt-4 border-t border-gray-200">
                            <button className="w-full px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 font-medium">
                              Select This Quote
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {currentStep === 'configure' && selectedQuote && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Configure Order Details</h3>
                  
                  {/* Selected Quote Summary */}
                  <div className="bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-xl p-6 mb-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-lg font-bold text-gray-900">{selectedQuote.number}</h4>
                        <p className="text-gray-600">{selectedQuote.customer}</p>
                        <p className="text-sm text-gray-500">{selectedQuote.items.length} items</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-blue-600">Rs. {selectedQuote.amount.toLocaleString()}</p>
                        <p className="text-sm text-gray-500">Quote Total</p>
                      </div>
                    </div>
                  </div>

                  {/* Order Configuration Form */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left Column */}
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900 mb-4">Order Information</h4>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Expected Delivery Date *</label>
                            <input
                              type="date"
                              value={orderDetails.expectedDelivery}
                              onChange={(e) => setOrderDetails({ ...orderDetails, expectedDelivery: e.target.value })}
                              className="w-full text-black px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Priority Level</label>
                            <select
                              value={orderDetails.priority}
                              onChange={(e) => setOrderDetails({ ...orderDetails, priority: e.target.value })}
                              className="w-full text-black px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="low">Low Priority</option>
                              <option value="normal">Normal Priority</option>
                              <option value="high">High Priority</option>
                              <option value="urgent">Urgent</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Payment Terms (Days)</label>
                            <select
                              value={orderDetails.paymentTerms}
                              onChange={(e) => setOrderDetails({ ...orderDetails, paymentTerms: e.target.value })}
                              className="w-full text-black px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="0">Cash on Delivery</option>
                              <option value="15">Net 15 Days</option>
                              <option value="30">Net 30 Days</option>
                              <option value="45">Net 45 Days</option>
                              <option value="60">Net 60 Days</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-lg font-semibold text-gray-900 mb-4">Addresses</h4>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Shipping Address</label>
                            <textarea
                              value={orderDetails.shippingAddress}
                              onChange={(e) => setOrderDetails({ ...orderDetails, shippingAddress: e.target.value })}
                              className="w-full text-black px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              rows={3}
                              placeholder="Enter complete shipping address..."
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Billing Address</label>
                            <textarea
                              value={orderDetails.billingAddress}
                              onChange={(e) => setOrderDetails({ ...orderDetails, billingAddress: e.target.value })}
                              className="w-full text-black px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              rows={3}
                              placeholder="Enter billing address (leave blank if same as shipping)..."
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900 mb-4">Financial Details</h4>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Discount (%)</label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={orderDetails.discountPercentage}
                              onChange={(e) => setOrderDetails({ ...orderDetails, discountPercentage: parseFloat(e.target.value) || 0 })}
                              className="w-full text-black px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="0.00"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Tax Rate (%)</label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={orderDetails.taxPercentage}
                              onChange={(e) => setOrderDetails({ ...orderDetails, taxPercentage: parseFloat(e.target.value) || 0 })}
                              className="w-full text-black px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="0.00"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Shipping Cost (Rs.)</label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={orderDetails.shippingCost}
                              onChange={(e) => setOrderDetails({ ...orderDetails, shippingCost: parseFloat(e.target.value) || 0 })}
                              className="w-full text-black px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-lg font-semibold text-gray-900 mb-4">Order Total Preview</h4>
                        <div className="bg-gray-50 rounded-lg p-4">
                          {(() => {
                            const totals = calculateOrderTotal();
                            return (
                              <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600">Subtotal:</span>
                                  <span className="text-gray-900">Rs. {typeof totals === 'object' ? totals.subtotal.toFixed(2) : '0.00'}</span>
                                </div>
                                {typeof totals === 'object' && totals.discount > 0 && (
                                  <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Discount ({orderDetails.discountPercentage}%):</span>
                                    <span className="text-red-600">-Rs. {totals.discount.toFixed(2)}</span>
                                  </div>
                                )}
                                {typeof totals === 'object' && totals.tax > 0 && (
                                  <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Tax ({orderDetails.taxPercentage}%):</span>
                                    <span className="text-gray-900">Rs. {typeof totals === 'object' ? totals.tax.toFixed(2) : '0.00'}</span>
                                  </div>
                                )}
                                {typeof totals === 'object' && totals.shipping > 0 && (
                                  <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Shipping:</span>
                                    <span className="text-gray-900">Rs. {totals.shipping.toFixed(2)}</span>
                                  </div>
                                )}
                                <div className="border-t border-gray-300 pt-2">
                                  <div className="flex justify-between">
                                    <span className="font-semibold text-gray-900">Total:</span>
                                    <span className="font-bold text-green-600 text-lg">Rs. {typeof totals === 'object' ? totals.total.toFixed(2) : '0.00'}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Order Notes</label>
                        <textarea
                          value={orderDetails.notes}
                          onChange={(e) => setOrderDetails({ ...orderDetails, notes: e.target.value })}
                          className="w-full text-black px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          rows={4}
                          placeholder="Additional notes or special instructions..."
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 'review' && selectedQuote && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Review Order Details</h3>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Order Summary */}
                    <div className="space-y-6">
                      <div className="bg-white border border-gray-200 rounded-xl p-6">
                        <h4 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h4>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Quote Number:</span>
                            <span className="font-medium text-gray-900">{selectedQuote.number}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Customer:</span>
                            <span className="font-medium text-gray-900">{selectedQuote.customer}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Expected Delivery:</span>
                            <span className="font-medium text-gray-900">
                              {new Date(orderDetails.expectedDelivery).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Priority:</span>
                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(orderDetails.priority)}`}>
                              {orderDetails.priority.toUpperCase()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Payment Terms:</span>
                            <span className="font-medium text-gray-900">
                              {orderDetails.paymentTerms === '0' ? 'Cash on Delivery' : `Net ${orderDetails.paymentTerms} Days`}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white border border-gray-200 rounded-xl p-6">
                        <h4 className="text-lg font-semibold text-gray-900 mb-4">Items ({selectedQuote.items.length})</h4>
                        <div className="space-y-3">
                          {selectedQuote.items.map((item) => (
                            <div key={item.id} className="flex justify-between items-start">
                              <div className="flex-1 mr-4">
                                <p className="font-medium text-gray-900">{item.description}</p>
                                <p className="text-sm text-gray-600">
                                  {item.quantity} × Rs. {item.unitPrice.toFixed(2)}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-medium text-gray-900">Rs. {item.total.toFixed(2)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Financial Breakdown & Addresses */}
                    <div className="space-y-6">
                      <div className="bg-white border border-gray-200 rounded-xl p-6">
                        <h4 className="text-lg font-semibold text-gray-900 mb-4">Financial Breakdown</h4>
                        {(() => {
                          const totals = calculateOrderTotal();
                          return (
                            <div className="space-y-3">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Subtotal:</span>
                                <span className="text-gray-900">Rs. {typeof totals === 'object' ? totals.subtotal.toFixed(2) : '0.00'}</span>
                              </div>
                              {typeof totals === 'object' && totals.discount > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Discount ({orderDetails.discountPercentage}%):</span>
                                  <span className="text-red-600">-Rs. {totals.discount.toFixed(2)}</span>
                                </div>
                              )}
                              {typeof totals === 'object' && totals.tax > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Tax ({orderDetails.taxPercentage}%):</span>
                                  <span className="text-gray-900">Rs. {totals.tax.toFixed(2)}</span>
                                </div>
                              )}
                              {typeof totals === 'object' && totals.shipping > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Shipping:</span>
                                  <span className="text-gray-900">Rs. {totals.shipping.toFixed(2)}</span>
                                </div>
                              )}
                              <div className="border-t border-gray-300 pt-3">
                                <div className="flex justify-between">
                                  <span className="text-lg font-semibold text-gray-900">Total:</span>
                                  <span className="text-2xl font-bold text-green-600">Rs. {typeof totals === 'object' ? totals.total.toFixed(2) : '0.00'}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      {(orderDetails.shippingAddress || orderDetails.billingAddress) && (
                        <div className="bg-white border border-gray-200 rounded-xl p-6">
                          <h4 className="text-lg font-semibold text-gray-900 mb-4">Addresses</h4>
                          <div className="space-y-4">
                            {orderDetails.shippingAddress && (
                              <div>
                                <p className="text-sm font-medium text-gray-700 mb-1">Shipping Address:</p>
                                <p className="text-sm text-gray-600 whitespace-pre-line">{orderDetails.shippingAddress}</p>
                              </div>
                            )}
                            {orderDetails.billingAddress && (
                              <div>
                                <p className="text-sm font-medium text-gray-700 mb-1">Billing Address:</p>
                                <p className="text-sm text-gray-600 whitespace-pre-line">{orderDetails.billingAddress}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {orderDetails.notes && (
                        <div className="bg-white border border-gray-200 rounded-xl p-6">
                          <h4 className="text-lg font-semibold text-gray-900 mb-4">Notes</h4>
                          <p className="text-gray-700 whitespace-pre-line">{orderDetails.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl p-6 mt-6">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h5 className="font-medium text-green-800">Ready to Convert</h5>
                        <p className="text-sm text-green-700 mt-1">
                          This will create a sales order from quote {selectedQuote.number}. The quote status will be updated to "Converted" 
                          and inventory may be reserved based on your system settings.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-white border-t border-gray-200 px-8 py-6 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex space-x-3">
              {currentStep !== 'select' && (
                <button
                  onClick={() => {
                    if (currentStep === 'configure') {
                      setCurrentStep('select');
                    } else if (currentStep === 'review') {
                      setCurrentStep('configure');
                    }
                  }}
                  className="px-6 py-2 text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors duration-200 flex items-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>
              )}
            </div>

            <div className="flex space-x-3">
              <button 
                onClick={onClose} 
                className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
              >
                Cancel
              </button>
              
              {currentStep === 'configure' && selectedQuote && (
                <button
                  onClick={() => setCurrentStep('review')}
                  disabled={!orderDetails.expectedDelivery}
                  className="px-8 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg flex items-center"
                >
                  Review Order
                  <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}
              
              {currentStep === 'review' && (
                <button
                  onClick={handleConvert}
                  disabled={isConverting || !orderDetails.expectedDelivery}
                  className="px-8 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg flex items-center"
                >
                  {isConverting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Converting...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Convert to Order
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Render modal using portal to document.body for proper screen centering
  return createPortal(modalContent, document.body);
}
