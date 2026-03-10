'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Plus, Trash2, Eye, EyeOff, Map, ChevronDown, ChevronUp } from 'lucide-react';

interface TourStep {
  title: string;
  tooltip: string;
  targetSelector: string;
}

interface Tour {
  id: string;
  name: string;
  targetModule: string;
  assignedPersona: 'All' | 'Admin' | 'Manager' | 'Employee';
  steps: TourStep[];
  published: boolean;
  completionCount: number;
}

const MODULES = [
  'Core HR', 'Time & Attendance', 'Leave Management', 'Daily Work Logging',
  'Talent Acquisition', 'Onboarding & Offboarding', 'Performance & Growth',
  'Learning & Development', 'Compensation & Rewards', 'Engagement & Culture',
  'Platform & Experience', 'Payroll Processing', 'Expense Management',
  'Compliance & Audit', 'Workforce Planning', 'Integrations & API',
  'People Analytics', 'Cold Start Setup',
];

const PERSONAS = ['All', 'Admin', 'Manager', 'Employee'];

const EMPTY_STEP: TourStep = { title: '', tooltip: '', targetSelector: '' };

export default function GuidedTourBuilder() {
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedTourId, setExpandedTourId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    targetModule: MODULES[0],
    assignedPersona: 'All' as Tour['assignedPersona'],
    steps: [{ ...EMPTY_STEP }] as TourStep[],
  });

  const fetchTours = () => {
    setLoading(true);
    setError('');
    api.get('/demo-company/admin/guided-tour-builder')
      .then((r) => setTours(r.data.data ?? []))
      .catch(() => setError('Failed to load tours.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTours();
  }, []);

  const addStep = () => setForm((f) => ({ ...f, steps: [...f.steps, { ...EMPTY_STEP }] }));

  const removeStep = (index: number) =>
    setForm((f) => ({ ...f, steps: f.steps.filter((_, i) => i !== index) }));

  const updateStep = (index: number, field: keyof TourStep, value: string) =>
    setForm((f) => ({
      ...f,
      steps: f.steps.map((s, i) => (i === index ? { ...s, [field]: value } : s)),
    }));

  const resetForm = () =>
    setForm({ name: '', targetModule: MODULES[0], assignedPersona: 'All', steps: [{ ...EMPTY_STEP }] });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setFormError('Tour name is required.'); return; }
    if (form.steps.some((s) => !s.title.trim())) { setFormError('All steps must have a title.'); return; }
    setSubmitting(true);
    setFormError('');
    try {
      await api.post('/demo-company/admin/guided-tour-builder', {
        name: form.name.trim(),
        targetModule: form.targetModule,
        assignedPersona: form.assignedPersona,
        steps: form.steps,
      });
      resetForm();
      setShowForm(false);
      fetchTours();
    } catch {
      setFormError('Failed to create tour. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTogglePublish = async (tour: Tour) => {
    setTogglingId(tour.id);
    try {
      await api.post(`/demo-company/admin/guided-tour-builder/${tour.id}/publish`, {});
      setTours((prev) =>
        prev.map((t) => (t.id === tour.id ? { ...t, published: !t.published } : t))
      );
    } catch {
      // silently ignore
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this tour? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      await api.delete(`/demo-company/admin/guided-tour-builder/${id}`);
      setTours((prev) => prev.filter((t) => t.id !== id));
    } catch {
      // silently ignore
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#2c2c2c]">Guided Tour Builder</h2>
          <p className="text-sm text-gray-500 mt-0.5">Create step-by-step tours to guide prospects through specific modules</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Tour
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="font-semibold text-[#2c2c2c] mb-4">Create New Tour</h3>
          <form onSubmit={handleCreate} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tour Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Leave Approval Flow"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#2c2c2c] focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target Module</label>
                <select
                  value={form.targetModule}
                  onChange={(e) => setForm((f) => ({ ...f, targetModule: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#2c2c2c] focus:outline-none focus:ring-2 focus:ring-indigo-300"
                >
                  {MODULES.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Persona</label>
                <select
                  value={form.assignedPersona}
                  onChange={(e) => setForm((f) => ({ ...f, assignedPersona: e.target.value as Tour['assignedPersona'] }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#2c2c2c] focus:outline-none focus:ring-2 focus:ring-indigo-300"
                >
                  {PERSONAS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>

            {/* Steps Builder */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-700">Tour Steps ({form.steps.length})</label>
                <button
                  type="button"
                  onClick={addStep}
                  className="flex items-center gap-1 text-xs text-indigo-600 hover:underline"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Step
                </button>
              </div>
              <div className="space-y-3">
                {form.steps.map((step, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="text-sm font-medium text-gray-700">Step {idx + 1}</span>
                      {form.steps.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeStep(idx)}
                          className="ml-auto text-red-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Title *</label>
                        <input
                          type="text"
                          value={step.title}
                          onChange={(e) => updateStep(idx, 'title', e.target.value)}
                          placeholder="e.g. Click Leave Requests"
                          className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-[#2c2c2c] focus:outline-none focus:ring-2 focus:ring-indigo-300"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Tooltip Text</label>
                        <input
                          type="text"
                          value={step.tooltip}
                          onChange={(e) => updateStep(idx, 'tooltip', e.target.value)}
                          placeholder="e.g. This is where you manage team leave"
                          className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-[#2c2c2c] focus:outline-none focus:ring-2 focus:ring-indigo-300"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Target Selector</label>
                        <input
                          type="text"
                          value={step.targetSelector}
                          onChange={(e) => updateStep(idx, 'targetSelector', e.target.value)}
                          placeholder="e.g. #leave-requests-btn"
                          className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-[#2c2c2c] font-mono focus:outline-none focus:ring-2 focus:ring-indigo-300"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {formError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{formError}</p>
            )}

            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {submitting ? 'Saving...' : 'Save Tour'}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setFormError(''); resetForm(); }}
                className="px-5 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tours List */}
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center text-gray-400 text-sm">
          Loading tours...
        </div>
      ) : error ? (
        <div className="bg-white rounded-xl border border-red-200 shadow-sm p-4 text-red-600 text-sm">{error}</div>
      ) : tours.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-10 text-center">
          <Map className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No tours created yet.</p>
          <p className="text-gray-400 text-xs mt-1">Click &quot;New Tour&quot; to build your first guided tour.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-100">
          {tours.map((tour) => (
            <div key={tour.id}>
              <div className="flex items-center gap-4 px-5 py-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-[#2c2c2c]">{tour.name}</span>
                    <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">{tour.targetModule}</span>
                    <span className="text-xs text-indigo-600 bg-indigo-50 rounded-full px-2 py-0.5">{tour.assignedPersona}</span>
                    <span
                      className={`text-xs rounded-full px-2 py-0.5 font-medium ${
                        tour.published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {tour.published ? 'Published' : 'Draft'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {tour.steps.length} step{tour.steps.length !== 1 ? 's' : ''} · {tour.completionCount} completion{tour.completionCount !== 1 ? 's' : ''}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => setExpandedTourId(expandedTourId === tour.id ? null : tour.id)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                    title="View steps"
                  >
                    {expandedTourId === tour.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => handleTogglePublish(tour)}
                    disabled={togglingId === tour.id}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors disabled:opacity-50 ${
                      tour.published
                        ? 'border-gray-200 text-gray-600 hover:bg-gray-50'
                        : 'border-indigo-200 text-indigo-600 hover:bg-indigo-50'
                    }`}
                  >
                    {tour.published ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    {togglingId === tour.id ? 'Updating...' : tour.published ? 'Unpublish' : 'Publish'}
                  </button>
                  <button
                    onClick={() => handleDelete(tour.id)}
                    disabled={deletingId === tour.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-red-200 text-red-600 rounded-lg text-xs font-medium hover:bg-red-50 disabled:opacity-50 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {deletingId === tour.id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>

              {expandedTourId === tour.id && (
                <div className="px-5 pb-4">
                  <div className="bg-gray-50 rounded-lg border border-gray-100 p-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Tour Steps</p>
                    <div className="space-y-2">
                      {tour.steps.map((step, idx) => (
                        <div key={idx} className="flex items-start gap-3">
                          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center mt-0.5">
                            {idx + 1}
                          </span>
                          <div>
                            <p className="text-sm font-medium text-[#2c2c2c]">{step.title}</p>
                            {step.tooltip && <p className="text-xs text-gray-500 mt-0.5">{step.tooltip}</p>}
                            {step.targetSelector && (
                              <p className="text-xs text-gray-400 font-mono mt-0.5">{step.targetSelector}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
