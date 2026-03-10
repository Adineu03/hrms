'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  Calculator,
  Check,
  Users,
  ListChecks,
  ArrowDownCircle,
  ArrowUpCircle,
  Pencil,
  RefreshCw,
  X,
  CalendarOff,
} from 'lucide-react';
import { Skeleton, TableSkeleton } from '@/components/ui/skeleton';
import { TableEmptyState } from '@/components/ui/empty-state';

const inputClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary';
const selectClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary appearance-none';

interface BalanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  leaveType: string;
  allocated: number;
  used: number;
  balance: number;
  carriedForward: number;
  year: number;
}

interface BalanceStats {
  totalEmployees: number;
  totalLeaveTypes: number;
  balancesToProcess: number;
}

type ActionType = 'credit' | 'debit' | 'adjust' | 'year_end' | null;

export default function BalanceManagementTab() {
  const [balances, setBalances] = useState<BalanceRecord[]>([]);
  const [stats, setStats] = useState<BalanceStats>({
    totalEmployees: 0,
    totalLeaveTypes: 0,
    balancesToProcess: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Filters
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterLeaveType, setFilterLeaveType] = useState('');
  const [departments, setDepartments] = useState<string[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<string[]>([]);

  // Action modal
  const [actionType, setActionType] = useState<ActionType>(null);
  const [actionForm, setActionForm] = useState({
    employeeIds: '',
    leaveType: '',
    days: 0,
    reason: '',
    year: new Date().getFullYear(),
  });

  useEffect(() => {
    loadData();
  }, [filterYear]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [balancesRes, statsRes, filtersRes] = await Promise.all([
        api.get('/leave-management/admin/balances', {
          params: { year: filterYear },
        }),
        api.get('/leave-management/admin/balances/stats').catch(() => ({ data: null })),
        api.get('/leave-management/admin/balances/filters').catch(() => ({ data: null })),
      ]);

      setBalances(
        Array.isArray(balancesRes.data) ? balancesRes.data : balancesRes.data?.data || [],
      );

      const statsData = statsRes.data?.data || statsRes.data;
      if (statsData) {
        setStats({
          totalEmployees: statsData.totalEmployees || 0,
          totalLeaveTypes: statsData.totalLeaveTypes || 0,
          balancesToProcess: statsData.balancesToProcess || 0,
        });
      }

      const filtersData = filtersRes.data?.data || filtersRes.data;
      if (filtersData) {
        setDepartments(Array.isArray(filtersData.departments) ? filtersData.departments : []);
        setLeaveTypes(Array.isArray(filtersData.leaveTypes) ? filtersData.leaveTypes : []);
      }
    } catch {
      setError('Failed to load balance data.');
    } finally {
      setIsLoading(false);
    }
  };

  const openAction = (type: ActionType) => {
    setActionType(type);
    setActionForm({
      employeeIds: '',
      leaveType: '',
      days: 0,
      reason: '',
      year: filterYear,
    });
    setError(null);
  };

  const closeAction = () => {
    setActionType(null);
    setError(null);
  };

  const handleAction = async () => {
    if (actionType === 'year_end') {
      if (!confirm('Are you sure you want to process year-end carry forward? This action cannot be undone.')) {
        return;
      }
    } else {
      if (!actionForm.leaveType.trim()) {
        setError('Leave type is required.');
        return;
      }
      if (actionForm.days <= 0) {
        setError('Days must be greater than zero.');
        return;
      }
    }

    setError(null);
    setSuccessMsg(null);
    setIsSaving(true);

    try {
      if (actionType === 'year_end') {
        await api.post('/leave-management/admin/balances/year-end', {
          year: actionForm.year,
        });
        setSuccessMsg('Year-end processing completed successfully.');
      } else if (actionType === 'credit') {
        await api.post('/leave-management/admin/balances/credit', {
          employeeIds: actionForm.employeeIds
            ? actionForm.employeeIds.split(',').map((s) => s.trim()).filter(Boolean)
            : [],
          leaveType: actionForm.leaveType,
          days: actionForm.days,
          reason: actionForm.reason,
          year: actionForm.year,
        });
        setSuccessMsg('Bulk credit applied successfully.');
      } else if (actionType === 'debit') {
        await api.post('/leave-management/admin/balances/debit', {
          employeeIds: actionForm.employeeIds
            ? actionForm.employeeIds.split(',').map((s) => s.trim()).filter(Boolean)
            : [],
          leaveType: actionForm.leaveType,
          days: actionForm.days,
          reason: actionForm.reason,
          year: actionForm.year,
        });
        setSuccessMsg('Bulk debit applied successfully.');
      } else if (actionType === 'adjust') {
        await api.post('/leave-management/admin/balances/adjust', {
          employeeIds: actionForm.employeeIds
            ? actionForm.employeeIds.split(',').map((s) => s.trim()).filter(Boolean)
            : [],
          leaveType: actionForm.leaveType,
          days: actionForm.days,
          reason: actionForm.reason,
          year: actionForm.year,
        });
        setSuccessMsg('Manual adjustment applied successfully.');
      }

      closeAction();
      await loadData();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch {
      setError(`Failed to process ${actionType} action.`);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredBalances = balances.filter((b) => {
    const matchesDept = !filterDepartment || b.department === filterDepartment;
    const matchesType = !filterLeaveType || b.leaveType === filterLeaveType;
    return matchesDept && matchesType;
  });

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="space-y-1.5">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-80" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-lg p-4 space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-8 w-16" />
            </div>
          ))}
        </div>
        <TableSkeleton rows={5} cols={5} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-text flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Balance Management
        </h2>
        <p className="text-sm text-text-muted">
          View and manage employee leave balances, credits, and year-end processing.
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

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-text-muted" />
            <div className="text-xs font-medium text-text-muted uppercase tracking-wider">Total Employees</div>
          </div>
          <div className="mt-1 text-2xl font-bold text-text">{stats.totalEmployees}</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-text-muted" />
            <div className="text-xs font-medium text-text-muted uppercase tracking-wider">Leave Types</div>
          </div>
          <div className="mt-1 text-2xl font-bold text-text">{stats.totalLeaveTypes}</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-text-muted" />
            <div className="text-xs font-medium text-text-muted uppercase tracking-wider">To Process</div>
          </div>
          <div className="mt-1 text-2xl font-bold text-yellow-600">{stats.balancesToProcess}</div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => openAction('credit')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
        >
          <ArrowDownCircle className="h-3.5 w-3.5" />
          Bulk Credit
        </button>
        <button
          type="button"
          onClick={() => openAction('debit')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
        >
          <ArrowUpCircle className="h-3.5 w-3.5" />
          Bulk Debit
        </button>
        <button
          type="button"
          onClick={() => openAction('adjust')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover transition-colors"
        >
          <Pencil className="h-3.5 w-3.5" />
          Manual Adjustment
        </button>
        <button
          type="button"
          onClick={() => openAction('year_end')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Year-End Processing
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={filterYear}
          onChange={(e) => setFilterYear(parseInt(e.target.value))}
          className={`${selectClassName} w-32 text-sm`}
        >
          {yearOptions.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <select
          value={filterDepartment}
          onChange={(e) => setFilterDepartment(e.target.value)}
          className={`${selectClassName} w-44 text-sm`}
        >
          <option value="">All Departments</option>
          {departments.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <select
          value={filterLeaveType}
          onChange={(e) => setFilterLeaveType(e.target.value)}
          className={`${selectClassName} w-44 text-sm`}
        >
          <option value="">All Leave Types</option>
          {leaveTypes.map((lt) => (
            <option key={lt} value={lt}>{lt}</option>
          ))}
        </select>
      </div>

      {/* Balances Table */}
      <div className="border border-border rounded-xl overflow-hidden">
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
                Leave Type
              </th>
              <th className="text-right text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                Allocated
              </th>
              <th className="text-right text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                Used
              </th>
              <th className="text-right text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                Balance
              </th>
              <th className="text-right text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                Carry Forward
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredBalances.map((record) => (
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
                <td className="px-4 py-3 text-sm">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                    {record.leaveType}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-text-muted text-right">
                  {record.allocated}
                </td>
                <td className="px-4 py-3 text-sm text-text-muted text-right">
                  {record.used}
                </td>
                <td className="px-4 py-3 text-sm text-right font-medium">
                  <span className={record.balance < 0 ? 'text-red-600' : 'text-text'}>
                    {record.balance}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-text-muted text-right">
                  {record.carriedForward}
                </td>
              </tr>
            ))}

            {filteredBalances.length === 0 && (
              <TableEmptyState
                icon={CalendarOff}
                title="No leave balances yet"
                description="Leave balances are created when you configure leave types and assign employees."
                colSpan={7}
              />
            )}
          </tbody>
        </table>
      </div>

      {/* Action Modal */}
      {actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-card border border-border rounded-xl shadow-lg p-6 w-full max-w-md mx-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-text">
                {actionType === 'credit' && 'Bulk Credit Leaves'}
                {actionType === 'debit' && 'Bulk Debit Leaves'}
                {actionType === 'adjust' && 'Manual Adjustment'}
                {actionType === 'year_end' && 'Year-End Processing'}
              </h3>
              <button
                type="button"
                onClick={closeAction}
                className="p-1 rounded-lg text-text-muted hover:text-text hover:bg-background transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {actionType === 'year_end' ? (
              <div className="space-y-3">
                <p className="text-sm text-text-muted">
                  This will process year-end carry forward for all employees based on leave policy rules.
                  Unused leaves will be carried forward or lapsed as configured.
                </p>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Year</label>
                  <select
                    value={actionForm.year}
                    onChange={(e) => setActionForm({ ...actionForm, year: parseInt(e.target.value) })}
                    className={`${selectClassName} text-sm w-32`}
                  >
                    {yearOptions.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Employee IDs (comma separated, empty = all)</label>
                  <input
                    type="text"
                    value={actionForm.employeeIds}
                    onChange={(e) => setActionForm({ ...actionForm, employeeIds: e.target.value })}
                    placeholder="Leave empty to apply to all employees"
                    className={`${inputClassName} text-sm`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Leave Type *</label>
                  <select
                    value={actionForm.leaveType}
                    onChange={(e) => setActionForm({ ...actionForm, leaveType: e.target.value })}
                    className={`${selectClassName} text-sm`}
                  >
                    <option value="">Select leave type</option>
                    {leaveTypes.map((lt) => (
                      <option key={lt} value={lt}>{lt}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Days *</label>
                  <input
                    type="number"
                    value={actionForm.days}
                    onChange={(e) => setActionForm({ ...actionForm, days: parseFloat(e.target.value) || 0 })}
                    min={0.5}
                    step={0.5}
                    className={`${inputClassName} text-sm w-32`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Reason</label>
                  <textarea
                    value={actionForm.reason}
                    onChange={(e) => setActionForm({ ...actionForm, reason: e.target.value })}
                    rows={2}
                    placeholder="Reason for this adjustment..."
                    className={`${inputClassName} text-sm`}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleAction}
                disabled={isSaving}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50 ${
                  actionType === 'credit'
                    ? 'bg-green-600 hover:bg-green-700'
                    : actionType === 'debit'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-primary hover:bg-primary-hover'
                }`}
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {actionType === 'year_end' ? 'Process' : 'Apply'}
              </button>
              <button
                type="button"
                onClick={closeAction}
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
