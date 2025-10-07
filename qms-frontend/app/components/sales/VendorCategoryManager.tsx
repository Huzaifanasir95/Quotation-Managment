'use client';

import { useState, useEffect } from 'react';
import { Vendor, apiClient } from '../../lib/api';

interface VendorCategory {
  id: string;
  categoryName: string;
  vendorIds: string[];
  lastRequestDate?: string;
  responseStatus: 'pending' | 'received' | 'expired' | 'not_sent';
  rfqReference?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface VendorRateRequest {
  id: string;
  quotationId: string;
  vendorId: string;
  categoryId: string;
  requestDate: string;
  responseDate?: string;
  status: 'sent' | 'delivered' | 'read' | 'responded' | 'expired';
  communicationMethod: 'email' | 'whatsapp' | 'manual';
  requestData: any;
  responseData?: any;
  expiryDate: string;
}

interface VendorCategoryManagerProps {
  quotationId: string;
  items: any[];
  vendors: Vendor[];
  onCategoryVendorsUpdate: (categoryVendors: {[key: string]: string[]}) => void;
  showModal: boolean;
  setShowModal: (show: boolean) => void;
}

export default function VendorCategoryManager({
  quotationId,
  items,
  vendors,
  onCategoryVendorsUpdate,
  showModal,
  setShowModal
}: VendorCategoryManagerProps) {
  const [vendorCategories, setVendorCategories] = useState<VendorCategory[]>([]);
  const [rateRequests, setRateRequests] = useState<VendorRateRequest[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'categories' | 'requests' | 'analytics'>('categories');
  const [categories, setCategories] = useState<any[]>([]);

  // Get unique categories from items
  const itemCategories = [...new Set(items.map(item => item.category || 'Uncategorized'))];

  // Load existing category-vendor mappings and backend data
  useEffect(() => {
    if (showModal) {
      loadVendorCategories();
      loadRateRequests();
      loadCategories();
    }
  }, [showModal, quotationId]);

  const loadCategories = async () => {
    try {
      const response = await apiClient.getVendorCategoriesList();
      if (response.success) {
        setCategories(response.data);
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const loadVendorCategories = async () => {
    try {
      setIsLoading(true);
      
      // First try to load from backend
      const response = await apiClient.getVendorCategories();
      if (response.success) {
        const backendCategories = response.data.vendorCategories || [];
        const categoryStats = response.data.categoryStats || [];
        
        // Transform backend data to match our component structure
        const transformedCategories: VendorCategory[] = itemCategories.map(categoryName => {
          // Find if this category exists in backend
          const categoryData = categories.find(c => c.name === categoryName);
          const categoryId = categoryData?.id;
          
          // Find vendor assignments for this category
          const assignments = backendCategories.filter((vc: any) => 
            vc.category && vc.category.name === categoryName
          );
          
          const vendorIds = assignments.map((a: any) => a.vendor.id);
          
          // Find stats for this category
          const stats = categoryStats.find((s: any) => s.name === categoryName) || {
            totalVendors: vendorIds.length,
            requestsSent: 0,
            pending: 0,
            responded: 0
          };
          
          return {
            id: categoryId || `cat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            categoryName,
            vendorIds,
            responseStatus: stats.pending > 0 ? 'pending' : stats.responded > 0 ? 'received' : 'not_sent',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
        });
        
        setVendorCategories(transformedCategories);
      } else {
        // Fallback to localStorage if backend fails
        const stored = localStorage.getItem(`vendor_categories_${quotationId}`);
        if (stored) {
          setVendorCategories(JSON.parse(stored));
        } else {
          // Initialize with item categories
          const initialCategories: VendorCategory[] = itemCategories.map(category => ({
            id: `cat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            categoryName: category,
            vendorIds: [],
            responseStatus: 'not_sent',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }));
          setVendorCategories(initialCategories);
        }
      }
    } catch (error) {
      console.error('Failed to load vendor categories:', error);
      // Fallback to localStorage
      const stored = localStorage.getItem(`vendor_categories_${quotationId}`);
      if (stored) {
        setVendorCategories(JSON.parse(stored));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadRateRequests = async () => {
    try {
      // Try to load from backend API first
      const categoryIds = vendorCategories.map(cat => cat.id);
      let allRequests: VendorRateRequest[] = [];
      
      for (const categoryId of categoryIds) {
        try {
          const response = await apiClient.getCategoryRateRequests(categoryId);
          if (response.success && response.data) {
            // Transform backend data to match our component structure
            const backendRequests = response.data.map((req: any) => ({
              id: req.id,
              quotationId,
              vendorId: req.vendor_id || '',
              categoryId,
              requestDate: req.created_at,
              responseDate: req.response_date,
              status: req.status || 'sent',
              communicationMethod: req.specifications?.communicationMethod || 'manual',
              requestData: req.specifications || {},
              responseData: req.response_data,
              expiryDate: req.deadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
            }));
            
            allRequests = [...allRequests, ...backendRequests];
          }
        } catch (error) {
          console.warn(`Failed to load rate requests for category ${categoryId}:`, error);
        }
      }
      
      if (allRequests.length > 0) {
        setRateRequests(allRequests);
        return;
      }
    } catch (error) {
      console.error('Failed to load rate requests from API:', error);
    }
    
    // Fallback to localStorage
    try {
      const stored = localStorage.getItem(`rate_requests_${quotationId}`);
      if (stored) {
        setRateRequests(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load rate requests from localStorage:', error);
    }
  };

  const saveVendorCategories = (categories: VendorCategory[]) => {
    try {
      localStorage.setItem(`vendor_categories_${quotationId}`, JSON.stringify(categories));
      setVendorCategories(categories);
      
      // Update parent component with category-vendor mapping
      const categoryVendors: {[key: string]: string[]} = {};
      categories.forEach(cat => {
        categoryVendors[cat.categoryName] = cat.vendorIds;
      });
      onCategoryVendorsUpdate(categoryVendors);
    } catch (error) {
      console.error('Failed to save vendor categories:', error);
    }
  };

  const updateCategoryVendors = async (categoryId: string, vendorIds: string[]) => {
    try {
      const category = vendorCategories.find(c => c.id === categoryId);
      if (!category) return;
      
      // Find the actual category from backend
      const backendCategory = categories.find(c => c.name === category.categoryName);
      
      if (backendCategory) {
        // Update backend - assign new vendors and remove old ones
        const currentVendorIds = category.vendorIds;
        const vendorsToAdd = vendorIds.filter(id => !currentVendorIds.includes(id));
        const vendorsToRemove = currentVendorIds.filter(id => !vendorIds.includes(id));
        
        // Add new vendors
        if (vendorsToAdd.length > 0) {
          await apiClient.assignVendorsToCategory(backendCategory.id, vendorsToAdd);
        }
        
        // Remove vendors (for each vendor individually)
        for (const vendorId of vendorsToRemove) {
          await apiClient.removeVendorFromCategory(backendCategory.id, vendorId);
        }
      }
      
      // Update local state
      const updatedCategories = vendorCategories.map(cat => 
        cat.id === categoryId 
          ? { ...cat, vendorIds, updatedAt: new Date().toISOString() }
          : cat
      );
      saveVendorCategories(updatedCategories);
    } catch (error) {
      console.error('Failed to update category vendors:', error);
      // Still update local state even if backend fails
      const updatedCategories = vendorCategories.map(cat => 
        cat.id === categoryId 
          ? { ...cat, vendorIds, updatedAt: new Date().toISOString() }
          : cat
      );
      saveVendorCategories(updatedCategories);
    }
  };

  const addRateRequest = async (categoryId: string, vendorId: string, method: 'email' | 'whatsapp' | 'manual') => {
    try {
      const category = vendorCategories.find(c => c.id === categoryId);
      if (!category) return;

      const categoryItems = items.filter(item => (item.category || 'Uncategorized') === category.categoryName);
      
      // Create rate request via API
      const response = await apiClient.createRateRequest({
        category_id: categoryId,
        quotation_id: quotationId,
        title: `Rate Request for ${category.categoryName}`,
        description: `Rate request for category: ${category.categoryName}`,
        request_type: 'category',
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        specifications: {
          items: categoryItems,
          quotationId,
          categoryName: category.categoryName,
          communicationMethod: method
        },
        vendor_ids: [vendorId]
      });

      if (response.success) {
        // Reload rate requests
        await loadRateRequests();
        
        // Update category status
        const updatedCategories = vendorCategories.map(cat => 
          cat.id === categoryId 
            ? { ...cat, responseStatus: 'pending' as const, lastRequestDate: new Date().toISOString() }
            : cat
        );
        saveVendorCategories(updatedCategories);
      } else {
        console.error('Failed to create rate request:', response.error);
      }
    } catch (error) {
      console.error('Error creating rate request:', error);
      
      // Fallback to localStorage
      const newRequest: VendorRateRequest = {
        id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        quotationId,
        vendorId,
        categoryId,
        requestDate: new Date().toISOString(),
        status: 'sent',
        communicationMethod: method,
        requestData: {
          items: items.filter(item => (item.category || 'Uncategorized') === vendorCategories.find(c => c.id === categoryId)?.categoryName)
        },
        expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      };

      const updatedRequests = [...rateRequests, newRequest];
      setRateRequests(updatedRequests);
      localStorage.setItem(`rate_requests_${quotationId}`, JSON.stringify(updatedRequests));

      // Update category status
      const updatedCategories = vendorCategories.map(cat => 
        cat.id === categoryId 
          ? { ...cat, responseStatus: 'pending' as const, lastRequestDate: new Date().toISOString() }
          : cat
      );
      saveVendorCategories(updatedCategories);
    }
  };

  const getVendorRequestStatus = (categoryId: string, vendorId: string) => {
    const requests = rateRequests.filter(req => req.categoryId === categoryId && req.vendorId === vendorId);
    if (requests.length === 0) return 'not_sent';
    
    const latestRequest = requests.sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime())[0];
    return latestRequest.status;
  };

  const getCategoryStats = (categoryId: string) => {
    const category = vendorCategories.find(c => c.id === categoryId);
    if (!category) return { total: 0, sent: 0, responded: 0, pending: 0 };

    const total = category.vendorIds.length;
    const requests = rateRequests.filter(req => req.categoryId === categoryId);
    const sent = requests.length;
    const responded = requests.filter(req => req.status === 'responded').length;
    const pending = requests.filter(req => ['sent', 'delivered', 'read'].includes(req.status)).length;

    return { total, sent, responded, pending };
  };

  // Categories Tab
  const CategoriesTab = () => (
    <div className="space-y-6">
      {vendorCategories.map(category => {
        const categoryItems = items.filter(item => (item.category || 'Uncategorized') === category.categoryName);
        const stats = getCategoryStats(category.id);
        
        return (
          <div key={category.id} className="border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{category.categoryName}</h3>
                <p className="text-sm text-gray-500">{categoryItems.length} items</p>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  category.responseStatus === 'received' ? 'bg-green-100 text-green-800' :
                  category.responseStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  category.responseStatus === 'expired' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {category.responseStatus.replace('_', ' ').toUpperCase()}
                </span>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                <div className="text-xs text-gray-500">Total Vendors</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.sent}</div>
                <div className="text-xs text-gray-500">Requests Sent</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                <div className="text-xs text-gray-500">Pending</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.responded}</div>
                <div className="text-xs text-gray-500">Responded</div>
              </div>
            </div>

            {/* Items Preview */}
            <div className="mb-4 bg-gray-50 rounded-lg p-3">
              <p className="text-sm font-medium text-gray-700 mb-2">Items in this category:</p>
              <div className="space-y-1">
                {categoryItems.slice(0, 3).map((item, idx) => (
                  <div key={idx} className="text-sm text-gray-600">
                    • {item.item_name || item.description} (Qty: {item.quantity})
                  </div>
                ))}
                {categoryItems.length > 3 && (
                  <div className="text-sm text-gray-500">+ {categoryItems.length - 3} more items</div>
                )}
              </div>
            </div>

            {/* Vendor Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Vendors for {category.categoryName}
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2">
                {vendors.map(vendor => {
                  const isSelected = category.vendorIds.includes(vendor.id);
                  const requestStatus = getVendorRequestStatus(category.id, vendor.id);
                  
                  return (
                    <label key={vendor.id} className={`flex items-center space-x-2 p-2 border rounded cursor-pointer transition-colors ${
                      isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                    }`}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          const newVendorIds = e.target.checked
                            ? [...category.vendorIds, vendor.id]
                            : category.vendorIds.filter(id => id !== vendor.id);
                          updateCategoryVendors(category.id, newVendorIds);
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium text-gray-900 truncate">{vendor.name}</div>
                          {requestStatus !== 'not_sent' && (
                            <span className={`ml-2 px-2 py-0.5 text-xs rounded ${
                              requestStatus === 'responded' ? 'bg-green-100 text-green-800' :
                              requestStatus === 'sent' ? 'bg-blue-100 text-blue-800' :
                              requestStatus === 'delivered' ? 'bg-yellow-100 text-yellow-800' :
                              requestStatus === 'read' ? 'bg-purple-100 text-purple-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {requestStatus}
                            </span>
                          )}
                        </div>
                        {vendor.email && (
                          <div className="text-xs text-gray-500 truncate">{vendor.email}</div>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
              
              {category.vendorIds.length > 0 && (
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-sm text-green-600">
                    ✓ {category.vendorIds.length} vendor(s) selected
                  </p>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        category.vendorIds.forEach(vendorId => {
                          addRateRequest(category.id, vendorId, 'email');
                        });
                      }}
                      className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                    >
                      Send Email Requests
                    </button>
                    <button
                      onClick={() => {
                        category.vendorIds.forEach(vendorId => {
                          addRateRequest(category.id, vendorId, 'whatsapp');
                        });
                      }}
                      className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                    >
                      Send WhatsApp
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  // Requests Tab
  const RequestsTab = () => (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Rate Request History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sent</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expires</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rateRequests.map(request => {
                const vendor = vendors.find(v => v.id === request.vendorId);
                const category = vendorCategories.find(c => c.id === request.categoryId);
                const isExpired = new Date(request.expiryDate) < new Date();
                
                return (
                  <tr key={request.id}>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{vendor?.name}</div>
                      <div className="text-xs text-gray-500">{vendor?.email}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {category?.categoryName}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        request.communicationMethod === 'email' ? 'bg-blue-100 text-blue-800' :
                        request.communicationMethod === 'whatsapp' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {request.communicationMethod}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(request.requestDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        request.status === 'responded' ? 'bg-green-100 text-green-800' :
                        request.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                        request.status === 'delivered' ? 'bg-yellow-100 text-yellow-800' :
                        request.status === 'read' ? 'bg-purple-100 text-purple-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {request.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className={isExpired ? 'text-red-600' : ''}>
                        {new Date(request.expiryDate).toLocaleDateString()}
                        {isExpired && <div className="text-xs text-red-500">Expired</div>}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                      <button className="text-indigo-600 hover:text-indigo-900">
                        View Details
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // Analytics Tab
  const AnalyticsTab = () => {
    const totalRequests = rateRequests.length;
    const respondedRequests = rateRequests.filter(req => req.status === 'responded').length;
    const pendingRequests = rateRequests.filter(req => ['sent', 'delivered', 'read'].includes(req.status)).length;
    const expiredRequests = rateRequests.filter(req => new Date(req.expiryDate) < new Date()).length;
    
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-gray-900">{totalRequests}</div>
            <div className="text-sm text-gray-500">Total Requests</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-600">{respondedRequests}</div>
            <div className="text-sm text-gray-500">Responses Received</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-yellow-600">{pendingRequests}</div>
            <div className="text-sm text-gray-500">Pending Responses</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-red-600">{expiredRequests}</div>
            <div className="text-sm text-gray-500">Expired Requests</div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Response Rate by Vendor</h3>
          <div className="space-y-3">
            {vendors.map(vendor => {
              const vendorRequests = rateRequests.filter(req => req.vendorId === vendor.id);
              const vendorResponses = vendorRequests.filter(req => req.status === 'responded');
              const responseRate = vendorRequests.length > 0 ? (vendorResponses.length / vendorRequests.length) * 100 : 0;
              
              if (vendorRequests.length === 0) return null;
              
              return (
                <div key={vendor.id} className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">{vendor.name}</div>
                    <div className="text-sm text-gray-500">{vendorResponses.length}/{vendorRequests.length} responses</div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full" 
                        style={{ width: `${responseRate}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{responseRate.toFixed(0)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-700 px-6 py-4">
          <h3 className="text-xl font-bold text-white">Vendor Category Management</h3>
          <p className="text-indigo-100 text-sm mt-1">Manage vendor assignments and track rate requests by category</p>
        </div>
        
        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'categories', label: 'Categories', icon: '📂' },
              { id: 'requests', label: 'Requests', icon: '📤' },
              { id: 'analytics', label: 'Analytics', icon: '📊' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </nav>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {activeTab === 'categories' && <CategoriesTab />}
          {activeTab === 'requests' && <RequestsTab />}
          {activeTab === 'analytics' && <AnalyticsTab />}
        </div>

        <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-2 border-t border-gray-200">
          <button
            onClick={() => setShowModal(false)}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
