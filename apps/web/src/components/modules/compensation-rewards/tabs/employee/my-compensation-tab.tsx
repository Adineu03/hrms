'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { DollarSign, Loader2, AlertCircle, Inbox } from 'lucide-react';

interface SalaryComponent {
  name: string;
  amount: number;
  type: string;
  detail: string;
}

interface CompensationHistory {
  year: string;
  ctc: number;
  incrementPct: number;
  effectiveDate: string;
}

interface CompensationData {
  currentCtc: number;
  components: SalaryComponent[];
  history: CompensationHistory[];
  totalRewards: {
    salary: number;
    benefits: number;
    recognitionPoints: number;
  };
}

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(val) || 0);

export default function MyCompensationTab() {
  const [data, setData] = useState<CompensationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [currentRes, historyRes, rewardsRes] = await Promise.all([
        api.get('/compensation-rewards/employee/my-compensation').catch(() => null),
        api.get('/compensation-rewards/employee/my-compensation/history').catch(() => null),
        api.get('/compensation-rewards/employee/my-compensation/total-rewards').catch(() => null),
      ]);

      const current = currentRes?.data?.data ?? currentRes?.data ?? {};
      const ctc = Number(current?.ctc ?? 0) || 0;

      // Backend returns salaryStructure.components as { name, type, calculationType, value }.
      // Derive a displayable amount: percentage → value% of CTC; fixed → monthly value × 12.
      const rawComponents = Array.isArray(current?.salaryStructure?.components)
        ? current.salaryStructure.components
        : [];
      const components: SalaryComponent[] = rawComponents.map((c: Record<string, unknown>) => {
        const value = Number(c?.value ?? 0) || 0;
        const calcType = String(c?.calculationType ?? 'fixed');
        const isPct = calcType === 'percentage';
        const amount = isPct ? Math.round((value / 100) * ctc) : value * 12;
        return {
          name: String(c?.name ?? '—'),
          type: String(c?.type ?? 'earning'),
          amount,
          detail: isPct ? `${value}% of CTC` : `${formatCurrency(value)}/mo`,
        };
      });

      const rawHistory = historyRes?.data?.data ?? historyRes?.data ?? [];
      const historyArr = Array.isArray(rawHistory) ? rawHistory : [];
      const history: CompensationHistory[] = historyArr.map((h: Record<string, unknown>, idx: number) => {
        const eff = h?.effectiveFrom ? new Date(String(h.effectiveFrom)) : null;
        const ctcVal = Number(h?.ctc ?? 0) || 0;
        const next = historyArr[idx + 1] as Record<string, unknown> | undefined;
        const prevCtc = next ? Number(next?.ctc ?? 0) || 0 : 0;
        const incrementPct = prevCtc > 0 ? Math.round(((ctcVal - prevCtc) / prevCtc) * 1000) / 10 : 0;
        return {
          year: eff ? String(eff.getFullYear()) : '—',
          ctc: ctcVal,
          incrementPct,
          effectiveDate: h?.effectiveFrom ? String(h.effectiveFrom) : '',
        };
      });

      const rewards = rewardsRes?.data?.data ?? rewardsRes?.data ?? {};
      const benefitsCount = Array.isArray(rewards?.benefits) ? rewards.benefits.length : 0;

      setData({
        currentCtc: ctc,
        components,
        history,
        totalRewards: {
          salary: Number(rewards?.salary?.currentCtc ?? ctc) || 0,
          benefits: benefitsCount,
          recognitionPoints: Number(rewards?.recognition?.pointsBalance ?? 0) || 0,
        },
      });
    } catch {
      setError('Failed to load compensation data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
        <p className="text-text-muted text-sm">No compensation data available.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <DollarSign className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-text">My Compensation</h2>
      </div>

      {/* Current CTC Card */}
      <div className="bg-background rounded-xl border border-border p-6 mb-8">
        <p className="text-sm text-text-muted mb-1">Current CTC</p>
        <p className="text-3xl font-bold text-text">{formatCurrency(data.currentCtc)}</p>
        <p className="text-xs text-text-muted mt-1">Per annum</p>
      </div>

      {/* Salary Breakdown */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-text uppercase tracking-wider mb-3">Salary Breakdown</h3>
        {data.components.length === 0 ? (
          <p className="text-sm text-text-muted">No salary components available.</p>
        ) : (
          <div className="bg-background rounded-xl border border-border divide-y divide-border">
            {data.components.map((comp, idx) => (
              <div key={idx} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-text font-medium">{comp.name}</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    comp.type === 'earning' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {comp.type}
                  </span>
                  <span className="text-xs text-text-muted">{comp.detail}</span>
                </div>
                <span className="text-sm font-medium text-text">{formatCurrency(comp.amount)}/yr</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Compensation History */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-text uppercase tracking-wider mb-3">Compensation History</h3>
        {data.history.length === 0 ? (
          <p className="text-sm text-text-muted">No compensation history available.</p>
        ) : (
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-background">
                <tr>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Year</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">CTC</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Increment %</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Effective Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.history.map((h, idx) => (
                  <tr key={idx} className="hover:bg-background/50">
                    <td className="px-4 py-3 text-sm text-text font-medium">{h.year}</td>
                    <td className="px-4 py-3 text-sm text-text">{formatCurrency(h.ctc)}</td>
                    <td className="px-4 py-3 text-sm text-text">
                      {h.incrementPct ? (
                        <span className="text-green-600">+{h.incrementPct}%</span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">{h.effectiveDate ? new Date(h.effectiveDate).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Total Rewards Summary */}
      <div>
        <h3 className="text-sm font-semibold text-text uppercase tracking-wider mb-3">Total Rewards Summary</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-background rounded-xl border border-border p-5">
            <p className="text-sm text-text-muted mb-1">Salary (CTC)</p>
            <p className="text-xl font-bold text-text">{formatCurrency(data.totalRewards.salary)}</p>
          </div>
          <div className="bg-background rounded-xl border border-border p-5">
            <p className="text-sm text-text-muted mb-1">Benefits Enrolled</p>
            <p className="text-xl font-bold text-text">{data.totalRewards.benefits} plan{data.totalRewards.benefits === 1 ? '' : 's'}</p>
          </div>
          <div className="bg-background rounded-xl border border-border p-5">
            <p className="text-sm text-text-muted mb-1">Recognition Points</p>
            <p className="text-xl font-bold text-text">{data.totalRewards.recognitionPoints} pts</p>
          </div>
        </div>
      </div>
    </div>
  );
}
