'use client';

import { useState, useEffect } from 'react';
import { apiClient, DocumentAttachment } from '@/app/lib/api';
import AppLayout from '../components/AppLayout';
import UploadTradeDocumentModal from '../components/import-export/UploadTradeDocumentModal';
import DocumentDetailsModal from '../components/import-export/DocumentDetailsModal';

export default function ImportExportPage() {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDocumentDetails, setShowDocumentDetails] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<DocumentAttachment | null>(null);
  const [documents, setDocuments] = useState<DocumentAttachment[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [businessEntities, setBusinessEntities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters state
  const [filters, setFilters] = useState({
    documentType: 'All',
    customerVendor: 'All',
    dateFrom: '',
    dateTo: '',
    linkedReference: ''
  });

  // Data fetching
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Refresh token before making API calls
        await apiClient.refreshToken();

        // Fetch customers, vendors, business entities, and documents in parallel
        const [customersResponse, vendorsResponse, businessEntitiesResponse] = await Promise.all([
          apiClient.getCustomers({ limit: 1000 }),
          apiClient.getVendors({ limit: 1000 }),
          apiClient.getBusinessEntities({ limit: 1000 })
        ]);

        console.log('Business entities response:', {
          response: businessEntitiesResponse,
          hasData: !!businessEntitiesResponse?.data,
          dataType: typeof businessEntitiesResponse?.data,
          isArray: Array.isArray(businessEntitiesResponse?.data),
          dataLength: businessEntitiesResponse?.data?.length
        });

        const customersData = Array.isArray(customersResponse?.data?.customers) ? customersResponse.data.customers :
                             Array.isArray(customersResponse?.data) ? customersResponse.data : 
                             Array.isArray(customersResponse) ? customersResponse : [];
        
        const vendorsData = Array.isArray(vendorsResponse?.data?.vendors) ? vendorsResponse.data.vendors :
                           Array.isArray(vendorsResponse?.data) ? vendorsResponse.data : 
                           Array.isArray(vendorsResponse) ? vendorsResponse : [];
        
        const businessEntitiesData = Array.isArray(businessEntitiesResponse?.data) ? businessEntitiesResponse.data : 
                                    Array.isArray(businessEntitiesResponse?.data?.entities) ? businessEntitiesResponse.data.entities :
                                    Array.isArray(businessEntitiesResponse) ? businessEntitiesResponse : [];

        setCustomers(customersData);
        setVendors(vendorsData);
        setBusinessEntities(businessEntitiesData);
        
        console.log('Data counts:', {
          customersCount: customersData.length,
          vendorsCount: vendorsData.length,
          businessEntitiesCount: businessEntitiesData.length
        });

        // Fetch all trade documents
        await apiClient.refreshToken();
        const documentsResponse = await apiClient.getDocuments();
        const documentsData = Array.isArray(documentsResponse?.data) ? documentsResponse.data : [];
        setDocuments(documentsData);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const refreshDocuments = async () => {
    try {
      // Fetch all trade documents
      await apiClient.refreshToken();
      const documentsResponse = await apiClient.getDocuments();
      const documentsData = Array.isArray(documentsResponse?.data) ? documentsResponse.data : [];
      setDocuments(documentsData);
    } catch (err) {
      console.error('Error refreshing documents:', err);
    }
  };

  const documentTypes = [
    { code: 'BL', name: 'Bill of Lading', description: 'Shipping document for cargo' },
    { code: 'CF', name: 'Customs Form', description: 'Customs declaration and clearance' },
    { code: 'CI', name: 'Commercial Invoice', description: 'Commercial transaction invoice' },
    { code: 'PL', name: 'Packing List', description: 'Detailed packing information' },
    { code: 'CO', name: 'Certificate of Origin', description: 'Country of origin certificate' }
  ];

  // Generate filter options from real data
  const customersVendors = [
    'All', 
    ...Array.from(new Set([
      ...(Array.isArray(customers) ? customers.map(c => c.name) : []),
      ...(Array.isArray(vendors) ? vendors.map(v => v.name) : [])
    ]))
  ];
  
  const documentTypeCodes = ['All', ...Array.from(new Set((Array.isArray(documents) ? documents.map(doc => doc.document_type) : [])))];

  const filteredDocuments = (Array.isArray(documents) ? documents : []).filter(doc => {
    const customerVendorName = doc.customers?.name || doc.vendors?.name || '';
    
    const matchesDocumentType = filters.documentType === 'All' || doc.document_type === filters.documentType;
    const matchesCustomerVendor = filters.customerVendor === 'All' || customerVendorName === filters.customerVendor;
    const matchesDateFrom = !filters.dateFrom || (doc.uploaded_at && doc.uploaded_at.split('T')[0] >= filters.dateFrom);
    const matchesDateTo = !filters.dateTo || (doc.uploaded_at && doc.uploaded_at.split('T')[0] <= filters.dateTo);
    const matchesLinkedReference = !filters.linkedReference || 
      (doc.linked_reference_number && doc.linked_reference_number.toLowerCase().includes(filters.linkedReference.toLowerCase()));
    
    return matchesDocumentType && matchesCustomerVendor && 
           matchesDateFrom && matchesDateTo && matchesLinkedReference;
  });

  const getDocumentTypeColor = (type: string | null | undefined) => {
    switch (type) {
      case 'bill_of_lading': return 'bg-blue-100 text-blue-800';
      case 'customs_form': return 'bg-green-100 text-green-800';
      case 'commercial_invoice': return 'bg-purple-100 text-purple-800';
      case 'packing_list': return 'bg-orange-100 text-orange-800';
      case 'certificate_of_origin': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getComplianceStatusColor = (status: string | null | undefined) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getOCRStatusColor = (status: string | null | undefined) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const exportToExcel = () => {
    const csvContent = [
      ['Doc ID', 'Type', 'Linked Reference', 'Customer/Vendor', 'Date Uploaded', 'Compliance Status', 'OCR Status'],
      ...filteredDocuments.map((doc: DocumentAttachment) => {
        const customerVendorName = doc.customers?.name || doc.vendors?.name || '';
        return [
          doc.id,
          doc.document_type,
          doc.linked_reference_number || '',
          customerVendorName,
          doc.uploaded_at ? doc.uploaded_at.split('T')[0] : '',
          doc.compliance_status,
          doc.ocr_status
        ];
      })
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trade_documents_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    alert('Export completed successfully!');
  };

  const clearFilters = () => {
    setFilters({
      documentType: 'All',
      customerVendor: 'All',
      dateFrom: '',
      dateTo: '',
      linkedReference: ''
    });
  };

  const handleViewDocument = (document: DocumentAttachment) => {
    setSelectedDocument(document);
    setShowDocumentDetails(true);
  };

  const handleDownload = async (documentId: string) => {
    try {
      const blob = await apiClient.downloadDocument(documentId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `document_${documentId}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading document:', err);
      alert('Failed to download document. Please try again.');
    }
  };

  const totalDocuments = filteredDocuments.length;
  const totalEntities = businessEntities.length;
  const totalCompliant = filteredDocuments.filter((doc: DocumentAttachment) => doc.compliance_status === 'approved').length;
  const totalPendingReview = filteredDocuments.filter((doc: DocumentAttachment) => doc.compliance_status === 'pending').length;

  if (loading) {
    return (
      <AppLayout>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-lg text-gray-600">Loading documents...</span>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <div className="text-red-600 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-red-800 mb-2">Error Loading Data</h3>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Import & Export Management</h1>
          <p className="text-gray-600 mt-2">Manage trade documents, compliance status, and business entities</p>
        </div>

        {/* KPI Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Documents</p>
                <p className="text-2xl font-bold text-blue-600">{totalDocuments}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Business Entities</p>
                <p className="text-2xl font-bold text-green-600">{totalEntities}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Compliant</p>
                <p className="text-2xl font-bold text-purple-600">{totalCompliant}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending Review</p>
                <p className="text-2xl font-bold text-yellow-600">{totalPendingReview}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center justify-center p-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700 border border-gray-500 transition-colors duration-200"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Upload Trade Document
            </button>

            <button
              onClick={exportToExcel}
              className="flex items-center justify-center p-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700 border border-gray-500 transition-colors duration-200"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export to Excel/CSV
            </button>

            <button
              onClick={clearFilters}
              className="flex items-center justify-center p-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700 border border-gray-500 transition-colors duration-200"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Clear Filters
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Document Type</label>
              <select
                value={filters.documentType}
                onChange={(e) => setFilters({ ...filters, documentType: e.target.value })}
                className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {documentTypeCodes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Customer/Vendor</label>
              <select
                value={filters.customerVendor}
                onChange={(e) => setFilters({ ...filters, customerVendor: e.target.value })}
                className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {customersVendors.map(cv => (
                  <option key={cv} value={cv}>{cv}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date From</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date To</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Linked Reference</label>
              <input
                type="text"
                value={filters.linkedReference}
                onChange={(e) => setFilters({ ...filters, linkedReference: e.target.value })}
                className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Search by Q, PO, SO, INV..."
              />
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Found {filteredDocuments.length} document(s) out of {documents.length} total
            </p>
          </div>
        </div>

        {/* Documents Table */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Trade Documents</h3>
          </div>

          <div className="overflow-x-auto">
            {filteredDocuments.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No trade documents found.</p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Doc ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Linked Reference</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer/Vendor</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Uploaded</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredDocuments.map((document: DocumentAttachment) => {
                    const customerVendorName = document.customers?.name || document.vendors?.name || '';
                    const customerVendorType = document.customer_id ? 'Customer' : document.vendor_id ? 'Vendor' : '';

                    return (
                      <tr key={document.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-blue-600 hover:text-blue-800 cursor-pointer">
                            {document.id.slice(0, 8)}...
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getDocumentTypeColor(document.document_type)}`}>
                            {(document.document_type || 'Unknown').replace('_', ' ').toUpperCase()}
                          </span>
                          <div className="text-xs text-gray-500 mt-1">{document.file_name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm">
                            <span className="text-gray-900">{document.linked_reference_number || 'N/A'}</span>
                            <div className="text-xs text-gray-500">{document.linked_reference_type || ''}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm">
                            <span className="text-gray-900">{customerVendorName || 'N/A'}</span>
                            <div className="text-xs text-gray-500">{customerVendorType}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{document.uploaded_at ? document.uploaded_at.split('T')[0] : 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="space-y-1">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getComplianceStatusColor(document.compliance_status)}`}>
                              {document.compliance_status || 'Pending'}
                            </span>
                            <div>
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getOCRStatusColor(document.ocr_status)}`}>
                                OCR: {document.ocr_status || 'Pending'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <button 
                            onClick={() => handleViewDocument(document)}
                            className="text-blue-600 hover:text-blue-700 font-medium mr-3"
                          >
                            View
                          </button>
                          <button 
                            onClick={() => handleDownload(document.id)}
                            className="text-green-600 hover:text-green-700 font-medium"
                          >
                            Download
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <UploadTradeDocumentModal 
        isOpen={showUploadModal} 
        onClose={() => setShowUploadModal(false)}
        onUploadSuccess={refreshDocuments}
        businessEntities={businessEntities}
        customers={customers}
        vendors={vendors}
      />
      <DocumentDetailsModal 
        isOpen={showDocumentDetails} 
        onClose={() => setShowDocumentDetails(false)} 
        document={selectedDocument}
        onDocumentUpdate={refreshDocuments}
      />
    </AppLayout>
  );
}
