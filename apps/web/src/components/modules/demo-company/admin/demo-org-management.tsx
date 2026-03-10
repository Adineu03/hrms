'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Plus, RefreshCw, Trash2, Building2 } from 'lucide-react';

interface DemoOrg {
  id: string;
  sandboxName: string;
  industryTemplate: string;
  employeeCount: number;
  status: 'active' | 'seeding' | 'error';
  lastResetAt: string | null;
}

interface CreateForm {
  sandboxName: string;
  industryTemplate: string;
  employeeCount: number;
}

const INDUSTRY_TEMPLATES = [
  { value: 'it-services', label: 'IT Services' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'retail', label: 'Retail' },
];

const EMPLOYEE_COUNTS = [10, 25, 50];

const STATUS_BADGE: Record<DemoOrg['status'], string> = {
  active: 'bg-green-100 text-green-700',
  seeding: 'bg-yellow-100 text-yellow-700',
  error: 'bg-red-100 text-red-700',
};

export default function DemoOrgManagement() {
  const [orgs, setOrgs] = useState<DemoOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [form, setForm] = useState<CreateForm>({
    sandboxName: '',
    industryTemplate: 'it-services',
    employeeCount: 25,
  });

  const fetchOrgs = () => {
    setLoading(true);
    setError('');
    api.get('/demo-company/admin/demo-org-management')
      .then((r) => setOrgs(r.data.data ?? []))
      .catch(() => setError('Failed to load demo organizations.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrgs();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.sandboxName.trim()) {
      setFormError('Sandbox name is required.');
      return;
    }
    setSubmitting(true);
    setFormError('');
    try {
      await api.post('/demo-company/admin/demo-org-management', {
        sandboxName: form.sandboxName.trim(),
        industryTemplate: form.industryTemplate,
        employeeCount: form.employeeCount,
      });
      setForm({ sandboxName: '', industryTemplate: 'it-services', employeeCount: 25 });
      setShowForm(false);
      fetchOrgs();
    } catch {
      setFormError('Failed to create sandbox. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = async (id: string) => {
    setResettingId(id);
    try {
      await api.post(`/demo-company/admin/demo-org-management/${id}/reset`, {});
      fetchOrgs();
    } catch {
      // silently ignore
    } finally {
      setResettingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this demo org? This action cannot be undone.')) return;
    setDeletingId(id);
    try {
      await api.delete(`/demo-company/admin/demo-org-management/${id}`);
      setOrgs((prev) => prev.filter((o) => o.id !== id));
    } catch {
      // silently ignore
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#2c2c2c]">Demo Organizations</h2>
          <p className="text-sm text-gray-500 mt-0.5">Create and manage isolated sandbox environments for product demos</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Sandbox
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="font-semibold text-[#2c2c2c] mb-4">Create New Sandbox</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sandbox Name</label>
              <input
                type="text"
                value={form.sandboxName}
                onChange={(e) => setForm((f) => ({ ...f, sandboxName: e.target.value }))}
                placeholder="e.g. Acme Corp Demo"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#2c2c2c] focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Industry Template</label>
                <select
                  value={form.industryTemplate}
                  onChange={(e) => setForm((f) => ({ ...f, industryTemplate: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#2c2c2c] focus:outline-none focus:ring-2 focus:ring-indigo-300"
                >
                  {INDUSTRY_TEMPLATES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employee Count</label>
                <div className="flex gap-2">
                  {EMPLOYEE_COUNTS.map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, employeeCount: count }))}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        form.employeeCount === count
                          ? 'bg-indigo-50 border-indigo-400 text-indigo-700'
                          : 'border-gray-200 text-gray-600 hover:border-indigo-300'
                      }`}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {formError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{formError}</p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {submitting ? 'Creating...' : 'Create Sandbox'}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setFormError(''); }}
                className="px-5 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center text-gray-400 text-sm">
          Loading demo organizations...
        </div>
      )}

      {!loading && error && (
        <div className="bg-white rounded-xl border border-red-200 shadow-sm p-6 text-center">
          <p className="text-red-600 text-sm">{error}</p>
          <button onClick={fetchOrgs} className="mt-3 text-sm text-indigo-600 hover:underline">Retry</button>
        </div>
      )}

      {!loading && !error && orgs.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-10 text-center">
          <Building2 className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No demo organizations yet.</p>
          <p className="text-gray-400 text-xs mt-1">Click &quot;New Sandbox&quot; to create your first demo environment.</p>
        </div>
      )}

      {!loading && !error && orgs.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Template</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Employees</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Last Reset</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {orgs.map((org) => (
                <tr key={org.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4 font-medium text-[#2c2c2c]">{org.sandboxName}</td>
                  <td className="px-5 py-4 text-gray-600">
                    {INDUSTRY_TEMPLATES.find((t) => t.value === org.industryTemplate)?.label ?? org.industryTemplate}
                  </td>
                  <td className="px-5 py-4 text-gray-600">{org.employeeCount}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[org.status]}`}>
                      {org.status.charAt(0).toUpperCase() + org.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-gray-500 text-xs">{formatDate(org.lastResetAt)}</td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleReset(org.id)}
                        disabled={resettingId === org.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${resettingId === org.id ? 'animate-spin' : ''}`} />
                        {resettingId === org.id ? 'Resetting...' : 'Reset'}
                      </button>
                      <button
                        onClick={() => handleDelete(org.id)}
                        disabled={deletingId === org.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-red-200 text-red-600 rounded-lg text-xs font-medium hover:bg-red-50 disabled:opacity-50 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {deletingId === org.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
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
