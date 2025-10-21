'use client';

import { useState, useEffect } from 'react';
import { Vendor, apiClient } from '../../lib/api';
import { whatsappService, type VendorRateRequestData } from '../../lib/whatsapp';

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

interface VendorCategoryManagerProps {
  quotationId: string;
  items: any[];
  vendors: Vendor[];
  products: any[];
  onCategoryVendorsUpdate: (categoryVendors: {[key: string]: string[]}) => void;
  showModal: boolean;
  setShowModal: (show: boolean) => void;
}

export default function VendorCategoryManager({
  quotationId,
  items,
  vendors,
  products,
  onCategoryVendorsUpdate,
  showModal,
  setShowModal
}: VendorCategoryManagerProps) {
  const [vendorCategories, setVendorCategories] = useState<VendorCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);

  // Get unique categories from items
  const itemCategories = [...new Set(items.map(item => item.category || 'Uncategorized'))];

  // Load existing category-vendor mappings and backend data
  useEffect(() => {
    if (showModal) {
      loadVendorCategories();
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

  // Send rate request via WhatsApp to a single vendor
  const sendWhatsAppRateRequest = async (categoryId: string, vendorId: string) => {
    try {
      const category = vendorCategories.find(c => c.id === categoryId);
      if (!category) {
        alert('Category not found');
        return;
      }

      const vendor = vendors.find(v => v.id === vendorId);
      if (!vendor) {
        alert('Vendor not found');
        return;
      }

      const categoryItems = items.filter(item => (item.category || 'Uncategorized') === category.categoryName);
      
      if (categoryItems.length === 0) {
        alert('No items found in this category');
        return;
      }

      // Prepare data for WhatsApp
      const whatsappData: VendorRateRequestData = {
        vendor_name: vendor.name,
        vendor_phone: vendor.phone,
        vendor_email: vendor.email,
        category: category.categoryName,
        reference_no: quotationId,
        items_count: categoryItems.length,
        items: categoryItems.map(item => {
          const product = products.find(p => p.id === item.productId);
          return {
            item_name: item.itemName || (item.isCustom ? item.customDescription : product?.name) || 'N/A',
            description: item.isCustom ? item.customDescription : (product?.description || product?.name) || 'N/A',
            quantity: item.quantity || 0,
            uom: item.uom || 'pcs'
          };
        })
      };

      // Send via WhatsApp
      await whatsappService.sendVendorRateRequest(whatsappData);

      alert(vendor.phone 
        ? `Rate request sent to ${vendor.name} via WhatsApp`
        : `WhatsApp opened with rate request for ${vendor.name}. Please select the contact manually.`
      );
    } catch (error) {
      console.error('Error sending WhatsApp rate request:', error);
      alert('Failed to send WhatsApp rate request. Please try again.');
    }
  };

  // Send rate requests to all vendors in a category via WhatsApp
  const sendWhatsAppRateRequestsToAll = async (categoryId: string) => {
    const category = vendorCategories.find(c => c.id === categoryId);
    if (!category || category.vendorIds.length === 0) {
      alert('No vendors selected for this category');
      return;
    }

    const confirmSend = confirm(`Send rate request via WhatsApp to ${category.vendorIds.length} vendor(s)?`);
    if (!confirmSend) return;

    for (const vendorId of category.vendorIds) {
      await sendWhatsAppRateRequest(categoryId, vendorId);
      // Add small delay between messages
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  };

  // Categories Tab
  const CategoriesTab = () => (
    <div className="space-y-3">
      {vendorCategories.map(category => {
        const categoryItems = items.filter(item => (item.category || 'Uncategorized') === category.categoryName);
        
        return (
          <div key={category.id} className="border border-gray-200 rounded-lg p-4 bg-white">
            {/* Header with Action Buttons */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex-1">
                <h3 className="text-base font-semibold text-gray-900">{category.categoryName}</h3>
                <p className="text-xs text-gray-500">{categoryItems.length} item(s)</p>
              </div>
              
              {/* Action Buttons */}
              {category.vendorIds.length > 0 && (
                <div className="flex gap-2">
                  <button
                    onClick={() => sendWhatsAppRateRequestsToAll(category.id)}
                    className="px-3 py-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                  >
                    📱 Send WhatsApp
                  </button>
                </div>
              )}
            </div>

            {/* Compact Items List */}
            <div className="mb-3 text-xs text-gray-600 bg-gray-50 rounded p-2">
              {categoryItems.slice(0, 2).map((item, idx) => (
                <span key={idx}>
                  {item.item_name || item.description} ({item.quantity})
                  {idx < Math.min(categoryItems.length, 2) - 1 ? ', ' : ''}
                </span>
              ))}
              {categoryItems.length > 2 && (
                <span className="text-gray-500"> +{categoryItems.length - 2} more</span>
              )}
            </div>

            {/* Vendor Selection */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Select Vendors:
              </label>
              <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                {vendors.map(vendor => {
                  const isSelected = category.vendorIds.includes(vendor.id);
                  
                  return (
                    <label key={vendor.id} className={`flex items-center space-x-2 p-2 border rounded cursor-pointer text-xs ${
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
                        className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-medium text-gray-900 truncate">{vendor.name}</span>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
              
              {category.vendorIds.length > 0 && (
                <p className="text-xs text-green-600 mt-2">
                  ✓ {category.vendorIds.length} vendor(s) selected
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10002] p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        <div className="bg-white px-6 py-4 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900">Vendor Category Management</h3>
          <p className="text-gray-600 text-sm mt-1">Manage vendor assignments and track rate requests by category</p>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          <CategoriesTab />
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
