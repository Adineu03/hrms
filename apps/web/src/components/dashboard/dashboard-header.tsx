'use client';

import Link from 'next/link';
import { formatDate } from '@/lib/format';

const ROLE_BADGE: Record<string, { label: string; cls: string }> = {
  super_admin: { label: 'Super Admin', cls: 'bg-purple-100 text-purple-700' },
  admin: { label: 'Admin', cls: 'bg-blue-100 text-blue-700' },
  manager: { label: 'Manager', cls: 'bg-green-100 text-green-700' },
  employee: { label: 'Employee', cls: 'bg-gray-100 text-gray-700' },
};

export interface QuickAction {
  label: string;
  href: string;
  primary?: boolean;
}

export function DashboardHeader({
  greetingName,
  asOf,
  role,
  actions,
}: {
  greetingName: string;
  asOf: string;
  role: string;
  actions: QuickAction[];
}) {
  const badge = ROLE_BADGE[role] ?? ROLE_BADGE.employee;
  return (
    <div className="dash-rise flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-text">Good morning, {greetingName}</h1>
        <p className="text-sm text-text-muted mt-1">
          {formatDate(asOf)}
          <span className={`ml-2 text-xs px-2 py-0.5 rounded-full font-medium align-middle ${badge.cls}`}>
            {badge.label}
          </span>
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {actions.map((a) => (
          <Link
            key={a.label}
            href={a.href}
            className={`text-sm px-3.5 py-2 rounded-lg font-medium transition-colors ${
              a.primary
                ? 'bg-primary text-white hover:bg-primary-hover'
                : 'bg-card border border-border text-text hover:bg-background'
            }`}
          >
            {a.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
