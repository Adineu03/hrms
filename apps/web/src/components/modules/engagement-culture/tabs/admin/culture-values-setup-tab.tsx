'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Heart,
  Plus,
  Edit2,
  Trash2,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Inbox,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';

interface CultureValue {
  id: string;
  name: string;
  description: string;
  icon: string;
  recognitionCount: number;
  sortOrder: number;
  createdAt: string;
}

export default function CultureValuesSetupTab() {
  const [values, setValues] = useState<CultureValue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<CultureValue | null>(null);

  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formIcon, setFormIcon] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/engagement-culture/admin/culture-values');
      const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setValues(data);
    } catch {
      setError('Failed to load culture values.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openCreate = () => {
    setEditing(null);
    setFormName('');
    setFormDescription('');
    setFormIcon('');
    setShowModal(true);
  };

  const openEdit = (v: CultureValue) => {
    setEditing(v);
    setFormName(v.name);
    setFormDescription(v.description || '');
    setFormIcon(v.icon || '');
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!formName.trim()) return;
    try {
      setSaving(true);
      setError('');
      const payload = {
        name: formName.trim(),
        description: formDescription.trim(),
        icon: formIcon.trim(),
      };
      if (editing) {
        await api.patch(`/engagement-culture/admin/culture-values/${editing.id}`, payload);
        setSuccess('Culture value updated successfully.');
      } else {
        await api.post('/engagement-culture/admin/culture-values', payload);
        setSuccess('Culture value created successfully.');
      }
      setShowModal(false);
      loadData();
    } catch {
      setError('Failed to save culture value.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this culture value?')) return;
    try {
      setError('');
      await api.delete(`/engagement-culture/admin/culture-values/${id}`);
      setSuccess('Culture value deleted.');
      loadData();
    } catch {
      setError('Failed to delete culture value.');
    }
  };

  const handleReorder = async (id: string, direction: 'up' | 'down') => {
    try {
      setError('');
      await api.patch(`/engagement-culture/admin/culture-values/${id}`, { reorder: direction });
      loadData();
    } catch {
      setError('Failed to reorder culture value.');
    }
  };

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(''), 3000);
      return () => clearTimeout(t);
    }
  }, [success]);

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
          <Heart className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-text">Culture &amp; Values Setup</h2>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors">
          <Plus className="h-4 w-4" />
          Add Value
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

      {values.length === 0 ? (
        <div className="text-center py-12">
          <Inbox className="h-10 w-10 text-text-muted mx-auto mb-3" />
          <p className="text-text-muted text-sm">No culture values configured yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {values.map((v, idx) => (
            <div key={v.id} className="bg-background rounded-xl border border-border p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary text-lg">
                    {v.icon || '★'}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-text">{v.name}</h3>
                    <p className="text-xs text-text-muted">{v.recognitionCount || 0} recognitions</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleReorder(v.id, 'up')}
                    disabled={idx === 0}
                    className="p-1 text-text-muted hover:text-primary transition-colors disabled:opacity-30"
                    title="Move up"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleReorder(v.id, 'down')}
                    disabled={idx === values.length - 1}
                    className="p-1 text-text-muted hover:text-primary transition-colors disabled:opacity-30"
                    title="Move down"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <button onClick={() => openEdit(v)} className="p-1 text-text-muted hover:text-primary transition-colors" title="Edit">
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleDelete(v.id)} className="p-1 text-text-muted hover:text-red-600 transition-colors" title="Delete">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <p className="text-sm text-text-muted">{v.description || 'No description provided.'}</p>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-card rounded-xl border border-border p-6 w-full max-w-lg shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text">{editing ? 'Edit Culture Value' : 'Create Culture Value'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 text-text-muted hover:text-text">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text mb-1">Name</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="e.g. Innovation, Integrity, Teamwork"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Description</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Describe what this value means to the organization"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Icon</label>
                <input
                  type="text"
                  value={formIcon}
                  onChange={(e) => setFormIcon(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="e.g. star, heart, lightbulb (or emoji)"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-text-muted border border-border rounded-lg hover:bg-background transition-colors">
                Cancel
              </button>
              <button onClick={handleSubmit} disabled={saving || !formName.trim()} className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
