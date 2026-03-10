'use client';
import { useState, useEffect } from 'react';
import { Loader2, Plus, X, ShieldCheck, Archive, CheckCircle, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';

interface Policy {
  id: string;
  title: string;
  policyCode: string;
  category: string;
  version: string;
  status: 'draft' | 'pending_approval' | 'published' | 'archived';
  effectiveDate: string;
  mandatoryAcknowledgment: boolean;
  description?: string;
}

const categoryOptions = ['hr', 'it', 'safety', 'ethics', 'data-privacy', 'other'];

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  pending_approval: 'bg-yellow-100 text-yellow-700',
  published: 'bg-green-100 text-green-700',
  archived: 'bg-gray-100 text-gray-500',
};

const statusLabels: Record<string, string> = {
  draft: 'Draft',
  pending_approval: 'Pending Approval',
  published: 'Published',
  archived: 'Archived',
};

const categoryColors: Record<string, string> = {
  hr: 'bg-blue-100 text-blue-700',
  it: 'bg-purple-100 text-purple-700',
  safety: 'bg-orange-100 text-orange-700',
  ethics: 'bg-teal-100 text-teal-700',
  'data-privacy': 'bg-indigo-100 text-indigo-700',
  other: 'bg-gray-100 text-gray-700',
};

export default function PolicyManagementTab() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const [form, setForm] = useState({
    title: '',
    policyCode: '',
    category: 'hr',
    description: '',
    mandatoryAcknowledgment: false,
  });

  useEffect(() => {
    fetchPolicies();
  }, []);

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      const res = await api.get('/compliance-audit/admin/policy-management');
      setPolicies(res.data?.data || res.data || []);
    } catch {
      setError('Failed to load policies');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!form.title || !form.policyCode) return;
    try {
      setSubmitting(true);
      await api.post('/compliance-audit/admin/policy-management', form);
      setForm({ title: '', policyCode: '', category: 'hr', description: '', mandatoryAcknowledgment: false });
      setShowForm(false);
      setSuccessMsg('Policy created successfully');
      fetchPolicies();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch {
      setError('Failed to create policy');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePublish = async (id: string) => {
    try {
      await api.post(`/compliance-audit/admin/policy-management/${id}/publish`);
      fetchPolicies();
    } catch {
      setError('Failed to publish policy');
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await api.post(`/compliance-audit/admin/policy-management/${id}/archive`);
      fetchPolicies();
    } catch {
      setError('Failed to archive policy');
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        <span className="ml-2 text-gray-500">Loading policies...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {successMsg && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg p-3 text-green-700 text-sm">
          <CheckCircle className="w-4 h-4" />
          {successMsg}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
          <button onClick={() => setError('')} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[#2c2c2c]">Compliance Policies</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Policy
          </button>
        </div>

        {showForm && (
          <div className="mb-6 p-4 border border-indigo-100 bg-indigo-50 rounded-lg">
            <h3 className="text-sm font-semibold text-[#2c2c2c] mb-3">New Policy</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Policy Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-[#2c2c2c] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., Code of Conduct"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Policy Code *</label>
                <input
                  type="text"
                  value={form.policyCode}
                  onChange={(e) => setForm({ ...form, policyCode: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-[#2c2c2c] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., HR-POL-001"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-[#2c2c2c] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {categoryOptions.map((c) => (
                    <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2 pt-5">
                <input
                  type="checkbox"
                  id="mandatoryAck"
                  checked={form.mandatoryAcknowledgment}
                  onChange={(e) => setForm({ ...form, mandatoryAcknowledgment: e.target.checked })}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="mandatoryAck" className="text-sm text-gray-700">Mandatory Acknowledgment</label>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-[#2c2c2c] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Brief description of the policy..."
                />
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleCreate}
                disabled={submitting}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Create Policy
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {policies.length === 0 ? (
          <div className="text-center py-12">
            <ShieldCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No policies found. Create your first compliance policy.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Policy</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Code</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Version</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Effective Date</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {policies.map((policy) => (
                  <tr key={policy.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-2">
                      <div className="font-medium text-[#2c2c2c]">{policy.title}</div>
                      {policy.mandatoryAcknowledgment && (
                        <span className="text-xs text-indigo-600">Mandatory Ack</span>
                      )}
                    </td>
                    <td className="py-3 px-2 text-gray-600 font-mono text-xs">{policy.policyCode}</td>
                    <td className="py-3 px-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${categoryColors[policy.category] || 'bg-gray-100 text-gray-700'}`}>
                        {policy.category}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-gray-600">{policy.version || 'v1.0'}</td>
                    <td className="py-3 px-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[policy.status]}`}>
                        {statusLabels[policy.status] || policy.status}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-gray-600">
                      {policy.effectiveDate ? new Date(policy.effectiveDate).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-1">
                        {policy.status === 'draft' || policy.status === 'pending_approval' ? (
                          <button
                            onClick={() => handlePublish(policy.id)}
                            className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                          >
                            Publish
                          </button>
                        ) : null}
                        {policy.status === 'published' ? (
                          <button
                            onClick={() => handleArchive(policy.id)}
                            className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
                          >
                            <Archive className="w-3 h-3" />
                            Archive
                          </button>
                        ) : null}
                      </div>
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
