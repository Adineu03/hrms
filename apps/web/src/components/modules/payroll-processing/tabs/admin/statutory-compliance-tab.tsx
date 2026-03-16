'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Shield,
  Plus,
  Edit2,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Inbox,
  Calendar,
  FileCheck,
  Clock,
} from 'lucide-react';

interface StatutoryFiling {
  id: string;
  type: string;
  period: string;
  dueDate: string;
  status: string;
  amount: number;
  challanNumber: string;
  filedAt: string;
  createdAt: string;
}

interface CalendarDeadline {
  id: string;
  type: string;
  description: string;
  dueDate: string;
  status: string;
}

interface TaxProof {
  id: string;
  employeeName: string;
  employeeId: string;
  section: string;
  declaredAmount: number;
  proofAmount: number;
  status: string;
  submittedAt: string;
}

const FILING_TYPE_OPTIONS = [
  { value: 'pf', label: 'PF (EPF/EPS)' },
  { value: 'esi', label: 'ESI' },
  { value: 'pt', label: 'Professional Tax' },
  { value: 'tds', label: 'TDS (Form 24Q)' },
  { value: 'form_16', label: 'Form 16' },
  { value: 'annual_return', label: 'Annual Return' },
];

const FILING_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'due', label: 'Due' },
  { value: 'filed', label: 'Filed' },
  { value: 'overdue', label: 'Overdue' },
];

export default function StatutoryComplianceTab() {
  const [filings, setFilings] = useState<StatutoryFiling[]>([]);
  const [calendar, setCalendar] = useState<CalendarDeadline[]>([]);
  const [taxProofs, setTaxProofs] = useState<TaxProof[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<StatutoryFiling | null>(null);

  const [formType, setFormType] = useState('pf');
  const [formPeriod, setFormPeriod] = useState('');
  const [formDueDate, setFormDueDate] = useState('');
  const [formAmount, setFormAmount] = useState(0);
  const [formChallan, setFormChallan] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [filingsRes, calendarRes, proofsRes] = await Promise.all([
        api.get('/payroll-processing/admin/statutory/filings').catch(() => ({ data: [] })),
        api.get('/payroll-processing/admin/statutory/calendar').catch(() => ({ data: [] })),
        api.get('/payroll-processing/admin/statutory/tax-proofs').catch(() => ({ data: [] })),
      ]);

      const filingsData = Array.isArray(filingsRes.data) ? filingsRes.data : filingsRes.data?.data || [];
      const calendarData = Array.isArray(calendarRes.data) ? calendarRes.data : calendarRes.data?.data || [];
      const proofsData = Array.isArray(proofsRes.data) ? proofsRes.data : proofsRes.data?.data || [];

      setFilings(filingsData);
      setCalendar(calendarData);
      setTaxProofs(proofsData);
    } catch {
      setError('Failed to load statutory compliance data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openCreate = () => {
    setEditing(null);
    setFormType('pf');
    setFormPeriod('');
    setFormDueDate('');
    setFormAmount(0);
    setFormChallan('');
    setShowModal(true);
  };

  const openEdit = (f: StatutoryFiling) => {
    setEditing(f);
    setFormType(f.type);
    setFormPeriod(f.period || '');
    setFormDueDate(f.dueDate ? f.dueDate.split('T')[0] : '');
    setFormAmount(f.amount || 0);
    setFormChallan(f.challanNumber || '');
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!formPeriod.trim() || !formDueDate) return;
    try {
      setSaving(true);
      setError('');
      const payload = {
        type: formType,
        period: formPeriod.trim(),
        dueDate: formDueDate,
        amount: formAmount,
        challanNumber: formChallan.trim(),
      };
      if (editing) {
        await api.patch(`/payroll-processing/admin/statutory/filings/${editing.id}`, payload);
        setSuccess('Filing updated successfully.');
      } else {
        await api.post('/payroll-processing/admin/statutory/filings', payload);
        setSuccess('Filing created successfully.');
      }
      setShowModal(false);
      loadData();
    } catch {
      setError('Failed to save filing.');
    } finally {
      setSaving(false);
    }
  };

  const handleMarkFiled = async (id: string) => {
    try {
      setError('');
      await api.patch(`/payroll-processing/admin/statutory/filings/${id}`, { status: 'filed', filedAt: new Date().toISOString() });
      setSuccess('Filing marked as filed.');
      loadData();
    } catch {
      setError('Failed to update filing status.');
    }
  };

  const handleVerifyProof = async (id: string, status: string) => {
    try {
      setError('');
      await api.patch(`/payroll-processing/admin/statutory/tax-proofs/${id}`, { status });
      setSuccess(`Tax proof ${status === 'verified' ? 'verified' : 'rejected'} successfully.`);
      loadData();
    } catch {
      setError('Failed to update tax proof status.');
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
      pending: 'bg-yellow-100 text-yellow-700',
      due: 'bg-orange-100 text-orange-700',
      filed: 'bg-green-100 text-green-700',
      overdue: 'bg-red-100 text-red-700',
      verified: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
      submitted: 'bg-blue-100 text-blue-700',
    };
    return styles[status] || 'bg-gray-100 text-gray-700';
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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-text">Statutory Compliance</h2>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors">
          <Plus className="h-4 w-4" />
          Add Filing
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

      {/* Statutory Filings Table */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-text uppercase tracking-wider mb-3">Statutory Filings</h3>
        {filings.length === 0 ? (
          <div className="text-center py-12">
            <Inbox className="h-10 w-10 text-text-muted mx-auto mb-3" />
            <p className="text-text-muted text-sm">No statutory filings recorded yet.</p>
          </div>
        ) : (
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-background">
                <tr>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Type</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Period</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Due Date</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Status</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Amount</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Challan</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filings.map((f) => (
                  <tr key={f.id} className="hover:bg-background/50">
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 uppercase">
                        {f.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text font-medium">{f.period}</td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {f.dueDate ? new Date(f.dueDate).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(f.status)}`}>
                        {f.status || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text">{formatCurrency(f.amount)}</td>
                    <td className="px-4 py-3 text-sm text-text-muted">{f.challanNumber || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(f)} className="p-1 text-text-muted hover:text-primary transition-colors" title="Edit">
                          <Edit2 className="h-4 w-4" />
                        </button>
                        {f.status !== 'filed' && (
                          <button
                            onClick={() => handleMarkFiled(f.id)}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                            title="Mark as Filed"
                          >
                            <FileCheck className="h-3 w-3" />
                            Mark Filed
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
      </div>

      {/* Compliance Calendar */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="h-4 w-4 text-text-muted" />
          <h3 className="text-sm font-semibold text-text uppercase tracking-wider">Upcoming Deadlines</h3>
        </div>
        {calendar.length === 0 ? (
          <div className="text-center py-8">
            <Inbox className="h-8 w-8 text-text-muted mx-auto mb-2" />
            <p className="text-text-muted text-sm">No upcoming deadlines.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {calendar.map((d) => (
              <div key={d.id} className="bg-background rounded-xl border border-border p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 uppercase">
                    {d.type}
                  </span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(d.status)}`}>
                    {d.status}
                  </span>
                </div>
                <p className="text-sm text-text mb-1">{d.description}</p>
                <div className="flex items-center gap-1 text-xs text-text-muted">
                  <Clock className="h-3 w-3" />
                  {d.dueDate ? new Date(d.dueDate).toLocaleDateString() : '—'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tax Proofs Verification */}
      <div>
        <h3 className="text-sm font-semibold text-text uppercase tracking-wider mb-3">Tax Proofs Verification</h3>
        {taxProofs.length === 0 ? (
          <div className="text-center py-8">
            <Inbox className="h-8 w-8 text-text-muted mx-auto mb-2" />
            <p className="text-text-muted text-sm">No tax proofs submitted for verification.</p>
          </div>
        ) : (
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-background">
                <tr>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Employee</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Section</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Declared</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Proof Amount</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Status</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {taxProofs.map((p) => (
                  <tr key={p.id} className="hover:bg-background/50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-text">{p.employeeName}</p>
                        <p className="text-xs text-text-muted">{p.employeeId}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">{p.section}</td>
                    <td className="px-4 py-3 text-sm text-text">{formatCurrency(p.declaredAmount)}</td>
                    <td className="px-4 py-3 text-sm text-text">{formatCurrency(p.proofAmount)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(p.status)}`}>
                        {p.status || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {p.status === 'submitted' && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleVerifyProof(p.id, 'verified')}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            Verify
                          </button>
                          <button
                            onClick={() => handleVerifyProof(p.id, 'rejected')}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                          >
                            <X className="h-3 w-3" />
                            Reject
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
      </div>

      {/* Create/Edit Filing Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-card rounded-xl border border-border p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text">{editing ? 'Edit Filing' : 'Add Filing'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 text-text-muted hover:text-text">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text mb-1">Filing Type</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary appearance-none"
                >
                  {FILING_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Period</label>
                  <input
                    type="text"
                    value={formPeriod}
                    onChange={(e) => setFormPeriod(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="e.g. Mar 2026"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Due Date</label>
                  <input
                    type="date"
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formAmount}
                    onChange={(e) => setFormAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Challan Number</label>
                  <input
                    type="text"
                    value={formChallan}
                    onChange={(e) => setFormChallan(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="Optional"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-text-muted border border-border rounded-lg hover:bg-background transition-colors">
                Cancel
              </button>
              <button onClick={handleSubmit} disabled={saving || !formPeriod.trim() || !formDueDate} className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
