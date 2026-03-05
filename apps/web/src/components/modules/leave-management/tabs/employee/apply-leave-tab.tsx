'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  PlusCircle,
  Send,
  Save,
  X,
  CheckCircle2,
  Upload,
  Users,
  Wallet,
  FileText,
} from 'lucide-react';

const inputClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary';
const selectClassName = inputClassName + ' appearance-none';

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-blue-50 text-blue-700',
  pending: 'bg-yellow-50 text-yellow-700',
  approved: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-700',
  cancelled: 'bg-gray-100 text-gray-600',
};

interface LeaveType {
  id: string;
  name: string;
  color: string;
  maxDays: number;
}

interface BalanceCheck {
  leaveTypeId: string;
  leaveTypeName: string;
  entitled: number;
  used: number;
  pending: number;
  available: number;
}

interface TeamConflict {
  employeeId: string;
  employeeName: string;
  leaveType: string;
  fromDate: string;
  toDate: string;
  status: string;
}

interface LeaveRequest {
  id: string;
  leaveTypeName: string;
  fromDate: string;
  toDate: string;
  days: number;
  status: string;
  reason: string;
  isHalfDay: boolean;
  halfDayType: string | null;
  createdAt: string;
}

export default function ApplyLeaveTab() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Leave types from balance data
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);

  // Form state
  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [halfDayType, setHalfDayType] = useState<'first_half' | 'second_half'>('first_half');
  const [reason, setReason] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);

  // Balance check
  const [balanceInfo, setBalanceInfo] = useState<BalanceCheck | null>(null);
  const [isCheckingBalance, setIsCheckingBalance] = useState(false);

  // Team conflicts
  const [teamConflicts, setTeamConflicts] = useState<TeamConflict[]>([]);
  const [isCheckingConflicts, setIsCheckingConflicts] = useState(false);

  // Pending / draft requests
  const [pendingRequests, setPendingRequests] = useState<LeaveRequest[]>([]);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const currentYear = new Date().getFullYear();

  const loadData = useCallback(async () => {
    try {
      const [balRes, reqRes] = await Promise.all([
        api.get('/leave-management/employee/balance'),
        api.get('/leave-management/employee/history?status=pending,draft&page=1&limit=50'),
      ]);

      const balances = Array.isArray(balRes.data) ? balRes.data : balRes.data?.data || [];
      const types: LeaveType[] = balances.map((b: Record<string, unknown>) => ({
        id: b.leaveTypeId as string,
        name: b.leaveTypeName as string,
        color: (b.color as string) || '#4F46E5',
        maxDays: (b.available as number) || 0,
      }));
      setLeaveTypes(types);

      const requests = Array.isArray(reqRes.data) ? reqRes.data : reqRes.data?.data || [];
      setPendingRequests(requests);
    } catch {
      setError('Failed to load leave data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Check balance when leave type changes
  useEffect(() => {
    if (!leaveTypeId) {
      setBalanceInfo(null);
      return;
    }
    const checkBalance = async () => {
      setIsCheckingBalance(true);
      try {
        const res = await api.get(
          `/leave-management/employee/apply/check-balance?leaveTypeId=${leaveTypeId}&year=${currentYear}`
        );
        setBalanceInfo(res.data);
      } catch {
        setBalanceInfo(null);
      } finally {
        setIsCheckingBalance(false);
      }
    };
    checkBalance();
  }, [leaveTypeId, currentYear]);

  // Check team conflicts when dates change
  useEffect(() => {
    if (!fromDate || !toDate) {
      setTeamConflicts([]);
      return;
    }
    const checkConflicts = async () => {
      setIsCheckingConflicts(true);
      try {
        const res = await api.get(
          `/leave-management/employee/apply/team-conflicts?fromDate=${fromDate}&toDate=${toDate}`
        );
        const conflicts = Array.isArray(res.data) ? res.data : res.data?.data || [];
        setTeamConflicts(conflicts);
      } catch {
        setTeamConflicts([]);
      } finally {
        setIsCheckingConflicts(false);
      }
    };
    checkConflicts();
  }, [fromDate, toDate]);

  const resetForm = () => {
    setLeaveTypeId('');
    setFromDate('');
    setToDate('');
    setIsHalfDay(false);
    setHalfDayType('first_half');
    setReason('');
    setAttachment(null);
    setBalanceInfo(null);
    setTeamConflicts([]);
  };

  const handleSubmit = async (asDraft: boolean) => {
    setError(null);
    setSuccess(null);

    if (!leaveTypeId) {
      setError('Please select a leave type.');
      return;
    }
    if (!fromDate) {
      setError('Please select a from date.');
      return;
    }
    if (!toDate) {
      setError('Please select a to date.');
      return;
    }
    if (new Date(toDate) < new Date(fromDate)) {
      setError('To date cannot be before from date.');
      return;
    }
    if (!asDraft && !reason.trim()) {
      setError('Please provide a reason for your leave.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        leaveTypeId,
        fromDate,
        toDate,
        isHalfDay,
        halfDayType: isHalfDay ? halfDayType : null,
        reason: reason.trim(),
      };

      const endpoint = asDraft
        ? '/leave-management/employee/apply/draft'
        : '/leave-management/employee/apply';

      await api.post(endpoint, payload);
      setSuccess(asDraft ? 'Leave request saved as draft.' : 'Leave request submitted successfully.');
      resetForm();
      await loadData();
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? ((err as { response?: { data?: { message?: string } } }).response?.data?.message ??
            'Failed to submit leave request.')
          : 'Failed to submit leave request.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async (requestId: string) => {
    setCancellingId(requestId);
    setError(null);
    try {
      await api.patch(`/leave-management/employee/apply/${requestId}/cancel`);
      setSuccess('Leave request cancelled.');
      await loadData();
    } catch {
      setError('Failed to cancel leave request.');
    } finally {
      setCancellingId(null);
    }
  };

  const calculateDays = (): number => {
    if (!fromDate || !toDate) return 0;
    if (isHalfDay) return 0.5;
    const start = new Date(fromDate);
    const end = new Date(toDate);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(0, diffDays);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Messages */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          {success}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Apply Leave Form */}
      <div className="space-y-5">
        <div className="flex items-center gap-2 mb-2">
          <PlusCircle className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-text">Apply for Leave</h2>
        </div>

        {/* Leave Type Selector */}
        <div>
          <label className="block text-sm font-medium text-text mb-1.5">Leave Type</label>
          <select
            value={leaveTypeId}
            onChange={(e) => setLeaveTypeId(e.target.value)}
            className={selectClassName}
          >
            <option value="">Select leave type</option>
            {leaveTypes.map((lt) => (
              <option key={lt.id} value={lt.id}>
                {lt.name}
              </option>
            ))}
          </select>
        </div>

        {/* Balance Check Display */}
        {leaveTypeId && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            {isCheckingBalance ? (
              <div className="flex items-center gap-2 text-sm text-blue-700">
                <Loader2 className="h-4 w-4 animate-spin" />
                Checking balance...
              </div>
            ) : balanceInfo ? (
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">
                    {balanceInfo.leaveTypeName}
                  </span>
                </div>
                <div className="flex gap-4 text-sm text-blue-700">
                  <span>
                    Entitled: <strong>{balanceInfo.entitled}</strong>
                  </span>
                  <span>
                    Used: <strong>{balanceInfo.used}</strong>
                  </span>
                  <span>
                    Pending: <strong>{balanceInfo.pending}</strong>
                  </span>
                  <span className="text-blue-900 font-semibold">
                    Available: {balanceInfo.available}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-blue-700">Balance information unavailable.</p>
            )}
          </div>
        )}

        {/* Date Pickers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text mb-1.5">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                if (!toDate || e.target.value > toDate) {
                  setToDate(e.target.value);
                }
              }}
              className={inputClassName}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-1.5">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              min={fromDate}
              className={inputClassName}
            />
          </div>
        </div>

        {/* Day Count */}
        {fromDate && toDate && (
          <div className="text-sm text-text-muted">
            Duration: <strong className="text-text">{calculateDays()} day{calculateDays() !== 1 ? 's' : ''}</strong>
          </div>
        )}

        {/* Half Day Toggle */}
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isHalfDay}
              onChange={(e) => setIsHalfDay(e.target.checked)}
              className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
            />
            <span className="text-sm font-medium text-text">Half Day Leave</span>
          </label>

          {isHalfDay && (
            <div className="flex gap-4 ml-7">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="halfDayType"
                  value="first_half"
                  checked={halfDayType === 'first_half'}
                  onChange={() => setHalfDayType('first_half')}
                  className="w-4 h-4 text-primary focus:ring-primary"
                />
                <span className="text-sm text-text">First Half</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="halfDayType"
                  value="second_half"
                  checked={halfDayType === 'second_half'}
                  onChange={() => setHalfDayType('second_half')}
                  className="w-4 h-4 text-primary focus:ring-primary"
                />
                <span className="text-sm text-text">Second Half</span>
              </label>
            </div>
          )}
        </div>

        {/* Reason */}
        <div>
          <label className="block text-sm font-medium text-text mb-1.5">Reason</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Provide a reason for your leave request..."
            rows={3}
            className={inputClassName + ' resize-none'}
          />
        </div>

        {/* Attachment */}
        <div>
          <label className="block text-sm font-medium text-text mb-1.5">
            Attachment <span className="text-text-muted font-normal">(optional)</span>
          </label>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm text-text-muted hover:border-primary hover:text-text cursor-pointer transition-colors">
              <Upload className="h-4 w-4" />
              {attachment ? attachment.name : 'Choose File'}
              <input
                type="file"
                className="hidden"
                onChange={(e) => setAttachment(e.target.files?.[0] || null)}
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              />
            </label>
            {attachment && (
              <button
                type="button"
                onClick={() => setAttachment(null)}
                className="text-text-muted hover:text-red-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Team Conflicts */}
        {fromDate && toDate && (
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-4 w-4 text-text-muted" />
              <h3 className="text-sm font-medium text-text">Team Availability</h3>
            </div>
            {isCheckingConflicts ? (
              <div className="flex items-center gap-2 text-sm text-text-muted">
                <Loader2 className="h-4 w-4 animate-spin" />
                Checking team availability...
              </div>
            ) : teamConflicts.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs text-yellow-700 bg-yellow-50 rounded px-2 py-1 inline-block">
                  {teamConflicts.length} team member{teamConflicts.length > 1 ? 's' : ''} on leave during these dates
                </p>
                <div className="space-y-1.5">
                  {teamConflicts.map((c) => (
                    <div
                      key={c.employeeId}
                      className="flex items-center justify-between text-sm py-1.5 border-b border-border last:border-0"
                    >
                      <span className="text-text font-medium">{c.employeeName}</span>
                      <div className="flex items-center gap-3 text-text-muted text-xs">
                        <span>{c.leaveType}</span>
                        <span>
                          {new Date(c.fromDate).toLocaleDateString()} -{' '}
                          {new Date(c.toDate).toLocaleDateString()}
                        </span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            STATUS_STYLES[c.status] || 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {c.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-green-700">No team conflicts for the selected dates.</p>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => handleSubmit(true)}
            disabled={isSubmitting}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium border border-border text-text hover:bg-background disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save as Draft
          </button>
          <button
            type="button"
            onClick={() => handleSubmit(false)}
            disabled={isSubmitting}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Submit
          </button>
        </div>
      </div>

      {/* Pending / Draft Requests */}
      {pendingRequests.length > 0 && (
        <div className="border-t border-border pt-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="h-5 w-5 text-text-muted" />
            <h2 className="text-lg font-semibold text-text">Pending &amp; Draft Requests</h2>
          </div>

          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-background border-b border-border">
                  <th className="text-left px-4 py-3 font-medium text-text-muted">Leave Type</th>
                  <th className="text-left px-4 py-3 font-medium text-text-muted">From</th>
                  <th className="text-left px-4 py-3 font-medium text-text-muted">To</th>
                  <th className="text-left px-4 py-3 font-medium text-text-muted">Days</th>
                  <th className="text-left px-4 py-3 font-medium text-text-muted">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-text-muted">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingRequests.map((req) => (
                  <tr key={req.id} className="border-b border-border last:border-0 hover:bg-background/50">
                    <td className="px-4 py-3 text-text font-medium">{req.leaveTypeName}</td>
                    <td className="px-4 py-3 text-text-muted">
                      {new Date(req.fromDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-text-muted">
                      {new Date(req.toDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-text">
                      {req.days}
                      {req.isHalfDay && (
                        <span className="text-xs text-text-muted ml-1">
                          ({req.halfDayType === 'first_half' ? '1st' : '2nd'})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          STATUS_STYLES[req.status] || 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {req.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => handleCancel(req.id)}
                        disabled={cancellingId === req.id}
                        className="text-red-600 hover:text-red-700 text-xs font-medium disabled:opacity-50 flex items-center gap-1"
                      >
                        {cancellingId === req.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <X className="h-3 w-3" />
                        )}
                        Cancel
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State for No Leave Types */}
      {leaveTypes.length === 0 && (
        <div className="text-center py-8">
          <PlusCircle className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm text-text-muted">
            No leave types configured. Contact your administrator.
          </p>
        </div>
      )}
    </div>
  );
}
