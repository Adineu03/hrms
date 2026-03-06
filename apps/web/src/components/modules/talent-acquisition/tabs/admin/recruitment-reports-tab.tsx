'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  BarChart3,
  Briefcase,
  Clock,
  TrendingUp,
  Users,
  DollarSign,
  Target,
  Inbox,
} from 'lucide-react';

const selectClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary appearance-none';

interface OverviewMetrics {
  totalRequisitions: number;
  openPositions: number;
  filledPositions: number;
  avgTimeToHire: number;
}

interface TimeToHireEntry {
  role: string;
  department: string;
  averageDays: number;
}

interface SourceEffectivenessEntry {
  source: string;
  applicants: number;
  shortlisted: number;
  hired: number;
  conversionRate: number;
}

interface PipelineFunnelEntry {
  stageName: string;
  count: number;
  dropOffRate: number;
}

interface HiringCostEntry {
  source: string;
  totalCost: number;
  hireCount: number;
  costPerHire: number;
}

type ReportType = 'overview' | 'time-to-hire' | 'source-effectiveness' | 'pipeline-funnel' | 'hiring-cost';

export default function RecruitmentReportsTab() {
  const [activeReport, setActiveReport] = useState<ReportType>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [overview, setOverview] = useState<OverviewMetrics | null>(null);
  const [timeToHire, setTimeToHire] = useState<TimeToHireEntry[]>([]);
  const [sourceEffectiveness, setSourceEffectiveness] = useState<SourceEffectivenessEntry[]>([]);
  const [pipelineFunnel, setPipelineFunnel] = useState<PipelineFunnelEntry[]>([]);
  const [hiringCost, setHiringCost] = useState<HiringCostEntry[]>([]);

  useEffect(() => {
    loadReport(activeReport);
  }, [activeReport]);

  const loadReport = async (report: ReportType) => {
    setIsLoading(true);
    setError(null);
    try {
      switch (report) {
        case 'overview': {
          const res = await api.get('/talent-acquisition/admin/reports/overview');
          setOverview(res.data?.data || res.data);
          break;
        }
        case 'time-to-hire': {
          const res = await api.get('/talent-acquisition/admin/reports/time-to-hire');
          setTimeToHire(Array.isArray(res.data) ? res.data : res.data?.data || []);
          break;
        }
        case 'source-effectiveness': {
          const res = await api.get('/talent-acquisition/admin/reports/source-effectiveness');
          setSourceEffectiveness(Array.isArray(res.data) ? res.data : res.data?.data || []);
          break;
        }
        case 'pipeline-funnel': {
          const res = await api.get('/talent-acquisition/admin/reports/pipeline-funnel');
          setPipelineFunnel(Array.isArray(res.data) ? res.data : res.data?.data || []);
          break;
        }
        case 'hiring-cost': {
          const res = await api.get('/talent-acquisition/admin/reports/hiring-cost');
          setHiringCost(Array.isArray(res.data) ? res.data : res.data?.data || []);
          break;
        }
      }
    } catch {
      setError(`Failed to load ${report.replace(/-/g, ' ')} report.`);
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

  const maxFunnelCount = pipelineFunnel.length > 0
    ? Math.max(...pipelineFunnel.map((e) => e.count))
    : 1;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-text flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Reports & Analytics
        </h2>
        <p className="text-sm text-text-muted">View hiring metrics, pipeline performance, and source effectiveness.</p>
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
          <option value="overview">Overview</option>
          <option value="time-to-hire">Time-to-Hire</option>
          <option value="source-effectiveness">Source Effectiveness</option>
          <option value="pipeline-funnel">Pipeline Funnel</option>
          <option value="hiring-cost">Hiring Cost</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
          <span className="ml-2 text-sm text-text-muted">Loading report...</span>
        </div>
      ) : (
        <>
          {/* Overview */}
          {activeReport === 'overview' && overview && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="flex items-center gap-2 mb-1">
                  <Briefcase className="h-4 w-4 text-blue-600" />
                  <span className="text-xs font-medium text-blue-700 uppercase tracking-wider">Total Requisitions</span>
                </div>
                <p className="text-2xl font-bold text-blue-700">{overview.totalRequisitions}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="h-4 w-4 text-green-600" />
                  <span className="text-xs font-medium text-green-700 uppercase tracking-wider">Open Positions</span>
                </div>
                <p className="text-2xl font-bold text-green-700">{overview.openPositions}</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="h-4 w-4 text-purple-600" />
                  <span className="text-xs font-medium text-purple-700 uppercase tracking-wider">Filled</span>
                </div>
                <p className="text-2xl font-bold text-purple-700">{overview.filledPositions}</p>
              </div>
              <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="h-4 w-4 text-orange-600" />
                  <span className="text-xs font-medium text-orange-700 uppercase tracking-wider">Avg Time-to-Hire</span>
                </div>
                <p className="text-2xl font-bold text-orange-700">{overview.avgTimeToHire} <span className="text-sm font-normal">days</span></p>
              </div>
            </div>
          )}
          {activeReport === 'overview' && !overview && (
            <div className="text-center py-8">
              <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm text-text-muted">No overview data available.</p>
            </div>
          )}

          {/* Time-to-Hire */}
          {activeReport === 'time-to-hire' && (
            <div className="border border-border rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-background border-b border-border">
                    <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Role</th>
                    <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Department</th>
                    <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Avg Days</th>
                    <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3 w-40">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {timeToHire.map((entry, idx) => (
                    <tr key={idx} className="bg-card hover:bg-background/50 transition-colors">
                      <td className="px-4 py-3 text-sm text-text font-medium">{entry.role}</td>
                      <td className="px-4 py-3 text-sm text-text-muted">{entry.department}</td>
                      <td className="px-4 py-3 text-sm text-text-muted font-medium">{entry.averageDays}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            {renderProgressBar(
                              Math.min(100, (entry.averageDays / 60) * 100),
                              entry.averageDays > 45 ? 'bg-red-500' : entry.averageDays > 30 ? 'bg-yellow-500' : 'bg-green-500'
                            )}
                          </div>
                          <span className="text-xs font-medium text-text w-12 text-right">{entry.averageDays}d</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {timeToHire.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center">
                        <Clock className="h-10 w-10 mx-auto mb-3 opacity-40" />
                        <p className="text-sm text-text-muted">No time-to-hire data available.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Source Effectiveness */}
          {activeReport === 'source-effectiveness' && (
            <div className="border border-border rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-background border-b border-border">
                    <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Source</th>
                    <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Applicants</th>
                    <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Shortlisted</th>
                    <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Hired</th>
                    <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3 w-44">Conversion Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sourceEffectiveness.map((entry, idx) => (
                    <tr key={idx} className="bg-card hover:bg-background/50 transition-colors">
                      <td className="px-4 py-3 text-sm text-text font-medium capitalize">{entry.source.replace(/_/g, ' ')}</td>
                      <td className="px-4 py-3 text-sm text-text-muted">{entry.applicants}</td>
                      <td className="px-4 py-3 text-sm text-text-muted">{entry.shortlisted}</td>
                      <td className="px-4 py-3 text-sm text-green-700 font-medium">{entry.hired}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            {renderProgressBar(
                              entry.conversionRate,
                              entry.conversionRate >= 20 ? 'bg-green-500' : entry.conversionRate >= 10 ? 'bg-yellow-500' : 'bg-red-500'
                            )}
                          </div>
                          <span className="text-xs font-medium text-text w-12 text-right">{entry.conversionRate.toFixed(1)}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {sourceEffectiveness.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center">
                        <TrendingUp className="h-10 w-10 mx-auto mb-3 opacity-40" />
                        <p className="text-sm text-text-muted">No source effectiveness data available.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pipeline Funnel */}
          {activeReport === 'pipeline-funnel' && (
            <div>
              {pipelineFunnel.length === 0 ? (
                <div className="text-center py-8">
                  <Target className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm text-text-muted">No pipeline funnel data available.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pipelineFunnel.map((entry, idx) => {
                    const widthPercent = maxFunnelCount > 0
                      ? (entry.count / maxFunnelCount) * 100
                      : 0;
                    return (
                      <div key={idx} className="bg-card border border-border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-text">{entry.stageName}</span>
                          <div className="flex items-center gap-3 text-xs text-text-muted">
                            <span className="font-semibold text-text">{entry.count} candidates</span>
                            {idx > 0 && (
                              <span className={`${entry.dropOffRate > 50 ? 'text-red-600' : entry.dropOffRate > 30 ? 'text-yellow-600' : 'text-green-600'}`}>
                                {entry.dropOffRate.toFixed(1)}% drop-off
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-6">
                          <div
                            className="bg-primary h-6 rounded-full transition-all flex items-center justify-end pr-2"
                            style={{ width: `${Math.max(10, widthPercent)}%` }}
                          >
                            <span className="text-[10px] font-bold text-white">{entry.count}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Hiring Cost */}
          {activeReport === 'hiring-cost' && (
            <div className="border border-border rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-background border-b border-border">
                    <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Source</th>
                    <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Total Cost</th>
                    <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Hires</th>
                    <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Cost per Hire</th>
                    <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3 w-40">Relative Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {hiringCost.map((entry, idx) => {
                    const maxCost = Math.max(...hiringCost.map((e) => e.costPerHire), 1);
                    const costPercent = (entry.costPerHire / maxCost) * 100;
                    return (
                      <tr key={idx} className="bg-card hover:bg-background/50 transition-colors">
                        <td className="px-4 py-3 text-sm text-text font-medium capitalize">{entry.source.replace(/_/g, ' ')}</td>
                        <td className="px-4 py-3 text-sm text-text-muted">
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            {entry.totalCost.toLocaleString()}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-text-muted">{entry.hireCount}</td>
                        <td className="px-4 py-3 text-sm text-text font-medium">
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            {entry.costPerHire.toLocaleString()}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1">
                              {renderProgressBar(
                                costPercent,
                                costPercent > 75 ? 'bg-red-500' : costPercent > 40 ? 'bg-yellow-500' : 'bg-green-500'
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {hiringCost.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center">
                        <DollarSign className="h-10 w-10 mx-auto mb-3 opacity-40" />
                        <p className="text-sm text-text-muted">No hiring cost data available.</p>
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
