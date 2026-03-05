'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  Gift,
  Check,
  Save,
  CheckCircle,
  XCircle,
  X,
} from 'lucide-react';

const inputClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary';
const selectClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary appearance-none';

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700',
  approved: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-700',
  expired: 'bg-red-50 text-red-700',
  used: 'bg-blue-50 text-blue-700',
  cancelled: 'bg-gray-100 text-gray-600',
};

interface CompoffRules {
  earningRuleWeekday: number;
  earningRuleWeekend: number;
  earningRuleHoliday: number;
  expiryDays: number;
  minHoursForFullDay: number;
  minHoursForHalfDay: number;
  requireApproval: boolean;
  maxAccumulation: number;
}

interface CompoffRecord {
  id: string;
  employeeName: string;
  department: string;
  workDate: string;
  workType: string;
  hoursWorked: number;
  daysEarned: number;
  status: string;
  expiryDate: string | null;
  usedDate: string | null;
  approverComment: string | null;
}

const defaultRules: CompoffRules = {
  earningRuleWeekday: 1,
  earningRuleWeekend: 1,
  earningRuleHoliday: 1,
  expiryDays: 90,
  minHoursForFullDay: 8,
  minHoursForHalfDay: 4,
  requireApproval: true,
  maxAccumulation: 10,
};

export default function CompoffRulesTab() {
  const [rules, setRules] = useState<CompoffRules>(defaultRules);
  const [records, setRecords] = useState<CompoffRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Filters for records
  const [filterStatus, setFilterStatus] = useState('');
  const [filterEmployee, setFilterEmployee] = useState('');

  // Action modal
  const [actionModal, setActionModal] = useState<{
    id: string;
    action: 'approved' | 'rejected';
  } | null>(null);
  const [actionComment, setActionComment] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [rulesRes, recordsRes] = await Promise.all([
        api.get('/leave-management/admin/compoff/rules'),
        api.get('/leave-management/admin/compoff/records'),
      ]);

      const rulesData = rulesRes.data?.data || rulesRes.data;
      if (rulesData) {
        setRules({ ...defaultRules, ...rulesData });
      }

      setRecords(
        Array.isArray(recordsRes.data) ? recordsRes.data : recordsRes.data?.data || [],
      );
    } catch {
      setError('Failed to load comp-off data.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveRules = async () => {
    setError(null);
    setSuccessMsg(null);
    setIsSaving(true);
    try {
      await api.post('/leave-management/admin/compoff/rules', rules);
      setSuccessMsg('Comp-off rules saved successfully.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch {
      setError('Failed to save comp-off rules.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAction = async () => {
    if (!actionModal) return;
    setError(null);
    setIsSaving(true);
    try {
      await api.patch(`/leave-management/admin/compoff/records/${actionModal.id}`, {
        status: actionModal.action,
        comment: actionComment.trim() || null,
      });
      setActionModal(null);
      setActionComment('');
      await loadData();
    } catch {
      setError(`Failed to ${actionModal.action === 'approved' ? 'approve' : 'reject'} comp-off request.`);
    } finally {
      setIsSaving(false);
    }
  };

  const renderToggle = (
    checked: boolean,
    onChange: (val: boolean) => void,
    label: string,
  ) => (
    <label className="flex items-center gap-2 cursor-pointer">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-9 h-5 rounded-full transition-colors ${
          checked ? 'bg-primary' : 'bg-gray-300'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
            checked ? 'translate-x-4' : ''
          }`}
        />
      </button>
      <span className="text-sm text-text">{label}</span>
    </label>
  );

  const filteredRecords = records.filter((r) => {
    const matchesStatus = !filterStatus || r.status === filterStatus;
    const matchesEmployee = !filterEmployee ||
      r.employeeName.toLowerCase().includes(filterEmployee.toLowerCase());
    return matchesStatus && matchesEmployee;
  });

  const pendingCount = records.filter((r) => r.status === 'pending').length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading comp-off data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-text flex items-center gap-2">
          <Gift className="h-5 w-5" />
          Comp-Off Rules &amp; Records
        </h2>
        <p className="text-sm text-text-muted">
          Configure compensatory off rules and manage comp-off requests.
        </p>
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

      {/* Section 1: Comp-Off Rules Configuration */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-text">Rules Configuration</h3>

        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <h4 className="text-sm font-semibold text-text">Earning Rules</h4>
          <p className="text-xs text-text-muted">Define how many comp-off days are earned for different work types.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Weekday Extra Work (days)</label>
              <input
                type="number"
                value={rules.earningRuleWeekday}
                onChange={(e) => setRules({ ...rules, earningRuleWeekday: parseFloat(e.target.value) || 0 })}
                step={0.5}
                min={0}
                className={`${inputClassName} text-sm`}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Weekend Work (days)</label>
              <input
                type="number"
                value={rules.earningRuleWeekend}
                onChange={(e) => setRules({ ...rules, earningRuleWeekend: parseFloat(e.target.value) || 0 })}
                step={0.5}
                min={0}
                className={`${inputClassName} text-sm`}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Holiday Work (days)</label>
              <input
                type="number"
                value={rules.earningRuleHoliday}
                onChange={(e) => setRules({ ...rules, earningRuleHoliday: parseFloat(e.target.value) || 0 })}
                step={0.5}
                min={0}
                className={`${inputClassName} text-sm`}
              />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <h4 className="text-sm font-semibold text-text">Work Hour Thresholds</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Min Hours for Full Day Comp-Off</label>
              <input
                type="number"
                value={rules.minHoursForFullDay}
                onChange={(e) => setRules({ ...rules, minHoursForFullDay: parseFloat(e.target.value) || 0 })}
                min={1}
                className={`${inputClassName} text-sm`}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Min Hours for Half Day Comp-Off</label>
              <input
                type="number"
                value={rules.minHoursForHalfDay}
                onChange={(e) => setRules({ ...rules, minHoursForHalfDay: parseFloat(e.target.value) || 0 })}
                min={1}
                className={`${inputClassName} text-sm`}
              />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <h4 className="text-sm font-semibold text-text">Expiry &amp; Limits</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Comp-Off Expiry (days)</label>
              <input
                type="number"
                value={rules.expiryDays}
                onChange={(e) => setRules({ ...rules, expiryDays: parseInt(e.target.value) || 0 })}
                min={0}
                className={`${inputClassName} text-sm`}
              />
              <p className="text-xs text-text-muted mt-1">0 = never expires.</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Max Accumulation (days)</label>
              <input
                type="number"
                value={rules.maxAccumulation}
                onChange={(e) => setRules({ ...rules, maxAccumulation: parseInt(e.target.value) || 0 })}
                min={0}
                className={`${inputClassName} text-sm`}
              />
              <p className="text-xs text-text-muted mt-1">0 = unlimited.</p>
            </div>
          </div>
          <div className="pt-1">
            {renderToggle(
              rules.requireApproval,
              (v) => setRules({ ...rules, requireApproval: v }),
              'Require Manager Approval for Comp-Off Requests',
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSaveRules}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover transition-colors disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Rules
          </button>
        </div>
      </div>

      {/* Section 2: Comp-Off Records */}
      <div className="space-y-4 pt-4 border-t border-border">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-text">
              Comp-Off Records ({records.length})
            </h3>
            {pendingCount > 0 && (
              <p className="text-sm text-yellow-600 font-medium">
                {pendingCount} pending request{pendingCount > 1 ? 's' : ''} awaiting review
              </p>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className={`${selectClassName} w-40 text-sm`}
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="used">Used</option>
            <option value="expired">Expired</option>
          </select>
          <input
            type="text"
            value={filterEmployee}
            onChange={(e) => setFilterEmployee(e.target.value)}
            placeholder="Search employee..."
            className={`${inputClassName} w-48 text-sm`}
          />
        </div>

        {/* Records Table */}
        <div className="border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-background border-b border-border">
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                    Employee
                  </th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                    Department
                  </th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                    Work Date
                  </th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                    Type
                  </th>
                  <th className="text-right text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                    Hours
                  </th>
                  <th className="text-right text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                    Days Earned
                  </th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                    Status
                  </th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                    Expiry
                  </th>
                  <th className="text-right text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3 w-28">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredRecords.map((record) => (
                  <tr
                    key={record.id}
                    className="bg-card hover:bg-background/50 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-text font-medium">
                      {record.employeeName}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {record.department || '--'}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {record.workDate ? new Date(record.workDate).toLocaleDateString() : '--'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                        {record.workType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted text-right">
                      {record.hoursWorked}h
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted text-right">
                      {record.daysEarned}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          STATUS_STYLES[record.status] || 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {record.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {record.expiryDate
                        ? new Date(record.expiryDate).toLocaleDateString()
                        : '--'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {record.status === 'pending' ? (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setActionModal({ id: record.id, action: 'approved' });
                              setActionComment('');
                            }}
                            className="p-1.5 rounded-lg text-text-muted hover:text-green-600 hover:bg-green-50 transition-colors"
                            title="Approve"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActionModal({ id: record.id, action: 'rejected' });
                              setActionComment('');
                            }}
                            className="p-1.5 rounded-lg text-text-muted hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Reject"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-text-muted">
                          {record.approverComment || '--'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}

                {filteredRecords.length === 0 && (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-8 text-center text-sm text-text-muted"
                    >
                      {records.length === 0
                        ? 'No comp-off records found.'
                        : 'No records match the current filters.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Action Modal */}
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-card border border-border rounded-xl shadow-lg p-6 w-full max-w-md mx-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-text">
                {actionModal.action === 'approved' ? 'Approve' : 'Reject'} Comp-Off Request
              </h3>
              <button
                type="button"
                onClick={() => {
                  setActionModal(null);
                  setActionComment('');
                }}
                className="p-1 rounded-lg text-text-muted hover:text-text hover:bg-background transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">
                Comment (optional)
              </label>
              <textarea
                value={actionComment}
                onChange={(e) => setActionComment(e.target.value)}
                rows={3}
                placeholder="Add a comment..."
                className={`${inputClassName} text-sm`}
              />
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleAction}
                disabled={isSaving}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50 ${
                  actionModal.action === 'approved'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : actionModal.action === 'approved' ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                {actionModal.action === 'approved' ? 'Approve' : 'Reject'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setActionModal(null);
                  setActionComment('');
                }}
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
