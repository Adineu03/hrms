'use client';

import type { ReactNode } from 'react';
import { EmptyState } from '@/components/ui/empty-state';
import type { LucideIcon } from 'lucide-react';

const ACCENT_COLOR: Record<string, string> = {
  primary: '#2563eb',
  accent: '#059669',
  amber: '#d97706',
};

/**
 * White matte card for dashboard row 3. `accent` renders a small inner pill bar
 * on the left edge (keeps the 2xl radius clean — no single-sided borders).
 */
export function WidgetCard({
  title,
  badge,
  accent,
  action,
  children,
  delayMs = 0,
  className = '',
}: {
  title: string;
  badge?: string | number;
  accent?: 'primary' | 'accent' | 'amber';
  action?: ReactNode;
  children: ReactNode;
  delayMs?: number;
  className?: string;
}) {
  return (
    <div
      className={`dash-rise relative bg-card rounded-2xl border border-border shadow-sm hover:shadow-md transition-shadow p-5 ${className}`}
      style={{ ['--rise-delay' as string]: `${delayMs}ms` }}
    >
      {accent && (
        <span
          className="absolute left-0 top-5 bottom-5 w-[3px] rounded-full"
          style={{ backgroundColor: ACCENT_COLOR[accent] }}
          aria-hidden="true"
        />
      )}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-text flex items-center gap-2">
          {title}
          {badge !== undefined && (
            <span className="text-xs font-medium bg-background text-text-muted rounded-full px-2 py-0.5">{badge}</span>
          )}
        </h3>
        {action}
      </div>
      {children}
    </div>
  );
}

export function WidgetEmpty({ icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
  return (
    <div className="py-2">
      <EmptyState icon={icon} title={title} description={description} />
    </div>
  );
}
