'use client';

import Link from 'next/link';
import { CalendarDays, Clock, Target, Wallet, Inbox, PartyPopper } from 'lucide-react';
import { formatDate } from '@/lib/format';
import { DashboardHeader } from './dashboard-header';
import { KpiCard } from './kpi-card';
import { WidgetCard, WidgetEmpty } from './widget-card';
import { TrendAreaChart, BarsChart } from './lazy-charts';
import { CHART_COLORS, type EmployeeOverview } from './types';

const STATUS_CHIP: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700',
  in_review: 'bg-blue-50 text-primary',
  draft: 'bg-background text-text-muted',
  submitted: 'bg-blue-50 text-primary',
};

const GOAL_STATUS: Record<string, { label: string; cls: string; bar: string }> = {
  on_track: { label: 'On track', cls: 'bg-emerald-50 text-[#059669]', bar: CHART_COLORS.accent },
  at_risk: { label: 'At risk', cls: 'bg-amber-50 text-amber-700', bar: CHART_COLORS.amber },
  completed: { label: 'Done', cls: 'bg-background text-text-muted', bar: CHART_COLORS.muted },
  draft: { label: 'Draft', cls: 'bg-background text-text-muted', bar: CHART_COLORS.muted },
};

export function EmployeeDashboard({ data }: { data: EmployeeOverview }) {
  const { kpis, charts, widgets } = data;

  // Weekly present-day counts from the daily trend (4–5 compact bars on mobile-friendly axis)
  const weeks: { label: string; value: number }[] = [];
  for (let i = 0; i < charts.myAttendanceTrend.length; i += 5) {
    const slice = charts.myAttendanceTrend.slice(i, i + 5);
    if (!slice.length) break;
    weeks.push({
      label: formatDate(slice[0].date).split(' ').slice(0, 2).join(' '),
      value: Math.round(slice.reduce((s, p) => s + p.value, 0) * 10) / 10,
    });
  }

  const leaveBars = charts.leaveBalanceByType.map((b, i) => ({
    label: b.code || b.leaveType,
    value: b.available,
    color: [CHART_COLORS.primary, CHART_COLORS.accent, CHART_COLORS.primaryTint][i % 3],
  }));

  return (
    <div className="space-y-6">
      <DashboardHeader
        greetingName={data.greetingName}
        asOf={data.effectiveDate}
        role="employee"
        actions={[
          { label: 'Apply leave', href: '/dashboard/modules/leave-management', primary: true },
          { label: 'Submit expense', href: '/dashboard/modules/expense-management' },
          { label: 'My attendance', href: '/dashboard/modules/attendance' },
        ]}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard kpi={kpis.leaveBalanceTotal} icon={CalendarDays} delayMs={0} />
        <KpiCard kpi={kpis.attendanceRateMTD} icon={Clock} sparkColor={CHART_COLORS.accent} delayMs={60} />
        <KpiCard kpi={kpis.openGoals} icon={Target} delayMs={120} />
        <KpiCard kpi={kpis.lastPayslipNet} icon={Wallet} delayMs={180} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="dash-rise lg:col-span-2 bg-card rounded-2xl border border-border shadow-sm p-5" style={{ ['--rise-delay' as string]: '120ms' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-text">Leave balance by type</h3>
            <span className="text-xs text-text-muted">days available</span>
          </div>
          <BarsChart data={leaveBars} height={200} />
          <div className="mt-2 space-y-1">
            {charts.leaveBalanceByType.map((b) => (
              <div key={b.code} className="flex justify-between text-xs text-text-muted">
                <span>
                  {b.leaveType} ({b.code})
                </span>
                <span>
                  {b.used} used · {b.available} left
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="dash-rise lg:col-span-3 bg-card rounded-2xl border border-border shadow-sm p-5" style={{ ['--rise-delay' as string]: '180ms' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-text">My attendance</h3>
            <span className="text-xs text-text-muted">days present per week · last 4 weeks</span>
          </div>
          <TrendAreaChart data={weeks} color={CHART_COLORS.accent} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <WidgetCard title="My requests" badge={widgets.myRequests.length} accent="primary" delayMs={240}>
          {widgets.myRequests.length === 0 ? (
            <WidgetEmpty icon={Inbox} title="No open requests" description="Leave, expense and HR requests you raise will appear here." />
          ) : (
            <div className="space-y-2.5">
              {widgets.myRequests.slice(0, 6).map((r) => (
                <div key={`${r.type}-${r.id}`} className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-text truncate">{r.title}</span>
                  <span
                    className={`shrink-0 text-xs rounded-full px-2 py-0.5 font-medium capitalize ${STATUS_CHIP[r.status] ?? 'bg-background text-text-muted'}`}
                  >
                    {r.status.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </WidgetCard>

        <WidgetCard title="Upcoming holidays" delayMs={300}>
          {widgets.upcomingHolidays.length === 0 ? (
            <WidgetEmpty icon={PartyPopper} title="No holidays listed" description="Your org's holiday calendar is empty for the rest of the year." />
          ) : (
            <div className="space-y-2.5">
              {widgets.upcomingHolidays.map((h) => (
                <div key={`${h.name}-${h.date}`} className="flex items-center justify-between gap-2 text-sm">
                  <div className="min-w-0">
                    <span className="text-text truncate">{h.name}</span>
                    {h.isOptional && <span className="ml-1.5 text-xs text-text-muted">(optional)</span>}
                  </div>
                  <span className="text-xs text-text-muted shrink-0">{formatDate(h.date)}</span>
                </div>
              ))}
            </div>
          )}
        </WidgetCard>

        <WidgetCard
          title="My goals"
          accent="accent"
          delayMs={360}
          action={
            <Link href="/dashboard/modules/performance-growth" className="text-xs text-primary hover:underline">
              View all →
            </Link>
          }
        >
          {widgets.goalsList.length === 0 ? (
            <WidgetEmpty icon={Target} title="No goals yet" description="Goals assigned in Performance & Growth show up here." />
          ) : (
            <div className="space-y-3">
              {widgets.goalsList.slice(0, 4).map((g) => {
                const st = GOAL_STATUS[g.status] ?? GOAL_STATUS.draft;
                return (
                  <div key={g.id} className="text-sm">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-text truncate">{g.title}</span>
                      <span className={`shrink-0 text-xs rounded-full px-2 py-0.5 font-medium ${st.cls}`}>{st.label}</span>
                    </div>
                    <div className="h-1.5 bg-background rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${Math.min(g.progress, 100)}%`, backgroundColor: st.bar }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </WidgetCard>
      </div>
    </div>
  );
}
