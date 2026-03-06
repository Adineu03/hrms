'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  Plus,
  X,
  Briefcase,
  CheckCircle2,
  Clock,
  Users,
  Eye,
  DollarSign,
  Inbox,
} from 'lucide-react';

interface Requisition {
  id: string;
  title: string;
  department: string;
  departmentId: string;
  headcount: number;
  filledCount: number;
  employmentType: string;
  salaryRange: string;
  priority: string;
  status: string;
  description: string;
  requirements: string;
  pipeline: PipelineStage[];
  createdAt: string;
}

interface PipelineStage {
  stage: string;
  count: number;
}

interface BudgetInfo {
  totalBudget: number;
  utilized: number;
  remaining: number;
  utilizationPercent: number;
}

interface PipelineDetail {
  requisitionId: string;
  stages: { stage: string; count: number; candidates: { id: string; name: string; score: number }[] }[];
}

const inputClassName = 'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary';
const selectClassName = 'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary appearance-none';

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-50 text-gray-700',
  pending_approval: 'bg-yellow-50 text-yellow-700',
  open: 'bg-blue-50 text-blue-700',
  in_progress: 'bg-indigo-50 text-indigo-700',
  filled: 'bg-green-50 text-green-700',
  cancelled: 'bg-red-50 text-red-700',
  on_hold: 'bg-orange-50 text-orange-700',
};

const PRIORITY_STYLES: Record<string, string> = {
  low: 'bg-gray-50 text-gray-600',
  medium: 'bg-blue-50 text-blue-600',
  high: 'bg-orange-50 text-orange-600',
  urgent: 'bg-red-50 text-red-600',
};

export default function MyRequisitionsTab() {
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [budget, setBudget] = useState<BudgetInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pipelineDetail, setPipelineDetail] = useState<PipelineDetail | null>(null);
  const [viewingPipeline, setViewingPipeline] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: '',
    departmentId: '',
    headcount: 1,
    employmentType: 'full_time',
    salaryRange: '',
    description: '',
    requirements: '',
    priority: 'medium',
  });

  const loadData = useCallback(async () => {
    setError(null);
    try {
      const [reqRes, budgetRes] = await Promise.all([
        api.get('/talent-acquisition/manager/requisitions'),
        api.get('/talent-acquisition/manager/requisitions/budget'),
      ]);
      setRequisitions(Array.isArray(reqRes.data) ? reqRes.data : reqRes.data?.data || []);
      setBudget(budgetRes.data?.data || budgetRes.data || null);
    } catch {
      setError('Failed to load requisitions.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.departmentId.trim()) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await api.post('/talent-acquisition/manager/requisitions', {
        ...form,
        headcount: Number(form.headcount),
      });
      const newReq = res.data?.data || res.data;
      setRequisitions((prev) => [newReq, ...prev]);
      setSuccess('Requisition created successfully.');
      setShowCreateForm(false);
      setForm({ title: '', departmentId: '', headcount: 1, employmentType: 'full_time', salaryRange: '', description: '', requirements: '', priority: 'medium' });
      setTimeout(() => setSuccess(null), 4000);
    } catch {
      setError('Failed to create requisition.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const viewPipeline = async (reqId: string) => {
    setViewingPipeline(reqId);
    try {
      const res = await api.get(`/talent-acquisition/manager/requisitions/${reqId}/pipeline`);
      setPipelineDetail(res.data?.data || res.data);
    } catch {
      setError('Failed to load pipeline details.');
      setViewingPipeline(null);
    }
  };

  const totalReqs = requisitions.length;
  const pendingApproval = requisitions.filter((r) => r.status === 'pending_approval').length;
  const openReqs = requisitions.filter((r) => r.status === 'open' || r.status === 'in_progress').length;
  const filledReqs = requisitions.filter((r) => r.status === 'filled').length;

  const formatStatus = (s: string) => s.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading requisitions...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center gap-2 mb-1">
            <Briefcase className="h-4 w-4 text-blue-600" />
            <span className="text-xs font-medium text-blue-700 uppercase tracking-wider">Total</span>
          </div>
          <p className="text-2xl font-bold text-blue-700">{totalReqs}</p>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-4 w-4 text-yellow-600" />
            <span className="text-xs font-medium text-yellow-700 uppercase tracking-wider">Pending Approval</span>
          </div>
          <p className="text-2xl font-bold text-yellow-700">{pendingApproval}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <div className="flex items-center gap-2 mb-1">
            <Users className="h-4 w-4 text-green-600" />
            <span className="text-xs font-medium text-green-700 uppercase tracking-wider">Open</span>
          </div>
          <p className="text-2xl font-bold text-green-700">{openReqs}</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="h-4 w-4 text-purple-600" />
            <span className="text-xs font-medium text-purple-700 uppercase tracking-wider">Filled</span>
          </div>
          <p className="text-2xl font-bold text-purple-700">{filledReqs}</p>
        </div>
      </div>

      {/* Budget Utilization */}
      {budget && (
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="h-4 w-4 text-text-muted" />
            <h3 className="text-sm font-semibold text-text">Budget Utilization</h3>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-3">
            <div>
              <p className="text-xs text-text-muted">Total Budget</p>
              <p className="text-lg font-bold text-text">${budget.totalBudget.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Utilized</p>
              <p className="text-lg font-bold text-blue-600">${budget.utilized.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Remaining</p>
              <p className="text-lg font-bold text-green-600">${budget.remaining.toLocaleString()}</p>
            </div>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${budget.utilizationPercent >= 90 ? 'bg-red-500' : budget.utilizationPercent >= 70 ? 'bg-yellow-500' : 'bg-blue-500'}`}
              style={{ width: `${Math.min(100, budget.utilizationPercent)}%` }}
            />
          </div>
          <p className="text-xs text-text-muted mt-1">{budget.utilizationPercent.toFixed(1)}% utilized</p>
        </div>
      )}

      {/* Actions Bar */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text">My Requisitions</h3>
        <button
          type="button"
          onClick={() => setShowCreateForm(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover transition-colors"
        >
          <Plus className="h-4 w-4" />
          Create Requisition
        </button>
      </div>

      {/* Requisitions Table */}
      <div className="border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-background border-b border-border">
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Title</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Department</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Headcount</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Status</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Filled</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Pipeline</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {requisitions.map((req) => {
              const totalPipeline = req.pipeline?.reduce((sum, s) => sum + s.count, 0) || 0;
              const maxPipeline = Math.max(totalPipeline, 1);
              return (
                <tr key={req.id} className="bg-card hover:bg-background/50 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-text">{req.title}</p>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium mt-1 ${PRIORITY_STYLES[req.priority] || 'bg-gray-50 text-gray-600'}`}>
                        {req.priority.charAt(0).toUpperCase() + req.priority.slice(1)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-muted">{req.department}</td>
                  <td className="px-4 py-3 text-sm text-text font-medium">{req.headcount}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[req.status] || 'bg-gray-50 text-gray-700'}`}>
                      {formatStatus(req.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-text font-medium">{req.filledCount}/{req.headcount}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden max-w-[100px]">
                        {req.pipeline?.map((stage, i) => (
                          <div
                            key={stage.stage}
                            className={`h-full inline-block ${i === 0 ? 'bg-blue-400' : i === 1 ? 'bg-indigo-400' : i === 2 ? 'bg-purple-400' : 'bg-green-400'}`}
                            style={{ width: `${(stage.count / maxPipeline) * 100}%` }}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-text-muted">{totalPipeline}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => viewPipeline(req.id)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                    >
                      <Eye className="h-3 w-3" />
                      View
                    </button>
                  </td>
                </tr>
              );
            })}
            {requisitions.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center">
                  <Inbox className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm text-text-muted">No requisitions found. Create one to start hiring.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create Requisition Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-card border border-border rounded-xl shadow-lg p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text">Create Requisition</h3>
              <button type="button" onClick={() => setShowCreateForm(false)} className="text-text-muted hover:text-text">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Job Title *</label>
                <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputClassName} placeholder="e.g. Senior Software Engineer" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Department ID *</label>
                  <input type="text" value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })} className={inputClassName} placeholder="Department ID" required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Headcount *</label>
                  <input type="number" min={1} value={form.headcount} onChange={(e) => setForm({ ...form, headcount: Number(e.target.value) })} className={inputClassName} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Employment Type</label>
                  <select value={form.employmentType} onChange={(e) => setForm({ ...form, employmentType: e.target.value })} className={selectClassName}>
                    <option value="full_time">Full Time</option>
                    <option value="part_time">Part Time</option>
                    <option value="contract">Contract</option>
                    <option value="intern">Intern</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Priority</label>
                  <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className={selectClassName}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Salary Range</label>
                <input type="text" value={form.salaryRange} onChange={(e) => setForm({ ...form, salaryRange: e.target.value })} className={inputClassName} placeholder="e.g. $80,000 - $120,000" />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className={inputClassName} placeholder="Job description..." />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Requirements</label>
                <textarea value={form.requirements} onChange={(e) => setForm({ ...form, requirements: e.target.value })} rows={3} className={inputClassName} placeholder="Key requirements..." />
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors">
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Create Requisition
                </button>
                <button type="button" onClick={() => setShowCreateForm(false)} className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pipeline Detail Modal */}
      {viewingPipeline && pipelineDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-card border border-border rounded-xl shadow-lg p-6 w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text">Pipeline Detail</h3>
              <button type="button" onClick={() => { setViewingPipeline(null); setPipelineDetail(null); }} className="text-text-muted hover:text-text">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3">
              {pipelineDetail.stages?.map((stage) => (
                <div key={stage.stage} className="bg-background rounded-lg p-3 border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-text">{stage.stage}</span>
                    <span className="text-xs font-medium text-text-muted bg-white px-2 py-0.5 rounded-full">{stage.count} candidates</span>
                  </div>
                  {stage.candidates?.length > 0 ? (
                    <div className="space-y-1">
                      {stage.candidates.map((c) => (
                        <div key={c.id} className="flex items-center justify-between text-xs text-text-muted">
                          <span>{c.name}</span>
                          <span className="font-medium">Score: {c.score}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-text-muted">No candidates in this stage.</p>
                  )}
                </div>
              ))}
              {(!pipelineDetail.stages || pipelineDetail.stages.length === 0) && (
                <p className="text-sm text-text-muted text-center py-4">No pipeline data available.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
