'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Palette,
  Plus,
  Edit2,
  Trash2,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Inbox,
  LayoutGrid,
} from 'lucide-react';

interface Dashboard {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
  isShared: boolean;
  widgetCount: number;
  createdAt: string;
}

interface Widget {
  id: string;
  name: string;
  type: string;
  position: number;
}

export default function PlatformCustomizationTab() {
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Dashboard | null>(null);
  const [selectedDashboard, setSelectedDashboard] = useState<Dashboard | null>(null);
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [loadingWidgets, setLoadingWidgets] = useState(false);

  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formIsDefault, setFormIsDefault] = useState(false);
  const [formIsShared, setFormIsShared] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/platform-experience/admin/customization/dashboards');
      const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setDashboards(data);
    } catch {
      setError('Failed to load dashboards.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadWidgets = async (dashboard: Dashboard) => {
    setSelectedDashboard(dashboard);
    try {
      setLoadingWidgets(true);
      const res = await api.get(`/platform-experience/admin/customization/dashboards/${dashboard.id}/widgets`);
      const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setWidgets(data);
    } catch {
      setError('Failed to load widgets.');
    } finally {
      setLoadingWidgets(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setFormName('');
    setFormDescription('');
    setFormIsDefault(false);
    setFormIsShared(false);
    setShowModal(true);
  };

  const openEdit = (d: Dashboard) => {
    setEditing(d);
    setFormName(d.name);
    setFormDescription(d.description || '');
    setFormIsDefault(d.isDefault);
    setFormIsShared(d.isShared);
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
        isDefault: formIsDefault,
        isShared: formIsShared,
      };
      if (editing) {
        await api.patch(`/platform-experience/admin/customization/dashboards/${editing.id}`, payload);
        setSuccess('Dashboard updated successfully.');
      } else {
        await api.post('/platform-experience/admin/customization/dashboards', payload);
        setSuccess('Dashboard created successfully.');
      }
      setShowModal(false);
      loadData();
    } catch {
      setError('Failed to save dashboard.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this dashboard?')) return;
    try {
      setError('');
      await api.delete(`/platform-experience/admin/customization/dashboards/${id}`);
      setSuccess('Dashboard deleted.');
      if (selectedDashboard?.id === id) {
        setSelectedDashboard(null);
        setWidgets([]);
      }
      loadData();
    } catch {
      setError('Failed to delete dashboard.');
    }
  };

  const handleDeleteWidget = async (widgetId: string) => {
    if (!selectedDashboard) return;
    if (!confirm('Remove this widget from the dashboard?')) return;
    try {
      setError('');
      await api.delete(`/platform-experience/admin/customization/dashboards/${selectedDashboard.id}/widgets/${widgetId}`);
      setSuccess('Widget removed.');
      loadWidgets(selectedDashboard);
      loadData();
    } catch {
      setError('Failed to remove widget.');
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
          <Palette className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-text">Platform Customization</h2>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors">
          <Plus className="h-4 w-4" />
          Create Dashboard
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

      {/* Dashboards Table */}
      {dashboards.length === 0 ? (
        <div className="text-center py-12">
          <Inbox className="h-10 w-10 text-text-muted mx-auto mb-3" />
          <p className="text-text-muted text-sm">No dashboards created yet.</p>
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden mb-8">
          <table className="w-full">
            <thead className="bg-background">
              <tr>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Name</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Description</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Default</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Shared</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Widgets</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {dashboards.map((d) => (
                <tr key={d.id} className={`hover:bg-background/50 cursor-pointer ${selectedDashboard?.id === d.id ? 'bg-background/70' : ''}`} onClick={() => loadWidgets(d)}>
                  <td className="px-4 py-3 text-sm text-text font-medium">{d.name}</td>
                  <td className="px-4 py-3 text-sm text-text-muted">{d.description || '—'}</td>
                  <td className="px-4 py-3">
                    {d.isDefault ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Yes</span>
                    ) : (
                      <span className="text-sm text-text-muted">No</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {d.isShared ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">Yes</span>
                    ) : (
                      <span className="text-sm text-text-muted">No</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-text">{d.widgetCount || 0}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => openEdit(d)} className="p-1 text-text-muted hover:text-primary transition-colors" title="Edit">
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDelete(d.id)} className="p-1 text-text-muted hover:text-red-600 transition-colors" title="Delete">
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

      {/* Widget Management */}
      {selectedDashboard && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <LayoutGrid className="h-4 w-4 text-text-muted" />
            <h3 className="text-sm font-semibold text-text uppercase tracking-wider">
              Widgets — {selectedDashboard.name}
            </h3>
          </div>
          {loadingWidgets ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
            </div>
          ) : widgets.length === 0 ? (
            <div className="text-center py-8">
              <Inbox className="h-8 w-8 text-text-muted mx-auto mb-2" />
              <p className="text-text-muted text-sm">No widgets added to this dashboard.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {widgets.map((w) => (
                <div key={w.id} className="bg-background rounded-xl border border-border p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="text-sm font-medium text-text">{w.name}</h4>
                    <button onClick={() => handleDeleteWidget(w.id)} className="p-1 text-text-muted hover:text-red-600 transition-colors" title="Remove">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 capitalize">
                    {w.type?.replace('_', ' ') || '—'}
                  </span>
                  <p className="text-xs text-text-muted mt-2">Position: {w.position || 0}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-card rounded-xl border border-border p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text">{editing ? 'Edit Dashboard' : 'Create Dashboard'}</h3>
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
                  placeholder="e.g. HR Overview Dashboard"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Description</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Describe the purpose of this dashboard"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-sm text-text pb-2">
                    <input
                      type="checkbox"
                      checked={formIsDefault}
                      onChange={(e) => setFormIsDefault(e.target.checked)}
                      className="rounded border-border"
                    />
                    Default dashboard
                  </label>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-sm text-text pb-2">
                    <input
                      type="checkbox"
                      checked={formIsShared}
                      onChange={(e) => setFormIsShared(e.target.checked)}
                      className="rounded border-border"
                    />
                    Shared with all users
                  </label>
                </div>
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
