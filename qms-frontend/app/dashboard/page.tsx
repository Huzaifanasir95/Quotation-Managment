'use client';

import AppLayout from '../components/AppLayout';
import RoleBasedDashboard from '../components/dashboard/RoleBasedDashboard';

export default function DashboardPage() {
  return (
    <AppLayout>
      <RoleBasedDashboard />
    </AppLayout>
  );
}
