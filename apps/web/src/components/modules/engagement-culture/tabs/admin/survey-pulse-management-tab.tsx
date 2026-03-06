'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  ClipboardList,
  Plus,
  Edit2,
  Trash2,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Inbox,
  Send,
} from 'lucide-react';

interface Survey {
  id: string;
  title: string;
  type: string;
  description: string;
  isAnonymous: boolean;
  status: string;
  responsesCount: number;
  scheduledAt: string;
  closesAt: string;
  createdAt: string;
}

const SURVEY_TYPES = [
  { value: 'engagement', label: 'Engagement' },
  { value: 'pulse', label: 'Pulse' },
  { value: 'feedback', label: 'Feedback' },
  { value: 'anonymous', label: 'Anonymous' },
];

export default function SurveyPulseManagementTab() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Survey | null>(null);

  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType] = useState('engagement');
  const [formDescription, setFormDescription] = useState('');
  const [formIsAnonymous, setFormIsAnonymous] = useState(false);
  const [formScheduledAt, setFormScheduledAt] = useState('');
  const [formClosesAt, setFormClosesAt] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/engagement-culture/admin/surveys');
      const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setSurveys(data);
    } catch {
      setError('Failed to load surveys.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openCreate = () => {
    setEditing(null);
    setFormTitle('');
    setFormType('engagement');
    setFormDescription('');
    setFormIsAnonymous(false);
    setFormScheduledAt('');
    setFormClosesAt('');
    setShowModal(true);
  };

  const openEdit = (s: Survey) => {
    setEditing(s);
    setFormTitle(s.title);
    setFormType(s.type);
    setFormDescription(s.description || '');
    setFormIsAnonymous(s.isAnonymous);
    setFormScheduledAt(s.scheduledAt ? s.scheduledAt.slice(0, 16) : '');
    setFormClosesAt(s.closesAt ? s.closesAt.slice(0, 16) : '');
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!formTitle.trim()) return;
    try {
      setSaving(true);
      setError('');
      const payload = {
        title: formTitle.trim(),
        type: formType,
        description: formDescription.trim(),
        isAnonymous: formIsAnonymous,
        scheduledAt: formScheduledAt || null,
        closesAt: formClosesAt || null,
      };
      if (editing) {
        await api.patch(`/engagement-culture/admin/surveys/${editing.id}`, payload);
        setSuccess('Survey updated successfully.');
      } else {
        await api.post('/engagement-culture/admin/surveys', payload);
        setSuccess('Survey created successfully.');
      }
      setShowModal(false);
      loadData();
    } catch {
      setError('Failed to save survey.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this survey?')) return;
    try {
      setError('');
      await api.delete(`/engagement-culture/admin/surveys/${id}`);
      setSuccess('Survey deleted.');
      loadData();
    } catch {
      setError('Failed to delete survey.');
    }
  };

  const handlePublish = async (id: string) => {
    try {
      setError('');
      await api.post(`/engagement-culture/admin/surveys/${id}/publish`);
      setSuccess('Survey published successfully.');
      loadData();
    } catch {
      setError('Failed to publish survey.');
    }
  };

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(''), 3000);
      return () => clearTimeout(t);
    }
  }, [success]);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-700',
      scheduled: 'bg-blue-100 text-blue-700',
      active: 'bg-green-100 text-green-700',
      closed: 'bg-yellow-100 text-yellow-700',
    };
    return styles[status] || 'bg-gray-100 text-gray-700';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-text">Survey &amp; Pulse Management</h2>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors">
          <Plus className="h-4 w-4" />
          Create Survey
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-3 mb-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {success}
        </div>
      )}

      {surveys.length === 0 ? (
        <div className="text-center py-12">
          <Inbox className="h-10 w-10 text-text-muted mx-auto mb-3" />
          <p className="text-text-muted text-sm">No surveys created yet.</p>
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-background">
              <tr>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Title</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Type</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Status</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Responses</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Anonymous</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {surveys.map((s) => (
                <tr key={s.id} className="hover:bg-background/50">
                  <td className="px-4 py-3 text-sm text-text font-medium">{s.title}</td>
                  <td className="px-4 py-3 text-sm text-text-muted capitalize">{s.type}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(s.status)}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-text">{s.responsesCount || 0}</td>
                  <td className="px-4 py-3 text-sm text-text-muted">{s.isAnonymous ? 'Yes' : 'No'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {s.status === 'draft' && (
                        <button onClick={() => handlePublish(s.id)} className="p-1 text-text-muted hover:text-green-600 transition-colors" title="Publish">
                          <Send className="h-4 w-4" />
                        </button>
                      )}
                      <button onClick={() => openEdit(s)} className="p-1 text-text-muted hover:text-primary transition-colors" title="Edit">
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDelete(s.id)} className="p-1 text-text-muted hover:text-red-600 transition-colors" title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-card rounded-xl border border-border p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text">{editing ? 'Edit Survey' : 'Create Survey'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 text-text-muted hover:text-text">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text mb-1">Title</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="e.g. Q1 Employee Engagement Survey"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Type</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary appearance-none"
                  >
                    {SURVEY_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-sm text-text pb-2">
                    <input
                      type="checkbox"
                      checked={formIsAnonymous}
                      onChange={(e) => setFormIsAnonymous(e.target.checked)}
                      className="rounded border-border"
                    />
                    Anonymous survey
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Description</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Describe the purpose of this survey"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Scheduled At</label>
                  <input
                    type="datetime-local"
                    value={formScheduledAt}
                    onChange={(e) => setFormScheduledAt(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Closes At</label>
                  <input
                    type="datetime-local"
                    value={formClosesAt}
                    onChange={(e) => setFormClosesAt(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-text-muted border border-border rounded-lg hover:bg-background transition-colors">
                Cancel
              </button>
              <button onClick={handleSubmit} disabled={saving || !formTitle.trim()} className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
