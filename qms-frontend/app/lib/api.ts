const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api/v1';

// API utility functions
class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor() {
    this.baseURL = API_BASE_URL;
    // Load token from localStorage on initialization
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
  }

  getToken(): string | null {
    return this.token;
  }

  isAuthenticated(): boolean {
    return !!this.token;
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
      // If unauthorized, clear the token
      if (response.status === 401) {
        this.clearToken();
      }
      const error = await response.json().catch(() => ({ message: 'Network error' }));
      throw new Error(error.message || `HTTP ${response.status}`);
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

  async logout() {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } finally {
      this.clearToken();
    }
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

  // Health check
  async healthCheck() {
    return this.request('/health');
  }
}

// Create and export API client instance
export const apiClient = new ApiClient();

// Export types
export interface Customer {
  id: string;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
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

export default apiClient;
