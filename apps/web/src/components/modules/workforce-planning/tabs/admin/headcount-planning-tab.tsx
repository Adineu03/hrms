'use client';
import { useState, useEffect } from 'react';
import { Loader2, Plus, X, Users, CheckCircle, AlertCircle, Lock } from 'lucide-react';
import { api } from '@/lib/api';

interface HeadcountPlan {
  id: string;
  planName: string;
  planYear: number;
  departmentId: string;
  currentHeadcount: number;
  approvedHeadcount: number;
  targetHeadcount: number;
  openRequisitions: number;
  isFrozen: boolean;
  status: 'draft' | 'pending_approval' | 'approved' | 'active';
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  pending_approval: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  active: 'bg-indigo-100 text-indigo-700',
};

const statusLabels: Record<string, string> = {
  draft: 'Draft',
  pending_approval: 'Pending Approval',
  approved: 'Approved',
  active: 'Active',
};

export default function HeadcountPlanningTab() {
  const [plans, setPlans] = useState<HeadcountPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const [form, setForm] = useState({
    planName: '',
    planYear: new Date().getFullYear(),
    departmentId: '',
    currentHeadcount: 0,
    approvedHeadcount: 0,
    targetHeadcount: 0,
  });

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const res = await api.get('/workforce-planning/admin/headcount-planning');
      setPlans(res.data?.data || res.data || []);
    } catch {
      setError('Failed to load headcount plans');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!form.planName || !form.departmentId) return;
    try {
      setSubmitting(true);
      await api.post('/workforce-planning/admin/headcount-planning', form);
      setForm({ planName: '', planYear: new Date().getFullYear(), departmentId: '', currentHeadcount: 0, approvedHeadcount: 0, targetHeadcount: 0 });
      setShowForm(false);
      setSuccessMsg('Headcount plan created successfully');
      fetchPlans();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch {
      setError('Failed to create headcount plan');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await api.post(`/workforce-planning/admin/headcount-planning/${id}/approve`);
      fetchPlans();
    } catch {
      setError('Failed to approve plan');
    }
  };

  const handleToggleFreeze = async (id: string) => {
    try {
      await api.post(`/workforce-planning/admin/headcount-planning/${id}/freeze`);
      fetchPlans();
    } catch {
      setError('Failed to toggle freeze');
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        <span className="ml-2 text-gray-500">Loading headcount plans...</span>
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
          <h2 className="text-lg font-semibold text-[#2c2c2c]">Headcount Plans</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Plan
          </button>
        </div>

        {showForm && (
          <div className="mb-6 p-4 border border-indigo-100 bg-indigo-50 rounded-lg">
            <h3 className="text-sm font-semibold text-[#2c2c2c] mb-3">New Headcount Plan</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Plan Name *</label>
                <input
                  type="text"
                  value={form.planName}
                  onChange={(e) => setForm({ ...form, planName: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-[#2c2c2c] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., FY2026 Engineering Plan"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Plan Year *</label>
                <input
                  type="number"
                  value={form.planYear}
                  onChange={(e) => setForm({ ...form, planYear: parseInt(e.target.value) })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-[#2c2c2c] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Department ID *</label>
                <input
                  type="text"
                  value={form.departmentId}
                  onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-[#2c2c2c] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Department ID"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Current Headcount</label>
                <input
                  type="number"
                  value={form.currentHeadcount}
                  onChange={(e) => setForm({ ...form, currentHeadcount: parseInt(e.target.value) || 0 })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-[#2c2c2c] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Approved Headcount</label>
                <input
                  type="number"
                  value={form.approvedHeadcount}
                  onChange={(e) => setForm({ ...form, approvedHeadcount: parseInt(e.target.value) || 0 })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-[#2c2c2c] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Target Headcount</label>
                <input
                  type="number"
                  value={form.targetHeadcount}
                  onChange={(e) => setForm({ ...form, targetHeadcount: parseInt(e.target.value) || 0 })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-[#2c2c2c] focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                Create Plan
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

        {plans.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No headcount plans found. Create your first plan.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Plan Name</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Year</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Department</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Current HC</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Approved HC</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Target HC</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Open Req</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Freeze</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {plans.map((plan) => (
                  <tr key={plan.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-2 font-medium text-[#2c2c2c]">{plan.planName}</td>
                    <td className="py-3 px-2 text-gray-600">{plan.planYear}</td>
                    <td className="py-3 px-2 text-gray-600 text-xs font-mono">{plan.departmentId}</td>
                    <td className="py-3 px-2 text-gray-700">{plan.currentHeadcount}</td>
                    <td className="py-3 px-2 text-gray-700">{plan.approvedHeadcount}</td>
                    <td className="py-3 px-2 text-gray-700">{plan.targetHeadcount}</td>
                    <td className="py-3 px-2 text-gray-700">{plan.openRequisitions ?? 0}</td>
                    <td className="py-3 px-2">
                      {plan.isFrozen ? (
                        <span className="flex items-center gap-1 text-xs text-red-600">
                          <Lock className="w-3 h-3" /> Frozen
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">Active</span>
                      )}
                    </td>
                    <td className="py-3 px-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[plan.status] || 'bg-gray-100 text-gray-700'}`}>
                        {statusLabels[plan.status] || plan.status}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-1">
                        {(plan.status === 'draft' || plan.status === 'pending_approval') && (
                          <button
                            onClick={() => handleApprove(plan.id)}
                            className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                          >
                            Approve
                          </button>
                        )}
                        <button
                          onClick={() => handleToggleFreeze(plan.id)}
                          className={`px-2 py-1 text-xs rounded transition-colors ${plan.isFrozen ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
                        >
                          {plan.isFrozen ? 'Unfreeze' : 'Freeze'}
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
    </div>
  );
}
