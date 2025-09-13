'use client';

import { useAuth } from '@/lib/useAuth';
import { UserRole } from '@/lib/permissions';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: UserRole | UserRole[];
  redirectTo?: string;
}

export default function ProtectedRoute({ 
  children, 
  requiredRole, 
  redirectTo = '/'
}: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      // If no user is logged in, redirect to login
      if (!user) {
        const loginUrl = `${redirectTo}?redirect=${encodeURIComponent(pathname)}`;
        router.replace(loginUrl);
        return;
      }

      // Check role-based access if required
      if (requiredRole) {
        const requiredRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
        const hasRequiredRole = requiredRoles.includes(user.role) || user.role === 'admin';
        
        if (!hasRequiredRole) {
          // Redirect to dashboard if user doesn't have required role
          router.replace('/dashboard');
          return;
        }
      }
    }
  }, [user, loading, router, pathname, requiredRole, redirectTo]);

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render anything if user is not authenticated or doesn't have required role
  if (!user) {
    return null;
  }

  // Check role access again before rendering
  if (requiredRole) {
    const requiredRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    const hasRequiredRole = requiredRoles.includes(user.role) || user.role === 'admin';
    
    if (!hasRequiredRole) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
            <p className="text-gray-600 mb-4">You don't have permission to access this page.</p>
            <button 
              onClick={() => router.push('/dashboard')}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}

// Hook for easy route protection
export function useProtectedRoute(requiredRole?: UserRole | UserRole[]) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      const loginUrl = `/?redirect=${encodeURIComponent(pathname)}`;
      router.replace(loginUrl);
    }
  }, [user, loading, router, pathname]);

  return { user, loading, isAuthenticated: !!user };
}
