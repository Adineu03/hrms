'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Plus,
  X,
  Inbox,
  Clock,
  Check,
  ChevronDown,
  ChevronUp,
  Trash2,
} from 'lucide-react';

const inputClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary';
const selectClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary appearance-none';

interface AgendaItem {
  id: string;
  text: string;
  addedBy: string;
}

interface ActionItem {
  id: string;
  text: string;
  isCompleted: boolean;
  assignee: string;
}

interface Meeting {
  id: string;
  employeeName: string;
  employeeId: string;
  scheduledDate: string;
  scheduledTime: string;
  isRecurring: boolean;
  recurringFrequency: string;
  status: string;
  agendaItems: AgendaItem[];
  actionItems: ActionItem[];
  notes: string;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
}

const STATUS_STYLES: Record<string, string> = {
  upcoming: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  rescheduled: 'bg-yellow-50 text-yellow-700',
};

const defaultFormData = {
  employeeId: '',
  scheduledDate: '',
  scheduledTime: '10:00',
  isRecurring: false,
  recurringFrequency: 'weekly',
  agendaItems: [''] as string[],
};

export default function OneOnOneTab() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState(defaultFormData);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedMeeting, setExpandedMeeting] = useState<string | null>(null);
  const [meetingNotes, setMeetingNotes] = useState<Record<string, string>>({});
  const [newActionItems, setNewActionItems] = useState<Record<string, string>>({});

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [meetingRes, empRes] = await Promise.all([
        api.get('/performance-growth/manager/one-on-ones').catch(() => ({ data: [] })),
        api.get('/core-hr/admin/employees').catch(() => ({ data: [] })),
      ]);
      const meetingRaw = meetingRes.data;
      setMeetings(Array.isArray(meetingRaw) ? meetingRaw : Array.isArray(meetingRaw?.data) ? meetingRaw.data : []);
      const empRaw = empRes.data;
      setEmployees(Array.isArray(empRaw) ? empRaw : Array.isArray(empRaw?.data) ? empRaw.data : []);
    } catch {
      setError('Failed to load 1-on-1 meetings.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSchedule = async () => {
    setError(null);
    if (!formData.employeeId || !formData.scheduledDate) {
      setError('Employee and date are required.');
      return;
    }
    setIsSaving(true);
    try {
      await api.post('/performance-growth/manager/one-on-ones', {
        ...formData,
        agendaItems: formData.agendaItems.filter((a) => a.trim()),
      });
      setSuccess('Meeting scheduled successfully.');
      setShowModal(false);
      setFormData(defaultFormData);
      loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to schedule meeting.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveNotes = async (meetingId: string) => {
    setError(null);
    try {
      await api.patch(`/performance-growth/manager/one-on-ones/${meetingId}`, {
        notes: meetingNotes[meetingId] || '',
      });
      setSuccess('Notes saved.');
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to save notes.');
    }
  };

  const handleToggleActionItem = async (meetingId: string, actionItemId: string, isCompleted: boolean) => {
    try {
      await api.patch(`/performance-growth/manager/one-on-ones/${meetingId}/action-items/${actionItemId}`, {
        isCompleted: !isCompleted,
      }).catch(() => { throw new Error('Failed'); });
      loadData();
    } catch {
      setError('Failed to update action item.');
    }
  };

  const handleAddActionItem = async (meetingId: string) => {
    const text = newActionItems[meetingId]?.trim();
    if (!text) return;
    try {
      await api.patch(`/performance-growth/manager/one-on-ones/${meetingId}`, { newActionItem: text });
      setNewActionItems((prev) => ({ ...prev, [meetingId]: '' }));
      loadData();
    } catch {
      setError('Failed to add action item.');
    }
  };

  const handleCompleteMeeting = async (meetingId: string) => {
    try {
      await api.post(`/performance-growth/manager/one-on-ones/${meetingId}/complete`, {});
      setSuccess('Meeting marked as completed.');
      loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to complete meeting.');
    }
  };

  const addAgendaField = () => {
    setFormData((prev) => ({ ...prev, agendaItems: [...prev.agendaItems, ''] }));
  };

  const updateAgendaItem = (index: number, value: string) => {
    setFormData((prev) => ({
      ...prev,
      agendaItems: prev.agendaItems.map((a, i) => (i === index ? value : a)),
    }));
  };

  const removeAgendaItem = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      agendaItems: prev.agendaItems.filter((_, i) => i !== index),
    }));
  };

  const upcomingMeetings = meetings.filter((m) => m.status === 'upcoming');
  const pastMeetings = meetings.filter((m) => m.status !== 'upcoming');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading meetings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          1-on-1 Meetings
        </h2>
        <p className="text-sm text-text-muted">Schedule and manage 1-on-1 meetings with your team.</p>
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
          Schedule Meeting
        </button>
      </div>

      {/* Upcoming Meetings */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-text flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Upcoming ({upcomingMeetings.length})
        </h3>
        {upcomingMeetings.length === 0 ? (
          <div className="text-center py-8">
            <Inbox className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm text-text-muted">No upcoming meetings.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingMeetings.map((meeting) => (
              <div key={meeting.id} className="border border-border rounded-xl overflow-hidden">
                <div
                  className="bg-card px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-background/50 transition-colors"
                  onClick={() => setExpandedMeeting(expandedMeeting === meeting.id ? null : meeting.id)}
                >
                  <div className="flex items-center gap-3">
                    {expandedMeeting === meeting.id ? <ChevronUp className="h-4 w-4 text-text-muted" /> : <ChevronDown className="h-4 w-4 text-text-muted" />}
                    <div>
                      <span className="text-sm font-medium text-text">{meeting.employeeName}</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-text-muted">
                          {meeting.scheduledDate ? new Date(meeting.scheduledDate).toLocaleDateString() : '--'} at {meeting.scheduledTime || '--'}
                        </span>
                        {meeting.isRecurring && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-700">
                            {meeting.recurringFrequency}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[meeting.status] || 'bg-gray-100 text-gray-600'}`}>
                    {meeting.status}
                  </span>
                </div>

                {expandedMeeting === meeting.id && (
                  <div className="px-4 py-4 border-t border-border space-y-4">
                    {/* Agenda */}
                    <div>
                      <h4 className="text-xs font-semibold text-text-muted uppercase mb-2">Agenda</h4>
                      {(meeting.agendaItems || []).length === 0 ? (
                        <p className="text-xs text-text-muted italic">No agenda items.</p>
                      ) : (
                        <ul className="space-y-1">
                          {meeting.agendaItems.map((item) => (
                            <li key={item.id} className="text-xs text-text flex items-start gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                              <span>{item.text}</span>
                              <span className="text-[10px] text-text-muted">({item.addedBy})</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {/* Notes */}
                    <div>
                      <h4 className="text-xs font-semibold text-text-muted uppercase mb-2">Meeting Notes</h4>
                      <textarea
                        value={meetingNotes[meeting.id] ?? meeting.notes ?? ''}
                        onChange={(e) => setMeetingNotes((prev) => ({ ...prev, [meeting.id]: e.target.value }))}
                        className={`${inputClassName} min-h-[80px]`}
                        placeholder="Add meeting notes..."
                        rows={3}
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveNotes(meeting.id)}
                        className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-white hover:bg-primary-hover transition-colors"
                      >
                        Save Notes
                      </button>
                    </div>

                    {/* Action Items */}
                    <div>
                      <h4 className="text-xs font-semibold text-text-muted uppercase mb-2">Action Items</h4>
                      {(meeting.actionItems || []).map((item) => (
                        <div key={item.id} className="flex items-center gap-2 mb-1">
                          <button
                            type="button"
                            onClick={() => handleToggleActionItem(meeting.id, item.id, item.isCompleted)}
                            className="flex-shrink-0"
                          >
                            {item.isCompleted ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            ) : (
                              <div className="h-4 w-4 rounded border border-border" />
                            )}
                          </button>
                          <span className={`text-xs ${item.isCompleted ? 'text-text-muted line-through' : 'text-text'}`}>
                            {item.text}
                          </span>
                        </div>
                      ))}
                      <div className="flex items-center gap-2 mt-2">
                        <input
                          type="text"
                          value={newActionItems[meeting.id] || ''}
                          onChange={(e) => setNewActionItems((prev) => ({ ...prev, [meeting.id]: e.target.value }))}
                          className={inputClassName}
                          placeholder="Add action item..."
                          onKeyDown={(e) => e.key === 'Enter' && handleAddActionItem(meeting.id)}
                        />
                        <button
                          type="button"
                          onClick={() => handleAddActionItem(meeting.id)}
                          className="px-3 py-2 rounded-lg text-xs font-medium bg-primary text-white hover:bg-primary-hover transition-colors flex-shrink-0"
                        >
                          Add
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleCompleteMeeting(meeting.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Mark Complete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Past Meetings */}
      {pastMeetings.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-text">Meeting History ({pastMeetings.length})</h3>
          <div className="space-y-2">
            {pastMeetings.slice(0, 10).map((meeting) => (
              <div key={meeting.id} className="bg-background border border-border rounded-lg px-4 py-3 flex items-center justify-between">
                <div>
                  <span className="text-sm text-text font-medium">{meeting.employeeName}</span>
                  <p className="text-xs text-text-muted">
                    {meeting.scheduledDate ? new Date(meeting.scheduledDate).toLocaleDateString() : '--'}
                    {meeting.actionItems?.length > 0 && ` -- ${meeting.actionItems.filter((a) => a.isCompleted).length}/${meeting.actionItems.length} actions done`}
                  </p>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[meeting.status] || 'bg-gray-100 text-gray-600'}`}>
                  {meeting.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Schedule Meeting Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-card border border-border rounded-xl shadow-lg p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text">Schedule 1-on-1 Meeting</h3>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Date *</label>
                  <input type="date" value={formData.scheduledDate} onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })} className={inputClassName} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Time</label>
                  <input type="time" value={formData.scheduledTime} onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })} className={inputClassName} />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-text">
                <input type="checkbox" checked={formData.isRecurring} onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })} className="rounded border-border text-primary focus:ring-primary" />
                Recurring meeting
              </label>
              {formData.isRecurring && (
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Frequency</label>
                  <select value={formData.recurringFrequency} onChange={(e) => setFormData({ ...formData, recurringFrequency: e.target.value })} className={selectClassName}>
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Bi-weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              )}

              {/* Agenda Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-medium text-text-muted">Agenda Items</label>
                  <button type="button" onClick={addAgendaField} className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-primary text-white hover:bg-primary-hover transition-colors">
                    <Plus className="h-3 w-3" />
                    Add Item
                  </button>
                </div>
                <div className="space-y-2">
                  {formData.agendaItems.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={item}
                        onChange={(e) => updateAgendaItem(index, e.target.value)}
                        className={inputClassName}
                        placeholder={`Agenda item ${index + 1}`}
                      />
                      {formData.agendaItems.length > 1 && (
                        <button type="button" onClick={() => removeAgendaItem(index)} className="text-text-muted hover:text-red-600 transition-colors flex-shrink-0">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button type="button" onClick={handleSchedule} disabled={isSaving} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors">
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                Schedule Meeting
              </button>
              <button type="button" onClick={() => { setShowModal(false); setFormData(defaultFormData); }} className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
