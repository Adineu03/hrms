'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Award,
  Plus,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Inbox,
} from 'lucide-react';

interface Recognition {
  id: string;
  nomineeName: string;
  nominatorName: string;
  programName: string;
  reason: string;
  date: string;
}

interface PointTransaction {
  id: string;
  type: string;
  points: number;
  description: string;
  date: string;
}

interface RecognitionData {
  pointsBalance: number;
  recognitionsReceived: number;
  recognitionsGiven: number;
  wall: Recognition[];
  received: Recognition[];
  transactions: PointTransaction[];
}

export default function RecognitionAwardsTab() {
  const [data, setData] = useState<RecognitionData | null>(null);
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
      const [receivedRes, wallRes, pointsRes] = await Promise.all([
        api.get('/compensation-rewards/employee/recognition/received'),
        api.get('/compensation-rewards/employee/recognition/wall'),
        api.get('/compensation-rewards/employee/recognition/points'),
      ]);

      const received = Array.isArray(receivedRes.data) ? receivedRes.data : receivedRes.data?.data || [];
      const wall = Array.isArray(wallRes.data) ? wallRes.data : wallRes.data?.data || [];
      const pointsData = pointsRes.data?.data || pointsRes.data || {};

      setData({
        pointsBalance: pointsData.balance || 0,
        recognitionsReceived: pointsData.recognitionsReceived || received.length || 0,
        recognitionsGiven: pointsData.recognitionsGiven || 0,
        wall,
        received,
        transactions: Array.isArray(pointsData.transactions) ? pointsData.transactions : [],
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
      await api.post('/compensation-rewards/employee/recognition/nominate', {
        programId: formProgramId.trim(),
        nomineeId: formNomineeId.trim(),
        category: formCategory.trim(),
        reason: formReason.trim(),
      });
      setSuccess('Peer nomination submitted successfully.');
      setShowModal(false);
      loadData();
    } catch {
      setError('Failed to submit nomination.');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
        <AlertCircle className="h-4 w-4 shrink-0" />
        {error}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Award className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-text">Recognition &amp; Awards</h2>
        </div>
        <button onClick={openNominate} className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors">
          <Plus className="h-4 w-4" />
          Nominate a Peer
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
          <p className="text-sm text-text-muted mb-1">Points Balance</p>
          <p className="text-2xl font-bold text-text">{data?.pointsBalance || 0}</p>
        </div>
        <div className="bg-background rounded-xl border border-border p-5">
          <p className="text-sm text-text-muted mb-1">Recognitions Received</p>
          <p className="text-2xl font-bold text-text">{data?.recognitionsReceived || 0}</p>
        </div>
        <div className="bg-background rounded-xl border border-border p-5">
          <p className="text-sm text-text-muted mb-1">Recognitions Given</p>
          <p className="text-2xl font-bold text-text">{data?.recognitionsGiven || 0}</p>
        </div>
      </div>

      {/* Recognition Wall */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-text uppercase tracking-wider mb-3">Recognition Wall</h3>
        {(!data?.wall || data.wall.length === 0) ? (
          <div className="text-center py-8">
            <Inbox className="h-8 w-8 text-text-muted mx-auto mb-2" />
            <p className="text-text-muted text-sm">No recognitions on the wall yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.wall.map((item) => (
              <div key={item.id} className="bg-background rounded-xl border border-border p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-text">{item.nomineeName}</span>
                      <span className="text-xs text-text-muted">recognized by {item.nominatorName}</span>
                    </div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 mb-2">
                      {item.programName}
                    </span>
                    <p className="text-sm text-text-muted">{item.reason}</p>
                  </div>
                  <span className="text-xs text-text-muted whitespace-nowrap ml-4">
                    {item.date ? new Date(item.date).toLocaleDateString() : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* My Points */}
      <div>
        <h3 className="text-sm font-semibold text-text uppercase tracking-wider mb-3">My Points</h3>
        <div className="bg-background rounded-xl border border-border p-4 mb-4">
          <p className="text-sm text-text-muted">Current Balance</p>
          <p className="text-xl font-bold text-text">{data?.pointsBalance || 0} points</p>
        </div>

        {(!data?.transactions || data.transactions.length === 0) ? (
          <p className="text-sm text-text-muted">No point transactions yet.</p>
        ) : (
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-background">
                <tr>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Type</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Points</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Description</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-background/50">
                    <td className="px-4 py-3 text-sm text-text capitalize">{tx.type}</td>
                    <td className="px-4 py-3 text-sm font-medium">
                      <span className={tx.points >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {tx.points >= 0 ? '+' : ''}{tx.points}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">{tx.description}</td>
                    <td className="px-4 py-3 text-sm text-text-muted">{tx.date ? new Date(tx.date).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Nominate Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-card rounded-xl border border-border p-6 w-full max-w-lg shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text">Nominate a Peer</h3>
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
                  placeholder="Enter program ID"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Nominee</label>
                <input
                  type="text"
                  value={formNomineeId}
                  onChange={(e) => setFormNomineeId(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Enter nominee name or ID"
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
                  placeholder="Why are you nominating this person?"
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
