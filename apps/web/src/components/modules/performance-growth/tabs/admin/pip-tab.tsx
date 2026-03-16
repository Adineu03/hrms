'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Pencil,
  Trash2,
  X,
  Inbox,
  Eye,
  Calendar,
} from 'lucide-react';

const inputClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary';
const selectClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary appearance-none';

interface PipMilestone {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  status: string;
}

interface Pip {
  id: string;
  employeeName: string;
  employeeId: string;
  title: string;
  startDate: string;
  endDate: string;
  status: string;
  progress: number;
  outcome: string;
  milestones: PipMilestone[];
  escalationRules: string;
  createdAt: string;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  improved: 'bg-blue-100 text-blue-700',
  extended: 'bg-yellow-50 text-yellow-700',
  terminated: 'bg-red-100 text-red-700',
  draft: 'bg-gray-100 text-gray-600',
  completed: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-50 text-yellow-700',
  missed: 'bg-red-100 text-red-700',
};

interface MilestoneForm {
  title: string;
  description: string;
  dueDate: string;
}

const defaultFormData = {
  employeeId: '',
  title: '',
  startDate: '',
  endDate: '',
  escalationRules: '',
  milestones: [{ title: '', description: '', dueDate: '' }] as MilestoneForm[],
};

export default function PipTab() {
  const [pips, setPips] = useState<Pip[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState(defaultFormData);
  const [isSaving, setIsSaving] = useState(false);
  const [detailPip, setDetailPip] = useState<Pip | null>(null);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [pipRes, empRes] = await Promise.all([
        api.get('/performance-growth/admin/pip').catch(() => ({ data: [] })),
        api.get('/core-hr/admin/employees').catch(() => ({ data: [] })),
      ]);
      setPips(Array.isArray(pipRes.data) ? pipRes.data : pipRes.data?.data || []);
      setEmployees(Array.isArray(empRes.data) ? empRes.data : empRes.data?.data || []);
    } catch {
      setError('Failed to load PIP data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async () => {
    setError(null);
    if (!formData.employeeId) {
      setError('Please select an employee.');
      return;
    }
    if (!formData.title.trim()) {
      setError('PIP title is required.');
      return;
    }
    setIsSaving(true);
    try {
      await api.post('/performance-growth/admin/pip', formData);
      setSuccess('PIP created successfully.');
      setShowModal(false);
      setFormData(defaultFormData);
      loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to create PIP.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this PIP?')) return;
    try {
      await api.delete(`/performance-growth/admin/pip/${id}`);
      setPips((prev) => prev.filter((p) => p.id !== id));
      setSuccess('PIP deleted.');
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to delete PIP.');
    }
  };

  const addMilestone = () => {
    setFormData((prev) => ({
      ...prev,
      milestones: [...prev.milestones, { title: '', description: '', dueDate: '' }],
    }));
  };

  const removeMilestone = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      milestones: prev.milestones.filter((_, i) => i !== index),
    }));
  };

  const updateMilestone = (index: number, field: keyof MilestoneForm, value: string) => {
    setFormData((prev) => ({
      ...prev,
      milestones: prev.milestones.map((m, i) => (i === index ? { ...m, [field]: value } : m)),
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading PIP data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-text flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Performance Improvement Plans
        </h2>
        <p className="text-sm text-text-muted">Create and manage PIPs with milestones and tracking.</p>
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
        <button
          type="button"
          onClick={() => { setFormData(defaultFormData); setShowModal(true); }}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover transition-colors"
        >
          <Plus className="h-4 w-4" />
          New PIP
        </button>
      </div>

      {/* Table */}
      <div className="border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-background border-b border-border">
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Employee</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Title</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Start Date</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Progress</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Status</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Outcome</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {pips.map((pip) => (
              <tr key={pip.id} className="bg-card hover:bg-background/50 transition-colors">
                <td className="px-4 py-3 text-sm text-text font-medium">{pip.employeeName}</td>
                <td className="px-4 py-3 text-sm text-text-muted">{pip.title}</td>
                <td className="px-4 py-3 text-sm text-text-muted">{pip.startDate ? new Date(pip.startDate).toLocaleDateString() : '--'}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-gray-200 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${pip.progress >= 80 ? 'bg-green-500' : pip.progress >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${pip.progress || 0}%` }}
                      />
                    </div>
                    <span className="text-xs text-text-muted">{pip.progress || 0}%</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[pip.status] || 'bg-gray-100 text-gray-600'}`}>
                    {pip.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-text-muted capitalize">{pip.outcome || '--'}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => setDetailPip(pip)} className="p-1 text-text-muted hover:text-primary transition-colors" title="View Details">
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" onClick={() => handleDelete(pip.id)} className="p-1 text-text-muted hover:text-red-600 transition-colors" title="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {pips.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center">
                  <Inbox className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm text-text-muted">No PIPs created yet.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create PIP Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-card border border-border rounded-xl shadow-lg p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text">New Performance Improvement Plan</h3>
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
                <label className="block text-xs font-medium text-text-muted mb-1">PIP Title *</label>
                <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className={inputClassName} placeholder="e.g. Q1 2026 Performance Improvement" />
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
                <label className="block text-xs font-medium text-text-muted mb-1">Escalation Rules</label>
                <textarea value={formData.escalationRules} onChange={(e) => setFormData({ ...formData, escalationRules: e.target.value })} className={`${inputClassName} min-h-[60px]`} placeholder="Define escalation rules..." rows={2} />
              </div>

              {/* Milestones */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-medium text-text-muted">Milestones</label>
                  <button type="button" onClick={addMilestone} className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-primary text-white hover:bg-primary-hover transition-colors">
                    <Plus className="h-3 w-3" />
                    Add Milestone
                  </button>
                </div>
                <div className="space-y-3">
                  {formData.milestones.map((ms, index) => (
                    <div key={index} className="bg-background rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-text-muted uppercase">Milestone {index + 1}</span>
                        {formData.milestones.length > 1 && (
                          <button type="button" onClick={() => removeMilestone(index)} className="text-text-muted hover:text-red-600 transition-colors">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                      <input type="text" value={ms.title} onChange={(e) => updateMilestone(index, 'title', e.target.value)} className={inputClassName} placeholder="Milestone title" />
                      <input type="text" value={ms.description} onChange={(e) => updateMilestone(index, 'description', e.target.value)} className={inputClassName} placeholder="Description" />
                      <input type="date" value={ms.dueDate} onChange={(e) => updateMilestone(index, 'dueDate', e.target.value)} className={inputClassName} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button type="button" onClick={handleSave} disabled={isSaving} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors">
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                Create PIP
              </button>
              <button type="button" onClick={() => { setShowModal(false); setFormData(defaultFormData); }} className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PIP Detail Modal */}
      {detailPip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-card border border-border rounded-xl shadow-lg p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text">PIP Details</h3>
              <button type="button" onClick={() => setDetailPip(null)} className="text-text-muted hover:text-text">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-lg font-semibold text-text">{detailPip.title}</p>
                <p className="text-sm text-text-muted">{detailPip.employeeName}</p>
              </div>

              <div className="flex items-center gap-4 text-xs text-text-muted">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {detailPip.startDate ? new Date(detailPip.startDate).toLocaleDateString() : '--'} - {detailPip.endDate ? new Date(detailPip.endDate).toLocaleDateString() : '--'}
                </span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[detailPip.status] || 'bg-gray-100 text-gray-600'}`}>
                  {detailPip.status}
                </span>
              </div>

              {/* Progress */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-text-muted">Overall Progress</span>
                  <span className="text-xs font-medium text-text">{detailPip.progress || 0}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${detailPip.progress >= 80 ? 'bg-green-500' : detailPip.progress >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                    style={{ width: `${detailPip.progress || 0}%` }}
                  />
                </div>
              </div>

              {/* Milestones Timeline */}
              <div>
                <h4 className="text-xs font-semibold text-text-muted uppercase mb-3">Milestones</h4>
                {(detailPip.milestones || []).length === 0 ? (
                  <p className="text-xs text-text-muted italic">No milestones defined.</p>
                ) : (
                  <div className="space-y-2">
                    {detailPip.milestones.map((ms) => (
                      <div key={ms.id} className="flex items-start gap-3 bg-background rounded-lg px-3 py-2">
                        <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${ms.status === 'completed' ? 'bg-green-500' : ms.status === 'missed' ? 'bg-red-500' : 'bg-yellow-400'}`} />
                        <div className="flex-1">
                          <span className="text-sm text-text font-medium">{ms.title}</span>
                          {ms.description && <p className="text-xs text-text-muted mt-0.5">{ms.description}</p>}
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-text-muted">Due: {ms.dueDate ? new Date(ms.dueDate).toLocaleDateString() : '--'}</span>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_STYLES[ms.status] || 'bg-gray-100 text-gray-600'}`}>
                              {ms.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {detailPip.escalationRules && (
                <div>
                  <h4 className="text-xs font-semibold text-text-muted uppercase mb-1">Escalation Rules</h4>
                  <p className="text-xs text-text-muted">{detailPip.escalationRules}</p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button type="button" onClick={() => setDetailPip(null)} className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
