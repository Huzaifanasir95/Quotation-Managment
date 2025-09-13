'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { apiClient } from '../app/lib/api';
import { UserRole, hasPermission, canAccessModule } from './permissions';

// Cookie utility functions
const setSessionCookie = (name: string, value: string) => {
  if (typeof window === 'undefined') return;
  console.log('🍪 Attempting to set cookie:', name, value.substring(0, 20) + '...');
  
  // Session cookie - expires when browser closes
  // For localhost development, don't use Secure flag
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const secureFlag = !isLocalhost ? ';Secure' : '';
  const cookieString = `${name}=${value};path=/;SameSite=Lax${secureFlag}`;
  
  console.log('🍪 Cookie string:', cookieString);
  document.cookie = cookieString;
  
  // Verify it was set immediately
  const verification = getCookie(name);
  console.log('🍪 Immediate verification:', verification ? 'SUCCESS' : 'FAILED');
};

const getCookie = (name: string): string | null => {
  if (typeof window === 'undefined') return null;
  console.log('🔍 Looking for cookie:', name);
  console.log('🔍 All cookies:', document.cookie);
  
  const nameEQ = name + '=';
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) {
      const value = c.substring(nameEQ.length, c.length);
      console.log('✅ Found cookie:', name, 'value:', value.substring(0, 20) + '...');
      return value;
    }
  }
  console.log('❌ Cookie not found:', name);
  return null;
};

const deleteCookie = (name: string) => {
  if (typeof window === 'undefined') return;
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const secureFlag = !isLocalhost ? ';Secure' : '';
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;SameSite=Lax${secureFlag}`;
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
    // Clean up any existing localStorage auth data
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      console.log('🧹 Cleared any existing localStorage auth data');
    }
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      // Only use session cookies - no localStorage
      const token = getCookie('auth_token');
      
      if (!token) {
        console.log('❌ No token found in session cookies');
        setLoading(false);
        return;
      }

      console.log('✅ Token found in session cookie, checking with backend...');
      // Set token in API client
      apiClient.setToken(token);
      const response = await apiClient.getProfile();
      if (response.success && response.data) {
        console.log('✅ Profile verified, setting user');
        setUser(response.data.user);
      } else {
        console.log('❌ Profile verification failed');
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
    deleteCookie('auth_token');
    apiClient.clearToken();
  };

  const login = async (email: string, password: string) => {
    const startTime = Date.now();
    
    try {
      setLoading(true);
      const response = await apiClient.login(email, password);
      
      if (response.success && response.data.token) {
        console.log('🎯 Setting user data:', response.data.user);
        setUser(response.data.user);
        // Store token only in session cookie (no localStorage)
        setSessionCookie('auth_token', response.data.token);
        const totalTime = Date.now() - startTime;
        console.log('✅ Login completed, token stored in session cookie only');
        
        // Verify cookie was set
        setTimeout(() => {
          const cookieCheck = getCookie('auth_token');
          console.log('🍪 Cookie verification:', cookieCheck ? 'Cookie set successfully' : 'Cookie not found!');
        }, 100);
        
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
