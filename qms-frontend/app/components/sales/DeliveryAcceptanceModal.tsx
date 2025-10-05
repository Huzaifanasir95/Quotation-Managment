'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { apiClient } from '../../lib/api';

interface DeliveryAcceptanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  deliveryId: string | null;
  onAcceptanceUpdated?: () => void;
}

interface DeliveryItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  delivered_quantity: number;
  accepted_quantity?: number;
  rejected_quantity?: number;
  rejection_reason?: string;
  acceptance_status: 'pending' | 'accepted' | 'partially_accepted' | 'rejected';
}

interface DeliveryAcceptance {
  id: string;
  delivery_challan_id: string;
  acceptance_status: 'pending' | 'accepted' | 'partially_accepted' | 'rejected';
  acceptance_date?: string;
  customer_signature?: string;
  acceptance_notes?: string;
  rejection_notes?: string;
  acceptance_certificate_url?: string;
  accepted_by_name?: string;
  accepted_by_designation?: string;
  accepted_by_contact?: string;
  items: DeliveryItem[];
  delivery_challan?: {
    challan_number: string;
    challan_date: string;
    delivery_address: string;
    contact_person: string;
    phone: string;
    purchase_orders?: {
      po_number: string;
      vendors?: {
        name: string;
        contact_person: string;
        phone: string;
        email: string;
      };
    };
  };
}

export default function DeliveryAcceptanceModal({
  isOpen,
  onClose,
  deliveryId,
  onAcceptanceUpdated
}: DeliveryAcceptanceModalProps) {
  const [mounted, setMounted] = useState(false);
  const [delivery, setDelivery] = useState<DeliveryAcceptance | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'acceptance' | 'signature' | 'certificate'>('acceptance');
  const [acceptanceData, setAcceptanceData] = useState({
    acceptance_status: 'pending' as const,
    acceptance_notes: '',
    rejection_notes: '',
    accepted_by_name: '',
    accepted_by_designation: '',
    accepted_by_contact: ''
  });
  const [signatureData, setSignatureData] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [generateCertificate, setGenerateCertificate] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen && deliveryId) {
      fetchDeliveryDetails();
    }
  }, [isOpen, deliveryId]);

  const fetchDeliveryDetails = async () => {
    if (!deliveryId) return;
    
    setLoading(true);
    try {
      const response = await apiClient.getDeliveryAcceptance(deliveryId);
      if (response.success) {
        setDelivery(response.data);
        setAcceptanceData({
          acceptance_status: response.data.acceptance_status || 'pending',
          acceptance_notes: response.data.acceptance_notes || '',
          rejection_notes: response.data.rejection_notes || '',
          accepted_by_name: response.data.accepted_by_name || '',
          accepted_by_designation: response.data.accepted_by_designation || '',
          accepted_by_contact: response.data.accepted_by_contact || ''
        });
      }
    } catch (error) {
      console.error('Failed to fetch delivery details:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateItemAcceptance = (itemId: string, field: string, value: any) => {
    if (!delivery) return;
    
    setDelivery({
      ...delivery,
      items: delivery.items.map(item => 
        item.id === itemId 
          ? { ...item, [field]: value }
          : item
      )
    });
  };

  const calculateItemStatus = (item: DeliveryItem) => {
    const acceptedQty = item.accepted_quantity || 0;
    const rejectedQty = item.rejected_quantity || 0;
    const deliveredQty = item.delivered_quantity;

    if (acceptedQty === 0 && rejectedQty === deliveredQty) return 'rejected';
    if (acceptedQty === deliveredQty && rejectedQty === 0) return 'accepted';
    if (acceptedQty + rejectedQty === deliveredQty) return 'partially_accepted';
    return 'pending';
  };

  const calculateOverallStatus = () => {
    if (!delivery?.items.length) return 'pending';
    
    const statuses = delivery.items.map(calculateItemStatus);
    const uniqueStatuses = [...new Set(statuses)];
    
    if (uniqueStatuses.length === 1) return uniqueStatuses[0];
    if (uniqueStatuses.includes('rejected') || uniqueStatuses.includes('partially_accepted')) {
      return 'partially_accepted';
    }
    return 'pending';
  };

  // Signature Canvas Functions
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    if (canvasRef.current) {
      setSignatureData(canvasRef.current.toDataURL());
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureData('');
  };

  const handleSaveAcceptance = async () => {
    if (!delivery) return;
    
    setSaving(true);
    try {
      const overallStatus = calculateOverallStatus();
      const acceptancePayload = {
        delivery_challan_id: delivery.delivery_challan_id,
        acceptance_status: overallStatus,
        acceptance_date: new Date().toISOString(),
        acceptance_notes: acceptanceData.acceptance_notes,
        rejection_notes: acceptanceData.rejection_notes,
        accepted_by_name: acceptanceData.accepted_by_name,
        accepted_by_designation: acceptanceData.accepted_by_designation,
        accepted_by_contact: acceptanceData.accepted_by_contact,
        customer_signature: signatureData,
        generate_certificate: generateCertificate,
        items: delivery.items.map(item => ({
          id: item.id,
          accepted_quantity: item.accepted_quantity || 0,
          rejected_quantity: item.rejected_quantity || 0,
          rejection_reason: item.rejection_reason || '',
          acceptance_status: calculateItemStatus(item)
        }))
      };

      const response = await apiClient.updateDeliveryAcceptance(delivery.id, acceptancePayload);
      
      if (response.success) {
        if (onAcceptanceUpdated) {
          onAcceptanceUpdated();
        }
        onClose();
      } else {
        throw new Error(response.message || 'Failed to save acceptance');
      }
    } catch (error) {
      console.error('Failed to save acceptance:', error);
      alert(`Failed to save acceptance: ${error instanceof Error ? error.message : 'Please try again.'}`);
    } finally {
      setSaving(false);
    }
  };

  if (!mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Delivery Acceptance</h2>
            {delivery?.delivery_challan && (
              <p className="text-sm text-gray-600 mt-1">
                Challan: {delivery.delivery_challan.challan_number} | 
                PO: {delivery.delivery_challan.purchase_orders?.po_number}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading delivery details...</span>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden">
            {/* Tabs */}
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6">
                {[
                  { key: 'acceptance', label: 'Item Acceptance', icon: '📦' },
                  { key: 'signature', label: 'Digital Signature', icon: '✍️' },
                  { key: 'certificate', label: 'Certificate', icon: '📜' }
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as any)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.key
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <span className="mr-2">{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              {/* Acceptance Tab */}
              {activeTab === 'acceptance' && (
                <div className="space-y-6">
                  {/* Delivery Information */}
                  {delivery?.delivery_challan && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="font-medium text-gray-900 mb-3">Delivery Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Challan Number:</span>
                          <p className="font-medium">{delivery.delivery_challan.challan_number}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Delivery Date:</span>
                          <p className="font-medium">
                            {new Date(delivery.delivery_challan.challan_date).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500">Contact Person:</span>
                          <p className="font-medium">{delivery.delivery_challan.contact_person}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Vendor:</span>
                          <p className="font-medium">
                            {delivery.delivery_challan.purchase_orders?.vendors?.name}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500">Delivery Address:</span>
                          <p className="font-medium">{delivery.delivery_challan.delivery_address}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Items Acceptance */}
                  <div>
                    <h3 className="font-medium text-gray-900 mb-4">Items for Acceptance</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Item Description
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Delivered Qty
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Accepted Qty
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Rejected Qty
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Rejection Reason
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {delivery?.items.map((item) => (
                            <tr key={item.id}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {item.description}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {item.delivered_quantity}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <input
                                  type="number"
                                  min="0"
                                  max={item.delivered_quantity}
                                  value={item.accepted_quantity || 0}
                                  onChange={(e) => updateItemAcceptance(item.id, 'accepted_quantity', Number(e.target.value))}
                                  className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                                />
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <input
                                  type="number"
                                  min="0"
                                  max={item.delivered_quantity}
                                  value={item.rejected_quantity || 0}
                                  onChange={(e) => updateItemAcceptance(item.id, 'rejected_quantity', Number(e.target.value))}
                                  className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                                />
                              </td>
                              <td className="px-6 py-4">
                                <input
                                  type="text"
                                  value={item.rejection_reason || ''}
                                  onChange={(e) => updateItemAcceptance(item.id, 'rejection_reason', e.target.value)}
                                  placeholder="Reason for rejection"
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                />
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  calculateItemStatus(item) === 'accepted' 
                                    ? 'bg-green-100 text-green-800'
                                    : calculateItemStatus(item) === 'rejected'
                                    ? 'bg-red-100 text-red-800'
                                    : calculateItemStatus(item) === 'partially_accepted'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {calculateItemStatus(item).replace('_', ' ')}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Acceptance Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Acceptance Notes
                      </label>
                      <textarea
                        value={acceptanceData.acceptance_notes}
                        onChange={(e) => setAcceptanceData({...acceptanceData, acceptance_notes: e.target.value})}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Notes about accepted items..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Rejection Notes
                      </label>
                      <textarea
                        value={acceptanceData.rejection_notes}
                        onChange={(e) => setAcceptanceData({...acceptanceData, rejection_notes: e.target.value})}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Notes about rejected items..."
                      />
                    </div>
                  </div>

                  {/* Accepted By Information */}
                  <div>
                    <h3 className="font-medium text-gray-900 mb-4">Accepted By</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Name *
                        </label>
                        <input
                          type="text"
                          value={acceptanceData.accepted_by_name}
                          onChange={(e) => setAcceptanceData({...acceptanceData, accepted_by_name: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Full name"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Designation
                        </label>
                        <input
                          type="text"
                          value={acceptanceData.accepted_by_designation}
                          onChange={(e) => setAcceptanceData({...acceptanceData, accepted_by_designation: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Job title"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Contact
                        </label>
                        <input
                          type="text"
                          value={acceptanceData.accepted_by_contact}
                          onChange={(e) => setAcceptanceData({...acceptanceData, accepted_by_contact: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Phone or email"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Signature Tab */}
              {activeTab === 'signature' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="font-medium text-gray-900 mb-4">Digital Signature</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Please sign below to confirm acceptance of the delivery:
                    </p>
                    
                    <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                      <canvas
                        ref={canvasRef}
                        width={600}
                        height={200}
                        className="border border-gray-200 bg-white rounded cursor-crosshair w-full"
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                      />
                      <div className="mt-3 flex justify-between items-center">
                        <p className="text-sm text-gray-500">Sign above with your mouse or touch</p>
                        <button
                          onClick={clearSignature}
                          className="px-3 py-1 text-sm text-red-600 hover:text-red-700 border border-red-300 rounded hover:bg-red-50"
                        >
                          Clear Signature
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Certificate Tab */}
              {activeTab === 'certificate' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="font-medium text-gray-900 mb-4">Acceptance Certificate</h3>
                    
                    <div className="flex items-center space-x-3 mb-6">
                      <input
                        type="checkbox"
                        id="generateCertificate"
                        checked={generateCertificate}
                        onChange={(e) => setGenerateCertificate(e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="generateCertificate" className="text-sm font-medium text-gray-700">
                        Generate Acceptance Certificate
                      </label>
                    </div>

                    {generateCertificate && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start">
                          <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="ml-3">
                            <h4 className="text-sm font-medium text-blue-800">
                              Certificate will be generated
                            </h4>
                            <p className="text-sm text-blue-700 mt-1">
                              An official acceptance certificate will be automatically generated with:
                            </p>
                            <ul className="text-sm text-blue-700 mt-2 list-disc list-inside space-y-1">
                              <li>Delivery details and item acceptance status</li>
                              <li>Digital signature and acceptance information</li>
                              <li>Timestamp and unique certificate number</li>
                              <li>Company letterhead and official seal</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}

                    {delivery?.acceptance_certificate_url && (
                      <div className="mt-6">
                        <h4 className="font-medium text-gray-900 mb-2">Previous Certificate</h4>
                        <a
                          href={delivery.acceptance_certificate_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Download Certificate
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            Overall Status: <span className={`font-medium ${
              calculateOverallStatus() === 'accepted' ? 'text-green-600' :
              calculateOverallStatus() === 'rejected' ? 'text-red-600' :
              calculateOverallStatus() === 'partially_accepted' ? 'text-yellow-600' :
              'text-gray-600'
            }`}>
              {calculateOverallStatus().replace('_', ' ').toUpperCase()}
            </span>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveAcceptance}
              disabled={saving || !acceptanceData.accepted_by_name}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Acceptance'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return isOpen ? createPortal(modalContent, document.body) : null;
}
