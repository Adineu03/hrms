'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  ListTodo,
  Plus,
  Search,
  Download,
  X,
  Inbox,
} from 'lucide-react';

const inputClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary';
const selectClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary appearance-none';

interface Activity {
  id: string;
  timestamp: string;
  category: string;
  project: string;
  description: string;
  tags: string[];
  duration: number;
}

interface TagOption {
  value: string;
  count: number;
}

const CATEGORY_STYLES: Record<string, string> = {
  development: 'bg-blue-50 text-blue-700',
  meeting: 'bg-purple-50 text-purple-700',
  review: 'bg-orange-50 text-orange-700',
  planning: 'bg-teal-50 text-teal-700',
  testing: 'bg-green-50 text-green-700',
  documentation: 'bg-yellow-50 text-yellow-700',
  admin: 'bg-gray-100 text-gray-600',
  other: 'bg-pink-50 text-pink-700',
};

export default function ActivityLogTab() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [tags, setTags] = useState<TagOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filters
  const [filterFromDate, setFilterFromDate] = useState('');
  const [filterToDate, setFilterToDate] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Add activity
  const [showAddForm, setShowAddForm] = useState(false);
  const [newActivity, setNewActivity] = useState({
    category: 'development',
    project: '',
    description: '',
    tags: '',
    duration: 0,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterFromDate) params.append('fromDate', filterFromDate);
      if (filterToDate) params.append('toDate', filterToDate);
      if (filterProject) params.append('project', filterProject);
      if (filterTag) params.append('tag', filterTag);
      if (searchQuery) params.append('search', searchQuery);

      const [actRes, tagsRes] = await Promise.all([
        api.get(`/daily-work-logging/employee/activities?${params.toString()}`),
        api.get('/daily-work-logging/employee/activities/tags'),
      ]);
      setActivities(Array.isArray(actRes.data) ? actRes.data : actRes.data?.data || []);
      setTags(Array.isArray(tagsRes.data) ? tagsRes.data : tagsRes.data?.data || []);
    } catch {
      setError('Failed to load activities.');
    } finally {
      setIsLoading(false);
    }
  }, [filterFromDate, filterToDate, filterProject, filterTag, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddActivity = async () => {
    if (!newActivity.description.trim()) {
      setError('Description is required.');
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      const payload = {
        ...newActivity,
        tags: newActivity.tags.split(',').map((t) => t.trim()).filter(Boolean),
      };
      const res = await api.post('/daily-work-logging/employee/activities', payload);
      const created = res.data?.data || res.data;
      setActivities((prev) => [created, ...prev]);
      setNewActivity({ category: 'development', project: '', description: '', tags: '', duration: 0 });
      setShowAddForm(false);
      setSuccess('Activity logged.');
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to log activity.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterFromDate) params.append('fromDate', filterFromDate);
      if (filterToDate) params.append('toDate', filterToDate);
      const res = await api.get(`/daily-work-logging/employee/activities/export?${params.toString()}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'activity-log.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setSuccess('Activity log exported.');
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to export activities.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text flex items-center gap-2">
            <ListTodo className="h-5 w-5" />
            Activity Log
          </h2>
          <p className="text-sm text-text-muted">Track and review your work activities.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border text-text hover:bg-background disabled:opacity-50 transition-colors"
          >
            {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            Export
          </button>
          <button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-white hover:bg-primary-hover transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Activity
          </button>
        </div>
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

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">From</label>
          <input type="date" value={filterFromDate} onChange={(e) => setFilterFromDate(e.target.value)} className={`${inputClassName} w-36`} />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">To</label>
          <input type="date" value={filterToDate} onChange={(e) => setFilterToDate(e.target.value)} className={`${inputClassName} w-36`} />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">Project</label>
          <input type="text" value={filterProject} onChange={(e) => setFilterProject(e.target.value)} className={`${inputClassName} w-36`} placeholder="Filter by project" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">Tag</label>
          <select value={filterTag} onChange={(e) => setFilterTag(e.target.value)} className={`${selectClassName} w-36`}>
            <option value="">All tags</option>
            {tags.map((t) => (
              <option key={t.value} value={t.value}>{t.value} ({t.count})</option>
            ))}
          </select>
        </div>
        <div className="relative flex-1 min-w-[180px]">
          <label className="block text-xs font-medium text-text-muted mb-1">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`${inputClassName} pl-9`}
              placeholder="Search activities..."
            />
          </div>
        </div>
      </div>

      {/* Add Activity Form */}
      {showAddForm && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text">Log Activity</h3>
            <button type="button" onClick={() => setShowAddForm(false)} className="text-text-muted hover:text-text">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Category</label>
              <select
                value={newActivity.category}
                onChange={(e) => setNewActivity({ ...newActivity, category: e.target.value })}
                className={selectClassName}
              >
                <option value="development">Development</option>
                <option value="meeting">Meeting</option>
                <option value="review">Review</option>
                <option value="planning">Planning</option>
                <option value="testing">Testing</option>
                <option value="documentation">Documentation</option>
                <option value="admin">Admin</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Project</label>
              <input
                type="text"
                value={newActivity.project}
                onChange={(e) => setNewActivity({ ...newActivity, project: e.target.value })}
                className={inputClassName}
                placeholder="Project name"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Duration (min)</label>
              <input
                type="number"
                value={newActivity.duration}
                onChange={(e) => setNewActivity({ ...newActivity, duration: parseInt(e.target.value) || 0 })}
                min={0}
                className={inputClassName}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Description *</label>
            <input
              type="text"
              value={newActivity.description}
              onChange={(e) => setNewActivity({ ...newActivity, description: e.target.value })}
              className={inputClassName}
              placeholder="What did you do?"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Tags (comma separated)</label>
            <input
              type="text"
              value={newActivity.tags}
              onChange={(e) => setNewActivity({ ...newActivity, tags: e.target.value })}
              className={inputClassName}
              placeholder="e.g. frontend, bugfix, urgent"
            />
          </div>
          <button
            type="button"
            onClick={handleAddActivity}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Log Activity
          </button>
        </div>
      )}

      {/* Activity List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
          <span className="ml-2 text-sm text-text-muted">Loading activities...</span>
        </div>
      ) : (
        <div className="space-y-2">
          {activities.map((activity) => (
            <div key={activity.id} className="bg-card border border-border rounded-xl p-4 flex items-start gap-4">
              <div className="text-xs text-text-muted whitespace-nowrap pt-0.5">
                {new Date(activity.timestamp).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    CATEGORY_STYLES[activity.category] || CATEGORY_STYLES.other
                  }`}>
                    {activity.category}
                  </span>
                  {activity.project && (
                    <span className="text-xs text-primary font-medium">{activity.project}</span>
                  )}
                  {activity.duration > 0 && (
                    <span className="text-xs text-text-muted">{activity.duration}min</span>
                  )}
                </div>
                <p className="text-sm text-text">{activity.description}</p>
                {activity.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {activity.tags.map((tag, i) => (
                      <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-background text-text-muted border border-border">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {activities.length === 0 && (
            <div className="text-center py-8">
              <Inbox className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm text-text-muted">No activities found.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
