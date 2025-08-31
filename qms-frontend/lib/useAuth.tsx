'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { apiClient } from '../app/lib/api';
import { UserRole, hasPermission, canAccessModule } from './permissions';

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  hasPermission: (module: string, action: string) => boolean;
  canAccessModule: (module: string) => boolean;
  isRole: (role: UserRole) => boolean;
  isAdmin: boolean;
  isSales: boolean;
  isProcurement: boolean;
  isFinance: boolean;
  isAuditor: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setLoading(false);
        return;
      }

      // Refresh token in API client
      apiClient.refreshToken();
      const response = await apiClient.getProfile();
      if (response.success && response.data) {
        setUser(response.data.user);
      } else {
        localStorage.removeItem('auth_token');
        apiClient.clearToken();
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('auth_token');
      apiClient.clearToken();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await apiClient.login(email, password);
      
      if (response.success) {
        setUser(response.data.user);
        return { success: true };
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      throw new Error(error.message || 'An error occurred during login');
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    apiClient.clearToken();
    setUser(null);
    window.location.href = '/';
  };

  const checkPermission = (module: string, action: string): boolean => {
    if (!user) return false;
    return hasPermission(user.role, module, action);
  };

  const checkModuleAccess = (module: string): boolean => {
    if (!user) return false;
    return canAccessModule(user.role, module);
  };

  const isRole = (role: UserRole): boolean => {
    return user?.role === role;
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    hasPermission: checkPermission,
    canAccessModule: checkModuleAccess,
    isRole,
    isAdmin: user?.role === 'admin',
    isSales: user?.role === 'sales',
    isProcurement: user?.role === 'procurement',
    isFinance: user?.role === 'finance',
    isAuditor: user?.role === 'auditor'
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Hook for protected routes
export function useRequireAuth(requiredRole?: UserRole) {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      window.location.href = '/';
    }
    
    if (!loading && user && requiredRole && user.role !== requiredRole && user.role !== 'admin') {
      window.location.href = '/dashboard';
    }
  }, [user, loading, requiredRole]);

  return { user, loading };
}

// Component wrapper for role-based rendering
export function RoleGuard({ 
  children, 
  roles, 
  module, 
  action, 
  fallback 
}: { 
  children: React.ReactNode;
  roles?: UserRole[];
  module?: string;
  action?: string;
  fallback?: React.ReactNode;
}) {
  const { user, hasPermission: checkPermission } = useAuth();

  if (!user) {
    return fallback || null;
  }

  // Check role-based access
  if (roles && !roles.includes(user.role) && user.role !== 'admin') {
    return fallback || null;
  }

  // Check permission-based access
  if (module && action && !checkPermission(module, action)) {
    return fallback || null;
  }

  return <>{children}</>;
}
