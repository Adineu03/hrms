'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  FileText,
  Plus,
  Pencil,
  Trash2,
  X,
  Inbox,
  Eye,
} from 'lucide-react';

const inputClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary';
const selectClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary appearance-none';

interface DocumentTemplate {
  id: string;
  name: string;
  type: string;
  content: string;
  dynamicFields: string[];
  version: string;
  country: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  draft: 'bg-gray-100 text-gray-600',
  archived: 'bg-yellow-50 text-yellow-700',
};

const DOCUMENT_TYPES = [
  { value: 'offer_letter', label: 'Offer Letter' },
  { value: 'appointment_letter', label: 'Appointment Letter' },
  { value: 'nda', label: 'Non-Disclosure Agreement' },
  { value: 'welcome_packet', label: 'Welcome Packet' },
  { value: 'exit_checklist', label: 'Exit Checklist' },
  { value: 'experience_letter', label: 'Experience Letter' },
  { value: 'relieving_letter', label: 'Relieving Letter' },
  { value: 'full_and_final', label: 'Full & Final Settlement' },
  { value: 'policy_acknowledgement', label: 'Policy Acknowledgement' },
  { value: 'other', label: 'Other' },
];

const defaultFormData = {
  name: '',
  type: 'offer_letter',
  content: '',
  dynamicFields: '',
  version: '1.0',
  country: '',
  status: 'draft',
};

export default function DocumentTemplateTab() {
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<DocumentTemplate | null>(null);
  const [formData, setFormData] = useState(defaultFormData);
  const [isSaving, setIsSaving] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<DocumentTemplate | null>(null);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/onboarding-offboarding/admin/document-templates');
      setTemplates(Array.isArray(res.data) ? res.data : res.data?.data || []);
    } catch {
      setError('Failed to load document templates.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async () => {
    setError(null);
    if (!formData.name.trim()) {
      setError('Template name is required.');
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        ...formData,
        dynamicFields: formData.dynamicFields.split(',').map((s) => s.trim()).filter(Boolean),
      };
      if (editingTemplate) {
        await api.patch(`/onboarding-offboarding/admin/document-templates/${editingTemplate.id}`, payload);
        setSuccess('Template updated successfully.');
      } else {
        await api.post('/onboarding-offboarding/admin/document-templates', payload);
        setSuccess('Template created successfully.');
      }
      setShowCreateForm(false);
      setEditingTemplate(null);
      setFormData(defaultFormData);
      loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to save template.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document template?')) return;
    setError(null);
    try {
      await api.delete(`/onboarding-offboarding/admin/document-templates/${id}`);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      setSuccess('Template deleted.');
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to delete template.');
    }
  };

  const openEdit = (tmpl: DocumentTemplate) => {
    setEditingTemplate(tmpl);
    setFormData({
      name: tmpl.name,
      type: tmpl.type,
      content: tmpl.content || '',
      dynamicFields: (tmpl.dynamicFields || []).join(', '),
      version: tmpl.version || '1.0',
      country: tmpl.country || '',
      status: tmpl.status,
    });
    setShowCreateForm(true);
  };

  const openCreate = () => {
    setEditingTemplate(null);
    setFormData(defaultFormData);
    setShowCreateForm(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading templates...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-text flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Document Template Management
        </h2>
        <p className="text-sm text-text-muted">Create and manage document templates for onboarding and offboarding.</p>
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
        <button type="button" onClick={openCreate} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover transition-colors">
          <Plus className="h-4 w-4" />
          New Template
        </button>
      </div>

      {/* Table */}
      <div className="border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-background border-b border-border">
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Name</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Type</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Version</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Country</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Status</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {templates.map((tmpl) => (
              <tr key={tmpl.id} className="bg-card hover:bg-background/50 transition-colors">
                <td className="px-4 py-3 text-sm text-text font-medium">{tmpl.name}</td>
                <td className="px-4 py-3 text-sm text-text-muted capitalize">{tmpl.type.replace(/_/g, ' ')}</td>
                <td className="px-4 py-3 text-sm text-text-muted">{tmpl.version || '--'}</td>
                <td className="px-4 py-3 text-sm text-text-muted">{tmpl.country || 'Global'}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[tmpl.status] || 'bg-gray-100 text-gray-600'}`}>
                    {tmpl.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => setPreviewTemplate(tmpl)} className="p-1 text-text-muted hover:text-blue-600 transition-colors" title="Preview">
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" onClick={() => openEdit(tmpl)} className="p-1 text-text-muted hover:text-primary transition-colors" title="Edit">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" onClick={() => handleDelete(tmpl.id)} className="p-1 text-text-muted hover:text-red-600 transition-colors" title="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {templates.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center">
                  <Inbox className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm text-text-muted">No document templates yet. Create your first template.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Preview Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-card border border-border rounded-xl shadow-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text">Preview: {previewTemplate.name}</h3>
              <button type="button" onClick={() => setPreviewTemplate(null)} className="text-text-muted hover:text-text">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-xs text-text-muted">
                <span>Type: <strong className="text-text capitalize">{previewTemplate.type.replace(/_/g, ' ')}</strong></span>
                <span>Version: <strong className="text-text">{previewTemplate.version}</strong></span>
                <span>Country: <strong className="text-text">{previewTemplate.country || 'Global'}</strong></span>
              </div>
              {previewTemplate.dynamicFields?.length > 0 && (
                <div>
                  <span className="text-xs font-medium text-text-muted">Dynamic Fields:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {previewTemplate.dynamicFields.map((f) => (
                      <span key={f} className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full text-xs">{`{{${f}}}`}</span>
                    ))}
                  </div>
                </div>
              )}
              <div className="bg-background border border-border rounded-lg p-4 text-sm text-text whitespace-pre-wrap">
                {previewTemplate.content || 'No content defined.'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-card border border-border rounded-xl shadow-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text">
                {editingTemplate ? 'Edit Template' : 'New Document Template'}
              </h3>
              <button type="button" onClick={() => { setShowCreateForm(false); setEditingTemplate(null); setFormData(defaultFormData); }} className="text-text-muted hover:text-text">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Template Name *</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className={inputClassName} placeholder="e.g. Standard Offer Letter" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Type</label>
                  <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className={selectClassName}>
                    {DOCUMENT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Version</label>
                  <input type="text" value={formData.version} onChange={(e) => setFormData({ ...formData, version: e.target.value })} className={inputClassName} placeholder="1.0" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Country</label>
                  <input type="text" value={formData.country} onChange={(e) => setFormData({ ...formData, country: e.target.value })} className={inputClassName} placeholder="Global" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Content</label>
                <textarea value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} className={`${inputClassName} min-h-[160px]`} placeholder="Dear {{employee_name}},&#10;&#10;We are pleased to offer you the position of {{designation}}..." rows={8} />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Dynamic Fields (comma-separated)</label>
                <input type="text" value={formData.dynamicFields} onChange={(e) => setFormData({ ...formData, dynamicFields: e.target.value })} className={inputClassName} placeholder="employee_name, designation, department, joining_date" />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Status</label>
                <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className={selectClassName}>
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button type="button" onClick={handleSave} disabled={isSaving} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors">
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingTemplate ? 'Update Template' : 'Create Template'}
              </button>
              <button type="button" onClick={() => { setShowCreateForm(false); setEditingTemplate(null); setFormData(defaultFormData); }} className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
