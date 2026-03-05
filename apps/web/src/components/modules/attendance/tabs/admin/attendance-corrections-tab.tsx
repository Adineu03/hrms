'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  Pencil,
  Check,
  X,
  Lock,
  ClipboardCheck,
  CheckCircle,
  XCircle,
  Search,
} from 'lucide-react';

const inputClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary';
const selectClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary appearance-none';

interface AttendanceRecord {
  id: string;
  employeeName: string;
  employeeId: string;
  date: string;
  clockIn: string | null;
  clockOut: string | null;
  status: string;
  workHours: number | null;
  remarks: string | null;
  isLocked: boolean;
}

interface RegularizationRequest {
  id: string;
  employeeName: string;
  date: string;
  originalClockIn: string | null;
  originalClockOut: string | null;
  requestedClockIn: string;
  requestedClockOut: string;
  reason: string;
  status: string;
}

interface EditData {
  clockIn: string;
  clockOut: string;
  status: string;
  remarks: string;
}

const STATUS_STYLES: Record<string, string> = {
  present: 'bg-green-50 text-green-700',
  absent: 'bg-red-50 text-red-700',
  half_day: 'bg-yellow-50 text-yellow-700',
  on_leave: 'bg-blue-50 text-blue-700',
  wfh: 'bg-purple-50 text-purple-700',
  holiday: 'bg-gray-100 text-gray-600',
  weekend: 'bg-gray-100 text-gray-600',
  pending: 'bg-yellow-50 text-yellow-700',
  approved: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-700',
};

const ATTENDANCE_STATUSES = [
  { value: 'present', label: 'Present' },
  { value: 'absent', label: 'Absent' },
  { value: 'half_day', label: 'Half Day' },
  { value: 'on_leave', label: 'On Leave' },
  { value: 'wfh', label: 'WFH' },
];

export default function AttendanceCorrectionsTab() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [regularizations, setRegularizations] = useState<RegularizationRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [filterDate, setFilterDate] = useState('');
  const [filterEmployeeId, setFilterEmployeeId] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Inline edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<EditData>({
    clockIn: '',
    clockOut: '',
    status: '',
    remarks: '',
  });

  // Lock modal
  const [showLockModal, setShowLockModal] = useState(false);
  const [lockMonth, setLockMonth] = useState(new Date().getMonth() + 1);
  const [lockYear, setLockYear] = useState(new Date().getFullYear());

  useEffect(() => {
    loadData();
  }, [page]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: 20 };
      if (filterDate) params.date = filterDate;
      if (filterEmployeeId) params.employeeId = filterEmployeeId;
      if (filterStatus) params.status = filterStatus;

      const [recordsRes, regRes] = await Promise.all([
        api.get('/attendance/admin/corrections', { params }),
        api.get('/attendance/admin/corrections/regularizations'),
      ]);

      const recordsData = recordsRes.data?.data || recordsRes.data;
      setRecords(Array.isArray(recordsData) ? recordsData : []);
      setTotalPages(recordsRes.data?.totalPages || 1);
      setRegularizations(
        Array.isArray(regRes.data) ? regRes.data : regRes.data?.data || [],
      );
    } catch {
      setError('Failed to load attendance data.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    loadData();
  };

  const startEdit = (record: AttendanceRecord) => {
    if (record.isLocked) {
      setError('This record is locked and cannot be edited.');
      return;
    }
    setEditingId(record.id);
    setEditData({
      clockIn: record.clockIn || '',
      clockOut: record.clockOut || '',
      status: record.status,
      remarks: record.remarks || '',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({ clockIn: '', clockOut: '', status: '', remarks: '' });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setError(null);
    setIsSaving(true);
    try {
      await api.patch(`/attendance/admin/corrections/${editingId}`, editData);
      await loadData();
      cancelEdit();
      setSuccessMsg('Record updated successfully.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch {
      setError('Failed to update attendance record.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRegularization = async (id: string, action: 'approved' | 'rejected') => {
    setError(null);
    setIsSaving(true);
    try {
      await api.patch(`/attendance/admin/corrections/regularizations/${id}`, {
        status: action,
      });
      await loadData();
      setSuccessMsg(`Regularization request ${action}.`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch {
      setError(`Failed to ${action === 'approved' ? 'approve' : 'reject'} regularization.`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLockRecords = async () => {
    setError(null);
    setIsSaving(true);
    try {
      await api.post('/attendance/admin/corrections/lock', {
        month: lockMonth,
        year: lockYear,
      });
      setShowLockModal(false);
      await loadData();
      setSuccessMsg(`Records locked for ${lockMonth}/${lockYear}.`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch {
      setError('Failed to lock records.');
    } finally {
      setIsSaving(false);
    }
  };

  const pendingRegularizations = regularizations.filter((r) => r.status === 'pending');

  if (isLoading && records.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading attendance records...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            Attendance Corrections
          </h2>
          <p className="text-sm text-text-muted">
            Review, correct, and lock attendance records.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowLockModal(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover transition-colors"
        >
          <Lock className="h-3.5 w-3.5" />
          Lock Records
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <Check className="h-4 w-4 flex-shrink-0" />
          {successMsg}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">Date</label>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className={`${inputClassName} w-40 text-sm`}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">Employee ID</label>
          <input
            type="text"
            value={filterEmployeeId}
            onChange={(e) => setFilterEmployeeId(e.target.value)}
            placeholder="Employee ID"
            className={`${inputClassName} w-40 text-sm`}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">Status</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className={`${selectClassName} w-36 text-sm`}
          >
            <option value="">All Statuses</option>
            {ATTENDANCE_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={handleSearch}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover transition-colors"
        >
          <Search className="h-3.5 w-3.5" />
          Search
        </button>
      </div>

      {/* Records Table */}
      <div className="border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-background border-b border-border">
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                Employee
              </th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                Date
              </th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                Clock In
              </th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                Clock Out
              </th>
              <th className="text-right text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                Hours
              </th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                Status
              </th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                Remarks
              </th>
              <th className="text-right text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3 w-24">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {records.map((record) => (
              <tr
                key={record.id}
                className={`bg-card hover:bg-background/50 transition-colors ${
                  record.isLocked ? 'opacity-60' : ''
                }`}
              >
                {editingId === record.id ? (
                  <>
                    <td className="px-4 py-3 text-sm text-text font-medium">
                      {record.employeeName}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {new Date(record.date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="time"
                        value={editData.clockIn}
                        onChange={(e) => setEditData({ ...editData, clockIn: e.target.value })}
                        className={`${inputClassName} text-sm w-28`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="time"
                        value={editData.clockOut}
                        onChange={(e) => setEditData({ ...editData, clockOut: e.target.value })}
                        className={`${inputClassName} text-sm w-28`}
                      />
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted text-right">
                      {record.workHours != null ? `${record.workHours.toFixed(1)}` : '--'}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={editData.status}
                        onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                        className={`${selectClassName} text-sm w-28`}
                      >
                        {ATTENDANCE_STATUSES.map((s) => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={editData.remarks}
                        onChange={(e) => setEditData({ ...editData, remarks: e.target.value })}
                        placeholder="Remarks"
                        className={`${inputClassName} text-sm w-32`}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={saveEdit}
                          disabled={isSaving}
                          className="p-1.5 rounded-lg text-text-muted hover:text-green-600 hover:bg-green-50 transition-colors disabled:opacity-50"
                          title="Save"
                        >
                          {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="p-1.5 rounded-lg text-text-muted hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Cancel"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3 text-sm text-text font-medium">
                      <div className="flex items-center gap-1.5">
                        {record.isLocked && <Lock className="h-3 w-3 text-text-muted" />}
                        {record.employeeName}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {new Date(record.date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {record.clockIn || '--'}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {record.clockOut || '--'}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted text-right">
                      {record.workHours != null ? `${record.workHours.toFixed(1)}` : '--'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          STATUS_STYLES[record.status] || 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {record.status?.replace('_', ' ') || '--'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted max-w-[150px] truncate" title={record.remarks || ''}>
                      {record.remarks || '--'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => startEdit(record)}
                        disabled={record.isLocked}
                        className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-background transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title={record.isLocked ? 'Record locked' : 'Edit'}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))}

            {records.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-8 text-center text-sm text-text-muted"
                >
                  No attendance records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-text-muted">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {/* Pending Regularization Requests */}
      {pendingRegularizations.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-text flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4" />
            Pending Regularization Requests ({pendingRegularizations.length})
          </h3>
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-background border-b border-border">
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                    Employee
                  </th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                    Date
                  </th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                    Original In/Out
                  </th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                    Requested In/Out
                  </th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                    Reason
                  </th>
                  <th className="text-right text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3 w-24">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pendingRegularizations.map((req) => (
                  <tr
                    key={req.id}
                    className="bg-card hover:bg-background/50 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-text font-medium">
                      {req.employeeName}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {new Date(req.date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {req.originalClockIn || '--'} / {req.originalClockOut || '--'}
                    </td>
                    <td className="px-4 py-3 text-sm text-text font-medium">
                      {req.requestedClockIn} / {req.requestedClockOut}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted max-w-[200px] truncate" title={req.reason}>
                      {req.reason}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleRegularization(req.id, 'approved')}
                          disabled={isSaving}
                          className="p-1.5 rounded-lg text-text-muted hover:text-green-600 hover:bg-green-50 transition-colors disabled:opacity-50"
                          title="Approve"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRegularization(req.id, 'rejected')}
                          disabled={isSaving}
                          className="p-1.5 rounded-lg text-text-muted hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                          title="Reject"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Lock Records Modal */}
      {showLockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-card border border-border rounded-xl shadow-lg p-6 w-full max-w-sm mx-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-text flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Lock Attendance Records
              </h3>
              <button
                type="button"
                onClick={() => setShowLockModal(false)}
                className="p-1 rounded-lg text-text-muted hover:text-text hover:bg-background transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm text-text-muted">
              Lock records for payroll cutoff. Locked records cannot be edited.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Month</label>
                <select
                  value={lockMonth}
                  onChange={(e) => setLockMonth(parseInt(e.target.value))}
                  className={`${selectClassName} text-sm`}
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {new Date(2000, i).toLocaleString('default', { month: 'long' })}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Year</label>
                <input
                  type="number"
                  value={lockYear}
                  onChange={(e) => setLockYear(parseInt(e.target.value) || new Date().getFullYear())}
                  className={`${inputClassName} text-sm`}
                />
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleLockRecords}
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover transition-colors disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                Lock Records
              </button>
              <button
                type="button"
                onClick={() => setShowLockModal(false)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors"
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
