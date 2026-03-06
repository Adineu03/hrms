'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  GitBranch,
  Plus,
  Pencil,
  Trash2,
  X,
  GripVertical,
  Users,
  Clock,
  Inbox,
} from 'lucide-react';

const inputClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary';
const selectClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary appearance-none';

interface EvaluationCriteria {
  name: string;
  maxScore: number;
  weight: number;
}

interface PipelineStage {
  id: string;
  name: string;
  code: string;
  stageType: string;
  sortOrder: number;
  slaDays: number;
  interviewerCount: number;
  autoAdvanceThreshold: number;
  evaluationCriteria: EvaluationCriteria[];
}

const STAGE_TYPE_OPTIONS = [
  { value: 'screening', label: 'Screening' },
  { value: 'phone_screen', label: 'Phone Screen' },
  { value: 'technical', label: 'Technical' },
  { value: 'hr', label: 'HR' },
  { value: 'panel', label: 'Panel' },
  { value: 'assessment', label: 'Assessment' },
  { value: 'offer', label: 'Offer' },
  { value: 'custom', label: 'Custom' },
];

const STAGE_TYPE_STYLES: Record<string, string> = {
  screening: 'bg-blue-50 text-blue-700',
  phone_screen: 'bg-cyan-50 text-cyan-700',
  technical: 'bg-purple-50 text-purple-700',
  hr: 'bg-green-50 text-green-700',
  panel: 'bg-orange-50 text-orange-700',
  assessment: 'bg-indigo-50 text-indigo-700',
  offer: 'bg-emerald-50 text-emerald-700',
  custom: 'bg-gray-100 text-gray-600',
};

const defaultFormData = {
  name: '',
  code: '',
  stageType: 'screening',
  sortOrder: 1,
  slaDays: 3,
  interviewerCount: 1,
  autoAdvanceThreshold: 0,
  evaluationCriteria: [] as EvaluationCriteria[],
};

export default function PipelineConfigTab() {
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingStage, setEditingStage] = useState<PipelineStage | null>(null);
  const [formData, setFormData] = useState(defaultFormData);
  const [isSaving, setIsSaving] = useState(false);

  // Evaluation criteria form
  const [newCriteriaName, setNewCriteriaName] = useState('');
  const [newCriteriaMaxScore, setNewCriteriaMaxScore] = useState(10);
  const [newCriteriaWeight, setNewCriteriaWeight] = useState(1);

  const loadStages = useCallback(async () => {
    try {
      const res = await api.get('/talent-acquisition/admin/pipeline');
      const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setStages(data.sort((a: PipelineStage, b: PipelineStage) => a.sortOrder - b.sortOrder));
    } catch {
      setError('Failed to load pipeline stages.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStages();
  }, [loadStages]);

  const handleSave = async () => {
    setError(null);
    if (!formData.name.trim()) {
      setError('Stage name is required.');
      return;
    }
    setIsSaving(true);
    try {
      if (editingStage) {
        await api.patch(`/talent-acquisition/admin/pipeline/${editingStage.id}`, formData);
        setStages((prev) =>
          prev.map((s) => (s.id === editingStage.id ? { ...s, ...formData, id: s.id } : s))
            .sort((a, b) => a.sortOrder - b.sortOrder)
        );
        setSuccess('Stage updated successfully.');
      } else {
        const res = await api.post('/talent-acquisition/admin/pipeline', formData);
        const newStage = res.data?.data || res.data;
        setStages((prev) => [...prev, newStage].sort((a, b) => a.sortOrder - b.sortOrder));
        setSuccess('Stage created successfully.');
      }
      setShowForm(false);
      setEditingStage(null);
      setFormData(defaultFormData);
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to save stage.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this pipeline stage?')) return;
    setError(null);
    try {
      await api.delete(`/talent-acquisition/admin/pipeline/${id}`);
      setStages((prev) => prev.filter((s) => s.id !== id));
      setSuccess('Stage deleted.');
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to delete stage.');
    }
  };

  const handleReorder = async () => {
    setError(null);
    try {
      const order = stages.map((s, idx) => ({ id: s.id, sortOrder: idx + 1 }));
      await api.post('/talent-acquisition/admin/pipeline/reorder', { order });
      setSuccess('Pipeline reordered successfully.');
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to reorder pipeline.');
    }
  };

  const moveStage = (index: number, direction: 'up' | 'down') => {
    const newStages = [...stages];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newStages.length) return;
    [newStages[index], newStages[targetIndex]] = [newStages[targetIndex], newStages[index]];
    newStages.forEach((s, idx) => { s.sortOrder = idx + 1; });
    setStages(newStages);
  };

  const openEdit = (stage: PipelineStage) => {
    setEditingStage(stage);
    setFormData({
      name: stage.name,
      code: stage.code,
      stageType: stage.stageType,
      sortOrder: stage.sortOrder,
      slaDays: stage.slaDays,
      interviewerCount: stage.interviewerCount,
      autoAdvanceThreshold: stage.autoAdvanceThreshold || 0,
      evaluationCriteria: stage.evaluationCriteria || [],
    });
    setShowForm(true);
  };

  const openCreate = () => {
    setEditingStage(null);
    setFormData({
      ...defaultFormData,
      sortOrder: stages.length + 1,
    });
    setShowForm(true);
  };

  const addCriteria = () => {
    if (!newCriteriaName.trim()) return;
    setFormData({
      ...formData,
      evaluationCriteria: [
        ...formData.evaluationCriteria,
        { name: newCriteriaName.trim(), maxScore: newCriteriaMaxScore, weight: newCriteriaWeight },
      ],
    });
    setNewCriteriaName('');
    setNewCriteriaMaxScore(10);
    setNewCriteriaWeight(1);
  };

  const removeCriteria = (index: number) => {
    setFormData({
      ...formData,
      evaluationCriteria: formData.evaluationCriteria.filter((_, i) => i !== index),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading pipeline...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-text flex items-center gap-2">
          <GitBranch className="h-5 w-5" />
          Recruitment Pipeline Configuration
        </h2>
        <p className="text-sm text-text-muted">Configure hiring stages for your recruitment pipeline.</p>
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

      {/* Actions */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handleReorder}
          disabled={stages.length < 2}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border text-text hover:bg-background disabled:opacity-50 transition-colors"
        >
          Save Order
        </button>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Stage
        </button>
      </div>

      {/* Pipeline Stages as Cards */}
      {stages.length === 0 ? (
        <div className="text-center py-8">
          <Inbox className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm text-text-muted">No pipeline stages configured. Add your first stage.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {stages.map((stage, index) => (
            <div
              key={stage.id}
              className="bg-card border border-border rounded-xl p-4 flex items-start gap-4 hover:border-primary/30 transition-colors"
            >
              {/* Drag handle / reorder */}
              <div className="flex flex-col items-center gap-1 pt-1">
                <GripVertical className="h-4 w-4 text-text-muted/50" />
                <div className="flex flex-col gap-0.5">
                  <button
                    type="button"
                    onClick={() => moveStage(index, 'up')}
                    disabled={index === 0}
                    className="text-[10px] text-text-muted hover:text-primary disabled:opacity-30 transition-colors"
                    title="Move up"
                  >
                    &uarr;
                  </button>
                  <button
                    type="button"
                    onClick={() => moveStage(index, 'down')}
                    disabled={index === stages.length - 1}
                    className="text-[10px] text-text-muted hover:text-primary disabled:opacity-30 transition-colors"
                    title="Move down"
                  >
                    &darr;
                  </button>
                </div>
              </div>

              {/* Stage info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-semibold text-text">{stage.name}</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${STAGE_TYPE_STYLES[stage.stageType] || 'bg-gray-100 text-gray-600'}`}>
                    {stage.stageType.replace(/_/g, ' ')}
                  </span>
                  <span className="text-xs text-text-muted font-mono">({stage.code})</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-text-muted">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    SLA: {stage.slaDays} day{stage.slaDays !== 1 ? 's' : ''}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {stage.interviewerCount} interviewer{stage.interviewerCount !== 1 ? 's' : ''}
                  </span>
                  {stage.autoAdvanceThreshold > 0 && (
                    <span className="text-green-600">
                      Auto-advance at {stage.autoAdvanceThreshold}%
                    </span>
                  )}
                </div>
                {stage.evaluationCriteria && stage.evaluationCriteria.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {stage.evaluationCriteria.map((c, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center px-2 py-0.5 rounded bg-background border border-border text-[10px] text-text-muted"
                      >
                        {c.name} (max {c.maxScore}, w:{c.weight})
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => openEdit(stage)}
                  className="p-1.5 text-text-muted hover:text-primary transition-colors"
                  title="Edit"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(stage.id)}
                  className="p-1.5 text-text-muted hover:text-red-600 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-card border border-border rounded-xl shadow-lg p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text">
                {editingStage ? 'Edit Stage' : 'Add Pipeline Stage'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingStage(null);
                  setFormData(defaultFormData);
                }}
                className="text-text-muted hover:text-text"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Stage Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={inputClassName}
                    placeholder="e.g. Technical Interview"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Code</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className={inputClassName}
                    placeholder="e.g. TECH_INT"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Stage Type</label>
                  <select
                    value={formData.stageType}
                    onChange={(e) => setFormData({ ...formData, stageType: e.target.value })}
                    className={selectClassName}
                  >
                    {STAGE_TYPE_OPTIONS.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Sort Order</label>
                  <input
                    type="number"
                    value={formData.sortOrder}
                    onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 1 })}
                    min={1}
                    className={inputClassName}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">SLA Days</label>
                  <input
                    type="number"
                    value={formData.slaDays}
                    onChange={(e) => setFormData({ ...formData, slaDays: parseInt(e.target.value) || 0 })}
                    min={0}
                    className={inputClassName}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Interviewers</label>
                  <input
                    type="number"
                    value={formData.interviewerCount}
                    onChange={(e) => setFormData({ ...formData, interviewerCount: parseInt(e.target.value) || 1 })}
                    min={1}
                    className={inputClassName}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Auto-Advance (%)</label>
                  <input
                    type="number"
                    value={formData.autoAdvanceThreshold}
                    onChange={(e) => setFormData({ ...formData, autoAdvanceThreshold: parseInt(e.target.value) || 0 })}
                    min={0}
                    max={100}
                    className={inputClassName}
                    placeholder="0 = disabled"
                  />
                </div>
              </div>

              {/* Evaluation Criteria */}
              <div>
                <label className="block text-xs font-medium text-text-muted mb-2">Evaluation Criteria</label>
                {formData.evaluationCriteria.length > 0 && (
                  <div className="space-y-1.5 mb-3">
                    {formData.evaluationCriteria.map((c, i) => (
                      <div key={i} className="flex items-center gap-2 bg-background rounded-lg p-2 border border-border text-xs">
                        <span className="flex-1 text-text font-medium">{c.name}</span>
                        <span className="text-text-muted">Max: {c.maxScore}</span>
                        <span className="text-text-muted">Weight: {c.weight}</span>
                        <button
                          type="button"
                          onClick={() => removeCriteria(i)}
                          className="p-0.5 text-text-muted hover:text-red-600 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={newCriteriaName}
                      onChange={(e) => setNewCriteriaName(e.target.value)}
                      className={inputClassName}
                      placeholder="Criteria name"
                    />
                  </div>
                  <div className="w-20">
                    <input
                      type="number"
                      value={newCriteriaMaxScore}
                      onChange={(e) => setNewCriteriaMaxScore(parseInt(e.target.value) || 10)}
                      min={1}
                      className={inputClassName}
                      placeholder="Max"
                    />
                  </div>
                  <div className="w-20">
                    <input
                      type="number"
                      value={newCriteriaWeight}
                      onChange={(e) => setNewCriteriaWeight(parseFloat(e.target.value) || 1)}
                      min={0}
                      step={0.1}
                      className={inputClassName}
                      placeholder="Weight"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={addCriteria}
                    disabled={!newCriteriaName.trim()}
                    className="px-3 py-2 rounded-lg text-xs font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors"
              >
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingStage ? 'Update Stage' : 'Add Stage'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingStage(null);
                  setFormData(defaultFormData);
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
