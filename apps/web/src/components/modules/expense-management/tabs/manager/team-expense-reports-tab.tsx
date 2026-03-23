'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  PieChart,
  Loader2,
  AlertCircle,
  Inbox,
  DollarSign,
  TrendingUp,
  Users,
} from 'lucide-react';

interface TeamSpendingSummary {
  totalSpend: number;
  averagePerEmployee: number;
  highestSingleExpense: number;
  reportCount: number;
}

interface CategoryBreakdown {
  id: string;
  category: string;
  totalAmount: number;
  reportCount: number;
  percentage: number;
}

interface TopSpender {
  id: string;
  employeeName: string;
  employeeId: string;
  totalAmount: number;
  reportCount: number;
  averagePerReport: number;
}

export default function TeamExpenseReportsTab() {
  const [summary, setSummary] = useState<TeamSpendingSummary | null>(null);
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryBreakdown[]>([]);
  const [topSpenders, setTopSpenders] = useState<TopSpender[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [summaryRes, categoryRes, topRes] = await Promise.all([
        api.get('/expense-management/manager/team-reports/summary').catch(() => ({ data: {} })),
        api.get('/expense-management/manager/team-reports/category-breakdown').catch(() => ({ data: [] })),
        api.get('/expense-management/manager/team-reports/top-spenders').catch(() => ({ data: [] })),
      ]);

      const summaryData = summaryRes.data?.data || summaryRes.data || {};
      const rawCategory = categoryRes.data?.data ?? categoryRes.data;
      const categoryData = Array.isArray(rawCategory) ? rawCategory : [];
      const rawTop = topRes.data?.data ?? topRes.data;
      const topData = Array.isArray(rawTop) ? rawTop : [];

      setSummary({
        totalSpend: summaryData.totalSpend || 0,
        averagePerEmployee: summaryData.averagePerEmployee || 0,
        highestSingleExpense: summaryData.highestSingleExpense || 0,
        reportCount: summaryData.reportCount || 0,
      });
      setCategoryBreakdown(categoryData);
      setTopSpenders(topData);
    } catch {
      setError('Failed to load team expense reports.');
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

  const getCategoryColor = (index: number) => {
    const colors = [
      'bg-blue-100 text-blue-700',
      'bg-green-100 text-green-700',
      'bg-purple-100 text-purple-700',
      'bg-orange-100 text-orange-700',
      'bg-teal-100 text-teal-700',
      'bg-red-100 text-red-700',
      'bg-indigo-100 text-indigo-700',
      'bg-yellow-100 text-yellow-700',
    ];
    return colors[index % colors.length];
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
        <PieChart className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-text">Team Expense Reports</h2>
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
              <p className="text-sm text-text-muted">Total Team Spend</p>
            </div>
            <p className="text-2xl font-bold text-text">{formatCurrency(summary.totalSpend)}</p>
          </div>
          <div className="bg-background rounded-xl border border-border p-5">
            <div className="flex items-center gap-1 mb-1">
              <Users className="h-3.5 w-3.5 text-blue-500" />
              <p className="text-sm text-text-muted">Avg per Employee</p>
            </div>
            <p className="text-2xl font-bold text-text">{formatCurrency(summary.averagePerEmployee)}</p>
          </div>
          <div className="bg-background rounded-xl border border-border p-5">
            <div className="flex items-center gap-1 mb-1">
              <TrendingUp className="h-3.5 w-3.5 text-orange-500" />
              <p className="text-sm text-text-muted">Highest Expense</p>
            </div>
            <p className="text-2xl font-bold text-text">{formatCurrency(summary.highestSingleExpense)}</p>
          </div>
          <div className="bg-background rounded-xl border border-border p-5">
            <p className="text-sm text-text-muted mb-1">Total Reports</p>
            <p className="text-2xl font-bold text-text">{summary.reportCount}</p>
          </div>
        </div>
      )}

      {/* Category Breakdown */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-text uppercase tracking-wider mb-3">Category Breakdown</h3>
        {categoryBreakdown.length === 0 ? (
          <div className="text-center py-12">
            <Inbox className="h-10 w-10 text-text-muted mx-auto mb-3" />
            <p className="text-text-muted text-sm">No category breakdown available.</p>
          </div>
        ) : (
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-background">
                <tr>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Category</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Reports</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Total Amount</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">% of Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {categoryBreakdown.map((c, index) => (
                  <tr key={c.id} className="hover:bg-background/50">
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getCategoryColor(index)}`}>
                        {c.category?.replace('_', ' ') || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">{c.reportCount}</td>
                    <td className="px-4 py-3 text-sm text-text font-semibold">{formatCurrency(c.totalAmount)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className="h-2 rounded-full bg-primary"
                            style={{ width: `${Math.min(c.percentage, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-text-muted">{(c.percentage ?? 0).toFixed(1)}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Top Spenders */}
      <div>
        <h3 className="text-sm font-semibold text-text uppercase tracking-wider mb-3">Top Spenders</h3>
        {topSpenders.length === 0 ? (
          <div className="text-center py-8">
            <Inbox className="h-8 w-8 text-text-muted mx-auto mb-2" />
            <p className="text-text-muted text-sm">No spender data available.</p>
          </div>
        ) : (
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-background">
                <tr>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Employee</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Reports</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Total Amount</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Avg per Report</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {topSpenders.map((s) => (
                  <tr key={s.id} className="hover:bg-background/50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-text">{s.employeeName}</p>
                        <p className="text-xs text-text-muted">{s.employeeId}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">{s.reportCount}</td>
                    <td className="px-4 py-3 text-sm text-text font-semibold">{formatCurrency(s.totalAmount)}</td>
                    <td className="px-4 py-3 text-sm text-text-muted">{formatCurrency(s.averagePerReport)}</td>
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
