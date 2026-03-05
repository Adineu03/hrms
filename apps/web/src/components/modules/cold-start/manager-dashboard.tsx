'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import {
  Building2,
  Users,
  Network,
  CheckCircle2,
  Loader2,
  ArrowRight,
} from 'lucide-react';

interface OrgInfo {
  name: string;
  address?: string;
  phone?: string;
  website?: string;
}

interface TeamInfo {
  departmentCount: number;
  employeeCount: number;
  locationCount: number;
}

const CHECKLIST_ITEMS = [
  { id: 'profile', label: 'Complete your profile', description: 'Add your personal and contact information' },
  { id: 'team', label: 'Review your team', description: 'Check the employees reporting to you' },
  { id: 'policies', label: 'Review company policies', description: 'Familiarize yourself with work week and leave policies' },
];

export default function ManagerDashboard() {
  const user = useAuthStore((s) => s.user);
  const [orgInfo, setOrgInfo] = useState<OrgInfo | null>(null);
  const [teamInfo, setTeamInfo] = useState<TeamInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [completedChecklist, setCompletedChecklist] = useState<Set<string>>(
    new Set(),
  );

  useEffect(() => {
    async function loadData() {
      try {
        const [profileRes, dashboardRes] = await Promise.all([
          api.get('/cold-start/company-profile'),
          api.get('/cold-start/settings/dashboard'),
        ]);
        setOrgInfo(profileRes.data);
        setTeamInfo({
          departmentCount: dashboardRes.data.departmentCount || 0,
          employeeCount: dashboardRes.data.employeeCount || 0,
          locationCount: dashboardRes.data.locationCount || 0,
        });
      } catch {
        // Data might not exist yet
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const toggleChecklist = (id: string) => {
    setCompletedChecklist((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-text-muted" />
        <span className="ml-2 text-text-muted">Loading dashboard...</span>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-text mb-6">
        Welcome, {user?.firstName || 'Manager'}
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Organization Info Card */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-text">Organization</h2>
          </div>
          {orgInfo ? (
            <div className="space-y-2">
              <p className="text-sm text-text font-medium">
                {orgInfo.name || user?.orgName}
              </p>
              {orgInfo.address && (
                <p className="text-sm text-text-muted">{orgInfo.address}</p>
              )}
              {orgInfo.phone && (
                <p className="text-sm text-text-muted">{orgInfo.phone}</p>
              )}
              {orgInfo.website && (
                <a
                  href={orgInfo.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                >
                  {orgInfo.website}
                  <ArrowRight className="h-3 w-3" />
                </a>
              )}
            </div>
          ) : (
            <p className="text-sm text-text-muted">
              Organization details not yet configured by admin.
            </p>
          )}
        </div>

        {/* Team Structure Card */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Network className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-text">Team Structure</h2>
          </div>
          {teamInfo ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-muted">Departments</span>
                <span className="text-sm font-semibold text-text">
                  {teamInfo.departmentCount}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-muted">Employees</span>
                <span className="text-sm font-semibold text-text">
                  {teamInfo.employeeCount}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-muted">Locations</span>
                <span className="text-sm font-semibold text-text">
                  {teamInfo.locationCount}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-text-muted">
              Team data not available yet.
            </p>
          )}
        </div>

        {/* Getting Started Checklist Card */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-text">Getting Started</h2>
          </div>
          <div className="space-y-3">
            {CHECKLIST_ITEMS.map((item) => {
              const isComplete = completedChecklist.has(item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => toggleChecklist(item.id)}
                  className="w-full flex items-start gap-3 text-left group"
                >
                  <div
                    className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      isComplete
                        ? 'bg-primary border-primary'
                        : 'border-border group-hover:border-primary'
                    }`}
                  >
                    {isComplete && (
                      <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                    )}
                  </div>
                  <div>
                    <p
                      className={`text-sm font-medium transition-colors ${
                        isComplete
                          ? 'text-text-muted line-through'
                          : 'text-text'
                      }`}
                    >
                      {item.label}
                    </p>
                    <p className="text-xs text-text-muted mt-0.5">
                      {item.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="mt-4 pt-3 border-t border-border">
            <p className="text-xs text-text-muted">
              {completedChecklist.size} of {CHECKLIST_ITEMS.length} completed
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
