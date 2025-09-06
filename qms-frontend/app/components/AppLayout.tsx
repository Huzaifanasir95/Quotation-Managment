'use client';

import Sidebar from './Sidebar';
import TopBar from './TopBar';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Sidebar />
      <TopBar />
      <main className="ml-64 pt-16 p-6 flex-1">
        {children}
      </main>
      
      {/* Footer */}
      <footer className="ml-64 bg-white border-t border-gray-200 py-4 px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              © {new Date().getFullYear()} QMS - Quotation Management System
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
        
        {/* Additional footer info */}
        <div className="mt-2 pt-2 border-t border-gray-100">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <div className="flex items-center space-x-4">
              <span>Built with Next.js & Supabase</span>
              <span>•</span>
              <span>Last updated: {new Date().toLocaleDateString()}</span>
            </div>
            <div className="flex items-center space-x-3">
              <a href="#" className="hover:text-gray-600 transition-colors">Privacy</a>
              <span>•</span>
              <a href="#" className="hover:text-gray-600 transition-colors">Terms</a>
              <span>•</span>
              <a href="#" className="hover:text-gray-600 transition-colors">Support</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
