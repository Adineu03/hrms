'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  Edit3,
  Lock,
  Unlock,
  FileText,
  Inbox,
  Search,
} from 'lucide-react';

const inputClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary';
const selectClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary appearance-none';

interface AuditEntry {
  id: string;
  timestamp: string;
  performedBy: string;
  action: string;
  targetEmployee: string;
  details: string;
  oldValue: string;
  newValue: string;
}

interface DisputeEntry {
  id: string;
  employeeName: string;
  submissionDate: string;
  disputeReason: string;
  status: 'open' | 'resolved' | 'escalated';
  createdAt: string;
}

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-yellow-50 text-yellow-700',
  resolved: 'bg-green-50 text-green-700',
  escalated: 'bg-red-50 text-red-700',
};

export default function TimesheetCorrectionsTab() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Override form
  const [overrideSubmissionId, setOverrideSubmissionId] = useState('');
  const [overrideHours, setOverrideHours] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [isOverriding, setIsOverriding] = useState(false);

  // Lock period
  const [lockFromDate, setLockFromDate] = useState('');
  const [lockToDate, setLockToDate] = useState('');
  const [isLocking, setIsLocking] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);

  // Audit trail
  const [auditTrail, setAuditTrail] = useState<AuditEntry[]>([]);
  const [auditSearch, setAuditSearch] = useState('');

  // Disputes
  const [disputes, setDisputes] = useState<DisputeEntry[]>([]);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [auditRes, disputeRes] = await Promise.all([
        api.get('/daily-work-logging/admin/corrections/audit-trail').catch(() => ({ data: [] })),
        api.get('/daily-work-logging/admin/corrections/disputes').catch(() => ({ data: [] })),
      ]);
      setAuditTrail(Array.isArray(auditRes.data) ? auditRes.data : auditRes.data?.data || []);
      setDisputes(Array.isArray(disputeRes.data) ? disputeRes.data : disputeRes.data?.data || []);
    } catch {
      setError('Failed to load corrections data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOverride = async () => {
    if (!overrideSubmissionId.trim() || !overrideReason.trim()) {
      setError('Submission ID and reason are required.');
      return;
    }
    setError(null);
    setSuccess(null);
    setIsOverriding(true);
    try {
      await api.post('/daily-work-logging/admin/corrections/override', {
        submissionId: overrideSubmissionId.trim(),
        hours: parseFloat(overrideHours) || undefined,
        reason: overrideReason.trim(),
      });
      setSuccess('Override applied successfully.');
      setOverrideSubmissionId('');
      setOverrideHours('');
      setOverrideReason('');
      await loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to apply override.');
    } finally {
      setIsOverriding(false);
    }
  };

  const handleLockPeriod = async () => {
    if (!lockFromDate || !lockToDate) {
      setError('Both from and to dates are required.');
      return;
    }
    setError(null);
    setSuccess(null);
    setIsLocking(true);
    try {
      await api.post('/daily-work-logging/admin/corrections/lock-period', {
        fromDate: lockFromDate,
        toDate: lockToDate,
        action: 'lock',
      });
      setSuccess('Period locked successfully.');
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to lock period.');
    } finally {
      setIsLocking(false);
    }
  };

  const handleUnlockPeriod = async () => {
    if (!lockFromDate || !lockToDate) {
      setError('Both from and to dates are required.');
      return;
    }
    setError(null);
    setSuccess(null);
    setIsUnlocking(true);
    try {
      await api.post('/daily-work-logging/admin/corrections/lock-period', {
        fromDate: lockFromDate,
        toDate: lockToDate,
        action: 'unlock',
      });
      setSuccess('Period unlocked successfully.');
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to unlock period.');
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleResolveDispute = async (id: string) => {
    setResolvingId(id);
    setError(null);
    try {
      await api.patch(`/daily-work-logging/admin/corrections/disputes/${id}/resolve`);
      setDisputes((prev) =>
        prev.map((d) => (d.id === id ? { ...d, status: 'resolved' as const } : d))
      );
      setSuccess('Dispute resolved.');
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to resolve dispute.');
    } finally {
      setResolvingId(null);
    }
  };

  const filteredAudit = auditSearch
    ? auditTrail.filter(
        (a) =>
          a.performedBy.toLowerCase().includes(auditSearch.toLowerCase()) ||
          a.targetEmployee.toLowerCase().includes(auditSearch.toLowerCase()) ||
          a.action.toLowerCase().includes(auditSearch.toLowerCase())
      )
    : auditTrail;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading corrections...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text flex items-center gap-2">
          <Edit3 className="h-5 w-5" />
          Timesheet Corrections
        </h2>
        <p className="text-sm text-text-muted">Override submissions, lock/unlock periods, view audit trail, and resolve disputes.</p>
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

      {/* Admin Override Form */}
      <div className="bg-card border border-border rounded-lg p-4 space-y-3">
        <h3 className="text-sm font-semibold text-text">Admin Override</h3>
        <p className="text-xs text-text-muted">Manually adjust a timesheet submission. All changes are logged in the audit trail.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Submission ID</label>
            <input
              type="text"
              value={overrideSubmissionId}
              onChange={(e) => setOverrideSubmissionId(e.target.value)}
              className={inputClassName}
              placeholder="Enter submission ID"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Corrected Hours (optional)</label>
            <input
              type="number"
              value={overrideHours}
              onChange={(e) => setOverrideHours(e.target.value)}
              min={0}
              step={0.25}
              className={inputClassName}
              placeholder="e.g. 8.0"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Reason *</label>
            <input
              type="text"
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              className={inputClassName}
              placeholder="Reason for override"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={handleOverride}
          disabled={isOverriding}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors"
        >
          {isOverriding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Edit3 className="h-4 w-4" />}
          Apply Override
        </button>
      </div>

      {/* Lock/Unlock Period */}
      <div className="bg-card border border-border rounded-lg p-4 space-y-3">
        <h3 className="text-sm font-semibold text-text">Lock / Unlock Period</h3>
        <p className="text-xs text-text-muted">Lock a date range to prevent employees from editing timesheets in that period.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">From Date</label>
            <input
              type="date"
              value={lockFromDate}
              onChange={(e) => setLockFromDate(e.target.value)}
              className={inputClassName}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">To Date</label>
            <input
              type="date"
              value={lockToDate}
              onChange={(e) => setLockToDate(e.target.value)}
              min={lockFromDate}
              className={inputClassName}
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleLockPeriod}
            disabled={isLocking}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {isLocking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
            Lock Period
          </button>
          <button
            type="button"
            onClick={handleUnlockPeriod}
            disabled={isUnlocking}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {isUnlocking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unlock className="h-4 w-4" />}
            Unlock Period
          </button>
        </div>
      </div>

      {/* Audit Trail */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-text flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Audit Trail
          </h3>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <input
              type="text"
              value={auditSearch}
              onChange={(e) => setAuditSearch(e.target.value)}
              className={`${inputClassName} pl-9`}
              placeholder="Search audit trail..."
            />
          </div>
        </div>
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-background border-b border-border">
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Timestamp</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Performed By</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Action</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Target Employee</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Details</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Old Value</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">New Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredAudit.map((entry) => (
                <tr key={entry.id} className="bg-card hover:bg-background/50 transition-colors">
                  <td className="px-4 py-3 text-xs text-text-muted whitespace-nowrap">
                    {new Date(entry.timestamp).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-text font-medium">{entry.performedBy}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                      {entry.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-muted">{entry.targetEmployee}</td>
                  <td className="px-4 py-3 text-xs text-text-muted max-w-[200px] truncate" title={entry.details}>
                    {entry.details}
                  </td>
                  <td className="px-4 py-3 text-xs text-red-600">{entry.oldValue || '--'}</td>
                  <td className="px-4 py-3 text-xs text-green-600">{entry.newValue || '--'}</td>
                </tr>
              ))}
              {filteredAudit.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center">
                    <Inbox className="h-10 w-10 mx-auto mb-3 opacity-40" />
                    <p className="text-sm text-text-muted">No audit trail entries found.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dispute Resolution Queue */}
      <div>
        <h3 className="text-sm font-semibold text-text mb-3">Dispute Resolution Queue</h3>
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-background border-b border-border">
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Employee</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Submission Date</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Dispute Reason</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Status</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Created</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {disputes.map((dispute) => (
                <tr key={dispute.id} className="bg-card hover:bg-background/50 transition-colors">
                  <td className="px-4 py-3 text-sm text-text font-medium">{dispute.employeeName}</td>
                  <td className="px-4 py-3 text-sm text-text-muted">{new Date(dispute.submissionDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-sm text-text-muted max-w-[200px] truncate" title={dispute.disputeReason}>
                    {dispute.disputeReason}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[dispute.status]}`}>
                      {dispute.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-text-muted">{new Date(dispute.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    {dispute.status === 'open' && (
                      <button
                        type="button"
                        onClick={() => handleResolveDispute(dispute.id)}
                        disabled={resolvingId === dispute.id}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        {resolvingId === dispute.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-3 w-3" />
                        )}
                        Resolve
                      </button>
                    )}
                    {dispute.status !== 'open' && (
                      <span className="text-xs text-text-muted">--</span>
                    )}
                  </td>
                </tr>
              ))}
              {disputes.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center">
                    <Inbox className="h-10 w-10 mx-auto mb-3 opacity-40" />
                    <p className="text-sm text-text-muted">No disputes in queue.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
