'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  BarChart3,
  Loader2,
  AlertCircle,
  Inbox,
  DollarSign,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

interface AnalyticsSummary {
  totalReports: number;
  totalAmount: number;
  pendingCount: number;
  pendingAmount: number;
  approvedCount: number;
  approvedAmount: number;
  rejectedCount: number;
  rejectedAmount: number;
  reimbursedCount: number;
  reimbursedAmount: number;
}

interface DepartmentBreakdown {
  id: string;
  department: string;
  reportCount: number;
  totalAmount: number;
  averageAmount: number;
  pendingCount: number;
}

interface MonthlyTrend {
  id: string;
  month: string;
  year: number;
  totalAmount: number;
  reportCount: number;
  change: number;
}

interface PolicyViolation {
  id: string;
  employeeName: string;
  reportTitle: string;
  violationType: string;
  amount: number;
  limit: number;
  detectedAt: string;
}

// Coerce drizzle numeric (string) / nullable values to a safe number.
const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export default function ExpenseAnalyticsTab() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [departments, setDepartments] = useState<DepartmentBreakdown[]>([]);
  const [trends, setTrends] = useState<MonthlyTrend[]>([]);
  const [violations, setViolations] = useState<PolicyViolation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [summaryRes, deptRes, trendRes, violationRes] = await Promise.all([
        api.get('/expense-management/admin/analytics/summary').catch(() => ({ data: null })),
        api.get('/expense-management/admin/analytics/department-breakdown').catch(() => ({ data: [] })),
        api.get('/expense-management/admin/analytics/trends').catch(() => ({ data: [] })),
        api.get('/expense-management/admin/analytics/policy-violations').catch(() => ({ data: [] })),
      ]);

      const summaryData = summaryRes.data?.data || summaryRes.data || {};
      const deptRaw = Array.isArray(deptRes.data) ? deptRes.data : deptRes.data?.data || [];
      const trendRaw = Array.isArray(trendRes.data) ? trendRes.data : trendRes.data?.data || [];
      const violationRaw = Array.isArray(violationRes.data) ? violationRes.data : violationRes.data?.data || [];

      // Backend summary shape: { totalReports, overallTotal, byStatus: [{ status, count, totalAmount }] }
      const byStatus: Array<{ status: string; count: number; totalAmount: string }> = Array.isArray(summaryData.byStatus)
        ? summaryData.byStatus
        : [];
      const statusAgg = (s: string) => byStatus.find((b) => b.status === s) ?? { count: 0, totalAmount: '0' };
      const pending = byStatus.filter((b) => b.status === 'submitted' || b.status === 'under_review');
      const pendingCount = pending.reduce((sum, b) => sum + num(b.count), 0);
      const pendingAmount = pending.reduce((sum, b) => sum + num(b.totalAmount), 0);

      setSummary({
        totalReports: num(summaryData.totalReports),
        totalAmount: num(summaryData.overallTotal ?? summaryData.totalAmount),
        pendingCount,
        pendingAmount,
        approvedCount: num(statusAgg('approved').count),
        approvedAmount: num(statusAgg('approved').totalAmount),
        rejectedCount: num(statusAgg('rejected').count),
        rejectedAmount: num(statusAgg('rejected').totalAmount),
        reimbursedCount: num(statusAgg('reimbursed').count),
        reimbursedAmount: num(statusAgg('reimbursed').totalAmount),
      });

      // Backend dept shape: { departmentId, departmentName, reportCount, totalAmount, uniqueEmployees }
      const deptData: DepartmentBreakdown[] = (Array.isArray(deptRaw) ? deptRaw : []).map((d: any, idx: number) => {
        const reportCount = num(d.reportCount);
        const totalAmount = num(d.totalAmount);
        return {
          id: d.departmentId ?? `dept-${idx}`,
          department: d.departmentName ?? 'Unknown',
          reportCount,
          totalAmount,
          averageAmount: reportCount > 0 ? totalAmount / reportCount : 0,
          pendingCount: num(d.pendingCount),
        };
      });

      // Backend trend shape: { period: "YYYY-MM", reportCount, totalAmount } (sorted asc)
      const trendData: MonthlyTrend[] = (Array.isArray(trendRaw) ? trendRaw : []).map((t: any, idx: number, arr: any[]) => {
        const [yearStr, monthStr] = String(t.period ?? '').split('-');
        const year = num(yearStr);
        const monthIdx = num(monthStr) - 1;
        const totalAmount = num(t.totalAmount);
        const prev = idx > 0 ? num(arr[idx - 1].totalAmount) : 0;
        const change = prev > 0 ? ((totalAmount - prev) / prev) * 100 : 0;
        return {
          id: t.period ?? `trend-${idx}`,
          month: MONTH_NAMES[monthIdx] ?? t.period ?? '',
          year,
          totalAmount,
          reportCount: num(t.reportCount),
          change,
        };
      });

      // Backend violation shape: { reportId, reportTitle, employeeId, totalAmount, violationType, policyName, limit }
      const violationData: PolicyViolation[] = (Array.isArray(violationRaw) ? violationRaw : []).map((v: any, idx: number) => ({
        id: v.reportId ?? `violation-${idx}`,
        employeeName: v.employeeName ?? v.policyName ?? '—',
        reportTitle: v.reportTitle ?? '—',
        violationType: v.violationType ?? '',
        amount: num(v.totalAmount ?? v.amount),
        limit: num(v.limit),
        detectedAt: v.detectedAt ?? '',
      }));

      setDepartments(deptData);
      setTrends(trendData);
      setViolations(violationData);
    } catch {
      setError('Failed to load expense analytics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount || 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
      </div>
    );
  }

  if (error && !summary) {
    return (
      <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
        <AlertCircle className="h-4 w-4 shrink-0" />
        {error}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <BarChart3 className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-text">Reports &amp; Analytics</h2>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <div className="bg-background rounded-xl border border-border p-5">
            <div className="flex items-center gap-1 mb-1">
              <FileText className="h-3.5 w-3.5 text-blue-500" />
              <p className="text-sm text-text-muted">Total Reports</p>
            </div>
            <p className="text-2xl font-bold text-text">{summary.totalReports}</p>
            <p className="text-xs text-text-muted mt-1">{formatCurrency(summary.totalAmount)}</p>
          </div>
          <div className="bg-background rounded-xl border border-border p-5">
            <div className="flex items-center gap-1 mb-1">
              <Clock className="h-3.5 w-3.5 text-yellow-500" />
              <p className="text-sm text-text-muted">Pending</p>
            </div>
            <p className="text-2xl font-bold text-text">{summary.pendingCount}</p>
            <p className="text-xs text-text-muted mt-1">{formatCurrency(summary.pendingAmount)}</p>
          </div>
          <div className="bg-background rounded-xl border border-border p-5">
            <div className="flex items-center gap-1 mb-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
              <p className="text-sm text-text-muted">Approved</p>
            </div>
            <p className="text-2xl font-bold text-text">{summary.approvedCount}</p>
            <p className="text-xs text-text-muted mt-1">{formatCurrency(summary.approvedAmount)}</p>
          </div>
          <div className="bg-background rounded-xl border border-border p-5">
            <div className="flex items-center gap-1 mb-1">
              <XCircle className="h-3.5 w-3.5 text-red-500" />
              <p className="text-sm text-text-muted">Rejected</p>
            </div>
            <p className="text-2xl font-bold text-text">{summary.rejectedCount}</p>
            <p className="text-xs text-text-muted mt-1">{formatCurrency(summary.rejectedAmount)}</p>
          </div>
          <div className="bg-background rounded-xl border border-border p-5">
            <div className="flex items-center gap-1 mb-1">
              <DollarSign className="h-3.5 w-3.5 text-purple-500" />
              <p className="text-sm text-text-muted">Reimbursed</p>
            </div>
            <p className="text-2xl font-bold text-text">{summary.reimbursedCount}</p>
            <p className="text-xs text-text-muted mt-1">{formatCurrency(summary.reimbursedAmount)}</p>
          </div>
          <div className="bg-background rounded-xl border border-border p-5">
            <div className="flex items-center gap-1 mb-1">
              <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />
              <p className="text-sm text-text-muted">Violations</p>
            </div>
            <p className="text-2xl font-bold text-text">{violations.length}</p>
          </div>
        </div>
      )}

      {/* Department Breakdown */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-text uppercase tracking-wider mb-3">Department Breakdown</h3>
        {departments.length === 0 ? (
          <div className="text-center py-12">
            <Inbox className="h-10 w-10 text-text-muted mx-auto mb-3" />
            <p className="text-text-muted text-sm">No department breakdown available.</p>
          </div>
        ) : (
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-background">
                <tr>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Department</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Reports</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Total Amount</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Average</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Pending</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {departments.map((d, i) => (
                  <tr key={`${d.id ?? 'dept'}-${i}`} className="hover:bg-background/50">
                    <td className="px-4 py-3 text-sm text-text font-medium">{d.department}</td>
                    <td className="px-4 py-3 text-sm text-text-muted">{d.reportCount}</td>
                    <td className="px-4 py-3 text-sm text-text font-semibold">{formatCurrency(d.totalAmount)}</td>
                    <td className="px-4 py-3 text-sm text-text-muted">{formatCurrency(d.averageAmount)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        d.pendingCount > 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {d.pendingCount}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Monthly Trends */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-text uppercase tracking-wider mb-3">Monthly Trends</h3>
        {trends.length === 0 ? (
          <div className="text-center py-8">
            <Inbox className="h-8 w-8 text-text-muted mx-auto mb-2" />
            <p className="text-text-muted text-sm">No monthly trend data available.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {trends.map((t, i) => (
              <div key={`${t.id ?? 'trend'}-${i}`} className="bg-background rounded-xl border border-border p-5">
                <p className="text-sm text-text-muted mb-2">{t.month} {t.year}</p>
                <div className="flex items-end gap-3">
                  <p className="text-xl font-bold text-text">{formatCurrency(t.totalAmount)}</p>
                  {t.change !== 0 && (
                    <div className={`flex items-center gap-1 text-xs font-medium ${
                      t.change > 0 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {t.change > 0 ? (
                        <TrendingUp className="h-3.5 w-3.5" />
                      ) : (
                        <TrendingDown className="h-3.5 w-3.5" />
                      )}
                      {Math.abs(t.change).toFixed(1)}%
                    </div>
                  )}
                </div>
                <p className="text-xs text-text-muted mt-1">{t.reportCount} report{t.reportCount !== 1 ? 's' : ''}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Policy Violations */}
      <div>
        <h3 className="text-sm font-semibold text-text uppercase tracking-wider mb-3">Policy Violations</h3>
        {violations.length === 0 ? (
          <div className="text-center py-8">
            <Inbox className="h-8 w-8 text-text-muted mx-auto mb-2" />
            <p className="text-text-muted text-sm">No policy violations detected.</p>
          </div>
        ) : (
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-background">
                <tr>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Employee</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Report</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Violation</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Amount</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Limit</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Detected</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {violations.map((v, i) => (
                  <tr key={`${v.id ?? 'viol'}-${i}`} className="hover:bg-background/50">
                    <td className="px-4 py-3 text-sm text-text font-medium">{v.employeeName}</td>
                    <td className="px-4 py-3 text-sm text-text-muted max-w-[150px] truncate">{v.reportTitle}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 capitalize">
                        {v.violationType?.replace('_', ' ') || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-red-600 font-medium">{formatCurrency(v.amount)}</td>
                    <td className="px-4 py-3 text-sm text-text-muted">{formatCurrency(v.limit)}</td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {v.detectedAt ? new Date(v.detectedAt).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
