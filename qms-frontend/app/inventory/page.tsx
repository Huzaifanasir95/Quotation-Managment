'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import AppLayout from '../components/AppLayout';
import AddEditItemModal from '../components/inventory/AddEditItemModal';
import ImportInventoryModal from '../components/inventory/ImportInventoryModal';
import StockDetailModal from '../components/inventory/StockDetailModal';
import AdjustStockModal from '../components/inventory/AdjustStockModal';
import { apiClient, Product, ProductCategory, StockMovement } from '../lib/api';

// Debounce hook for search
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

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
  const [inventoryKPIs, setInventoryKPIs] = useState({
    totalItems: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
    totalInventoryValue: 0
  });
  const [initialLoading, setInitialLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const productsPerPage = 50; // Reduced from 1000 to 50 for better performance
  
  // Filters state
  const [filters, setFilters] = useState({
    search: '',
    category: 'All',
    vendor: 'All',
    stockLevel: 'All',
    status: 'All'
  });
  
  // Debounced search for better performance
  const debouncedSearch = useDebounce(filters.search, 300);
  
  // UI state
  const [showFilters, setShowFilters] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Quick data loading for immediate UI display
  const loadInitialData = useCallback(async () => {
    try {
      apiClient.refreshToken();
      
      // Load categories, vendors, and KPIs in parallel for fast initial display
      const [categoriesResponse, vendorsResponse, kpisResponse] = await Promise.all([
        apiClient.getProductCategories({ limit: 100 }),
        apiClient.getVendors({ limit: 100 }),
        apiClient.getInventoryKPIs()
      ]);
      
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

      if (kpisResponse.success) {
        setInventoryKPIs(kpisResponse.data);
      }
      
      setInitialLoading(false);
    } catch (err) {
      console.error('Failed to load initial data:', err);
      setError('Failed to load initial data. Please try again.');
      setInitialLoading(false);
    }
  }, []);

  // Load products with pagination
  const loadProducts = useCallback(async (page: number = 1, resetProducts: boolean = true) => {
    try {
      setProductsLoading(true);
      setError(null);
      
      apiClient.refreshToken();
      
      const params: any = {
        page,
        limit: productsPerPage
      };
      
      // Apply filters
      if (debouncedSearch) {
        params.search = debouncedSearch;
      }
      
      if (filters.category !== 'All') {
        const selectedCategory = categories.find(cat => cat.name === filters.category);
        if (selectedCategory) {
          params.category = selectedCategory.id;
        }
      }
      
      if (filters.status !== 'All') {
        params.status = filters.status.toLowerCase().replace(' ', '_');
      }
      
      const productsResponse = await apiClient.getProducts(params);
      
      if (productsResponse.success) {
        const newProducts = productsResponse.data.products || [];
        
        if (resetProducts) {
          setProducts(newProducts);
        } else {
          setProducts(prev => [...prev, ...newProducts]);
        }
        
        setCurrentPage(page);
        setTotalProducts(productsResponse.data.pagination?.total || 0);
        setTotalPages(productsResponse.data.pagination?.pages || 0);
      }
    } catch (err) {
      console.error('Failed to fetch products:', err);
      setError('Failed to load products. Please try again.');
    } finally {
      setProductsLoading(false);
    }
  }, [debouncedSearch, filters.category, filters.status, categories, productsPerPage]);

  // Data fetching - now more efficient
  const fetchData = useCallback(async () => {
    await loadProducts(1, true);
  }, [loadProducts]);

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
      }
    } catch (error) {
      console.error('Failed to create default categories:', error);
    }
  };
  
  // Initial load
  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Load products when filters change
  useEffect(() => {
    if (!initialLoading) {
      loadProducts(1, true);
    }
  }, [loadProducts, initialLoading]);

  // Helper functions to get status and calculate values
  const getProductStatus = useCallback((product: Product) => {
    if (product.current_stock <= 0) return 'Out of Stock';
    if (product.current_stock <= product.reorder_point) return 'Low Stock';
    return 'In Stock';
  }, []);
  
  const getProductTotalValue = useCallback((product: Product) => {
    return product.current_stock * (product.average_cost || product.last_purchase_price || 0);
  }, []);
  
  // Transform products for display - memoized for performance
  const inventoryItems = useMemo(() => {
    return products.map(product => ({
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
  }, [products, getProductStatus, getProductTotalValue]);
  
  const categoryOptions = useMemo(() => ['All', ...categories.map(cat => cat.name)], [categories]);
  const vendorOptions = useMemo(() => ['All', ...Array.from(new Set(vendors.map(vendor => vendor.name)))], [vendors]);
  const stockLevels = ['All', 'In Stock', 'Low Stock', 'Out of Stock'];
  const statuses = ['All', 'In Stock', 'Low Stock', 'Out of Stock', 'Available'];

  // Filtered items - only for current page
  const filteredItems = useMemo(() => {
    return inventoryItems.filter(item => {
      const matchesVendor = filters.vendor === 'All' || item.vendor === filters.vendor;
      const matchesStockLevel = filters.stockLevel === 'All' || item.status === filters.stockLevel;
      
      return matchesVendor && matchesStockLevel;
    });
  }, [inventoryItems, filters.vendor, filters.stockLevel]);

  // Calculate KPIs - use API data when available, fall back to client calculation
  const kpis = useMemo(() => {
    // If we have API KPIs data and no products loaded yet, use API data
    if (inventoryKPIs.totalItems > 0 && products.length === 0) {
      return inventoryKPIs;
    }
    
    // Otherwise calculate from current filtered items for accuracy
    const totalInventoryValue = filteredItems.reduce((sum, item) => sum + item.totalValue, 0);
    const lowStockItems = filteredItems.filter(item => item.status === 'Low Stock').length;
    const outOfStockItems = filteredItems.filter(item => item.status === 'Out of Stock').length;
    
    return {
      totalInventoryValue,
      lowStockItems,
      outOfStockItems,
      totalItems: totalProducts || inventoryKPIs.totalItems // Use total from API for accurate count
    };
  }, [filteredItems, totalProducts, inventoryKPIs]);

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'In Stock': return 'bg-green-100 text-green-800';
      case 'Low Stock': return 'bg-yellow-100 text-yellow-800';
      case 'Out of Stock': return 'bg-red-100 text-red-800';
      case 'Available': return 'bg-blue-100 text-blue-800';
      case 'Already Owned': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }, []);

  const handleViewStockDetail = useCallback((item: any) => {
    setSelectedItem(item);
    setShowStockDetail(true);
  }, []);

  const handleEditItem = useCallback((item: any) => {
    setEditingItem(item);
    setShowAddItem(true);
  }, []);

  const handleAdjustStock = useCallback((item: any) => {
    setSelectedItem(item);
    setIsAdjustStockModalOpen(true);
  }, []);

  const handleDeleteItem = useCallback(async (item: any) => {
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
  }, [fetchData]);

  const handleItemSaved = useCallback(() => {
    fetchData(); // Refresh data after adding/editing item
    setEditingItem(null);
  }, [fetchData]);

  const handleStockAdjusted = useCallback(() => {
    fetchData(); // Refresh data after stock adjustment
  }, [fetchData]);

  const clearFilters = useCallback(() => {
    setFilters({
      search: '',
      category: 'All',
      vendor: 'All',
      stockLevel: 'All',
      status: 'All'
    });
  }, []);

  const exportInventory = useCallback(() => {
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
  }, [inventoryItems]);

  // Load more products function for pagination
  const loadMoreProducts = useCallback(() => {
    if (currentPage < totalPages && !productsLoading) {
      loadProducts(currentPage + 1, false);
    }
  }, [currentPage, totalPages, productsLoading, loadProducts]);

  // Show error state
  if (error && initialLoading) {
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
                  onClick={loadInitialData}
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

        {/* KPI Dashboard - Show immediately with skeleton or real data */}
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
                {initialLoading ? (
                  <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
                ) : (
                  <p className="text-2xl font-bold text-gray-900">Rs. {kpis.totalInventoryValue.toLocaleString()}</p>
                )}
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
                {initialLoading ? (
                  <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
                ) : (
                  <p className="text-2xl font-bold text-gray-900">{kpis.lowStockItems}</p>
                )}
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
                {initialLoading ? (
                  <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
                ) : (
                  <p className="text-2xl font-bold text-gray-900">{kpis.outOfStockItems}</p>
                )}
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
                {initialLoading ? (
                  <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
                ) : (
                  <p className="text-2xl font-bold text-gray-900">{kpis.totalItems}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions - Show immediately */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => setShowAddItem(true)}
              disabled={initialLoading}
              className="flex items-center justify-center p-4 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors duration-200 disabled:opacity-50"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add New Item
            </button>

            <button
              onClick={() => setShowImport(true)}
              disabled={initialLoading}
              className="flex items-center justify-center p-4 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors duration-200 disabled:opacity-50"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Import CSV/Excel
            </button>

            <button
              onClick={exportInventory}
              disabled={initialLoading || products.length === 0}
              className="flex items-center justify-center p-4 bg-zinc-700 text-white rounded-lg hover:bg-zinc-800 transition-colors duration-200 disabled:opacity-50"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export Inventory
            </button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Search & Filters</h3>
            <div className="flex items-center gap-4">
              {/* View Mode Toggle */}
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'list' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  title="List View"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'grid' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  title="Grid View"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                  </svg>
                </button>
              </div>
              
              {/* Hide/Show Filters Button */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                <span className="text-sm font-medium">
                  {showFilters ? 'Hide Filters' : 'Show Filters'}
                </span>
                <svg 
                  className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>
          
          {showFilters && (
            <div className="p-6">
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
                  Showing {filteredItems.length} item(s) on page {currentPage} of {totalPages} (Total: {totalProducts} items)
                </p>
                <button
                  onClick={clearFilters}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Inventory Items */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Inventory Items</h3>
          </div>

          <div className="p-6">
            {filteredItems.length === 0 ? (
              <div className="text-center py-8">
                {productsLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-3 text-gray-600">Loading products...</span>
                  </div>
                ) : (
                  <>
                    <p className="text-gray-500">No inventory items found.</p>
                    <p className="text-sm text-gray-400 mt-1">Total Items: {totalProducts} | Showing: {filteredItems.length}</p>
                  </>
                )}
              </div>
            ) : viewMode === 'list' ? (
              // List View
              <div className="overflow-x-auto">
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
                          <div className="text-sm text-gray-900">Rs. {item.lastPurchasePrice.toFixed(2)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">Rs. {item.averageCost.toFixed(2)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(item.status)}`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex flex-wrap gap-1">
                            <button
                              onClick={() => handleViewStockDetail(item)}
                              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors duration-150 text-xs font-medium"
                            >
                              View
                            </button>
                            <button
                              onClick={() => handleEditItem(item)}
                              className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors duration-150 text-xs font-medium"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleAdjustStock(item)}
                              className="px-3 py-1 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors duration-150 text-xs font-medium"
                            >
                              Adjust
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item)}
                              className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors duration-150 text-xs font-medium"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="mt-6 flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      Page {currentPage} of {totalPages}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => loadProducts(currentPage - 1, true)}
                        disabled={currentPage <= 1 || productsLoading}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => loadProducts(currentPage + 1, true)}
                        disabled={currentPage >= totalPages || productsLoading}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // Grid View
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredItems.map((item) => (
                    <div key={item.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900">{item.name}</h4>
                          <p className="text-sm text-gray-600">{item.sku}</p>
                          <p className="text-sm text-gray-500 mt-1 line-clamp-2">{item.description}</p>
                        </div>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(item.status)}`}>
                          {item.status}
                        </span>
                      </div>
                      
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Category:</span>
                          <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            {item.category}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Current Stock:</span>
                          <div className="text-right">
                            <span className="text-gray-900 font-medium">{item.currentStock} {item.unitOfMeasure}</span>
                            {item.currentStock <= item.reorderPoint && (
                              <div className="text-xs text-red-600">Reorder needed</div>
                            )}
                          </div>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Last Price:</span>
                          <span className="text-gray-900 font-medium">Rs. {item.lastPurchasePrice.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Avg Cost:</span>
                          <span className="text-gray-900 font-medium">Rs. {item.averageCost.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Total Value:</span>
                          <span className="text-gray-900 font-medium">Rs. {item.totalValue.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Vendor:</span>
                          <span className="text-gray-900">{item.vendor}</span>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => handleViewStockDetail(item)}
                          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors duration-150 text-xs font-medium"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleEditItem(item)}
                          className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors duration-150 text-xs font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleAdjustStock(item)}
                          className="px-3 py-1 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors duration-150 text-xs font-medium"
                        >
                          Adjust
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item)}
                          className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors duration-150 text-xs font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Pagination Controls for Grid View */}
                {totalPages > 1 && (
                  <div className="mt-6 flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      Page {currentPage} of {totalPages}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => loadProducts(currentPage - 1, true)}
                        disabled={currentPage <= 1 || productsLoading}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => loadProducts(currentPage + 1, true)}
                        disabled={currentPage >= totalPages || productsLoading}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
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
