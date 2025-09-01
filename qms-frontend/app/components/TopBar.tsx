'use client';

import { useState, useEffect, useRef } from 'react';
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
  const [showProfile, setShowProfile] = useState(false);
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const profileRef = useRef<HTMLDivElement>(null);

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

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfile(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentPageTitle = pageTitles[pathname] || 'Dashboard';
  const userName = user ? `${user?.first_name || 'User'} ${user?.last_name || 'Name'}` : 'User';
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
          {/* Profile */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setShowProfile(!showProfile)}
              className="flex items-center space-x-2 p-2 text-white hover:text-white hover:bg-[#6b5b7a] rounded-lg transition-colors duration-200"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="text-sm font-medium">{userName}</span>
            </button>

            {/* Profile dropdown */}
            {showProfile && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                <div className="px-4 py-2 border-b border-gray-200">
                  <p className="text-sm font-medium text-gray-800">{userName}</p>
                  <p className="text-xs text-gray-500">{userEmail}</p>
                </div>
                <div className="py-1">
                  <a href="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    Profile Settings
                  </a>
                  <a href="/account" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    Account Settings
                  </a>
                  <button 
                    onClick={handleSignOut}
                    className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
