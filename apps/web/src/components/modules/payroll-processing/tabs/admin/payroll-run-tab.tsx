'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  PlayCircle,
  Plus,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Inbox,
  Eye,
  Play,
  CheckCheck,
  Lock,
  Clock,
  ArrowLeft,
} from 'lucide-react';

interface PayrollRun {
  id: string;
  month: number;
  year: number;
  status: string;
  totalEmployees: number;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  createdAt: string;
  processedAt: string;
  approvedAt: string;
  finalizedAt: string;
}

interface PayrollEntry {
  id: string;
  employeeName: string;
  employeeId: string;
  basicPay: number;
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  status: string;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function PayrollRunTab() {
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [entries, setEntries] = useState<PayrollEntry[]>([]);
  const [selectedRun, setSelectedRun] = useState<PayrollRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [actionLoading, setActionLoading] = useState('');

  const [formMonth, setFormMonth] = useState(new Date().getMonth() + 1);
  const [formYear, setFormYear] = useState(new Date().getFullYear());
  const [saving, setSaving] = useState(false);

  const loadRuns = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/payroll-processing/admin/runs');
      const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setRuns(data);
    } catch {
      setError('Failed to load payroll runs.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRuns();
  }, [loadRuns]);

  const loadEntries = async (run: PayrollRun) => {
    setSelectedRun(run);
    try {
      setLoadingEntries(true);
      const res = await api.get(`/payroll-processing/admin/runs/${run.id}/entries`);
      const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setEntries(data);
    } catch {
      setError('Failed to load payroll entries.');
    } finally {
      setLoadingEntries(false);
    }
  };

  const handleCreateRun = async () => {
    try {
      setSaving(true);
      setError('');
      await api.post('/payroll-processing/admin/runs', {
        month: formMonth,
        year: formYear,
      });
      setSuccess('Payroll run created successfully.');
      setShowModal(false);
      loadRuns();
    } catch {
      setError('Failed to create payroll run.');
    } finally {
      setSaving(false);
    }
  };

  const handleAction = async (runId: string, action: string) => {
    try {
      setActionLoading(`${runId}-${action}`);
      setError('');
      await api.post(`/payroll-processing/admin/runs/${runId}/${action}`);
      setSuccess(`Payroll run ${action === 'process' ? 'processed' : action === 'approve' ? 'approved' : 'finalized'} successfully.`);
      loadRuns();
      if (selectedRun?.id === runId) {
        setSelectedRun(null);
        setEntries([]);
      }
    } catch {
      setError(`Failed to ${action} payroll run.`);
    } finally {
      setActionLoading('');
    }
  };

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(''), 3000);
      return () => clearTimeout(t);
    }
  }, [success]);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-700',
      processing: 'bg-blue-100 text-blue-700',
      processed: 'bg-yellow-100 text-yellow-700',
      approved: 'bg-green-100 text-green-700',
      finalized: 'bg-purple-100 text-purple-700',
      cancelled: 'bg-red-100 text-red-700',
    };
    return styles[status] || 'bg-gray-100 text-gray-700';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return <Clock className="h-3.5 w-3.5" />;
      case 'processing': return <PlayCircle className="h-3.5 w-3.5" />;
      case 'processed': return <CheckCircle2 className="h-3.5 w-3.5" />;
      case 'approved': return <CheckCheck className="h-3.5 w-3.5" />;
      case 'finalized': return <Lock className="h-3.5 w-3.5" />;
      default: return null;
    }
  };

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

  // Detail view for entries
  if (selectedRun) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => { setSelectedRun(null); setEntries([]); }} className="p-1 text-text-muted hover:text-text transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h2 className="text-lg font-semibold text-text">
              {MONTHS[selectedRun.month - 1]} {selectedRun.year} — Payroll Entries
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(selectedRun.status)}`}>
                {getStatusIcon(selectedRun.status)}
                {selectedRun.status}
              </span>
              <span className="text-sm text-text-muted">{selectedRun.totalEmployees} employees</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {loadingEntries ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12">
            <Inbox className="h-10 w-10 text-text-muted mx-auto mb-3" />
            <p className="text-text-muted text-sm">No payroll entries found for this run.</p>
          </div>
        ) : (
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-background">
                <tr>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Employee</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Basic Pay</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Gross Pay</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Deductions</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Net Pay</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {entries.map((e) => (
                  <tr key={e.id} className="hover:bg-background/50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-text">{e.employeeName}</p>
                        <p className="text-xs text-text-muted">{e.employeeId}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-text">{formatCurrency(e.basicPay)}</td>
                    <td className="px-4 py-3 text-sm text-text font-medium">{formatCurrency(e.grossPay)}</td>
                    <td className="px-4 py-3 text-sm text-red-600">{formatCurrency(e.totalDeductions)}</td>
                    <td className="px-4 py-3 text-sm text-text font-semibold">{formatCurrency(e.netPay)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(e.status)}`}>
                        {e.status || '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <PlayCircle className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-text">Payroll Processing</h2>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors">
          <Plus className="h-4 w-4" />
          New Payroll Run
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

      {/* Payroll Runs Table */}
      {runs.length === 0 ? (
        <div className="text-center py-12">
          <Inbox className="h-10 w-10 text-text-muted mx-auto mb-3" />
          <p className="text-text-muted text-sm">No payroll runs created yet.</p>
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-background">
              <tr>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Period</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Status</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Employees</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Gross Pay</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Net Pay</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {runs.map((r) => (
                <tr key={r.id} className="hover:bg-background/50">
                  <td className="px-4 py-3 text-sm text-text font-medium">
                    {MONTHS[r.month - 1]} {r.year}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(r.status)}`}>
                      {getStatusIcon(r.status)}
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-muted">{r.totalEmployees || 0}</td>
                  <td className="px-4 py-3 text-sm text-text">{formatCurrency(r.totalGross)}</td>
                  <td className="px-4 py-3 text-sm text-text font-semibold">{formatCurrency(r.totalNet)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => loadEntries(r)} className="p-1 text-text-muted hover:text-primary transition-colors" title="View Entries">
                        <Eye className="h-4 w-4" />
                      </button>
                      {r.status === 'draft' && (
                        <button
                          onClick={() => handleAction(r.id, 'process')}
                          disabled={actionLoading === `${r.id}-process`}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50"
                          title="Process"
                        >
                          {actionLoading === `${r.id}-process` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                          Process
                        </button>
                      )}
                      {r.status === 'processed' && (
                        <button
                          onClick={() => handleAction(r.id, 'approve')}
                          disabled={actionLoading === `${r.id}-approve`}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors disabled:opacity-50"
                          title="Approve"
                        >
                          {actionLoading === `${r.id}-approve` ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCheck className="h-3 w-3" />}
                          Approve
                        </button>
                      )}
                      {r.status === 'approved' && (
                        <button
                          onClick={() => handleAction(r.id, 'finalize')}
                          disabled={actionLoading === `${r.id}-finalize`}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors disabled:opacity-50"
                          title="Finalize"
                        >
                          {actionLoading === `${r.id}-finalize` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Lock className="h-3 w-3" />}
                          Finalize
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Payroll Run Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-card rounded-xl border border-border p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text">New Payroll Run</h3>
              <button onClick={() => setShowModal(false)} className="p-1 text-text-muted hover:text-text">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text mb-1">Month</label>
                <select
                  value={formMonth}
                  onChange={(e) => setFormMonth(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary appearance-none"
                >
                  {MONTHS.map((m, i) => (
                    <option key={i} value={i + 1}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Year</label>
                <input
                  type="number"
                  value={formYear}
                  onChange={(e) => setFormYear(Number(e.target.value))}
                  min={2020}
                  max={2030}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-text-muted border border-border rounded-lg hover:bg-background transition-colors">
                Cancel
              </button>
              <button onClick={handleCreateRun} disabled={saving} className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Run'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
