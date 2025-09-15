'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import AppLayout from '../components/AppLayout';
import { apiClient } from '../lib/api';



interface UserData {
  id: number;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'inactive';
}

interface VendorData {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  contact_person: string;
  status: 'active' | 'inactive';
}

interface IntegrationSettings {
  fbrApiKey: string;
  fbrEnabled: boolean;
  ocrProvider: string;
  ocrApiKey: string;
  sendgridApiKey: string;
  twilioAccountSid: string;
  twilioAuthToken: string;
}



interface TermsConditionsSettings {
  defaultTerms: string;
  quotationTerms: string;
  invoiceTerms: string;
  purchaseOrderTerms: string;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('users');
  const [showAddUser, setShowAddUser] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [showAddVendor, setShowAddVendor] = useState(false);
  const [editingVendor, setEditingVendor] = useState<VendorData | null>(null);
  const [loading, setLoading] = useState(false);
  const [vendorsLoading, setVendorsLoading] = useState(false);

  // Mock data


  const [users, setUsers] = useState<UserData[]>([
    { id: 1, name: 'Admin User', email: 'admin@qms.com', role: 'Admin', status: 'active' },
    { id: 2, name: 'Sales Manager', email: 'sales@qms.com', role: 'Sales', status: 'active' },
    { id: 3, name: 'Finance Officer', email: 'finance@qms.com', role: 'Finance', status: 'active' },
    { id: 4, name: 'Procurement Lead', email: 'procurement@qms.com', role: 'Procurement', status: 'inactive' }
  ]);

  const [vendors, setVendors] = useState<VendorData[]>([]);

  const [integrations, setIntegrations] = useState<IntegrationSettings>({
    fbrApiKey: '',
    fbrEnabled: false,
    ocrProvider: 'tesseract',
    ocrApiKey: '',
    sendgridApiKey: '',
    twilioAccountSid: '',
    twilioAuthToken: ''
  });



  const [termsSettings, setTermsSettings] = useState<TermsConditionsSettings>({
  defaultTerms: '1. Payment is due within 30 days of invoice date.\n2. All prices are in PKR and exclude shipping.\n3. Products are subject to availability.\n4. Returns accepted within 14 days with original packaging.\n5. Late payments may incur additional charges.\n6. Delivery terms as per agreement.',
  quotationTerms: '1. This quotation is valid for 30 days from the date of issue.\n2. Prices are in PKR and subject to change without notice.\n3. Payment terms: 50% advance, 50% on delivery.\n4. Delivery time: 7-14 business days after order confirmation.',
  invoiceTerms: '1. Payment is due within 30 days of invoice date.\n2. Late payment charges: 2% per month.\n3. All disputes must be raised within 7 days of invoice date.\n4. Goods once sold cannot be returned without prior approval.\n5. All amounts are in PKR.',
    purchaseOrderTerms: '1. Delivery as per agreed schedule.\n2. Quality as per specifications.\n3. Payment terms as agreed.\n4. Penalties for delayed delivery may apply.'
  });



  const { register: registerUser, handleSubmit: handleUserSubmit, reset: resetUser } = useForm<Omit<UserData, 'id' | 'status'>>();

  const { register: registerVendor, handleSubmit: handleVendorSubmit, reset: resetVendor } = useForm<Omit<VendorData, 'id' | 'status'>>();

  const { register: registerIntegrations, handleSubmit: handleIntegrationsSubmit } = useForm<IntegrationSettings>({
    defaultValues: integrations
  });



  const { register: registerTerms, handleSubmit: handleTermsSubmit } = useForm<TermsConditionsSettings>({
    defaultValues: termsSettings
  });

  // Load vendors from database
  useEffect(() => {
    const loadVendors = async () => {
      setVendorsLoading(true);
      try {
        const response = await apiClient.getVendors();
        if (response && response.success) {
          // Handle backend response structure: { success: true, data: { vendors: [...] } }
          if (response.data && Array.isArray(response.data.vendors)) {
            setVendors(response.data.vendors);
          } else if (Array.isArray(response.data)) {
            setVendors(response.data);
          } else {
            setVendors([]);
          }
        } else {
          console.error('Failed to load vendors:', response?.message || 'Unknown error');
          setVendors([]);
        }
      } catch (error) {
        console.error('Error loading vendors:', error);
        // If API call fails (e.g., backend not running), just use empty array
        setVendors([]);
      } finally {
        setVendorsLoading(false);
      }
    };

    loadVendors();
  }, []);

  const tabs = [
    { id: 'users', name: 'User Management', icon: '👥' },
    { id: 'vendors', name: 'Vendor Management', icon: '🏪' },
    { id: 'terms', name: 'Terms & Conditions', icon: '📋' },
    { id: 'integrations', name: 'Integrations', icon: '🔗' }
  ];

  const roles = ['Admin', 'Sales', 'Procurement', 'Finance', 'Auditor'];



  const onUserSubmit = (data: Omit<UserData, 'id' | 'status'>) => {
    if (editingUser) {
      setUsers(users.map(user => 
        user.id === editingUser.id 
          ? { ...user, ...data }
          : user
      ));
      setEditingUser(null);
    } else {
      const newUser: UserData = {
        ...data,
        id: Math.max(...users.map(u => u.id)) + 1,
        status: 'active'
      };
      setUsers([...users, newUser]);
    }
    setShowAddUser(false);
    resetUser();
  };

  const onVendorSubmit = async (data: Omit<VendorData, 'id' | 'status'>) => {
    setLoading(true);
    try {
  // No gst_number in VendorData, send data as is
  const apiData = data;
      if (editingVendor) {
        // Update existing vendor
        const response = await apiClient.updateVendor(editingVendor.id, apiData);
        if (response && response.success) {
          // Backend returns: { success: true, data: { vendor: {...} } }
          const updatedVendor = response.data?.vendor || { ...editingVendor, ...apiData };
          setVendors(vendors.map(vendor => 
            vendor.id === editingVendor.id 
              ? updatedVendor
              : vendor
          ));
          setEditingVendor(null);
          alert('Vendor updated successfully!');
        } else {
          alert('Failed to update vendor: ' + (response?.message || 'Unknown error'));
        }
      } else {
        // Create new vendor
        const response = await apiClient.createVendor(apiData);
        if (response && response.success) {
          // Backend returns: { success: true, data: { vendor: {...} } }
          const newVendor = response.data?.vendor;
          if (newVendor) {
            setVendors([...vendors, newVendor]);
            alert('Vendor created successfully! You can now select this vendor when creating purchase orders.');
          } else {
            // Fallback if response structure is unexpected
            const fallbackVendor: VendorData = {
              ...apiData,
              id: Date.now().toString(),
              status: 'active'
            };
            setVendors([...vendors, fallbackVendor]);
            alert('Vendor created successfully!');
          }
        } else {
          alert('Failed to create vendor: ' + (response?.message || 'Unknown error'));
        }
      }
      setShowAddVendor(false);
      resetVendor();
    } catch (error) {
      console.error('Error saving vendor:', error);
      alert('An error occurred while saving the vendor. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onIntegrationsSubmit = (data: IntegrationSettings) => {
    setIntegrations(data);
    alert('Integration settings saved successfully!');
  };

  const onTermsSubmit = (data: TermsConditionsSettings) => {
    setTermsSettings(data);
    alert('Terms & Conditions saved successfully!');
  };

  const toggleUserStatus = (userId: number) => {
    setUsers(users.map(user => 
      user.id === userId 
        ? { ...user, status: user.status === 'active' ? 'inactive' : 'active' }
        : user
    ));
  };

  const deleteUser = (userId: number) => {
    if (confirm('Are you sure you want to delete this user?')) {
      setUsers(users.filter(user => user.id !== userId));
    }
  };

  const toggleVendorStatus = async (vendorId: string) => {
    try {
      const vendor = vendors.find(v => v.id === vendorId);
      if (!vendor) return;
      
      const newStatus = vendor.status === 'active' ? 'inactive' : 'active';
      
      // For now, just update locally since there's no specific status endpoint
      // TODO: Use updateVendor with just status field when backend supports partial updates
      setVendors(vendors.map(vendor => 
        vendor.id === vendorId 
          ? { ...vendor, status: newStatus }
          : vendor
      ));
    } catch (error) {
      console.error('Error updating vendor status:', error);
      alert('An error occurred while updating vendor status.');
    }
  };

  const deleteVendor = async (vendorId: string) => {
    if (confirm('Are you sure you want to delete this vendor?')) {
      try {
        const response = await apiClient.deleteVendor(vendorId);
        if (response && response.success) {
          setVendors(vendors.filter(vendor => vendor.id !== vendorId));
          alert('Vendor deleted successfully!');
        } else {
          alert('Failed to delete vendor: ' + (response?.message || 'Unknown error'));
        }
      } catch (error) {
        console.error('Error deleting vendor:', error);
        // Even if API fails, remove from local state as fallback
        setVendors(vendors.filter(vendor => vendor.id !== vendorId));
        alert('Vendor removed from list. If this was an error, please refresh the page.');
      }
    }
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                    activeTab === tab.id
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">


            {/* User Management Tab */}
            {activeTab === 'users' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">User Management</h2>
                  <button
                    onClick={() => setShowAddUser(true)}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors duration-200"
                  >
                    Add User
                  </button>
                </div>

                {/* Users Table */}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {users.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{user.name}</div>
                              <div className="text-sm text-gray-500">{user.email}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              user.role === 'Admin' ? 'bg-purple-100 text-purple-800' :
                              user.role === 'Sales' ? 'bg-green-100 text-green-800' :
                              user.role === 'Finance' ? 'bg-blue-100 text-blue-800' :
                              user.role === 'Procurement' ? 'bg-orange-100 text-orange-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {user.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {user.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <button
                              onClick={() => {
                                setEditingUser(user);
                                setShowAddUser(true);
                              }}
                              className="text-blue-600 hover:text-blue-700 mr-3"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => toggleUserStatus(user.id)}
                              className="text-yellow-600 hover:text-yellow-700 mr-3"
                            >
                              {user.status === 'active' ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              onClick={() => deleteUser(user.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Add/Edit User Modal */}
                {showAddUser && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        {editingUser ? 'Edit User' : 'Add New User'}
                      </h3>
                      <form onSubmit={handleUserSubmit(onUserSubmit)} className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                          <input
                            {...registerUser('name', { required: 'Name is required' })}
                            type="text"
                            defaultValue={editingUser?.name || ''}
                            className="w-full px-3 py-2 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                          <input
                            {...registerUser('email', { required: 'Email is required' })}
                            type="email"
                            defaultValue={editingUser?.email || ''}
                            className="w-full px-3 py-2 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                          <select
                            {...registerUser('role', { required: 'Role is required' })}
                            defaultValue={editingUser?.role || ''}
                            className="w-full px-3 py-2 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          >
                            <option value="">Select Role</option>
                            {roles.map(role => (
                              <option key={role} value={role}>{role}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex justify-end space-x-3 pt-4">
                          <button
                            type="button"
                            onClick={() => {
                              setShowAddUser(false);
                              setEditingUser(null);
                              resetUser();
                            }}
                            className="px-4 text-black py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors duration-200"
                          >
                            {editingUser ? 'Update' : 'Add'} User
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Vendor Management Tab */}
            {activeTab === 'vendors' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Vendor Management</h2>
                  <button
                    onClick={() => setShowAddVendor(true)}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    Add Vendor
                  </button>
                </div>

                {/* Vendors Table */}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {vendorsLoading ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-8 text-center">
                            <div className="flex justify-center items-center">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                              <span className="ml-2 text-gray-600">Loading vendors...</span>
                            </div>
                          </td>
                        </tr>
                      ) : !Array.isArray(vendors) || vendors.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                            No vendors found. Click "Add Vendor" to create your first vendor.
                          </td>
                        </tr>
                      ) : (
                        vendors.map((vendor) => (
                        <tr key={vendor.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{vendor.name}</div>
                              <div className="text-sm text-gray-500">{vendor.address}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{vendor.contact_person}</div>
                              <div className="text-sm text-gray-500">{vendor.email}</div>
                              <div className="text-sm text-gray-500">{vendor.phone}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              vendor.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {vendor.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <button
                              onClick={() => {
                                setEditingVendor(vendor);
                                setShowAddVendor(true);
                              }}
                              className="text-blue-600 hover:text-blue-700 mr-3"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => toggleVendorStatus(vendor.id)}
                              className="text-yellow-600 hover:text-yellow-700 mr-3"
                            >
                              {vendor.status === 'active' ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              onClick={() => deleteVendor(vendor.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Add/Edit Vendor Modal */}
                {showAddVendor && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        {editingVendor ? 'Edit Vendor' : 'Add New Vendor'}
                      </h3>
                      <form onSubmit={handleVendorSubmit(onVendorSubmit)} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Name *</label>
                            <input
                              {...registerVendor('name', { required: 'Vendor name is required' })}
                              type="text"
                              defaultValue={editingVendor?.name || ''}
                              className="w-full px-3 py-2 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                              placeholder="ABC Electronics Ltd"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person *</label>
                            <input
                              {...registerVendor('contact_person', { required: 'Contact person is required' })}
                              type="text"
                              defaultValue={editingVendor?.contact_person || ''}
                              className="w-full px-3 py-2 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                              placeholder="Ahmed Ali"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                            <input
                              {...registerVendor('email', { required: 'Email is required' })}
                              type="email"
                              defaultValue={editingVendor?.email || ''}
                              className="w-full px-3 py-2 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                              placeholder="contact@vendor.com"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                            <input
                              {...registerVendor('phone', { required: 'Phone is required' })}
                              type="tel"
                              defaultValue={editingVendor?.phone || ''}
                              className="w-full px-3 py-2 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                              placeholder="+92-300-1234567"
                            />
                          </div>
                          {/* GST Number removed as backend does not support it */}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                          <textarea
                            {...registerVendor('address')}
                            rows={3}
                            defaultValue={editingVendor?.address || ''}
                            className="w-full px-3 py-2 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            placeholder="Complete business address"
                          />
                        </div>
                        <div className="flex justify-end space-x-3 pt-4">
                          <button
                            type="button"
                            onClick={() => {
                              setShowAddVendor(false);
                              setEditingVendor(null);
                              resetVendor();
                            }}
                            className="px-4 text-black py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={loading}
                            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                          >
                            {loading && (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            )}
                            {editingVendor ? 'Update' : 'Add'} Vendor
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Integrations Tab */}
            {activeTab === 'integrations' && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Integrations</h2>
                <form onSubmit={handleIntegrationsSubmit(onIntegrationsSubmit)} className="space-y-8">
                  {/* FBR Integration */}
                  <div className="border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-900">FBR API (E-Invoicing)</h3>
                      <label className="flex items-center">
                        <input
                          {...registerIntegrations('fbrEnabled')}
                          type="checkbox"
                          className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Enable FBR Integration</span>
                      </label>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">API Key</label>
                      <input
                        {...registerIntegrations('fbrApiKey')}
                        type="password"
                        className="w-full px-4 py-2 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="Enter FBR API key"
                      />
                      <p className="text-sm text-gray-500 mt-1">Required for automatic e-invoice generation and FBR compliance</p>
                    </div>
                  </div>

                  {/* OCR Integration */}
                  <div className="border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">OCR Provider</h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Provider</label>
                        <select
                          {...registerIntegrations('ocrProvider')}
                          className="w-full px-4 py-2 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        >
                          <option value="tesseract">Tesseract (Free)</option>
                          <option value="google">Google Vision API</option>
                          <option value="azure">Azure Computer Vision</option>
                          <option value="aws">AWS Textract</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">API Key</label>
                        <input
                          {...registerIntegrations('ocrApiKey')}
                          type="password"
                          className="w-full px-4 py-2 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          placeholder="Enter OCR API key (if required)"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Email/SMS Integration */}
                  <div className="border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Email & SMS Notifications</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">SendGrid API Key</label>
                        <input
                          {...registerIntegrations('sendgridApiKey')}
                          type="password"
                          className="w-full px-4 py-2 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          placeholder="Enter SendGrid API key for email notifications"
                        />
                      </div>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Twilio Account SID</label>
                          <input
                            {...registerIntegrations('twilioAccountSid')}
                            type="text"
                            className="w-full px-4 py-2 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            placeholder="Twilio Account SID"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Twilio Auth Token</label>
                          <input
                            {...registerIntegrations('twilioAuthToken')}
                            type="password"
                            className="w-full px-4 py-2 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            placeholder="Twilio Auth Token"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors duration-200"
                    >
                      Save Integration Settings
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Terms & Conditions Tab */}
            {activeTab === 'terms' && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Terms & Conditions Management</h2>
                <form onSubmit={handleTermsSubmit(onTermsSubmit)} className="space-y-8">
                  {/* Default Terms */}
                  <div className="border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Default Terms & Conditions
                    </h3>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">General Terms</label>
                      <textarea
                        {...registerTerms('defaultTerms')}
                        rows={6}
                        className="w-full px-4 py-2 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="Enter default terms and conditions..."
                      />
                      <p className="text-sm text-gray-500 mt-1">These terms will be used as default for all documents unless overridden.</p>
                    </div>
                  </div>

                  {/* Document-Specific Terms */}
                  <div className="border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Document-Specific Terms</h3>
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Quotation Terms</label>
                        <textarea
                          {...registerTerms('quotationTerms')}
                          rows={4}
                          className="w-full px-4 py-2 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          placeholder="Terms specific to quotations..."
                        />
                        <p className="text-sm text-gray-500 mt-1">These terms will appear on quotations by default.</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Terms</label>
                        <textarea
                          {...registerTerms('invoiceTerms')}
                          rows={4}
                          className="w-full px-4 py-2 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          placeholder="Terms specific to invoices..."
                        />
                        <p className="text-sm text-gray-500 mt-1">These terms will appear on invoices by default.</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Purchase Order Terms</label>
                        <textarea
                          {...registerTerms('purchaseOrderTerms')}
                          rows={4}
                          className="w-full px-4 py-2 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          placeholder="Terms specific to purchase orders..."
                        />
                        <p className="text-sm text-gray-500 mt-1">These terms will appear on purchase orders by default.</p>
                      </div>
                    </div>
                  </div>

                  {/* Usage Guidelines */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-blue-900 mb-3 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Usage Guidelines
                    </h3>
                    <div className="text-sm text-blue-800 space-y-2">
                      <p>• <strong>Default Terms:</strong> Used when no document-specific terms are set</p>
                      <p>• <strong>Document-Specific Terms:</strong> Override default terms for specific document types</p>
                      <p>• <strong>Manual Override:</strong> Users can still modify terms when creating individual documents</p>
                      <p>• <strong>Line Breaks:</strong> Use line breaks to separate different terms for better readability</p>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors duration-200 flex items-center"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Save Terms & Conditions
                    </button>
                  </div>
                </form>
              </div>
            )}

            // ...existing code...
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
