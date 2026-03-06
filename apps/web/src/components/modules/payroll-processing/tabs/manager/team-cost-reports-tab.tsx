'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  PieChart,
  Loader2,
  AlertCircle,
  Inbox,
  DollarSign,
  Target,
  Calendar,
} from 'lucide-react';

interface BudgetVsActual {
  totalBudget: number;
  totalActual: number;
  variance: number;
  variancePercent: number;
  utilizationPercent: number;
}

interface CostBreakdownItem {
  id: string;
  category: string;
  budgeted: number;
  actual: number;
  variance: number;
  headcount: number;
}

interface LeaveImpact {
  id: string;
  leaveType: string;
  totalDays: number;
  costImpact: number;
  affectedEmployees: number;
}

export default function TeamCostReportsTab() {
  const [budgetVsActual, setBudgetVsActual] = useState<BudgetVsActual | null>(null);
  const [breakdown, setBreakdown] = useState<CostBreakdownItem[]>([]);
  const [leaveImpact, setLeaveImpact] = useState<LeaveImpact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [breakdownRes, budgetRes] = await Promise.all([
        api.get('/payroll-processing/manager/cost-reports/breakdown'),
        api.get('/payroll-processing/manager/cost-reports/budget-vs-actual'),
      ]);

      const breakdownData = Array.isArray(breakdownRes.data) ? breakdownRes.data : breakdownRes.data?.data || [];
      const budgetData = budgetRes.data?.data || budgetRes.data || {};

      setBreakdown(breakdownData);

      // Extract leave impact if nested
      if (budgetData.leaveImpact) {
        const liData = Array.isArray(budgetData.leaveImpact) ? budgetData.leaveImpact : [];
        setLeaveImpact(liData);
      }

      setBudgetVsActual({
        totalBudget: budgetData.totalBudget || 0,
        totalActual: budgetData.totalActual || 0,
        variance: budgetData.variance || 0,
        variancePercent: budgetData.variancePercent || 0,
        utilizationPercent: budgetData.utilizationPercent || 0,
      });
    } catch {
      setError('Failed to load team cost reports.');
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

  if (error && !budgetVsActual) {
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
        <h2 className="text-lg font-semibold text-text">Team Cost Reports</h2>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Budget vs Actual Cards */}
      {budgetVsActual && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-background rounded-xl border border-border p-5">
            <div className="flex items-center gap-1 mb-1">
              <Target className="h-3.5 w-3.5 text-blue-500" />
              <p className="text-sm text-text-muted">Total Budget</p>
            </div>
            <p className="text-2xl font-bold text-text">{formatCurrency(budgetVsActual.totalBudget)}</p>
          </div>
          <div className="bg-background rounded-xl border border-border p-5">
            <div className="flex items-center gap-1 mb-1">
              <DollarSign className="h-3.5 w-3.5 text-green-500" />
              <p className="text-sm text-text-muted">Total Actual</p>
            </div>
            <p className="text-2xl font-bold text-text">{formatCurrency(budgetVsActual.totalActual)}</p>
          </div>
          <div className="bg-background rounded-xl border border-border p-5">
            <p className="text-sm text-text-muted mb-1">Variance</p>
            <p className={`text-2xl font-bold ${budgetVsActual.variance > 0 ? 'text-red-600' : budgetVsActual.variance < 0 ? 'text-green-600' : 'text-text'}`}>
              {budgetVsActual.variance > 0 ? '+' : ''}{formatCurrency(budgetVsActual.variance)}
            </p>
            <p className="text-xs text-text-muted mt-1">
              {budgetVsActual.variancePercent > 0 ? '+' : ''}{budgetVsActual.variancePercent.toFixed(1)}%
            </p>
          </div>
          <div className="bg-background rounded-xl border border-border p-5">
            <p className="text-sm text-text-muted mb-1">Utilization</p>
            <p className="text-2xl font-bold text-text">{budgetVsActual.utilizationPercent.toFixed(1)}%</p>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div
                className={`h-2 rounded-full ${
                  budgetVsActual.utilizationPercent > 100 ? 'bg-red-500' :
                  budgetVsActual.utilizationPercent > 90 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(budgetVsActual.utilizationPercent, 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Cost Breakdown Table */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-text uppercase tracking-wider mb-3">Cost Breakdown</h3>
        {breakdown.length === 0 ? (
          <div className="text-center py-12">
            <Inbox className="h-10 w-10 text-text-muted mx-auto mb-3" />
            <p className="text-text-muted text-sm">No cost breakdown data available.</p>
          </div>
        ) : (
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-background">
                <tr>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Category</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Headcount</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Budgeted</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Actual</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Variance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {breakdown.map((b) => (
                  <tr key={b.id} className="hover:bg-background/50">
                    <td className="px-4 py-3 text-sm text-text font-medium capitalize">{b.category?.replace('_', ' ') || '—'}</td>
                    <td className="px-4 py-3 text-sm text-text-muted">{b.headcount}</td>
                    <td className="px-4 py-3 text-sm text-text">{formatCurrency(b.budgeted)}</td>
                    <td className="px-4 py-3 text-sm text-text font-medium">{formatCurrency(b.actual)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-medium ${
                        b.variance > 0 ? 'text-red-600' : b.variance < 0 ? 'text-green-600' : 'text-text-muted'
                      }`}>
                        {b.variance > 0 ? '+' : ''}{formatCurrency(b.variance)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Leave Impact Summary */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="h-4 w-4 text-text-muted" />
          <h3 className="text-sm font-semibold text-text uppercase tracking-wider">Leave Impact Summary</h3>
        </div>
        {leaveImpact.length === 0 ? (
          <div className="text-center py-8">
            <Inbox className="h-8 w-8 text-text-muted mx-auto mb-2" />
            <p className="text-text-muted text-sm">No leave impact data available.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {leaveImpact.map((li) => (
              <div key={li.id} className="bg-background rounded-xl border border-border p-4">
                <h4 className="text-sm font-medium text-text mb-2 capitalize">{li.leaveType?.replace('_', ' ') || '—'}</h4>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-text-muted">Total Days</span>
                    <span className="text-text font-medium">{li.totalDays}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-text-muted">Affected Employees</span>
                    <span className="text-text font-medium">{li.affectedEmployees}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-text-muted">Cost Impact</span>
                    <span className="text-text font-medium">{formatCurrency(li.costImpact)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
