'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  BookOpen,
  Plus,
  Pencil,
  Trash2,
  X,
  Inbox,
  Download,
  Upload,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

const inputClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary';
const selectClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary appearance-none';

interface ProficiencyLevel {
  name: string;
  description: string;
  behavioralIndicators: string;
}

interface Competency {
  id: string;
  name: string;
  description: string;
  category: string;
  proficiencyLevels: ProficiencyLevel[];
  mappedDepartments: string[];
  createdAt: string;
}

const COMPETENCY_CATEGORIES = [
  { value: 'core', label: 'Core' },
  { value: 'leadership', label: 'Leadership' },
  { value: 'technical', label: 'Technical' },
  { value: 'functional', label: 'Functional' },
  { value: 'behavioral', label: 'Behavioral' },
];

const defaultFormData = {
  name: '',
  description: '',
  category: 'core',
  proficiencyLevels: [
    { name: 'Beginner', description: '', behavioralIndicators: '' },
    { name: 'Intermediate', description: '', behavioralIndicators: '' },
    { name: 'Advanced', description: '', behavioralIndicators: '' },
  ] as ProficiencyLevel[],
};

export default function CompetencyLibraryTab() {
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editingCompetency, setEditingCompetency] = useState<Competency | null>(null);
  const [formData, setFormData] = useState(defaultFormData);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/performance-growth/admin/competencies');
      setCompetencies(Array.isArray(res.data) ? res.data : res.data?.data || []);
    } catch {
      setError('Failed to load competency library.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async () => {
    setError(null);
    if (!formData.name.trim()) {
      setError('Competency name is required.');
      return;
    }
    setIsSaving(true);
    try {
      if (editingCompetency) {
        await api.patch(`/performance-growth/admin/competencies/${editingCompetency.id}`, formData);
        setSuccess('Competency updated successfully.');
      } else {
        await api.post('/performance-growth/admin/competencies', formData);
        setSuccess('Competency created successfully.');
      }
      setShowModal(false);
      setEditingCompetency(null);
      setFormData(defaultFormData);
      loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to save competency.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this competency?')) return;
    try {
      await api.delete(`/performance-growth/admin/competencies/${id}`);
      setCompetencies((prev) => prev.filter((c) => c.id !== id));
      setSuccess('Competency deleted.');
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to delete competency.');
    }
  };

  const openEdit = (comp: Competency) => {
    setEditingCompetency(comp);
    setFormData({
      name: comp.name,
      description: comp.description || '',
      category: comp.category,
      proficiencyLevels: comp.proficiencyLevels?.length > 0
        ? comp.proficiencyLevels
        : defaultFormData.proficiencyLevels,
    });
    setShowModal(true);
  };

  const openCreate = () => {
    setEditingCompetency(null);
    setFormData(defaultFormData);
    setShowModal(true);
  };

  const addLevel = () => {
    setFormData((prev) => ({
      ...prev,
      proficiencyLevels: [...prev.proficiencyLevels, { name: '', description: '', behavioralIndicators: '' }],
    }));
  };

  const removeLevel = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      proficiencyLevels: prev.proficiencyLevels.filter((_, i) => i !== index),
    }));
  };

  const updateLevel = (index: number, field: keyof ProficiencyLevel, value: string) => {
    setFormData((prev) => ({
      ...prev,
      proficiencyLevels: prev.proficiencyLevels.map((level, i) =>
        i === index ? { ...level, [field]: value } : level
      ),
    }));
  };

  const handleExport = async () => {
    try {
      const res = await api.get('/performance-growth/admin/competencies/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'competencies.json');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      setError('Failed to export competencies.');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formDataUpload = new FormData();
    formDataUpload.append('file', file);
    try {
      await api.post('/performance-growth/admin/competencies/import', formDataUpload);
      setSuccess('Competencies imported successfully.');
      loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to import competencies.');
    }
    e.target.value = '';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading competency library...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-text flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Competency Library
        </h2>
        <p className="text-sm text-text-muted">Define and manage competencies with proficiency levels.</p>
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

      <div className="flex items-center justify-end gap-2">
        <button type="button" onClick={handleExport} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors">
          <Download className="h-4 w-4" />
          Export
        </button>
        <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors cursor-pointer">
          <Upload className="h-4 w-4" />
          Import
          <input type="file" accept=".json" onChange={handleImport} className="hidden" />
        </label>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Competency
        </button>
      </div>

      {/* Competency Cards */}
      {competencies.length === 0 ? (
        <div className="text-center py-12">
          <Inbox className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm text-text-muted">No competencies defined yet. Create your first competency.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {competencies.map((comp) => (
            <div key={comp.id} className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-sm font-semibold text-text">{comp.name}</h3>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-700 mt-1 capitalize">
                    {comp.category}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => openEdit(comp)} className="p-1 text-text-muted hover:text-primary transition-colors" title="Edit">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" onClick={() => handleDelete(comp.id)} className="p-1 text-text-muted hover:text-red-600 transition-colors" title="Delete">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              {comp.description && (
                <p className="text-xs text-text-muted mb-2 line-clamp-2">{comp.description}</p>
              )}
              <div className="flex items-center justify-between text-xs text-text-muted">
                <span>{comp.proficiencyLevels?.length || 0} proficiency levels</span>
                {comp.mappedDepartments?.length > 0 && (
                  <span>{comp.mappedDepartments.length} dept(s)</span>
                )}
              </div>

              <button
                type="button"
                onClick={() => setExpandedId(expandedId === comp.id ? null : comp.id)}
                className="text-xs text-primary hover:text-primary-hover font-medium mt-2 flex items-center gap-1 transition-colors"
              >
                {expandedId === comp.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                {expandedId === comp.id ? 'Hide Levels' : 'Show Levels'}
              </button>

              {expandedId === comp.id && (
                <div className="mt-3 pt-3 border-t border-border space-y-2">
                  {(comp.proficiencyLevels || []).map((level, idx) => (
                    <div key={idx} className="bg-background rounded-lg px-3 py-2">
                      <span className="text-xs font-semibold text-text">{level.name}</span>
                      {level.description && <p className="text-[10px] text-text-muted mt-0.5">{level.description}</p>}
                      {level.behavioralIndicators && (
                        <p className="text-[10px] text-text-muted mt-0.5 italic">{level.behavioralIndicators}</p>
                      )}
                    </div>
                  ))}
                  {(comp.proficiencyLevels || []).length === 0 && (
                    <p className="text-xs text-text-muted italic">No proficiency levels defined.</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-card border border-border rounded-xl shadow-lg p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text">
                {editingCompetency ? 'Edit Competency' : 'New Competency'}
              </h3>
              <button type="button" onClick={() => { setShowModal(false); setEditingCompetency(null); setFormData(defaultFormData); }} className="text-text-muted hover:text-text">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Name *</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className={inputClassName} placeholder="e.g. Communication" />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Description</label>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className={`${inputClassName} min-h-[60px]`} placeholder="Competency description..." rows={2} />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Category</label>
                <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className={selectClassName}>
                  {COMPETENCY_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              {/* Proficiency Levels */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-medium text-text-muted">Proficiency Levels</label>
                  <button type="button" onClick={addLevel} className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-primary text-white hover:bg-primary-hover transition-colors">
                    <Plus className="h-3 w-3" />
                    Add Level
                  </button>
                </div>
                <div className="space-y-3">
                  {formData.proficiencyLevels.map((level, index) => (
                    <div key={index} className="bg-background rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-text-muted uppercase">Level {index + 1}</span>
                        {formData.proficiencyLevels.length > 1 && (
                          <button type="button" onClick={() => removeLevel(index)} className="text-text-muted hover:text-red-600 transition-colors">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                      <input type="text" value={level.name} onChange={(e) => updateLevel(index, 'name', e.target.value)} className={inputClassName} placeholder="Level name (e.g. Expert)" />
                      <input type="text" value={level.description} onChange={(e) => updateLevel(index, 'description', e.target.value)} className={inputClassName} placeholder="Description" />
                      <input type="text" value={level.behavioralIndicators} onChange={(e) => updateLevel(index, 'behavioralIndicators', e.target.value)} className={inputClassName} placeholder="Behavioral indicators" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button type="button" onClick={handleSave} disabled={isSaving} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors">
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingCompetency ? 'Update Competency' : 'Create Competency'}
              </button>
              <button type="button" onClick={() => { setShowModal(false); setEditingCompetency(null); setFormData(defaultFormData); }} className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
