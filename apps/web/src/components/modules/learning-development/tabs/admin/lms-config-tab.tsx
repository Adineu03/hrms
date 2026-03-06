'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  Settings,
  Plus,
  Pencil,
  Trash2,
  X,
  Inbox,
} from 'lucide-react';

const inputClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary';
const selectClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary appearance-none';

interface Course {
  id: string;
  title: string;
  description: string;
  type: string;
  format: string;
  provider: string;
  externalUrl: string;
  duration: number;
  difficulty: string;
  skills: string[];
  isMandatory: boolean;
  complianceCategory: string;
  scormEnabled: boolean;
  xapiEnabled: boolean;
  status: string;
  createdAt: string;
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  draft: 'bg-gray-100 text-gray-600',
  archived: 'bg-yellow-50 text-yellow-700',
  published: 'bg-blue-100 text-blue-700',
};

const COURSE_TYPES = [
  { value: 'internal', label: 'Internal' },
  { value: 'external', label: 'External' },
];

const COURSE_FORMATS = [
  { value: 'video', label: 'Video' },
  { value: 'slides', label: 'Slides' },
  { value: 'quiz', label: 'Quiz' },
  { value: 'mixed', label: 'Mixed' },
  { value: 'document', label: 'Document' },
  { value: 'interactive', label: 'Interactive' },
];

const DIFFICULTY_LEVELS = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'expert', label: 'Expert' },
];

const PROVIDERS = [
  { value: '', label: 'None / Internal' },
  { value: 'udemy', label: 'Udemy' },
  { value: 'coursera', label: 'Coursera' },
  { value: 'linkedin_learning', label: 'LinkedIn Learning' },
  { value: 'pluralsight', label: 'Pluralsight' },
  { value: 'other', label: 'Other' },
];

const COMPLIANCE_CATEGORIES = [
  { value: '', label: 'None' },
  { value: 'safety', label: 'Safety' },
  { value: 'security', label: 'Security' },
  { value: 'ethics', label: 'Ethics' },
  { value: 'regulatory', label: 'Regulatory' },
  { value: 'posh', label: 'POSH' },
  { value: 'data_privacy', label: 'Data Privacy' },
];

const defaultFormData = {
  title: '',
  description: '',
  type: 'internal',
  format: 'video',
  provider: '',
  externalUrl: '',
  duration: 60,
  difficulty: 'beginner',
  skills: '',
  isMandatory: false,
  complianceCategory: '',
  scormEnabled: false,
  xapiEnabled: false,
  status: 'draft',
};

export default function LmsConfigTab() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [formData, setFormData] = useState(defaultFormData);
  const [isSaving, setIsSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/learning-development/admin/courses');
      setCourses(Array.isArray(res.data) ? res.data : res.data?.data || []);
    } catch {
      setError('Failed to load courses.');
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
      setError('Course title is required.');
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        ...formData,
        skills: formData.skills
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        duration: Number(formData.duration) || 0,
      };
      if (editingCourse) {
        await api.patch(`/learning-development/admin/courses/${editingCourse.id}`, payload);
        setSuccess('Course updated successfully.');
      } else {
        await api.post('/learning-development/admin/courses', payload);
        setSuccess('Course created successfully.');
      }
      setShowModal(false);
      setEditingCourse(null);
      setFormData(defaultFormData);
      loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to save course.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this course?')) return;
    setError(null);
    try {
      await api.delete(`/learning-development/admin/courses/${id}`);
      setCourses((prev) => prev.filter((c) => c.id !== id));
      setSuccess('Course deleted.');
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to delete course.');
    }
  };

  const openEdit = (course: Course) => {
    setEditingCourse(course);
    setFormData({
      title: course.title,
      description: course.description || '',
      type: course.type || 'internal',
      format: course.format || 'video',
      provider: course.provider || '',
      externalUrl: course.externalUrl || '',
      duration: course.duration || 60,
      difficulty: course.difficulty || 'beginner',
      skills: (course.skills || []).join(', '),
      isMandatory: course.isMandatory ?? false,
      complianceCategory: course.complianceCategory || '',
      scormEnabled: course.scormEnabled ?? false,
      xapiEnabled: course.xapiEnabled ?? false,
      status: course.status || 'draft',
    });
    setShowModal(true);
  };

  const openCreate = () => {
    setEditingCourse(null);
    setFormData(defaultFormData);
    setShowModal(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading LMS configuration...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-text flex items-center gap-2">
          <Settings className="h-5 w-5" />
          LMS Configuration
        </h2>
        <p className="text-sm text-text-muted">Manage courses, content partnerships, and compliance mandates.</p>
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
          New Course
        </button>
      </div>

      {/* Table */}
      <div className="border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-background border-b border-border">
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Title</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Type</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Format</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Provider</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Duration</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Difficulty</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Status</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {courses.map((course) => (
              <tr key={course.id} className="bg-card hover:bg-background/50 transition-colors">
                <td className="px-4 py-3">
                  <div>
                    <span className="text-sm text-text font-medium">{course.title}</span>
                    {course.description && (
                      <p className="text-xs text-text-muted mt-0.5 line-clamp-1">{course.description}</p>
                    )}
                    {course.isMandatory && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700 mt-0.5">
                        Mandatory
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-text-muted capitalize">{course.type}</td>
                <td className="px-4 py-3 text-sm text-text-muted capitalize">{course.format}</td>
                <td className="px-4 py-3 text-sm text-text-muted capitalize">{course.provider?.replace(/_/g, ' ') || '--'}</td>
                <td className="px-4 py-3 text-sm text-text-muted">{course.duration ? `${course.duration} min` : '--'}</td>
                <td className="px-4 py-3 text-sm text-text-muted capitalize">{course.difficulty || '--'}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[course.status] || 'bg-gray-100 text-gray-600'}`}>
                    {course.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => openEdit(course)} className="p-1 text-text-muted hover:text-primary transition-colors" title="Edit">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" onClick={() => handleDelete(course.id)} className="p-1 text-text-muted hover:text-red-600 transition-colors" title="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {courses.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center">
                  <Inbox className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm text-text-muted">No courses configured yet. Create your first course.</p>
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
                {editingCourse ? 'Edit Course' : 'New Course'}
              </h3>
              <button type="button" onClick={() => { setShowModal(false); setEditingCourse(null); setFormData(defaultFormData); }} className="text-text-muted hover:text-text">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Course Title *</label>
                <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className={inputClassName} placeholder="e.g. Introduction to TypeScript" />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Description</label>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className={`${inputClassName} min-h-[60px]`} placeholder="Course description..." rows={2} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Type</label>
                  <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className={selectClassName}>
                    {COURSE_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Format</label>
                  <select value={formData.format} onChange={(e) => setFormData({ ...formData, format: e.target.value })} className={selectClassName}>
                    {COURSE_FORMATS.map((f) => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Provider</label>
                  <select value={formData.provider} onChange={(e) => setFormData({ ...formData, provider: e.target.value })} className={selectClassName}>
                    {PROVIDERS.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Difficulty</label>
                  <select value={formData.difficulty} onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })} className={selectClassName}>
                    {DIFFICULTY_LEVELS.map((d) => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              {formData.type === 'external' && (
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">External URL</label>
                  <input type="url" value={formData.externalUrl} onChange={(e) => setFormData({ ...formData, externalUrl: e.target.value })} className={inputClassName} placeholder="https://..." />
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Duration (minutes)</label>
                  <input type="number" value={formData.duration} onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 0 })} className={inputClassName} min={0} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Compliance Category</label>
                  <select value={formData.complianceCategory} onChange={(e) => setFormData({ ...formData, complianceCategory: e.target.value })} className={selectClassName}>
                    {COMPLIANCE_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Skills (comma separated)</label>
                <input type="text" value={formData.skills} onChange={(e) => setFormData({ ...formData, skills: e.target.value })} className={inputClassName} placeholder="e.g. TypeScript, React, Node.js" />
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm text-text">
                  <input type="checkbox" checked={formData.isMandatory} onChange={(e) => setFormData({ ...formData, isMandatory: e.target.checked })} className="rounded border-border text-primary focus:ring-primary" />
                  Mandatory course
                </label>
                <label className="flex items-center gap-2 text-sm text-text">
                  <input type="checkbox" checked={formData.scormEnabled} onChange={(e) => setFormData({ ...formData, scormEnabled: e.target.checked })} className="rounded border-border text-primary focus:ring-primary" />
                  SCORM enabled
                </label>
                <label className="flex items-center gap-2 text-sm text-text">
                  <input type="checkbox" checked={formData.xapiEnabled} onChange={(e) => setFormData({ ...formData, xapiEnabled: e.target.checked })} className="rounded border-border text-primary focus:ring-primary" />
                  xAPI enabled
                </label>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Status</label>
                <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className={selectClassName}>
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button type="button" onClick={handleSave} disabled={isSaving} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors">
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingCourse ? 'Update Course' : 'Create Course'}
              </button>
              <button type="button" onClick={() => { setShowModal(false); setEditingCourse(null); setFormData(defaultFormData); }} className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
