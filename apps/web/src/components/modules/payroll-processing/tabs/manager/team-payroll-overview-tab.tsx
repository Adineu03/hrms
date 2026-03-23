'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Users,
  Loader2,
  AlertCircle,
  Inbox,
  DollarSign,
  Clock,
  TrendingUp,
  Calendar,
} from 'lucide-react';

interface TeamCostSummary {
  headcount: number;
  totalCost: number;
  overtimeCost: number;
  pendingItems: number;
  averageCost: number;
}

interface MonthlyCostTrend {
  id: string;
  month: string;
  year: number;
  totalCost: number;
  headcount: number;
  overtimeCost: number;
  change: number;
}

export default function TeamPayrollOverviewTab() {
  const [summary, setSummary] = useState<TeamCostSummary | null>(null);
  const [trends, setTrends] = useState<MonthlyCostTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [summaryRes, trendsRes] = await Promise.all([
        api.get('/payroll-processing/manager/team-overview/summary').catch(() => ({ data: {} })),
        api.get('/payroll-processing/manager/team-overview/headcount-cost').catch(() => ({ data: [] })),
      ]);

      const summaryData = summaryRes.data?.data || summaryRes.data || {};
      const rawTrends = trendsRes.data?.data ?? trendsRes.data;
      const trendsData = Array.isArray(rawTrends) ? rawTrends : [];

      setSummary({
        headcount: summaryData.headcount || 0,
        totalCost: summaryData.totalCost || 0,
        overtimeCost: summaryData.overtimeCost || 0,
        pendingItems: summaryData.pendingItems || 0,
        averageCost: summaryData.averageCost || 0,
      });
      setTrends(trendsData);
    } catch {
      setError('Failed to load team payroll overview.');
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
        <Users className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-text">Team Payroll Overview</h2>
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
              <Users className="h-3.5 w-3.5 text-blue-500" />
              <p className="text-sm text-text-muted">Team Headcount</p>
            </div>
            <p className="text-2xl font-bold text-text">{summary.headcount}</p>
          </div>
          <div className="bg-background rounded-xl border border-border p-5">
            <div className="flex items-center gap-1 mb-1">
              <DollarSign className="h-3.5 w-3.5 text-green-500" />
              <p className="text-sm text-text-muted">Total Cost</p>
            </div>
            <p className="text-2xl font-bold text-text">{formatCurrency(summary.totalCost)}</p>
            <p className="text-xs text-text-muted mt-1">Avg: {formatCurrency(summary.averageCost)}</p>
          </div>
          <div className="bg-background rounded-xl border border-border p-5">
            <div className="flex items-center gap-1 mb-1">
              <Clock className="h-3.5 w-3.5 text-orange-500" />
              <p className="text-sm text-text-muted">Overtime Cost</p>
            </div>
            <p className="text-2xl font-bold text-text">{formatCurrency(summary.overtimeCost)}</p>
          </div>
          <div className="bg-background rounded-xl border border-border p-5">
            <div className="flex items-center gap-1 mb-1">
              <TrendingUp className="h-3.5 w-3.5 text-yellow-500" />
              <p className="text-sm text-text-muted">Pending Items</p>
            </div>
            <p className="text-2xl font-bold text-text">{summary.pendingItems}</p>
          </div>
        </div>
      )}

      {/* Monthly Cost Trend */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="h-4 w-4 text-text-muted" />
          <h3 className="text-sm font-semibold text-text uppercase tracking-wider">Monthly Cost Trend</h3>
        </div>
        {trends.length === 0 ? (
          <div className="text-center py-12">
            <Inbox className="h-10 w-10 text-text-muted mx-auto mb-3" />
            <p className="text-text-muted text-sm">No monthly cost data available.</p>
          </div>
        ) : (
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-background">
                <tr>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Month</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Headcount</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Total Cost</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Overtime</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Change</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {trends.map((t) => (
                  <tr key={t.id} className="hover:bg-background/50">
                    <td className="px-4 py-3 text-sm text-text font-medium">{t.month} {t.year}</td>
                    <td className="px-4 py-3 text-sm text-text-muted">{t.headcount}</td>
                    <td className="px-4 py-3 text-sm text-text font-semibold">{formatCurrency(t.totalCost)}</td>
                    <td className="px-4 py-3 text-sm text-text-muted">{formatCurrency(t.overtimeCost)}</td>
                    <td className="px-4 py-3">
                      {t.change !== 0 ? (
                        <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                          t.change > 0 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {t.change > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingUp className="h-3 w-3 rotate-180" />}
                          {Math.abs(t.change ?? 0).toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-xs text-gray-500">—</span>
                      )}
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
