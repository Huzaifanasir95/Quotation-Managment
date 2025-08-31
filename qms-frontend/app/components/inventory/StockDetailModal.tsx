'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '../../lib/api';

interface StockDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: any;
}

export default function StockDetailModal({ isOpen, onClose, item }: StockDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'stock' | 'history' | 'alerts'>('details');
  const [stockHistory, setStockHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  // Fetch stock history when modal opens and history tab is active
  useEffect(() => {
    if (isOpen && item && activeTab === 'history') {
      fetchStockHistory();
    }
  }, [isOpen, item, activeTab]);

  const fetchStockHistory = async () => {
    if (!item?.id) return;
    
    setIsLoadingHistory(true);
    setHistoryError(null);
    
    try {
      const response = await apiClient.getProductStockHistory(item.id);
      if (response.success) {
        setStockHistory(response.data || []);
      } else {
        setHistoryError(response.message || 'Failed to fetch stock history');
      }
    } catch (error) {
      console.error('Error fetching stock history:', error);
      setHistoryError('Failed to fetch stock history');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  if (!isOpen || !item) return null;

  const tabs = [
    { id: 'details', name: 'Item Details', icon: '📋' },
    { id: 'stock', name: 'Stock Info', icon: '📦' },
    { id: 'history', name: 'Stock History', icon: '📈' },
    { id: 'alerts', name: 'Alerts', icon: '⚠️' }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'In Stock': return 'bg-green-100 text-green-800';
      case 'Low Stock': return 'bg-yellow-100 text-yellow-800';
      case 'Out of Stock': return 'bg-red-100 text-red-800';
      case 'Available': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStockAlert = () => {
    if (item.current_stock === 0) {
      return { type: 'error', message: 'Item is out of stock', color: 'text-red-600' };
    } else if (item.current_stock <= item.reorder_point) {
      return { type: 'warning', message: 'Reorder point reached', color: 'text-yellow-600' };
    } else if (item.current_stock <= item.reorder_point * 1.5) {
      return { type: 'info', message: 'Stock level is getting low', color: 'text-blue-600' };
    }
    return null;
  };

  const stockAlert = getStockAlert();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Stock Details - {item.name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        {/* Header Info */}
        <div className="p-6 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{item.sku}</h3>
              <p className="text-sm text-gray-600">SKU Code</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Category</p>
              <p className="font-medium text-gray-900">{item.category}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Current Stock</p>
              <p className="text-2xl font-bold text-blue-600">{item.current_stock} {item.unit_of_measure}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Details Tab */}
          {activeTab === 'details' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Item Information</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Name:</span>
                      <span className="font-medium">{item.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">SKU:</span>
                      <span className="font-medium">{item.sku}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Category:</span>
                      <span className="font-medium">{item.category}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Unit of Measure:</span>
                      <span className="font-medium">{item.unit_of_measure}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Status:</span>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(item.status)}`}>
                        {item.status}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4">
                    <span className="text-gray-500">Description:</span>
                    <p className="text-gray-900 mt-1">{item.description}</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Vendor Information</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Vendor:</span>
                      <span className="font-medium">{item.vendor}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Last Purchase Price:</span>
                      <span className="font-medium">${(item.last_purchase_price || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Selling Price:</span>
                      <span className="font-medium">${(item.selling_price || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Last Updated:</span>
                      <span className="font-medium">{new Date(item.updated_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Linked Purchase Orders */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Linked Purchase Orders</h4>
                {item.linkedPOs.length > 0 ? (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="space-y-2">
                      {item.linkedPOs.map((po: string, index: number) => (
                        <div key={index} className="flex items-center space-x-3">
                          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span className="text-blue-600 hover:text-blue-800 cursor-pointer font-medium">{po}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No linked purchase orders</p>
                )}
              </div>
            </div>
          )}

          {/* Stock Tab */}
          {activeTab === 'stock' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">{item.current_stock}</div>
                  <div className="text-sm text-blue-800">Current Stock</div>
                  <div className="text-xs text-blue-600 mt-1">{item.unit_of_measure}</div>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-600">{item.reorder_point}</div>
                  <div className="text-sm text-yellow-800">Reorder Point</div>
                  <div className="text-xs text-yellow-600 mt-1">Trigger Level</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">${((item.current_stock || 0) * (item.last_purchase_price || 0)).toLocaleString()}</div>
                  <div className="text-sm text-green-800">Total Value</div>
                  <div className="text-xs text-green-600 mt-1">Stock × Price</div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Stock Level Analysis</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Stock Level:</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            item.current_stock === 0 ? 'bg-red-500' :
                            item.current_stock <= item.reorder_point ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                          style={{ 
                            width: `${Math.min(100, (item.current_stock / Math.max(item.reorder_point * 2, 1)) * 100)}%` 
                          }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-600">
                        {item.current_stock}/{Math.max(item.reorder_point * 2, item.current_stock)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Days Until Stockout:</span>
                    <span className="font-medium">
                      {item.current_stock === 0 ? 'Out of Stock' : 
                       item.current_stock <= item.reorder_point ? 'Critical' : 'Safe'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div>
              <h4 className="font-medium text-gray-900 mb-4">Stock Movement History</h4>
              <div className="bg-gray-50 rounded-lg p-4">
                {isLoadingHistory ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-3 text-gray-600">Loading stock history...</span>
                  </div>
                ) : historyError ? (
                  <div className="text-center py-8">
                    <p className="text-red-500">{historyError}</p>
                    <button 
                      onClick={fetchStockHistory}
                      className="mt-2 text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Retry
                    </button>
                  </div>
                ) : stockHistory.length > 0 ? (
                  <div className="space-y-4">
                    {stockHistory.map((entry: any, index: number) => (
                      <div key={index} className="flex items-start space-x-4">
                        <div className={`w-3 h-3 rounded-full mt-2 ${
                          entry.movement_type === 'in' ? 'bg-green-500' : 'bg-red-500'
                        }`} />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-gray-900">
                              {entry.movement_type === 'in' ? 'Stock In' : 'Stock Out'}
                            </p>
                            <p className="text-sm text-gray-500">
                              {new Date(entry.movement_date).toLocaleDateString()}
                            </p>
                          </div>
                          <p className="text-sm text-gray-600">
                            Quantity: {entry.movement_type === 'in' ? '+' : '-'}{entry.quantity} {item.unit_of_measure}
                          </p>
                          <p className="text-sm text-gray-600">
                            Reference: {entry.reference_type} - {entry.reference_id}
                          </p>
                          {entry.notes && (
                            <p className="text-sm text-gray-500">{entry.notes}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No stock movement history available</p>
                )}
              </div>
            </div>
          )}

          {/* Alerts Tab */}
          {activeTab === 'alerts' && (
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Stock Alerts & Notifications</h4>
              
              {stockAlert ? (
                <div className={`bg-${stockAlert.type === 'error' ? 'red' : stockAlert.type === 'warning' ? 'yellow' : 'blue'}-50 border border-${stockAlert.type === 'error' ? 'red' : stockAlert.type === 'warning' ? 'yellow' : 'blue'}-200 rounded-lg p-4`}>
                  <div className="flex items-start space-x-3">
                    <svg className={`w-6 h-6 text-${stockAlert.type === 'error' ? 'red' : stockAlert.type === 'warning' ? 'yellow' : 'blue'}-500 mt-0.5`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {stockAlert.type === 'error' ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      ) : stockAlert.type === 'warning' ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      )}
                    </svg>
                    <div>
                      <p className={`font-medium ${stockAlert.color}`}>{stockAlert.message}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        Current stock: {item.current_stock} {item.unit_of_measure} | Reorder point: {item.reorder_point} {item.unit_of_measure}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <svg className="w-6 h-6 text-green-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="font-medium text-green-800">Stock levels are healthy</p>
                      <p className="text-sm text-green-600 mt-1">
                        Current stock is above reorder point. No immediate action required.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Additional Alerts */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h5 className="font-medium text-gray-900 mb-3">Additional Information</h5>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Last Stock Update:</span>
                    <span className="text-gray-900">{item.lastUpdated}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Stock Value:</span>
                    <span className="text-gray-900">${((item.current_stock || 0) * (item.last_purchase_price || 0)).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Average Cost:</span>
                    <span className="text-gray-900">${(item.average_cost || item.last_purchase_price || 0).toFixed(2)}</span>
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
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
