'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Send,
  ArrowRightLeft,
  Users,
  AlertTriangle,
} from 'lucide-react';

interface ShiftAssignment {
  employeeId: string;
  employeeName: string;
  assignments: Record<string, string>; // date string -> shift name
}

interface ShiftDefinition {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  color?: string;
}

interface SwapRequest {
  id: string;
  requesterId: string;
  requesterName: string;
  targetId: string;
  targetName: string;
  requesterShift: string;
  targetShift: string;
  date: string;
  status: 'pending' | 'approved' | 'rejected';
  comment?: string;
}

interface CoverageData {
  shiftName: string;
  required: number;
  assigned: number;
  gap: number;
}

const SHIFT_COLORS: Record<string, string> = {
  Morning: 'bg-blue-100 text-blue-800 border-blue-200',
  General: 'bg-green-100 text-green-800 border-green-200',
  Evening: 'bg-orange-100 text-orange-800 border-orange-200',
  Night: 'bg-purple-100 text-purple-800 border-purple-200',
  Off: 'bg-gray-100 text-gray-500 border-gray-200',
};

const selectClassName =
  'px-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary appearance-none text-sm';
const inputClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary text-sm';

function getWeekDates(baseDate: Date): { dates: Date[]; label: string } {
  const start = new Date(baseDate);
  const day = start.getDay();
  const diff = start.getDate() - day + (day === 0 ? -6 : 1);
  start.setDate(diff);
  start.setHours(0, 0, 0, 0);
  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push(d);
  }
  const end = dates[6];
  const label = `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
  return { dates, label };
}

function formatDateKey(d: Date): string {
  return d.toISOString().split('T')[0];
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function ShiftPlanningTab() {
  const [roster, setRoster] = useState<ShiftAssignment[]>([]);
  const [shifts, setShifts] = useState<ShiftDefinition[]>([]);
  const [swapRequests, setSwapRequests] = useState<SwapRequest[]>([]);
  const [coverage, setCoverage] = useState<CoverageData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Week navigation
  const [weekBase, setWeekBase] = useState(() => new Date());
  const { dates: weekDates, label: weekLabel } = getWeekDates(weekBase);

  // Assign shift form
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [assignEmployeeIds, setAssignEmployeeIds] = useState<string[]>([]);
  const [assignShiftId, setAssignShiftId] = useState('');
  const [assignStartDate, setAssignStartDate] = useState('');
  const [assignEndDate, setAssignEndDate] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  // Swap action
  const [processingSwapId, setProcessingSwapId] = useState<string | null>(null);
  const [swapComment, setSwapComment] = useState('');
  const [activeSwapId, setActiveSwapId] = useState<string | null>(null);

  // Publishing
  const [isPublishing, setIsPublishing] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const startDate = formatDateKey(weekDates[0]);
      const [rosterRes, swapRes, coverageRes] = await Promise.all([
        api.get('/attendance/manager/shift-planning/roster', {
          params: { weekStart: startDate },
        }).catch(() => ({ data: {} })),
        api.get('/attendance/manager/shift-planning/swap-requests').catch(() => ({ data: [] })),
        api.get('/attendance/manager/shift-planning/coverage', {
          params: { date: startDate },
        }).catch(() => ({ data: [] })),
      ]);

      const rosterData = rosterRes.data?.data || rosterRes.data || {};
      setRoster(Array.isArray(rosterData) ? rosterData : rosterData.roster || rosterData.assignments || []);
      setShifts(Array.isArray(rosterData.shifts) ? rosterData.shifts : rosterData.shiftDefinitions || []);
      const covData = coverageRes.data?.data || coverageRes.data;
      setCoverage(Array.isArray(covData) ? covData : covData?.coverage || []);
      const swapData = swapRes.data?.data || swapRes.data;
      setSwapRequests(Array.isArray(swapData) ? swapData : swapData?.requests || []);
    } catch {
      setError('Failed to load shift planning data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [weekBase]);

  const handlePrevWeek = () => {
    const newDate = new Date(weekBase);
    newDate.setDate(newDate.getDate() - 7);
    setWeekBase(newDate);
  };

  const handleNextWeek = () => {
    const newDate = new Date(weekBase);
    newDate.setDate(newDate.getDate() + 7);
    setWeekBase(newDate);
  };

  const handleAssignShift = async () => {
    if (!assignEmployeeIds.length || !assignShiftId || !assignStartDate || !assignEndDate) {
      setError('Please fill all fields for shift assignment.');
      return;
    }
    setIsAssigning(true);
    setError(null);
    try {
      await api.post('/attendance/manager/shift-planning/assign', {
        employeeIds: assignEmployeeIds,
        shiftId: assignShiftId,
        startDate: assignStartDate,
        endDate: assignEndDate,
      });
      setSuccessMessage('Shift assigned successfully.');
      setShowAssignForm(false);
      setAssignEmployeeIds([]);
      setAssignShiftId('');
      setAssignStartDate('');
      setAssignEndDate('');
      setTimeout(() => setSuccessMessage(null), 4000);
      await loadData();
    } catch {
      setError('Failed to assign shift.');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleSwapAction = async (requestId: string, action: 'approve' | 'reject') => {
    setProcessingSwapId(requestId);
    setError(null);
    try {
      await api.patch(`/attendance/manager/shift-planning/swap-requests/${requestId}`, {
        action,
        comment: swapComment.trim() || undefined,
      });
      setSwapRequests((prev) =>
        prev.map((r) =>
          r.id === requestId ? { ...r, status: action === 'approve' ? 'approved' : 'rejected' } : r
        )
      );
      setSuccessMessage(`Swap request ${action === 'approve' ? 'approved' : 'rejected'}.`);
      setActiveSwapId(null);
      setSwapComment('');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch {
      setError(`Failed to ${action} swap request.`);
    } finally {
      setProcessingSwapId(null);
    }
  };

  const handlePublishSchedule = async () => {
    setIsPublishing(true);
    setError(null);
    try {
      const startDate = formatDateKey(weekDates[0]);
      const endDate = formatDateKey(weekDates[6]);
      await api.post('/attendance/manager/shift-planning/publish', {
        startDate,
        endDate,
      });
      setSuccessMessage('Schedule published successfully. Team has been notified.');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch {
      setError('Failed to publish schedule.');
    } finally {
      setIsPublishing(false);
    }
  };

  const getShiftColor = (shiftName: string): string => {
    return SHIFT_COLORS[shiftName] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const toggleEmployeeSelection = (empId: string) => {
    setAssignEmployeeIds((prev) =>
      prev.includes(empId) ? prev.filter((id) => id !== empId) : [...prev, empId]
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading shift planning...</span>
      </div>
    );
  }

  const pendingSwaps = swapRequests.filter((r) => r.status === 'pending');

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          {successMessage}
        </div>
      )}

      {/* Week Selector + Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handlePrevWeek}
            className="p-2 rounded-lg border border-border text-text hover:bg-background transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-semibold text-text min-w-[220px] text-center">
            {weekLabel}
          </span>
          <button
            type="button"
            onClick={handleNextWeek}
            className="p-2 rounded-lg border border-border text-text hover:bg-background transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAssignForm(!showAssignForm)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors"
          >
            <Users className="h-4 w-4" />
            Assign Shift
          </button>
          <button
            type="button"
            onClick={handlePublishSchedule}
            disabled={isPublishing}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors"
          >
            {isPublishing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Publish Schedule
          </button>
        </div>
      </div>

      {/* Assign Shift Form */}
      {showAssignForm && (
        <div className="bg-background border border-border rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-text">Assign Shift</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">
                Employees (select multiple)
              </label>
              <div className="max-h-40 overflow-y-auto border border-border rounded-lg bg-background p-2 space-y-1">
                {roster.length > 0 ? (
                  roster.map((r) => (
                    <label
                      key={r.employeeId}
                      className="flex items-center gap-2 px-2 py-1 hover:bg-card rounded cursor-pointer text-sm text-text"
                    >
                      <input
                        type="checkbox"
                        checked={assignEmployeeIds.includes(r.employeeId)}
                        onChange={() => toggleEmployeeSelection(r.employeeId)}
                        className="rounded border-border text-primary focus:ring-primary"
                      />
                      {r.employeeName}
                    </label>
                  ))
                ) : (
                  <p className="text-xs text-text-muted py-2">No team members found.</p>
                )}
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Shift</label>
                <select
                  value={assignShiftId}
                  onChange={(e) => setAssignShiftId(e.target.value)}
                  className={selectClassName + ' w-full'}
                >
                  <option value="">Select shift...</option>
                  {shifts.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.startTime} - {s.endTime})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Start Date</label>
                  <input
                    type="date"
                    value={assignStartDate}
                    onChange={(e) => setAssignStartDate(e.target.value)}
                    className={inputClassName}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">End Date</label>
                  <input
                    type="date"
                    value={assignEndDate}
                    onChange={(e) => setAssignEndDate(e.target.value)}
                    className={inputClassName}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleAssignShift}
              disabled={isAssigning}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors"
            >
              {isAssigning && <Loader2 className="h-4 w-4 animate-spin" />}
              Assign
            </button>
            <button
              type="button"
              onClick={() => setShowAssignForm(false)}
              className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors"
            >
              Cancel
            </button>
            {assignEmployeeIds.length > 0 && (
              <span className="text-xs text-text-muted">
                {assignEmployeeIds.length} employee(s) selected
              </span>
            )}
          </div>
        </div>
      )}

      {/* Roster Grid */}
      <div className="border border-border rounded-xl overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="bg-background border-b border-border">
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3 sticky left-0 bg-background z-10">
                Employee
              </th>
              {weekDates.map((d, i) => (
                <th
                  key={formatDateKey(d)}
                  className="text-center text-xs font-semibold text-text-muted uppercase tracking-wider px-3 py-3 min-w-[100px]"
                >
                  <div>{DAY_NAMES[i]}</div>
                  <div className="font-normal text-[10px] mt-0.5">
                    {d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {roster.map((row) => (
              <tr key={row.employeeId} className="bg-card hover:bg-background/50 transition-colors">
                <td className="px-4 py-3 text-sm text-text font-medium sticky left-0 bg-card z-10">
                  {row.employeeName}
                </td>
                {weekDates.map((d) => {
                  const dateKey = formatDateKey(d);
                  const shiftName = row.assignments?.[dateKey] || '--';
                  return (
                    <td key={dateKey} className="px-3 py-3 text-center">
                      {shiftName !== '--' ? (
                        <span
                          className={`inline-block px-2 py-1 rounded text-xs font-medium border ${getShiftColor(shiftName)}`}
                        >
                          {shiftName}
                        </span>
                      ) : (
                        <span className="text-xs text-text-muted">--</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
            {roster.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-8 text-center text-sm text-text-muted"
                >
                  No shift assignments for this week. Use &quot;Assign Shift&quot; to create assignments.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Coverage Analysis */}
      {coverage.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-text mb-3">Coverage Analysis</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {coverage.map((c) => (
              <div
                key={c.shiftName}
                className={`rounded-lg p-3 border ${
                  c.gap > 0 ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'
                }`}
              >
                <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-1">
                  {c.shiftName}
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-bold text-text">{c.assigned}</span>
                  <span className="text-xs text-text-muted">/ {c.required} required</span>
                </div>
                {c.gap > 0 && (
                  <div className="flex items-center gap-1 mt-1">
                    <AlertTriangle className="h-3 w-3 text-red-600" />
                    <span className="text-xs text-red-700 font-medium">{c.gap} gap</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Shift Swap Requests */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <ArrowRightLeft className="h-4 w-4 text-text-muted" />
          <h3 className="text-sm font-semibold text-text">Shift Swap Requests</h3>
          {pendingSwaps.length > 0 && (
            <span className="bg-yellow-50 text-yellow-700 text-xs font-medium px-2 py-0.5 rounded-full">
              {pendingSwaps.length} pending
            </span>
          )}
        </div>

        {pendingSwaps.length === 0 ? (
          <p className="text-sm text-text-muted py-4">No pending swap requests.</p>
        ) : (
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-background border-b border-border">
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                    Requester
                  </th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                    Target
                  </th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                    Shifts
                  </th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                    Date
                  </th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pendingSwaps.map((req) => (
                  <tr key={req.id} className="bg-card">
                    <td className="px-4 py-3 text-sm text-text font-medium">
                      {req.requesterName}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {req.targetName}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      <span className="font-medium">{req.requesterShift}</span>
                      {' '}
                      <ArrowRightLeft className="h-3 w-3 inline text-text-muted" />
                      {' '}
                      <span className="font-medium">{req.targetShift}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {new Date(req.date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      {activeSwapId === req.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={swapComment}
                            onChange={(e) => setSwapComment(e.target.value)}
                            placeholder="Comment (optional)"
                            className="px-2 py-1 border border-border rounded text-xs bg-background text-text w-32"
                          />
                          <button
                            type="button"
                            onClick={() => handleSwapAction(req.id, 'approve')}
                            disabled={processingSwapId === req.id}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                          >
                            {processingSwapId === req.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-3 w-3" />
                            )}
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSwapAction(req.id, 'reject')}
                            disabled={processingSwapId === req.id}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                          >
                            <XCircle className="h-3 w-3" />
                            Reject
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveSwapId(null);
                              setSwapComment('');
                            }}
                            className="text-xs text-text-muted hover:text-text"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setActiveSwapId(req.id)}
                          className="text-xs font-medium text-primary hover:text-primary-hover"
                        >
                          Review
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
