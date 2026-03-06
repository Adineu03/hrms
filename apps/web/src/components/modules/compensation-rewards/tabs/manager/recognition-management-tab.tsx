'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Award,
  Plus,
  CheckCircle,
  XCircle,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Inbox,
} from 'lucide-react';

interface Nomination {
  id: string;
  nomineeName: string;
  programName: string;
  category: string;
  reason: string;
  status: string;
  date: string;
}

interface NominationSummary {
  totalGiven: number;
  totalReceived: number;
  pendingApprovals: number;
  nominations: Nomination[];
}

export default function RecognitionManagementTab() {
  const [data, setData] = useState<NominationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);

  const [formProgramId, setFormProgramId] = useState('');
  const [formNomineeId, setFormNomineeId] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formReason, setFormReason] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/compensation-rewards/manager/recognition/nominations');
      const result = res.data?.data || res.data || {};
      setData({
        totalGiven: result.totalGiven || 0,
        totalReceived: result.totalReceived || 0,
        pendingApprovals: result.pendingApprovals || 0,
        nominations: Array.isArray(result.nominations) ? result.nominations : Array.isArray(result) ? result : [],
      });
    } catch {
      setError('Failed to load recognition data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openNominate = () => {
    setFormProgramId('');
    setFormNomineeId('');
    setFormCategory('');
    setFormReason('');
    setShowModal(true);
  };

  const handleNominate = async () => {
    if (!formNomineeId.trim() || !formReason.trim()) return;
    try {
      setSaving(true);
      setError('');
      await api.post('/compensation-rewards/manager/recognition/nominations', {
        programId: formProgramId.trim(),
        nomineeId: formNomineeId.trim(),
        category: formCategory.trim(),
        reason: formReason.trim(),
      });
      setSuccess('Nomination submitted successfully.');
      setShowModal(false);
      loadData();
    } catch {
      setError('Failed to submit nomination.');
    } finally {
      setSaving(false);
    }
  };

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    try {
      setError('');
      await api.patch(`/compensation-rewards/manager/recognition/nominations/${id}`, { status: action === 'approve' ? 'approved' : 'rejected' });
      setSuccess(`Nomination ${action}d successfully.`);
      loadData();
    } catch {
      setError(`Failed to ${action} nomination.`);
    }
  };

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(''), 3000);
      return () => clearTimeout(t);
    }
  }, [success]);

  const statusColor = (status: string) => {
    switch (status) {
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
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Award className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-text">Recognition Management</h2>
        </div>
        <button onClick={openNominate} className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors">
          <Plus className="h-4 w-4" />
          Nominate Team Member
        </button>
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-background rounded-xl border border-border p-5">
          <p className="text-sm text-text-muted mb-1">Total Given</p>
          <p className="text-2xl font-bold text-text">{data?.totalGiven || 0}</p>
        </div>
        <div className="bg-background rounded-xl border border-border p-5">
          <p className="text-sm text-text-muted mb-1">Total Received</p>
          <p className="text-2xl font-bold text-text">{data?.totalReceived || 0}</p>
        </div>
        <div className="bg-background rounded-xl border border-border p-5">
          <p className="text-sm text-text-muted mb-1">Pending Approvals</p>
          <p className="text-2xl font-bold text-text">{data?.pendingApprovals || 0}</p>
        </div>
      </div>

      {/* Nominations Table */}
      {(!data?.nominations || data.nominations.length === 0) ? (
        <div className="text-center py-12">
          <Inbox className="h-10 w-10 text-text-muted mx-auto mb-3" />
          <p className="text-text-muted text-sm">No nominations found.</p>
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-background">
              <tr>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Nominee</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Program</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Category</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Reason</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Status</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Date</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.nominations.map((n) => (
                <tr key={n.id} className="hover:bg-background/50">
                  <td className="px-4 py-3 text-sm text-text font-medium">{n.nomineeName}</td>
                  <td className="px-4 py-3 text-sm text-text-muted">{n.programName}</td>
                  <td className="px-4 py-3 text-sm text-text-muted">{n.category || '—'}</td>
                  <td className="px-4 py-3 text-sm text-text-muted max-w-xs truncate">{n.reason}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor(n.status)}`}>
                      {n.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-muted">{n.date ? new Date(n.date).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-3">
                    {n.status === 'pending' && (
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleAction(n.id, 'approve')} className="p-1 text-green-600 hover:text-green-800 transition-colors" title="Approve">
                          <CheckCircle className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleAction(n.id, 'reject')} className="p-1 text-red-500 hover:text-red-700 transition-colors" title="Reject">
                          <XCircle className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Nominate Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-card rounded-xl border border-border p-6 w-full max-w-lg shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text">Nominate Team Member</h3>
              <button onClick={() => setShowModal(false)} className="p-1 text-text-muted hover:text-text">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text mb-1">Program ID</label>
                <input
                  type="text"
                  value={formProgramId}
                  onChange={(e) => setFormProgramId(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Select or enter program ID"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Nominee ID</label>
                <input
                  type="text"
                  value={formNomineeId}
                  onChange={(e) => setFormNomineeId(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Select or enter nominee ID"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Category</label>
                <input
                  type="text"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="e.g. Innovation, Teamwork, Leadership"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Reason</label>
                <textarea
                  value={formReason}
                  onChange={(e) => setFormReason(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Why is this person being nominated?"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-text-muted border border-border rounded-lg hover:bg-background transition-colors">
                Cancel
              </button>
              <button onClick={handleNominate} disabled={saving || !formNomineeId.trim() || !formReason.trim()} className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit Nomination'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
