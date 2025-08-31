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
    <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50 p-4" style={{ backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Generate Delivery Challan</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        {!generatedChallan ? (
          <>
            <div className="p-6">
              {selectedPO && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <h3 className="font-medium text-blue-900 mb-2">Purchase Order: {selectedPO.po_number}</h3>
                  <p className="text-sm text-blue-700">Vendor: {selectedPO.vendors?.name || 'Unknown Vendor'} | Amount: ${(selectedPO.total_amount || 0).toLocaleString()}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Challan Number</label>
                  <input
                    type="text"
                    value={challanData.challanNumber}
                    onChange={(e) => setChallanData({ ...challanData, challanNumber: e.target.value })}
                    className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Date</label>
                  <input
                    type="date"
                    value={challanData.deliveryDate}
                    onChange={(e) => setChallanData({ ...challanData, deliveryDate: e.target.value })}
                    className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Address</label>
                  <textarea
                    value={challanData.deliveryAddress}
                    onChange={(e) => setChallanData({ ...challanData, deliveryAddress: e.target.value })}
                    rows={3}
                    className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Contact Person</label>
                  <input
                    type="text"
                    value={challanData.contactPerson}
                    onChange={(e) => setChallanData({ ...challanData, contactPerson: e.target.value })}
                    className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                  <input
                    type="tel"
                    value={challanData.phone}
                    onChange={(e) => setChallanData({ ...challanData, phone: e.target.value })}
                    className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  <textarea
                    value={challanData.notes}
                    onChange={(e) => setChallanData({ ...challanData, notes: e.target.value })}
                    rows={3}
                    className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
              <button onClick={handleClose} className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={handleGenerateChallan}
                disabled={isGenerating}
                className="px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isGenerating ? 'Generating...' : 'Generate Challan'}
              </button>
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
