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
  Target,
} from 'lucide-react';

interface TeamExpenseSummary {
  totalExpenses: number;
  pendingApprovals: number;
  budgetAllocated: number;
  budgetUsed: number;
  budgetUtilization: number;
  teamSize: number;
}

interface TeamMemberExpense {
  id: string;
  employeeName: string;
  employeeId: string;
  totalSubmitted: number;
  totalApproved: number;
  pendingCount: number;
  lastSubmittedAt: string;
}

export default function TeamExpenseOverviewTab() {
  const [summary, setSummary] = useState<TeamExpenseSummary | null>(null);
  const [members, setMembers] = useState<TeamMemberExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [summaryRes, membersRes] = await Promise.all([
        api.get('/expense-management/manager/team-overview/summary'),
        api.get('/expense-management/manager/team-overview/members'),
      ]);

      const summaryData = summaryRes.data?.data || summaryRes.data || {};
      const membersData = Array.isArray(membersRes.data) ? membersRes.data : membersRes.data?.data || [];

      setSummary({
        totalExpenses: summaryData.totalExpenses || 0,
        pendingApprovals: summaryData.pendingApprovals || 0,
        budgetAllocated: summaryData.budgetAllocated || 0,
        budgetUsed: summaryData.budgetUsed || 0,
        budgetUtilization: summaryData.budgetUtilization || 0,
        teamSize: summaryData.teamSize || 0,
      });
      setMembers(membersData);
    } catch {
      setError('Failed to load team expense overview.');
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
        <h2 className="text-lg font-semibold text-text">Team Expense Overview</h2>
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
              <p className="text-sm text-text-muted">Total Team Expenses</p>
            </div>
            <p className="text-2xl font-bold text-text">{formatCurrency(summary.totalExpenses)}</p>
          </div>
          <div className="bg-background rounded-xl border border-border p-5">
            <div className="flex items-center gap-1 mb-1">
              <Clock className="h-3.5 w-3.5 text-yellow-500" />
              <p className="text-sm text-text-muted">Pending Approvals</p>
            </div>
            <p className="text-2xl font-bold text-text">{summary.pendingApprovals}</p>
          </div>
          <div className="bg-background rounded-xl border border-border p-5">
            <div className="flex items-center gap-1 mb-1">
              <Target className="h-3.5 w-3.5 text-blue-500" />
              <p className="text-sm text-text-muted">Budget Allocated</p>
            </div>
            <p className="text-2xl font-bold text-text">{formatCurrency(summary.budgetAllocated)}</p>
            <p className="text-xs text-text-muted mt-1">Used: {formatCurrency(summary.budgetUsed)}</p>
          </div>
          <div className="bg-background rounded-xl border border-border p-5">
            <p className="text-sm text-text-muted mb-1">Budget Utilization</p>
            <p className="text-2xl font-bold text-text">{summary.budgetUtilization.toFixed(1)}%</p>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div
                className={`h-2 rounded-full ${
                  summary.budgetUtilization > 100 ? 'bg-red-500' :
                  summary.budgetUtilization > 90 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(summary.budgetUtilization, 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Team Members Expense List */}
      <div>
        <h3 className="text-sm font-semibold text-text uppercase tracking-wider mb-3">
          Team Members ({members.length})
        </h3>
        {members.length === 0 ? (
          <div className="text-center py-12">
            <Inbox className="h-10 w-10 text-text-muted mx-auto mb-3" />
            <p className="text-text-muted text-sm">No team member expense data available.</p>
          </div>
        ) : (
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-background">
                <tr>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Employee</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Total Submitted</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Total Approved</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Pending</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Last Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {members.map((m) => (
                  <tr key={m.id} className="hover:bg-background/50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-text">{m.employeeName}</p>
                        <p className="text-xs text-text-muted">{m.employeeId}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-text font-medium">{formatCurrency(m.totalSubmitted)}</td>
                    <td className="px-4 py-3 text-sm text-green-600 font-medium">{formatCurrency(m.totalApproved)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        m.pendingCount > 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {m.pendingCount}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {m.lastSubmittedAt ? new Date(m.lastSubmittedAt).toLocaleDateString() : '—'}
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
