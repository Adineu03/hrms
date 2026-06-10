'use client';

import Link from 'next/link';
import { Users, Clock, Inbox, Wallet, ShieldAlert, UserPlus, FileClock } from 'lucide-react';
import { formatDateTime } from '@/lib/format';
import { DashboardHeader } from './dashboard-header';
import { KpiCard } from './kpi-card';
import { WidgetCard, WidgetEmpty } from './widget-card';
import { TrendAreaChart, DonutChart } from './lazy-charts';
import { CATEGORICAL_COLORS, CHART_COLORS, type AdminOverview } from './types';

const ACTION_LABEL: Record<string, string> = {
  create: 'created',
  update: 'updated',
  delete: 'deleted',
  view: 'viewed',
  export: 'exported',
  data_request: 'requested data for',
};

function timeAgo(iso: string, asOf: string): string {
  const ms = new Date(asOf + 'T23:59:59Z').getTime() - new Date(iso).getTime();
  const hours = Math.max(0, Math.round(ms / 3_600_000));
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function AdminDashboard({ data }: { data: AdminOverview }) {
  const { kpis, charts, widgets } = data;
  const deptTotal = charts.departmentDistribution.reduce((s, d) => s + d.value, 0);
  const funnelMax = Math.max(...widgets.hiringFunnel.map((f) => f.count), 1);

  return (
    <div className="space-y-6">
      <DashboardHeader
        greetingName={data.greetingName}
        asOf={data.effectiveDate}
        role="admin"
        actions={[
          { label: '+ Add employee', href: '/dashboard/modules/core-hr', primary: true },
          { label: 'Run payroll', href: '/dashboard/modules/payroll-processing' },
          { label: 'Module setup', href: '/dashboard/modules/cold-start-setup' },
        ]}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard kpi={kpis.headcount} icon={Users} delayMs={0} />
        <KpiCard kpi={kpis.attendanceRate} icon={Clock} sparkColor={CHART_COLORS.accent} delayMs={60} />
        <KpiCard kpi={kpis.pendingApprovals} icon={Inbox} delayMs={120} />
        <KpiCard kpi={kpis.monthlyPayrollCost} icon={Wallet} sparkColor={CHART_COLORS.muted} delayMs={180} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="dash-rise lg:col-span-3 bg-card rounded-2xl border border-border shadow-sm p-5" style={{ ['--rise-delay' as string]: '120ms' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-text">Headcount trend</h3>
            <span className="text-xs text-text-muted">Last 12 months</span>
          </div>
          <TrendAreaChart data={charts.headcountTrend} zoomYAxis />
        </div>
        <div className="dash-rise lg:col-span-2 bg-card rounded-2xl border border-border shadow-sm p-5" style={{ ['--rise-delay' as string]: '180ms' }}>
          <h3 className="text-sm font-semibold text-text mb-2">People by department</h3>
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <DonutChart
                data={charts.departmentDistribution.map((d) => ({ name: d.name, value: d.value }))}
                height={170}
                centerLabel={String(deptTotal)}
                centerSub="employees"
              />
            </div>
            <div className="space-y-1.5 text-sm shrink-0">
              {charts.departmentDistribution.map((d, i) => (
                <div key={d.name} className="flex items-center gap-2">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-sm shrink-0"
                    style={{ backgroundColor: CATEGORICAL_COLORS[i % CATEGORICAL_COLORS.length] }}
                  />
                  <span className="text-text truncate max-w-[120px]">{d.name}</span>
                  <span className="text-text-muted">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <WidgetCard title="Approvals waiting" badge={kpis.pendingApprovals.value} accent="primary" delayMs={240}>
          <div className="space-y-2.5">
            {widgets.pendingApprovals.map((a) => (
              <Link
                key={a.type}
                href={`/dashboard/modules/${a.moduleId}`}
                className="flex items-center justify-between text-sm text-text hover:text-primary transition-colors group"
              >
                <span>{a.label}</span>
                <span className="text-xs font-medium bg-blue-50 text-primary rounded-full px-2 py-0.5 group-hover:bg-primary group-hover:text-white transition-colors">
                  {a.count}
                </span>
              </Link>
            ))}
          </div>
        </WidgetCard>

        <WidgetCard title="Recent activity" delayMs={300}>
          {widgets.recentActivity.length === 0 ? (
            <WidgetEmpty icon={FileClock} title="No activity yet" description="Audit events will appear here." />
          ) : (
            <div className="space-y-2.5">
              {widgets.recentActivity.slice(0, 6).map((a) => (
                <div key={a.id} className="flex items-baseline justify-between gap-2 text-sm leading-snug">
                  <div className="min-w-0 truncate">
                    <span className="text-text font-medium">{a.userName}</span>{' '}
                    <span className="text-text-muted">{ACTION_LABEL[a.action] ?? a.action}</span>{' '}
                    <span className="text-text">{a.entity.replace(/_/g, ' ')}</span>
                  </div>
                  <span className="shrink-0 text-xs text-text-muted" title={formatDateTime(a.createdAt)}>
                    {timeAgo(a.createdAt, data.effectiveDate)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </WidgetCard>

        <WidgetCard title="Compliance alerts" badge={widgets.complianceAlerts.length} accent="amber" delayMs={360}>
          {widgets.complianceAlerts.length === 0 ? (
            <WidgetEmpty icon={ShieldAlert} title="All clear" description="No documents or certifications expiring soon." />
          ) : (
            <div className="space-y-2.5">
              {widgets.complianceAlerts.slice(0, 4).map((c, i) => (
                <div key={`${c.name}-${i}`} className="text-sm leading-snug">
                  <span
                    className={
                      c.severity === 'expired'
                        ? 'text-red-600 font-medium'
                        : c.severity === 'critical'
                          ? 'text-amber-700 font-medium'
                          : 'text-text'
                    }
                  >
                    {c.name}
                  </span>
                  <div className="text-xs text-text-muted mt-0.5">
                    {c.employeeName} ·{' '}
                    {c.daysLeft < 0 ? `expired ${Math.abs(c.daysLeft)}d ago` : `expires in ${c.daysLeft}d`}
                  </div>
                </div>
              ))}
            </div>
          )}
        </WidgetCard>

        <WidgetCard
          title="Hiring funnel"
          accent="accent"
          delayMs={420}
          action={
            <Link href="/dashboard/modules/talent-acquisition" className="text-xs text-primary hover:underline">
              View all →
            </Link>
          }
        >
          {widgets.hiringFunnel.every((f) => f.count === 0) ? (
            <WidgetEmpty icon={UserPlus} title="No open pipeline" description="Hiring activity will appear here." />
          ) : (
            <div className="space-y-2.5">
              {widgets.hiringFunnel.map((f) => (
                <div key={f.stage} className="text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-text capitalize">{f.stage}</span>
                    <span className="text-text-muted text-xs font-medium">{f.count}</span>
                  </div>
                  <div className="h-1.5 bg-background rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${(f.count / funnelMax) * 100}%`, backgroundColor: CHART_COLORS.accent }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </WidgetCard>
      </div>
    </div>
  );
}
