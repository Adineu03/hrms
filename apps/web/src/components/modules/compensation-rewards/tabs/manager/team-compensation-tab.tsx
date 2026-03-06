'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { Users, Loader2, AlertCircle, Inbox } from 'lucide-react';

interface TeamMember {
  id: string;
  name: string;
  designation: string;
  grade: string;
  currentCtc: number;
  band: string;
  lastIncrement: string;
  tenure: string;
}

interface TeamSummary {
  teamSize: number;
  avgCtc: number;
  budgetUtilization: number;
  lastRevision: string;
  members: TeamMember[];
}

export default function TeamCompensationTab() {
  const [data, setData] = useState<TeamSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/compensation-rewards/manager/team-compensation');
      const result = res.data?.data || res.data || {};
      setData({
        teamSize: result.teamSize || 0,
        avgCtc: result.avgCtc || 0,
        budgetUtilization: result.budgetUtilization || 0,
        lastRevision: result.lastRevision || '—',
        members: Array.isArray(result.members) ? result.members : [],
      });
    } catch {
      setError('Failed to load team compensation data.');
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

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Users className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-text">Team Compensation Overview</h2>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-background rounded-xl border border-border p-5">
          <p className="text-sm text-text-muted mb-1">Team Size</p>
          <p className="text-2xl font-bold text-text">{data?.teamSize || 0}</p>
        </div>
        <div className="bg-background rounded-xl border border-border p-5">
          <p className="text-sm text-text-muted mb-1">Avg CTC</p>
          <p className="text-2xl font-bold text-text">{formatCurrency(data?.avgCtc || 0)}</p>
        </div>
        <div className="bg-background rounded-xl border border-border p-5">
          <p className="text-sm text-text-muted mb-1">Budget Utilization</p>
          <p className="text-2xl font-bold text-text">{data?.budgetUtilization || 0}%</p>
        </div>
        <div className="bg-background rounded-xl border border-border p-5">
          <p className="text-sm text-text-muted mb-1">Last Revision</p>
          <p className="text-2xl font-bold text-text">{data?.lastRevision || '—'}</p>
        </div>
      </div>

      {/* Team Table */}
      {(!data?.members || data.members.length === 0) ? (
        <div className="text-center py-12">
          <Inbox className="h-10 w-10 text-text-muted mx-auto mb-3" />
          <p className="text-text-muted text-sm">No team members found.</p>
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-background">
              <tr>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Name</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Designation</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Grade</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Current CTC</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Band</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Last Increment</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Tenure</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.members.map((m) => (
                <tr key={m.id} className="hover:bg-background/50">
                  <td className="px-4 py-3 text-sm text-text font-medium">{m.name}</td>
                  <td className="px-4 py-3 text-sm text-text-muted">{m.designation}</td>
                  <td className="px-4 py-3 text-sm text-text">{m.grade || '—'}</td>
                  <td className="px-4 py-3 text-sm text-text">{formatCurrency(m.currentCtc || 0)}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                      {m.band || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-muted">{m.lastIncrement || '—'}</td>
                  <td className="px-4 py-3 text-sm text-text-muted">{m.tenure || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
