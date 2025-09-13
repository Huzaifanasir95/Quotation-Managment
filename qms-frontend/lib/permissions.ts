// Role-based permission system
export type UserRole = 'admin' | 'sales' | 'procurement' | 'finance' | 'auditor';

export interface Permission {
  module: string;
  actions: string[];
}

export const rolePermissions: Record<UserRole, Permission[]> = {
  admin: [
    { module: 'dashboard', actions: ['view'] },
    { module: 'sales', actions: ['view', 'create', 'edit', 'delete'] },
    { module: 'purchases', actions: ['view', 'create', 'edit', 'delete'] },
    { module: 'inventory', actions: ['view', 'create', 'edit', 'delete'] },
    { module: 'accounting', actions: ['view', 'create', 'edit', 'delete'] },
    { module: 'reports', actions: ['view', 'export'] },
    { module: 'import-export', actions: ['view', 'create', 'edit', 'delete'] },
    { module: 'settings', actions: ['view', 'create', 'edit', 'delete'] },
    { module: 'users', actions: ['view', 'create', 'edit', 'delete'] },
    { module: 'quotations', actions: ['view', 'create', 'edit', 'delete', 'convert'] },
    { module: 'customers', actions: ['view', 'create', 'edit', 'delete'] },
    { module: 'vendors', actions: ['view', 'create', 'edit', 'delete'] },
    { module: 'products', actions: ['view', 'create', 'edit', 'delete'] },
    { module: 'invoices', actions: ['view', 'create', 'edit', 'delete'] },
    { module: 'orders', actions: ['view', 'create', 'edit', 'delete'] },
    { module: 'fbr', actions: ['view', 'create', 'edit', 'sync'] }
  ],
  
  sales: [
    { module: 'dashboard', actions: ['view'] },
    { module: 'sales', actions: ['view', 'create', 'edit'] },
    { module: 'quotations', actions: ['view', 'create', 'edit', 'convert'] },
    { module: 'customers', actions: ['view', 'create', 'edit'] },
    { module: 'products', actions: ['view'] },
    { module: 'inventory', actions: ['view'] },
    { module: 'orders', actions: ['view', 'create', 'edit'] },
    { module: 'invoices', actions: ['view', 'create'] },
    { module: 'reports', actions: ['view'] },
    { module: 'import-export', actions: ['view', 'create'] }
  ],
  
  procurement: [
    { module: 'dashboard', actions: ['view'] },
    { module: 'purchases', actions: ['view', 'create', 'edit'] },
    { module: 'vendors', actions: ['view', 'create', 'edit', 'delete'] },
    { module: 'products', actions: ['view', 'create', 'edit'] },
    { module: 'inventory', actions: ['view', 'create', 'edit', 'adjust'] },
    { module: 'reports', actions: ['view'] },
    { module: 'import-export', actions: ['view', 'create', 'edit'] }
  ],
  
  finance: [
    { module: 'dashboard', actions: ['view'] },
    { module: 'accounting', actions: ['view', 'create', 'edit', 'delete'] },
    { module: 'invoices', actions: ['view', 'create', 'edit', 'delete'] },
    { module: 'reports', actions: ['view', 'export'] },
    { module: 'fbr', actions: ['view', 'create', 'sync'] },
    { module: 'quotations', actions: ['view'] },
    { module: 'orders', actions: ['view'] },
    { module: 'customers', actions: ['view'] },
    { module: 'vendors', actions: ['view'] },
    { module: 'inventory', actions: ['view'] }
  ],
  
  auditor: [
    { module: 'dashboard', actions: ['view'] },
    { module: 'reports', actions: ['view', 'export'] },
    { module: 'sales', actions: ['view'] },
    { module: 'purchases', actions: ['view'] },
    { module: 'inventory', actions: ['view'] },
    { module: 'accounting', actions: ['view'] },
    { module: 'quotations', actions: ['view'] },
    { module: 'customers', actions: ['view'] },
    { module: 'vendors', actions: ['view'] },
    { module: 'invoices', actions: ['view'] },
    { module: 'orders', actions: ['view'] },
    { module: 'audit-logs', actions: ['view', 'export'] }
  ]
};

export const navigationItems: Record<UserRole, Array<{
  href: string;
  label: string;
  icon: string;
  badge?: string;
}>> = {
  admin: [
    { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { href: '/sales', label: 'Sales', icon: 'sales' },
    { href: '/invoices', label: 'Invoices', icon: 'invoices' },
    { href: '/purchases', label: 'Purchases', icon: 'purchases' },
    { href: '/inventory', label: 'Inventory', icon: 'inventory' },
    { href: '/accounting', label: 'Accounting', icon: 'accounting' },
    { href: '/reports', label: 'Reports', icon: 'reports' },
    { href: '/import-export', label: 'Import/Export', icon: 'import-export' },
    { href: '/settings', label: 'Settings', icon: 'settings' }
  ],
  
  sales: [
    { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { href: '/sales', label: 'Sales', icon: 'sales' },
    { href: '/invoices', label: 'Invoices', icon: 'invoices' },
    { href: '/inventory', label: 'Inventory', icon: 'inventory' },
    { href: '/reports', label: 'Reports', icon: 'reports' },
    { href: '/import-export', label: 'Import/Export', icon: 'import-export' }
  ],
  
  procurement: [
    { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { href: '/purchases', label: 'Purchases', icon: 'purchases' },
    { href: '/inventory', label: 'Inventory', icon: 'inventory' },
    { href: '/reports', label: 'Reports', icon: 'reports' },
    { href: '/import-export', label: 'Import/Export', icon: 'import-export' }
  ],
  
  finance: [
    { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { href: '/invoices', label: 'Invoices', icon: 'invoices' },
    { href: '/accounting', label: 'Accounting', icon: 'accounting' },
    { href: '/sales', label: 'Sales', icon: 'sales' },
    { href: '/reports', label: 'Reports', icon: 'reports' }
  ],
  
  auditor: [
    { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { href: '/sales', label: 'Sales', icon: 'sales' },
    { href: '/invoices', label: 'Invoices', icon: 'invoices' },
    { href: '/purchases', label: 'Purchases', icon: 'purchases' },
    { href: '/inventory', label: 'Inventory', icon: 'inventory' },
    { href: '/accounting', label: 'Accounting', icon: 'accounting' },
    { href: '/reports', label: 'Reports', icon: 'reports' },
    { href: '/import-export', label: 'Import/Export', icon: 'import-export' }
  ]
};

// Permission checking functions
export function hasPermission(userRole: UserRole, module: string, action: string): boolean {
  const permissions = rolePermissions[userRole];
  if (!permissions) return false;
  
  const modulePermission = permissions.find(p => p.module === module);
  if (!modulePermission) return false;
  
  return modulePermission.actions.includes(action);
}

export function canAccessModule(userRole: UserRole, module: string): boolean {
  return hasPermission(userRole, module, 'view');
}

export function getNavigationForRole(userRole: UserRole) {
  return navigationItems[userRole] || [];
}
