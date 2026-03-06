'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  BarChart3,
  Users,
  Clock,
  TrendingUp,
  CheckCircle2,
} from 'lucide-react';

const selectClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary appearance-none';

interface UtilizationEntry {
  employeeId: string;
  employeeName: string;
  totalHours: number;
  billableHours: number;
  nonBillableHours: number;
  utilization: number;
}

interface ProjectAllocationEntry {
  projectId: string;
  projectName: string;
  budgetHours: number;
  actualHours: number;
  variance: number;
  percentUsed: number;
}

interface ProductivityMetrics {
  avgHoursPerDay: number;
  avgBillableRatio: number;
  totalEmployees: number;
  totalHoursThisMonth: number;
  avgUtilization: number;
  onTimeSubmissionRate: number;
}

interface ComplianceEntry {
  employeeId: string;
  employeeName: string;
  submittedOnTime: number;
  totalSubmissions: number;
  onTimeRate: number;
  lateCount: number;
  missingCount: number;
}

interface TrendEntry {
  week: string;
  totalHours: number;
  billableHours: number;
  avgPerEmployee: number;
}

type ReportType = 'utilization' | 'project-allocation' | 'productivity' | 'compliance' | 'trends';

export default function TimesheetReportsTab() {
  const [activeReport, setActiveReport] = useState<ReportType>('utilization');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [utilization, setUtilization] = useState<UtilizationEntry[]>([]);
  const [projectAllocation, setProjectAllocation] = useState<ProjectAllocationEntry[]>([]);
  const [productivity, setProductivity] = useState<ProductivityMetrics | null>(null);
  const [compliance, setCompliance] = useState<ComplianceEntry[]>([]);
  const [trends, setTrends] = useState<TrendEntry[]>([]);

  useEffect(() => {
    loadReport(activeReport);
  }, [activeReport]);

  const loadReport = async (report: ReportType) => {
    setIsLoading(true);
    setError(null);
    try {
      switch (report) {
        case 'utilization': {
          const res = await api.get('/daily-work-logging/admin/reports/utilization');
          setUtilization(Array.isArray(res.data) ? res.data : res.data?.data || []);
          break;
        }
        case 'project-allocation': {
          const res = await api.get('/daily-work-logging/admin/reports/project-allocation');
          setProjectAllocation(Array.isArray(res.data) ? res.data : res.data?.data || []);
          break;
        }
        case 'productivity': {
          const res = await api.get('/daily-work-logging/admin/reports/productivity');
          setProductivity(res.data?.data || res.data);
          break;
        }
        case 'compliance': {
          const res = await api.get('/daily-work-logging/admin/reports/compliance');
          setCompliance(Array.isArray(res.data) ? res.data : res.data?.data || []);
          break;
        }
        case 'trends': {
          const res = await api.get('/daily-work-logging/admin/reports/trends');
          setTrends(Array.isArray(res.data) ? res.data : res.data?.data || []);
          break;
        }
      }
    } catch {
      setError(`Failed to load ${report.replace('-', ' ')} report.`);
    } finally {
      setIsLoading(false);
    }
  };

  const renderProgressBar = (percent: number, color: string = 'bg-primary') => (
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div
        className={`${color} h-2 rounded-full transition-all`}
        style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
      />
    </div>
  );

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-text flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Reports & Analytics
        </h2>
        <p className="text-sm text-text-muted">View utilization, project allocation, productivity, compliance, and trend reports.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Report Selector */}
      <div className="w-full sm:w-64">
        <select
          value={activeReport}
          onChange={(e) => setActiveReport(e.target.value as ReportType)}
          className={selectClassName}
        >
          <option value="utilization">Utilization Report</option>
          <option value="project-allocation">Project Allocation</option>
          <option value="productivity">Productivity Metrics</option>
          <option value="compliance">Compliance Report</option>
          <option value="trends">Week-over-Week Trends</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
          <span className="ml-2 text-sm text-text-muted">Loading report...</span>
        </div>
      ) : (
        <>
          {/* Utilization Report */}
          {activeReport === 'utilization' && (
            <div className="border border-border rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-background border-b border-border">
                    <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Employee</th>
                    <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Total Hours</th>
                    <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Billable</th>
                    <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Non-Billable</th>
                    <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3 w-40">Utilization</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {utilization.map((entry) => (
                    <tr key={entry.employeeId} className="bg-card hover:bg-background/50 transition-colors">
                      <td className="px-4 py-3 text-sm text-text font-medium">{entry.employeeName}</td>
                      <td className="px-4 py-3 text-sm text-text-muted">{entry.totalHours.toFixed(1)}</td>
                      <td className="px-4 py-3 text-sm text-green-700 font-medium">{entry.billableHours.toFixed(1)}</td>
                      <td className="px-4 py-3 text-sm text-text-muted">{entry.nonBillableHours.toFixed(1)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1">{renderProgressBar(entry.utilization)}</div>
                          <span className="text-xs font-medium text-text w-10 text-right">{entry.utilization.toFixed(0)}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {utilization.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center">
                        <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
                        <p className="text-sm text-text-muted">No utilization data available.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Project Allocation */}
          {activeReport === 'project-allocation' && (
            <div className="border border-border rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-background border-b border-border">
                    <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Project</th>
                    <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Budget (hrs)</th>
                    <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Actual (hrs)</th>
                    <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Variance</th>
                    <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3 w-40">Used</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {projectAllocation.map((entry) => (
                    <tr key={entry.projectId} className="bg-card hover:bg-background/50 transition-colors">
                      <td className="px-4 py-3 text-sm text-text font-medium">{entry.projectName}</td>
                      <td className="px-4 py-3 text-sm text-text-muted">{entry.budgetHours.toFixed(1)}</td>
                      <td className="px-4 py-3 text-sm text-text-muted">{entry.actualHours.toFixed(1)}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={entry.variance >= 0 ? 'text-green-700' : 'text-red-700'}>
                          {entry.variance >= 0 ? '+' : ''}{entry.variance.toFixed(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            {renderProgressBar(
                              entry.percentUsed,
                              entry.percentUsed > 100 ? 'bg-red-500' : entry.percentUsed > 80 ? 'bg-yellow-500' : 'bg-primary'
                            )}
                          </div>
                          <span className="text-xs font-medium text-text w-10 text-right">{entry.percentUsed.toFixed(0)}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {projectAllocation.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center">
                        <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-40" />
                        <p className="text-sm text-text-muted">No project allocation data available.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Productivity Metrics */}
          {activeReport === 'productivity' && productivity && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <span className="text-xs font-medium text-blue-700 uppercase tracking-wider">Avg Hours/Day</span>
                </div>
                <p className="text-2xl font-bold text-blue-700">{productivity.avgHoursPerDay.toFixed(1)}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-xs font-medium text-green-700 uppercase tracking-wider">Billable Ratio</span>
                </div>
                <p className="text-2xl font-bold text-green-700">{productivity.avgBillableRatio.toFixed(0)}%</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="h-4 w-4 text-purple-600" />
                  <span className="text-xs font-medium text-purple-700 uppercase tracking-wider">Total Employees</span>
                </div>
                <p className="text-2xl font-bold text-purple-700">{productivity.totalEmployees}</p>
              </div>
              <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
                <div className="flex items-center gap-2 mb-1">
                  <BarChart3 className="h-4 w-4 text-indigo-600" />
                  <span className="text-xs font-medium text-indigo-700 uppercase tracking-wider">Total Hours (Month)</span>
                </div>
                <p className="text-2xl font-bold text-indigo-700">{productivity.totalHoursThisMonth.toFixed(0)}</p>
              </div>
              <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-orange-600" />
                  <span className="text-xs font-medium text-orange-700 uppercase tracking-wider">Avg Utilization</span>
                </div>
                <p className="text-2xl font-bold text-orange-700">{productivity.avgUtilization.toFixed(0)}%</p>
              </div>
              <div className="bg-teal-50 rounded-lg p-4 border border-teal-200">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="h-4 w-4 text-teal-600" />
                  <span className="text-xs font-medium text-teal-700 uppercase tracking-wider">On-Time Rate</span>
                </div>
                <p className="text-2xl font-bold text-teal-700">{productivity.onTimeSubmissionRate.toFixed(0)}%</p>
              </div>
            </div>
          )}
          {activeReport === 'productivity' && !productivity && (
            <div className="text-center py-8">
              <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm text-text-muted">No productivity metrics available.</p>
            </div>
          )}

          {/* Compliance Report */}
          {activeReport === 'compliance' && (
            <div className="border border-border rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-background border-b border-border">
                    <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Employee</th>
                    <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">On-Time</th>
                    <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Total</th>
                    <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Late</th>
                    <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Missing</th>
                    <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3 w-40">On-Time Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {compliance.map((entry) => (
                    <tr key={entry.employeeId} className="bg-card hover:bg-background/50 transition-colors">
                      <td className="px-4 py-3 text-sm text-text font-medium">{entry.employeeName}</td>
                      <td className="px-4 py-3 text-sm text-green-700">{entry.submittedOnTime}</td>
                      <td className="px-4 py-3 text-sm text-text-muted">{entry.totalSubmissions}</td>
                      <td className="px-4 py-3 text-sm text-yellow-700">{entry.lateCount}</td>
                      <td className="px-4 py-3 text-sm text-red-700">{entry.missingCount}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            {renderProgressBar(
                              entry.onTimeRate,
                              entry.onTimeRate >= 90 ? 'bg-green-500' : entry.onTimeRate >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                            )}
                          </div>
                          <span className="text-xs font-medium text-text w-10 text-right">{entry.onTimeRate.toFixed(0)}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {compliance.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center">
                        <CheckCircle2 className="h-10 w-10 mx-auto mb-3 opacity-40" />
                        <p className="text-sm text-text-muted">No compliance data available.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Trends */}
          {activeReport === 'trends' && (
            <div className="border border-border rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-background border-b border-border">
                    <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Week</th>
                    <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Total Hours</th>
                    <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Billable Hours</th>
                    <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Avg/Employee</th>
                    <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3 w-40">Distribution</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {trends.map((entry, idx) => {
                    const billablePercent = entry.totalHours > 0 ? (entry.billableHours / entry.totalHours) * 100 : 0;
                    return (
                      <tr key={idx} className="bg-card hover:bg-background/50 transition-colors">
                        <td className="px-4 py-3 text-sm text-text font-medium">{entry.week}</td>
                        <td className="px-4 py-3 text-sm text-text-muted">{entry.totalHours.toFixed(1)}</td>
                        <td className="px-4 py-3 text-sm text-green-700">{entry.billableHours.toFixed(1)}</td>
                        <td className="px-4 py-3 text-sm text-text-muted">{entry.avgPerEmployee.toFixed(1)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1">{renderProgressBar(billablePercent, 'bg-green-500')}</div>
                            <span className="text-xs font-medium text-text w-10 text-right">{billablePercent.toFixed(0)}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {trends.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center">
                        <TrendingUp className="h-10 w-10 mx-auto mb-3 opacity-40" />
                        <p className="text-sm text-text-muted">No trend data available.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
