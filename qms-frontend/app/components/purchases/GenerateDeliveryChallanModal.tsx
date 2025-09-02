'use client';

import { useState } from 'react';
import { apiClient, type PurchaseOrder } from '../../lib/api';

interface GenerateDeliveryChallanModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPO: PurchaseOrder | null;
  onChallanGenerated?: () => void;
}

export default function GenerateDeliveryChallanModal({ isOpen, onClose, selectedPO, onChallanGenerated }: GenerateDeliveryChallanModalProps) {
  const [challanData, setChallanData] = useState({
    challanNumber: '',
    deliveryDate: '',
    deliveryAddress: '',
    contactPerson: '',
    phone: '',
    notes: ''
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedChallan, setGeneratedChallan] = useState<any>(null);

  const generateChallanNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `DC-${year}${month}-${random}`;
  };

  const initializeChallan = () => {
    if (selectedPO) {
      setChallanData({
        challanNumber: generateChallanNumber(),
        deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        deliveryAddress: 'Company Address, City, State, ZIP',
        contactPerson: 'Receiving Department',
        phone: '+1 (555) 123-4567',
        notes: `Delivery challan for ${selectedPO.po_number}`
      });
    }
  };

  if (isOpen && selectedPO && challanData.challanNumber === '') {
    initializeChallan();
  }

  const handleGenerateChallan = async () => {
    if (!selectedPO) return;

    if (!challanData.challanNumber || !challanData.deliveryDate) {
      alert('Please fill in all required fields.');
      return;
    }

    setIsGenerating(true);
    
    try {
      const deliveryChallanData = {
        challan_number: challanData.challanNumber,
        purchase_order_id: selectedPO.id,
        challan_date: new Date().toISOString().split('T')[0],
        delivery_date: challanData.deliveryDate,
        delivery_address: challanData.deliveryAddress || null,
        contact_person: challanData.contactPerson || null,
        phone: challanData.phone || null,
        notes: challanData.notes || null
      };
      
      const response = await apiClient.createDeliveryChallan(deliveryChallanData);
      
      if (response.success) {
        const challan = {
          ...challanData,
          poId: selectedPO.id,
          poNumber: selectedPO.po_number,
          vendor: selectedPO.vendors?.name || 'Unknown Vendor',
          totalAmount: selectedPO.total_amount || 0,
          generatedAt: new Date().toISOString(),
          status: 'Generated'
        };
        
        setGeneratedChallan(challan);
        
        // Call callback to refresh data if provided
        if (onChallanGenerated) {
          onChallanGenerated();
        }
      } else {
        throw new Error(response.message || 'Failed to create delivery challan');
      }
      
    } catch (error) {
      console.error('Failed to generate challan:', error);
      alert(`Failed to generate delivery challan: ${error instanceof Error ? error.message : 'Please try again.'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClose = () => {
    setGeneratedChallan(null);
    setChallanData({
      challanNumber: '',
      deliveryDate: '',
      deliveryAddress: '',
      contactPerson: '',
      phone: '',
      notes: ''
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-y-auto pointer-events-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-t-xl">
          <div className="flex items-center space-x-3">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <div>
              <h2 className="text-2xl font-bold">Generate Delivery Challan</h2>
              <p className="text-purple-100 text-sm">Create delivery challan for purchase orders</p>
            </div>
          </div>
          <button 
            onClick={handleClose} 
            className="text-white hover:text-gray-200 transition-colors duration-200 text-2xl font-light"
          >
            ✕
          </button>
        </div>

        {!generatedChallan ? (
          <>
            <div className="p-6 space-y-6">
              {selectedPO && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
                  <div className="flex items-center mb-4">
                    <svg className="w-6 h-6 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3 className="text-lg font-semibold text-blue-900">Purchase Order Details</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-lg p-4 border border-blue-100">
                      <span className="text-sm text-blue-600 font-medium">PO Number</span>
                      <p className="text-lg font-bold text-blue-900">{selectedPO.po_number}</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-blue-100">
                      <span className="text-sm text-blue-600 font-medium">Vendor</span>
                      <p className="text-lg font-bold text-blue-900">{selectedPO.vendors?.name || 'Unknown Vendor'}</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-blue-100">
                      <span className="text-sm text-blue-600 font-medium">Total Amount</span>
                      <p className="text-lg font-bold text-green-600">${(selectedPO.total_amount || 0).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                  <svg className="w-6 h-6 text-purple-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Delivery Challan Details
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Challan Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={challanData.challanNumber}
                      onChange={(e) => setChallanData({ ...challanData, challanNumber: e.target.value })}
                      className="w-full text-black px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                      placeholder="Enter challan number"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Delivery Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={challanData.deliveryDate}
                      onChange={(e) => setChallanData({ ...challanData, deliveryDate: e.target.value })}
                      className="w-full text-black px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Address</label>
                    <textarea
                      value={challanData.deliveryAddress}
                      onChange={(e) => setChallanData({ ...challanData, deliveryAddress: e.target.value })}
                      rows={3}
                      className="w-full text-black px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 resize-none"
                      placeholder="Enter delivery address..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Contact Person</label>
                    <input
                      type="text"
                      value={challanData.contactPerson}
                      onChange={(e) => setChallanData({ ...challanData, contactPerson: e.target.value })}
                      className="w-full text-black px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                      placeholder="Enter contact person name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                    <input
                      type="tel"
                      value={challanData.phone}
                      onChange={(e) => setChallanData({ ...challanData, phone: e.target.value })}
                      className="w-full text-black px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                      placeholder="Enter phone number"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                    <textarea
                      value={challanData.notes}
                      onChange={(e) => setChallanData({ ...challanData, notes: e.target.value })}
                      rows={4}
                      className="w-full text-black px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 resize-none"
                      placeholder="Additional notes for delivery..."
                    />
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
                  onClick={handleClose}
                  className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-medium shadow-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerateChallan}
                  disabled={isGenerating}
                  className="px-8 py-3 text-white bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg hover:shadow-xl flex items-center space-x-2"
                >
                  {isGenerating ? (
                    <>
                      <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span>Generate Challan</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="p-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <h3 className="text-lg font-medium text-green-900">Delivery Challan Generated Successfully!</h3>
                <p className="text-sm text-green-700 mt-1">Challan {generatedChallan.challanNumber} is ready.</p>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="grid grid-cols-2 gap-6 text-sm">
                  <div>
                    <span className="text-gray-500">Challan Number:</span>
                    <span className="ml-2 font-medium">{generatedChallan.challanNumber}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">PO Reference:</span>
                    <span className="ml-2 font-medium">{generatedChallan.poNumber}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Vendor:</span>
                    <span className="ml-2 font-medium">{generatedChallan.vendor}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Total Amount:</span>
                    <span className="ml-2 font-medium">${generatedChallan.totalAmount.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center space-x-4 mt-6">
                <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Download PDF
                </button>
                <button className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700">
                  Print Challan
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end p-6 border-t border-gray-200 bg-gray-50">
              <button onClick={handleClose} className="px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
