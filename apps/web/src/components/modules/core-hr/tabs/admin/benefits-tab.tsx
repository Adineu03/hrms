'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  Plus,
  Pencil,
  X,
  Check,
  Heart,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Power,
} from 'lucide-react';

const inputClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary';
const selectClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary appearance-none';

interface Enrollment {
  id: string;
  employeeName: string;
  enrollDate: string;
  status: string;
}

interface BenefitPlan {
  id: string;
  name: string;
  type: string;
  provider: string | null;
  employerContribution: number;
  employeeContribution: number;
  status: string;
  enrollments?: Enrollment[];
}

interface PlanFormData {
  name: string;
  type: string;
  provider: string;
  employerContribution: number;
  employeeContribution: number;
}

const BENEFIT_TYPES = [
  { value: 'health_insurance', label: 'Health Insurance' },
  { value: 'life_insurance', label: 'Life Insurance' },
  { value: 'retirement', label: 'Retirement / Pension' },
  { value: 'dental', label: 'Dental' },
  { value: 'vision', label: 'Vision' },
  { value: 'wellness', label: 'Wellness' },
  { value: 'other', label: 'Other' },
];

const emptyForm: PlanFormData = {
  name: '',
  type: 'health_insurance',
  provider: '',
  employerContribution: 0,
  employeeContribution: 0,
};

export default function BenefitsTab() {
  const [plans, setPlans] = useState<BenefitPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Add form
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState<PlanFormData>(emptyForm);

  // Editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<PlanFormData>(emptyForm);

  // Expanded for enrollments
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const res = await api.get('/core-hr/admin/benefits/plans');
      setPlans(Array.isArray(res.data) ? res.data : res.data.data || []);
    } catch {
      setError('Failed to load benefit plans.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!formData.name.trim()) {
      setError('Plan name is required.');
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      await api.post('/core-hr/admin/benefits/plans', formData);
      setFormData(emptyForm);
      setShowAddForm(false);
      await loadPlans();
    } catch {
      setError('Failed to create benefit plan.');
    } finally {
      setIsSaving(false);
    }
  };

  const startEdit = (plan: BenefitPlan) => {
    setEditingId(plan.id);
    setEditFormData({
      name: plan.name,
      type: plan.type,
      provider: plan.provider || '',
      employerContribution: plan.employerContribution,
      employeeContribution: plan.employeeContribution,
    });
    setShowAddForm(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditFormData(emptyForm);
  };

  const saveEdit = async () => {
    if (!editingId || !editFormData.name.trim()) return;
    setError(null);
    setIsSaving(true);
    try {
      await api.patch(`/core-hr/admin/benefits/plans/${editingId}`, editFormData);
      await loadPlans();
      cancelEdit();
    } catch {
      setError('Failed to update benefit plan.');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleStatus = async (plan: BenefitPlan) => {
    setError(null);
    setIsSaving(true);
    try {
      const newStatus = plan.status === 'active' ? 'inactive' : 'active';
      await api.patch(`/core-hr/admin/benefits/plans/${plan.id}`, { status: newStatus });
      await loadPlans();
    } catch {
      setError('Failed to update plan status.');
    } finally {
      setIsSaving(false);
    }
  };

  const getTypeLabel = (type: string) =>
    BENEFIT_TYPES.find((t) => t.value === type)?.label || type;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading benefit plans...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text flex items-center gap-2">
            <Heart className="h-5 w-5" />
            Benefit Plans ({plans.length})
          </h2>
          <p className="text-sm text-text-muted">
            Manage employee benefit plans and enrollments.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowAddForm(!showAddForm);
            setFormData(emptyForm);
            cancelEdit();
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Plan
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-background border border-border rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold text-text">New Benefit Plan</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Plan Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Plan name"
                className={`${inputClassName} text-sm`}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className={`${selectClassName} text-sm`}
              >
                {BENEFIT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Provider</label>
              <input
                type="text"
                value={formData.provider}
                onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                placeholder="Provider name"
                className={`${inputClassName} text-sm`}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Employer Contribution</label>
              <input
                type="number"
                value={formData.employerContribution}
                onChange={(e) =>
                  setFormData({ ...formData, employerContribution: parseFloat(e.target.value) || 0 })
                }
                placeholder="0"
                className={`${inputClassName} text-sm`}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Employee Contribution</label>
              <input
                type="number"
                value={formData.employeeContribution}
                onChange={(e) =>
                  setFormData({ ...formData, employeeContribution: parseFloat(e.target.value) || 0 })
                }
                placeholder="0"
                className={`${inputClassName} text-sm`}
              />
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={handleAdd}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover transition-colors disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Save Plan
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setFormData(emptyForm);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Edit Form */}
      {editingId && (
        <div className="bg-background border border-border rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold text-text">Edit Benefit Plan</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Plan Name *</label>
              <input
                type="text"
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                placeholder="Plan name"
                className={`${inputClassName} text-sm`}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Type</label>
              <select
                value={editFormData.type}
                onChange={(e) => setEditFormData({ ...editFormData, type: e.target.value })}
                className={`${selectClassName} text-sm`}
              >
                {BENEFIT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Provider</label>
              <input
                type="text"
                value={editFormData.provider}
                onChange={(e) => setEditFormData({ ...editFormData, provider: e.target.value })}
                placeholder="Provider name"
                className={`${inputClassName} text-sm`}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Employer Contribution</label>
              <input
                type="number"
                value={editFormData.employerContribution}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, employerContribution: parseFloat(e.target.value) || 0 })
                }
                className={`${inputClassName} text-sm`}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Employee Contribution</label>
              <input
                type="number"
                value={editFormData.employeeContribution}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, employeeContribution: parseFloat(e.target.value) || 0 })
                }
                className={`${inputClassName} text-sm`}
              />
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={saveEdit}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover transition-colors disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Update Plan
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Plans Table */}
      <div className="border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-background border-b border-border">
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3 w-8" />
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                Name
              </th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                Type
              </th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                Provider
              </th>
              <th className="text-right text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                Employer Contribution
              </th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                Status
              </th>
              <th className="text-right text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3 w-24">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {plans.map((plan) => (
              <>
                <tr
                  key={plan.id}
                  className="bg-card hover:bg-background/50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedId(expandedId === plan.id ? null : plan.id)
                      }
                      className="text-text-muted hover:text-text transition-colors"
                    >
                      {expandedId === plan.id ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-sm text-text font-medium">
                    <div className="flex items-center gap-2">
                      <Heart className="h-3.5 w-3.5 text-text-muted" />
                      {plan.name}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-background text-text-muted border border-border">
                      {getTypeLabel(plan.type)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-muted">
                    {plan.provider || '--'}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-text">
                    {plan.employerContribution.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        plan.status === 'active'
                          ? 'bg-green-50 text-green-700'
                          : 'bg-red-50 text-red-700'
                      }`}
                    >
                      {plan.status || 'active'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => startEdit(plan)}
                        className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-background transition-colors"
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleStatus(plan)}
                        disabled={isSaving}
                        className="p-1.5 rounded-lg text-text-muted hover:text-orange-500 hover:bg-orange-50 transition-colors disabled:opacity-50"
                        title={plan.status === 'active' ? 'Deactivate' : 'Activate'}
                      >
                        <Power className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
                {expandedId === plan.id && (
                  <tr key={`${plan.id}-enrollments`}>
                    <td colSpan={7} className="px-4 py-3 bg-background/50">
                      <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                        Enrollments
                      </div>
                      {plan.enrollments && plan.enrollments.length > 0 ? (
                        <div className="border border-border rounded-lg overflow-hidden">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-background border-b border-border">
                                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-3 py-2">
                                  Employee
                                </th>
                                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-3 py-2">
                                  Enrolled Date
                                </th>
                                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-3 py-2">
                                  Status
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {plan.enrollments.map((enrollment) => (
                                <tr key={enrollment.id} className="bg-card">
                                  <td className="px-3 py-2 text-text">
                                    {enrollment.employeeName}
                                  </td>
                                  <td className="px-3 py-2 text-text-muted">
                                    {new Date(enrollment.enrollDate).toLocaleDateString()}
                                  </td>
                                  <td className="px-3 py-2">
                                    <span
                                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                        enrollment.status === 'active'
                                          ? 'bg-green-50 text-green-700'
                                          : 'bg-gray-100 text-gray-600'
                                      }`}
                                    >
                                      {enrollment.status}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-sm text-text-muted py-2">
                          No employees enrolled in this plan yet.
                        </p>
                      )}
                    </td>
                  </tr>
                )}
              </>
            ))}

            {/* Empty State */}
            {plans.length === 0 && !showAddForm && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-sm text-text-muted"
                >
                  No benefit plans configured yet. Click &quot;Add Plan&quot; to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
