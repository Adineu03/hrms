'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  DollarSign,
  Clock,
  Settings,
  Inbox,
} from 'lucide-react';

const inputClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary';
const selectClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary appearance-none';

interface CorrelationEntry {
  employeeId: string;
  employeeName: string;
  timesheetHours: number;
  attendanceHours: number;
  variance: number;
  status: 'match' | 'mismatch' | 'missing';
}

export default function IntegrationExportTab() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Payroll export
  const [payrollFromDate, setPayrollFromDate] = useState('');
  const [payrollToDate, setPayrollToDate] = useState('');
  const [isExportingPayroll, setIsExportingPayroll] = useState(false);

  // Billing export
  const [billingProjectFilter, setBillingProjectFilter] = useState('');
  const [billingFromDate, setBillingFromDate] = useState('');
  const [billingToDate, setBillingToDate] = useState('');
  const [isExportingBilling, setIsExportingBilling] = useState(false);

  // Attendance correlation
  const [correlationData, setCorrelationData] = useState<CorrelationEntry[]>([]);
  const [isLoadingCorrelation, setIsLoadingCorrelation] = useState(false);

  // Custom export
  const [exportFormat, setExportFormat] = useState('csv');
  const [exportFields, setExportFields] = useState<string[]>(['employee', 'date', 'project', 'hours', 'description']);
  const [exportFromDate, setExportFromDate] = useState('');
  const [exportToDate, setExportToDate] = useState('');
  const [isExportingCustom, setIsExportingCustom] = useState(false);

  const AVAILABLE_FIELDS = [
    { value: 'employee', label: 'Employee Name' },
    { value: 'employee_id', label: 'Employee ID' },
    { value: 'date', label: 'Date' },
    { value: 'project', label: 'Project' },
    { value: 'task_category', label: 'Task Category' },
    { value: 'hours', label: 'Hours' },
    { value: 'billable', label: 'Billable' },
    { value: 'description', label: 'Description' },
    { value: 'status', label: 'Status' },
    { value: 'department', label: 'Department' },
  ];

  useEffect(() => {
    loadCorrelation();
  }, []);

  const loadCorrelation = async () => {
    setIsLoadingCorrelation(true);
    try {
      const res = await api.get('/daily-work-logging/admin/integrations/attendance-correlation');
      setCorrelationData(Array.isArray(res.data) ? res.data : res.data?.data || []);
    } catch {
      // Silently fail - correlation may not be available
    } finally {
      setIsLoadingCorrelation(false);
    }
  };

  const handlePayrollExport = async () => {
    if (!payrollFromDate || !payrollToDate) {
      setError('Please select a date range for payroll export.');
      return;
    }
    setError(null);
    setIsExportingPayroll(true);
    try {
      const res = await api.get(
        `/daily-work-logging/admin/integrations/payroll-export?fromDate=${payrollFromDate}&toDate=${payrollToDate}`,
        { responseType: 'blob' }
      );
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `payroll-export-${payrollFromDate}-to-${payrollToDate}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setSuccess('Payroll export downloaded.');
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to export payroll data.');
    } finally {
      setIsExportingPayroll(false);
    }
  };

  const handleBillingExport = async () => {
    if (!billingFromDate || !billingToDate) {
      setError('Please select a date range for billing export.');
      return;
    }
    setError(null);
    setIsExportingBilling(true);
    try {
      const params = new URLSearchParams({
        fromDate: billingFromDate,
        toDate: billingToDate,
      });
      if (billingProjectFilter) params.append('projectId', billingProjectFilter);
      const res = await api.get(
        `/daily-work-logging/admin/integrations/billing-export?${params.toString()}`,
        { responseType: 'blob' }
      );
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `billing-export-${billingFromDate}-to-${billingToDate}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setSuccess('Billing export downloaded.');
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to export billing data.');
    } finally {
      setIsExportingBilling(false);
    }
  };

  const handleCustomExport = async () => {
    if (!exportFromDate || !exportToDate) {
      setError('Please select a date range for custom export.');
      return;
    }
    if (exportFields.length === 0) {
      setError('Please select at least one field to export.');
      return;
    }
    setError(null);
    setIsExportingCustom(true);
    try {
      const res = await api.post(
        '/daily-work-logging/admin/integrations/export',
        {
          fromDate: exportFromDate,
          toDate: exportToDate,
          format: exportFormat,
          fields: exportFields,
        },
        { responseType: 'blob' }
      );
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `custom-export-${exportFromDate}-to-${exportToDate}.${exportFormat}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setSuccess('Custom export downloaded.');
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to generate custom export.');
    } finally {
      setIsExportingCustom(false);
    }
  };

  const toggleExportField = (field: string) => {
    setExportFields((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
    );
  };

  const CORRELATION_STYLES: Record<string, string> = {
    match: 'bg-green-50 text-green-700',
    mismatch: 'bg-yellow-50 text-yellow-700',
    missing: 'bg-red-50 text-red-700',
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text flex items-center gap-2">
          <Download className="h-5 w-5" />
          Integration & Export
        </h2>
        <p className="text-sm text-text-muted">Export timesheet data for payroll, billing, and custom reports.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          {success}
        </div>
      )}

      {/* Payroll Export */}
      <div className="bg-card border border-border rounded-lg p-4 space-y-3">
        <h3 className="text-sm font-semibold text-text flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          Payroll Export
        </h3>
        <p className="text-xs text-text-muted">Export timesheet data for payroll processing.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">From Date</label>
            <input
              type="date"
              value={payrollFromDate}
              onChange={(e) => setPayrollFromDate(e.target.value)}
              className={inputClassName}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">To Date</label>
            <input
              type="date"
              value={payrollToDate}
              onChange={(e) => setPayrollToDate(e.target.value)}
              min={payrollFromDate}
              className={inputClassName}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={handlePayrollExport}
          disabled={isExportingPayroll}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors"
        >
          {isExportingPayroll ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
          Download Payroll Export
        </button>
      </div>

      {/* Billing Export */}
      <div className="bg-card border border-border rounded-lg p-4 space-y-3">
        <h3 className="text-sm font-semibold text-text flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          Billing Export
        </h3>
        <p className="text-xs text-text-muted">Export billable hours for client invoicing.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">From Date</label>
            <input
              type="date"
              value={billingFromDate}
              onChange={(e) => setBillingFromDate(e.target.value)}
              className={inputClassName}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">To Date</label>
            <input
              type="date"
              value={billingToDate}
              onChange={(e) => setBillingToDate(e.target.value)}
              min={billingFromDate}
              className={inputClassName}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Project Filter (optional)</label>
            <input
              type="text"
              value={billingProjectFilter}
              onChange={(e) => setBillingProjectFilter(e.target.value)}
              className={inputClassName}
              placeholder="Project ID"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={handleBillingExport}
          disabled={isExportingBilling}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors"
        >
          {isExportingBilling ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
          Download Billing Export
        </button>
      </div>

      {/* Attendance Correlation */}
      <div>
        <h3 className="text-sm font-semibold text-text flex items-center gap-2 mb-3">
          <Clock className="h-4 w-4" />
          Attendance Correlation
        </h3>
        <p className="text-xs text-text-muted mb-3">Compare timesheet entries against attendance records.</p>

        {isLoadingCorrelation ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
            <span className="ml-2 text-sm text-text-muted">Loading correlation data...</span>
          </div>
        ) : (
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-background border-b border-border">
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Employee</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Timesheet Hours</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Attendance Hours</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Variance</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {correlationData.map((entry, idx) => (
                  <tr key={entry.employeeId || idx} className="bg-card hover:bg-background/50 transition-colors">
                    <td className="px-4 py-3 text-sm text-text font-medium">{entry.employeeName}</td>
                    <td className="px-4 py-3 text-sm text-text-muted">{(entry.timesheetHours ?? 0).toFixed(1)}</td>
                    <td className="px-4 py-3 text-sm text-text-muted">{(entry.attendanceHours ?? 0).toFixed(1)}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={(entry.variance ?? 0) === 0 ? 'text-green-700' : 'text-yellow-700'}>
                        {(entry.variance ?? 0) >= 0 ? '+' : ''}{(entry.variance ?? 0).toFixed(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${CORRELATION_STYLES[entry.status]}`}>
                        {entry.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {correlationData.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center">
                      <Inbox className="h-10 w-10 mx-auto mb-3 opacity-40" />
                      <p className="text-sm text-text-muted">No correlation data available.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Custom Export Builder */}
      <div className="bg-card border border-border rounded-lg p-4 space-y-3">
        <h3 className="text-sm font-semibold text-text flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Custom Export Builder
        </h3>
        <p className="text-xs text-text-muted">Build a custom export with specific fields and date range.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">From Date</label>
            <input
              type="date"
              value={exportFromDate}
              onChange={(e) => setExportFromDate(e.target.value)}
              className={inputClassName}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">To Date</label>
            <input
              type="date"
              value={exportToDate}
              onChange={(e) => setExportToDate(e.target.value)}
              min={exportFromDate}
              className={inputClassName}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Format</label>
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value)}
              className={selectClassName}
            >
              <option value="csv">CSV</option>
              <option value="xlsx">Excel (XLSX)</option>
              <option value="json">JSON</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-muted mb-2">Select Fields</label>
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_FIELDS.map((field) => (
              <label
                key={field.value}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                  exportFields.includes(field.value)
                    ? 'bg-primary text-white'
                    : 'bg-background text-text-muted border border-border hover:border-primary'
                }`}
              >
                <input
                  type="checkbox"
                  checked={exportFields.includes(field.value)}
                  onChange={() => toggleExportField(field.value)}
                  className="sr-only"
                />
                {field.label}
              </label>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={handleCustomExport}
          disabled={isExportingCustom}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors"
        >
          {isExportingCustom ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Generate & Download
        </button>
      </div>
    </div>
  );
}
