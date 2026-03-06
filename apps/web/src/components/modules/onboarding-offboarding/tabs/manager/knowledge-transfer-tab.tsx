'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  BookOpen,
  Plus,
  Pencil,
  Trash2,
  X,
  Inbox,
} from 'lucide-react';

const inputClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary';
const selectClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary appearance-none';

interface KTPlan {
  id: string;
  departingEmployeeName: string;
  departingEmployeeId: string;
  assignedToName: string;
  assignedToId: string;
  itemsCount: number;
  completedCount: number;
  completionPercent: number;
  status: string;
  createdAt: string;
}

interface TeamMember {
  id: string;
  name: string;
}

interface DepartingEmployee {
  id: string;
  name: string;
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  draft: 'bg-gray-100 text-gray-600',
  overdue: 'bg-red-100 text-red-700',
};

const defaultFormData = {
  departingEmployeeId: '',
  assignedToId: '',
  items: '',
};

export default function KnowledgeTransferTab() {
  const [plans, setPlans] = useState<KTPlan[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [departingEmployees, setDepartingEmployees] = useState<DepartingEmployee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState(defaultFormData);
  const [isSaving, setIsSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [plansRes, membersRes, departingRes] = await Promise.all([
        api.get('/onboarding-offboarding/manager/knowledge-transfer'),
        api.get('/onboarding-offboarding/manager/team-members'),
        api.get('/onboarding-offboarding/manager/departing-employees'),
      ]);
      setPlans(Array.isArray(plansRes.data) ? plansRes.data : plansRes.data?.data || []);
      setTeamMembers(Array.isArray(membersRes.data) ? membersRes.data : membersRes.data?.data || []);
      setDepartingEmployees(Array.isArray(departingRes.data) ? departingRes.data : departingRes.data?.data || []);
    } catch {
      setError('Failed to load knowledge transfer plans.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async () => {
    setError(null);
    if (!formData.departingEmployeeId || !formData.assignedToId) {
      setError('Both departing employee and assignee are required.');
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        departingEmployeeId: formData.departingEmployeeId,
        assignedToId: formData.assignedToId,
        items: formData.items.split('\n').filter((s) => s.trim()),
      };
      await api.post('/onboarding-offboarding/manager/knowledge-transfer', payload);
      setSuccess('KT plan created successfully.');
      setShowCreateForm(false);
      setFormData(defaultFormData);
      loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to create KT plan.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this knowledge transfer plan?')) return;
    setError(null);
    try {
      await api.delete(`/onboarding-offboarding/manager/knowledge-transfer/${id}`);
      setPlans((prev) => prev.filter((p) => p.id !== id));
      setSuccess('KT plan deleted.');
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to delete KT plan.');
    }
  };

  const renderProgressBar = (percent: number) => (
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div
        className={`h-2 rounded-full transition-all ${
          percent >= 80 ? 'bg-green-500' : percent >= 50 ? 'bg-yellow-500' : 'bg-red-500'
        }`}
        style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
      />
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading KT plans...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-text flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Knowledge Transfer Plans
        </h2>
        <p className="text-sm text-text-muted">Create and track knowledge transfer plans for departing team members.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />{error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />{success}
        </div>
      )}

      <div className="flex items-center justify-end">
        <button type="button" onClick={() => { setFormData(defaultFormData); setShowCreateForm(true); }} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover transition-colors">
          <Plus className="h-4 w-4" />
          Create KT Plan
        </button>
      </div>

      {/* Table */}
      <div className="border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-background border-b border-border">
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Departing Employee</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Assigned To</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Items</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3 w-40">Completion</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Status</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {plans.map((plan) => (
              <tr key={plan.id} className="bg-card hover:bg-background/50 transition-colors">
                <td className="px-4 py-3 text-sm text-text font-medium">{plan.departingEmployeeName}</td>
                <td className="px-4 py-3 text-sm text-text-muted">{plan.assignedToName}</td>
                <td className="px-4 py-3 text-sm text-text-muted">{plan.completedCount}/{plan.itemsCount}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1">{renderProgressBar(plan.completionPercent)}</div>
                    <span className="text-xs font-medium text-text w-10 text-right">{plan.completionPercent}%</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[plan.status] || 'bg-gray-100 text-gray-600'}`}>
                    {plan.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => handleDelete(plan.id)} className="p-1 text-text-muted hover:text-red-600 transition-colors" title="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {plans.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center">
                  <Inbox className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm text-text-muted">No knowledge transfer plans yet.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create KT Plan Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-card border border-border rounded-xl shadow-lg p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text">Create Knowledge Transfer Plan</h3>
              <button type="button" onClick={() => setShowCreateForm(false)} className="text-text-muted hover:text-text">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Departing Employee *</label>
                <select value={formData.departingEmployeeId} onChange={(e) => setFormData({ ...formData, departingEmployeeId: e.target.value })} className={selectClassName}>
                  <option value="">Select departing employee</option>
                  {departingEmployees.map((e) => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Assign To *</label>
                <select value={formData.assignedToId} onChange={(e) => setFormData({ ...formData, assignedToId: e.target.value })} className={selectClassName}>
                  <option value="">Select team member</option>
                  {teamMembers.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">KT Items (one per line)</label>
                <textarea
                  value={formData.items}
                  onChange={(e) => setFormData({ ...formData, items: e.target.value })}
                  className={`${inputClassName} min-h-[120px]`}
                  placeholder="Project documentation handover&#10;Client relationship handoff&#10;Access credentials transfer&#10;Pending tasks review"
                  rows={6}
                />
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button type="button" onClick={handleSave} disabled={isSaving} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors">
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                Create Plan
              </button>
              <button type="button" onClick={() => setShowCreateForm(false)} className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
