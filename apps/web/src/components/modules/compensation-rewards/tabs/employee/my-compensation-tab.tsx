'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { DollarSign, Loader2, AlertCircle, Inbox } from 'lucide-react';

interface SalaryComponent {
  name: string;
  amount: number;
  type: string;
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

export default function MyCompensationTab() {
  const [data, setData] = useState<CompensationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/compensation-rewards/employee/my-compensation');
      const result = res.data?.data || res.data || {};
      setData({
        currentCtc: result.currentCtc || 0,
        components: Array.isArray(result.components) ? result.components : [],
        history: Array.isArray(result.history) ? result.history : [],
        totalRewards: result.totalRewards || { salary: 0, benefits: 0, recognitionPoints: 0 },
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
                </div>
                <span className="text-sm font-medium text-text">{formatCurrency(comp.amount)}</span>
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
            <p className="text-sm text-text-muted mb-1">Salary</p>
            <p className="text-xl font-bold text-text">{formatCurrency(data.totalRewards.salary)}</p>
          </div>
          <div className="bg-background rounded-xl border border-border p-5">
            <p className="text-sm text-text-muted mb-1">Benefits</p>
            <p className="text-xl font-bold text-text">{formatCurrency(data.totalRewards.benefits)}</p>
          </div>
          <div className="bg-background rounded-xl border border-border p-5">
            <p className="text-sm text-text-muted mb-1">Recognition Points Value</p>
            <p className="text-xl font-bold text-text">{formatCurrency(data.totalRewards.recognitionPoints)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
