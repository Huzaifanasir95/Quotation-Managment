'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../app/lib/api';

// Query Keys
export const queryKeys = {
  customers: ['customers'] as const,
  customer: (id: string) => ['customers', id] as const,
  quotations: ['quotations'] as const,
  quotation: (id: string) => ['quotations', id] as const,
  ledgerEntries: ['ledger-entries'] as const,
  financialMetrics: ['financial-metrics'] as const,
  chartOfAccounts: ['chart-of-accounts'] as const,
  businessEntities: ['business-entities'] as const,
  documents: ['documents'] as const,
  products: ['products'] as const,
  vendors: ['vendors'] as const,
  purchaseOrders: ['purchase-orders'] as const,
  salesDashboard: ['sales-dashboard'] as const,
};

// Customer Hooks
export function useCustomers(params?: { page?: number; limit?: number; search?: string }) {
  return useQuery({
    queryKey: [...queryKeys.customers, params],
    queryFn: () => apiClient.getCustomers(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: queryKeys.customer(id),
    queryFn: () => apiClient.getCustomers({ page: 1, limit: 1 }).then((res: any) => 
      res.data.customers.find((c: any) => c.id === id)
    ),
    enabled: !!id,
  });
}

// Quotation Hooks
export function useQuotations(params?: { page?: number; limit?: number; search?: string; status?: string }) {
  return useQuery({
    queryKey: [...queryKeys.quotations, params],
    queryFn: () => apiClient.getQuotations(params),
    staleTime: 2 * 60 * 1000, // 2 minutes for more dynamic data
  });
}

// Ledger Hooks
export function useLedgerEntries(params?: { 
  page?: number; 
  limit?: number; 
  date_from?: string; 
  date_to?: string; 
  reference_type?: string; 
  account_type?: string;
}) {
  return useQuery({
    queryKey: [...queryKeys.ledgerEntries, params],
    queryFn: () => apiClient.getLedgerEntries(params),
    staleTime: 3 * 60 * 1000, // 3 minutes
  });
}

export function useFinancialMetrics(params?: { date_from?: string; date_to?: string }) {
  return useQuery({
    queryKey: [...queryKeys.financialMetrics, params],
    queryFn: () => apiClient.getFinancialMetrics(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useChartOfAccounts() {
  return useQuery({
    queryKey: queryKeys.chartOfAccounts,
    queryFn: () => apiClient.getChartOfAccounts(),
    staleTime: 30 * 60 * 1000, // 30 minutes - rarely changes
  });
}

// Business Entities Hook
export function useBusinessEntities(options?: { limit?: number; offset?: number }) {
  return useQuery({
    queryKey: [...queryKeys.businessEntities, options],
    queryFn: () => apiClient.getBusinessEntities(options),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Documents Hook
export function useDocuments(filters?: any) {
  return useQuery({
    queryKey: [...queryKeys.documents, filters],
    queryFn: () => apiClient.getTradeDocuments(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Products Hook
export function useProducts(params?: { page?: number; limit?: number; search?: string; category?: string }) {
  return useQuery({
    queryKey: [...queryKeys.products, params],
    queryFn: () => apiClient.getProducts(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Vendors Hook
export function useVendors(params?: { page?: number; limit?: number; search?: string }) {
  return useQuery({
    queryKey: [...queryKeys.vendors, params],
    queryFn: () => apiClient.getVendors(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Sales Dashboard Hook
export function useSalesDashboard() {
  return useQuery({
    queryKey: queryKeys.salesDashboard,
    queryFn: () => apiClient.getSalesDashboard(),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Mutation Hooks
export function useCreateCustomer() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (customerData: any) => apiClient.createCustomer(customerData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers });
    },
  });
}

export function useCreateLedgerEntry() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (entryData: any) => apiClient.createLedgerEntry(entryData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ledgerEntries });
      queryClient.invalidateQueries({ queryKey: queryKeys.financialMetrics });
    },
  });
}

export function useCreateQuotation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (quotationData: any) => apiClient.createQuotation(quotationData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quotations });
      queryClient.invalidateQueries({ queryKey: queryKeys.salesDashboard });
    },
  });
}

export function useUploadDocument() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (formData: FormData) => apiClient.uploadDocument(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.documents });
    },
  });
}
