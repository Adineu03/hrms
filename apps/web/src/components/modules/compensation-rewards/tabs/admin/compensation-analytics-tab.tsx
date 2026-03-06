'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { BarChart3, Loader2, AlertCircle, Inbox } from 'lucide-react';

interface PayEquityRow {
  department: string;
  avgCtc: number;
  headcount: number;
  genderRatio: string;
}

interface BudgetRow {
  department: string;
  budget: number;
  actual: number;
  utilization: number;
}

interface AnalyticsData {
  totalBudget: number;
  budgetUtilized: number;
  payEquityScore: number;
  payEquity: PayEquityRow[];
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
        api.get('/compensation-rewards/admin/analytics/pay-equity'),
        api.get('/compensation-rewards/admin/analytics/budget-vs-actual'),
        api.get('/compensation-rewards/admin/analytics/benchmarking'),
      ]);

      const payEquity = Array.isArray(payEquityRes.data) ? payEquityRes.data : payEquityRes.data?.data || [];
      const budgetData = budgetRes.data?.data || budgetRes.data || {};
      const benchmarkData = benchmarkRes.data?.data || benchmarkRes.data || {};

      setData({
        totalBudget: benchmarkData.totalBudget || budgetData.totalBudget || 0,
        budgetUtilized: benchmarkData.budgetUtilized || budgetData.budgetUtilized || 0,
        payEquityScore: benchmarkData.payEquityScore || 0,
        payEquity,
        budgetVsActual: Array.isArray(budgetData.departments) ? budgetData.departments : Array.isArray(budgetData) ? budgetData : [],
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
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

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
          <p className="text-sm text-text-muted mb-1">Total Compensation Budget</p>
          <p className="text-2xl font-bold text-text">{formatCurrency(data.totalBudget)}</p>
        </div>
        <div className="bg-background rounded-xl border border-border p-5">
          <p className="text-sm text-text-muted mb-1">Budget Utilized</p>
          <p className="text-2xl font-bold text-text">{formatCurrency(data.budgetUtilized)}</p>
          {data.totalBudget > 0 && (
            <p className="text-xs text-text-muted mt-1">
              {((data.budgetUtilized / data.totalBudget) * 100).toFixed(1)}% utilized
            </p>
          )}
        </div>
        <div className="bg-background rounded-xl border border-border p-5">
          <p className="text-sm text-text-muted mb-1">Pay Equity Score</p>
          <p className="text-2xl font-bold text-text">{data.payEquityScore}%</p>
        </div>
      </div>

      {/* Pay Equity Table */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-text uppercase tracking-wider mb-3">Pay Equity by Department</h3>
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
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Department</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Avg CTC</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Headcount</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Gender Ratio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.payEquity.map((row, idx) => (
                  <tr key={idx} className="hover:bg-background/50">
                    <td className="px-4 py-3 text-sm text-text font-medium">{row.department}</td>
                    <td className="px-4 py-3 text-sm text-text">{formatCurrency(row.avgCtc)}</td>
                    <td className="px-4 py-3 text-sm text-text">{row.headcount}</td>
                    <td className="px-4 py-3 text-sm text-text-muted">{row.genderRatio}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Budget vs Actual */}
      <div>
        <h3 className="text-sm font-semibold text-text uppercase tracking-wider mb-3">Budget vs Actual by Department</h3>
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
                    <span className="text-sm font-medium text-text">{row.department}</span>
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
