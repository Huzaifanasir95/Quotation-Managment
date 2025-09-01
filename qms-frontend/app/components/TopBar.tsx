'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../../lib/useAuth';

const pageTitles: { [key: string]: string } = {
  '/dashboard': 'Dashboard',
  '/sales': 'Sales',
  '/purchases': 'Purchases',
  '/inventory': 'Inventory',
  '/accounting': 'Accounting',
  '/import-export': 'Import/Export',
  '/reports': 'Reports',
  '/settings': 'Settings',
};

export default function TopBar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  // Handle logout
  const handleSignOut = async () => {
    try {
      logout();
      router.push('/');
    } catch (error) {
      console.error('Sign out error:', error);
      router.push('/');
    }
  };

  const currentPageTitle = pageTitles[pathname] || 'Dashboard';
  
  // Display role-based names instead of user first/last name
  const getUserDisplayName = () => {
    if (!user) return 'User';
    switch (user.role) {
      case 'admin':
        return 'Administrator';
      case 'sales':
        return 'Sales Manager';
      case 'procurement':
        return 'Procurement Manager';
      case 'finance':
        return 'Finance Manager';
      case 'auditor':
        return 'Auditor';
      default:
        return user.first_name || 'User';
    }
  };
  
  const userName = getUserDisplayName();
  const userEmail = user?.email || 'user@qms.com';

  return (
    <div className="fixed top-0 left-64 right-0 h-16 shadow-sm border-b border-[#6b5b7a] z-40" style={{ backgroundColor: '#56425b' }}>
      <div className="flex items-center justify-between h-full px-6">
        {/* Left side - Page title */}
        <div className="flex items-center">
          <h2 className="text-xl font-semibold text-white">{currentPageTitle}</h2>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center space-x-4">
          {/* Profile - Display only */}
          <div className="flex items-center space-x-2 p-2 text-white">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-sm font-medium">{userName}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
