'use client';

import { useState, useEffect } from 'react';
import { Vendor } from '../../lib/api';

interface CommunicationTemplate {
  id: string;
  name: string;
  type: 'email' | 'whatsapp';
  subject?: string;
  message: string;
  variables: string[];
  isDefault: boolean;
}

interface CommunicationLog {
  id: string;
  vendorId: string;
  method: 'email' | 'whatsapp';
  status: 'sent' | 'delivered' | 'read' | 'failed';
  sentAt: string;
  deliveredAt?: string;
  readAt?: string;
  message: string;
  attachments?: string[];
  rfqReference: string;
  category: string;
}

interface VendorCommunicationSystemProps {
  quotationId: string;
  rfqReference: string;
  vendors: Vendor[];
  categoryVendors: {[key: string]: string[]};
  showModal: boolean;
  setShowModal: (show: boolean) => void;
  onCommunicationSent: (logs: CommunicationLog[]) => void;
}

export default function VendorCommunicationSystem({
  quotationId,
  rfqReference,
  vendors,
  categoryVendors,
  showModal,
  setShowModal,
  onCommunicationSent
}: VendorCommunicationSystemProps) {
  const [activeTab, setActiveTab] = useState<'compose' | 'templates' | 'logs'>('compose');
  const [selectedMethod, setSelectedMethod] = useState<'email' | 'whatsapp'>('email');
  const [selectedVendors, setSelectedVendors] = useState<string[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [customMessage, setCustomMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [communicationLogs, setCommunicationLogs] = useState<CommunicationLog[]>([]);
  const [templates, setTemplates] = useState<CommunicationTemplate[]>([]);

  // Default templates
  const defaultTemplates: CommunicationTemplate[] = [
    {
      id: 'email_rfq_request',
      name: 'RFQ Request Email',
      type: 'email',
      subject: 'Request for Quotation - {rfqReference}',
      message: `Dear {vendorName},

We hope this email finds you well.

We are pleased to invite you to submit a quotation for the following requirements:

RFQ Reference: {rfqReference}
Category: {category}
Validity Period: {validityDays} days
Response Required By: {responseDate}

Please find the detailed RFQ document attached to this email. The document contains:
- Complete item specifications
- Quantity requirements
- Terms and conditions
- Submission guidelines

We request you to provide your best competitive rates along with:
- Lead times for delivery
- Payment terms
- Warranty/guarantee information
- Any additional terms and conditions

Please submit your quotation by {responseDate} to ensure consideration.

For any clarifications, please feel free to contact us.

Thank you for your continued partnership.

Best regards,
Procurement Team
{companyName}
{contactEmail}
{contactPhone}`,
      variables: ['vendorName', 'rfqReference', 'category', 'validityDays', 'responseDate', 'companyName', 'contactEmail', 'contactPhone'],
      isDefault: true
    },
    {
      id: 'whatsapp_rfq_request',
      name: 'RFQ Request WhatsApp',
      type: 'whatsapp',
      message: `🔔 *RFQ Request - {rfqReference}*

Dear {vendorName},

We have a new RFQ for *{category}* items.

📋 *Details:*
• RFQ Ref: {rfqReference}
• Category: {category}
• Response by: {responseDate}

📎 *Document:* RFQ file will be sent separately via email

Please provide your best rates with lead times.

Contact: {contactPhone}
Email: {contactEmail}

Thank you! 🙏`,
      variables: ['vendorName', 'rfqReference', 'category', 'responseDate', 'contactPhone', 'contactEmail'],
      isDefault: true
    },
    {
      id: 'email_follow_up',
      name: 'Follow-up Email',
      type: 'email',
      subject: 'Follow-up: RFQ {rfqReference} - Response Pending',
      message: `Dear {vendorName},

We hope you are doing well.

This is a gentle reminder regarding our RFQ request sent on {sentDate}.

RFQ Reference: {rfqReference}
Category: {category}
Original Response Date: {originalResponseDate}

We have not yet received your quotation and would appreciate your response at the earliest.

If you need any clarifications or require additional time, please let us know.

We value your partnership and look forward to your response.

Best regards,
Procurement Team`,
      variables: ['vendorName', 'rfqReference', 'category', 'sentDate', 'originalResponseDate'],
      isDefault: true
    }
  ];

  useEffect(() => {
    if (showModal) {
      loadTemplates();
      loadCommunicationLogs();
    }
  }, [showModal]);

  const loadTemplates = () => {
    try {
      const stored = localStorage.getItem('communication_templates');
      const customTemplates = stored ? JSON.parse(stored) : [];
      setTemplates([...defaultTemplates, ...customTemplates]);
    } catch (error) {
      console.error('Failed to load templates:', error);
      setTemplates(defaultTemplates);
    }
  };

  const loadCommunicationLogs = () => {
    try {
      const stored = localStorage.getItem(`communication_logs_${quotationId}`);
      if (stored) {
        setCommunicationLogs(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load communication logs:', error);
    }
  };

  const saveCommunicationLog = (log: CommunicationLog) => {
    try {
      const updatedLogs = [...communicationLogs, log];
      setCommunicationLogs(updatedLogs);
      localStorage.setItem(`communication_logs_${quotationId}`, JSON.stringify(updatedLogs));
      onCommunicationSent(updatedLogs);
    } catch (error) {
      console.error('Failed to save communication log:', error);
    }
  };

  const processMessageTemplate = (template: string, vendor: Vendor, category: string) => {
    const variables = {
      vendorName: vendor.name,
      rfqReference,
      category,
      validityDays: '7',
      responseDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      companyName: 'Your Company Name',
      contactEmail: 'procurement@company.com',
      contactPhone: '+92-XXX-XXXXXXX',
      sentDate: new Date().toLocaleDateString(),
      originalResponseDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString()
    };

    let processedMessage = template;
    Object.entries(variables).forEach(([key, value]) => {
      processedMessage = processedMessage.replace(new RegExp(`{${key}}`, 'g'), value);
    });

    return processedMessage;
  };

  const sendCommunication = async () => {
    if (selectedVendors.length === 0) {
      alert('Please select at least one vendor');
      return;
    }

    const template = templates.find(t => t.id === selectedTemplate);
    if (!template && !customMessage) {
      alert('Please select a template or enter a custom message');
      return;
    }

    setIsSending(true);

    try {
      const logs: CommunicationLog[] = [];

      for (const vendorId of selectedVendors) {
        const vendor = vendors.find(v => v.id === vendorId);
        if (!vendor) continue;

        // Find vendor's category
        const vendorCategory = Object.entries(categoryVendors).find(([_, vendorIds]) => 
          vendorIds.includes(vendorId)
        )?.[0] || 'Uncategorized';

        const message = template 
          ? processMessageTemplate(template.message, vendor, vendorCategory)
          : customMessage;

        if (selectedMethod === 'email') {
          // Simulate email sending
          await simulateEmailSend(vendor, message, template?.subject);
        } else {
          // Simulate WhatsApp sending
          await simulateWhatsAppSend(vendor, message);
        }

        const log: CommunicationLog = {
          id: `comm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          vendorId,
          method: selectedMethod,
          status: 'sent',
          sentAt: new Date().toISOString(),
          message,
          rfqReference,
          category: vendorCategory
        };

        logs.push(log);
        saveCommunicationLog(log);
      }

      alert(`Successfully sent ${logs.length} ${selectedMethod} message(s)!`);
      setSelectedVendors([]);
      setCustomMessage('');
      setSelectedTemplate('');
    } catch (error) {
      console.error('Error sending communications:', error);
      alert('Failed to send some messages. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const simulateEmailSend = async (vendor: Vendor, message: string, subject?: string) => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // In real implementation, this would call your email service API
    console.log('Email sent to:', vendor.email, {
      subject: subject?.replace(/{rfqReference}/g, rfqReference),
      message,
      attachments: [`RFQ_${rfqReference}_${vendor.name.replace(/[^a-z0-9]/gi, '_')}.xlsx`]
    });
  };

  const simulateWhatsAppSend = async (vendor: Vendor, message: string) => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // In real implementation, this would call WhatsApp Business API
    console.log('WhatsApp sent to:', vendor.phone, { message });
  };

  // Compose Tab
  const ComposeTab = () => (
    <div className="space-y-6">
      {/* Communication Method */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Communication Method</label>
        <div className="flex space-x-4">
          <label className="flex items-center">
            <input
              type="radio"
              value="email"
              checked={selectedMethod === 'email'}
              onChange={(e) => setSelectedMethod(e.target.value as 'email')}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
            />
            <span className="ml-2 text-sm text-gray-700">📧 Email</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              value="whatsapp"
              checked={selectedMethod === 'whatsapp'}
              onChange={(e) => setSelectedMethod(e.target.value as 'whatsapp')}
              className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300"
            />
            <span className="ml-2 text-sm text-gray-700">📱 WhatsApp</span>
          </label>
        </div>
      </div>

      {/* Vendor Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Select Vendors</label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2">
          {Object.entries(categoryVendors).map(([category, vendorIds]) => (
            <div key={category} className="mb-4">
              <div className="font-medium text-gray-900 text-sm mb-2">{category}</div>
              {vendorIds.map(vendorId => {
                const vendor = vendors.find(v => v.id === vendorId);
                if (!vendor) return null;
                
                return (
                  <label key={vendorId} className="flex items-center space-x-2 p-2 border border-gray-200 rounded hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedVendors.includes(vendorId)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedVendors([...selectedVendors, vendorId]);
                        } else {
                          setSelectedVendors(selectedVendors.filter(id => id !== vendorId));
                        }
                      }}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{vendor.name}</div>
                      <div className="text-xs text-gray-500 truncate">
                        {selectedMethod === 'email' ? vendor.email : vendor.phone}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          ))}
        </div>
        {selectedVendors.length > 0 && (
          <p className="text-sm text-green-600 mt-2">
            ✓ {selectedVendors.length} vendor(s) selected
          </p>
        )}
      </div>

      {/* Template Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Message Template</label>
        <select
          value={selectedTemplate}
          onChange={(e) => setSelectedTemplate(e.target.value)}
          className="w-full text-black p-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Select a template or write custom message</option>
          {templates
            .filter(t => t.type === selectedMethod)
            .map(template => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
        </select>
      </div>

      {/* Message Preview/Custom */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {selectedTemplate ? 'Message Preview' : 'Custom Message'}
        </label>
        <textarea
          value={selectedTemplate 
            ? (templates.find(t => t.id === selectedTemplate)?.message || '')
            : customMessage
          }
          onChange={(e) => {
            if (!selectedTemplate) {
              setCustomMessage(e.target.value);
            }
          }}
          readOnly={!!selectedTemplate}
          rows={12}
          className={`w-full text-black p-3 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
            selectedTemplate ? 'bg-gray-50' : ''
          }`}
          placeholder="Enter your custom message here..."
        />
        {selectedTemplate && (
          <p className="text-xs text-gray-500 mt-1">
            Variables like {'{vendorName}'} and {'{rfqReference}'} will be automatically replaced
          </p>
        )}
      </div>
    </div>
  );

  // Templates Tab
  const TemplatesTab = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Message Templates</h3>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm">
          Create New Template
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.map(template => (
          <div key={template.id} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-gray-900">{template.name}</h4>
              <span className={`px-2 py-1 text-xs rounded ${
                template.type === 'email' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
              }`}>
                {template.type}
              </span>
            </div>
            {template.subject && (
              <p className="text-sm text-gray-600 mb-2">
                <strong>Subject:</strong> {template.subject}
              </p>
            )}
            <p className="text-sm text-gray-600 line-clamp-3">
              {template.message.substring(0, 150)}...
            </p>
            <div className="mt-3 flex space-x-2">
              <button className="text-xs text-blue-600 hover:text-blue-700">Edit</button>
              {!template.isDefault && (
                <button className="text-xs text-red-600 hover:text-red-700">Delete</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Logs Tab
  const LogsTab = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Communication History</h3>
      
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sent</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {communicationLogs.map(log => {
                const vendor = vendors.find(v => v.id === log.vendorId);
                
                return (
                  <tr key={log.id}>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{vendor?.name}</div>
                      <div className="text-xs text-gray-500">
                        {log.method === 'email' ? vendor?.email : vendor?.phone}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        log.method === 'email' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {log.method === 'email' ? '📧' : '📱'} {log.method}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.category}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(log.sentAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        log.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                        log.status === 'delivered' ? 'bg-yellow-100 text-yellow-800' :
                        log.status === 'read' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                      <button className="text-indigo-600 hover:text-indigo-900">
                        View Message
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

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-green-700 px-6 py-4">
          <h3 className="text-xl font-bold text-white">Vendor Communication System</h3>
          <p className="text-blue-100 text-sm mt-1">Send RFQ requests via Email and WhatsApp</p>
        </div>
        
        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'compose', label: 'Compose', icon: '✍️' },
              { id: 'templates', label: 'Templates', icon: '📝' },
              { id: 'logs', label: 'History', icon: '📋' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </nav>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {activeTab === 'compose' && <ComposeTab />}
          {activeTab === 'templates' && <TemplatesTab />}
          {activeTab === 'logs' && <LogsTab />}
        </div>

        <div className="bg-gray-50 px-6 py-4 flex justify-between items-center border-t border-gray-200">
          <div className="text-sm text-gray-600">
            RFQ Reference: <span className="font-medium">{rfqReference}</span>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowModal(false)}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              disabled={isSending}
            >
              Close
            </button>
            {activeTab === 'compose' && (
              <button
                onClick={sendCommunication}
                disabled={isSending || selectedVendors.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
              >
                {isSending ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Sending...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    Send Messages
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
