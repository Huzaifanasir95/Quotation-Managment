'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { apiClient } from '../../lib/api';

interface RejectionHandlingModalProps {
  isOpen: boolean;
  onClose: () => void;
  rejectionId: string | null;
  onRejectionUpdated?: () => void;
}

interface RejectedItem {
  id: string;
  description: string;
  rejected_quantity: number;
  rejection_reason: string;
  return_status: 'pending' | 'approved' | 'returned' | 'non_returnable' | 'replaced';
  vendor_response?: string;
  return_date?: string;
  replacement_date?: string;
  inventory_location?: string;
  cost_impact?: number;
}

interface RejectionHandling {
  id: string;
  delivery_acceptance_id: string;
  rejection_date: string;
  total_rejected_items: number;
  overall_status: 'pending' | 'processing' | 'resolved' | 'partially_resolved';
  vendor_contacted_date?: string;
  vendor_response_date?: string;
  resolution_notes?: string;
  items: RejectedItem[];
  delivery_info?: {
    challan_number: string;
    vendor_name: string;
    vendor_contact: string;
    vendor_email: string;
  };
}

export default function RejectionHandlingModal({
  isOpen,
  onClose,
  rejectionId,
  onRejectionUpdated
}: RejectionHandlingModalProps) {
  const [mounted, setMounted] = useState(false);
  const [rejection, setRejection] = useState<RejectionHandling | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'items' | 'vendor' | 'inventory'>('items');
  const [vendorCommunication, setVendorCommunication] = useState({
    message: '',
    contact_method: 'email' as 'email' | 'phone' | 'whatsapp',
    expected_response_date: ''
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen && rejectionId) {
      fetchRejectionDetails();
    }
  }, [isOpen, rejectionId]);

  const fetchRejectionDetails = async () => {
    if (!rejectionId) return;
    
    setLoading(true);
    try {
      const response = await apiClient.getRejectionHandling(rejectionId);
      if (response.success) {
        setRejection(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch rejection details:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateItemStatus = (itemId: string, field: string, value: any) => {
    if (!rejection) return;
    
    setRejection({
      ...rejection,
      items: rejection.items.map(item => 
        item.id === itemId 
          ? { ...item, [field]: value }
          : item
      )
    });
  };

  const handleVendorContact = async () => {
    if (!rejection) return;
    
    setSaving(true);
    try {
      const response = await apiClient.contactVendorForRejection(rejection.id, {
        message: vendorCommunication.message,
        contact_method: vendorCommunication.contact_method,
        expected_response_date: vendorCommunication.expected_response_date
      });
      
      if (response.success) {
        setRejection({
          ...rejection,
          vendor_contacted_date: new Date().toISOString()
        });
        setVendorCommunication({ message: '', contact_method: 'email', expected_response_date: '' });
      }
    } catch (error) {
      console.error('Failed to contact vendor:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveRejection = async () => {
    if (!rejection) return;
    
    setSaving(true);
    try {
      const response = await apiClient.updateRejectionHandling(rejection.id, {
        items: rejection.items,
        resolution_notes: rejection.resolution_notes
      });
      
      if (response.success) {
        if (onRejectionUpdated) {
          onRejectionUpdated();
        }
        onClose();
      }
    } catch (error) {
      console.error('Failed to save rejection:', error);
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
            <h2 className="text-xl font-semibold text-gray-900">Rejection & Return Management</h2>
            {rejection?.delivery_info && (
              <p className="text-sm text-gray-600 mt-1">
                Challan: {rejection.delivery_info.challan_number} | 
                Vendor: {rejection.delivery_info.vendor_name}
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading rejection details...</span>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden">
            {/* Tabs */}
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6">
                {[
                  { key: 'items', label: 'Rejected Items', icon: '📦' },
                  { key: 'vendor', label: 'Vendor Communication', icon: '📞' },
                  { key: 'inventory', label: 'Inventory Impact', icon: '📊' }
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as any)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.key
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <span className="mr-2">{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              {/* Items Tab */}
              {activeTab === 'items' && (
                <div className="space-y-6">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Item Description
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Rejected Qty
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Rejection Reason
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Return Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Action Required
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {rejection?.items.map((item) => (
                          <tr key={item.id}>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {item.description}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {item.rejected_quantity}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {item.rejection_reason}
                            </td>
                            <td className="px-6 py-4">
                              <select
                                value={item.return_status}
                                onChange={(e) => updateItemStatus(item.id, 'return_status', e.target.value)}
                                className="text-sm border border-gray-300 rounded px-2 py-1"
                              >
                                <option value="pending">Pending</option>
                                <option value="approved">Return Approved</option>
                                <option value="returned">Returned to Vendor</option>
                                <option value="non_returnable">Non-Returnable</option>
                                <option value="replaced">Replaced</option>
                              </select>
                            </td>
                            <td className="px-6 py-4 text-sm">
                              {item.return_status === 'non_returnable' && (
                                <input
                                  type="text"
                                  placeholder="Inventory location"
                                  value={item.inventory_location || ''}
                                  onChange={(e) => updateItemStatus(item.id, 'inventory_location', e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                />
                              )}
                              {item.return_status === 'returned' && (
                                <input
                                  type="date"
                                  value={item.return_date || ''}
                                  onChange={(e) => updateItemStatus(item.id, 'return_date', e.target.value)}
                                  className="px-2 py-1 border border-gray-300 rounded text-sm"
                                />
                              )}
                              {item.return_status === 'replaced' && (
                                <input
                                  type="date"
                                  value={item.replacement_date || ''}
                                  onChange={(e) => updateItemStatus(item.id, 'replacement_date', e.target.value)}
                                  className="px-2 py-1 border border-gray-300 rounded text-sm"
                                />
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Vendor Tab */}
              {activeTab === 'vendor' && (
                <div className="space-y-6">
                  {rejection?.delivery_info && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="font-medium text-gray-900 mb-3">Vendor Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Vendor Name:</span>
                          <p className="font-medium">{rejection.delivery_info.vendor_name}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Contact Person:</span>
                          <p className="font-medium">{rejection.delivery_info.vendor_contact}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Email:</span>
                          <p className="font-medium">{rejection.delivery_info.vendor_email}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <h3 className="font-medium text-gray-900 mb-4">Contact Vendor</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Communication Method
                        </label>
                        <select
                          value={vendorCommunication.contact_method}
                          onChange={(e) => setVendorCommunication({
                            ...vendorCommunication, 
                            contact_method: e.target.value as any
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        >
                          <option value="email">Email</option>
                          <option value="phone">Phone Call</option>
                          <option value="whatsapp">WhatsApp</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Message to Vendor
                        </label>
                        <textarea
                          value={vendorCommunication.message}
                          onChange={(e) => setVendorCommunication({
                            ...vendorCommunication, 
                            message: e.target.value
                          })}
                          rows={4}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          placeholder="Describe the rejection and required action..."
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Expected Response Date
                        </label>
                        <input
                          type="date"
                          value={vendorCommunication.expected_response_date}
                          onChange={(e) => setVendorCommunication({
                            ...vendorCommunication, 
                            expected_response_date: e.target.value
                          })}
                          className="px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                      <button
                        onClick={handleVendorContact}
                        disabled={!vendorCommunication.message}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                      >
                        Send Communication
                      </button>
                    </div>
                  </div>

                  {rejection?.vendor_contacted_date && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h4 className="font-medium text-green-800">Vendor Contacted</h4>
                      <p className="text-sm text-green-700 mt-1">
                        Last contacted on: {new Date(rejection.vendor_contacted_date).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Inventory Tab */}
              {activeTab === 'inventory' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="font-medium text-gray-900 mb-4">Non-Returnable Items Inventory</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Item
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Quantity
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Storage Location
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Cost Impact
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Reason
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {rejection?.items
                            .filter(item => item.return_status === 'non_returnable')
                            .map((item) => (
                              <tr key={item.id}>
                                <td className="px-6 py-4 text-sm text-gray-900">
                                  {item.description}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-900">
                                  {item.rejected_quantity}
                                </td>
                                <td className="px-6 py-4">
                                  <input
                                    type="text"
                                    value={item.inventory_location || ''}
                                    onChange={(e) => updateItemStatus(item.id, 'inventory_location', e.target.value)}
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                    placeholder="Warehouse/Location"
                                  />
                                </td>
                                <td className="px-6 py-4">
                                  <input
                                    type="number"
                                    value={item.cost_impact || 0}
                                    onChange={(e) => updateItemStatus(item.id, 'cost_impact', Number(e.target.value))}
                                    className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                                    placeholder="0.00"
                                  />
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-900">
                                  {item.rejection_reason}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Total Cost Impact</h4>
                    <p className="text-2xl font-bold text-red-600">
                      ${rejection?.items
                        .filter(item => item.return_status === 'non_returnable')
                        .reduce((sum, item) => sum + (item.cost_impact || 0), 0)
                        .toFixed(2)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            Status: <span className="font-medium">{rejection?.overall_status?.toUpperCase()}</span>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveRejection}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return isOpen ? createPortal(modalContent, document.body) : null;
}
