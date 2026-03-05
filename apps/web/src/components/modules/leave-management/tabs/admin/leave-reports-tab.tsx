'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  BarChart3,
} from 'lucide-react';

const inputClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary';
const selectClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary appearance-none';

type ReportType = 'utilization' | 'trends' | 'pending-approval' | 'liability' | 'absenteeism';

interface ReportConfig {
  type: ReportType;
  label: string;
  endpoint: string;
  columns: { key: string; label: string; align?: 'right' | 'center' }[];
}

const REPORT_CONFIGS: ReportConfig[] = [
  {
    type: 'utilization',
    label: 'Utilization',
    endpoint: '/leave-management/admin/reports/utilization',
    columns: [
      { key: 'employeeName', label: 'Employee' },
      { key: 'department', label: 'Department' },
      { key: 'leaveType', label: 'Leave Type' },
      { key: 'allocated', label: 'Allocated', align: 'right' },
      { key: 'used', label: 'Used', align: 'right' },
      { key: 'balance', label: 'Balance', align: 'right' },
      { key: 'utilizationPercent', label: 'Utilization %', align: 'right' },
    ],
  },
  {
    type: 'trends',
    label: 'Trends',
    endpoint: '/leave-management/admin/reports/trends',
    columns: [
      { key: 'month', label: 'Month' },
      { key: 'totalRequests', label: 'Total Requests', align: 'right' },
      { key: 'approved', label: 'Approved', align: 'right' },
      { key: 'rejected', label: 'Rejected', align: 'right' },
      { key: 'avgDuration', label: 'Avg Duration (days)', align: 'right' },
      { key: 'topLeaveType', label: 'Top Leave Type' },
    ],
  },
  {
    type: 'pending-approval',
    label: 'Pending Approval',
    endpoint: '/leave-management/admin/reports/pending-approval',
    columns: [
      { key: 'employeeName', label: 'Employee' },
      { key: 'department', label: 'Department' },
      { key: 'leaveType', label: 'Leave Type' },
      { key: 'startDate', label: 'Start Date' },
      { key: 'endDate', label: 'End Date' },
      { key: 'days', label: 'Days', align: 'right' },
      { key: 'pendingSince', label: 'Pending Since' },
      { key: 'approver', label: 'Approver' },
    ],
  },
  {
    type: 'liability',
    label: 'Liability',
    endpoint: '/leave-management/admin/reports/liability',
    columns: [
      { key: 'department', label: 'Department' },
      { key: 'leaveType', label: 'Leave Type' },
      { key: 'totalUnused', label: 'Total Unused Days', align: 'right' },
      { key: 'employeeCount', label: 'Employees', align: 'right' },
      { key: 'encashableValue', label: 'Encashable Value', align: 'right' },
      { key: 'carryForwardDays', label: 'Carry Forward Days', align: 'right' },
    ],
  },
  {
    type: 'absenteeism',
    label: 'Absenteeism',
    endpoint: '/leave-management/admin/reports/absenteeism',
    columns: [
      { key: 'employeeName', label: 'Employee' },
      { key: 'department', label: 'Department' },
      { key: 'totalAbsentDays', label: 'Absent Days', align: 'right' },
      { key: 'unplannedLeaves', label: 'Unplanned', align: 'right' },
      { key: 'plannedLeaves', label: 'Planned', align: 'right' },
      { key: 'absenteeismRate', label: 'Rate (%)', align: 'right' },
    ],
  },
];

export default function LeaveReportsTab() {
  const [reportType, setReportType] = useState<ReportType>('utilization');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [department, setDepartment] = useState('');
  const [location, setLocation] = useState('');
  const [leaveType, setLeaveType] = useState('');

  const [departments, setDepartments] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<string[]>([]);

  const [reportData, setReportData] = useState<Record<string, unknown>[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);

  // Load filter options on mount
  useEffect(() => {
    const loadFilters = async () => {
      try {
        const [deptRes, locRes, ltRes] = await Promise.all([
          api.get('/leave-management/admin/reports/departments').catch(() => ({ data: [] })),
          api.get('/leave-management/admin/reports/locations').catch(() => ({ data: [] })),
          api.get('/leave-management/admin/reports/leave-types').catch(() => ({ data: [] })),
        ]);
        setDepartments(Array.isArray(deptRes.data) ? deptRes.data : deptRes.data?.data || []);
        setLocations(Array.isArray(locRes.data) ? locRes.data : locRes.data?.data || []);
        setLeaveTypes(Array.isArray(ltRes.data) ? ltRes.data : ltRes.data?.data || []);
      } catch {
        // Filters optional, proceed silently
      }
    };
    loadFilters();
  }, []);

  const generateReport = async () => {
    if (!startDate || !endDate) {
      setError('Please select both start and end dates.');
      return;
    }
    setError(null);
    setIsLoading(true);
    setHasGenerated(false);

    const currentConfig = REPORT_CONFIGS.find((c) => c.type === reportType)!;

    try {
      const params: Record<string, string> = {
        startDate,
        endDate,
      };
      if (department) params.department = department;
      if (location) params.location = location;
      if (leaveType) params.leaveType = leaveType;

      const res = await api.get(currentConfig.endpoint, { params });
      const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setReportData(data);
      setHasGenerated(true);
    } catch {
      setError('Failed to generate report.');
    } finally {
      setIsLoading(false);
    }
  };

  const currentConfig = REPORT_CONFIGS.find((c) => c.type === reportType)!;

  const getCellValue = (row: Record<string, unknown>, key: string): string => {
    const val = row[key];
    if (val == null) return '--';
    if (typeof val === 'number') return val.toLocaleString();
    return String(val);
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-text flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Reports &amp; Analytics
        </h2>
        <p className="text-sm text-text-muted">
          Generate leave reports for analysis, compliance, and workforce planning.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Report Type Selector */}
      <div className="bg-card border border-border rounded-lg p-4 space-y-4">
        <h3 className="text-sm font-semibold text-text">Report Type</h3>
        <div className="flex flex-wrap gap-2">
          {REPORT_CONFIGS.map((config) => (
            <button
              key={config.type}
              type="button"
              onClick={() => {
                setReportType(config.type);
                setReportData([]);
                setHasGenerated(false);
              }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                reportType === config.type
                  ? 'bg-primary text-white'
                  : 'bg-background border border-border text-text hover:bg-background/80'
              }`}
            >
              {config.label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Start Date *</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={`${inputClassName} text-sm`}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">End Date *</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={`${inputClassName} text-sm`}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Department</label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className={`${selectClassName} text-sm`}
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={String(d)} value={String(d)}>{String(d)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Location</label>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className={`${selectClassName} text-sm`}
            >
              <option value="">All Locations</option>
              {locations.map((l) => (
                <option key={String(l)} value={String(l)}>{String(l)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Leave Type</label>
            <select
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value)}
              className={`${selectClassName} text-sm`}
            >
              <option value="">All Leave Types</option>
              {leaveTypes.map((lt) => (
                <option key={String(lt)} value={String(lt)}>{String(lt)}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <button
            type="button"
            onClick={generateReport}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover transition-colors disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
            Generate Report
          </button>
        </div>
      </div>

      {/* Report Results */}
      {hasGenerated && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text">
              {currentConfig.label} Report ({reportData.length} records)
            </h3>
          </div>

          <div className="border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-background border-b border-border">
                    {currentConfig.columns.map((col) => (
                      <th
                        key={col.key}
                        className={`${
                          col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                        } text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3 whitespace-nowrap`}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {reportData.map((row, idx) => (
                    <tr
                      key={idx}
                      className="bg-card hover:bg-background/50 transition-colors"
                    >
                      {currentConfig.columns.map((col) => (
                        <td
                          key={col.key}
                          className={`px-4 py-3 text-sm whitespace-nowrap ${
                            col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                          } ${col.key === 'employeeName' ? 'text-text font-medium' : 'text-text-muted'}`}
                        >
                          {getCellValue(row, col.key)}
                        </td>
                      ))}
                    </tr>
                  ))}

                  {reportData.length === 0 && (
                    <tr>
                      <td
                        colSpan={currentConfig.columns.length}
                        className="px-4 py-8 text-center text-sm text-text-muted"
                      >
                        No data found for the selected criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
