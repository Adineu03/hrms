'use client';

import { useAuthStore } from '@/lib/auth-store';
import { MODULE_LIST } from '@hrms/shared';
import { Boxes, ArrowRight } from 'lucide-react';

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  if (!user) return null;

  return (
    <div className="max-w-4xl">
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text">Welcome, {user.firstName}!</h1>
        <p className="text-text-muted mt-1">Your organization: {user.orgName}</p>
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
