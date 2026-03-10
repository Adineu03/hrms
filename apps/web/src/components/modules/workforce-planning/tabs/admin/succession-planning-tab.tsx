'use client';
import { useState, useEffect } from 'react';
import { Loader2, Plus, X, Star, CheckCircle, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '@/lib/api';

interface SuccessionCandidate {
  id: string;
  candidateEmployeeId: string;
  readinessLevel: 'ready_now' | '1yr' | '2yr';
  flightRisk: 'high' | 'medium' | 'low';
}

interface SuccessionPlan {
  id: string;
  positionTitle: string;
  departmentId: string;
  criticalityLevel: 'critical' | 'high' | 'medium';
  benchStrength: 'strong' | 'adequate' | 'weak' | 'none';
  coveragePercent: number;
  status: string;
  notes?: string;
  candidates?: SuccessionCandidate[];
}

const criticalityColors: Record<string, string> = {
  critical: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-yellow-100 text-yellow-700',
};

const benchStrengthColors: Record<string, string> = {
  strong: 'bg-green-100 text-green-700',
  adequate: 'bg-blue-100 text-blue-700',
  weak: 'bg-orange-100 text-orange-700',
  none: 'bg-red-100 text-red-700',
};

const readinessLabels: Record<string, string> = {
  ready_now: 'Ready Now',
  '1yr': '1 Year',
  '2yr': '2 Years',
};

const flightRiskColors: Record<string, string> = {
  high: 'text-red-600',
  medium: 'text-orange-500',
  low: 'text-green-600',
};

export default function SuccessionPlanningTab() {
  const [plans, setPlans] = useState<SuccessionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  const [candidateForms, setCandidateForms] = useState<Record<string, { candidateEmployeeId: string; readinessLevel: string; flightRisk: string }>>({});

  const [form, setForm] = useState({
    positionTitle: '',
    criticalityLevel: 'critical' as 'critical' | 'high' | 'medium',
    notes: '',
  });

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const res = await api.get('/workforce-planning/admin/succession-planning');
      setPlans(res.data?.data || res.data || []);
    } catch {
      setError('Failed to load succession plans');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!form.positionTitle) return;
    try {
      setSubmitting(true);
      await api.post('/workforce-planning/admin/succession-planning', form);
      setForm({ positionTitle: '', criticalityLevel: 'critical', notes: '' });
      setShowForm(false);
      setSuccessMsg('Succession plan created successfully');
      fetchPlans();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch {
      setError('Failed to create succession plan');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddCandidate = async (planId: string) => {
    const cf = candidateForms[planId];
    if (!cf?.candidateEmployeeId) return;
    try {
      await api.post(`/workforce-planning/admin/succession-planning/${planId}/candidates`, cf);
      setCandidateForms((prev) => ({ ...prev, [planId]: { candidateEmployeeId: '', readinessLevel: 'ready_now', flightRisk: 'low' } }));
      fetchPlans();
      setSuccessMsg('Candidate added');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch {
      setError('Failed to add candidate');
    }
  };

  const initCandidateForm = (planId: string) => {
    if (!candidateForms[planId]) {
      setCandidateForms((prev) => ({ ...prev, [planId]: { candidateEmployeeId: '', readinessLevel: 'ready_now', flightRisk: 'low' } }));
    }
    setExpandedPlan(expandedPlan === planId ? null : planId);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        <span className="ml-2 text-gray-500">Loading succession plans...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {successMsg && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg p-3 text-green-700 text-sm">
          <CheckCircle className="w-4 h-4" />
          {successMsg}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
          <button onClick={() => setError('')} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[#2c2c2c]">Succession Plans</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Position
          </button>
        </div>

        {showForm && (
          <div className="mb-6 p-4 border border-indigo-100 bg-indigo-50 rounded-lg">
            <h3 className="text-sm font-semibold text-[#2c2c2c] mb-3">New Succession Position</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Position Title *</label>
                <input
                  type="text"
                  value={form.positionTitle}
                  onChange={(e) => setForm({ ...form, positionTitle: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-[#2c2c2c] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., VP Engineering"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Criticality Level</label>
                <select
                  value={form.criticalityLevel}
                  onChange={(e) => setForm({ ...form, criticalityLevel: e.target.value as 'critical' | 'high' | 'medium' })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-[#2c2c2c] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-[#2c2c2c] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Optional notes..."
                />
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleCreate}
                disabled={submitting}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Create Plan
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {plans.length === 0 ? (
          <div className="text-center py-12">
            <Star className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No succession plans found. Add a critical position.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {plans.map((plan) => {
              const isExpanded = expandedPlan === plan.id;
              const cf = candidateForms[plan.id] || { candidateEmployeeId: '', readinessLevel: 'ready_now', flightRisk: 'low' };
              return (
                <div key={plan.id} className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between p-4 hover:bg-gray-50">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-medium text-[#2c2c2c] text-sm">{plan.positionTitle}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${criticalityColors[plan.criticalityLevel] || 'bg-gray-100 text-gray-700'}`}>
                        {plan.criticalityLevel}
                      </span>
                      {plan.benchStrength && (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${benchStrengthColors[plan.benchStrength] || 'bg-gray-100 text-gray-700'}`}>
                          {plan.benchStrength} bench
                        </span>
                      )}
                      {plan.coveragePercent != null && (
                        <span className="text-xs text-gray-500">{plan.coveragePercent}% coverage</span>
                      )}
                    </div>
                    <button
                      onClick={() => initCandidateForm(plan.id)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors"
                    >
                      View Candidates
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-gray-100 p-4 bg-gray-50">
                      {plan.candidates && plan.candidates.length > 0 && (
                        <div className="mb-4">
                          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Candidates</h4>
                          <div className="space-y-1">
                            {plan.candidates.map((c) => (
                              <div key={c.id} className="flex items-center gap-3 text-sm bg-white rounded p-2 border border-gray-100">
                                <span className="font-medium text-[#2c2c2c] font-mono text-xs">{c.candidateEmployeeId}</span>
                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                  {readinessLabels[c.readinessLevel] || c.readinessLevel}
                                </span>
                                <span className={`text-xs font-medium ${flightRiskColors[c.flightRisk]}`}>
                                  {c.flightRisk} flight risk
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Add Candidate</h4>
                      <div className="flex flex-wrap gap-2 items-end">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Employee ID</label>
                          <input
                            type="text"
                            value={cf.candidateEmployeeId}
                            onChange={(e) => setCandidateForms((prev) => ({ ...prev, [plan.id]: { ...cf, candidateEmployeeId: e.target.value } }))}
                            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-[#2c2c2c] focus:outline-none focus:ring-2 focus:ring-indigo-500 w-36"
                            placeholder="EMP-001"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Readiness</label>
                          <select
                            value={cf.readinessLevel}
                            onChange={(e) => setCandidateForms((prev) => ({ ...prev, [plan.id]: { ...cf, readinessLevel: e.target.value } }))}
                            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-[#2c2c2c] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="ready_now">Ready Now</option>
                            <option value="1yr">1 Year</option>
                            <option value="2yr">2 Years</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Flight Risk</label>
                          <select
                            value={cf.flightRisk}
                            onChange={(e) => setCandidateForms((prev) => ({ ...prev, [plan.id]: { ...cf, flightRisk: e.target.value } }))}
                            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-[#2c2c2c] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="high">High</option>
                            <option value="medium">Medium</option>
                            <option value="low">Low</option>
                          </select>
                        </div>
                        <button
                          onClick={() => handleAddCandidate(plan.id)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                          Add
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
