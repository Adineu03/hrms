'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  Plus,
  Trash2,
  Save,
  Send,
  Copy,
  ChevronLeft,
  ChevronRight,
  Inbox,
} from 'lucide-react';

const inputClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary';
const selectClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary appearance-none';

interface TimesheetEntry {
  id: string;
  projectId: string;
  projectName: string;
  taskCategoryId: string;
  taskCategoryName: string;
  startTime: string;
  endTime: string;
  hours: number;
  description: string;
  billable: boolean;
}

interface ProjectOption {
  id: string;
  name: string;
}

interface TaskCategoryOption {
  id: string;
  name: string;
}

const defaultNewEntry = {
  projectId: '',
  taskCategoryId: '',
  startTime: '09:00',
  endTime: '17:00',
  hours: 8,
  description: '',
  billable: true,
};

export default function DailyTimesheetTab() {
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [entries, setEntries] = useState<TimesheetEntry[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [taskCategories, setTaskCategories] = useState<TaskCategoryOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // New entry form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEntry, setNewEntry] = useState(defaultNewEntry);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [entriesRes, projectsRes, categoriesRes] = await Promise.all([
        api.get(`/daily-work-logging/employee/timesheet?date=${selectedDate}`).catch(() => null),
        api.get('/daily-work-logging/employee/timesheet/projects').catch(() => null),
        api.get('/daily-work-logging/employee/timesheet/categories').catch(() => null),
      ]);
      const entriesData = entriesRes?.data;
      setEntries(Array.isArray(entriesData) ? entriesData : Array.isArray(entriesData?.data) ? entriesData.data : []);
      const projData = projectsRes?.data;
      setProjects(Array.isArray(projData) ? projData : Array.isArray(projData?.data) ? projData.data : []);
      const catData = categoriesRes?.data;
      setTaskCategories(Array.isArray(catData) ? catData : Array.isArray(catData?.data) ? catData.data : []);
    } catch {
      setError('Failed to load timesheet data.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const calculateHours = (start: string, end: string): number => {
    if (!start || !end) return 0;
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const diff = (eh * 60 + em - sh * 60 - sm) / 60;
    return Math.max(0, Math.round(diff * 100) / 100);
  };

  const handleAddEntry = async () => {
    if (!newEntry.projectId) {
      setError('Please select a project.');
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      const payload = {
        ...newEntry,
        date: selectedDate,
        hours: calculateHours(newEntry.startTime, newEntry.endTime) || newEntry.hours,
      };
      const res = await api.post('/daily-work-logging/employee/timesheet', payload);
      const created = res.data?.data || res.data;
      setEntries((prev) => [...prev, created]);
      setNewEntry(defaultNewEntry);
      setShowAddForm(false);
      setSuccess('Entry added.');
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to add entry.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    setDeletingId(id);
    setError(null);
    try {
      await api.delete(`/daily-work-logging/employee/timesheet/${id}`);
      setEntries((prev) => prev.filter((e) => e.id !== id));
      setSuccess('Entry deleted.');
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to delete entry.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSaveAsDraft = async () => {
    setError(null);
    setIsSaving(true);
    try {
      await api.post('/daily-work-logging/employee/timesheet', {
        date: selectedDate,
        action: 'draft',
      });
      setSuccess('Timesheet saved as draft.');
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to save draft.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (entries.length === 0) {
      setError('Add at least one entry before submitting.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await api.post('/daily-work-logging/employee/timesheet', {
        date: selectedDate,
        action: 'submit',
      });
      setSuccess('Timesheet submitted successfully.');
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to submit timesheet.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyPrevious = async () => {
    setError(null);
    setIsCopying(true);
    try {
      const res = await api.post('/daily-work-logging/employee/timesheet/copy-previous', {
        date: selectedDate,
      });
      const copied = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setEntries((prev) => [...prev, ...copied]);
      setSuccess('Entries copied from previous day.');
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to copy from previous day.');
    } finally {
      setIsCopying(false);
    }
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + (direction === 'next' ? 1 : -1));
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  const totalHours = entries.reduce((sum, e) => sum + (e.hours ?? 0), 0);
  const totalBillable = entries.filter((e) => e.billable).reduce((sum, e) => sum + (e.hours ?? 0), 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading timesheet...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Daily Timesheet
          </h2>
          <p className="text-sm text-text-muted">Log your daily work activities and hours.</p>
        </div>
        <button
          type="button"
          onClick={handleCopyPrevious}
          disabled={isCopying}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border text-text hover:bg-background disabled:opacity-50 transition-colors"
        >
          {isCopying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Copy className="h-3.5 w-3.5" />}
          Copy Previous Day
        </button>
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

      {/* Date Selector */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigateDate('prev')}
          className="p-2 rounded-lg border border-border text-text-muted hover:text-text hover:bg-background transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className={`${inputClassName} w-44 text-center`}
        />
        <button
          type="button"
          onClick={() => navigateDate('next')}
          className="p-2 rounded-lg border border-border text-text-muted hover:text-text hover:bg-background transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <span className="text-sm text-text-muted">
          {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </span>
      </div>

      {/* Total Hours Display */}
      <div className="flex items-center gap-6 bg-background rounded-lg p-4 border border-border">
        <div>
          <span className="text-xs text-text-muted uppercase tracking-wider">Total Hours</span>
          <p className="text-xl font-bold text-text">{totalHours.toFixed(1)}</p>
        </div>
        <div>
          <span className="text-xs text-text-muted uppercase tracking-wider">Billable</span>
          <p className="text-xl font-bold text-green-700">{totalBillable.toFixed(1)}</p>
        </div>
        <div>
          <span className="text-xs text-text-muted uppercase tracking-wider">Non-Billable</span>
          <p className="text-xl font-bold text-text-muted">{(totalHours - totalBillable).toFixed(1)}</p>
        </div>
        <div>
          <span className="text-xs text-text-muted uppercase tracking-wider">Entries</span>
          <p className="text-xl font-bold text-text">{entries.length}</p>
        </div>
      </div>

      {/* Entries List */}
      <div className="space-y-2">
        {entries.map((entry) => (
          <div key={entry.id} className="bg-card border border-border rounded-xl p-4 flex items-start gap-4">
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-5 gap-3">
              <div>
                <span className="text-xs text-text-muted">Project</span>
                <p className="text-sm font-medium text-text">{entry.projectName}</p>
              </div>
              <div>
                <span className="text-xs text-text-muted">Task</span>
                <p className="text-sm text-text">{entry.taskCategoryName}</p>
              </div>
              <div>
                <span className="text-xs text-text-muted">Time</span>
                <p className="text-sm text-text">{entry.startTime} - {entry.endTime}</p>
              </div>
              <div>
                <span className="text-xs text-text-muted">Hours</span>
                <p className="text-sm font-medium text-primary">{(entry.hours ?? 0).toFixed(1)}h</p>
              </div>
              <div>
                <span className="text-xs text-text-muted">Billable</span>
                <p className="text-sm">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    entry.billable ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {entry.billable ? 'Yes' : 'No'}
                  </span>
                </p>
              </div>
            </div>
            {entry.description && (
              <div className="hidden sm:block flex-1 max-w-[200px]">
                <span className="text-xs text-text-muted">Description</span>
                <p className="text-xs text-text truncate" title={entry.description}>{entry.description}</p>
              </div>
            )}
            <button
              type="button"
              onClick={() => handleDeleteEntry(entry.id)}
              disabled={deletingId === entry.id}
              className="p-1.5 text-text-muted hover:text-red-600 transition-colors mt-1"
            >
              {deletingId === entry.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </button>
          </div>
        ))}

        {entries.length === 0 && !showAddForm && (
          <div className="text-center py-8">
            <Inbox className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm text-text-muted">No entries for this day. Add your first entry below.</p>
          </div>
        )}
      </div>

      {/* Add Entry Form */}
      {showAddForm ? (
        <div className="bg-card border border-border rounded-xl p-4 space-y-4">
          <h3 className="text-sm font-semibold text-text">Add Entry</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Project *</label>
              <select
                value={newEntry.projectId}
                onChange={(e) => setNewEntry({ ...newEntry, projectId: e.target.value })}
                className={selectClassName}
              >
                <option value="">Select project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Task Category</label>
              <select
                value={newEntry.taskCategoryId}
                onChange={(e) => setNewEntry({ ...newEntry, taskCategoryId: e.target.value })}
                className={selectClassName}
              >
                <option value="">Select category</option>
                {taskCategories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Start</label>
                <input
                  type="time"
                  value={newEntry.startTime}
                  onChange={(e) => {
                    const start = e.target.value;
                    const hours = calculateHours(start, newEntry.endTime);
                    setNewEntry({ ...newEntry, startTime: start, hours });
                  }}
                  className={inputClassName}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">End</label>
                <input
                  type="time"
                  value={newEntry.endTime}
                  onChange={(e) => {
                    const end = e.target.value;
                    const hours = calculateHours(newEntry.startTime, end);
                    setNewEntry({ ...newEntry, endTime: end, hours });
                  }}
                  className={inputClassName}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Hours</label>
              <input
                type="number"
                value={newEntry.hours}
                onChange={(e) => setNewEntry({ ...newEntry, hours: parseFloat(e.target.value) || 0 })}
                min={0}
                step={0.25}
                className={inputClassName}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Description</label>
              <input
                type="text"
                value={newEntry.description}
                onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })}
                className={inputClassName}
                placeholder="What did you work on?"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer pb-2">
                <input
                  type="checkbox"
                  checked={newEntry.billable}
                  onChange={(e) => setNewEntry({ ...newEntry, billable: e.target.checked })}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-sm text-text">Billable</span>
              </label>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleAddEntry}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add Entry
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setNewEntry(defaultNewEntry);
              }}
              className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="w-full py-3 rounded-xl border-2 border-dashed border-border text-sm font-medium text-text-muted hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Entry
        </button>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={handleSaveAsDraft}
          disabled={isSaving}
          className="flex-1 py-2.5 rounded-lg text-sm font-medium border border-border text-text hover:bg-background disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save as Draft
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Submit
        </button>
      </div>
    </div>
  );
}
