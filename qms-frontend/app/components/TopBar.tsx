'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../../lib/useAuth';

const pageTitles: { [key: string]: string } = {
  '/dashboard': 'Dashboard',
  '/sales': 'Sales',
  '/invoices': 'Recievable Invoices',
  '/payable-invoices': 'Payable Invoices',
  '/purchases': 'Purchases',
  '/inventory': 'Inventory',
  '/accounting': 'Accounting',
  '/import-export': 'Import/Export',
  '/reports': 'Reports',
  '/settings': 'Settings',
};

interface TopBarProps {
  onSidebarToggle?: () => void;
}

export default function TopBar({ onSidebarToggle }: TopBarProps) {
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

  // Find the first key in pageTitles that matches the start of the pathname
  const currentPageTitle =
    Object.entries(pageTitles).find(([key]) => pathname.startsWith(key))?.[1] || 'Dashboard';
  
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
    <div
      className="fixed top-0 right-0 h-16 shadow-sm border-b border-[#6b5b7a] z-40 w-full md:ml-64 transition-all duration-300"
      style={{ backgroundColor: '#56425b' }}
    >
      <div className="flex items-center justify-between h-full px-4 md:px-6">
        {/* Left side - Hamburger for mobile, Page title */}
        <div className="flex items-center">
          {/* Hamburger only on mobile */}
          <button
            className="md:hidden mr-2 text-white focus:outline-none"
            onClick={onSidebarToggle}
            aria-label="Open sidebar"
          >
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
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
