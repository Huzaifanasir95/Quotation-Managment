'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import AppLayout from '../components/AppLayout';

interface CompanySettings {
  name: string;
  address: string;
  gstId: string;
  logo: string;
}

interface UserData {
  id: number;
  name: string;
  email: string;
  role: string;
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

interface SystemPreferences {
  defaultCurrency: string;
  defaultTaxRate: number;
  quotationNumberFormat: string;
  invoiceNumberFormat: string;
  emailNotifications: boolean;
  smsNotifications: boolean;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('company');
  const [showAddUser, setShowAddUser] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);

  // Mock data
  const [companySettings, setCompanySettings] = useState<CompanySettings>({
    name: 'QMS Solutions Ltd',
    address: '123 Business Street, Karachi, Pakistan',
    gstId: 'GST-123456789',
    logo: ''
  });

  const [users, setUsers] = useState<UserData[]>([
    { id: 1, name: 'Admin User', email: 'admin@qms.com', role: 'Admin', status: 'active' },
    { id: 2, name: 'Sales Manager', email: 'sales@qms.com', role: 'Sales', status: 'active' },
    { id: 3, name: 'Finance Officer', email: 'finance@qms.com', role: 'Finance', status: 'active' },
    { id: 4, name: 'Procurement Lead', email: 'procurement@qms.com', role: 'Procurement', status: 'inactive' }
  ]);

  const [integrations, setIntegrations] = useState<IntegrationSettings>({
    fbrApiKey: '',
    fbrEnabled: false,
    ocrProvider: 'tesseract',
    ocrApiKey: '',
    sendgridApiKey: '',
    twilioAccountSid: '',
    twilioAuthToken: ''
  });

  const [systemPrefs, setSystemPrefs] = useState<SystemPreferences>({
    defaultCurrency: 'PKR',
    defaultTaxRate: 17,
    quotationNumberFormat: 'Q-YYYY-###',
    invoiceNumberFormat: 'INV-YYYY-###',
    emailNotifications: true,
    smsNotifications: false
  });

  const { register: registerCompany, handleSubmit: handleCompanySubmit } = useForm<CompanySettings>({
    defaultValues: companySettings
  });

  const { register: registerUser, handleSubmit: handleUserSubmit, reset: resetUser } = useForm<Omit<UserData, 'id' | 'status'>>();

  const { register: registerIntegrations, handleSubmit: handleIntegrationsSubmit } = useForm<IntegrationSettings>({
    defaultValues: integrations
  });

  const { register: registerPrefs, handleSubmit: handlePrefsSubmit } = useForm<SystemPreferences>({
    defaultValues: systemPrefs
  });

  const tabs = [
    { id: 'company', name: 'Company Settings', icon: '🏢' },
    { id: 'users', name: 'User Management', icon: '👥' },
    { id: 'integrations', name: 'Integrations', icon: '🔗' },
    { id: 'preferences', name: 'System Preferences', icon: '⚙️' }
  ];

  const roles = ['Admin', 'Sales', 'Procurement', 'Finance', 'Auditor'];

  const onCompanySubmit = (data: CompanySettings) => {
    setCompanySettings(data);
    alert('Company settings saved successfully!');
  };

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

  const onIntegrationsSubmit = (data: IntegrationSettings) => {
    setIntegrations(data);
    alert('Integration settings saved successfully!');
  };

  const onPrefsSubmit = (data: SystemPreferences) => {
    setSystemPrefs(data);
    alert('System preferences saved successfully!');
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
            {/* Company Settings Tab */}
            {activeTab === 'company' && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Company / Business Entity Settings</h2>
                <form onSubmit={handleCompanySubmit(onCompanySubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Company Name
                      </label>
                      <input
                        {...registerCompany('name', { required: 'Company name is required' })}
                        type="text"
                        className="w-full px-4 py-2 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="Enter company name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        GST/Tax ID
                      </label>
                      <input
                        {...registerCompany('gstId')}
                        type="text"
                        className="w-full px-4 py-2 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="GST-123456789"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Company Address
                    </label>
                    <textarea
                      {...registerCompany('address')}
                      rows={3}
                      className="w-full px-4 py-2 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Enter complete address"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Company Logo
                    </label>
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                        <span className="text-gray-500 text-xs">Logo</span>
                      </div>
                      <button
                        type="button"
                        className="px-4 py-2 text-black border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                      >
                        Upload Logo
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Multiple Business Entities</h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <span className="font-medium text-gray-900">Primary Entity: {companySettings.name}</span>
                        <button
                          type="button"
                          className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors duration-200"
                        >
                          Add Entity
                        </button>
                      </div>
                      <p className="text-sm text-gray-600">
                        Add multiple business entities for import/export operations and multi-company management.
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors duration-200"
                    >
                      Save Company Settings
                    </button>
                  </div>
                </form>
              </div>
            )}

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

            {/* System Preferences Tab */}
            {activeTab === 'preferences' && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-6">System Preferences</h2>
                <form onSubmit={handlePrefsSubmit(onPrefsSubmit)} className="space-y-8">
                  {/* Currency & Tax */}
                  <div className="border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Currency & Tax Settings</h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Default Currency</label>
                        <select
                          {...registerPrefs('defaultCurrency')}
                          className="w-full px-4 py-2 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        >
                          <option value="PKR">Pakistani Rupee (PKR)</option>
                          <option value="USD">US Dollar (USD)</option>
                          <option value="EUR">Euro (EUR)</option>
                          <option value="GBP">British Pound (GBP)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Default Tax Rate (%)</label>
                        <input
                          {...registerPrefs('defaultTaxRate')}
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          className="w-full px-4 py-2 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          placeholder="17.00"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Document Numbering */}
                  <div className="border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Document Numbering Format</h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Quotation Format</label>
                        <input
                          {...registerPrefs('quotationNumberFormat')}
                          type="text"
                          className="w-full px-4 py-2 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          placeholder="Q-YYYY-###"
                        />
                        <p className="text-sm text-gray-500 mt-1">Use YYYY for year, ### for sequential number</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Format</label>
                        <input
                          {...registerPrefs('invoiceNumberFormat')}
                          type="text"
                          className="w-full px-4 py-2 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          placeholder="INV-YYYY-###"
                        />
                        <p className="text-sm text-gray-500 mt-1">Use YYYY for year, ### for sequential number</p>
                      </div>
                    </div>
                  </div>

                  {/* Notification Settings */}
                  <div className="border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Notification Settings</h3>
                    <div className="space-y-4">
                      <label className="flex items-center">
                        <input
                          {...registerPrefs('emailNotifications')}
                          type="checkbox"
                          className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                        <span className="ml-3 text-sm text-gray-700">
                          Enable Email Notifications
                          <span className="block text-gray-500">Send email alerts for quotations, orders, and low stock</span>
                        </span>
                      </label>
                      <label className="flex items-center">
                        <input
                          {...registerPrefs('smsNotifications')}
                          type="checkbox"
                          className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                        <span className="ml-3 text-sm text-gray-700">
                          Enable SMS Notifications
                          <span className="block text-gray-500">Send SMS alerts for urgent notifications</span>
                        </span>
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors duration-200"
                    >
                      Save System Preferences
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
