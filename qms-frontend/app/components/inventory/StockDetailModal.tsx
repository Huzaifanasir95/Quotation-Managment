'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '../../lib/api';

interface StockDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: any;
}

export default function StockDetailModal({ isOpen, onClose, item }: StockDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'stock' | 'alerts'>('details');

  if (!isOpen || !item) return null;

  const tabs = [
    { id: 'details', name: 'Item Details', icon: '📋' },
    { id: 'stock', name: 'Stock Info', icon: '📦' },
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
    if (item.currentStock === 0) {
      return { type: 'error', message: 'Item is out of stock', color: 'text-red-600' };
    } else if (item.currentStock <= item.reorderPoint) {
      return { type: 'warning', message: 'Reorder point reached', color: 'text-yellow-600' };
    } else if (item.currentStock <= item.reorderPoint * 1.5) {
      return { type: 'info', message: 'Stock level is getting low', color: 'text-blue-600' };
    }
    return null;
  };

  const stockAlert = getStockAlert();

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backdropFilter: 'blur(4px)' }}>
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
              <p className="text-2xl font-bold text-blue-600">{item.currentStock} {item.unitOfMeasure}</p>
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
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                  activeTab === tab.id
                    ? 'border-gray-800 text-gray-800'
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
                      <span className="text-gray-700 font-medium">Name:</span>
                      <span className="font-medium text-gray-900">{item.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700 font-medium">SKU:</span>
                      <span className="font-medium text-gray-900">{item.sku}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700 font-medium">Category:</span>
                      <span className="font-medium text-gray-900">{item.category}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700 font-medium">Unit of Measure:</span>
                      <span className="font-medium text-gray-900">{item.unitOfMeasure}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700 font-medium">Type:</span>
                      <span className="font-medium text-gray-900 capitalize">{item.type?.replace('_', ' ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700 font-medium">Status:</span>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(item.status)}`}>
                        {item.status}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4">
                    <span className="text-gray-700 font-medium">Description:</span>
                    <p className="text-gray-900 mt-1 font-medium">{item.description || 'No description available'}</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Pricing Information</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-700 font-medium">Last Purchase Price:</span>
                      <span className="font-medium text-gray-900">${(item.lastPurchasePrice || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700 font-medium">Average Cost:</span>
                      <span className="font-medium text-gray-900">${(item.averageCost || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700 font-medium">Selling Price:</span>
                      <span className="font-medium text-gray-900">${(item.sellingPrice || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700 font-medium">Total Value:</span>
                      <span className="font-medium text-green-700">${(item.totalValue || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700 font-medium">Last Updated:</span>
                      <span className="font-medium text-gray-900">{item.lastUpdated}</span>
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
                  <div className="text-2xl font-bold text-blue-600">{item.currentStock}</div>
                  <div className="text-sm text-blue-800">Current Stock</div>
                  <div className="text-xs text-blue-600 mt-1">{item.unitOfMeasure}</div>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-600">{item.reorderPoint}</div>
                  <div className="text-sm text-yellow-800">Reorder Point</div>
                  <div className="text-xs text-yellow-600 mt-1">Trigger Level</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">${((item.currentStock || 0) * (item.lastPurchasePrice || 0)).toLocaleString()}</div>
                  <div className="text-sm text-green-800">Total Value</div>
                  <div className="text-xs text-green-600 mt-1">Stock × Price</div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Stock Level Analysis</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700 font-medium">Stock Level:</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            item.currentStock === 0 ? 'bg-red-500' :
                            item.currentStock <= item.reorderPoint ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                          style={{ 
                            width: `${Math.min(100, (item.currentStock / Math.max(item.reorderPoint * 2, 1)) * 100)}%` 
                          }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-800 font-medium">
                        {item.currentStock}/{Math.max(item.reorderPoint * 2, item.currentStock)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700 font-medium">Stock Status:</span>
                    <span className="font-semibold text-gray-900">
                      {item.currentStock === 0 ? 'Out of Stock' : 
                       item.currentStock <= item.reorderPoint ? 'Critical - Reorder Needed' : 'Healthy Stock Level'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700 font-medium">Max Stock Level:</span>
                    <span className="font-semibold text-gray-900">{item.maxStockLevel || 'Not Set'} {item.unitOfMeasure}</span>
                  </div>
                </div>
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
                      <p className="text-sm text-gray-800 font-medium mt-1">
                        Current stock: {item.currentStock} {item.unitOfMeasure} | Reorder point: {item.reorderPoint} {item.unitOfMeasure}
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
                    <span className="text-gray-700 font-medium">Last Stock Update:</span>
                    <span className="text-gray-900 font-semibold">{item.lastUpdated}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700 font-medium">Stock Value:</span>
                    <span className="text-gray-900 font-semibold">${((item.currentStock || 0) * (item.lastPurchasePrice || 0)).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700 font-medium">Average Cost:</span>
                    <span className="text-gray-900 font-semibold">${(item.averageCost || item.lastPurchasePrice || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700 font-medium">Selling Price:</span>
                    <span className="text-gray-900 font-semibold">${(item.sellingPrice || 0).toFixed(2)}</span>
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
            className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors duration-200 font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
