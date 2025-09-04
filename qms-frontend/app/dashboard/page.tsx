'use client';

import AppLayout from '../components/AppLayout';
import { SuspenseWrapper, ComponentLoadingFallback } from '../components/SuspenseWrapper';
import { LazyRoleBasedDashboard } from '../components/LazyComponents';

export default function DashboardPage() {
  return (
    <AppLayout>
      <SuspenseWrapper fallback={<ComponentLoadingFallback />}>
        <LazyRoleBasedDashboard />
      </SuspenseWrapper>
    </AppLayout>
  );
}
