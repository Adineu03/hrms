'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Shield,
  Plus,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Inbox,
} from 'lucide-react';

interface BenefitPlan {
  id: string;
  name: string;
  type: string;
  provider: string;
  employerContribution: number;
  employeeContribution: number;
  enrollmentPeriod: string;
  description?: string;
}

interface Enrollment {
  id: string;
  planName: string;
  type: string;
  status: string;
  enrolledDate: string;
}

interface Reimbursement {
  id: string;
  type: string;
  amount: number;
  description: string;
  status: string;
  date: string;
}

const REIMBURSEMENT_TYPES = [
  { value: 'medical', label: 'Medical' },
  { value: 'travel', label: 'Travel' },
  { value: 'food', label: 'Food' },
  { value: 'telephone', label: 'Telephone' },
  { value: 'fuel', label: 'Fuel' },
  { value: 'other', label: 'Other' },
];

export default function BenefitsEnrollmentTab() {
  const [plans, setPlans] = useState<BenefitPlan[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [reimbursements, setReimbursements] = useState<Reimbursement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showReimbursementModal, setShowReimbursementModal] = useState(false);

  const [formType, setFormType] = useState('medical');
  const [formAmount, setFormAmount] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [plansRes, enrollmentsRes, reimbursementsRes] = await Promise.all([
        api.get('/compensation-rewards/employee/benefits/plans'),
        api.get('/compensation-rewards/employee/benefits/enrollments'),
        api.get('/compensation-rewards/employee/benefits/reimbursements'),
      ]);

      setPlans(Array.isArray(plansRes.data) ? plansRes.data : plansRes.data?.data || []);
      setEnrollments(Array.isArray(enrollmentsRes.data) ? enrollmentsRes.data : enrollmentsRes.data?.data || []);
      setReimbursements(Array.isArray(reimbursementsRes.data) ? reimbursementsRes.data : reimbursementsRes.data?.data || []);
    } catch {
      setError('Failed to load benefits data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleEnroll = async (planId: string) => {
    try {
      setError('');
      await api.post('/compensation-rewards/employee/benefits/enrollments', { planId });
      setSuccess('Successfully enrolled in benefit plan.');
      loadData();
    } catch {
      setError('Failed to enroll in plan.');
    }
  };

  const handleOptOut = async (enrollmentId: string) => {
    if (!confirm('Are you sure you want to opt out of this plan?')) return;
    try {
      setError('');
      await api.patch(`/compensation-rewards/employee/benefits/enrollments/${enrollmentId}`, { status: 'opted_out' });
      setSuccess('Successfully opted out of plan.');
      loadData();
    } catch {
      setError('Failed to opt out of plan.');
    }
  };

  const handleSubmitReimbursement = async () => {
    if (!formAmount || !formDescription.trim()) return;
    try {
      setSaving(true);
      setError('');
      await api.post('/compensation-rewards/employee/benefits/reimbursements', {
        type: formType,
        amount: parseFloat(formAmount) || 0,
        description: formDescription.trim(),
      });
      setSuccess('Reimbursement claim submitted successfully.');
      setShowReimbursementModal(false);
      setFormType('medical');
      setFormAmount('');
      setFormDescription('');
      loadData();
    } catch {
      setError('Failed to submit reimbursement claim.');
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
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  const statusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'enrolled': return 'bg-green-100 text-green-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'approved': return 'bg-green-100 text-green-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      case 'opted_out': return 'bg-gray-100 text-gray-700';
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
        <Shield className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-text">Benefits &amp; Enrollment</h2>
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

      {/* Available Plans */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-text uppercase tracking-wider mb-3">Available Plans</h3>
        {plans.length === 0 ? (
          <div className="text-center py-8">
            <Inbox className="h-8 w-8 text-text-muted mx-auto mb-2" />
            <p className="text-text-muted text-sm">No benefit plans available.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.map((plan) => (
              <div key={plan.id} className="bg-background rounded-xl border border-border p-5">
                <h4 className="text-sm font-semibold text-text mb-1">{plan.name}</h4>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 mb-3">
                  {plan.type}
                </span>
                {plan.description && (
                  <p className="text-xs text-text-muted mb-3">{plan.description}</p>
                )}
                <div className="space-y-1 mb-4">
                  <div className="flex justify-between text-xs">
                    <span className="text-text-muted">Provider</span>
                    <span className="text-text font-medium">{plan.provider || '—'}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-text-muted">Employer Contribution</span>
                    <span className="text-text font-medium">{formatCurrency(plan.employerContribution || 0)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-text-muted">Employee Contribution</span>
                    <span className="text-text font-medium">{formatCurrency(plan.employeeContribution || 0)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-text-muted">Enrollment Period</span>
                    <span className="text-text font-medium">{plan.enrollmentPeriod || '—'}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleEnroll(plan.id)}
                  className="w-full px-3 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
                >
                  Enroll
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* My Enrollments */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-text uppercase tracking-wider mb-3">My Enrollments</h3>
        {enrollments.length === 0 ? (
          <div className="text-center py-8">
            <Inbox className="h-8 w-8 text-text-muted mx-auto mb-2" />
            <p className="text-text-muted text-sm">No active enrollments.</p>
          </div>
        ) : (
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-background">
                <tr>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Plan Name</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Type</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Status</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Enrolled Date</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {enrollments.map((e) => (
                  <tr key={e.id} className="hover:bg-background/50">
                    <td className="px-4 py-3 text-sm text-text font-medium">{e.planName}</td>
                    <td className="px-4 py-3 text-sm text-text-muted capitalize">{e.type}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor(e.status)}`}>
                        {e.status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">{e.enrolledDate ? new Date(e.enrolledDate).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3">
                      {(e.status === 'active' || e.status === 'enrolled') && (
                        <button onClick={() => handleOptOut(e.id)} className="text-xs text-red-600 hover:text-red-800 font-medium">
                          Opt Out
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reimbursements */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-text uppercase tracking-wider">Reimbursements</h3>
          <button
            onClick={() => setShowReimbursementModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-lg hover:bg-primary-hover transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            New Claim
          </button>
        </div>

        {reimbursements.length === 0 ? (
          <div className="text-center py-8">
            <Inbox className="h-8 w-8 text-text-muted mx-auto mb-2" />
            <p className="text-text-muted text-sm">No reimbursement claims.</p>
          </div>
        ) : (
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-background">
                <tr>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Type</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Amount</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Description</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Status</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {reimbursements.map((r) => (
                  <tr key={r.id} className="hover:bg-background/50">
                    <td className="px-4 py-3 text-sm text-text capitalize">{r.type}</td>
                    <td className="px-4 py-3 text-sm text-text font-medium">{formatCurrency(r.amount)}</td>
                    <td className="px-4 py-3 text-sm text-text-muted max-w-xs truncate">{r.description}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor(r.status)}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">{r.date ? new Date(r.date).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reimbursement Modal */}
      {showReimbursementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-card rounded-xl border border-border p-6 w-full max-w-lg shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text">New Reimbursement Claim</h3>
              <button onClick={() => setShowReimbursementModal(false)} className="p-1 text-text-muted hover:text-text">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text mb-1">Type</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary appearance-none"
                >
                  {REIMBURSEMENT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Amount</label>
                <input
                  type="number"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="e.g. 5000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Description</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Describe the expense"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowReimbursementModal(false)} className="px-4 py-2 text-sm font-medium text-text-muted border border-border rounded-lg hover:bg-background transition-colors">
                Cancel
              </button>
              <button onClick={handleSubmitReimbursement} disabled={saving || !formAmount || !formDescription.trim()} className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit Claim'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
