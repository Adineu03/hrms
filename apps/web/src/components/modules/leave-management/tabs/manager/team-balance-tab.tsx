'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  Download,
  Calculator,
  AlertTriangle,
} from 'lucide-react';

interface BalanceRow {
  employeeId: string;
  employeeName: string;
  leaveType: string;
  entitled: number;
  used: number;
  pending: number;
  available: number;
  utilizationPercent: number;
}

interface ExcessiveUnusedEntry {
  employeeId: string;
  employeeName: string;
  leaveType: string;
  entitled: number;
  used: number;
  utilizationPercent: number;
}

const selectClassName =
  'px-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary appearance-none text-sm';

export default function TeamBalanceTab() {
  const [balances, setBalances] = useState<BalanceRow[]>([]);
  const [excessiveUnused, setExcessiveUnused] = useState<ExcessiveUnusedEntry[]>([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [balanceRes, unusedRes] = await Promise.all([
        api.get('/leave-management/manager/team-balance', { params: { year } }),
        api.get('/leave-management/manager/team-balance/excessive-unused', { params: { year } }),
      ]);
      setBalances(Array.isArray(balanceRes.data) ? balanceRes.data : balanceRes.data?.data || []);
      setExcessiveUnused(
        Array.isArray(unusedRes.data) ? unusedRes.data : unusedRes.data?.data || []
      );
    } catch {
      setError('Failed to load team balance data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [year]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const res = await api.get('/leave-management/manager/team-balance/export', {
        params: { year },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `team-leave-balance-${year}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setError('Failed to export balance data.');
    } finally {
      setIsExporting(false);
    }
  };

  const yearOptions = [];
  const currentYear = new Date().getFullYear();
  for (let y = currentYear - 2; y <= currentYear + 1; y++) {
    yearOptions.push(y);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading team balances...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-text">Year:</label>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className={selectClassName}
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={isExporting || balances.length === 0}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors disabled:opacity-50"
        >
          {isExporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Export CSV
        </button>
      </div>

      {/* Excessive Unused Warning */}
      {excessiveUnused.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <span className="text-sm font-semibold text-yellow-800">
              Burnout Risk: Low Leave Utilization
            </span>
          </div>
          <p className="text-xs text-yellow-700 mb-2">
            The following employees have used less than 20% of their entitled leave:
          </p>
          <div className="flex flex-wrap gap-2">
            {excessiveUnused.map((entry) => (
              <span
                key={`${entry.employeeId}-${entry.leaveType}`}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-300"
              >
                {entry.employeeName} - {entry.leaveType} ({entry.utilizationPercent.toFixed(0)}%)
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Balance Table */}
      <div className="border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-background border-b border-border">
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                Employee
              </th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                Leave Type
              </th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                Entitled
              </th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                Used
              </th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                Pending
              </th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                Available
              </th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                Utilization
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {balances.map((row, idx) => {
              const isLowUtil = row.utilizationPercent < 20 && row.entitled > 0;
              return (
                <tr
                  key={`${row.employeeId}-${row.leaveType}-${idx}`}
                  className={`hover:bg-background/50 transition-colors ${
                    isLowUtil ? 'bg-yellow-50/50' : 'bg-card'
                  }`}
                >
                  <td className="px-4 py-3 text-sm text-text font-medium">
                    {row.employeeName}
                    {isLowUtil && (
                      <AlertTriangle className="inline h-3 w-3 text-yellow-600 ml-1" />
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-muted">{row.leaveType}</td>
                  <td className="px-4 py-3 text-sm text-text-muted font-medium">{row.entitled}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">
                      {row.used}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {row.pending > 0 ? (
                      <span className="bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-full text-xs font-medium">
                        {row.pending}
                      </span>
                    ) : (
                      <span className="text-text-muted text-xs">0</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        row.available <= 2 && row.entitled > 0
                          ? 'bg-red-50 text-red-700'
                          : 'bg-green-50 text-green-700'
                      }`}
                    >
                      {row.available}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden max-w-[80px]">
                        <div
                          className={`h-full rounded-full ${
                            row.utilizationPercent >= 80
                              ? 'bg-green-500'
                              : row.utilizationPercent >= 40
                                ? 'bg-blue-500'
                                : row.utilizationPercent >= 20
                                  ? 'bg-yellow-500'
                                  : 'bg-red-400'
                          }`}
                          style={{ width: `${Math.min(100, row.utilizationPercent)}%` }}
                        />
                      </div>
                      <span className="text-xs text-text-muted font-medium">
                        {row.utilizationPercent.toFixed(0)}%
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
            {balances.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center">
                  <Calculator className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm text-text-muted">No balance data available for {year}.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
