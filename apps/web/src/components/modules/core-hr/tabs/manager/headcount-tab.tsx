'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  Users,
  UserPlus,
  Building2,
  Info,
} from 'lucide-react';

interface HeadcountSummary {
  totalFilled: number;
  openPositions: number;
}

interface DepartmentHeadcount {
  department: string;
  filled: number;
  open: number;
}

export default function HeadcountTab() {
  const [summary, setSummary] = useState<HeadcountSummary | null>(null);
  const [departments, setDepartments] = useState<DepartmentHeadcount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await api.get('/core-hr/manager/headcount');
        const data = res.data;
        setSummary(data.summary || { totalFilled: 0, openPositions: 0 });
        setDepartments(data.departments || []);
      } catch {
        setError('Failed to load headcount data.');
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading headcount data...</span>
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
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-text">Headcount Planning</h2>
        <p className="text-sm text-text-muted">
          Team headcount overview and department breakdown.
        </p>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-background rounded-lg p-4 border border-border">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
                Total Filled
              </span>
            </div>
            <p className="text-2xl font-bold text-text">{summary.totalFilled}</p>
          </div>
          <div className="bg-background rounded-lg p-4 border border-border">
            <div className="flex items-center gap-2 mb-1">
              <UserPlus className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
                Open Positions
              </span>
            </div>
            <p className="text-2xl font-bold text-text">{summary.openPositions}</p>
          </div>
        </div>
      )}

      {/* Department Breakdown */}
      {departments.length > 0 ? (
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-background border-b border-border">
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                  Department
                </th>
                <th className="text-right text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                  Filled
                </th>
                <th className="text-right text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                  Open
                </th>
                <th className="text-right text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {departments.map((dept) => (
                <tr
                  key={dept.department}
                  className="bg-card hover:bg-background/50 transition-colors"
                >
                  <td className="px-4 py-3 text-sm text-text font-medium">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-3.5 w-3.5 text-text-muted" />
                      {dept.department}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-muted text-right">
                    {dept.filled}
                  </td>
                  <td className="px-4 py-3 text-sm text-right">
                    {dept.open > 0 ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700">
                        {dept.open}
                      </span>
                    ) : (
                      <span className="text-text-muted">0</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-text font-medium text-right">
                    {dept.filled + dept.open}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-8 text-sm text-text-muted">
          No department headcount data available yet.
        </div>
      )}

      {/* Budget Section Stub */}
      <div className="bg-background border border-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-2">
          <Info className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-text">Budget Planning</h3>
        </div>
        <p className="text-sm text-text-muted">
          Budget planning and cost analysis features will be available in a future update.
          This section will include cost-per-hire metrics, department budget allocation,
          and forecasting tools.
        </p>
      </div>
    </div>
  );
}
