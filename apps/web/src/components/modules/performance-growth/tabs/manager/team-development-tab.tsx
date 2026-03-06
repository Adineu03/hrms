'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  Plus,
  X,
  Inbox,
  ChevronDown,
  ChevronUp,
  BookOpen,
} from 'lucide-react';

const inputClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary';
const selectClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary appearance-none';

interface DevelopmentActivity {
  id: string;
  title: string;
  type: string;
  status: string;
  dueDate: string;
}

interface DevelopmentPlan {
  id: string;
  employeeName: string;
  employeeId: string;
  title: string;
  type: string;
  progress: number;
  status: string;
  activities: DevelopmentActivity[];
  skillGaps: string[];
  startDate: string;
  endDate: string;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-50 text-yellow-700',
  not_started: 'bg-gray-100 text-gray-600',
  on_hold: 'bg-gray-100 text-gray-600',
};

const PLAN_TYPES = [
  { value: 'idp', label: 'Individual Development Plan' },
  { value: 'skill_building', label: 'Skill Building' },
  { value: 'leadership', label: 'Leadership Development' },
  { value: 'technical', label: 'Technical Growth' },
  { value: 'role_transition', label: 'Role Transition' },
];

const defaultFormData = {
  employeeId: '',
  title: '',
  type: 'idp',
  startDate: '',
  endDate: '',
  skillGaps: [''] as string[],
};

export default function TeamDevelopmentTab() {
  const [plans, setPlans] = useState<DevelopmentPlan[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState(defaultFormData);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);

  // Activity form
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [activityPlanId, setActivityPlanId] = useState<string | null>(null);
  const [activityForm, setActivityForm] = useState({ title: '', type: 'training', dueDate: '' });

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [planRes, empRes] = await Promise.all([
        api.get('/performance-growth/manager/development'),
        api.get('/performance-growth/manager/employees'),
      ]);
      setPlans(Array.isArray(planRes.data) ? planRes.data : planRes.data?.data || []);
      setEmployees(Array.isArray(empRes.data) ? empRes.data : empRes.data?.data || []);
    } catch {
      setError('Failed to load development plans.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async () => {
    setError(null);
    if (!formData.employeeId || !formData.title.trim()) {
      setError('Employee and plan title are required.');
      return;
    }
    setIsSaving(true);
    try {
      await api.post('/performance-growth/manager/development', {
        ...formData,
        skillGaps: formData.skillGaps.filter((s) => s.trim()),
      });
      setSuccess('Development plan created.');
      setShowModal(false);
      setFormData(defaultFormData);
      loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to create development plan.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddActivity = async () => {
    if (!activityPlanId || !activityForm.title.trim()) {
      setError('Activity title is required.');
      return;
    }
    setIsSaving(true);
    try {
      await api.post(`/performance-growth/manager/development/${activityPlanId}/activities`, activityForm);
      setSuccess('Activity added.');
      setShowActivityForm(false);
      setActivityForm({ title: '', type: 'training', dueDate: '' });
      loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to add activity.');
    } finally {
      setIsSaving(false);
    }
  };

  const addSkillGapField = () => {
    setFormData((prev) => ({ ...prev, skillGaps: [...prev.skillGaps, ''] }));
  };

  const updateSkillGap = (index: number, value: string) => {
    setFormData((prev) => ({
      ...prev,
      skillGaps: prev.skillGaps.map((s, i) => (i === index ? value : s)),
    }));
  };

  // Skill gap summary across all plans
  const allSkillGaps = plans.flatMap((p) => p.skillGaps || []).filter(Boolean);
  const skillGapCounts = allSkillGaps.reduce<Record<string, number>>((acc, gap) => {
    acc[gap] = (acc[gap] || 0) + 1;
    return acc;
  }, {});

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading development plans...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Team Development
        </h2>
        <p className="text-sm text-text-muted">Manage development plans and track skill growth for your team.</p>
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

      {/* Skill Gaps Summary */}
      {Object.keys(skillGapCounts).length > 0 && (
        <div className="bg-background border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold text-text mb-2">Team Skill Gaps Summary</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(skillGapCounts).sort((a, b) => b[1] - a[1]).map(([gap, count]) => (
              <span key={gap} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                {gap} <span className="text-red-400">({count})</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => { setFormData(defaultFormData); setShowModal(true); }}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover transition-colors"
        >
          <Plus className="h-4 w-4" />
          Create IDP
        </button>
      </div>

      {/* Development Plans Table */}
      <div className="border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-background border-b border-border">
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Employee</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Plan</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Type</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Progress</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Status</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {plans.map((plan) => (
              <>
                <tr key={plan.id} className="bg-card hover:bg-background/50 transition-colors">
                  <td className="px-4 py-3 text-sm text-text font-medium">{plan.employeeName}</td>
                  <td className="px-4 py-3 text-sm text-text">{plan.title}</td>
                  <td className="px-4 py-3 text-sm text-text-muted capitalize">{plan.type?.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-gray-200 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${plan.progress >= 80 ? 'bg-green-500' : plan.progress >= 50 ? 'bg-yellow-500' : 'bg-blue-500'}`}
                          style={{ width: `${plan.progress || 0}%` }}
                        />
                      </div>
                      <span className="text-xs text-text-muted">{plan.progress || 0}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[plan.status] || 'bg-gray-100 text-gray-600'}`}>
                      {plan.status?.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => setExpandedPlan(expandedPlan === plan.id ? null : plan.id)} className="p-1 text-text-muted hover:text-primary transition-colors" title="Expand">
                        {expandedPlan === plan.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setActivityPlanId(plan.id); setActivityForm({ title: '', type: 'training', dueDate: '' }); setShowActivityForm(true); }}
                        className="p-1 text-text-muted hover:text-primary transition-colors"
                        title="Add Activity"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
                {expandedPlan === plan.id && (
                  <tr key={`${plan.id}-expanded`}>
                    <td colSpan={6} className="px-4 py-3 bg-background/30">
                      <div className="space-y-3">
                        {plan.skillGaps?.length > 0 && (
                          <div>
                            <span className="text-[10px] font-semibold text-text-muted uppercase">Skill Gaps:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {plan.skillGaps.map((gap, i) => (
                                <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-red-50 text-red-700">{gap}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        <div>
                          <span className="text-[10px] font-semibold text-text-muted uppercase">Activities:</span>
                          {(plan.activities || []).length === 0 ? (
                            <p className="text-xs text-text-muted italic mt-1">No activities defined yet.</p>
                          ) : (
                            <div className="space-y-1 mt-1">
                              {plan.activities.map((activity) => (
                                <div key={activity.id} className="flex items-center gap-3 bg-card border border-border rounded-lg px-3 py-2">
                                  <BookOpen className="h-3.5 w-3.5 text-text-muted flex-shrink-0" />
                                  <div className="flex-1">
                                    <span className="text-sm text-text">{activity.title}</span>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <span className="text-[10px] text-text-muted capitalize">{activity.type}</span>
                                      {activity.dueDate && <span className="text-[10px] text-text-muted">Due: {new Date(activity.dueDate).toLocaleDateString()}</span>}
                                    </div>
                                  </div>
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_STYLES[activity.status] || 'bg-gray-100 text-gray-600'}`}>
                                    {activity.status?.replace(/_/g, ' ')}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
            {plans.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center">
                  <Inbox className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm text-text-muted">No development plans yet.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create IDP Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-card border border-border rounded-xl shadow-lg p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text">Create Development Plan</h3>
              <button type="button" onClick={() => { setShowModal(false); setFormData(defaultFormData); }} className="text-text-muted hover:text-text">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Employee *</label>
                <select value={formData.employeeId} onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })} className={selectClassName}>
                  <option value="">Select Employee</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Plan Title *</label>
                <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className={inputClassName} placeholder="e.g. Q1 2026 Development Plan" />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Plan Type</label>
                <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className={selectClassName}>
                  {PLAN_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Start Date</label>
                  <input type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} className={inputClassName} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">End Date</label>
                  <input type="date" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} className={inputClassName} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-medium text-text-muted">Skill Gaps</label>
                  <button type="button" onClick={addSkillGapField} className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-primary text-white hover:bg-primary-hover transition-colors">
                    <Plus className="h-3 w-3" />
                    Add
                  </button>
                </div>
                <div className="space-y-2">
                  {formData.skillGaps.map((gap, index) => (
                    <input key={index} type="text" value={gap} onChange={(e) => updateSkillGap(index, e.target.value)} className={inputClassName} placeholder={`Skill gap ${index + 1}`} />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-6">
              <button type="button" onClick={handleSave} disabled={isSaving} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors">
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                Create Plan
              </button>
              <button type="button" onClick={() => { setShowModal(false); setFormData(defaultFormData); }} className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Activity Modal */}
      {showActivityForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-card border border-border rounded-xl shadow-lg p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text">Add Development Activity</h3>
              <button type="button" onClick={() => setShowActivityForm(false)} className="text-text-muted hover:text-text">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Activity Title *</label>
                <input type="text" value={activityForm.title} onChange={(e) => setActivityForm({ ...activityForm, title: e.target.value })} className={inputClassName} placeholder="e.g. Complete AWS certification" />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Type</label>
                <select value={activityForm.type} onChange={(e) => setActivityForm({ ...activityForm, type: e.target.value })} className={selectClassName}>
                  <option value="training">Training</option>
                  <option value="course">Online Course</option>
                  <option value="mentorship">Mentorship</option>
                  <option value="project">Stretch Project</option>
                  <option value="certification">Certification</option>
                  <option value="reading">Reading/Study</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Due Date</label>
                <input type="date" value={activityForm.dueDate} onChange={(e) => setActivityForm({ ...activityForm, dueDate: e.target.value })} className={inputClassName} />
              </div>
            </div>
            <div className="flex items-center gap-3 mt-6">
              <button type="button" onClick={handleAddActivity} disabled={isSaving} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors">
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                Add Activity
              </button>
              <button type="button" onClick={() => setShowActivityForm(false)} className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
