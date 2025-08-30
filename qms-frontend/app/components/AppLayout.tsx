'use client';

import Sidebar from './Sidebar';
import TopBar from './TopBar';
import AuthGuard from './AuthGuard';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <TopBar />
        <main className="ml-64 pt-16 p-6">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}
