const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

// API utility functions
class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    // Get token from localStorage if available
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
  }

  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }

  refreshToken() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Network error' }));
      console.error('API Error:', {
        url,
        status: response.status,
        statusText: response.statusText,
        error,
        requestBody: options.body
      });
      throw new Error(error.details ? JSON.stringify(error.details) : error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Auth methods
  async login(email: string, password: string) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    if (response.success && response.data.token) {
      this.setToken(response.data.token);
    }
    
    return response;
  }

  async register(userData: any) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async getProfile() {
    return this.request('/auth/profile');
  }

  // Sales methods
  async getSalesDashboard() {
    return this.request('/sales/dashboard');
  }

  async getQuotationTrends() {
    return this.request('/sales/quotation-trends');
  }

  async getSalesCustomers(params?: { page?: number; limit?: number; search?: string }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    
    const endpoint = `/sales/customers${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.request(endpoint);
  }

  // Customer methods
  async getCustomers(params?: { page?: number; limit?: number; search?: string }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    
    const endpoint = `/customers${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.request(endpoint);
  }

  async createCustomer(customerData: any) {
    return this.request('/customers', {
      method: 'POST',
      body: JSON.stringify(customerData),
    });
  }

  async updateCustomer(id: string, customerData: any) {
    return this.request(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(customerData),
    });
  }

  async deleteCustomer(id: string) {
    return this.request(`/customers/${id}`, {
      method: 'DELETE',
    });
  }

  // Quotation methods
  async getQuotations(params?: { page?: number; limit?: number; search?: string; status?: string }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);
    
    const endpoint = `/quotations${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.request(endpoint);
  }

  async createQuotation(quotationData: any) {
    return this.request('/quotations', {
      method: 'POST',
      body: JSON.stringify(quotationData),
    });
  }

  async updateQuotationStatus(id: string, status: string) {
    return this.request(`/quotations/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async convertQuoteToOrder(orderData: any) {
    return this.request('/orders/convert-quote', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  }

  // Purchase Order methods
  async getPurchaseOrders(params?: { page?: number; limit?: number; search?: string; status?: string; vendor_id?: string }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.vendor_id) queryParams.append('vendor_id', params.vendor_id);
    
    const endpoint = `/purchase-orders${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.request(endpoint);
  }

  async getPurchaseOrderById(id: string) {
    return this.request(`/purchase-orders/${id}`);
  }

  async createPurchaseOrder(poData: any) {
    return this.request('/purchase-orders', {
      method: 'POST',
      body: JSON.stringify(poData),
    });
  }

  async updatePurchaseOrderStatus(id: string, status: string) {
    return this.request(`/purchase-orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async updatePurchaseOrder(id: string, poData: any) {
    return this.request(`/purchase-orders/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(poData),
    });
  }

  // Vendor methods
  async getVendors(params?: { page?: number; limit?: number; search?: string }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    
    const endpoint = `/vendors${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.request(endpoint);
  }

  async createVendor(vendorData: any) {
    return this.request('/vendors', {
      method: 'POST',
      body: JSON.stringify(vendorData),
    });
  }

  async updateVendor(id: string, vendorData: any) {
    return this.request(`/vendors/${id}`, {
      method: 'PUT',
      body: JSON.stringify(vendorData),
    });
  }

  async deleteVendor(id: string) {
    return this.request(`/vendors/${id}`, {
      method: 'DELETE',
    });
  }

  async updateVendorStatus(id: string, status: string) {
    return this.request(`/vendors/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  // Vendor Bills methods
  async getVendorBills(params?: { page?: number; limit?: number; search?: string; status?: string; vendor_id?: string; purchase_order_id?: string }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.vendor_id) queryParams.append('vendor_id', params.vendor_id);
    if (params?.purchase_order_id) queryParams.append('purchase_order_id', params.purchase_order_id);

    const endpoint = `/vendor-bills${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.request(endpoint);
  }

  async getVendorBillById(id: string) {
    return this.request(`/vendor-bills/${id}`);
  }

  async createVendorBill(billData: any) {
    return this.request('/vendor-bills', {
      method: 'POST',
      body: JSON.stringify(billData),
    });
  }

  async updateVendorBillStatus(id: string, status: string) {
    return this.request(`/vendor-bills/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  // OCR methods
  async saveOCRResults(ocrData: any) {
    return this.request('/ocr/save-results', {
      method: 'POST',
      body: JSON.stringify(ocrData),
    });
  }

  // Document methods
  async getDocuments(entityType: string, entityId: string) {
    return this.request(`/documents/${entityType}/${entityId}`);
  }

  async downloadDocument(documentId: string): Promise<Blob> {
    const response = await fetch(`${this.baseURL}/documents/download/${documentId}`, {
      headers: {
        'Authorization': `Bearer ${this.getToken()}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to download document');
    }

    return response.blob();
  }

  // Delivery Challans methods
  async getDeliveryChallans(params?: { page?: number; limit?: number; search?: string; status?: string; purchase_order_id?: string }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.purchase_order_id) queryParams.append('purchase_order_id', params.purchase_order_id);

    const endpoint = `/delivery-challans${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.request(endpoint);
  }

  async getDeliveryChallanById(id: string) {
    return this.request(`/delivery-challans/${id}`);
  }

  async createDeliveryChallan(challanData: any) {
    return this.request('/delivery-challans', {
      method: 'POST',
      body: JSON.stringify(challanData),
    });
  }

  async updateDeliveryChallanStatus(id: string, status: string) {
    return this.request(`/delivery-challans/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }  // Delivery Challans methods
  async getDeliveryChallans(params?: { page?: number; limit?: number; search?: string; status?: string; purchase_order_id?: string }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.purchase_order_id) queryParams.append('purchase_order_id', params.purchase_order_id);
    
    const endpoint = `/delivery-challans${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.request(endpoint);
  }

  async createDeliveryChallan(challanData: any) {
    return this.request('/delivery-challans', {
      method: 'POST',
      body: JSON.stringify(challanData),
    });
  }

  async updateDeliveryChallanStatus(id: string, status: string) {
    return this.request(`/delivery-challans/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  // Product methods
  async getProducts(params?: { page?: number; limit?: number; search?: string; category?: string; type?: string; status?: string }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.category) queryParams.append('category', params.category);
    if (params?.type) queryParams.append('type', params.type);
    if (params?.status) queryParams.append('status', params.status);
    
    const endpoint = `/products${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.request(endpoint);
  }

  async getProductById(id: string) {
    return this.request(`/products/${id}`);
  }

  async createProduct(productData: any) {
    return this.request('/products', {
      method: 'POST',
      body: JSON.stringify(productData),
    });
  }

  async updateProduct(id: string, productData: any) {
    return this.request(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(productData),
    });
  }

  async deleteProduct(id: string) {
    return this.request(`/products/${id}`, {
      method: 'DELETE',
    });
  }

  async getLowStockProducts() {
    return this.request('/products/alerts/low-stock');
  }

  // Ledger methods
  async getLedgerEntries(params?: { 
    page?: number; 
    limit?: number; 
    date_from?: string; 
    date_to?: string; 
    reference_type?: string; 
    account_type?: string;
    customer_vendor?: string;
    entry_type?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.date_from) queryParams.append('date_from', params.date_from);
    if (params?.date_to) queryParams.append('date_to', params.date_to);
    if (params?.reference_type) queryParams.append('reference_type', params.reference_type);
    if (params?.account_type) queryParams.append('account_type', params.account_type);
    if (params?.customer_vendor) queryParams.append('customer_vendor', params.customer_vendor);
    if (params?.entry_type) queryParams.append('entry_type', params.entry_type);
    
    const endpoint = `/ledger${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.request(endpoint);
  }

  async getLedgerEntryById(id: string) {
    return this.request(`/ledger/${id}`);
  }

  async createLedgerEntry(entryData: any) {
    return this.request('/ledger', {
      method: 'POST',
      body: JSON.stringify(entryData),
    });
  }

  async getChartOfAccounts() {
    return this.request('/ledger/accounts/chart');
  }

  async getFinancialMetrics(params?: { date_from?: string; date_to?: string }) {
    const queryParams = new URLSearchParams();
    if (params?.date_from) queryParams.append('date_from', params.date_from);
    if (params?.date_to) queryParams.append('date_to', params.date_to);
    
    const endpoint = `/ledger/metrics/summary${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.request(endpoint);
  }

  // Invoice methods
  async getInvoices(params?: { 
    page?: number; 
    limit?: number; 
    search?: string; 
    status?: string; 
    customer_id?: string; 
    fbr_sync_status?: string 
  }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.customer_id) queryParams.append('customer_id', params.customer_id);
    if (params?.fbr_sync_status) queryParams.append('fbr_sync_status', params.fbr_sync_status);
    
    const endpoint = `/invoices${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.request(endpoint);
  }

  async getInvoiceById(id: string) {
    return this.request(`/invoices/${id}`);
  }

  async createInvoice(invoiceData: any) {
    return this.request('/invoices', {
      method: 'POST',
      body: JSON.stringify(invoiceData),
    });
  }

  async updateInvoiceFBRSync(id: string, syncData: { fbr_sync_status: string; fbr_reference?: string }) {
    return this.request(`/invoices/${id}/fbr-sync`, {
      method: 'PATCH',
      body: JSON.stringify(syncData),
    });
  }

  // Product Categories methods
  async getProductCategories(params?: { page?: number; limit?: number; search?: string; parent_id?: string }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.parent_id) queryParams.append('parent_id', params.parent_id);
    
    const endpoint = `/product-categories${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.request(endpoint);
  }

  async getProductCategoryById(id: string) {
    return this.request(`/product-categories/${id}`);
  }

  async createProductCategory(categoryData: any) {
    return this.request('/product-categories', {
      method: 'POST',
      body: JSON.stringify(categoryData),
    });
  }

  async updateProductCategory(id: string, categoryData: any) {
    return this.request(`/product-categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(categoryData),
    });
  }

  async deleteProductCategory(id: string) {
    return this.request(`/product-categories/${id}`, {
      method: 'DELETE',
    });
  }

  async getProductCategoryTree() {
    return this.request('/product-categories/tree/all');
  }

  // Stock Movements methods
  async getStockMovements(params?: { page?: number; limit?: number; product_id?: string; movement_type?: string; date_from?: string; date_to?: string }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.product_id) queryParams.append('product_id', params.product_id);
    if (params?.movement_type) queryParams.append('movement_type', params.movement_type);
    if (params?.date_from) queryParams.append('date_from', params.date_from);
    if (params?.date_to) queryParams.append('date_to', params.date_to);
    
    const endpoint = `/stock-movements${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.request(endpoint);
  }

  async createStockMovement(movementData: any) {
    return this.request('/stock-movements', {
      method: 'POST',
      body: JSON.stringify(movementData),
    });
  }

  async getProductStockHistory(productId: string, params?: { page?: number; limit?: number }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    
    const endpoint = `/stock-movements/product/${productId}/history${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.request(endpoint);
  }

  async getLowStockAlerts() {
    return this.request('/stock-movements/alerts/low-stock');
  }

  // Health check
  async healthCheck() {
    return this.request('/health');
  }

  // Document methods
  async getDocuments(entityType?: string, entityId?: string) {
    if (entityType && entityId) {
      return this.request(`/documents/${entityType}/${entityId}`);
    } else {
      return this.request('/documents');
    }
  }

  async getTradeDocuments(filters?: {
    document_type?: string;
    compliance_status?: string;
    ocr_status?: string;
    customer_id?: string;
    vendor_id?: string;
    business_entity_id?: string;
    linked_reference_type?: string;
    date_from?: string;
    date_to?: string;
    limit?: number;
    offset?: number;
  }) {
    const searchParams = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, value.toString());
        }
      });
    }
    return this.request(`/documents?${searchParams.toString()}`);
  }

  async uploadDocument(formData: FormData) {
    return this.request('/documents/upload', {
      method: 'POST',
      body: formData,
      headers: {} // Remove Content-Type to let browser set it with boundary for FormData
    });
  }

  async updateDocumentCompliance(id: string, compliance_status: string, compliance_notes?: string) {
    return this.request(`/documents/${id}/compliance`, {
      method: 'PATCH',
      body: JSON.stringify({
        compliance_status,
        compliance_notes
      })
    });
  }

  async deleteDocument(id: string) {
    return this.request(`/documents/${id}`, {
      method: 'DELETE',
    });
  }

  async processDocumentOCR(id: string) {
    return this.request(`/documents/${id}/ocr`, {
      method: 'POST',
    });
  }

  // Business entities methods
  async getBusinessEntities(options?: { limit?: number; offset?: number }) {
    const { limit = 100, offset = 0 } = options || {};
    return this.request(`/business-entities?limit=${limit}&offset=${offset}`);
  }

  // Business entities are handled through customers and vendors
  // No separate business entities endpoint needed
}

// Create and export API client instance
export const apiClient = new ApiClient(API_BASE_URL);

// Export types
export interface Customer {
  id: string;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  gst_number?: string;
  totalQuotes: number;
  quotesCount: number;
  status: 'active' | 'inactive' | 'suspended';
}

export interface SalesDashboardData {
  pendingQuotations: number;
  salesThisMonth: number;
  topCustomers: Array<{
    name: string;
    totalQuotes: number;
    quotesCount: number;
  }>;
  recentInquiries: number;
}

export interface QuotationTrend {
  month: string;
  quotations: number;
  accepted: number;
  revenue: number;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  vendor_id: string;
  business_entity_id?: string;
  quotation_id?: string;
  sales_order_id?: string;
  po_date: string;
  expected_delivery_date?: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'sent' | 'received' | 'closed' | 'cancelled';
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  terms_conditions?: string;
  notes?: string;
  created_by: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
  vendors?: {
    name: string;
    email?: string;
    phone?: string;
    contact_person?: string;
    gst_number?: string;
  };
  purchase_order_items?: PurchaseOrderItem[];
  vendor_bills?: Array<{
    id: string;
    bill_number: string;
    status: string;
    total_amount: number;
    bill_date?: string;
    due_date?: string;
  }>;
  bills?: Array<{
    id: string;
    filename: string;
    file_path: string;
    uploaded_at: string;
  }>;
  delivery_challans?: Array<{
    id: string;
    challan_number: string;
    status: string;
    challan_date: string;
    delivery_date?: string;
    notes?: string;
  }>;
  challans?: Array<{
    id: string;
    challan_number: string;
    challan_date: string;
    delivery_date?: string;
    status: string;
  }>;
}

export interface PurchaseOrderItem {
  id: string;
  purchase_order_id: string;
  product_id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  tax_percent: number;
  line_total: number;
  received_quantity: number;
  created_at: string;
}

export interface Vendor {
  id: string;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  gst_number?: string;
  tax_id?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  payment_terms: number;
  status: 'active' | 'inactive' | 'suspended';
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  category_id?: string;
  type: 'raw_material' | 'finished_good' | 'service' | 'spare_parts';
  unit_of_measure: string;
  current_stock: number;
  reorder_point: number;
  max_stock_level?: number;
  last_purchase_price?: number;
  average_cost?: number;
  selling_price?: number;
  status: 'active' | 'inactive' | 'discontinued';
  created_by: string;
  created_at: string;
  updated_at: string;
  product_categories?: {
    name: string;
  };
}

export interface ProductCategory {
  id: string;
  name: string;
  description?: string;
  parent_id?: string;
  is_active: boolean;
  created_at: string;
  parent?: {
    name: string;
  };
  children?: ProductCategory[];
}

export interface StockMovement {
  id: string;
  product_id: string;
  movement_type: 'purchase' | 'sale' | 'adjustment' | 'transfer' | 'consumption';
  quantity: number;
  unit_cost?: number;
  reference_type?: string;
  reference_id?: string;
  notes?: string;
  created_by: string;
  created_at: string;
  products?: {
    name: string;
    sku: string;
  };
}

export interface LedgerEntry {
  id: string;
  entry_number: string;
  entry_date: string;
  reference_type?: string;
  reference_id?: string;
  reference_number?: string;
  description: string;
  total_debit: number;
  total_credit: number;
  status: 'draft' | 'posted' | 'reversed';
  created_by: string;
  created_at: string;
  ledger_entry_lines?: LedgerEntryLine[];
  users?: {
    first_name: string;
    last_name: string;
  };
}

export interface LedgerEntryLine {
  id: string;
  ledger_entry_id: string;
  account_id: string;
  debit_amount: number;
  credit_amount: number;
  description?: string;
  created_at: string;
  chart_of_accounts?: {
    account_code: string;
    account_name: string;
    account_type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  };
}

export interface ChartOfAccount {
  id: string;
  account_code: string;
  account_name: string;
  account_type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  parent_id?: string;
  is_active: boolean;
  created_at: string;
}

export interface FinancialMetrics {
  totalSales: number;
  totalPurchases: number;
  expenses: number;
  netProfit: number;
  pendingInvoices: number;
  pendingAmount: number;
}

export interface DocumentAttachment {
  id: string;
  reference_type: string;
  reference_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  document_type?: string;
  linked_reference_type?: string;
  linked_reference_id?: string;
  linked_reference_number?: string;
  customer_id?: string;
  vendor_id?: string;
  business_entity_id?: string;
  compliance_status?: 'pending' | 'approved' | 'rejected' | 'under_review';
  compliance_notes?: string;
  ocr_status?: 'pending' | 'processing' | 'completed' | 'failed';
  document_date?: string;
  expiry_date?: string;
  issuing_authority?: string;
  country_of_origin?: string;
  notes?: string;
  uploaded_by: string;
  uploaded_at: string;
  customers?: {
    id: string;
    name: string;
    email?: string;
    gst_number?: string;
  };
  vendors?: {
    id: string;
    name: string;
    email?: string;
    gst_number?: string;
  };
  business_entities?: {
    id: string;
    name: string;
    legal_name?: string;
    country?: string;
  };
  ocr_results?: {
    id: string;
    extracted_text?: string;
    confidence_score?: number;
    processing_status?: string;
    processed_at?: string;
    language?: string;
  }[];
}

export default apiClient;
