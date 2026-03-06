'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  FileSignature,
  Plus,
  Pencil,
  X,
  Send,
  ShieldCheck,
  Mail,
  Ban,
  Inbox,
  TrendingUp,
  Clock,
  BarChart3,
} from 'lucide-react';

const inputClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary';
const selectClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary appearance-none';

interface Offer {
  id: string;
  applicationId: string;
  candidateName: string;
  designation: string;
  department: string;
  location: string;
  salaryAmount: number;
  currency: string;
  joiningDate: string;
  probationMonths: number;
  terms: string;
  validUntil: string;
  status: string;
  createdAt: string;
}

interface ShortlistedApplication {
  id: string;
  candidateName: string;
  jobTitle: string;
}

interface OfferAnalytics {
  acceptanceRate: number;
  negotiationRate: number;
  avgTimeToAccept: number;
  totalOffers: number;
  acceptedOffers: number;
  rejectedOffers: number;
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  pending_approval: 'bg-yellow-50 text-yellow-700',
  approved: 'bg-blue-50 text-blue-700',
  sent: 'bg-indigo-50 text-indigo-700',
  accepted: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-700',
  negotiating: 'bg-orange-50 text-orange-700',
  expired: 'bg-gray-100 text-gray-500',
};

const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD' },
  { value: 'EUR', label: 'EUR' },
  { value: 'GBP', label: 'GBP' },
  { value: 'INR', label: 'INR' },
  { value: 'AUD', label: 'AUD' },
  { value: 'CAD', label: 'CAD' },
];

const defaultFormData = {
  applicationId: '',
  designation: '',
  department: '',
  location: '',
  salaryAmount: 0,
  currency: 'USD',
  joiningDate: '',
  probationMonths: 3,
  terms: '',
  validUntil: '',
};

export default function OfferManagementTab() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [applications, setApplications] = useState<ShortlistedApplication[]>([]);
  const [analytics, setAnalytics] = useState<OfferAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [formData, setFormData] = useState(defaultFormData);
  const [isSaving, setIsSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [offersRes, appsRes, analyticsRes] = await Promise.all([
        api.get('/talent-acquisition/admin/offers'),
        api.get('/talent-acquisition/admin/offers/shortlisted-applications'),
        api.get('/talent-acquisition/admin/offers/analytics'),
      ]);
      setOffers(Array.isArray(offersRes.data) ? offersRes.data : offersRes.data?.data || []);
      setApplications(Array.isArray(appsRes.data) ? appsRes.data : appsRes.data?.data || []);
      setAnalytics(analyticsRes.data?.data || analyticsRes.data);
    } catch {
      setError('Failed to load offers.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async () => {
    setError(null);
    if (!formData.applicationId && !editingOffer) {
      setError('Please select an application.');
      return;
    }
    if (formData.salaryAmount <= 0) {
      setError('Salary amount must be greater than zero.');
      return;
    }
    setIsSaving(true);
    try {
      if (editingOffer) {
        await api.patch(`/talent-acquisition/admin/offers/${editingOffer.id}`, formData);
        setOffers((prev) =>
          prev.map((o) => (o.id === editingOffer.id ? { ...o, ...formData } : o))
        );
        setSuccess('Offer updated successfully.');
      } else {
        const res = await api.post('/talent-acquisition/admin/offers', formData);
        const newOffer = res.data?.data || res.data;
        setOffers((prev) => [...prev, newOffer]);
        setSuccess('Offer created successfully.');
      }
      setShowCreateForm(false);
      setEditingOffer(null);
      setFormData(defaultFormData);
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to save offer.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAction = async (id: string, action: 'submit' | 'approve' | 'send' | 'revoke') => {
    setError(null);
    const statusMap: Record<string, string> = {
      submit: 'pending_approval',
      approve: 'approved',
      send: 'sent',
      revoke: 'draft',
    };
    const labelMap: Record<string, string> = {
      submit: 'submitted for approval',
      approve: 'approved',
      send: 'sent to candidate',
      revoke: 'revoked',
    };
    try {
      await api.patch(`/talent-acquisition/admin/offers/${id}/${action}`);
      setOffers((prev) =>
        prev.map((o) => (o.id === id ? { ...o, status: statusMap[action] } : o))
      );
      setSuccess(`Offer ${labelMap[action]}.`);
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError(`Failed to ${action} offer.`);
    }
  };

  const openEdit = (offer: Offer) => {
    setEditingOffer(offer);
    setFormData({
      applicationId: offer.applicationId,
      designation: offer.designation,
      department: offer.department,
      location: offer.location,
      salaryAmount: offer.salaryAmount,
      currency: offer.currency,
      joiningDate: offer.joiningDate ? offer.joiningDate.split('T')[0] : '',
      probationMonths: offer.probationMonths,
      terms: offer.terms,
      validUntil: offer.validUntil ? offer.validUntil.split('T')[0] : '',
    });
    setShowCreateForm(true);
  };

  const openCreate = () => {
    setEditingOffer(null);
    setFormData(defaultFormData);
    setShowCreateForm(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading offers...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-text flex items-center gap-2">
          <FileSignature className="h-5 w-5" />
          Offer Management
        </h2>
        <p className="text-sm text-text-muted">Create and manage offer letters for selected candidates.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          {success}
        </div>
      )}

      {/* Analytics Cards */}
      {analytics && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-xs font-medium text-green-700 uppercase tracking-wider">Acceptance Rate</span>
            </div>
            <p className="text-2xl font-bold text-green-700">{analytics.acceptanceRate.toFixed(1)}%</p>
            <p className="text-xs text-green-600 mt-1">{analytics.acceptedOffers} of {analytics.totalOffers} offers</p>
          </div>
          <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="h-4 w-4 text-orange-600" />
              <span className="text-xs font-medium text-orange-700 uppercase tracking-wider">Negotiation Rate</span>
            </div>
            <p className="text-2xl font-bold text-orange-700">{analytics.negotiationRate.toFixed(1)}%</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-medium text-blue-700 uppercase tracking-wider">Avg Time to Accept</span>
            </div>
            <p className="text-2xl font-bold text-blue-700">{analytics.avgTimeToAccept} <span className="text-sm font-normal">days</span></p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Offer
        </button>
      </div>

      {/* Table */}
      <div className="border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-background border-b border-border">
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Candidate</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Designation</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Salary</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Status</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Joining Date</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Valid Until</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {offers.map((offer) => (
              <tr key={offer.id} className="bg-card hover:bg-background/50 transition-colors">
                <td className="px-4 py-3 text-sm text-text font-medium">{offer.candidateName}</td>
                <td className="px-4 py-3 text-sm text-text-muted">{offer.designation}</td>
                <td className="px-4 py-3 text-sm text-text-muted">
                  {offer.currency} {offer.salaryAmount?.toLocaleString() || '0'}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[offer.status] || 'bg-gray-100 text-gray-600'}`}>
                    {offer.status?.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-text-muted">
                  {offer.joiningDate ? new Date(offer.joiningDate).toLocaleDateString() : '--'}
                </td>
                <td className="px-4 py-3 text-sm text-text-muted">
                  {offer.validUntil ? new Date(offer.validUntil).toLocaleDateString() : '--'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    {(offer.status === 'draft' || offer.status === 'negotiating') && (
                      <button
                        type="button"
                        onClick={() => openEdit(offer)}
                        className="p-1 text-text-muted hover:text-primary transition-colors"
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {offer.status === 'draft' && (
                      <button
                        type="button"
                        onClick={() => handleAction(offer.id, 'submit')}
                        className="p-1 text-text-muted hover:text-yellow-600 transition-colors"
                        title="Submit for Approval"
                      >
                        <Send className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {offer.status === 'pending_approval' && (
                      <button
                        type="button"
                        onClick={() => handleAction(offer.id, 'approve')}
                        className="p-1 text-text-muted hover:text-green-600 transition-colors"
                        title="Approve"
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {offer.status === 'approved' && (
                      <button
                        type="button"
                        onClick={() => handleAction(offer.id, 'send')}
                        className="p-1 text-text-muted hover:text-indigo-600 transition-colors"
                        title="Send to Candidate"
                      >
                        <Mail className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {(offer.status === 'sent' || offer.status === 'approved' || offer.status === 'pending_approval') && (
                      <button
                        type="button"
                        onClick={() => handleAction(offer.id, 'revoke')}
                        className="p-1 text-text-muted hover:text-red-600 transition-colors"
                        title="Revoke"
                      >
                        <Ban className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {offers.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center">
                  <Inbox className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm text-text-muted">No offers created yet. Create your first offer.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-card border border-border rounded-xl shadow-lg p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text">
                {editingOffer ? 'Edit Offer' : 'New Offer'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setEditingOffer(null);
                  setFormData(defaultFormData);
                }}
                className="text-text-muted hover:text-text"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              {!editingOffer && (
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Application *</label>
                  <select
                    value={formData.applicationId}
                    onChange={(e) => setFormData({ ...formData, applicationId: e.target.value })}
                    className={selectClassName}
                  >
                    <option value="">Select shortlisted application</option>
                    {applications.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.candidateName} - {a.jobTitle}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Designation</label>
                  <input
                    type="text"
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    className={inputClassName}
                    placeholder="e.g. Senior Engineer"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Department</label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className={inputClassName}
                    placeholder="e.g. Engineering"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className={inputClassName}
                  placeholder="e.g. New York, NY"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Salary Amount *</label>
                  <input
                    type="number"
                    value={formData.salaryAmount}
                    onChange={(e) => setFormData({ ...formData, salaryAmount: parseFloat(e.target.value) || 0 })}
                    min={0}
                    className={inputClassName}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Currency</label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className={selectClassName}
                  >
                    {CURRENCY_OPTIONS.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Joining Date</label>
                  <input
                    type="date"
                    value={formData.joiningDate}
                    onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                    className={inputClassName}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Probation (months)</label>
                  <input
                    type="number"
                    value={formData.probationMonths}
                    onChange={(e) => setFormData({ ...formData, probationMonths: parseInt(e.target.value) || 0 })}
                    min={0}
                    className={inputClassName}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Valid Until</label>
                  <input
                    type="date"
                    value={formData.validUntil}
                    onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                    className={inputClassName}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Terms & Conditions</label>
                <textarea
                  value={formData.terms}
                  onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                  className={`${inputClassName} min-h-[80px]`}
                  placeholder="Additional terms and conditions..."
                  rows={3}
                />
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors"
              >
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingOffer ? 'Update Offer' : 'Create Offer'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setEditingOffer(null);
                  setFormData(defaultFormData);
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
