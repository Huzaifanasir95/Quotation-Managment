'use client';

import { useState } from 'react';

interface SearchQuotationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Quotation {
  id: string;
  number: string;
  customer: string;
  amount: number;
  status: string;
  date: string;
  validUntil: string;
  items: Array<{
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
  }>;
}

export default function SearchQuotationsModal({ isOpen, onClose }: SearchQuotationsModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [customerFilter, setCustomerFilter] = useState('');

  // Mock data for quotations
  const quotations: Quotation[] = [
    {
      id: '1',
      number: 'Q-2024-001',
      customer: 'ABC Corporation',
      amount: 2500,
      status: 'Pending',
      date: '2024-01-15',
      validUntil: '2024-12-31',
      items: [
        { id: '1', description: 'Laptop Dell XPS 13', quantity: 2, unitPrice: 1200 },
        { id: '2', description: 'Wireless Mouse', quantity: 2, unitPrice: 50 }
      ]
    },
    {
      id: '2',
      number: 'Q-2024-002',
      customer: 'XYZ Ltd',
      amount: 1800,
      status: 'Accepted',
      date: '2024-01-18',
      validUntil: '2024-12-15',
      items: [
        { id: '3', description: 'Monitor 27" 4K', quantity: 1, unitPrice: 800 },
        { id: '4', description: 'USB-C Hub', quantity: 2, unitPrice: 45 }
      ]
    },
    {
      id: '3',
      number: 'Q-2024-003',
      customer: 'Tech Solutions Inc',
      amount: 4200,
      status: 'Draft',
      date: '2024-01-20',
      validUntil: '2024-11-30',
      items: [
        { id: '7', description: 'Server Rack', quantity: 1, unitPrice: 2500 },
        { id: '8', description: 'Network Switch', quantity: 1, unitPrice: 800 }
      ]
    },
    {
      id: '4',
      number: 'Q-2024-004',
      customer: 'Global Industries',
      amount: 3200,
      status: 'Rejected',
      date: '2024-01-22',
      validUntil: '2024-12-20',
      items: [
        { id: '9', description: 'Workstation', quantity: 2, unitPrice: 1600 }
      ]
    },
    {
      id: '5',
      number: 'Q-2024-005',
      customer: 'Innovation Corp',
      amount: 1500,
      status: 'Pending',
      date: '2024-01-25',
      validUntil: '2024-12-25',
      items: [
        { id: '10', description: 'Software License', quantity: 1, unitPrice: 1500 }
      ]
    }
  ];

  const statuses = ['All', 'Draft', 'Pending', 'Accepted', 'Rejected', 'Expired'];
  const customers = ['All', ...Array.from(new Set(quotations.map(q => q.customer)))];

  const filteredQuotations = quotations.filter(quotation => {
    const matchesSearch = quotation.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         quotation.customer.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'All' || quotation.status === statusFilter;
    
    const matchesCustomer = customerFilter === 'All' || quotation.customer === customerFilter;
    
    const matchesDateRange = (!dateRange.from || quotation.date >= dateRange.from) &&
                            (!dateRange.to || quotation.date <= dateRange.to);
    
    return matchesSearch && matchesStatus && matchesCustomer && matchesDateRange;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Accepted': return 'bg-green-100 text-green-800';
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      case 'Draft': return 'bg-gray-100 text-gray-800';
      case 'Rejected': return 'bg-red-100 text-red-800';
      case 'Expired': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleViewQuotation = (quotation: Quotation) => {
    console.log('Viewing quotation:', quotation);
    // Here you would navigate to the quotation detail page
    alert(`Viewing quotation ${quotation.number}`);
  };

  const handleEditQuotation = (quotation: Quotation) => {
    console.log('Editing quotation:', quotation);
    // Here you would open the edit quotation modal
    alert(`Editing quotation ${quotation.number}`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Search Quotations</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        {/* Search Filters */}
        <div className="p-6 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by number or customer..."
                className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {statuses.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Customer</label>
              <select
                value={customerFilter}
                onChange={(e) => setCustomerFilter(e.target.value)}
                className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {customers.map(customer => (
                  <option key={customer} value={customer}>{customer}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={dateRange.from}
                  onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                  className="px-2 text-black py-2 border border-gray-300 rounded text-sm"
                />
                <input
                  type="date"
                  value={dateRange.to}
                  onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                  className="px-2 text-black py-2 border border-gray-300 rounded text-sm"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Found {filteredQuotations.length} quotation(s)
            </p>
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('');
                setDateRange({ from: '', to: '' });
                setCustomerFilter('');
              }}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="p-6">
          {filteredQuotations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p>No quotations found matching your criteria.</p>
              <p className="text-sm text-gray-400 mt-1">Try adjusting your search filters.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredQuotations.map((quotation) => (
                <div key={quotation.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-4">
                      <h3 className="text-lg font-semibold text-gray-900">{quotation.number}</h3>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(quotation.status)}`}>
                        {quotation.status}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-blue-600">${quotation.amount.toLocaleString()}</p>
                      <p className="text-sm text-gray-500">{quotation.date}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                    <div>
                      <p className="text-sm text-gray-500">Customer</p>
                      <p className="font-medium text-gray-900">{quotation.customer}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Valid Until</p>
                      <p className="font-medium text-gray-900">{quotation.validUntil}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Items</p>
                      <p className="font-medium text-gray-900">{quotation.items.length} item(s)</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                    <div className="text-sm text-gray-500">
                      {quotation.items.map((item, index) => (
                        <span key={item.id}>
                          {item.description} (x{item.quantity})
                          {index < quotation.items.length - 1 ? ', ' : ''}
                        </span>
                      ))}
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleViewQuotation(quotation)}
                        className="px-3 py-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleEditQuotation(quotation)}
                        className="px-3 py-1 text-sm text-green-600 hover:text-green-700 font-medium"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end p-6 border-t border-gray-200 bg-gray-50">
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
