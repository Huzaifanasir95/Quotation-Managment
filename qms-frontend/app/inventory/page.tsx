'use client';

import { useState } from 'react';
import AppLayout from '../components/AppLayout';
import AddEditItemModal from '../components/inventory/AddEditItemModal';
import ImportInventoryModal from '../components/inventory/ImportInventoryModal';
import StockDetailModal from '../components/inventory/StockDetailModal';
import AdjustStockModal from '../components/inventory/AdjustStockModal';

export default function InventoryPage() {
  const [showAddItem, setShowAddItem] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showStockDetail, setShowStockDetail] = useState(false);
  const [showAdjustStock, setShowAdjustStock] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  
  // Filters state
  const [filters, setFilters] = useState({
    search: '',
    category: 'All',
    vendor: 'All',
    stockLevel: 'All',
    status: 'All'
  });

  // Mock data for inventory items
  const inventoryItems = [
    {
      id: '1',
      sku: 'LAP-001',
      name: 'Laptop Dell XPS 13',
      description: '13-inch premium laptop with Intel i7 processor',
      category: 'Finished Good',
      vendor: 'Tech Supplies Inc',
      currentStock: 15,
      unitOfMeasure: 'Piece',
      lastPurchasePrice: 1200,
      averageCost: 1180,
      reorderPoint: 5,
      status: 'In Stock',
      totalValue: 17700,
      lastUpdated: '2024-01-20',
      linkedPOs: ['PO-2024-001', 'PO-2024-003'],
      stockHistory: [
        { date: '2024-01-20', type: 'Purchase', quantity: 20, balance: 15, reference: 'PO-2024-003' },
        { date: '2024-01-15', type: 'Sale', quantity: -5, balance: -5, reference: 'SO-2024-001' }
      ]
    },
    {
      id: '2',
      sku: 'MON-002',
      name: 'Monitor 27" 4K',
      description: 'Ultra HD monitor for professional use',
      category: 'Finished Good',
      vendor: 'Display Solutions',
      currentStock: 3,
      unitOfMeasure: 'Piece',
      lastPurchasePrice: 800,
      averageCost: 780,
      reorderPoint: 3,
      status: 'Low Stock',
      totalValue: 2340,
      lastUpdated: '2024-01-18',
      linkedPOs: ['PO-2024-002'],
      stockHistory: [
        { date: '2024-01-18', type: 'Purchase', quantity: 5, balance: 3, reference: 'PO-2024-002' },
        { date: '2024-01-10', type: 'Sale', quantity: -2, balance: -2, reference: 'SO-2024-002' }
      ]
    },
    {
      id: '3',
      sku: 'KEY-003',
      name: 'Wireless Keyboard',
      description: 'Ergonomic wireless keyboard',
      category: 'Finished Good',
      vendor: 'Input Devices Co',
      currentStock: 0,
      unitOfMeasure: 'Piece',
      lastPurchasePrice: 45,
      averageCost: 42,
      reorderPoint: 10,
      status: 'Out of Stock',
      totalValue: 0,
      lastUpdated: '2024-01-15',
      linkedPOs: ['PO-2024-001'],
      stockHistory: [
        { date: '2024-01-15', type: 'Sale', quantity: -15, balance: 0, reference: 'SO-2024-003' },
        { date: '2024-01-10', type: 'Purchase', quantity: 15, balance: 15, reference: 'PO-2024-001' }
      ]
    },
    {
      id: '4',
      sku: 'RAW-004',
      name: 'Aluminum Sheet',
      description: 'High-grade aluminum for manufacturing',
      category: 'Raw Material',
      vendor: 'Metal Suppliers Ltd',
      currentStock: 250,
      unitOfMeasure: 'KG',
      lastPurchasePrice: 8.5,
      averageCost: 8.2,
      reorderPoint: 100,
      status: 'In Stock',
      totalValue: 2050,
      lastUpdated: '2024-01-19',
      linkedPOs: ['PO-2024-004'],
      stockHistory: [
        { date: '2024-01-19', type: 'Purchase', quantity: 300, balance: 250, reference: 'PO-2024-004' },
        { date: '2024-01-18', type: 'Consumption', quantity: -50, balance: -50, reference: 'MFG-2024-001' }
      ]
    },
    {
      id: '5',
      sku: 'SVC-005',
      name: 'Installation Service',
      description: 'Professional installation and setup service',
      category: 'Service',
      vendor: 'Service Pro Inc',
      currentStock: 0,
      unitOfMeasure: 'Hour',
      lastPurchasePrice: 65,
      averageCost: 65,
      reorderPoint: 0,
      status: 'Available',
      totalValue: 0,
      lastUpdated: '2024-01-20',
      linkedPOs: ['PO-2024-003'],
      stockHistory: [
        { date: '2024-01-20', type: 'Purchase', quantity: 10, balance: 0, reference: 'PO-2024-003' }
      ]
    }
  ];

  const categories = ['All', 'Raw Material', 'Finished Good', 'Service', 'Spare Parts'];
  const vendors = ['All', ...Array.from(new Set(inventoryItems.map(item => item.vendor)))];
  const stockLevels = ['All', 'In Stock', 'Low Stock', 'Out of Stock'];
  const statuses = ['All', 'In Stock', 'Low Stock', 'Out of Stock', 'Available', 'Already Owned'];

  const filteredItems = inventoryItems.filter(item => {
    const matchesSearch = !filters.search || 
      item.name.toLowerCase().includes(filters.search.toLowerCase()) ||
      item.sku.toLowerCase().includes(filters.search.toLowerCase()) ||
      item.description.toLowerCase().includes(filters.search.toLowerCase());
    const matchesCategory = filters.category === 'All' || item.category === filters.category;
    const matchesVendor = filters.vendor === 'All' || item.vendor === filters.vendor;
    const matchesStockLevel = filters.stockLevel === 'All' || item.status === filters.stockLevel;
    const matchesStatus = filters.status === 'All' || item.status === filters.status;
    
    return matchesSearch && matchesCategory && matchesVendor && matchesStockLevel && matchesStatus;
  });

  // Calculate KPIs
  const totalInventoryValue = inventoryItems.reduce((sum, item) => sum + item.totalValue, 0);
  const lowStockItems = inventoryItems.filter(item => item.status === 'Low Stock').length;
  const outOfStockItems = inventoryItems.filter(item => item.status === 'Out of Stock').length;
  const fastMovingItems = inventoryItems
    .filter(item => item.stockHistory.some(h => h.type === 'Sale'))
    .sort((a, b) => {
      const aSales = a.stockHistory.filter(h => h.type === 'Sale').reduce((sum, h) => sum + Math.abs(h.quantity), 0);
      const bSales = b.stockHistory.filter(h => h.type === 'Sale').reduce((sum, h) => sum + Math.abs(h.quantity), 0);
      return bSales - aSales;
    })
    .slice(0, 5);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'In Stock': return 'bg-green-100 text-green-800';
      case 'Low Stock': return 'bg-yellow-100 text-yellow-800';
      case 'Out of Stock': return 'bg-red-100 text-red-800';
      case 'Available': return 'bg-blue-100 text-blue-800';
      case 'Already Owned': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleViewStockDetail = (item: any) => {
    setSelectedItem(item);
    setShowStockDetail(true);
  };

  const handleEditItem = (item: any) => {
    setEditingItem(item);
    setShowAddItem(true);
  };

  const handleAdjustStock = (item: any) => {
    setSelectedItem(item);
    setShowAdjustStock(true);
  };

  const handleDeleteItem = (item: any) => {
    if (confirm(`Are you sure you want to delete ${item.name}?`)) {
      console.log('Deleting item:', item);
      alert(`Deleted ${item.name}`);
    }
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      category: 'All',
      vendor: 'All',
      stockLevel: 'All',
      status: 'All'
    });
  };

  const exportInventory = () => {
    const csvContent = [
      ['SKU', 'Name', 'Category', 'Vendor', 'Current Stock', 'Unit', 'Last Price', 'Status'],
      ...inventoryItems.map(item => [
        item.sku,
        item.name,
        item.category,
        item.vendor,
        item.currentStock,
        item.unitOfMeasure,
        item.lastPurchasePrice,
        item.status
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'inventory_export.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
        </div>

        {/* KPI Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Inventory Value</p>
                <p className="text-2xl font-bold text-gray-900">${totalInventoryValue.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Low Stock Items</p>
                <p className="text-2xl font-bold text-gray-900">{lowStockItems}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Out of Stock</p>
                <p className="text-2xl font-bold text-gray-900">{outOfStockItems}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Items</p>
                <p className="text-2xl font-bold text-gray-900">{inventoryItems.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <button
              onClick={() => setShowAddItem(true)}
              className="flex items-center justify-center p-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add New Item
            </button>

            <button
              onClick={() => setShowImport(true)}
              className="flex items-center justify-center p-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Import CSV/Excel
            </button>

            <button
              onClick={exportInventory}
              className="flex items-center justify-center p-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-200"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export Inventory
            </button>

            <button
              onClick={clearFilters}
              className="flex items-center justify-center p-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Clear Filters
            </button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Search & Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                placeholder="Search by name, SKU, or description..."
                className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                value={filters.category}
                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Vendor</label>
              <select
                value={filters.vendor}
                onChange={(e) => setFilters({ ...filters, vendor: e.target.value })}
                className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {vendors.map(vendor => (
                  <option key={vendor} value={vendor}>{vendor}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Stock Level</label>
              <select
                value={filters.stockLevel}
                onChange={(e) => setFilters({ ...filters, stockLevel: e.target.value })}
                className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {stockLevels.map(level => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {statuses.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Found {filteredItems.length} item(s) out of {inventoryItems.length} total
            </p>
          </div>
        </div>

        {/* Fast Moving Items */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 5 Fast-Moving Items</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {fastMovingItems.map((item, index) => (
              <div key={item.id} className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600 mb-1">{index + 1}</div>
                <div className="text-sm font-medium text-gray-900 truncate">{item.name}</div>
                <div className="text-xs text-gray-500">{item.sku}</div>
                <div className="text-sm text-green-600 font-medium">
                  {item.stockHistory.filter(h => h.type === 'Sale').reduce((sum, h) => sum + Math.abs(h.quantity), 0)} sold
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Inventory Table */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Inventory Items</h3>
          </div>

          <div className="overflow-x-auto">
            {filteredItems.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No inventory items found.</p>
                <p className="text-sm text-gray-400 mt-1">Total Items: {inventoryItems.length} | Filtered: {filteredItems.length}</p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Code/SKU</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Name/Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Stock</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Price</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Cost</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{item.sku}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{item.name}</div>
                          <div className="text-sm text-gray-500 truncate max-w-xs">{item.description}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          {item.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{item.vendor}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{item.currentStock}</div>
                        {item.currentStock <= item.reorderPoint && (
                          <div className="text-xs text-red-600">Reorder needed</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{item.unitOfMeasure}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">${item.lastPurchasePrice.toFixed(2)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">${item.averageCost.toFixed(2)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(item.status)}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => handleViewStockDetail(item)}
                            className="text-blue-600 hover:text-blue-700 font-medium"
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleEditItem(item)}
                            className="text-green-600 hover:text-green-700 font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleAdjustStock(item)}
                            className="text-orange-600 hover:text-orange-700 font-medium"
                          >
                            Adjust
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item)}
                            className="text-red-600 hover:text-red-700 font-medium"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <AddEditItemModal 
        isOpen={showAddItem} 
        onClose={() => {
          setShowAddItem(false);
          setEditingItem(null);
        }} 
        editingItem={editingItem}
      />
      <ImportInventoryModal isOpen={showImport} onClose={() => setShowImport(false)} />
      <StockDetailModal isOpen={showStockDetail} onClose={() => setShowStockDetail(false)} item={selectedItem} />
      <AdjustStockModal isOpen={showAdjustStock} onClose={() => setShowAdjustStock(false)} item={selectedItem} />
    </AppLayout>
  );
}
