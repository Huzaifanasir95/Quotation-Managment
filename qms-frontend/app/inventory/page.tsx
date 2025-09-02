'use client';

import { useState, useEffect } from 'react';
import AppLayout from '../components/AppLayout';
import AddEditItemModal from '../components/inventory/AddEditItemModal';
import ImportInventoryModal from '../components/inventory/ImportInventoryModal';
import StockDetailModal from '../components/inventory/StockDetailModal';
import AdjustStockModal from '../components/inventory/AdjustStockModal';
import { apiClient, Product, ProductCategory, StockMovement } from '../lib/api';

export default function InventoryPage() {
  const [showAddItem, setShowAddItem] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showStockDetail, setShowStockDetail] = useState(false);
  const [showAdjustStock, setShowAdjustStock] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isAdjustStockModalOpen, setIsAdjustStockModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  
  // Data state
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters state
  const [filters, setFilters] = useState({
    search: '',
    category: 'All',
    vendor: 'All',
    stockLevel: 'All',
    status: 'All'
  });

  // Data fetching
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Refresh token from localStorage before making API calls
      apiClient.refreshToken();
      
      const [productsResponse, categoriesResponse, vendorsResponse] = await Promise.all([
        apiClient.getProducts({ limit: 1000 }),
        apiClient.getProductCategories({ limit: 100 }),
        apiClient.getVendors({ limit: 100 })
      ]);
      
      if (productsResponse.success) {
        setProducts(productsResponse.data.products || []);
      }
      
      if (categoriesResponse.success) {
        const loadedCategories = categoriesResponse.data.categories || [];
        setCategories(loadedCategories);
        
        // If no categories exist, create default ones
        if (loadedCategories.length === 0) {
          await createDefaultCategories();
        }
      }
      
      if (vendorsResponse.success) {
        setVendors(vendorsResponse.data.vendors || []);
      }
    } catch (err) {
      console.error('Failed to fetch inventory data:', err);
      setError('Failed to load inventory data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Create default categories if none exist
  const createDefaultCategories = async () => {
    const defaultCategories = [
      { name: 'Raw Materials', description: 'Raw materials for production' },
      { name: 'Finished Goods', description: 'Completed products ready for sale' },
      { name: 'Services', description: 'Service-based items' },
      { name: 'Spare Parts', description: 'Replacement parts and components' },
      { name: 'Office Supplies', description: 'General office supplies and stationery' },
      { name: 'Electronics', description: 'Electronic equipment and components' }
    ];

    try {
      const createdCategories = [];
      for (const category of defaultCategories) {
        try {
          const response = await apiClient.createProductCategory(category);
          if (response.success) {
            createdCategories.push(response.data.category);
          }
        } catch (error) {
          console.error('Failed to create category:', category.name, error);
        }
      }
      
      if (createdCategories.length > 0) {
        setCategories(createdCategories);
        console.log('Created default categories:', createdCategories);
      }
    } catch (error) {
      console.error('Failed to create default categories:', error);
    }
  };
  
  useEffect(() => {
    fetchData();
  }, []);

  // Helper functions to get status and calculate values
  const getProductStatus = (product: Product) => {
    if (product.current_stock <= 0) return 'Out of Stock';
    if (product.current_stock <= product.reorder_point) return 'Low Stock';
    return 'In Stock';
  };
  
  const getProductTotalValue = (product: Product) => {
    return product.current_stock * (product.average_cost || product.last_purchase_price || 0);
  };
  
  // Transform products for display
  const inventoryItems = products.map(product => ({
    id: product.id,
    sku: product.sku,
    name: product.name,
    description: product.description || '',
    category: product.product_categories?.name || 'Uncategorized',
    type: product.type,
    vendor: 'N/A', // Will be populated when we have vendor relationships
    currentStock: product.current_stock,
    unitOfMeasure: product.unit_of_measure,
    lastPurchasePrice: product.last_purchase_price || 0,
    averageCost: product.average_cost || 0,
    sellingPrice: product.selling_price || 0,
    reorderPoint: product.reorder_point,
    maxStockLevel: product.max_stock_level || 0,
    status: getProductStatus(product),
    totalValue: getProductTotalValue(product),
    lastUpdated: new Date(product.updated_at).toISOString().split('T')[0],
    linkedPOs: [], // Will be populated when we have PO relationships
    stockHistory: [] // Will be populated when we fetch stock movements
  }));
  
  const categoryOptions = ['All', ...categories.map(cat => cat.name)];
  const vendorOptions = ['All', ...Array.from(new Set(vendors.map(vendor => vendor.name)))];
  const stockLevels = ['All', 'In Stock', 'Low Stock', 'Out of Stock'];
  const statuses = ['All', 'In Stock', 'Low Stock', 'Out of Stock', 'Available'];

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
    .filter(item => item.currentStock > 0)
    .sort((a, b) => b.currentStock - a.currentStock)
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
    setIsAdjustStockModalOpen(true);
  };

  const handleDeleteItem = async (item: any) => {
    if (confirm(`Are you sure you want to delete ${item.name}?`)) {
      try {
        const response = await apiClient.deleteProduct(item.id);
        if (response.success) {
          alert(`Deleted ${item.name}`);
          fetchData(); // Refresh data
        } else {
          alert('Failed to delete item');
        }
      } catch (error) {
        console.error('Failed to delete item:', error);
        alert('Failed to delete item');
      }
    }
  };

  const handleItemSaved = () => {
    fetchData(); // Refresh data after adding/editing item
    setEditingItem(null);
  };

  const handleStockAdjusted = () => {
    fetchData(); // Refresh data after stock adjustment
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

  if (loading) {
    return (
      <AppLayout>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-lg text-gray-600">Loading inventory data...</span>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-center">
              <svg className="w-6 h-6 text-red-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="text-lg font-medium text-red-800">Error Loading Inventory</h3>
                <p className="text-red-600">{error}</p>
                <button 
                  onClick={fetchData}
                  className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8"></div>

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
                {categoryOptions.map(category => (
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
                {vendorOptions.map(vendor => (
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
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 5 Items by Stock Level</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {fastMovingItems.map((item, index) => (
              <div key={item.id} className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600 mb-1">{index + 1}</div>
                <div className="text-sm font-medium text-gray-900 truncate">{item.name}</div>
                <div className="text-xs text-gray-500">{item.sku}</div>
                <div className="text-sm text-green-600 font-medium">
                  {item.currentStock} {item.unitOfMeasure}
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
        onItemSaved={handleItemSaved}
        categories={categories}
      />
      <ImportInventoryModal 
        isOpen={showImport} 
        onClose={() => setShowImport(false)} 
        onImportComplete={fetchData}
      />
      <StockDetailModal 
        isOpen={showStockDetail} 
        onClose={() => setShowStockDetail(false)} 
        item={selectedItem} 
      />
      <AdjustStockModal
        isOpen={isAdjustStockModalOpen}
        onClose={() => setIsAdjustStockModalOpen(false)}
        item={selectedItem}
        onStockAdjusted={fetchData}
      />
    </AppLayout>
  );
}
