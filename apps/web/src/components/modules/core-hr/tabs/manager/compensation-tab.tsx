'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  DollarSign,
  TrendingUp,
  Users,
} from 'lucide-react';

interface CompensationSummary {
  averageSalary: number;
  salaryMin: number;
  salaryMax: number;
  teamSize: number;
}

interface EmployeeCompensation {
  id: string;
  firstName: string;
  lastName?: string;
  grade?: string;
  bandMin?: number;
  bandMax?: number;
  ctc?: number;
  bandPosition?: string;
}

function formatCurrency(amount: number | undefined): string {
  if (amount === undefined || amount === null) return '--';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function CompensationTab() {
  const [summary, setSummary] = useState<CompensationSummary | null>(null);
  const [employees, setEmployees] = useState<EmployeeCompensation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await api.get('/core-hr/manager/compensation/summary');
        const data = res.data;
        setSummary(data.summary || null);
        setEmployees(data.employees || []);
      } catch {
        setError('Failed to load compensation data.');
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
        <span className="ml-2 text-sm text-text-muted">Loading compensation data...</span>
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

  if (!summary && employees.length === 0) {
    return (
      <div className="text-center py-12">
        <DollarSign className="h-10 w-10 text-text-muted mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-text mb-1">No Compensation Data</h3>
        <p className="text-sm text-text-muted">
          Salary data will be available once salary structures are assigned.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-text">Team Compensation Overview</h2>
        <p className="text-sm text-text-muted">
          Salary band positions and compensation details for your team.
        </p>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-background rounded-lg p-4 border border-border">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
                Average Salary
              </span>
            </div>
            <p className="text-2xl font-bold text-text">
              {formatCurrency(summary.averageSalary)}
            </p>
          </div>
          <div className="bg-background rounded-lg p-4 border border-border">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
                Salary Range
              </span>
            </div>
            <p className="text-2xl font-bold text-text">
              {formatCurrency(summary.salaryMin)} - {formatCurrency(summary.salaryMax)}
            </p>
          </div>
          <div className="bg-background rounded-lg p-4 border border-border">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
                Team Size
              </span>
            </div>
            <p className="text-2xl font-bold text-text">{summary.teamSize}</p>
          </div>
        </div>
      )}

      {/* Salary Table */}
      {employees.length > 0 && (
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-background border-b border-border">
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                  Employee
                </th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                  Grade
                </th>
                <th className="text-right text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                  Band Min
                </th>
                <th className="text-right text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                  Band Max
                </th>
                <th className="text-right text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                  CTC
                </th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                  Band Position
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {employees.map((emp) => (
                <tr
                  key={emp.id}
                  className="bg-card hover:bg-background/50 transition-colors"
                >
                  <td className="px-4 py-3 text-sm text-text font-medium">
                    {emp.firstName} {emp.lastName || ''}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-muted">
                    {emp.grade || '--'}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-muted text-right">
                    {formatCurrency(emp.bandMin)}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-muted text-right">
                    {formatCurrency(emp.bandMax)}
                  </td>
                  <td className="px-4 py-3 text-sm text-text font-medium text-right">
                    {formatCurrency(emp.ctc)}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {emp.bandPosition ? (
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          emp.bandPosition === 'above'
                            ? 'bg-green-50 text-green-700'
                            : emp.bandPosition === 'below'
                              ? 'bg-red-50 text-red-700'
                              : 'bg-blue-50 text-blue-700'
                        }`}
                      >
                        {emp.bandPosition}
                      </span>
                    ) : (
                      <span className="text-text-muted">--</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
