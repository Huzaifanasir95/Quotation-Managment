// API Base URL Configuration - Works for both localhost and production
const getApiBaseUrl = () => {
  // 1. Use environment variable if set (highest priority)
  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL;
  }
  
  // 2. Client-side detection based on current domain
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    
    // Production: anoosh.vercel.app
    if (origin.includes('anoosh.vercel.app')) {
      return 'https://anoosh.vercel.app/api/v1';
    }
    
    // Other Vercel deployments (fallback)
    if (origin.includes('vercel.app')) {
      return `${origin}/api/v1`;
    }
    
    // Localhost development
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return 'http://localhost:5000/api/v1';
    }
  }
  
  // 3. Server-side fallback (for SSR)
  return 'http://localhost:5000/api/v1';
};

const API_BASE_URL = getApiBaseUrl();

console.log('🌐 API Base URL configured as:', API_BASE_URL);

// API utility functions
class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    // Get token from session cookies only
    if (typeof window !== 'undefined') {
      this.token = this.getCookie('auth_token');
    }
  }

  private getCookie(name: string): string | null {
    if (typeof window === 'undefined') return null;
    const nameEQ = name + '=';
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
  }

  private setSessionCookie(name: string, value: string) {
    if (typeof window === 'undefined') return;
    // Session cookie - expires when browser closes
    // For localhost development, don't use Secure flag
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const secureFlag = !isLocalhost ? ';Secure' : '';
    document.cookie = `${name}=${value};path=/;SameSite=Lax${secureFlag}`;
  }

  private deleteCookie(name: string) {
    if (typeof window === 'undefined') return;
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const secureFlag = !isLocalhost ? ';Secure' : '';
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;SameSite=Lax${secureFlag}`;
  }

  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      this.setSessionCookie('auth_token', token);
    }
  }

  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      this.deleteCookie('auth_token');
    }
  }

  refreshToken() {
    if (typeof window !== 'undefined') {
      this.token = this.getCookie('auth_token');
    }
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    // Only set Content-Type to application/json if not FormData
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    // Add timeout for requests (15 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

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
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request timeout. Please check your internet connection and try again.');
      }
      throw error;
    }
  }

  // Auth methods
  async login(email: string, password: string) {
    console.log('🔑 Attempting login for:', email);
    const startTime = Date.now();
    
    try {
      const response = await this.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      
      const loginTime = Date.now() - startTime;
      console.log(`✅ Login completed in ${loginTime}ms`);
      
      if (response.success && response.data.token) {
        this.setToken(response.data.token);
        console.log('🎫 Token set successfully');
      }
      
      return response;
    } catch (error: any) {
      const loginTime = Date.now() - startTime;
      console.error(`❌ Login failed in ${loginTime}ms:`, error.message);
      throw error;
    }
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

  // User management methods
  async getUsers(params?: { page?: number; limit?: number; search?: string; role?: string; status?: string }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.role) queryParams.append('role', params.role);
    if (params?.status) queryParams.append('status', params.status);
    
    const endpoint = `/users${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.request(endpoint);
  }

  async createUser(userData: {
    first_name: string;
    last_name: string;
    email: string;
    password: string;
    role: string;
  }) {
    return this.request('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async updateUser(id: string, userData: {
    first_name?: string;
    last_name?: string;
    email?: string;
    role?: string;
  }) {
    return this.request(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  async deleteUser(id: string) {
    return this.request(`/users/${id}`, {
      method: 'DELETE',
    });
  }

  async toggleUserStatus(id: string, status: 'active' | 'inactive') {
    return this.request(`/users/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: status === 'active' }),
    });
  }

  async getUserById(id: string) {
    return this.request(`/users/${id}`);
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

  async updateQuotation(id: string, quotationData: any) {
    return this.request(`/quotations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(quotationData),
    });
  }

  async getQuotationById(id: string) {
    return this.request(`/quotations/${id}`);
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

  // Sales Order methods
  async getOrders(params?: { page?: number; limit?: number; search?: string; status?: string; customer_id?: string }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.customer_id) queryParams.append('customer_id', params.customer_id);
    
    const endpoint = `/orders${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.request(endpoint);
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

  // Accounts Payable (Vendor Bills) - Money you owe to suppliers
  async getPayableInvoices(params?: { page?: number; limit?: number; search?: string; status?: string; vendor_id?: string; purchase_order_id?: string }) {
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

  // Backward compatibility - alias for getPayableInvoices
  async getVendorBills(params?: { page?: number; limit?: number; search?: string; status?: string; vendor_id?: string; purchase_order_id?: string }) {
    return this.getPayableInvoices(params);
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

  // New vendor bill creation methods
  async createVendorBillFromPO(billData: {
    purchase_order_id: string;
    bill_number: string;
    bill_date: string;
    due_date?: string;
    received_items?: Array<any>;
    notes?: string;
  }) {
    return this.request('/vendor-bills/create-from-po', {
      method: 'POST',
      body: JSON.stringify(billData),
    });
  }

  async createExpenseBill(expenseData: {
    bill_number: string;
    vendor_id: string;
    bill_date: string;
    due_date?: string;
    expense_category: string;
    description?: string;
    subtotal?: number;
    tax_amount?: number;
    total_amount: number;
    notes?: string;
  }) {
    return this.request('/vendor-bills/create-expense', {
      method: 'POST',
      body: JSON.stringify(expenseData),
    });
  }

  async getPendingPurchaseOrders(vendor_id?: string) {
    const queryParams = new URLSearchParams();
    if (vendor_id) queryParams.append('vendor_id', vendor_id);
    
    const endpoint = `/vendor-bills/pending-pos${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.request(endpoint);
  }

  async updateVendorBillPayment(id: string, paymentData: {
    paid_amount: number;
    payment_date?: string;
    payment_method?: string;
    payment_reference?: string;
  }) {
    return this.request(`/vendor-bills/${id}/payment`, {
      method: 'PATCH',
      body: JSON.stringify(paymentData),
    });
  }

  // OCR methods
  async saveOCRResults(ocrData: any) {
    return this.request('/ocr/save-results', {
      method: 'POST',
      body: JSON.stringify(ocrData),
    });
  }


  async downloadDocument(documentId: string): Promise<Blob> {
    const response = await fetch(`${this.baseURL}/documents/download/${documentId}`, {
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Download error:', response.status, errorText);
      throw new Error(`Failed to download document: ${response.status} - ${errorText}`);
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

  async getInventoryKPIs() {
    return this.request('/products/stats/kpis');
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

  // Get comprehensive accounting metrics (receivables, payables, P&L)
  async getAccountingMetrics() {
    return this.request('/ledger/metrics/accounting');
  }

  // Accounts Receivable (Sales Invoices) - Money customers owe you
  async getReceivableInvoices(params?: { 
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

  // Backward compatibility - alias for getReceivableInvoices
  async getInvoices(params?: { 
    page?: number; 
    limit?: number; 
    search?: string; 
    status?: string; 
    customer_id?: string; 
    fbr_sync_status?: string 
  }) {
    return this.getReceivableInvoices(params);
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

  async createInvoiceFromOrder(orderData: { sales_order_id: string; invoice_date?: string; due_date?: string; notes?: string }) {
    return this.request('/invoices/create-from-order', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  }

  async autoGenerateInvoices() {
    return this.request('/invoices/auto-generate', {
      method: 'POST',
    });
  }

  async sendInvoiceReminder(invoiceId: string) {
    return this.request(`/invoices/${invoiceId}/send-reminder`, {
      method: 'POST',
    });
  }

  async markInvoiceAsPaid(invoiceId: string) {
    return this.request(`/invoices/${invoiceId}/mark-paid`, {
      method: 'PATCH',
    });
  }

  async getInvoiceDetails(invoiceId: string) {
    return this.request(`/invoices/${invoiceId}`);
  }

  async updateDeliveryStatus(orderId: string, statusData: { delivery_status: string; delivery_date?: string; delivery_notes?: string }) {
    console.log('🌐 API CLIENT: updateDeliveryStatus called');
    console.log('- Order ID:', orderId);
    console.log('- Status Data:', statusData);
    console.log('- API URL:', `${this.baseURL}/orders/${orderId}/delivery-status`);
    
    const result = await this.request(`/orders/${orderId}/delivery-status`, {
      method: 'PATCH',
      body: JSON.stringify(statusData),
    });
    
    console.log('🌐 API CLIENT: updateDeliveryStatus response:', result);
    return result;
  }

  async getSalesOrders(params?: { page?: number; limit?: number; search?: string; status?: string; customer_id?: string }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.customer_id) queryParams.append('customer_id', params.customer_id);

    const endpoint = `/orders${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.request(endpoint);
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

  // Dashboard methods
  async getDashboardData() {
    console.log('📊 Fetching dashboard data...');
    const startTime = Date.now();
    
    try {
      const response = await this.request('/dashboard/stats');
      const loadTime = Date.now() - startTime;
      console.log(`📊 Dashboard data loaded in ${loadTime}ms`);
      return response;
    } catch (error: any) {
      const loadTime = Date.now() - startTime;
      console.error(`❌ Dashboard data failed in ${loadTime}ms:`, error.message);
      throw error;
    }
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
    console.log('🔍 Fetching business entities with options:', { limit, offset });
    console.log('🔍 API Base URL:', this.baseURL);
    console.log('🔍 Auth token exists:', !!this.token);
    
    try {
      const result = await this.request(`/business-entities?limit=${limit}&offset=${offset}`);
      console.log('🔍 Business entities API result:', result);
      console.log('🔍 Result data type:', typeof result?.data);
      console.log('🔍 Result data is array:', Array.isArray(result?.data));
      console.log('🔍 Result data length:', result?.data?.length);
      return result;
    } catch (error) {
      console.error('❌ Business entities API error:', error);
      throw error;
    }
  }

  // Settings API methods
  async getSettings() {
    try {
      const result = await this.request('/settings');
      return result;
    } catch (error) {
      console.error('❌ Settings API error:', error);
      throw error;
    }
  }

  async updateSettings(settings: any) {
    try {
      const result = await this.request('/settings', {
        method: 'PUT',
        body: JSON.stringify(settings)
      });
      return result;
    } catch (error) {
      console.error('❌ Update settings API error:', error);
      throw error;
    }
  }

  async getTermsAndConditions() {
    try {
      const result = await this.request('/settings/terms');
      return result;
    } catch (error) {
      console.error('❌ Terms API error:', error);
      throw error;
    }
  }

  async updateTermsAndConditions(terms: any) {
    try {
      const result = await this.request('/settings/terms', {
        method: 'PUT',
        body: JSON.stringify(terms)
      });
      return result;
    } catch (error) {
      console.error('❌ Update terms API error:', error);
      throw error;
    }
  }

  // Delivery Acceptance methods
  async getDeliveryAcceptance(deliveryId: string) {
    return this.request(`/delivery-acceptance/${deliveryId}`);
  }

  async updateDeliveryAcceptance(acceptanceId: string, data: any) {
    return this.request(`/delivery-acceptance/${acceptanceId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  // Rejection Handling methods
  async getRejectionHandling(rejectionId: string) {
    return this.request(`/rejection-handling/${rejectionId}`);
  }

  async updateRejectionHandling(rejectionId: string, data: any) {
    return this.request(`/rejection-handling/${rejectionId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async contactVendorForRejection(rejectionId: string, communication: any) {
    return this.request(`/rejection-handling/${rejectionId}/contact-vendor`, {
      method: 'POST',
      body: JSON.stringify(communication)
    });
  }

  async generateAcceptanceCertificate(acceptanceId: string) {
    return this.request(`/delivery-acceptance/${acceptanceId}/certificate`, {
      method: 'POST'
    });
  }

  // Additional Delivery Acceptance methods
  async createDeliveryAcceptance(deliveryId: string, data: any) {
    return this.request('/delivery-acceptance', {
      method: 'POST',
      body: JSON.stringify({ delivery_challan_id: deliveryId, ...data })
    });
  }

  async getDeliveryAcceptanceByDeliveryId(deliveryId: string) {
    return this.request(`/delivery-acceptance/by-delivery/${deliveryId}`);
  }

  async updateAcceptanceItemStatus(itemId: string, data: any) {
    return this.request(`/delivery-acceptance-items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  // Additional Rejection Handling methods
  async createRejectionHandling(acceptanceId: string, data: any) {
    return this.request('/rejection-handling', {
      method: 'POST',
      body: JSON.stringify({ delivery_acceptance_id: acceptanceId, ...data })
    });
  }

  async getRejectionsByAcceptanceId(acceptanceId: string) {
    return this.request(`/rejection-handling/by-acceptance/${acceptanceId}`);
  }

  async updateRejectedItemStatus(itemId: string, data: any) {
    return this.request(`/rejected-items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async getVendorCommunicationHistory(rejectionId: string) {
    return this.request(`/rejection-handling/${rejectionId}/communications`);
  }

  async downloadAcceptanceCertificate(acceptanceId: string): Promise<Blob> {
    const response = await fetch(`${this.baseURL}/delivery-acceptance/${acceptanceId}/certificate/download`, {
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to download certificate: ${response.status} - ${errorText}`);
    }

    return response.blob();
  }
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
  fax?: string;
  customer_ref_no?: string;
  customer_type?: string;
  designation?: string;
  department?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  gst_number?: string;
  credit_limit?: number;
  payment_terms?: number;
  notes?: string;
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

// Delivery Acceptance & Rejection Management Interfaces
export interface DeliveryAcceptance {
  id: string;
  delivery_challan_id: string;
  acceptance_status: 'pending' | 'accepted' | 'partially_accepted' | 'rejected';
  acceptance_date?: string;
  customer_signature?: string;
  acceptance_notes?: string;
  rejection_notes?: string;
  accepted_by_name?: string;
  accepted_by_designation?: string;
  accepted_by_contact?: string;
  acceptance_certificate_url?: string;
  created_at: string;
  updated_at: string;
  delivery_acceptance_items?: DeliveryAcceptanceItem[];
}

export interface DeliveryAcceptanceItem {
  id: string;
  delivery_acceptance_id: string;
  item_description: string;
  delivered_quantity: number;
  accepted_quantity: number;
  rejected_quantity: number;
  rejection_reason?: string;
  acceptance_status: 'pending' | 'accepted' | 'rejected' | 'partially_accepted';
  created_at: string;
}

export interface RejectionHandling {
  id: string;
  delivery_acceptance_id: string;
  rejection_date: string;
  total_rejected_items: number;
  overall_status: 'pending' | 'vendor_contacted' | 'return_approved' | 'returned' | 'replaced' | 'resolved';
  vendor_contacted_date?: string;
  vendor_response_date?: string;
  resolution_notes?: string;
  created_at: string;
  updated_at: string;
  rejected_items?: RejectedItem[];
}

export interface RejectedItem {
  id: string;
  rejection_handling_id: string;
  item_description: string;
  rejected_quantity: number;
  rejection_reason: string;
  return_status: 'pending' | 'approved' | 'returned' | 'non_returnable' | 'replaced';
  vendor_response?: string;
  return_date?: string;
  replacement_date?: string;
  inventory_location?: string;
  cost_impact: number;
  created_at: string;
}

export interface VendorCommunication {
  communication_type: 'email' | 'phone' | 'whatsapp';
  message: string;
  contact_details: string;
  sent_by: string;
  notes?: string;
}

export interface AcceptanceCertificateData {
  acceptance_id: string;
  company_name?: string;
  company_logo?: string;
  certificate_template?: string;
}


export default apiClient;
