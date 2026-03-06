'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  Megaphone,
  Plus,
  Pencil,
  X,
  Eye,
  FileText,
  Pause,
  Play,
  XCircle,
  Inbox,
} from 'lucide-react';

const inputClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary';
const selectClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary appearance-none';

interface JobPosting {
  id: string;
  title: string;
  requisitionId: string;
  requisitionTitle: string;
  description: string;
  requirements: string;
  responsibilities: string;
  postingType: string;
  status: string;
  viewCount: number;
  applicationCount: number;
  applicationDeadline: string;
  publishedAt: string;
  createdAt: string;
}

interface Requisition {
  id: string;
  title: string;
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  published: 'bg-green-50 text-green-700',
  paused: 'bg-yellow-50 text-yellow-700',
  closed: 'bg-red-50 text-red-700',
};

const POSTING_TYPE_STYLES: Record<string, string> = {
  internal: 'bg-blue-50 text-blue-700',
  external: 'bg-purple-50 text-purple-700',
  both: 'bg-indigo-50 text-indigo-700',
};

const defaultFormData = {
  requisitionId: '',
  title: '',
  description: '',
  requirements: '',
  responsibilities: '',
  postingType: 'both',
  applicationDeadline: '',
};

export default function JobPostingTab() {
  const [postings, setPostings] = useState<JobPosting[]>([]);
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingPosting, setEditingPosting] = useState<JobPosting | null>(null);
  const [formData, setFormData] = useState(defaultFormData);
  const [isSaving, setIsSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [postRes, reqRes] = await Promise.all([
        api.get('/talent-acquisition/admin/postings'),
        api.get('/talent-acquisition/admin/requisitions'),
      ]);
      setPostings(Array.isArray(postRes.data) ? postRes.data : postRes.data?.data || []);
      setRequisitions(Array.isArray(reqRes.data) ? reqRes.data : reqRes.data?.data || []);
    } catch {
      setError('Failed to load job postings.');
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
      setError('Posting title is required.');
      return;
    }
    setIsSaving(true);
    try {
      if (editingPosting) {
        await api.patch(`/talent-acquisition/admin/postings/${editingPosting.id}`, formData);
        setPostings((prev) =>
          prev.map((p) => (p.id === editingPosting.id ? { ...p, ...formData } : p))
        );
        setSuccess('Posting updated successfully.');
      } else {
        const res = await api.post('/talent-acquisition/admin/postings', formData);
        const newPosting = res.data?.data || res.data;
        setPostings((prev) => [...prev, newPosting]);
        setSuccess('Posting created successfully.');
      }
      setShowCreateForm(false);
      setEditingPosting(null);
      setFormData(defaultFormData);
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to save posting.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (id: string, action: 'publish' | 'pause' | 'close') => {
    setError(null);
    const statusMap = { publish: 'published', pause: 'paused', close: 'closed' };
    try {
      await api.patch(`/talent-acquisition/admin/postings/${id}/${action}`);
      setPostings((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: statusMap[action] } : p))
      );
      setSuccess(`Posting ${action === 'publish' ? 'published' : action === 'pause' ? 'paused' : 'closed'} successfully.`);
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError(`Failed to ${action} posting.`);
    }
  };

  const openEdit = (posting: JobPosting) => {
    setEditingPosting(posting);
    setFormData({
      requisitionId: posting.requisitionId,
      title: posting.title,
      description: posting.description,
      requirements: posting.requirements,
      responsibilities: posting.responsibilities,
      postingType: posting.postingType,
      applicationDeadline: posting.applicationDeadline ? posting.applicationDeadline.split('T')[0] : '',
    });
    setShowCreateForm(true);
  };

  const openCreate = () => {
    setEditingPosting(null);
    setFormData(defaultFormData);
    setShowCreateForm(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading postings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-text flex items-center gap-2">
          <Megaphone className="h-5 w-5" />
          Job Posting & Distribution
        </h2>
        <p className="text-sm text-text-muted">Manage published job listings and track applications.</p>
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
          New Posting
        </button>
      </div>

      {/* Table */}
      <div className="border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-background border-b border-border">
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Title</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Requisition</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Type</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Status</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Views</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Applications</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Published</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {postings.map((posting) => (
              <tr key={posting.id} className="bg-card hover:bg-background/50 transition-colors">
                <td className="px-4 py-3 text-sm text-text font-medium">{posting.title}</td>
                <td className="px-4 py-3 text-sm text-text-muted">{posting.requisitionTitle || '--'}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${POSTING_TYPE_STYLES[posting.postingType] || 'bg-gray-100 text-gray-600'}`}>
                    {posting.postingType}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[posting.status] || 'bg-gray-100 text-gray-600'}`}>
                    {posting.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 text-sm text-text-muted">
                    <Eye className="h-3.5 w-3.5" />
                    {posting.viewCount || 0}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 text-sm text-text-muted">
                    <FileText className="h-3.5 w-3.5" />
                    {posting.applicationCount || 0}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-text-muted">
                  {posting.publishedAt ? new Date(posting.publishedAt).toLocaleDateString() : '--'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(posting)}
                      className="p-1 text-text-muted hover:text-primary transition-colors"
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    {posting.status === 'draft' && (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(posting.id, 'publish')}
                        className="p-1 text-text-muted hover:text-green-600 transition-colors"
                        title="Publish"
                      >
                        <Play className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {posting.status === 'published' && (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(posting.id, 'pause')}
                        className="p-1 text-text-muted hover:text-yellow-600 transition-colors"
                        title="Pause"
                      >
                        <Pause className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {(posting.status === 'published' || posting.status === 'paused') && (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(posting.id, 'close')}
                        className="p-1 text-text-muted hover:text-red-600 transition-colors"
                        title="Close"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {postings.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center">
                  <Inbox className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm text-text-muted">No job postings yet. Create your first posting.</p>
                </td>
              </tr>
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
                {editingPosting ? 'Edit Posting' : 'New Job Posting'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setEditingPosting(null);
                  setFormData(defaultFormData);
                }}
                className="text-text-muted hover:text-text"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Linked Requisition</label>
                <select
                  value={formData.requisitionId}
                  onChange={(e) => setFormData({ ...formData, requisitionId: e.target.value })}
                  className={selectClassName}
                >
                  <option value="">Select requisition</option>
                  {requisitions.map((r) => (
                    <option key={r.id} value={r.id}>{r.title}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Posting Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className={inputClassName}
                    placeholder="e.g. Senior Software Engineer"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Posting Type</label>
                  <select
                    value={formData.postingType}
                    onChange={(e) => setFormData({ ...formData, postingType: e.target.value })}
                    className={selectClassName}
                  >
                    <option value="internal">Internal</option>
                    <option value="external">External</option>
                    <option value="both">Both</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Application Deadline</label>
                <input
                  type="date"
                  value={formData.applicationDeadline}
                  onChange={(e) => setFormData({ ...formData, applicationDeadline: e.target.value })}
                  className={inputClassName}
                />
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
                  placeholder="Key requirements..."
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Responsibilities</label>
                <textarea
                  value={formData.responsibilities}
                  onChange={(e) => setFormData({ ...formData, responsibilities: e.target.value })}
                  className={`${inputClassName} min-h-[80px]`}
                  placeholder="Key responsibilities..."
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
                {editingPosting ? 'Update Posting' : 'Create Posting'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setEditingPosting(null);
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
