'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { BarChart3, Loader2, AlertCircle, Inbox } from 'lucide-react';

interface PayEquityRow {
  gender: string;
  avgCtc: number;
  headcount: number;
}

interface DeptBenchmarkRow {
  department: string;
  avgCtc: number;
  minCtc: number;
  maxCtc: number;
  headcount: number;
}

interface BudgetRow {
  title: string;
  budget: number;
  actual: number;
  utilization: number;
}

interface AnalyticsData {
  totalEmployees: number;
  totalBudget: number;
  budgetUtilized: number;
  payEquityGap: number;
  payEquity: PayEquityRow[];
  benchmarking: DeptBenchmarkRow[];
  budgetVsActual: BudgetRow[];
}

export default function CompensationAnalyticsTab() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [payEquityRes, budgetRes, benchmarkRes] = await Promise.all([
        api.get('/compensation-rewards/admin/analytics/pay-equity').catch(() => ({ data: null })),
        api.get('/compensation-rewards/admin/analytics/budget-vs-actual').catch(() => ({ data: null })),
        api.get('/compensation-rewards/admin/analytics/benchmarking').catch(() => ({ data: null })),
      ]);

      const peRaw = payEquityRes.data?.data || payEquityRes.data || {};
      const genderAnalysis = Array.isArray(peRaw?.genderAnalysis) ? peRaw.genderAnalysis : Array.isArray(peRaw) ? peRaw : [];
      const payEquity: PayEquityRow[] = genderAnalysis.map((g: Record<string, unknown>) => ({
        gender: String(g?.gender ?? 'unspecified'),
        avgCtc: Number(g?.averageCtc ?? g?.avgCtc ?? 0) || 0,
        headcount: Number(g?.count ?? g?.headcount ?? 0) || 0,
      }));

      // Pay-equity gap: % difference between highest and lowest average CTC across genders.
      const avgVals = payEquity.map((r) => r.avgCtc).filter((v) => v > 0);
      const maxAvg = avgVals.length ? Math.max(...avgVals) : 0;
      const minAvg = avgVals.length ? Math.min(...avgVals) : 0;
      const payEquityGap = maxAvg > 0 ? Math.round(((maxAvg - minAvg) / maxAvg) * 1000) / 10 : 0;

      const benchmarkData = benchmarkRes.data?.data || benchmarkRes.data || {};
      const byDept = Array.isArray(benchmarkData?.byDepartment) ? benchmarkData.byDepartment : [];
      const benchmarking: DeptBenchmarkRow[] = byDept.map((d: Record<string, unknown>) => ({
        department: String(d?.departmentId ?? '—').slice(0, 8),
        avgCtc: Number(d?.averageCtc ?? 0) || 0,
        minCtc: Number(d?.minCtc ?? 0) || 0,
        maxCtc: Number(d?.maxCtc ?? 0) || 0,
        headcount: Number(d?.employeeCount ?? 0) || 0,
      }));

      const budgetRaw = budgetRes.data?.data || budgetRes.data || [];
      const budgetArr = Array.isArray(budgetRaw) ? budgetRaw : Array.isArray(budgetRaw?.departments) ? budgetRaw.departments : [];
      const budgetVsActual: BudgetRow[] = budgetArr.map((b: Record<string, unknown>) => ({
        title: String(b?.title ?? b?.fiscalYear ?? '—'),
        budget: Number(b?.totalBudget ?? b?.budget ?? 0) || 0,
        actual: Number(b?.spentBudget ?? b?.actual ?? 0) || 0,
        utilization: Number(b?.utilizationPercent ?? b?.utilization ?? 0) || 0,
      }));

      const totalBudget = budgetVsActual.reduce((s, b) => s + b.budget, 0);
      const budgetUtilized = budgetVsActual.reduce((s, b) => s + b.actual, 0);

      setData({
        totalEmployees: Number(peRaw?.totalEmployeesAnalyzed ?? 0) || 0,
        totalBudget,
        budgetUtilized,
        payEquityGap,
        payEquity,
        benchmarking,
        budgetVsActual,
      });
    } catch {
      setError('Failed to load analytics data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(val) || 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
        <AlertCircle className="h-4 w-4 shrink-0" />
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <Inbox className="h-10 w-10 text-text-muted mx-auto mb-3" />
        <p className="text-text-muted text-sm">No analytics data available.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <BarChart3 className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-text">Compensation Analytics</h2>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-background rounded-xl border border-border p-5">
          <p className="text-sm text-text-muted mb-1">Employees Analyzed</p>
          <p className="text-2xl font-bold text-text">{data.totalEmployees}</p>
        </div>
        <div className="bg-background rounded-xl border border-border p-5">
          <p className="text-sm text-text-muted mb-1">Revision Budget</p>
          <p className="text-2xl font-bold text-text">{formatCurrency(data.totalBudget)}</p>
          {data.totalBudget > 0 && (
            <p className="text-xs text-text-muted mt-1">
              {((data.budgetUtilized / data.totalBudget) * 100).toFixed(1)}% utilized
            </p>
          )}
        </div>
        <div className="bg-background rounded-xl border border-border p-5">
          <p className="text-sm text-text-muted mb-1">Gender Pay Gap</p>
          <p className="text-2xl font-bold text-text">{data.payEquityGap}%</p>
        </div>
      </div>

      {/* Pay Equity Table */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-text uppercase tracking-wider mb-3">Pay Equity by Gender</h3>
        {data.payEquity.length === 0 ? (
          <div className="text-center py-8">
            <Inbox className="h-8 w-8 text-text-muted mx-auto mb-2" />
            <p className="text-text-muted text-sm">No pay equity data available.</p>
          </div>
        ) : (
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-background">
                <tr>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Gender</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Avg CTC</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Headcount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.payEquity.map((row, idx) => (
                  <tr key={idx} className="hover:bg-background/50">
                    <td className="px-4 py-3 text-sm text-text font-medium capitalize">{row.gender}</td>
                    <td className="px-4 py-3 text-sm text-text">{formatCurrency(row.avgCtc)}</td>
                    <td className="px-4 py-3 text-sm text-text">{row.headcount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Benchmarking by Department */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-text uppercase tracking-wider mb-3">CTC Benchmarking by Department</h3>
        {data.benchmarking.length === 0 ? (
          <div className="text-center py-8">
            <Inbox className="h-8 w-8 text-text-muted mx-auto mb-2" />
            <p className="text-text-muted text-sm">No benchmarking data available.</p>
          </div>
        ) : (
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-background">
                <tr>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Department</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Avg CTC</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Min</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Max</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Headcount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.benchmarking.map((row, idx) => (
                  <tr key={idx} className="hover:bg-background/50">
                    <td className="px-4 py-3 text-sm text-text font-medium font-mono text-xs">{row.department}</td>
                    <td className="px-4 py-3 text-sm text-text">{formatCurrency(row.avgCtc)}</td>
                    <td className="px-4 py-3 text-sm text-text-muted">{formatCurrency(row.minCtc)}</td>
                    <td className="px-4 py-3 text-sm text-text-muted">{formatCurrency(row.maxCtc)}</td>
                    <td className="px-4 py-3 text-sm text-text">{row.headcount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Budget vs Actual */}
      <div>
        <h3 className="text-sm font-semibold text-text uppercase tracking-wider mb-3">Revision Budget vs Actual</h3>
        {data.budgetVsActual.length === 0 ? (
          <div className="text-center py-8">
            <Inbox className="h-8 w-8 text-text-muted mx-auto mb-2" />
            <p className="text-text-muted text-sm">No budget data available.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.budgetVsActual.map((row, idx) => {
              const pct = row.budget > 0 ? Math.min((row.actual / row.budget) * 100, 100) : 0;
              return (
                <div key={idx} className="bg-background rounded-lg border border-border p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-text">{row.title}</span>
                    <span className="text-xs text-text-muted">
                      {formatCurrency(row.actual)} / {formatCurrency(row.budget)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full ${pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-xs text-text-muted mt-1">{pct.toFixed(1)}% utilized</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
