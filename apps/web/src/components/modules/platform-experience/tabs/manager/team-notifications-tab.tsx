'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Bell,
  Plus,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Inbox,
  Eye,
  EyeOff,
} from 'lucide-react';

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: string;
  readCount: number;
  totalRecipients: number;
  createdAt: string;
}

interface ReadTracking {
  id: string;
  memberName: string;
  isRead: boolean;
  readAt: string;
}

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

export default function TeamNotificationsTab() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [readTracking, setReadTracking] = useState<ReadTracking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [loadingTracking, setLoadingTracking] = useState(false);

  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formPriority, setFormPriority] = useState('medium');
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/platform-experience/manager/team-notifications/announcements');
      const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setAnnouncements(data);
    } catch {
      setError('Failed to load announcements.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadReadTracking = async (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    try {
      setLoadingTracking(true);
      const res = await api.get('/platform-experience/manager/team-notifications/read-tracking', {
        params: { announcementId: announcement.id },
      });
      const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setReadTracking(data);
    } catch {
      setError('Failed to load read tracking data.');
    } finally {
      setLoadingTracking(false);
    }
  };

  const openCreate = () => {
    setFormTitle('');
    setFormContent('');
    setFormPriority('medium');
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!formTitle.trim() || !formContent.trim()) return;
    try {
      setSaving(true);
      setError('');
      await api.post('/platform-experience/manager/team-notifications/announcements', {
        title: formTitle.trim(),
        content: formContent.trim(),
        priority: formPriority,
      });
      setSuccess('Announcement created successfully.');
      setShowModal(false);
      loadData();
    } catch {
      setError('Failed to create announcement.');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(''), 3000);
      return () => clearTimeout(t);
    }
  }, [success]);

  const getPriorityBadge = (priority: string) => {
    const styles: Record<string, string> = {
      low: 'bg-gray-100 text-gray-700',
      medium: 'bg-blue-100 text-blue-700',
      high: 'bg-yellow-100 text-yellow-700',
      urgent: 'bg-red-100 text-red-700',
    };
    return styles[priority] || 'bg-gray-100 text-gray-700';
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
          <Bell className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-text">Team Notifications &amp; Announcements</h2>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors">
          <Plus className="h-4 w-4" />
          Create Announcement
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <div className="bg-background rounded-xl border border-border p-5">
          <p className="text-sm text-text-muted mb-1">Total Announcements</p>
          <p className="text-2xl font-bold text-text">{announcements.length}</p>
        </div>
        <div className="bg-background rounded-xl border border-border p-5">
          <p className="text-sm text-text-muted mb-1">Average Read Rate</p>
          <p className="text-2xl font-bold text-text">
            {announcements.length > 0
              ? Math.round(announcements.reduce((sum, a) => sum + (a.totalRecipients > 0 ? (a.readCount / a.totalRecipients) * 100 : 0), 0) / announcements.length)
              : 0}%
          </p>
        </div>
      </div>

      {/* Announcements List */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-text uppercase tracking-wider mb-3">Announcements</h3>
        {announcements.length === 0 ? (
          <div className="text-center py-12">
            <Inbox className="h-10 w-10 text-text-muted mx-auto mb-3" />
            <p className="text-text-muted text-sm">No announcements sent yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {announcements.map((a) => (
              <div
                key={a.id}
                className={`bg-background rounded-xl border border-border p-4 cursor-pointer hover:border-primary/50 transition-colors ${
                  selectedAnnouncement?.id === a.id ? 'border-primary' : ''
                }`}
                onClick={() => loadReadTracking(a)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-medium text-text">{a.title}</h4>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityBadge(a.priority)}`}>
                        {a.priority}
                      </span>
                    </div>
                    <p className="text-sm text-text-muted">{a.content}</p>
                  </div>
                  <span className="text-xs text-text-muted whitespace-nowrap ml-4">
                    {a.createdAt ? new Date(a.createdAt).toLocaleDateString() : '—'}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs text-text-muted">
                  <span>Read: {a.readCount || 0} / {a.totalRecipients || 0}</span>
                  {a.totalRecipients > 0 && (
                    <div className="flex items-center gap-2 flex-1">
                      <div className="w-24 bg-gray-200 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full bg-green-500"
                          style={{ width: `${Math.min((a.readCount / a.totalRecipients) * 100, 100)}%` }}
                        />
                      </div>
                      <span>{Math.round((a.readCount / a.totalRecipients) * 100)}%</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Read Tracking Table */}
      {selectedAnnouncement && (
        <div>
          <h3 className="text-sm font-semibold text-text uppercase tracking-wider mb-3">
            Read Tracking — {selectedAnnouncement.title}
          </h3>
          {loadingTracking ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
            </div>
          ) : readTracking.length === 0 ? (
            <div className="text-center py-8">
              <Inbox className="h-8 w-8 text-text-muted mx-auto mb-2" />
              <p className="text-text-muted text-sm">No tracking data available.</p>
            </div>
          ) : (
            <div className="border border-border rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-background">
                  <tr>
                    <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Member</th>
                    <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Status</th>
                    <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Read At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {readTracking.map((r) => (
                    <tr key={r.id} className="hover:bg-background/50">
                      <td className="px-4 py-3 text-sm text-text font-medium">{r.memberName}</td>
                      <td className="px-4 py-3">
                        {r.isRead ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            <Eye className="h-3 w-3" />
                            Read
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                            <EyeOff className="h-3 w-3" />
                            Unread
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-muted">
                        {r.readAt ? new Date(r.readAt).toLocaleString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Create Announcement Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-card rounded-xl border border-border p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text">Create Announcement</h3>
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
                  placeholder="e.g. Team Meeting Tomorrow"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Content</label>
                <textarea
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Write your announcement message..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Priority</label>
                <select
                  value={formPriority}
                  onChange={(e) => setFormPriority(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary appearance-none"
                >
                  {PRIORITY_OPTIONS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-text-muted border border-border rounded-lg hover:bg-background transition-colors">
                Cancel
              </button>
              <button onClick={handleSubmit} disabled={saving || !formTitle.trim() || !formContent.trim()} className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send Announcement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
