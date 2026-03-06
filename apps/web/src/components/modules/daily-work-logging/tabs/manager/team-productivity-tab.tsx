'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  TrendingUp,
  AlertTriangle,
  Users,
  Inbox,
} from 'lucide-react';

interface TeamMemberProductivity {
  employeeId: string;
  employeeName: string;
  totalHours: number;
  billableHours: number;
  nonBillableHours: number;
  utilization: number;
  avgHoursPerDay: number;
}

interface UtilizationEntry {
  employeeId: string;
  employeeName: string;
  billableHours: number;
  nonBillableHours: number;
  billablePercent: number;
}

interface IdleTimeAlert {
  employeeId: string;
  employeeName: string;
  idleHours: number;
  date: string;
  reason: string;
}

interface TeamComparison {
  metric: string;
  teamAvg: number;
  orgAvg: number;
  difference: number;
}

export default function TeamProductivityTab() {
  const [members, setMembers] = useState<TeamMemberProductivity[]>([]);
  const [utilization, setUtilization] = useState<UtilizationEntry[]>([]);
  const [idleAlerts, setIdleAlerts] = useState<IdleTimeAlert[]>([]);
  const [comparison, setComparison] = useState<TeamComparison[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setError(null);
    try {
      const [prodRes, utilRes, idleRes, compRes] = await Promise.all([
        api.get('/daily-work-logging/manager/productivity'),
        api.get('/daily-work-logging/manager/productivity/utilization'),
        api.get('/daily-work-logging/manager/productivity/idle-time'),
        api.get('/daily-work-logging/manager/productivity/comparison'),
      ]);
      setMembers(Array.isArray(prodRes.data) ? prodRes.data : prodRes.data?.data || []);
      setUtilization(Array.isArray(utilRes.data) ? utilRes.data : utilRes.data?.data || []);
      setIdleAlerts(Array.isArray(idleRes.data) ? idleRes.data : idleRes.data?.data || []);
      setComparison(Array.isArray(compRes.data) ? compRes.data : compRes.data?.data || []);
    } catch {
      setError('Failed to load productivity data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const renderProgressBar = (percent: number, color: string = 'bg-primary') => (
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div
        className={`${color} h-2 rounded-full transition-all`}
        style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
      />
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading productivity data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Team Productivity
        </h2>
        <p className="text-sm text-text-muted">Analyze team member productivity, utilization, idle time, and benchmarks.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Team Member Productivity Cards */}
      <div>
        <h3 className="text-sm font-semibold text-text mb-3">Team Member Metrics</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {members.map((m) => (
            <div key={m.employeeId} className="bg-card border border-border rounded-xl p-4">
              <h4 className="text-sm font-semibold text-text mb-3">{m.employeeName}</h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-text-muted">Total Hours</span>
                  <span className="font-medium text-text">{m.totalHours.toFixed(1)}h</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Billable</span>
                  <span className="font-medium text-green-700">{m.billableHours.toFixed(1)}h</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Non-Billable</span>
                  <span className="font-medium text-text-muted">{m.nonBillableHours.toFixed(1)}h</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Avg/Day</span>
                  <span className="font-medium text-text">{m.avgHoursPerDay.toFixed(1)}h</span>
                </div>
                <div className="pt-1">
                  <div className="flex justify-between mb-1">
                    <span className="text-text-muted">Utilization</span>
                    <span className="font-medium text-text">{m.utilization.toFixed(0)}%</span>
                  </div>
                  {renderProgressBar(
                    m.utilization,
                    m.utilization >= 80 ? 'bg-green-500' : m.utilization >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                  )}
                </div>
              </div>
            </div>
          ))}
          {members.length === 0 && (
            <div className="col-span-full text-center py-8">
              <Inbox className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm text-text-muted">No productivity data available.</p>
            </div>
          )}
        </div>
      </div>

      {/* Utilization Comparison */}
      <div>
        <h3 className="text-sm font-semibold text-text mb-3 flex items-center gap-2">
          <Users className="h-4 w-4" />
          Billable vs Non-Billable
        </h3>
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-background border-b border-border">
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Employee</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Billable</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Non-Billable</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3 w-48">Distribution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {utilization.map((u) => (
                <tr key={u.employeeId} className="bg-card hover:bg-background/50 transition-colors">
                  <td className="px-4 py-3 text-sm text-text font-medium">{u.employeeName}</td>
                  <td className="px-4 py-3 text-sm text-green-700 font-medium">{u.billableHours.toFixed(1)}h</td>
                  <td className="px-4 py-3 text-sm text-text-muted">{u.nonBillableHours.toFixed(1)}h</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 flex h-2 rounded-full overflow-hidden bg-gray-200">
                        <div className="bg-green-500 h-2" style={{ width: `${u.billablePercent}%` }} />
                        <div className="bg-gray-400 h-2" style={{ width: `${100 - u.billablePercent}%` }} />
                      </div>
                      <span className="text-xs font-medium text-text w-10 text-right">{u.billablePercent.toFixed(0)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
              {utilization.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-sm text-text-muted">No utilization data.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Idle Time Alerts */}
      {idleAlerts.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-text mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            Idle Time Alerts
          </h3>
          <div className="space-y-2">
            {idleAlerts.map((alert, i) => (
              <div key={i} className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-yellow-800">{alert.employeeName}</span>
                  <span className="text-xs text-yellow-700">{new Date(alert.date).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-yellow-700">{alert.reason}</span>
                  <span className="text-sm font-bold text-yellow-800">{alert.idleHours.toFixed(1)}h idle</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Team Average Comparison */}
      {comparison.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-text mb-3">Team vs Organization Average</h3>
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-background border-b border-border">
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Metric</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Team Avg</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Org Avg</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Difference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {comparison.map((c, i) => (
                  <tr key={i} className="bg-card hover:bg-background/50 transition-colors">
                    <td className="px-4 py-3 text-sm text-text font-medium">{c.metric}</td>
                    <td className="px-4 py-3 text-sm text-text-muted">{c.teamAvg.toFixed(1)}</td>
                    <td className="px-4 py-3 text-sm text-text-muted">{c.orgAvg.toFixed(1)}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={c.difference >= 0 ? 'text-green-700 font-medium' : 'text-red-700 font-medium'}>
                        {c.difference >= 0 ? '+' : ''}{c.difference.toFixed(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
