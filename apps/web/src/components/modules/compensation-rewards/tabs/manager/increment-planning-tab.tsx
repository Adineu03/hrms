'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  TrendingUp,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Inbox,
} from 'lucide-react';

interface Revision {
  id: string;
  title: string;
  status: string;
  fiscalYear: string;
}

interface TeamIncrement {
  id: string;
  employeeName: string;
  currentCtc: number;
  proposedCtc: number;
  incrementPct: number;
  meritScore: number;
  status: string;
}

export default function IncrementPlanningTab() {
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [selectedRevision, setSelectedRevision] = useState('');
  const [team, setTeam] = useState<TeamIncrement[]>([]);
  const [loading, setLoading] = useState(true);
  const [teamLoading, setTeamLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<TeamIncrement | null>(null);

  const [formProposedCtc, setFormProposedCtc] = useState('');
  const [formMeritScore, setFormMeritScore] = useState('');
  const [formRemarks, setFormRemarks] = useState('');
  const [saving, setSaving] = useState(false);

  const loadRevisions = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/compensation-rewards/manager/increment-planning/revisions').catch(() => null);
      const raw = res?.data?.data ?? res?.data ?? [];
      const data = Array.isArray(raw) ? raw : [];
      setRevisions(data);
      if (data.length > 0) {
        setSelectedRevision(data[0].id);
      }
    } catch {
      setError('Failed to load revisions.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTeam = useCallback(async (revisionId: string) => {
    if (!revisionId) return;
    try {
      setTeamLoading(true);
      setError('');
      const res = await api.get(`/compensation-rewards/manager/increment-planning/revisions/${revisionId}/team`).catch(() => null);
      const raw = res?.data?.data ?? res?.data ?? [];
      const data: TeamIncrement[] = (Array.isArray(raw) ? raw : []).map((item: Record<string, unknown>) => ({
        id: (item.employeeId ?? item.id ?? '') as string,
        employeeName: (item.employeeName ?? '') as string,
        currentCtc: Number(item.currentCtc ?? 0),
        proposedCtc: Number(item.proposedCtc ?? 0),
        incrementPct: Number(item.incrementPercent ?? item.incrementPct ?? 0),
        meritScore: Number(item.meritScore ?? 0),
        status: (item.status ?? 'pending') as string,
      }));
      setTeam(data);
    } catch {
      setError('Failed to load team data.');
    } finally {
      setTeamLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRevisions();
  }, [loadRevisions]);

  useEffect(() => {
    if (selectedRevision) {
      loadTeam(selectedRevision);
    }
  }, [selectedRevision, loadTeam]);

  const openPropose = (emp: TeamIncrement) => {
    setSelectedEmployee(emp);
    setFormProposedCtc(String(emp.proposedCtc || ''));
    setFormMeritScore(String(emp.meritScore || ''));
    setFormRemarks('');
    setShowModal(true);
  };

  const handlePropose = async () => {
    if (!selectedEmployee || !formProposedCtc) return;
    try {
      setSaving(true);
      setError('');
      await api.post(`/compensation-rewards/manager/increment-planning/revisions/${selectedRevision}/propose`, {
        employeeId: selectedEmployee.id,
        proposedCtc: parseFloat(formProposedCtc) || 0,
        meritScore: parseFloat(formMeritScore) || 0,
        remarks: formRemarks.trim(),
      });
      setSuccess('Increment proposal submitted.');
      setShowModal(false);
      loadTeam(selectedRevision);
    } catch {
      setError('Failed to submit proposal.');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(''), 3000);
      return () => clearTimeout(t);
    }
  }, [success]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val ?? 0);

  const statusColor = (status: string) => {
    switch (status) {
      case 'proposed': return 'bg-blue-100 text-blue-700';
      case 'approved': return 'bg-green-100 text-green-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <TrendingUp className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-text">Increment Planning</h2>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-3 mb-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {success}
        </div>
      )}

      {/* Revision Selector */}
      {revisions.length === 0 ? (
        <div className="text-center py-12">
          <Inbox className="h-10 w-10 text-text-muted mx-auto mb-3" />
          <p className="text-text-muted text-sm">No active revisions available.</p>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <label className="block text-sm font-medium text-text mb-1">Active Revision</label>
            <select
              value={selectedRevision}
              onChange={(e) => setSelectedRevision(e.target.value)}
              className="w-full max-w-md px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary appearance-none"
            >
              {revisions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title} ({r.fiscalYear}) — {r.status}
                </option>
              ))}
            </select>
          </div>

          {teamLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
            </div>
          ) : team.length === 0 ? (
            <div className="text-center py-12">
              <Inbox className="h-10 w-10 text-text-muted mx-auto mb-3" />
              <p className="text-text-muted text-sm">No team members in this revision.</p>
            </div>
          ) : (
            <div className="border border-border rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-background">
                  <tr>
                    <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Employee Name</th>
                    <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Current CTC</th>
                    <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Proposed CTC</th>
                    <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Increment %</th>
                    <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Merit Score</th>
                    <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Status</th>
                    <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {team.map((emp) => (
                    <tr key={emp.id} className="hover:bg-background/50">
                      <td className="px-4 py-3 text-sm text-text font-medium">{emp.employeeName}</td>
                      <td className="px-4 py-3 text-sm text-text">{formatCurrency(emp.currentCtc || 0)}</td>
                      <td className="px-4 py-3 text-sm text-text">{emp.proposedCtc ? formatCurrency(emp.proposedCtc) : '—'}</td>
                      <td className="px-4 py-3 text-sm text-text">{emp.incrementPct ? `${emp.incrementPct}%` : '—'}</td>
                      <td className="px-4 py-3 text-sm text-text">{emp.meritScore || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor(emp.status)}`}>
                          {emp.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => openPropose(emp)} className="text-xs text-primary hover:text-primary-hover font-medium">
                          Propose
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Propose Modal */}
      {showModal && selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-card rounded-xl border border-border p-6 w-full max-w-lg shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text">Propose Increment — {selectedEmployee.employeeName}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 text-text-muted hover:text-text">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-sm text-text-muted mb-4">
              Current CTC: {formatCurrency(selectedEmployee.currentCtc || 0)}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text mb-1">Proposed CTC</label>
                <input
                  type="number"
                  value={formProposedCtc}
                  onChange={(e) => setFormProposedCtc(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="e.g. 1200000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Merit Score</label>
                <input
                  type="number"
                  value={formMeritScore}
                  onChange={(e) => setFormMeritScore(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="e.g. 4.5"
                  step="0.1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Remarks</label>
                <textarea
                  value={formRemarks}
                  onChange={(e) => setFormRemarks(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Justification for the proposed increment"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-text-muted border border-border rounded-lg hover:bg-background transition-colors">
                Cancel
              </button>
              <button onClick={handlePropose} disabled={saving || !formProposedCtc} className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit Proposal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
