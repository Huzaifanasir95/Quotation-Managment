'use client';

import { useState, useEffect, ReactElement } from 'react';
import { apiClient } from '../../lib/api';

interface AddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCustomerAdded?: () => void;
}

type TabType = 'basic' | 'contact' | 'business' | 'address' | 'review';

interface Tab {
  id: TabType;
  name: string;
  icon: ReactElement;
}

export default function AddCustomerModalMultiStep({ isOpen, onClose, onCustomerAdded }: AddCustomerModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('basic');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    fax: '',
    gst: '',
    panNumber: '',
    contactPerson: '',
    designation: '',
    department: '',
    website: '',
    customerRefNo: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    creditLimit: '',
    paymentTerms: '30',
    customerType: '',
    notes: ''
  });
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [isLoading, setIsLoading] = useState(false);

  const tabs: Tab[] = [
    {
      id: 'basic',
      name: 'Basic Info',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    },
    {
      id: 'contact',
      name: 'Contact',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
      )
    },
    {
      id: 'business',
      name: 'Business',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    {
      id: 'address',
      name: 'Address',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    },
    {
      id: 'review',
      name: 'Review & Create',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      )
    }
  ];

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      fax: '',
      gst: '',
      panNumber: '',
      contactPerson: '',
      designation: '',
      department: '',
      website: '',
      customerRefNo: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      country: '',
      creditLimit: '',
      paymentTerms: '30',
      customerType: '',
      notes: ''
    });
    setErrors({});
    setActiveTab('basic');
  };

  const validateCurrentStep = (): boolean => {
    const newErrors: {[key: string]: string} = {};

    switch (activeTab) {
      case 'basic':
        if (!formData.name.trim()) newErrors.name = 'Customer name is required';
        if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
          newErrors.email = 'Invalid email format';
        }
        if (formData.website && !/^https?:\/\/.+/.test(formData.website)) {
          newErrors.website = 'Website must start with http:// or https://';
        }
        break;
      
      case 'contact':
        if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
        if (formData.phone && !/^[\+]?[\d\s\-\(\)]{10,}$/.test(formData.phone)) {
          newErrors.phone = 'Invalid phone number format';
        }
        if (!formData.contactPerson.trim()) newErrors.contactPerson = 'Contact person is required';
        break;
      
      case 'business':
        if (formData.gst && !/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$/.test(formData.gst)) {
          newErrors.gst = 'Invalid GST format (e.g., 22AAAAA0000A1Z5)';
        }
        if (formData.panNumber && !/^[A-Z]{5}\d{4}[A-Z]{1}$/.test(formData.panNumber)) {
          newErrors.panNumber = 'Invalid PAN format (e.g., ABCDE1234F)';
        }
        if (formData.creditLimit && (isNaN(Number(formData.creditLimit)) || Number(formData.creditLimit) < 0)) {
          newErrors.creditLimit = 'Credit limit must be a positive number';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateCurrentStep()) return;

    setIsLoading(true);
    
    try {
      const customerData = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        contact_person: formData.contactPerson.trim(),
        address: formData.address.trim() || null,
        city: formData.city.trim() || null,
        state: formData.state.trim() || null,
        postal_code: formData.zipCode.trim() || null,
        country: formData.country || null,
        credit_limit: formData.creditLimit ? Number(formData.creditLimit) : null,
        payment_terms: Number(formData.paymentTerms),
        status: 'active'
      };

      const response = await apiClient.createCustomer(customerData);
      
      if (response.success) {
        alert('Customer created successfully!');
        handleClose();
        
        // Call callback to refresh customer list
        if (onCustomerAdded) {
          onCustomerAdded();
        }
      } else {
        throw new Error(response.message || 'Failed to create customer');
      }
    } catch (error) {
      console.error('Failed to create customer:', error);
      alert(`Failed to create customer: ${error instanceof Error ? error.message : 'Please try again.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const canProceedToNext = (): boolean => {
    return validateCurrentStep();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4 bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-2xl max-w-5xl w-full max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="bg-white p-4 border-b border-gray-200 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Add New Customer</h2>
              <p className="text-sm text-gray-600 mt-1">
                Step {tabs.findIndex(tab => tab.id === activeTab) + 1} of {tabs.length}
              </p>
            </div>
            <button 
              onClick={handleClose} 
              className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-4">
            <div className="bg-gray-200 rounded-full h-1.5">
              <div 
                className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${((tabs.findIndex(tab => tab.id === activeTab) + 1) / tabs.length) * 100}%` }}
              />
            </div>
          </div>
          
          {/* Tabs */}
          <div className="flex items-center justify-between mt-4 space-x-2">
            {tabs.map((tab, index) => {
              const isActive = tab.id === activeTab;
              const isCompleted = tabs.findIndex(t => t.id === activeTab) > index;
              
              return (
                <div key={tab.id} className="flex items-center">
                  <div 
                    className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-medium transition-colors ${
                      isActive 
                        ? 'bg-blue-500 text-white' 
                        : isCompleted 
                        ? 'bg-green-500 text-white' 
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {isCompleted ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      index + 1
                    )}
                  </div>
                  <span className={`ml-2 text-xs font-medium hidden sm:block ${
                    isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                  }`}>
                    {tab.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Basic Information */}
          {activeTab === 'basic' && (
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="text-base font-medium text-gray-900 mb-3 flex items-center">
                  <svg className="w-4 h-4 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Basic Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Customer Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className={`w-full text-black px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${
                        errors.name ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="ABC Trading Company"
                    />
                    {errors.name && (
                      <p className="mt-1 text-xs text-red-600">{errors.name}</p>
                    )}
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Customer Ref No.
                    </label>
                    <input
                      type="text"
                      value={formData.customerRefNo}
                      onChange={(e) => handleInputChange('customerRefNo', e.target.value)}
                      className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      placeholder="REF-12345"
                    />
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Customer Type
                    </label>
                    <input
                      type="text"
                      value={formData.customerType}
                      onChange={(e) => handleInputChange('customerType', e.target.value)}
                      className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      placeholder="e.g., Regular, VIP, Corporate, Government"
                    />
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className={`w-full text-black px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${
                        errors.email ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="info@abctrading.com"
                    />
                    {errors.email && (
                      <p className="mt-1 text-xs text-red-600">{errors.email}</p>
                    )}
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Website
                    </label>
                    <input
                      type="url"
                      value={formData.website}
                      onChange={(e) => handleInputChange('website', e.target.value)}
                      className={`w-full text-black px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${
                        errors.website ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="https://www.abctrading.com"
                    />
                    {errors.website && (
                      <p className="mt-1 text-xs text-red-600">{errors.website}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Contact Information */}
          {activeTab === 'contact' && (
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="text-base font-medium text-gray-900 mb-3 flex items-center">
                  <svg className="w-4 h-4 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  Contact Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Primary Phone *
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className={`w-full text-black px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${
                        errors.phone ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="+92 42 111-222-333"
                    />
                    {errors.phone && (
                      <p className="mt-1 text-xs text-red-600">{errors.phone}</p>
                    )}
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      FAX
                    </label>
                    <input
                      type="tel"
                      value={formData.fax}
                      onChange={(e) => handleInputChange('fax', e.target.value)}
                      className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      placeholder="+92 42 111-222-333"
                    />
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contact Person *
                    </label>
                    <input
                      type="text"
                      value={formData.contactPerson}
                      onChange={(e) => handleInputChange('contactPerson', e.target.value)}
                      className={`w-full text-black px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${
                        errors.contactPerson ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="Ahmad Ali"
                    />
                    {errors.contactPerson && (
                      <p className="mt-1 text-xs text-red-600">{errors.contactPerson}</p>
                    )}
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Designation
                    </label>
                    <input
                      type="text"
                      value={formData.designation}
                      onChange={(e) => handleInputChange('designation', e.target.value)}
                      className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      placeholder="Manager, Director, CEO"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Department
                      </label>
                      <input
                        type="text"
                        value={formData.department}
                        onChange={(e) => handleInputChange('department', e.target.value)}
                        className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        placeholder="Procurement, Finance, Operations, Sales"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Business Information */}
          {activeTab === 'business' && (
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="text-base font-medium text-gray-900 mb-3 flex items-center">
                  <svg className="w-4 h-4 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Tax & Business Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tax Registration Number
                    </label>
                    <input
                      type="text"
                      value={formData.gst}
                      onChange={(e) => handleInputChange('gst', e.target.value)}
                      className={`w-full text-black px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${
                        errors.gst ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="NTN/GST/VAT Number"
                    />
                    {errors.gst && (
                      <p className="mt-1 text-xs text-red-600">{errors.gst}</p>
                    )}
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Business ID Number
                    </label>
                    <input
                      type="text"
                      value={formData.panNumber}
                      onChange={(e) => handleInputChange('panNumber', e.target.value)}
                      className={`w-full text-black px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${
                        errors.panNumber ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="Business Registration ID"
                    />
                    {errors.panNumber && (
                      <p className="mt-1 text-xs text-red-600">{errors.panNumber}</p>
                    )}
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Credit Limit
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.creditLimit}
                      onChange={(e) => handleInputChange('creditLimit', e.target.value)}
                      className={`w-full text-black px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${
                        errors.creditLimit ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="500000.00"
                    />
                    {errors.creditLimit && (
                      <p className="mt-1 text-xs text-red-600">{errors.creditLimit}</p>
                    )}
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Terms (Days)
                    </label>
                    <select
                      value={formData.paymentTerms}
                      onChange={(e) => handleInputChange('paymentTerms', e.target.value)}
                      className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    >
                      <option value="0">Cash on Delivery</option>
                      <option value="7">7 Days</option>
                      <option value="15">15 Days</option>
                      <option value="30">30 Days</option>
                      <option value="45">45 Days</option>
                      <option value="60">60 Days</option>
                      <option value="90">90 Days</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Address Information */}
          {activeTab === 'address' && (
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="text-base font-medium text-gray-900 mb-3 flex items-center">
                  <svg className="w-4 h-4 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Address Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Street Address
                      </label>
                      <input
                        type="text"
                        value={formData.address}
                        onChange={(e) => handleInputChange('address', e.target.value)}
                        className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        placeholder="Plot 123, Main Boulevard, DHA Phase 5"
                      />
                    </div>
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      City
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      placeholder="Lahore"
                    />
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      State/Province
                    </label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) => handleInputChange('state', e.target.value)}
                      className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      placeholder="Punjab"
                    />
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ZIP/Postal Code
                    </label>
                    <input
                      type="text"
                      value={formData.zipCode}
                      onChange={(e) => handleInputChange('zipCode', e.target.value)}
                      className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      placeholder="54000"
                    />
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Country
                    </label>
                    <select
                      value={formData.country}
                      onChange={(e) => handleInputChange('country', e.target.value)}
                      className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    >
                      <option value="">Select country</option>
                      <option value="PK">Pakistan</option>
                      <option value="IN">India</option>
                      <option value="US">United States</option>
                      <option value="CA">Canada</option>
                      <option value="UK">United Kingdom</option>
                      <option value="AU">Australia</option>
                      <option value="DE">Germany</option>
                      <option value="FR">France</option>
                      <option value="JP">Japan</option>
                      <option value="CN">China</option>
                      <option value="AE">UAE</option>
                      <option value="SG">Singapore</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Notes
                      </label>
                      <textarea
                        rows={3}
                        value={formData.notes}
                        onChange={(e) => handleInputChange('notes', e.target.value)}
                        className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
                        placeholder="Add any special notes, requirements, or additional information about this customer..."
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Review & Create */}
          {activeTab === 'review' && (
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="text-base font-medium text-gray-900 mb-3 flex items-center">
                  <svg className="w-4 h-4 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Review & Create Customer
                </h3>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Basic & Contact Info */}
                  <div className="bg-white border border-gray-300 rounded-lg p-4 shadow-sm">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">Basic & Contact Information</h4>
                    <div className="space-y-2 text-sm">
                      <div className="text-gray-800"><span className="font-medium text-gray-900">Name:</span> {formData.name || 'Not provided'}</div>
                      {formData.customerRefNo && <div className="text-gray-800"><span className="font-medium text-gray-900">Ref No.:</span> {formData.customerRefNo}</div>}
                      {formData.customerType && <div className="text-gray-800"><span className="font-medium text-gray-900">Type:</span> {formData.customerType}</div>}
                      <div className="text-gray-800"><span className="font-medium text-gray-900">Email:</span> {formData.email || 'Not provided'}</div>
                      <div className="text-gray-800"><span className="font-medium text-gray-900">Phone:</span> {formData.phone || 'Not provided'}</div>
                      {formData.fax && <div className="text-gray-800"><span className="font-medium text-gray-900">FAX:</span> {formData.fax}</div>}
                      <div className="text-gray-800"><span className="font-medium text-gray-900">Contact Person:</span> {formData.contactPerson || 'Not provided'}</div>
                      {formData.website && <div className="text-gray-800"><span className="font-medium text-gray-900">Website:</span> {formData.website}</div>}
                    </div>
                  </div>

                  {/* Business & Address Info */}
                  <div className="bg-white border border-gray-300 rounded-lg p-4 shadow-sm">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">Business & Address Information</h4>
                    <div className="space-y-2 text-sm">
                      {formData.gst && <div className="text-gray-800"><span className="font-medium text-gray-900">Tax Registration:</span> {formData.gst}</div>}
                      {formData.creditLimit && <div className="text-gray-800"><span className="font-medium text-gray-900">Credit Limit:</span> {formData.creditLimit}</div>}
                      <div className="text-gray-800"><span className="font-medium text-gray-900">Payment Terms:</span> {formData.paymentTerms} days</div>
                      {formData.address && <div className="text-gray-800"><span className="font-medium text-gray-900">Address:</span> {formData.address}</div>}
                      {formData.city && <div className="text-gray-800"><span className="font-medium text-gray-900">City:</span> {formData.city}</div>}
                      {formData.state && <div className="text-gray-800"><span className="font-medium text-gray-900">State:</span> {formData.state}</div>}
                      {formData.country && <div className="text-gray-800"><span className="font-medium text-gray-900">Country:</span> {formData.country}</div>}
                    </div>
                  </div>
                </div>

                {formData.notes && (
                  <div className="mt-4 bg-white border border-gray-300 rounded-lg p-4 shadow-sm">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">Notes</h4>
                    <p className="text-sm text-gray-800">{formData.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-white px-6 py-3 border-t border-gray-200 rounded-b-lg">
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                const currentIndex = tabs.findIndex(t => t.id === activeTab);
                if (currentIndex > 0) {
                  setActiveTab(tabs[currentIndex - 1].id as TabType);
                }
              }}
              disabled={tabs.findIndex(t => t.id === activeTab) === 0}
              className="px-4 py-1.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              Previous
            </button>

            <div className="flex space-x-2">
              <button 
                onClick={handleClose} 
                className="px-4 py-1.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                Cancel
              </button>
              {activeTab === 'review' ? (
                <button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="px-4 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center text-sm"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Create Customer
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={() => {
                    if (canProceedToNext()) {
                      const currentIndex = tabs.findIndex(t => t.id === activeTab);
                      if (currentIndex < tabs.length - 1) {
                        setActiveTab(tabs[currentIndex + 1].id as TabType);
                      }
                    }
                  }}
                  className="px-4 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center text-sm"
                >
                  Next
                  <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
