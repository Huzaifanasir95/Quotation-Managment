'use client';


import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { useState } from 'react';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Sidebar is always open on desktop, togglable on mobile
  const handleSidebarToggle = () => setSidebarOpen((open) => !open);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Sidebar: hidden on mobile unless open, always visible on md+ */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      {/* TopBar gets toggle button for mobile */}
      <TopBar onSidebarToggle={handleSidebarToggle} />
      <main
        className={`pt-16 p-6 flex-1 transition-all duration-300
          ml-0 md:ml-64
        `}
        style={{
          marginLeft: sidebarOpen ? 0 : undefined,
        }}
      >
        {children}
      </main>
      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-4 px-6 ml-0 md:ml-64 transition-all duration-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              © {new Date().getFullYear()} QMS - Anoosh International
            </div>
            <div className="h-4 border-l border-gray-300"></div>
            <div className="text-sm text-gray-500">
              Version 1.0.0
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">Powered by</span>
            <div className="flex items-center space-x-1">
              <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-gray-700">
                Quantum Catalyst LLC-DCBPO
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
