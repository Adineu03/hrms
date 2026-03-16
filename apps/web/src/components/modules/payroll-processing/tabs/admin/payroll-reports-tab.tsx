'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  BarChart3,
  Loader2,
  AlertCircle,
  Inbox,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Minus,
} from 'lucide-react';

interface PayrollSummary {
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  headcount: number;
  averageSalary: number;
  period: string;
}

interface DepartmentBreakdown {
  id: string;
  department: string;
  headcount: number;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  averageSalary: number;
}

interface VarianceItem {
  id: string;
  metric: string;
  currentMonth: number;
  previousMonth: number;
  variance: number;
  variancePercent: number;
}

export default function PayrollReportsTab() {
  const [summary, setSummary] = useState<PayrollSummary | null>(null);
  const [departments, setDepartments] = useState<DepartmentBreakdown[]>([]);
  const [variance, setVariance] = useState<VarianceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const month = new Date().getMonth() + 1;
      const year = new Date().getFullYear();
      const [summaryRes, deptRes, varianceRes] = await Promise.all([
        api.get(`/payroll-processing/admin/reports/summary?month=${month}&year=${year}`).catch(() => ({ data: null })),
        api.get(`/payroll-processing/admin/reports/department-breakdown?month=${month}&year=${year}`).catch(() => ({ data: [] })),
        api.get(`/payroll-processing/admin/reports/variance?month=${month}&year=${year}`).catch(() => ({ data: [] })),
      ]);

      const summaryData = summaryRes.data?.data || summaryRes.data || {};
      const deptData = Array.isArray(deptRes.data) ? deptRes.data : deptRes.data?.data || [];
      let varianceData = Array.isArray(varianceRes.data) ? varianceRes.data : varianceRes.data?.data || [];
      if (!Array.isArray(varianceData) && varianceData?.variance) {
        const v = varianceData.variance;
        varianceData = Object.entries(v).map(([metric, vals]: [string, any]) => ({
          id: metric,
          metric,
          currentMonth: vals?.current ?? 0,
          previousMonth: vals?.previous ?? 0,
          variance: (vals?.current ?? 0) - (vals?.previous ?? 0),
          variancePercent: vals?.percentChange ?? 0,
        }));
      }

      setSummary({
        totalGross: summaryData.totalGross || 0,
        totalDeductions: summaryData.totalDeductions || 0,
        totalNet: summaryData.totalNet || 0,
        headcount: summaryData.headcount || 0,
        averageSalary: summaryData.averageSalary || 0,
        period: summaryData.period || '',
      });
      setDepartments(deptData);
      setVariance(varianceData);
    } catch {
      setError('Failed to load payroll reports.');
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
        {summary?.period && (
          <span className="text-sm text-text-muted ml-2">({summary.period})</span>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-background rounded-xl border border-border p-5">
            <div className="flex items-center gap-1 mb-1">
              <DollarSign className="h-3.5 w-3.5 text-green-500" />
              <p className="text-sm text-text-muted">Total Gross</p>
            </div>
            <p className="text-2xl font-bold text-text">{formatCurrency(summary.totalGross)}</p>
          </div>
          <div className="bg-background rounded-xl border border-border p-5">
            <div className="flex items-center gap-1 mb-1">
              <Minus className="h-3.5 w-3.5 text-red-500" />
              <p className="text-sm text-text-muted">Total Deductions</p>
            </div>
            <p className="text-2xl font-bold text-text">{formatCurrency(summary.totalDeductions)}</p>
          </div>
          <div className="bg-background rounded-xl border border-border p-5">
            <div className="flex items-center gap-1 mb-1">
              <DollarSign className="h-3.5 w-3.5 text-blue-500" />
              <p className="text-sm text-text-muted">Total Net Pay</p>
            </div>
            <p className="text-2xl font-bold text-text">{formatCurrency(summary.totalNet)}</p>
          </div>
          <div className="bg-background rounded-xl border border-border p-5">
            <div className="flex items-center gap-1 mb-1">
              <Users className="h-3.5 w-3.5 text-purple-500" />
              <p className="text-sm text-text-muted">Headcount</p>
            </div>
            <p className="text-2xl font-bold text-text">{summary.headcount}</p>
            <p className="text-xs text-text-muted mt-1">Avg: {formatCurrency(summary.averageSalary)}</p>
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
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Headcount</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Total Gross</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Deductions</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Net Pay</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Avg Salary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {departments.map((d) => (
                  <tr key={d.id} className="hover:bg-background/50">
                    <td className="px-4 py-3 text-sm text-text font-medium">{d.department}</td>
                    <td className="px-4 py-3 text-sm text-text-muted">{d.headcount}</td>
                    <td className="px-4 py-3 text-sm text-text">{formatCurrency(d.totalGross)}</td>
                    <td className="px-4 py-3 text-sm text-red-600">{formatCurrency(d.totalDeductions)}</td>
                    <td className="px-4 py-3 text-sm text-text font-semibold">{formatCurrency(d.totalNet)}</td>
                    <td className="px-4 py-3 text-sm text-text-muted">{formatCurrency(d.averageSalary)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Month-over-Month Variance */}
      <div>
        <h3 className="text-sm font-semibold text-text uppercase tracking-wider mb-3">Month-over-Month Variance</h3>
        {variance.length === 0 ? (
          <div className="text-center py-8">
            <Inbox className="h-8 w-8 text-text-muted mx-auto mb-2" />
            <p className="text-text-muted text-sm">No variance data available.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {variance.map((v) => (
              <div key={v.id} className="bg-background rounded-xl border border-border p-5">
                <p className="text-sm text-text-muted mb-2">{v.metric}</p>
                <div className="flex items-end gap-3">
                  <p className="text-xl font-bold text-text">{formatCurrency(v.currentMonth)}</p>
                  <div className={`flex items-center gap-1 text-xs font-medium ${
                    v.variancePercent > 0 ? 'text-red-600' : v.variancePercent < 0 ? 'text-green-600' : 'text-gray-500'
                  }`}>
                    {v.variancePercent > 0 ? (
                      <TrendingUp className="h-3.5 w-3.5" />
                    ) : v.variancePercent < 0 ? (
                      <TrendingDown className="h-3.5 w-3.5" />
                    ) : null}
                    {v.variancePercent !== 0 ? `${Math.abs(v.variancePercent).toFixed(1)}%` : 'No change'}
                  </div>
                </div>
                <p className="text-xs text-text-muted mt-1">
                  Previous: {formatCurrency(v.previousMonth)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
