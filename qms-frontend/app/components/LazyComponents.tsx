'use client';

import { lazy } from 'react';

// Lazy load heavy components to reduce initial bundle size
export const LazyGeneratePLReportModal = lazy(() => import('./accounting/GeneratePLReportModal'));
export const LazyPendingInvoicesReportModal = lazy(() => import('./accounting/PendingInvoicesReportModal'));
export const LazyAddLedgerEntryModal = lazy(() => import('./accounting/AddLedgerEntryModal'));
export const LazyLedgerEntryDetailsModal = lazy(() => import('./accounting/LedgerEntryDetailsModal'));

// Lazy load dashboard components
export const LazyRoleBasedDashboard = lazy(() => import('./dashboard/RoleBasedDashboard'));

// Additional lazy components can be added here as needed
// Example: export const LazyOCRProcessor = lazy(() => import('./documents/OCRProcessor'));
// Example: export const LazyExcelProcessor = lazy(() => import('./documents/ExcelProcessor'));
// Example: export const LazyChartComponent = lazy(() => import('./charts/ChartComponent'));
