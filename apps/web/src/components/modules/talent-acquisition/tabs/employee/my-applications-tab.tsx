'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  FileText,
  Inbox,
  ChevronDown,
  ChevronUp,
  X,
  Clock,
  Building2,
  Calendar,
  History,
  CircleDot,
  ArrowRight,
} from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-50 text-blue-700',
  screening: 'bg-yellow-50 text-yellow-700',
  in_progress: 'bg-indigo-50 text-indigo-700',
  shortlisted: 'bg-purple-50 text-purple-700',
  offered: 'bg-green-50 text-green-700',
  hired: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-red-50 text-red-700',
  withdrawn: 'bg-gray-100 text-gray-600',
};

interface Application {
  id: string;
  jobTitle: string;
  department: string;
  appliedDate: string;
  currentStage: string;
  status: string;
  location: string;
}

interface TimelineEvent {
  id: string;
  stage: string;
  status: string;
  date: string;
  notes: string | null;
}

export default function MyApplicationsTab() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [pastApplications, setPastApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Detail / timeline
  const [expandedAppId, setExpandedAppId] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [isLoadingTimeline, setIsLoadingTimeline] = useState(false);

  // Withdraw
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const [withdrawTargetId, setWithdrawTargetId] = useState<string | null>(null);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  // Past apps toggle
  const [showPast, setShowPast] = useState(false);
  const [isLoadingPast, setIsLoadingPast] = useState(false);

  const loadApplications = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get('/talent-acquisition/employee/applications');
      setApplications(Array.isArray(res.data) ? res.data : res.data?.data || []);
    } catch {
      setError('Failed to load applications.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  const loadTimeline = async (appId: string) => {
    setIsLoadingTimeline(true);
    try {
      const res = await api.get(`/talent-acquisition/employee/applications/${appId}/timeline`);
      setTimeline(Array.isArray(res.data) ? res.data : res.data?.data || []);
    } catch {
      setTimeline([]);
    } finally {
      setIsLoadingTimeline(false);
    }
  };

  const handleExpand = async (appId: string) => {
    if (expandedAppId === appId) {
      setExpandedAppId(null);
      setTimeline([]);
      return;
    }
    setExpandedAppId(appId);
    await loadTimeline(appId);
  };

  const loadPastApplications = async () => {
    setIsLoadingPast(true);
    try {
      const res = await api.get('/talent-acquisition/employee/applications/history');
      setPastApplications(Array.isArray(res.data) ? res.data : res.data?.data || []);
      setShowPast(true);
    } catch {
      setError('Failed to load past applications.');
    } finally {
      setIsLoadingPast(false);
    }
  };

  const openWithdrawDialog = (appId: string) => {
    setWithdrawTargetId(appId);
    setShowWithdrawDialog(true);
  };

  const handleWithdraw = async () => {
    if (!withdrawTargetId) return;
    setIsWithdrawing(true);
    setError(null);
    try {
      await api.post(`/talent-acquisition/employee/applications/${withdrawTargetId}/withdraw`);
      setSuccess('Application withdrawn successfully.');
      setShowWithdrawDialog(false);
      setWithdrawTargetId(null);
      // Update local state
      setApplications((prev) =>
        prev.map((a) =>
          a.id === withdrawTargetId ? { ...a, status: 'withdrawn' } : a
        )
      );
      setTimeout(() => setSuccess(null), 4000);
    } catch {
      setError('Failed to withdraw application.');
    } finally {
      setIsWithdrawing(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatLabel = (str: string) =>
    str.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading applications...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-text flex items-center gap-2">
          <FileText className="h-5 w-5" />
          My Applications
        </h2>
        <p className="text-sm text-text-muted">Track your internal job applications.</p>
      </div>

      {/* Alerts */}
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

      {/* Active Applications */}
      {applications.length > 0 ? (
        <div className="space-y-3">
          {applications.map((app) => (
            <div key={app.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-text">{app.jobTitle}</h3>
                  <div className="flex items-center gap-3 mt-1 text-xs text-text-muted flex-wrap">
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {app.department}
                    </span>
                    {app.location && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {app.location}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Applied {formatDate(app.appliedDate)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      STATUS_COLORS[app.status] || 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {formatLabel(app.status)}
                  </span>
                </div>
              </div>

              {/* Current Stage */}
              <div className="mt-2 flex items-center gap-2 text-xs text-text-muted">
                <CircleDot className="h-3 w-3" />
                Current Stage: <span className="font-medium text-text">{formatLabel(app.currentStage)}</span>
              </div>

              {/* Actions */}
              <div className="mt-3 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleExpand(app.id)}
                  className="text-xs text-primary hover:text-primary-hover font-medium flex items-center gap-1 transition-colors"
                >
                  {expandedAppId === app.id ? (
                    <>
                      <ChevronUp className="h-3.5 w-3.5" />
                      Hide Timeline
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3.5 w-3.5" />
                      View Timeline
                    </>
                  )}
                </button>
                {app.status !== 'withdrawn' && app.status !== 'rejected' && app.status !== 'hired' && (
                  <button
                    type="button"
                    onClick={() => openWithdrawDialog(app.id)}
                    disabled={withdrawingId === app.id}
                    className="text-xs text-red-600 hover:text-red-700 font-medium flex items-center gap-1 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                    Withdraw
                  </button>
                )}
              </div>

              {/* Timeline Detail */}
              {expandedAppId === app.id && (
                <div className="mt-4 pt-4 border-t border-border">
                  {isLoadingTimeline ? (
                    <div className="flex items-center gap-2 text-sm text-text-muted py-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading timeline...
                    </div>
                  ) : timeline.length > 0 ? (
                    <div className="relative pl-6">
                      {/* Vertical line */}
                      <div className="absolute left-2 top-1 bottom-1 w-px bg-border" />
                      <div className="space-y-4">
                        {timeline.map((event, idx) => (
                          <div key={event.id} className="relative">
                            {/* Dot */}
                            <div
                              className={`absolute -left-[18px] top-0.5 w-3 h-3 rounded-full border-2 ${
                                idx === 0
                                  ? 'bg-primary border-primary'
                                  : 'bg-white border-border'
                              }`}
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-text">
                                  {formatLabel(event.stage)}
                                </span>
                                <ArrowRight className="h-3 w-3 text-text-muted" />
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                    STATUS_COLORS[event.status] || 'bg-gray-100 text-gray-600'
                                  }`}
                                >
                                  {formatLabel(event.status)}
                                </span>
                              </div>
                              <p className="text-xs text-text-muted mt-0.5">
                                {formatDate(event.date)}
                              </p>
                              {event.notes && (
                                <p className="text-xs text-text-muted mt-1 italic">{event.notes}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-text-muted">No timeline events available.</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Inbox className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm text-text-muted">You haven&apos;t applied to any internal positions yet.</p>
        </div>
      )}

      {/* Past Applications */}
      <div className="pt-2">
        {!showPast ? (
          <button
            type="button"
            onClick={loadPastApplications}
            disabled={isLoadingPast}
            className="text-sm text-primary hover:text-primary-hover font-medium flex items-center gap-1.5 transition-colors"
          >
            {isLoadingPast ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <History className="h-3.5 w-3.5" />
            )}
            View Past Applications
          </button>
        ) : pastApplications.length > 0 ? (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-text flex items-center gap-2">
              <History className="h-4 w-4 text-text-muted" />
              Past Applications
            </h3>
            <div className="border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-background border-b border-border">
                    <th className="text-left px-4 py-3 font-medium text-text-muted">Position</th>
                    <th className="text-left px-4 py-3 font-medium text-text-muted">Department</th>
                    <th className="text-left px-4 py-3 font-medium text-text-muted">Applied</th>
                    <th className="text-left px-4 py-3 font-medium text-text-muted">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pastApplications.map((app) => (
                    <tr key={app.id} className="border-b border-border last:border-0 hover:bg-background/50">
                      <td className="px-4 py-3 text-text font-medium">{app.jobTitle}</td>
                      <td className="px-4 py-3 text-text-muted">{app.department}</td>
                      <td className="px-4 py-3 text-text-muted">{formatDate(app.appliedDate)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            STATUS_COLORS[app.status] || 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {formatLabel(app.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <p className="text-sm text-text-muted">No past applications found.</p>
        )}
      </div>

      {/* Withdraw Confirmation Dialog */}
      {showWithdrawDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-lg border border-border w-full max-w-sm mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-text">Withdraw Application</h3>
              <button
                type="button"
                onClick={() => {
                  setShowWithdrawDialog(false);
                  setWithdrawTargetId(null);
                }}
                className="p-1 text-text-muted hover:text-text transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm text-text-muted mb-5">
              Are you sure you want to withdraw this application? This action cannot be undone.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleWithdraw}
                disabled={isWithdrawing}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {isWithdrawing ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                Withdraw
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowWithdrawDialog(false);
                  setWithdrawTargetId(null);
                }}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors"
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
