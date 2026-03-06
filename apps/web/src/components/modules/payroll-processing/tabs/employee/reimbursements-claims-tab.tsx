'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Receipt,
  Plus,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Inbox,
  Clock,
  XCircle,
  Upload,
} from 'lucide-react';

interface Claim {
  id: string;
  type: string;
  amount: number;
  description: string;
  receiptName: string;
  status: string;
  submittedAt: string;
  processedAt: string;
  remarks: string;
}

interface ClaimHistory {
  id: string;
  type: string;
  amount: number;
  status: string;
  submittedAt: string;
  processedAt: string;
}

const CLAIM_TYPE_OPTIONS = [
  { value: 'travel', label: 'Travel' },
  { value: 'food', label: 'Food & Meals' },
  { value: 'communication', label: 'Communication' },
  { value: 'medical', label: 'Medical' },
  { value: 'fuel', label: 'Fuel' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'training', label: 'Training' },
  { value: 'other', label: 'Other' },
];

export default function ReimbursementsClaimsTab() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [history, setHistory] = useState<ClaimHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);

  const [formType, setFormType] = useState('travel');
  const [formAmount, setFormAmount] = useState(0);
  const [formDescription, setFormDescription] = useState('');
  const [formReceipt, setFormReceipt] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [claimsRes, historyRes] = await Promise.all([
        api.get('/payroll-processing/employee/reimbursements'),
        api.get('/payroll-processing/employee/reimbursements/history'),
      ]);

      const claimsData = Array.isArray(claimsRes.data) ? claimsRes.data : claimsRes.data?.data || [];
      const historyData = Array.isArray(historyRes.data) ? historyRes.data : historyRes.data?.data || [];

      setClaims(claimsData);
      setHistory(historyData);
    } catch {
      setError('Failed to load reimbursement claims.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubmitClaim = async () => {
    if (!formDescription.trim() || formAmount <= 0) return;
    try {
      setSaving(true);
      setError('');
      await api.post('/payroll-processing/employee/reimbursements', {
        type: formType,
        amount: formAmount,
        description: formDescription.trim(),
        receiptName: formReceipt.trim(),
      });
      setSuccess('Claim submitted successfully.');
      setShowModal(false);
      setFormType('travel');
      setFormAmount(0);
      setFormDescription('');
      setFormReceipt('');
      loadData();
    } catch {
      setError('Failed to submit claim.');
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount || 0);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700',
      approved: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
      processing: 'bg-blue-100 text-blue-700',
      paid: 'bg-green-100 text-green-700',
    };
    return styles[status] || 'bg-gray-100 text-gray-700';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
      case 'paid':
        return <CheckCircle2 className="h-3.5 w-3.5" />;
      case 'rejected':
        return <XCircle className="h-3.5 w-3.5" />;
      case 'pending':
      case 'processing':
        return <Clock className="h-3.5 w-3.5" />;
      default:
        return null;
    }
  };

  const getTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      travel: 'bg-blue-100 text-blue-700',
      food: 'bg-orange-100 text-orange-700',
      communication: 'bg-purple-100 text-purple-700',
      medical: 'bg-red-100 text-red-700',
      fuel: 'bg-teal-100 text-teal-700',
      equipment: 'bg-indigo-100 text-indigo-700',
      training: 'bg-cyan-100 text-cyan-700',
      other: 'bg-gray-100 text-gray-700',
    };
    return styles[type] || 'bg-gray-100 text-gray-700';
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
          <Receipt className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-text">Reimbursements &amp; Claims</h2>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors">
          <Plus className="h-4 w-4" />
          Submit Claim
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

      {/* Active Claims */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-text uppercase tracking-wider mb-3">Active Claims</h3>
        {claims.length === 0 ? (
          <div className="text-center py-12">
            <Inbox className="h-10 w-10 text-text-muted mx-auto mb-3" />
            <p className="text-text-muted text-sm">No active reimbursement claims.</p>
          </div>
        ) : (
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-background">
                <tr>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Type</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Description</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Amount</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Status</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Submitted</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {claims.map((c) => (
                  <tr key={c.id} className="hover:bg-background/50">
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getTypeBadge(c.type)}`}>
                        {c.type?.replace('_', ' ') || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text max-w-[200px] truncate">{c.description}</td>
                    <td className="px-4 py-3 text-sm text-text font-medium">{formatCurrency(c.amount)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(c.status)}`}>
                        {getStatusIcon(c.status)}
                        {c.status || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {c.submittedAt ? new Date(c.submittedAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">{c.remarks || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Claims History */}
      <div>
        <h3 className="text-sm font-semibold text-text uppercase tracking-wider mb-3">Claims History</h3>
        {history.length === 0 ? (
          <div className="text-center py-8">
            <Inbox className="h-8 w-8 text-text-muted mx-auto mb-2" />
            <p className="text-text-muted text-sm">No claims history.</p>
          </div>
        ) : (
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-background">
                <tr>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Type</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Amount</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Status</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Submitted</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Processed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {history.map((h) => (
                  <tr key={h.id} className="hover:bg-background/50">
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getTypeBadge(h.type)}`}>
                        {h.type?.replace('_', ' ') || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text font-medium">{formatCurrency(h.amount)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(h.status)}`}>
                        {getStatusIcon(h.status)}
                        {h.status || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {h.submittedAt ? new Date(h.submittedAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {h.processedAt ? new Date(h.processedAt).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Submit Claim Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-card rounded-xl border border-border p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text">Submit Reimbursement Claim</h3>
              <button onClick={() => setShowModal(false)} className="p-1 text-text-muted hover:text-text">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text mb-1">Claim Type</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary appearance-none"
                >
                  {CLAIM_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Amount</label>
                <input
                  type="number"
                  value={formAmount}
                  onChange={(e) => setFormAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Description</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Describe the expense..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Receipt (placeholder)</label>
                <div className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg bg-white text-sm">
                  <Upload className="h-4 w-4 text-text-muted" />
                  <input
                    type="text"
                    value={formReceipt}
                    onChange={(e) => setFormReceipt(e.target.value)}
                    className="flex-1 text-text bg-transparent outline-none"
                    placeholder="e.g. taxi-receipt-mar2026.pdf"
                  />
                </div>
                <p className="text-xs text-text-muted mt-1">File upload will be available in a future update.</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-text-muted border border-border rounded-lg hover:bg-background transition-colors">
                Cancel
              </button>
              <button onClick={handleSubmitClaim} disabled={saving || !formDescription.trim() || formAmount <= 0} className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit Claim'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
