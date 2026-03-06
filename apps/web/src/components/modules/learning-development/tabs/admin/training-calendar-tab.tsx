'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Plus,
  Pencil,
  Trash2,
  X,
  Inbox,
  Users,
} from 'lucide-react';

const inputClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary';
const selectClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary appearance-none';

interface TrainingSession {
  id: string;
  title: string;
  description: string;
  type: string;
  courseId: string;
  courseName: string;
  instructorName: string;
  location: string;
  roomName: string;
  virtualLink: string;
  startTime: string;
  endTime: string;
  maxCapacity: number;
  enrolledCount: number;
  autoEnrollWaitlist: boolean;
  status: string;
  createdAt: string;
}

const STATUS_STYLES: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-green-100 text-green-700',
  completed: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-700',
};

const SESSION_TYPES = [
  { value: 'ilt', label: 'Instructor-Led (ILT)' },
  { value: 'virtual', label: 'Virtual' },
];

const defaultFormData = {
  title: '',
  description: '',
  type: 'ilt',
  courseId: '',
  instructorName: '',
  location: '',
  roomName: '',
  virtualLink: '',
  startTime: '',
  endTime: '',
  maxCapacity: 30,
  autoEnrollWaitlist: false,
  status: 'scheduled',
};

export default function TrainingCalendarTab() {
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editingSession, setEditingSession] = useState<TrainingSession | null>(null);
  const [formData, setFormData] = useState(defaultFormData);
  const [isSaving, setIsSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/learning-development/admin/training-sessions');
      setSessions(Array.isArray(res.data) ? res.data : res.data?.data || []);
    } catch {
      setError('Failed to load training sessions.');
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
      setError('Session title is required.');
      return;
    }
    if (!formData.startTime || !formData.endTime) {
      setError('Start and end times are required.');
      return;
    }
    setIsSaving(true);
    try {
      if (editingSession) {
        await api.patch(`/learning-development/admin/training-sessions/${editingSession.id}`, formData);
        setSuccess('Training session updated successfully.');
      } else {
        await api.post('/learning-development/admin/training-sessions', formData);
        setSuccess('Training session created successfully.');
      }
      setShowModal(false);
      setEditingSession(null);
      setFormData(defaultFormData);
      loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to save training session.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this training session?')) return;
    setError(null);
    try {
      await api.delete(`/learning-development/admin/training-sessions/${id}`);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      setSuccess('Training session deleted.');
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to delete training session.');
    }
  };

  const handleTrackAttendance = async (id: string) => {
    try {
      await api.post(`/learning-development/admin/training-sessions/${id}/track-attendance`);
      setSuccess('Attendance tracking initiated.');
      loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to track attendance.');
    }
  };

  const openEdit = (session: TrainingSession) => {
    setEditingSession(session);
    setFormData({
      title: session.title,
      description: session.description || '',
      type: session.type || 'ilt',
      courseId: session.courseId || '',
      instructorName: session.instructorName || '',
      location: session.location || '',
      roomName: session.roomName || '',
      virtualLink: session.virtualLink || '',
      startTime: session.startTime ? session.startTime.slice(0, 16) : '',
      endTime: session.endTime ? session.endTime.slice(0, 16) : '',
      maxCapacity: session.maxCapacity || 30,
      autoEnrollWaitlist: session.autoEnrollWaitlist ?? false,
      status: session.status || 'scheduled',
    });
    setShowModal(true);
  };

  const openCreate = () => {
    setEditingSession(null);
    setFormData(defaultFormData);
    setShowModal(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading training calendar...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-text flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Training Calendar
        </h2>
        <p className="text-sm text-text-muted">Schedule and manage training sessions.</p>
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
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Training Session
        </button>
      </div>

      {/* Table */}
      <div className="border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-background border-b border-border">
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Title</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Type</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Instructor</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Schedule</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Capacity</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Status</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sessions.map((session) => (
              <tr key={session.id} className="bg-card hover:bg-background/50 transition-colors">
                <td className="px-4 py-3">
                  <div>
                    <span className="text-sm text-text font-medium">{session.title}</span>
                    {session.description && (
                      <p className="text-xs text-text-muted mt-0.5 line-clamp-1">{session.description}</p>
                    )}
                    {session.courseName && (
                      <p className="text-xs text-text-muted mt-0.5">Course: {session.courseName}</p>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-text-muted uppercase">{session.type}</td>
                <td className="px-4 py-3 text-sm text-text-muted">{session.instructorName || '--'}</td>
                <td className="px-4 py-3 text-sm text-text-muted">
                  <div>
                    {session.startTime ? new Date(session.startTime).toLocaleDateString() : '--'}
                    <br />
                    <span className="text-[10px]">
                      {session.startTime ? new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''} - {session.endTime ? new Date(session.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5 text-text-muted" />
                    <span className="text-sm text-text-muted">{session.enrolledCount || 0}/{session.maxCapacity || '--'}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[session.status] || 'bg-gray-100 text-gray-600'}`}>
                    {session.status?.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    {(session.status === 'scheduled' || session.status === 'in_progress') && (
                      <button type="button" onClick={() => handleTrackAttendance(session.id)} className="p-1 text-text-muted hover:text-green-600 transition-colors" title="Track Attendance">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button type="button" onClick={() => openEdit(session)} className="p-1 text-text-muted hover:text-primary transition-colors" title="Edit">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" onClick={() => handleDelete(session.id)} className="p-1 text-text-muted hover:text-red-600 transition-colors" title="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {sessions.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center">
                  <Inbox className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm text-text-muted">No training sessions yet. Schedule your first session.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-card border border-border rounded-xl shadow-lg p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text">
                {editingSession ? 'Edit Training Session' : 'New Training Session'}
              </h3>
              <button type="button" onClick={() => { setShowModal(false); setEditingSession(null); setFormData(defaultFormData); }} className="text-text-muted hover:text-text">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Session Title *</label>
                <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className={inputClassName} placeholder="e.g. Advanced React Workshop" />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Description</label>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className={`${inputClassName} min-h-[60px]`} placeholder="Session description..." rows={2} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Type</label>
                  <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className={selectClassName}>
                    {SESSION_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Course ID</label>
                  <input type="text" value={formData.courseId} onChange={(e) => setFormData({ ...formData, courseId: e.target.value })} className={inputClassName} placeholder="Link to course (optional)" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Instructor Name</label>
                <input type="text" value={formData.instructorName} onChange={(e) => setFormData({ ...formData, instructorName: e.target.value })} className={inputClassName} placeholder="e.g. Dr. Jane Smith" />
              </div>
              {formData.type === 'ilt' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-text-muted mb-1">Location</label>
                    <input type="text" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} className={inputClassName} placeholder="Building / Floor" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-muted mb-1">Room Name</label>
                    <input type="text" value={formData.roomName} onChange={(e) => setFormData({ ...formData, roomName: e.target.value })} className={inputClassName} placeholder="Conference Room A" />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Virtual Meeting Link</label>
                  <input type="url" value={formData.virtualLink} onChange={(e) => setFormData({ ...formData, virtualLink: e.target.value })} className={inputClassName} placeholder="https://zoom.us/..." />
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Start Time *</label>
                  <input type="datetime-local" value={formData.startTime} onChange={(e) => setFormData({ ...formData, startTime: e.target.value })} className={inputClassName} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">End Time *</label>
                  <input type="datetime-local" value={formData.endTime} onChange={(e) => setFormData({ ...formData, endTime: e.target.value })} className={inputClassName} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Max Capacity</label>
                  <input type="number" value={formData.maxCapacity} onChange={(e) => setFormData({ ...formData, maxCapacity: parseInt(e.target.value) || 0 })} className={inputClassName} min={1} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Status</label>
                  <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className={selectClassName}>
                    <option value="scheduled">Scheduled</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-text">
                <input type="checkbox" checked={formData.autoEnrollWaitlist} onChange={(e) => setFormData({ ...formData, autoEnrollWaitlist: e.target.checked })} className="rounded border-border text-primary focus:ring-primary" />
                Auto-enroll from waitlist
              </label>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button type="button" onClick={handleSave} disabled={isSaving} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors">
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingSession ? 'Update Session' : 'Create Session'}
              </button>
              <button type="button" onClick={() => { setShowModal(false); setEditingSession(null); setFormData(defaultFormData); }} className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
