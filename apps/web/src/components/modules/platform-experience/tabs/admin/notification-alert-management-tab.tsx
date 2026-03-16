'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Bell,
  Plus,
  Edit2,
  Trash2,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Inbox,
  ToggleLeft,
  ToggleRight,
  BarChart3,
} from 'lucide-react';

interface NotificationTemplate {
  id: string;
  name: string;
  eventType: string;
  channel: string;
  subject: string;
  bodyTemplate: string;
  isEnabled: boolean;
  createdAt: string;
}

interface NotificationAnalytics {
  totalSent: number;
  readRate: number;
  deliveryRate: number;
  failedCount: number;
}

const CHANNEL_OPTIONS = [
  { value: 'in_app', label: 'In-App' },
  { value: 'email', label: 'Email' },
  { value: 'push', label: 'Push' },
  { value: 'sms', label: 'SMS' },
];

export default function NotificationAlertManagementTab() {
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [analytics, setAnalytics] = useState<NotificationAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<NotificationTemplate | null>(null);

  const [formName, setFormName] = useState('');
  const [formEventType, setFormEventType] = useState('');
  const [formChannel, setFormChannel] = useState('in_app');
  const [formSubject, setFormSubject] = useState('');
  const [formBodyTemplate, setFormBodyTemplate] = useState('');
  const [formIsEnabled, setFormIsEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [templatesRes, analyticsRes] = await Promise.all([
        api.get('/platform-experience/admin/notifications/templates').catch(() => ({ data: [] })),
        api.get('/platform-experience/admin/notifications/analytics').catch(() => ({ data: {} })),
      ]);

      const templatesData = Array.isArray(templatesRes.data) ? templatesRes.data : templatesRes.data?.data || [];
      const analyticsData = analyticsRes.data?.data || analyticsRes.data || {};

      setTemplates(templatesData);
      setAnalytics({
        totalSent: analyticsData.totalSent || 0,
        readRate: analyticsData.readRate || 0,
        deliveryRate: analyticsData.deliveryRate || 0,
        failedCount: analyticsData.failedCount || 0,
      });
    } catch {
      setError('Failed to load notification templates.');
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
    setFormEventType('');
    setFormChannel('in_app');
    setFormSubject('');
    setFormBodyTemplate('');
    setFormIsEnabled(true);
    setShowModal(true);
  };

  const openEdit = (t: NotificationTemplate) => {
    setEditing(t);
    setFormName(t.name);
    setFormEventType(t.eventType);
    setFormChannel(t.channel);
    setFormSubject(t.subject || '');
    setFormBodyTemplate(t.bodyTemplate || '');
    setFormIsEnabled(t.isEnabled);
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!formName.trim() || !formEventType.trim()) return;
    try {
      setSaving(true);
      setError('');
      const payload = {
        name: formName.trim(),
        eventType: formEventType.trim(),
        channel: formChannel,
        subject: formSubject.trim(),
        bodyTemplate: formBodyTemplate.trim(),
        isEnabled: formIsEnabled,
      };
      if (editing) {
        await api.patch(`/platform-experience/admin/notifications/templates/${editing.id}`, payload);
        setSuccess('Notification template updated successfully.');
      } else {
        await api.post('/platform-experience/admin/notifications/templates', payload);
        setSuccess('Notification template created successfully.');
      }
      setShowModal(false);
      loadData();
    } catch {
      setError('Failed to save notification template.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this notification template?')) return;
    try {
      setError('');
      await api.delete(`/platform-experience/admin/notifications/templates/${id}`);
      setSuccess('Notification template deleted.');
      loadData();
    } catch {
      setError('Failed to delete notification template.');
    }
  };

  const handleToggleEnabled = async (t: NotificationTemplate) => {
    try {
      setError('');
      await api.patch(`/platform-experience/admin/notifications/templates/${t.id}/toggle`);
      setSuccess(`Template ${t.isEnabled ? 'disabled' : 'enabled'} successfully.`);
      loadData();
    } catch {
      setError('Failed to toggle template status.');
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
          <Bell className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-text">Notification &amp; Alert Management</h2>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors">
          <Plus className="h-4 w-4" />
          Create Template
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

      {/* Analytics Summary */}
      {analytics && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="h-4 w-4 text-text-muted" />
            <h3 className="text-sm font-semibold text-text uppercase tracking-wider">Delivery Analytics</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-background rounded-xl border border-border p-5">
              <p className="text-sm text-text-muted mb-1">Total Sent</p>
              <p className="text-2xl font-bold text-text">{analytics.totalSent.toLocaleString()}</p>
            </div>
            <div className="bg-background rounded-xl border border-border p-5">
              <p className="text-sm text-text-muted mb-1">Read Rate</p>
              <p className="text-2xl font-bold text-text">{analytics.readRate}%</p>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div
                  className={`h-2 rounded-full ${analytics.readRate >= 70 ? 'bg-green-500' : analytics.readRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                  style={{ width: `${Math.min(analytics.readRate, 100)}%` }}
                />
              </div>
            </div>
            <div className="bg-background rounded-xl border border-border p-5">
              <p className="text-sm text-text-muted mb-1">Delivery Rate</p>
              <p className="text-2xl font-bold text-text">{analytics.deliveryRate}%</p>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div
                  className={`h-2 rounded-full ${analytics.deliveryRate >= 90 ? 'bg-green-500' : analytics.deliveryRate >= 70 ? 'bg-yellow-500' : 'bg-red-500'}`}
                  style={{ width: `${Math.min(analytics.deliveryRate, 100)}%` }}
                />
              </div>
            </div>
            <div className="bg-background rounded-xl border border-border p-5">
              <p className="text-sm text-text-muted mb-1">Failed</p>
              <p className="text-2xl font-bold text-text">{analytics.failedCount}</p>
            </div>
          </div>
        </div>
      )}

      {/* Templates Table */}
      {templates.length === 0 ? (
        <div className="text-center py-12">
          <Inbox className="h-10 w-10 text-text-muted mx-auto mb-3" />
          <p className="text-text-muted text-sm">No notification templates created yet.</p>
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-background">
              <tr>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Name</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Event Type</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Channel</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Enabled</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {templates.map((t) => (
                <tr key={t.id} className="hover:bg-background/50">
                  <td className="px-4 py-3 text-sm text-text font-medium">{t.name}</td>
                  <td className="px-4 py-3 text-sm text-text-muted">{t.eventType}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                      {t.channel?.replace('_', '-') || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleToggleEnabled(t)} className="p-1 text-text-muted hover:text-primary transition-colors" title={t.isEnabled ? 'Disable' : 'Enable'}>
                      {t.isEnabled ? (
                        <ToggleRight className="h-5 w-5 text-green-600" />
                      ) : (
                        <ToggleLeft className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(t)} className="p-1 text-text-muted hover:text-primary transition-colors" title="Edit">
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDelete(t.id)} className="p-1 text-text-muted hover:text-red-600 transition-colors" title="Delete">
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

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-card rounded-xl border border-border p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text">{editing ? 'Edit Template' : 'Create Template'}</h3>
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
                  placeholder="e.g. Leave Approved Notification"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Event Type</label>
                  <input
                    type="text"
                    value={formEventType}
                    onChange={(e) => setFormEventType(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="e.g. leave_approved"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Channel</label>
                  <select
                    value={formChannel}
                    onChange={(e) => setFormChannel(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary appearance-none"
                  >
                    {CHANNEL_OPTIONS.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Subject</label>
                <input
                  type="text"
                  value={formSubject}
                  onChange={(e) => setFormSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="e.g. Your leave request has been approved"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Body Template</label>
                <textarea
                  value={formBodyTemplate}
                  onChange={(e) => setFormBodyTemplate(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Use {{variable}} for dynamic content"
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm text-text pb-2">
                  <input
                    type="checkbox"
                    checked={formIsEnabled}
                    onChange={(e) => setFormIsEnabled(e.target.checked)}
                    className="rounded border-border"
                  />
                  Enabled
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-text-muted border border-border rounded-lg hover:bg-background transition-colors">
                Cancel
              </button>
              <button onClick={handleSubmit} disabled={saving || !formName.trim() || !formEventType.trim()} className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
