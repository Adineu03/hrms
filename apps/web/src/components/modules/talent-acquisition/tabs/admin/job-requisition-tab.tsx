'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  Plus,
  Pencil,
  Trash2,
  X,
  Send,
  ShieldCheck,
  UserPlus,
} from 'lucide-react';
import { Skeleton, TableSkeleton } from '@/components/ui/skeleton';
import { TableEmptyState } from '@/components/ui/empty-state';

const inputClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary';
const selectClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary appearance-none';

interface Requisition {
  id: string;
  title: string;
  departmentId: string;
  departmentName: string;
  designationId: string;
  designationName: string;
  locationId: string;
  locationName: string;
  headcount: number;
  employmentType: string;
  salaryRangeMin: number;
  salaryRangeMax: number;
  description: string;
  requirements: string;
  priority: string;
  status: string;
  targetHireDate: string;
  createdAt: string;
}

interface Department {
  id: string;
  name: string;
}

interface Designation {
  id: string;
  name: string;
}

interface Location {
  id: string;
  name: string;
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  pending_approval: 'bg-yellow-50 text-yellow-700',
  approved: 'bg-blue-50 text-blue-700',
  open: 'bg-green-50 text-green-700',
  filled: 'bg-purple-50 text-purple-700',
  cancelled: 'bg-red-50 text-red-700',
};

const PRIORITY_STYLES: Record<string, string> = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-blue-50 text-blue-700',
  high: 'bg-orange-50 text-orange-700',
  urgent: 'bg-red-50 text-red-700',
};

const EMPLOYMENT_TYPES = [
  { value: 'full_time', label: 'Full Time' },
  { value: 'part_time', label: 'Part Time' },
  { value: 'contract', label: 'Contract' },
  { value: 'intern', label: 'Intern' },
  { value: 'temporary', label: 'Temporary' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const defaultFormData = {
  title: '',
  departmentId: '',
  designationId: '',
  locationId: '',
  headcount: 1,
  employmentType: 'full_time',
  salaryRangeMin: 0,
  salaryRangeMax: 0,
  description: '',
  requirements: '',
  priority: 'medium',
  targetHireDate: '',
};

export default function JobRequisitionTab() {
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingRequisition, setEditingRequisition] = useState<Requisition | null>(null);
  const [formData, setFormData] = useState(defaultFormData);
  const [isSaving, setIsSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [reqRes, deptRes, desigRes, locRes] = await Promise.all([
        api.get('/talent-acquisition/admin/requisitions'),
        api.get('/talent-acquisition/admin/departments'),
        api.get('/talent-acquisition/admin/designations'),
        api.get('/talent-acquisition/admin/locations'),
      ]);
      setRequisitions(Array.isArray(reqRes.data) ? reqRes.data : reqRes.data?.data || []);
      setDepartments(Array.isArray(deptRes.data) ? deptRes.data : deptRes.data?.data || []);
      setDesignations(Array.isArray(desigRes.data) ? desigRes.data : desigRes.data?.data || []);
      setLocations(Array.isArray(locRes.data) ? locRes.data : locRes.data?.data || []);
    } catch {
      setError('Failed to load requisitions.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async () => {
    setError(null);
    if (!formData.title.trim()) {
      setError('Job title is required.');
      return;
    }
    setIsSaving(true);
    try {
      if (editingRequisition) {
        await api.patch(`/talent-acquisition/admin/requisitions/${editingRequisition.id}`, formData);
        setRequisitions((prev) =>
          prev.map((r) => (r.id === editingRequisition.id ? { ...r, ...formData } : r))
        );
        setSuccess('Requisition updated successfully.');
      } else {
        const res = await api.post('/talent-acquisition/admin/requisitions', formData);
        const newReq = res.data?.data || res.data;
        setRequisitions((prev) => [...prev, newReq]);
        setSuccess('Requisition created successfully.');
      }
      setShowCreateForm(false);
      setEditingRequisition(null);
      setFormData(defaultFormData);
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to save requisition.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitForApproval = async (id: string) => {
    setError(null);
    try {
      await api.patch(`/talent-acquisition/admin/requisitions/${id}/submit`);
      setRequisitions((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: 'pending_approval' } : r))
      );
      setSuccess('Requisition submitted for approval.');
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to submit requisition.');
    }
  };

  const handleApprove = async (id: string) => {
    setError(null);
    try {
      await api.patch(`/talent-acquisition/admin/requisitions/${id}/approve`);
      setRequisitions((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: 'approved' } : r))
      );
      setSuccess('Requisition approved.');
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to approve requisition.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this requisition?')) return;
    setError(null);
    try {
      await api.delete(`/talent-acquisition/admin/requisitions/${id}`);
      setRequisitions((prev) => prev.filter((r) => r.id !== id));
      setSuccess('Requisition deleted.');
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to delete requisition.');
    }
  };

  const openEdit = (req: Requisition) => {
    setEditingRequisition(req);
    setFormData({
      title: req.title,
      departmentId: req.departmentId,
      designationId: req.designationId,
      locationId: req.locationId,
      headcount: req.headcount,
      employmentType: req.employmentType,
      salaryRangeMin: req.salaryRangeMin,
      salaryRangeMax: req.salaryRangeMax,
      description: req.description,
      requirements: req.requirements,
      priority: req.priority,
      targetHireDate: req.targetHireDate ? req.targetHireDate.split('T')[0] : '',
    });
    setShowCreateForm(true);
  };

  const openCreate = () => {
    setEditingRequisition(null);
    setFormData(defaultFormData);
    setShowCreateForm(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="space-y-1.5">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-4 w-80" />
        </div>
        <TableSkeleton rows={4} cols={5} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-text flex items-center gap-2">
          <ClipboardList className="h-5 w-5" />
          Job Requisition Management
        </h2>
        <p className="text-sm text-text-muted">Create and manage job requisitions with approval workflows.</p>
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

      {/* Actions */}
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Requisition
        </button>
      </div>

      {/* Table */}
      <div className="border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-background border-b border-border">
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Title</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Department</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Headcount</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Status</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Priority</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Created</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {requisitions.map((req) => (
              <tr key={req.id} className="bg-card hover:bg-background/50 transition-colors">
                <td className="px-4 py-3 text-sm text-text font-medium">{req.title}</td>
                <td className="px-4 py-3 text-sm text-text-muted">{req.departmentName || '--'}</td>
                <td className="px-4 py-3 text-sm text-text-muted">{req.headcount}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[req.status] || 'bg-gray-100 text-gray-600'}`}>
                    {req.status.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${PRIORITY_STYLES[req.priority] || 'bg-gray-100 text-gray-600'}`}>
                    {req.priority}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-text-muted">
                  {req.createdAt ? new Date(req.createdAt).toLocaleDateString() : '--'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(req)}
                      className="p-1 text-text-muted hover:text-primary transition-colors"
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    {req.status === 'draft' && (
                      <button
                        type="button"
                        onClick={() => handleSubmitForApproval(req.id)}
                        className="p-1 text-text-muted hover:text-yellow-600 transition-colors"
                        title="Submit for Approval"
                      >
                        <Send className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {req.status === 'pending_approval' && (
                      <button
                        type="button"
                        onClick={() => handleApprove(req.id)}
                        className="p-1 text-text-muted hover:text-green-600 transition-colors"
                        title="Approve"
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(req.id)}
                      className="p-1 text-text-muted hover:text-red-600 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {requisitions.length === 0 && (
              <TableEmptyState
                icon={UserPlus}
                title="No job requisitions yet"
                description="Create your first job requisition to start the hiring process."
                colSpan={7}
                action={{ label: 'New Requisition', onClick: openCreate }}
              />
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-card border border-border rounded-xl shadow-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text">
                {editingRequisition ? 'Edit Requisition' : 'New Requisition'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setEditingRequisition(null);
                  setFormData(defaultFormData);
                }}
                className="text-text-muted hover:text-text"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Job Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className={inputClassName}
                  placeholder="e.g. Senior Software Engineer"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Department</label>
                  <select
                    value={formData.departmentId}
                    onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                    className={selectClassName}
                  >
                    <option value="">Select department</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Designation</label>
                  <select
                    value={formData.designationId}
                    onChange={(e) => setFormData({ ...formData, designationId: e.target.value })}
                    className={selectClassName}
                  >
                    <option value="">Select designation</option>
                    {designations.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Location</label>
                  <select
                    value={formData.locationId}
                    onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
                    className={selectClassName}
                  >
                    <option value="">Select location</option>
                    {locations.map((l) => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Headcount</label>
                  <input
                    type="number"
                    value={formData.headcount}
                    onChange={(e) => setFormData({ ...formData, headcount: parseInt(e.target.value) || 1 })}
                    min={1}
                    className={inputClassName}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Employment Type</label>
                  <select
                    value={formData.employmentType}
                    onChange={(e) => setFormData({ ...formData, employmentType: e.target.value })}
                    className={selectClassName}
                  >
                    {EMPLOYMENT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className={selectClassName}
                  >
                    {PRIORITY_OPTIONS.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Salary Min</label>
                  <input
                    type="number"
                    value={formData.salaryRangeMin}
                    onChange={(e) => setFormData({ ...formData, salaryRangeMin: parseFloat(e.target.value) || 0 })}
                    min={0}
                    className={inputClassName}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Salary Max</label>
                  <input
                    type="number"
                    value={formData.salaryRangeMax}
                    onChange={(e) => setFormData({ ...formData, salaryRangeMax: parseFloat(e.target.value) || 0 })}
                    min={0}
                    className={inputClassName}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Target Hire Date</label>
                  <input
                    type="date"
                    value={formData.targetHireDate}
                    onChange={(e) => setFormData({ ...formData, targetHireDate: e.target.value })}
                    className={inputClassName}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className={`${inputClassName} min-h-[80px]`}
                  placeholder="Job description..."
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Requirements</label>
                <textarea
                  value={formData.requirements}
                  onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                  className={`${inputClassName} min-h-[80px]`}
                  placeholder="Job requirements..."
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
                {editingRequisition ? 'Update Requisition' : 'Create Requisition'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setEditingRequisition(null);
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
