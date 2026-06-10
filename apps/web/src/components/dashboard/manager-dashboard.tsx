'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Users, UserCheck, Inbox, Star, CalendarOff, MessagesSquare } from 'lucide-react';
import { formatDate, formatDateTime } from '@/lib/format';
import { DashboardHeader } from './dashboard-header';
import { KpiCard } from './kpi-card';
import { WidgetCard, WidgetEmpty } from './widget-card';
import { DonutChart, BarsChart } from './lazy-charts';
import { CHART_COLORS, type ManagerOverview } from './types';

const QUEUE_TYPE_CHIP: Record<string, { label: string; cls: string }> = {
  leave: { label: 'Leave', cls: 'bg-blue-50 text-primary' },
  overtime: { label: 'Overtime', cls: 'bg-amber-50 text-amber-700' },
  timesheet: { label: 'Timesheet', cls: 'bg-background text-text-muted' },
  expense: { label: 'Expense', cls: 'bg-emerald-50 text-[#059669]' },
};

export function ManagerDashboard({ data }: { data: ManagerOverview }) {
  const router = useRouter();
  const { kpis, charts, widgets } = data;
  const att = charts.teamAttendanceToday;

  const donutData = [
    { name: 'Present', value: att.present, color: CHART_COLORS.accent },
    { name: 'Late', value: att.late, color: CHART_COLORS.amber },
    { name: 'Half day', value: att.halfDay, color: CHART_COLORS.primaryTint },
    { name: 'Absent', value: att.absent, color: CHART_COLORS.red },
  ];
  const presentTotal = att.present + att.late + att.halfDay + att.absent;

  const ratingBars = charts.ratingDistribution
    .filter((b) => b.rating !== 'pending')
    .map((b) => ({
      label: `${b.rating}★`,
      value: b.count,
      color: Number(b.rating) >= 4 ? CHART_COLORS.accent : Number(b.rating) >= 3 ? CHART_COLORS.primary : CHART_COLORS.amber,
    }));
  const pendingReviews = charts.ratingDistribution.find((b) => b.rating === 'pending')?.count ?? 0;

  return (
    <div className="space-y-6">
      <DashboardHeader
        greetingName={data.greetingName}
        asOf={data.effectiveDate}
        role="manager"
        actions={[
          { label: 'Review approvals', href: '/dashboard/modules/leave-management', primary: true },
          { label: 'Team directory', href: '/dashboard/modules/core-hr' },
        ]}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard kpi={kpis.teamSize} icon={Users} delayMs={0} />
        <KpiCard kpi={kpis.presentToday} icon={UserCheck} sparkColor={CHART_COLORS.accent} delayMs={60} />
        <KpiCard kpi={kpis.myPendingApprovals} icon={Inbox} delayMs={120} />
        <KpiCard kpi={kpis.teamAvgRating} icon={Star} delayMs={180} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="dash-rise lg:col-span-2 bg-card rounded-2xl border border-border shadow-sm p-5" style={{ ['--rise-delay' as string]: '120ms' }}>
          <h3 className="text-sm font-semibold text-text mb-3">Team attendance today</h3>
          <div className="flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <DonutChart data={donutData} centerLabel={`${att.present + att.late + att.halfDay}`} centerSub={`of ${presentTotal} in`} />
            </div>
            <div className="space-y-2 text-sm shrink-0">
              {donutData.map((d) => (
                <div key={d.name} className="flex items-center gap-2">
                  <span className="inline-block w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: d.color }} />
                  <span className="text-text">{d.name}</span>
                  <span className="text-text-muted">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="dash-rise lg:col-span-3 bg-card rounded-2xl border border-border shadow-sm p-5" style={{ ['--rise-delay' as string]: '180ms' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-text">Team performance ratings</h3>
            <span className="text-xs text-text-muted">
              {pendingReviews > 0 ? `${pendingReviews} reviews in progress` : 'Annual Review FY2025-26'}
            </span>
          </div>
          <BarsChart data={ratingBars} height={220} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <WidgetCard title="Needs your action" badge={kpis.myPendingApprovals.value} accent="primary" delayMs={240}>
          {widgets.approvalsQueue.length === 0 ? (
            <WidgetEmpty icon={Inbox} title="Queue is clear" description="Nothing waiting on you right now." />
          ) : (
            <div className="space-y-2">
              {widgets.approvalsQueue.map((q) => (
                <div key={`${q.type}-${q.id}`} className="flex items-center justify-between gap-2 group">
                  <div className="min-w-0">
                    <p className="text-sm text-text truncate">
                      <span className="font-medium">{q.employeeName}</span>
                      <span
                        className={`ml-1.5 align-middle inline-block text-xs rounded-full px-2 py-0.5 font-medium ${
                          (QUEUE_TYPE_CHIP[q.type] ?? QUEUE_TYPE_CHIP.timesheet).cls
                        }`}
                      >
                        {(QUEUE_TYPE_CHIP[q.type] ?? QUEUE_TYPE_CHIP.timesheet).label}
                      </span>
                    </p>
                    <p className="text-xs text-text-muted truncate">{q.detail}</p>
                  </div>
                  <button
                    onClick={() => router.push(`/dashboard/modules/${q.moduleId}`)}
                    className="shrink-0 text-xs font-medium bg-primary text-white rounded-md px-2.5 py-1 hover:bg-primary-hover transition-colors"
                  >
                    Review
                  </button>
                </div>
              ))}
            </div>
          )}
        </WidgetCard>

        <WidgetCard title="On leave" delayMs={300}>
          {widgets.onLeave.length === 0 ? (
            <WidgetEmpty icon={CalendarOff} title="Full house" description="No one is on leave today or in the next two weeks." />
          ) : (
            <div className="space-y-2.5">
              {widgets.onLeave.map((l, i) => (
                <div key={`${l.employeeName}-${i}`} className="text-sm leading-snug">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-text font-medium truncate">{l.employeeName}</span>
                    <span
                      className={`shrink-0 text-xs rounded-full px-2 py-0.5 font-medium ${
                        l.isCurrent
                          ? 'bg-emerald-50 text-[#059669]'
                          : l.status === 'pending'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-blue-50 text-primary'
                      }`}
                    >
                      {l.isCurrent ? 'today' : l.status === 'pending' ? 'requested' : 'upcoming'}
                    </span>
                  </div>
                  <p className="text-xs text-text-muted mt-0.5">
                    {l.leaveTypeName} · {formatDate(l.fromDate)} → {formatDate(l.toDate)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </WidgetCard>

        <WidgetCard title="Upcoming 1-on-1s" badge={widgets.upcomingOneOnOnes.length} accent="accent" delayMs={360}>
          {widgets.upcomingOneOnOnes.length === 0 ? (
            <WidgetEmpty icon={MessagesSquare} title="Nothing scheduled" description="Plan your next one-on-one from Performance & Growth." />
          ) : (
            <div className="space-y-2.5">
              {widgets.upcomingOneOnOnes.map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-text font-medium truncate">{m.employeeName}</span>
                  <span className="text-xs text-text-muted shrink-0">{formatDateTime(m.scheduledAt)}</span>
                </div>
              ))}
              <Link
                href="/dashboard/modules/performance-growth"
                className="inline-block text-xs text-primary hover:underline mt-1"
              >
                Open Performance & Growth →
              </Link>
            </div>
          )}
        </WidgetCard>
      </div>
    </div>
  );
}
