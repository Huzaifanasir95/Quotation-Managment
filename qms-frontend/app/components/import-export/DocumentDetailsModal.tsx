'use client';

import { useState } from 'react';

interface DocumentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: any;
}

export default function DocumentDetailsModal({ isOpen, onClose, document }: DocumentDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'files' | 'compliance' | 'audit'>('overview');

  if (!isOpen || !document) return null;

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

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📋' },
    { id: 'files', label: 'Files', icon: '📁' },
    { id: 'compliance', label: 'Compliance', icon: '✅' },
    { id: 'audit', label: 'Audit Trail', icon: '📝' }
  ];

  const formatFileSize = (bytes: string) => {
    return bytes; // Mock data already has formatted size
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType.toLowerCase()) {
      case 'pdf': return '📄';
      case 'doc':
      case 'docx': return '📝';
      case 'xls':
      case 'xlsx': return '📊';
      case 'jpg':
      case 'jpeg': return '🖼️';
      case 'png': return '🖼️';
      case 'tiff': return '🖼️';
      default: return '📄';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Document Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        {/* Document Header */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{document.id}</h3>
              <p className="text-sm text-gray-600">{document.documentType}</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">Uploaded</div>
              <div className="text-lg font-medium text-gray-900">{document.dateUploaded}</div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex space-x-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                  activeTab === tab.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Document Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Document ID:</span>
                      <span className="font-medium">{document.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Type:</span>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getDocumentTypeColor(document.documentTypeCode)}`}>
                        {document.documentTypeCode}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(document.status)}`}>
                        {document.status}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Compliance:</span>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getComplianceStatusColor(document.complianceStatus)}`}>
                        {document.complianceStatus}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Business Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Entity:</span>
                      <span className="font-medium">{document.entity}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Linked Reference:</span>
                      <span className="font-medium text-blue-600">{document.linkedReference}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Linked Type:</span>
                      <span className="font-medium">{document.linkedType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Customer/Vendor:</span>
                      <span className="font-medium">{document.customerVendor}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Additional Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                    <p className="text-sm text-gray-900">{document.notes || 'No notes available'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Uploaded By</label>
                    <p className="text-sm text-gray-900">{document.uploadedBy}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Files Tab */}
          {activeTab === 'files' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-3">Document Files</h4>
                <p className="text-sm text-blue-800">
                  All uploaded files for this trade document. You can view, download, or manage these files.
                </p>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h4 className="font-medium text-gray-900">File List</h4>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {/* Mock file data - in real app, this would come from the document object */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{getFileIcon('PDF')}</span>
                        <div>
                          <div className="font-medium text-gray-900">Document_001.pdf</div>
                          <div className="text-sm text-gray-600">PDF • {document.fileSize}</div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors duration-200">
                          View
                        </button>
                        <button className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors duration-200">
                          Download
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{getFileIcon('DOC')}</span>
                        <div>
                          <div className="font-medium text-gray-900">Supporting_Doc.docx</div>
                          <div className="text-sm text-gray-600">DOCX • 1.2 MB</div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors duration-200">
                          View
                        </button>
                        <button className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors duration-200">
                          Download
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="font-medium text-gray-900 mb-4">File Management</h4>
                <div className="flex space-x-3">
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200">
                    📁 Add New File
                  </button>
                  <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200">
                    📤 Bulk Download
                  </button>
                  <button className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200">
                    🔍 File History
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Compliance Tab */}
          {activeTab === 'compliance' && (
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-medium text-green-900 mb-3">Compliance Information</h4>
                <p className="text-sm text-green-800">
                  Track compliance status, requirements, and any issues that need attention.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="font-medium text-gray-900 mb-4">Current Status</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Compliance Status:</span>
                      <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getComplianceStatusColor(document.complianceStatus)}`}>
                        {document.complianceStatus}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Last Review:</span>
                      <span className="text-sm text-gray-900">
                        {document.complianceStatus === 'Compliant' ? '2 days ago' : 
                         document.complianceStatus === 'Pending Review' ? 'Not reviewed' : '1 week ago'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Next Review:</span>
                      <span className="text-sm text-gray-900">
                        {document.complianceStatus === 'Compliant' ? 'In 30 days' : 
                         document.complianceStatus === 'Pending Review' ? 'Overdue' : 'In 7 days'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="font-medium text-gray-900 mb-4">Compliance Requirements</h4>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-green-600">✓</span>
                      <span className="text-sm text-gray-700">Document authenticity verified</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-green-600">✓</span>
                      <span className="text-sm text-gray-700">Required fields completed</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-yellow-600">⚠</span>
                      <span className="text-sm text-gray-700">Tax calculation review pending</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-red-600">✗</span>
                      <span className="text-sm text-gray-700">FBR sync validation required</span>
                    </div>
                  </div>
                </div>
              </div>

              {document.complianceStatus === 'Pending Review' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-medium text-yellow-900 mb-3">Review Required</h4>
                  <div className="space-y-2 text-sm text-yellow-800">
                    <p>This document requires compliance review before it can be marked as compliant.</p>
                    <p><strong>Action Required:</strong> Review document details and verify all requirements are met.</p>
                  </div>
                </div>
              )}

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="font-medium text-gray-900 mb-4">Compliance Actions</h4>
                <div className="flex space-x-3">
                  <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200">
                    ✅ Mark Compliant
                  </button>
                  <button className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors duration-200">
                    ⚠️ Flag Issues
                  </button>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200">
                    📋 Review Checklist
                  </button>
                  <button className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200">
                    📊 Compliance Report
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Audit Trail Tab */}
          {activeTab === 'audit' && (
            <div className="space-y-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-medium text-yellow-900 mb-3">Audit Trail</h4>
                <p className="text-sm text-yellow-800">
                  Complete history of all changes and actions performed on this document.
                </p>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h4 className="font-medium text-gray-900">Activity History</h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            Created
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{document.uploadedBy}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{document.dateUploaded}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">Initial document upload</div>
                        </td>
                      </tr>
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            Modified
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">Trade Team</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{document.lastModified}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">Document details updated</div>
                        </td>
                      </tr>
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            Status Changed
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">Compliance Team</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">2024-01-21 10:30</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">Status changed to Pending Review</div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="font-medium text-gray-900 mb-4">Audit Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Created By</label>
                    <p className="text-sm text-gray-900">{document.uploadedBy}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Created Date</label>
                    <p className="text-sm text-gray-900">{document.dateUploaded}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Last Modified</label>
                    <p className="text-sm text-gray-900">{document.lastModified}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Total Changes</label>
                    <p className="text-sm text-gray-900">3</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
