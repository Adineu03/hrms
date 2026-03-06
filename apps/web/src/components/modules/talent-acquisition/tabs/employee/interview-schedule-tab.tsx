'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Video,
  Building2,
  Phone,
  Clock,
  Users,
  MapPin,
  ExternalLink,
  Inbox,
  X,
  Check,
  RefreshCw,
  History,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

const inputClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary';

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-blue-50 text-blue-700',
  confirmed: 'bg-green-50 text-green-700',
  completed: 'bg-purple-50 text-purple-700',
  cancelled: 'bg-red-50 text-red-700',
  no_show: 'bg-gray-100 text-gray-600',
  rescheduled: 'bg-yellow-50 text-yellow-700',
};

interface Interview {
  id: string;
  positionTitle: string;
  department: string;
  date: string;
  startTime: string;
  endTime: string;
  type: 'video' | 'in_person' | 'phone';
  location: string | null;
  videoLink: string | null;
  stageName: string;
  status: string;
  panelMembers: { id: string; name: string; role: string }[];
  checklist: { id: string; label: string; completed: boolean }[] | null;
  notes: string | null;
}

export default function InterviewScheduleTab() {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [pastInterviews, setPastInterviews] = useState<Interview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Expanded detail
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Decline dialog
  const [showDeclineDialog, setShowDeclineDialog] = useState(false);
  const [declineTargetId, setDeclineTargetId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState('');
  const [isDeclining, setIsDeclining] = useState(false);

  // Reschedule dialog
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false);
  const [rescheduleTargetId, setRescheduleTargetId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [isRescheduling, setIsRescheduling] = useState(false);

  // Accept
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  // Past toggle
  const [showPast, setShowPast] = useState(false);
  const [isLoadingPast, setIsLoadingPast] = useState(false);

  const loadInterviews = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get('/talent-acquisition/employee/interviews');
      setInterviews(Array.isArray(res.data) ? res.data : res.data?.data || []);
    } catch {
      setError('Failed to load interview schedule.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInterviews();
  }, [loadInterviews]);

  const loadPastInterviews = async () => {
    setIsLoadingPast(true);
    try {
      const res = await api.get('/talent-acquisition/employee/interviews/past');
      setPastInterviews(Array.isArray(res.data) ? res.data : res.data?.data || []);
      setShowPast(true);
    } catch {
      setError('Failed to load past interviews.');
    } finally {
      setIsLoadingPast(false);
    }
  };

  const handleAccept = async (interviewId: string) => {
    setAcceptingId(interviewId);
    setError(null);
    try {
      await api.post(`/talent-acquisition/employee/interviews/${interviewId}/accept`);
      setSuccess('Interview confirmed.');
      setInterviews((prev) =>
        prev.map((i) => (i.id === interviewId ? { ...i, status: 'confirmed' } : i))
      );
      setTimeout(() => setSuccess(null), 4000);
    } catch {
      setError('Failed to accept interview.');
    } finally {
      setAcceptingId(null);
    }
  };

  const openDeclineDialog = (interviewId: string) => {
    setDeclineTargetId(interviewId);
    setDeclineReason('');
    setShowDeclineDialog(true);
  };

  const handleDecline = async () => {
    if (!declineTargetId) return;
    setIsDeclining(true);
    setError(null);
    try {
      await api.post(`/talent-acquisition/employee/interviews/${declineTargetId}/decline`, {
        reason: declineReason.trim() || undefined,
      });
      setSuccess('Interview declined.');
      setInterviews((prev) =>
        prev.map((i) => (i.id === declineTargetId ? { ...i, status: 'cancelled' } : i))
      );
      setShowDeclineDialog(false);
      setDeclineTargetId(null);
      setTimeout(() => setSuccess(null), 4000);
    } catch {
      setError('Failed to decline interview.');
    } finally {
      setIsDeclining(false);
    }
  };

  const openRescheduleDialog = (interviewId: string) => {
    setRescheduleTargetId(interviewId);
    setRescheduleDate('');
    setRescheduleTime('');
    setRescheduleReason('');
    setShowRescheduleDialog(true);
  };

  const handleReschedule = async () => {
    if (!rescheduleTargetId) return;
    setIsRescheduling(true);
    setError(null);
    try {
      await api.post(`/talent-acquisition/employee/interviews/${rescheduleTargetId}/reschedule`, {
        preferredDate: rescheduleDate || undefined,
        preferredTime: rescheduleTime || undefined,
        reason: rescheduleReason.trim() || undefined,
      });
      setSuccess('Reschedule request sent.');
      setInterviews((prev) =>
        prev.map((i) =>
          i.id === rescheduleTargetId ? { ...i, status: 'rescheduled' } : i
        )
      );
      setShowRescheduleDialog(false);
      setRescheduleTargetId(null);
      setTimeout(() => setSuccess(null), 4000);
    } catch {
      setError('Failed to send reschedule request.');
    } finally {
      setIsRescheduling(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Video className="h-4 w-4 text-blue-600" />;
      case 'in_person':
        return <Building2 className="h-4 w-4 text-green-600" />;
      case 'phone':
        return <Phone className="h-4 w-4 text-purple-600" />;
      default:
        return <Calendar className="h-4 w-4 text-text-muted" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'video':
        return 'Video Call';
      case 'in_person':
        return 'In-Person';
      case 'phone':
        return 'Phone';
      default:
        return type;
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
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
        <span className="ml-2 text-sm text-text-muted">Loading interview schedule...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-text flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Interview Schedule
        </h2>
        <p className="text-sm text-text-muted">View upcoming interviews for internal applications.</p>
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

      {/* Upcoming Interviews */}
      {interviews.length > 0 ? (
        <div className="space-y-3">
          {interviews.map((interview) => (
            <div key={interview.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-start gap-4">
                {/* Calendar date display */}
                <div className="flex-shrink-0 w-14 h-14 bg-primary/10 rounded-lg flex flex-col items-center justify-center">
                  <span className="text-xs font-medium text-primary uppercase">
                    {new Date(interview.date).toLocaleDateString('en-US', { month: 'short' })}
                  </span>
                  <span className="text-lg font-bold text-primary leading-tight">
                    {new Date(interview.date).getDate()}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  {/* Position + Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-semibold text-text">{interview.positionTitle}</h3>
                      <p className="text-xs text-text-muted mt-0.5">{interview.department} &mdash; {interview.stageName}</p>
                    </div>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${
                        STATUS_COLORS[interview.status] || 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {formatLabel(interview.status)}
                    </span>
                  </div>

                  {/* Time + Type + Location */}
                  <div className="flex items-center gap-3 mt-2 text-xs text-text-muted flex-wrap">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {interview.startTime} - {interview.endTime}
                    </span>
                    <span className="flex items-center gap-1">
                      {getTypeIcon(interview.type)}
                      {getTypeLabel(interview.type)}
                    </span>
                    {interview.type === 'video' && interview.videoLink && (
                      <a
                        href={interview.videoLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-primary hover:text-primary-hover transition-colors"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Join Meeting
                      </a>
                    )}
                    {interview.type === 'in_person' && interview.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {interview.location}
                      </span>
                    )}
                  </div>

                  {/* Panel Members */}
                  {interview.panelMembers?.length > 0 && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-text-muted">
                      <Users className="h-3 w-3" />
                      <span>
                        {interview.panelMembers.map((m) => m.name).join(', ')}
                      </span>
                    </div>
                  )}

                  {/* Expand Details */}
                  <button
                    type="button"
                    onClick={() => setExpandedId(expandedId === interview.id ? null : interview.id)}
                    className="mt-2 text-xs text-primary hover:text-primary-hover font-medium flex items-center gap-1 transition-colors"
                  >
                    {expandedId === interview.id ? (
                      <>
                        <ChevronUp className="h-3.5 w-3.5" />
                        Hide Details
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-3.5 w-3.5" />
                        View Details
                      </>
                    )}
                  </button>

                  {/* Expanded Detail */}
                  {expandedId === interview.id && (
                    <div className="mt-3 pt-3 border-t border-border space-y-3">
                      {/* Panel members with roles */}
                      {interview.panelMembers?.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-text uppercase tracking-wider mb-1">Interview Panel</h4>
                          <div className="space-y-1">
                            {interview.panelMembers.map((m) => (
                              <div key={m.id} className="flex items-center gap-2 text-sm">
                                <span className="text-text font-medium">{m.name}</span>
                                <span className="text-xs text-text-muted">({m.role})</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Checklist */}
                      {interview.checklist && interview.checklist.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-text uppercase tracking-wider mb-1">Preparation Checklist</h4>
                          <div className="space-y-1.5">
                            {interview.checklist.map((item) => (
                              <label key={item.id} className="flex items-center gap-2 text-sm text-text cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={item.completed}
                                  readOnly
                                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                                />
                                <span className={item.completed ? 'line-through text-text-muted' : ''}>
                                  {item.label}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}

                      {interview.notes && (
                        <div>
                          <h4 className="text-xs font-semibold text-text uppercase tracking-wider mb-1">Notes</h4>
                          <p className="text-sm text-text-muted">{interview.notes}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  {(interview.status === 'scheduled' || interview.status === 'confirmed') && (
                    <div className="mt-3 flex items-center gap-2">
                      {interview.status === 'scheduled' && (
                        <button
                          type="button"
                          onClick={() => handleAccept(interview.id)}
                          disabled={acceptingId === interview.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors"
                        >
                          {acceptingId === interview.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Check className="h-3 w-3" />
                          )}
                          Accept
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => openDeclineDialog(interview.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
                      >
                        <X className="h-3 w-3" />
                        Decline
                      </button>
                      <button
                        type="button"
                        onClick={() => openRescheduleDialog(interview.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border text-text hover:bg-background transition-colors"
                      >
                        <RefreshCw className="h-3 w-3" />
                        Reschedule
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Inbox className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm text-text-muted">No upcoming interviews scheduled.</p>
        </div>
      )}

      {/* Past Interviews */}
      <div className="pt-2">
        {!showPast ? (
          <button
            type="button"
            onClick={loadPastInterviews}
            disabled={isLoadingPast}
            className="text-sm text-primary hover:text-primary-hover font-medium flex items-center gap-1.5 transition-colors"
          >
            {isLoadingPast ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <History className="h-3.5 w-3.5" />
            )}
            View Past Interviews
          </button>
        ) : pastInterviews.length > 0 ? (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-text flex items-center gap-2">
              <History className="h-4 w-4 text-text-muted" />
              Past Interviews
            </h3>
            <div className="border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-background border-b border-border">
                    <th className="text-left px-4 py-3 font-medium text-text-muted">Position</th>
                    <th className="text-left px-4 py-3 font-medium text-text-muted">Date</th>
                    <th className="text-left px-4 py-3 font-medium text-text-muted">Type</th>
                    <th className="text-left px-4 py-3 font-medium text-text-muted">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pastInterviews.map((iv) => (
                    <tr key={iv.id} className="border-b border-border last:border-0 hover:bg-background/50">
                      <td className="px-4 py-3 text-text font-medium">{iv.positionTitle}</td>
                      <td className="px-4 py-3 text-text-muted">{formatDate(iv.date)}</td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1 text-text-muted">
                          {getTypeIcon(iv.type)}
                          {getTypeLabel(iv.type)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            STATUS_COLORS[iv.status] || 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {formatLabel(iv.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <p className="text-sm text-text-muted">No past interviews found.</p>
        )}
      </div>

      {/* Decline Dialog */}
      {showDeclineDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-lg border border-border w-full max-w-sm mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-text">Decline Interview</h3>
              <button
                type="button"
                onClick={() => {
                  setShowDeclineDialog(false);
                  setDeclineTargetId(null);
                }}
                className="p-1 text-text-muted hover:text-text transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm text-text-muted mb-3">
              Please provide a reason for declining this interview.
            </p>
            <textarea
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="Reason for declining..."
              rows={3}
              className={`${inputClassName} resize-none mb-4`}
            />
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleDecline}
                disabled={isDeclining}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {isDeclining ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                Decline
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDeclineDialog(false);
                  setDeclineTargetId(null);
                }}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Dialog */}
      {showRescheduleDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-lg border border-border w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-text">Request Reschedule</h3>
              <button
                type="button"
                onClick={() => {
                  setShowRescheduleDialog(false);
                  setRescheduleTargetId(null);
                }}
                className="p-1 text-text-muted hover:text-text transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3 mb-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Preferred Date</label>
                  <input
                    type="date"
                    value={rescheduleDate}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                    className={inputClassName}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Preferred Time</label>
                  <input
                    type="time"
                    value={rescheduleTime}
                    onChange={(e) => setRescheduleTime(e.target.value)}
                    className={inputClassName}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Reason</label>
                <textarea
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  placeholder="Why do you need to reschedule?"
                  rows={3}
                  className={`${inputClassName} resize-none`}
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleReschedule}
                disabled={isRescheduling}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {isRescheduling ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Send Request
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowRescheduleDialog(false);
                  setRescheduleTargetId(null);
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
