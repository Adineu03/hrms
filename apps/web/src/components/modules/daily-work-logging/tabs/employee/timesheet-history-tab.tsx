'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  History,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  XCircle,
  Inbox,
  Clock,
  DollarSign,
} from 'lucide-react';

const inputClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary';
const selectClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary appearance-none';

interface SubmissionEntry {
  id: string;
  date: string;
  project: string;
  taskCategory: string;
  hours: number;
  description: string;
  billable: boolean;
}

interface ApprovalStep {
  level: number;
  approver: string;
  action: string;
  comment: string;
  timestamp: string;
}

interface Submission {
  id: string;
  period: string;
  totalHours: number;
  billableHours: number;
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'withdrawn';
  submittedAt: string;
  entries: SubmissionEntry[];
  approvalChain: ApprovalStep[];
}

interface SummaryStats {
  totalSubmissions: number;
  totalHoursLogged: number;
  totalBillableHours: number;
  approvalRate: number;
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-blue-50 text-blue-700',
  pending: 'bg-yellow-50 text-yellow-700',
  approved: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-700',
  withdrawn: 'bg-gray-100 text-gray-600',
};

export default function TimesheetHistoryTab() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [summary, setSummary] = useState<SummaryStats>({
    totalSubmissions: 0,
    totalHoursLogged: 0,
    totalBillableHours: 0,
    approvalRate: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Filters
  const [filterStatus, setFilterStatus] = useState('');
  const [filterFromDate, setFilterFromDate] = useState('');
  const [filterToDate, setFilterToDate] = useState('');
  const [filterProject, setFilterProject] = useState('');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.append('status', filterStatus);
      if (filterFromDate) params.append('fromDate', filterFromDate);
      if (filterToDate) params.append('toDate', filterToDate);
      if (filterProject) params.append('project', filterProject);

      const [histRes, sumRes] = await Promise.all([
        api.get(`/daily-work-logging/employee/history?${params.toString()}`),
        api.get('/daily-work-logging/employee/history/summary'),
      ]);
      setSubmissions(Array.isArray(histRes.data) ? histRes.data : histRes.data?.data || []);
      const sumData = sumRes.data?.data || sumRes.data;
      if (sumData) {
        setSummary({
          totalSubmissions: sumData.totalSubmissions || 0,
          totalHoursLogged: sumData.totalHoursLogged || 0,
          totalBillableHours: sumData.totalBillableHours || 0,
          approvalRate: sumData.approvalRate || 0,
        });
      }
    } catch {
      setError('Failed to load history.');
    } finally {
      setIsLoading(false);
    }
  }, [filterStatus, filterFromDate, filterToDate, filterProject]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleResubmit = async (id: string) => {
    setProcessingId(id);
    setError(null);
    try {
      await api.patch(`/daily-work-logging/employee/history/${id}/resubmit`);
      setSubmissions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status: 'pending' as const } : s))
      );
      setSuccess('Timesheet resubmitted.');
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to resubmit.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleWithdraw = async (id: string) => {
    setProcessingId(id);
    setError(null);
    try {
      await api.patch(`/daily-work-logging/employee/history/${id}/withdraw`);
      setSubmissions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status: 'withdrawn' as const } : s))
      );
      setSuccess('Timesheet withdrawn.');
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to withdraw.');
    } finally {
      setProcessingId(null);
    }
  };

  const loadDetail = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    // Check if we already have entries loaded
    const sub = submissions.find((s) => s.id === id);
    if (sub && sub.entries && sub.entries.length > 0) return;

    try {
      const res = await api.get(`/daily-work-logging/employee/history/${id}`);
      const data = res.data?.data || res.data;
      if (data) {
        setSubmissions((prev) =>
          prev.map((s) =>
            s.id === id
              ? { ...s, entries: data.entries || [], approvalChain: data.approvalChain || [] }
              : s
          )
        );
      }
    } catch {
      // Silently fail
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading history...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-text flex items-center gap-2">
          <History className="h-5 w-5" />
          Timesheet History
        </h2>
        <p className="text-sm text-text-muted">View past submissions, approval status, and resubmit rejected timesheets.</p>
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

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center gap-2 mb-1">
            <History className="h-4 w-4 text-blue-600" />
            <span className="text-xs font-medium text-blue-700 uppercase tracking-wider">Submissions</span>
          </div>
          <p className="text-2xl font-bold text-blue-700">{summary.totalSubmissions}</p>
        </div>
        <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-4 w-4 text-indigo-600" />
            <span className="text-xs font-medium text-indigo-700 uppercase tracking-wider">Total Hours</span>
          </div>
          <p className="text-2xl font-bold text-indigo-700">{summary.totalHoursLogged.toFixed(1)}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="h-4 w-4 text-green-600" />
            <span className="text-xs font-medium text-green-700 uppercase tracking-wider">Billable</span>
          </div>
          <p className="text-2xl font-bold text-green-700">{summary.totalBillableHours.toFixed(1)}</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="h-4 w-4 text-purple-600" />
            <span className="text-xs font-medium text-purple-700 uppercase tracking-wider">Approval Rate</span>
          </div>
          <p className="text-2xl font-bold text-purple-700">{summary.approvalRate.toFixed(0)}%</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">Status</label>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={`${selectClassName} w-36`}>
            <option value="">All</option>
            <option value="draft">Draft</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="withdrawn">Withdrawn</option>
          </select>
        </div>
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
      </div>

      {/* Submissions Table */}
      <div className="border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-background border-b border-border">
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Period</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Total Hours</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Billable</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Status</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Submitted</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Actions</th>
              <th className="px-4 py-3 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {submissions.map((sub) => (
              <>
                <tr key={sub.id} className="bg-card hover:bg-background/50 transition-colors">
                  <td className="px-4 py-3 text-sm text-text font-medium">{sub.period}</td>
                  <td className="px-4 py-3 text-sm text-text">{sub.totalHours.toFixed(1)}</td>
                  <td className="px-4 py-3 text-sm text-green-700">{sub.billableHours.toFixed(1)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[sub.status]}`}>
                      {sub.status.charAt(0).toUpperCase() + sub.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-text-muted">{new Date(sub.submittedAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {sub.status === 'rejected' && (
                        <button
                          type="button"
                          onClick={() => handleResubmit(sub.id)}
                          disabled={processingId === sub.id}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50"
                        >
                          {processingId === sub.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                          Resubmit
                        </button>
                      )}
                      {sub.status === 'pending' && (
                        <button
                          type="button"
                          onClick={() => handleWithdraw(sub.id)}
                          disabled={processingId === sub.id}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-gray-500 text-white hover:bg-gray-600 disabled:opacity-50"
                        >
                          {processingId === sub.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
                          Withdraw
                        </button>
                      )}
                      {sub.status !== 'rejected' && sub.status !== 'pending' && (
                        <span className="text-xs text-text-muted">--</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => loadDetail(sub.id)}
                      className="text-text-muted hover:text-primary transition-colors"
                    >
                      {expandedId === sub.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </td>
                </tr>
                {expandedId === sub.id && (
                  <tr key={`${sub.id}-detail`} className="bg-background/30">
                    <td colSpan={7} className="px-8 py-4">
                      {/* Entries */}
                      {sub.entries && sub.entries.length > 0 && (
                        <div className="mb-4">
                          <p className="text-xs font-semibold text-text mb-2">Entries</p>
                          <div className="border border-border rounded-lg overflow-hidden">
                            <table className="w-full">
                              <thead>
                                <tr className="bg-background border-b border-border">
                                  <th className="text-left text-[10px] font-semibold text-text-muted uppercase px-3 py-2">Date</th>
                                  <th className="text-left text-[10px] font-semibold text-text-muted uppercase px-3 py-2">Project</th>
                                  <th className="text-left text-[10px] font-semibold text-text-muted uppercase px-3 py-2">Category</th>
                                  <th className="text-left text-[10px] font-semibold text-text-muted uppercase px-3 py-2">Hours</th>
                                  <th className="text-left text-[10px] font-semibold text-text-muted uppercase px-3 py-2">Billable</th>
                                  <th className="text-left text-[10px] font-semibold text-text-muted uppercase px-3 py-2">Description</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border">
                                {sub.entries.map((e) => (
                                  <tr key={e.id} className="bg-card">
                                    <td className="px-3 py-1.5 text-xs text-text-muted">{new Date(e.date).toLocaleDateString()}</td>
                                    <td className="px-3 py-1.5 text-xs text-text font-medium">{e.project}</td>
                                    <td className="px-3 py-1.5 text-xs text-text-muted">{e.taskCategory}</td>
                                    <td className="px-3 py-1.5 text-xs text-text font-medium">{e.hours.toFixed(1)}</td>
                                    <td className="px-3 py-1.5 text-xs text-text-muted">{e.billable ? 'Yes' : 'No'}</td>
                                    <td className="px-3 py-1.5 text-xs text-text-muted truncate max-w-[200px]">{e.description}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                      {/* Approval Chain */}
                      {sub.approvalChain && sub.approvalChain.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-text mb-2">Approval Chain</p>
                          <div className="space-y-2">
                            {sub.approvalChain.map((step, i) => (
                              <div key={i} className="flex items-center gap-3 text-xs bg-card rounded-lg px-3 py-2 border border-border">
                                <span className="font-bold text-primary bg-primary/10 rounded-full w-5 h-5 flex items-center justify-center text-[10px]">
                                  {step.level}
                                </span>
                                <span className="text-text font-medium">{step.approver}</span>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                  step.action === 'approved' ? 'bg-green-50 text-green-700' :
                                  step.action === 'rejected' ? 'bg-red-50 text-red-700' :
                                  'bg-yellow-50 text-yellow-700'
                                }`}>
                                  {step.action}
                                </span>
                                {step.comment && (
                                  <span className="text-text-muted italic">&quot;{step.comment}&quot;</span>
                                )}
                                <span className="text-text-muted ml-auto">{new Date(step.timestamp).toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {(!sub.entries || sub.entries.length === 0) && (!sub.approvalChain || sub.approvalChain.length === 0) && (
                        <p className="text-xs text-text-muted">No detail data available.</p>
                      )}
                    </td>
                  </tr>
                )}
              </>
            ))}
            {submissions.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center">
                  <Inbox className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm text-text-muted">No submission history found.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
