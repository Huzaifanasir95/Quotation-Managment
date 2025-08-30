'use client';

import { useState } from 'react';
import AppLayout from '../components/AppLayout';
import UploadTradeDocumentModal from '../components/import-export/UploadTradeDocumentModal';
import DocumentDetailsModal from '../components/import-export/DocumentDetailsModal';

export default function ImportExportPage() {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDocumentDetails, setShowDocumentDetails] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  
  // Filters state
  const [filters, setFilters] = useState({
    entity: 'All',
    documentType: 'All',
    customerVendor: 'All',
    dateFrom: '',
    dateTo: '',
    linkedReference: ''
  });

  // Mock data for business entities
  const businessEntities = [
    { id: 'entity-001', name: 'QMS Trading Co.', type: 'Trading Company', country: 'Pakistan' },
    { id: 'entity-002', name: 'QMS Manufacturing Ltd.', type: 'Manufacturing', country: 'Pakistan' },
    { id: 'entity-003', name: 'QMS International LLC', type: 'International Trade', country: 'UAE' },
    { id: 'entity-004', name: 'QMS Export Solutions', type: 'Export Services', country: 'Pakistan' },
    { id: 'entity-005', name: 'QMS Import Division', type: 'Import Services', country: 'Pakistan' }
  ];

  // Mock data for trade documents
  const tradeDocuments = [
    {
      id: 'DOC-2024-001',
      entity: 'QMS Trading Co.',
      entityId: 'entity-001',
      documentType: 'Bill of Lading',
      documentTypeCode: 'BL',
      linkedReference: 'Q-2024-001',
      linkedType: 'Quotation',
      customerVendor: 'ABC Corp',
      customerVendorType: 'Customer',
      dateUploaded: '2024-01-20',
      fileSize: '2.4 MB',
      fileType: 'PDF',
      status: 'Active',
      complianceStatus: 'Compliant',
      notes: 'Original BL for shipment ABC-001',
      uploadedBy: 'Trade Team',
      lastModified: '2024-01-20 14:30'
    },
    {
      id: 'DOC-2024-002',
      entity: 'QMS Manufacturing Ltd.',
      entityId: 'entity-002',
      documentType: 'Customs Form',
      documentTypeCode: 'CF',
      linkedReference: 'PO-2024-001',
      linkedType: 'Purchase Order',
      customerVendor: 'Tech Supplies Inc',
      customerVendorType: 'Vendor',
      dateUploaded: '2024-01-19',
      fileSize: '1.8 MB',
      fileType: 'PDF',
      status: 'Active',
      complianceStatus: 'Pending Review',
      notes: 'Customs declaration for machinery import',
      uploadedBy: 'Procurement Team',
      lastModified: '2024-01-19 16:45'
    }
  ];

  const documentTypes = [
    { code: 'BL', name: 'Bill of Lading', description: 'Shipping document for cargo' },
    { code: 'CF', name: 'Customs Form', description: 'Customs declaration and clearance' },
    { code: 'CI', name: 'Commercial Invoice', description: 'Commercial transaction invoice' },
    { code: 'PL', name: 'Packing List', description: 'Detailed packing information' },
    { code: 'CO', name: 'Certificate of Origin', description: 'Country of origin certificate' }
  ];

  const customersVendors = ['All', ...Array.from(new Set(tradeDocuments.map(doc => doc.customerVendor)))];
  const entities = ['All', ...Array.from(new Set(tradeDocuments.map(doc => doc.entity)))];
  const documentTypeCodes = ['All', ...Array.from(new Set(tradeDocuments.map(doc => doc.documentTypeCode)))];

  const filteredDocuments = tradeDocuments.filter(doc => {
    const matchesEntity = filters.entity === 'All' || doc.entity === filters.entity;
    const matchesDocumentType = filters.documentType === 'All' || doc.documentTypeCode === filters.documentType;
    const matchesCustomerVendor = filters.customerVendor === 'All' || doc.customerVendor === filters.customerVendor;
    const matchesDateFrom = !filters.dateFrom || doc.dateUploaded >= filters.dateFrom;
    const matchesDateTo = !filters.dateTo || doc.dateUploaded <= filters.dateTo;
    const matchesLinkedReference = !filters.linkedReference || 
      doc.linkedReference.toLowerCase().includes(filters.linkedReference.toLowerCase());
    
    return matchesEntity && matchesDocumentType && matchesCustomerVendor && 
           matchesDateFrom && matchesDateTo && matchesLinkedReference;
  });

  const getDocumentTypeColor = (type: string) => {
    switch (type) {
      case 'BL': return 'bg-blue-100 text-blue-800';
      case 'CF': return 'bg-green-100 text-green-800';
      case 'CI': return 'bg-purple-100 text-purple-800';
      case 'PL': return 'bg-orange-100 text-orange-800';
      case 'CO': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getComplianceStatusColor = (status: string) => {
    switch (status) {
      case 'Compliant': return 'bg-green-100 text-green-800';
      case 'Pending Review': return 'bg-yellow-100 text-yellow-800';
      case 'Under Review': return 'bg-blue-100 text-blue-800';
      case 'Non-Compliant': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800';
      case 'Archived': return 'bg-gray-100 text-gray-800';
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const exportToExcel = () => {
    const csvContent = [
      ['Doc ID', 'Entity', 'Type', 'Linked Reference', 'Customer/Vendor', 'Date Uploaded', 'Status', 'Compliance Status'],
      ...filteredDocuments.map(doc => [
        doc.id,
        doc.entity,
        doc.documentType,
        doc.linkedReference,
        doc.customerVendor,
        doc.dateUploaded,
        doc.status,
        doc.complianceStatus
      ])
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
      entity: 'All',
      documentType: 'All',
      customerVendor: 'All',
      dateFrom: '',
      dateTo: '',
      linkedReference: ''
    });
  };

  const handleViewDocument = (document: any) => {
    setSelectedDocument(document);
    setShowDocumentDetails(true);
  };

  const totalDocuments = filteredDocuments.length;
  const totalEntities = businessEntities.length;
  const totalCompliant = filteredDocuments.filter(doc => doc.complianceStatus === 'Compliant').length;
  const totalPendingReview = filteredDocuments.filter(doc => doc.complianceStatus === 'Pending Review').length;

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
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
              className="flex items-center justify-center p-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Upload Trade Document
            </button>

            <button
              onClick={exportToExcel}
              className="flex items-center justify-center p-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export to Excel/CSV
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

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Business Entity</label>
              <select
                value={filters.entity}
                onChange={(e) => setFilters({ ...filters, entity: e.target.value })}
                className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {entities.map(entity => (
                  <option key={entity} value={entity}>{entity}</option>
                ))}
              </select>
            </div>

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
              Found {filteredDocuments.length} document(s) out of {tradeDocuments.length} total
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Linked Reference</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer/Vendor</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Uploaded</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredDocuments.map((document) => (
                    <tr key={document.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-blue-600 hover:text-blue-800 cursor-pointer">
                          {document.id}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{document.entity}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getDocumentTypeColor(document.documentTypeCode)}`}>
                          {document.documentTypeCode}
                        </span>
                        <div className="text-xs text-gray-500 mt-1">{document.documentType}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          <span className="text-gray-900">{document.linkedReference}</span>
                          <div className="text-xs text-gray-500">{document.linkedType}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          <span className="text-gray-900">{document.customerVendor}</span>
                          <div className="text-xs text-gray-500">{document.customerVendorType}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{document.dateUploaded}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(document.status)}`}>
                            {document.status}
                          </span>
                          <div>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getComplianceStatusColor(document.complianceStatus)}`}>
                              {document.complianceStatus}
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
                        <button className="text-green-600 hover:text-green-700 font-medium">
                          Download
                        </button>
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
      <UploadTradeDocumentModal isOpen={showUploadModal} onClose={() => setShowUploadModal(false)} />
      <DocumentDetailsModal isOpen={showDocumentDetails} onClose={() => setShowDocumentDetails(false)} document={selectedDocument} />
    </AppLayout>
  );
}
