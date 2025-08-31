'use client';

import { apiClient, DocumentAttachment } from '@/app/lib/api';
import { useState } from 'react';

interface UploadTradeDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess?: () => void;
  businessEntities?: any[];
  customers?: any[];
  vendors?: any[];
}

export default function UploadTradeDocumentModal({ 
  isOpen, 
  onClose, 
  onUploadSuccess, 
  businessEntities = [], 
  customers = [], 
  vendors = [] 
}: UploadTradeDocumentModalProps) {
  const [uploadData, setUploadData] = useState({
    entity: '',
    documentType: '',
    linkedReference: '',
    linkedType: '',
    customerVendor: '',
    customerVendorType: 'Customer',
    notes: '',
    complianceNotes: '',
    files: [] as File[]
  });
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [isUploading, setIsUploading] = useState(false);

  const documentTypes = [
    { code: 'bill_of_lading', name: 'Bill of Lading', description: 'Shipping document for cargo', icon: '🚢' },
    { code: 'customs_form', name: 'Customs Form', description: 'Customs declaration and clearance', icon: '📋' },
    { code: 'commercial_invoice', name: 'Commercial Invoice', description: 'Commercial transaction invoice', icon: '💰' },
    { code: 'packing_list', name: 'Packing List', description: 'Detailed packing information', icon: '📦' },
    { code: 'certificate_of_origin', name: 'Certificate of Origin', description: 'Country of origin certificate', icon: '🏛️' },
    { code: 'insurance_certificate', name: 'Insurance Certificate', description: 'Insurance coverage document', icon: '🛡️' },
    { code: 'quality_certificate', name: 'Quality Certificate', description: 'Quality assurance document', icon: '✅' },
    { code: 'other', name: 'Other', description: 'Other trade documents', icon: '📄' }
  ];

  const linkedTypes = [
    'Quotation',
    'Sales Order',
    'Purchase Order',
    'Invoice',
    'Delivery Challan',
    'Contract',
    'Agreement',
    'Other'
  ];

  const customerVendorTypes = ['Customer', 'Vendor', 'Both'];

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

    if (!uploadData.entity) newErrors.entity = 'Business entity is required';
    if (!uploadData.documentType) newErrors.documentType = 'Document type is required';
    if (!uploadData.linkedReference.trim()) newErrors.linkedReference = 'Linked reference is required';
    if (!uploadData.linkedType) newErrors.linkedType = 'Linked type is required';
    if (!uploadData.customerVendor.trim()) newErrors.customerVendor = 'Customer/Vendor is required';
    if (uploadData.files.length === 0) newErrors.files = 'At least one file must be uploaded';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsUploading(true);
    
    try {
      // Find customer or vendor ID
      let customerId = null;
      let vendorId = null;
      
      if (uploadData.customerVendorType === 'Customer') {
        const customer = customers.find(c => c.name === uploadData.customerVendor);
        customerId = customer?.id;
      } else if (uploadData.customerVendorType === 'Vendor') {
        const vendor = vendors.find(v => v.name === uploadData.customerVendor);
        vendorId = vendor?.id;
      }

      // Upload each file
      for (const file of uploadData.files) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('entity_type', 'business_entity');
        formData.append('entity_id', uploadData.entity);
        formData.append('document_type', uploadData.documentType);
        formData.append('linked_reference_type', uploadData.linkedType);
        formData.append('linked_reference_number', uploadData.linkedReference);
        if (customerId) formData.append('customer_id', customerId);
        if (vendorId) formData.append('vendor_id', vendorId);
        if (uploadData.notes) formData.append('notes', uploadData.notes);

        await apiClient.uploadDocument(formData);
      }
      
      alert('Trade document(s) uploaded successfully!');
      onClose();
      
      // Refresh documents in parent component
      if (onUploadSuccess) {
        onUploadSuccess();
      }
      
      // Reset form
      setUploadData({
        entity: '',
        documentType: '',
        linkedReference: '',
        linkedType: '',
        customerVendor: '',
        customerVendorType: 'Customer',
        notes: '',
        complianceNotes: '',
        files: []
      });
      setErrors({});
    } catch (error) {
      console.error('Failed to upload document:', error);
      alert('Failed to upload document. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setUploadData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploadData(prev => ({ ...prev, files: [...prev.files, ...files] }));
    
    if (errors.files) {
      setErrors(prev => ({ ...prev, files: '' }));
    }
  };

  const removeFile = (index: number) => {
    setUploadData(prev => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index)
    }));
  };

  const getEntityInfo = (entityId: string) => {
    return businessEntities.find(entity => entity.id === entityId);
  };

  const getDocumentTypeInfo = (typeCode: string) => {
    return documentTypes.find(type => type.code === typeCode);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Upload Trade Document</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* Business Entity Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">Business Entity *</label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {businessEntities.map((entity) => (
                <button
                  key={entity.id}
                  type="button"
                  onClick={() => handleInputChange('entity', entity.id)}
                  className={`p-4 border rounded-lg text-left text-black transition-colors duration-200 ${
                    uploadData.entity === entity.id
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="font-medium">{entity.name}</div>
                  <div className="text-sm text-gray-600">{entity.type}</div>
                  <div className="text-xs text-gray-500">{entity.country}</div>
                </button>
              ))}
            </div>
            {errors.entity && <p className="text-red-500 text-xs mt-1">{errors.entity}</p>}
          </div>

          {/* Document Type Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">Document Type *</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {documentTypes.map((type) => (
                <button
                  key={type.code}
                  type="button"
                  onClick={() => handleInputChange('documentType', type.code)}
                  className={`p-3 border rounded-lg text-black text-center transition-colors duration-200 ${
                    uploadData.documentType === type.code
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="text-lg mb-1">{type.icon}</div>
                  <div className="text-xs text-gray-600">{type.name}</div>
                </button>
              ))}
            </div>
            {errors.documentType && <p className="text-red-500 text-xs mt-1">{errors.documentType}</p>}
          </div>

          {/* Linked Reference Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Linked Reference *</label>
              <input
                type="text"
                value={uploadData.linkedReference}
                onChange={(e) => handleInputChange('linkedReference', e.target.value)}
                className={`w-full px-3 py-2 text-black border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.linkedReference ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="e.g., Q-2024-001, PO-2024-001, SO-2024-001"
              />
              {errors.linkedReference && <p className="text-red-500 text-xs mt-1">{errors.linkedReference}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Linked Type *</label>
              <select
                value={uploadData.linkedType}
                onChange={(e) => handleInputChange('linkedType', e.target.value)}
                className={`w-full px-3 py-2 border text-black rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.linkedType ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Select linked type</option>
                {linkedTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              {errors.linkedType && <p className="text-red-500 text-xs mt-1">{errors.linkedType}</p>}
            </div>
          </div>

          {/* Customer/Vendor Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
              <select
                value={uploadData.customerVendorType}
                onChange={(e) => {
                  handleInputChange('customerVendorType', e.target.value);
                  handleInputChange('customerVendor', ''); // Reset selection when type changes
                }}
                className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {customerVendorTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {uploadData.customerVendorType === 'Customer' ? 'Customer' : 
                 uploadData.customerVendorType === 'Vendor' ? 'Vendor' : 'Customer/Vendor'} *
              </label>
              <select
                value={uploadData.customerVendor}
                onChange={(e) => handleInputChange('customerVendor', e.target.value)}
                className={`w-full text-black px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.customerVendor ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Select {uploadData.customerVendorType.toLowerCase()}</option>
                {uploadData.customerVendorType === 'Customer' && customers.map(customer => (
                  <option key={customer.id} value={customer.name}>{customer.name}</option>
                ))}
                {uploadData.customerVendorType === 'Vendor' && vendors.map(vendor => (
                  <option key={vendor.id} value={vendor.name}>{vendor.name}</option>
                ))}
                {uploadData.customerVendorType === 'Both' && [
                  ...customers.map(customer => ({ ...customer, type: 'Customer' })),
                  ...vendors.map(vendor => ({ ...vendor, type: 'Vendor' }))
                ].map(entity => (
                  <option key={`${entity.type}-${entity.id}`} value={entity.name}>
                    {entity.name} ({entity.type})
                  </option>
                ))}
              </select>
              {errors.customerVendor && <p className="text-red-500 text-xs mt-1">{errors.customerVendor}</p>}
            </div>
          </div>

          {/* File Upload */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Upload Files *</label>
            <input
              type="file"
              multiple
              onChange={handleFileUpload}
              className={`w-full px-3 py-2 border text-black rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.files ? 'border-red-500' : 'border-gray-300'
              }`}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.tiff"
            />
            <p className="text-xs text-gray-500 mt-1">
              Supported formats: PDF, DOC, XLS, JPG, PNG, TIFF (Max 10 files, 50MB total)
            </p>
            {errors.files && <p className="text-red-500 text-xs mt-1">{errors.files}</p>}
            
            {uploadData.files.length > 0 && (
              <div className="mt-3 space-y-2">
                {uploadData.files.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-700">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Document Notes</label>
              <textarea
                value={uploadData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                rows={3}
                className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Additional notes about this document..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Compliance Notes</label>
              <textarea
                value={uploadData.complianceNotes}
                onChange={(e) => handleInputChange('complianceNotes', e.target.value)}
                rows={3}
                className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Compliance-related notes or requirements..."
              />
            </div>
          </div>

          {/* Preview */}
          {uploadData.entity && uploadData.documentType && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h4 className="font-medium text-gray-900 mb-3">Upload Preview</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Entity:</span>
                  <span className="ml-2 font-medium">
                    {getEntityInfo(uploadData.entity)?.name}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Document Type:</span>
                  <span className="ml-2 font-medium">
                    {getDocumentTypeInfo(uploadData.documentType)?.name}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Linked Reference:</span>
                  <span className="ml-2 font-medium">{uploadData.linkedReference}</span>
                </div>
                <div>
                  <span className="text-gray-600">Customer/Vendor:</span>
                  <span className="ml-2 font-medium">{uploadData.customerVendor}</span>
                </div>
                <div>
                  <span className="text-gray-600">Files:</span>
                  <span className="ml-2 font-medium">{uploadData.files.length} file(s)</span>
                </div>
              </div>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isUploading}
            className="px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? 'Uploading...' : 'Upload Document'}
          </button>
        </div>
      </div>
    </div>
  );
}
