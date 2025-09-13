'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { apiClient } from '../app/lib/api';
import { UserRole, hasPermission, canAccessModule } from './permissions';

// Cookie utility functions
const setCookie = (name: string, value: string, days: number) => {
  if (typeof window === 'undefined') return;
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax;Secure`;
};

const getCookie = (name: string): string | null => {
  if (typeof window === 'undefined') return null;
  const nameEQ = name + '=';
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
};

const deleteCookie = (name: string) => {
  if (typeof window === 'undefined') return;
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;SameSite=Lax;Secure`;
};

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
      const token = localStorage.getItem('auth_token') || getCookie('auth_token');
      if (!token) {
        setLoading(false);
        return;
      }

      // Refresh token in API client
      apiClient.refreshToken();
      const response = await apiClient.getProfile();
      if (response.success && response.data) {
        setUser(response.data.user);
        // Ensure token is stored in both localStorage and cookie
        localStorage.setItem('auth_token', token);
        setCookie('auth_token', token, 7); // 7 days
      } else {
        clearAuthData();
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      clearAuthData();
    } finally {
      setLoading(false);
    }
  };

  const clearAuthData = () => {
    localStorage.removeItem('auth_token');
    deleteCookie('auth_token');
    apiClient.clearToken();
  };

  const login = async (email: string, password: string) => {
    const startTime = Date.now();
    
    try {
      setLoading(true);
      const response = await apiClient.login(email, password);
      
      if (response.success && response.data.token) {
        setUser(response.data.user);
        // Store token in both localStorage and cookie
        localStorage.setItem('auth_token', response.data.token);
        setCookie('auth_token', response.data.token, 7); // 7 days
        const totalTime = Date.now() - startTime;
        return { success: true };
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (error: any) {
      const totalTime = Date.now() - startTime;
      console.error(`❌ Login process failed in ${totalTime}ms:`, error);
      throw new Error(error.message || 'An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    clearAuthData();
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
