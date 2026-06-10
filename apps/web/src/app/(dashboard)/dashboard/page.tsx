'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, RotateCw } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { api } from '@/lib/api';
import { StatCardSkeleton, CardSkeleton, Skeleton } from '@/components/ui/skeleton';
import { AdminDashboard } from '@/components/dashboard/admin-dashboard';
import { ManagerDashboard } from '@/components/dashboard/manager-dashboard';
import { EmployeeDashboard } from '@/components/dashboard/employee-dashboard';
import type { DashboardOverview } from '@/components/dashboard/types';

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3">
          <CardSkeleton />
        </div>
        <div className="lg:col-span-2">
          <CardSkeleton />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setIsLoading(true);
    setError(false);
    api
      .get<DashboardOverview>('/dashboard/overview')
      .then((res) => setOverview(res.data))
      .catch(() => setError(true))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!user) return null;
  if (isLoading) return <DashboardSkeleton />;

  if (error || !overview) {
    return (
      <div className="max-w-md mx-auto mt-16 bg-card rounded-2xl border border-border shadow-sm p-8 text-center">
        <AlertCircle className="h-8 w-8 text-text-muted mx-auto mb-3" />
        <h2 className="text-lg font-semibold text-text">Couldn&apos;t load your dashboard</h2>
        <p className="text-sm text-text-muted mt-1 mb-5">Check that the API is reachable and try again.</p>
        <button
          onClick={load}
          className="inline-flex items-center gap-2 text-sm font-medium bg-primary text-white rounded-lg px-4 py-2 hover:bg-primary-hover transition-colors"
        >
          <RotateCw className="h-4 w-4" />
          Retry
        </button>
      </div>
    );
  }

  if (overview.role === 'admin') return <AdminDashboard data={overview} />;
  if (overview.role === 'manager') return <ManagerDashboard data={overview} />;
  return <EmployeeDashboard data={overview} />;
}
