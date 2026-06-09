'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  Wallet,
  Calendar,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Star,
} from 'lucide-react';

interface LeaveBalance {
  leaveTypeId: string;
  leaveTypeName: string;
  leaveTypeColor: string;
  entitled: number;
  used: number;
  pending: number;
  available: number;
  carriedForward: number;
}

interface AccrualSchedule {
  leaveTypeId: string;
  leaveTypeName: string;
  nextCreditDate: string;
  nextCreditAmount: number;
  accrualRule: string;
}

interface PolicySummary {
  id: string;
  name: string;
  code: string;
  daysPerYear: number;
  accrualRule: string;
  carryForwardEnabled: boolean;
  maxCarryForwardDays: number | null;
  encashmentEnabled: boolean;
  requiresApproval: boolean;
  requiresDocument: boolean;
  documentThresholdDays: number | null;
  minConsecutiveDays: number | null;
  maxConsecutiveDays: number | null;
  isPaid: boolean;
}

interface Holiday {
  id: string;
  name: string;
  date: string;
  type: string;
  isOptional: boolean;
}

export default function LeaveBalanceTab() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [accrualSchedules, setAccrualSchedules] = useState<AccrualSchedule[]>([]);
  const [policySummaries, setPolicySummaries] = useState<PolicySummary[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);

  const [isPolicyExpanded, setIsPolicyExpanded] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [balRes, accRes, polRes, holRes] = await Promise.all([
        api.get('/leave-management/employee/balance'),
        api.get('/leave-management/employee/balance/accrual-schedule').catch(() => ({ data: [] })),
        api.get('/leave-management/employee/balance/policy-summary').catch(() => ({ data: [] })),
        api.get('/leave-management/employee/balance/upcoming-holidays').catch(() => ({ data: [] })),
      ]);

      setBalances(
        balRes.data?.balances ??
          balRes.data?.data ??
          (Array.isArray(balRes.data) ? balRes.data : [])
      );
      setAccrualSchedules(
        accRes.data?.schedules ??
          accRes.data?.data ??
          (Array.isArray(accRes.data) ? accRes.data : [])
      );
      setPolicySummaries(
        polRes.data?.leaveTypes ??
          polRes.data?.data ??
          (Array.isArray(polRes.data) ? polRes.data : [])
      );
      setHolidays(
        holRes.data?.holidays ??
          holRes.data?.data ??
          (Array.isArray(holRes.data) ? holRes.data : [])
      );
    } catch {
      setError('Failed to load leave balance data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-center gap-2">
        <AlertCircle className="h-4 w-4 flex-shrink-0" />
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-2">
        <Wallet className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-text">Leave Balance Overview</h2>
      </div>

      {/* Balance Cards Grid */}
      {balances.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {balances.map((bal) => {
            const totalEntitled = bal.entitled + bal.carriedForward;
            const usagePct = totalEntitled > 0 ? Math.min(100, (bal.used / totalEntitled) * 100) : 0;
            return (
              <div
                key={bal.leaveTypeId}
                className="bg-card border border-border rounded-lg p-4 space-y-3"
              >
                {/* Header */}
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: bal.leaveTypeColor || '#4F46E5' }}
                  />
                  <h3 className="text-sm font-semibold text-text">{bal.leaveTypeName}</h3>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div>
                    <span className="text-text-muted">Entitled</span>
                    <p className="font-semibold text-text">{bal.entitled}</p>
                  </div>
                  <div>
                    <span className="text-text-muted">Used</span>
                    <p className="font-semibold text-text">{bal.used}</p>
                  </div>
                  <div>
                    <span className="text-text-muted">Pending</span>
                    <p className="font-semibold text-yellow-700">{bal.pending}</p>
                  </div>
                  <div>
                    <span className="text-text-muted">Available</span>
                    <p className="font-semibold text-green-700">{bal.available}</p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div>
                  <div className="flex justify-between text-xs text-text-muted mb-1">
                    <span>Usage</span>
                    <span>{Math.round(usagePct)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full"
                      style={{ width: `${usagePct}%` }}
                    />
                  </div>
                </div>

                {/* Carry Forward */}
                {bal.carriedForward > 0 && (
                  <div className="text-xs text-text-muted pt-1 border-t border-border">
                    <RefreshCw className="h-3 w-3 inline mr-1" />
                    Carry Forward: <strong>{bal.carriedForward}</strong> days
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8">
          <Wallet className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm text-text-muted">No leave balances found.</p>
        </div>
      )}

      {/* Accrual Schedule */}
      {accrualSchedules.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="h-4 w-4 text-text-muted" />
            <h3 className="text-base font-semibold text-text">Accrual Schedule</h3>
          </div>
          <div className="space-y-3">
            {accrualSchedules.map((acc) => (
              <div
                key={acc.leaveTypeId}
                className="flex items-center justify-between py-2 border-b border-border last:border-0"
              >
                <div>
                  <p className="text-sm font-medium text-text">{acc.leaveTypeName}</p>
                  <p className="text-xs text-text-muted">Frequency: {acc.accrualRule}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-primary">+{acc.nextCreditAmount} days</p>
                  <p className="text-xs text-text-muted">
                    Next: {new Date(acc.nextCreditDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Leave Policy Summary (Collapsible) */}
      {policySummaries.length > 0 && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setIsPolicyExpanded(!isPolicyExpanded)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-background transition-colors"
          >
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-text-muted" />
              <h3 className="text-base font-semibold text-text">Leave Policy Summary</h3>
            </div>
            {isPolicyExpanded ? (
              <ChevronUp className="h-4 w-4 text-text-muted" />
            ) : (
              <ChevronDown className="h-4 w-4 text-text-muted" />
            )}
          </button>

          {isPolicyExpanded && (
            <div className="px-5 pb-5 space-y-4 border-t border-border pt-4">
              {policySummaries.map((policy) => {
                const rules: string[] = [];
                if (policy.daysPerYear != null)
                  rules.push(`${policy.daysPerYear} days per year (${policy.accrualRule} accrual)`);
                rules.push(policy.isPaid ? 'Paid leave' : 'Unpaid leave');
                rules.push(
                  policy.carryForwardEnabled
                    ? `Carry forward allowed${policy.maxCarryForwardDays != null ? ` (max ${policy.maxCarryForwardDays} days)` : ''}`
                    : 'No carry forward'
                );
                if (policy.encashmentEnabled) rules.push('Encashment allowed');
                rules.push(
                  policy.requiresApproval ? 'Requires manager approval' : 'Auto-approved'
                );
                if (policy.requiresDocument)
                  rules.push(
                    `Document required${policy.documentThresholdDays != null ? ` beyond ${policy.documentThresholdDays} days` : ''}`
                  );
                if (policy.minConsecutiveDays != null)
                  rules.push(`Minimum ${policy.minConsecutiveDays} consecutive days`);
                if (policy.maxConsecutiveDays != null)
                  rules.push(`Maximum ${policy.maxConsecutiveDays} consecutive days`);
                return (
                  <div key={policy.id}>
                    <h4 className="text-sm font-semibold text-text mb-2">{policy.name}</h4>
                    <ul className="space-y-1">
                      {rules.map((rule, idx) => (
                        <li key={idx} className="text-sm text-text-muted flex items-start gap-2">
                          <span className="text-primary mt-1.5 text-xs">&#9679;</span>
                          {rule}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Upcoming Holidays */}
      {holidays.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="h-4 w-4 text-indigo-500" />
            <h3 className="text-base font-semibold text-text">Upcoming Holidays</h3>
          </div>
          <div className="space-y-2">
            {holidays.map((hol) => (
              <div
                key={hol.id}
                className="flex items-center justify-between py-2.5 border-b border-border last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-50 text-indigo-700 rounded-lg flex flex-col items-center justify-center text-xs font-semibold leading-tight">
                    <span>{new Date(hol.date).toLocaleDateString('en-US', { day: '2-digit' })}</span>
                    <span className="text-[10px] uppercase">
                      {new Date(hol.date).toLocaleDateString('en-US', { month: 'short' })}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text">{hol.name}</p>
                    <p className="text-xs text-text-muted">
                      {new Date(hol.date).toLocaleDateString('en-US', { weekday: 'long' })}
                      {hol.isOptional && (
                        <span className="ml-2 text-xs text-yellow-700 bg-yellow-50 px-1.5 py-0.5 rounded">
                          Optional
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                  {hol.type}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
