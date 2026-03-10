'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { api } from '@/lib/api';
import { MODULE_LIST } from '@hrms/shared';
import { Boxes, Users, CheckCircle2, Clock, ArrowRight } from 'lucide-react';
import { StatCardSkeleton } from '@/components/ui/skeleton';

interface OrgStats {
  totalEmployees: number;
  activeModules: number;
  pendingApprovals: number;
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const [stats, setStats] = useState<OrgStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api
      .get<OrgStats>('/dashboard/stats')
      .then((res) => setStats(res.data))
      .catch(() => {/* stats are best-effort */})
      .finally(() => setIsLoading(false));
  }, []);

  if (!user) return null;

  return (
    <div className="max-w-4xl space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-text">Welcome, {user.firstName}!</h1>
        <p className="text-text-muted mt-1">Your organization: {user.orgName}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {isLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <div className="bg-card rounded-xl shadow-sm border border-border p-5 flex items-center gap-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-text">{stats?.totalEmployees ?? 0}</p>
                <p className="text-sm text-text-muted">Active Employees</p>
              </div>
            </div>

            <div className="bg-card rounded-xl shadow-sm border border-border p-5 flex items-center gap-4">
              <div className="p-3 bg-green-50 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-text">{stats?.activeModules ?? 0}</p>
                <p className="text-sm text-text-muted">Active Modules</p>
              </div>
            </div>

            <div className="bg-card rounded-xl shadow-sm border border-border p-5 flex items-center gap-4">
              <div className="p-3 bg-amber-50 rounded-lg">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-text">{stats?.pendingApprovals ?? 0}</p>
                <p className="text-sm text-text-muted">Pending Approvals</p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modules Card */}
      <div className="bg-card rounded-xl shadow-sm border border-border p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-50 rounded-lg">
            <Boxes className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-text">Modules</h2>
            <p className="text-text-muted mt-1">
              Your HRMS includes <span className="font-semibold text-text">{MODULE_LIST.length}</span> modules
              ready to be configured. Start by setting up Core HR, then proceed through each module
              in order to build your complete HR platform.
            </p>
            <div className="mt-4 flex items-center gap-2 text-sm text-primary font-medium">
              <ArrowRight className="h-4 w-4" />
              Begin setup with module configuration
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
