'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  Briefcase,
  CheckCircle2,
  Clock,
  TrendingUp,
  Calendar,
  UserPlus,
  BarChart3,
} from 'lucide-react';

interface OverviewMetrics {
  openPositions: number;
  filledThisQuarter: number;
  avgTimeToFill: number;
  interviewToHireRatio: string;
}

interface TimeToFillData {
  department: string;
  avgDays: number;
  requisitionCount: number;
}

interface InterviewRatioData {
  position: string;
  totalInterviews: number;
  totalHires: number;
  ratio: string;
}

interface UpcomingJoiner {
  id: string;
  name: string;
  designation: string;
  department: string;
  joiningDate: string;
}

export default function TeamHiringReportsTab() {
  const [overview, setOverview] = useState<OverviewMetrics | null>(null);
  const [timeToFill, setTimeToFill] = useState<TimeToFillData[]>([]);
  const [interviewRatio, setInterviewRatio] = useState<InterviewRatioData[]>([]);
  const [upcomingJoiners, setUpcomingJoiners] = useState<UpcomingJoiner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setError(null);
    try {
      const [overviewRes, ttfRes, irRes, joinersRes] = await Promise.all([
        api.get('/talent-acquisition/manager/reports/overview'),
        api.get('/talent-acquisition/manager/reports/time-to-fill'),
        api.get('/talent-acquisition/manager/reports/interview-ratio'),
        api.get('/talent-acquisition/manager/reports/upcoming-joiners'),
      ]);
      setOverview(overviewRes.data?.data || overviewRes.data || null);
      setTimeToFill(Array.isArray(ttfRes.data) ? ttfRes.data : ttfRes.data?.data || []);
      setInterviewRatio(Array.isArray(irRes.data) ? irRes.data : irRes.data?.data || []);
      setUpcomingJoiners(Array.isArray(joinersRes.data) ? joinersRes.data : joinersRes.data?.data || []);
    } catch {
      setError('Failed to load hiring reports.');
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
        <span className="ml-2 text-sm text-text-muted">Loading hiring reports...</span>
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

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center gap-2 mb-1">
            <Briefcase className="h-4 w-4 text-blue-600" />
            <span className="text-xs font-medium text-blue-700 uppercase tracking-wider">Open Positions</span>
          </div>
          <p className="text-2xl font-bold text-blue-700">{overview?.openPositions ?? 0}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span className="text-xs font-medium text-green-700 uppercase tracking-wider">Filled This Quarter</span>
          </div>
          <p className="text-2xl font-bold text-green-700">{overview?.filledThisQuarter ?? 0}</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-4 w-4 text-purple-600" />
            <span className="text-xs font-medium text-purple-700 uppercase tracking-wider">Avg Time-to-Fill</span>
          </div>
          <p className="text-2xl font-bold text-purple-700">{overview?.avgTimeToFill ?? 0} <span className="text-sm font-medium">days</span></p>
        </div>
        <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-orange-600" />
            <span className="text-xs font-medium text-orange-700 uppercase tracking-wider">Interview:Hire</span>
          </div>
          <p className="text-2xl font-bold text-orange-700">{overview?.interviewToHireRatio ?? '--'}</p>
        </div>
      </div>

      {/* Time-to-Fill by Department */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-4 w-4 text-text-muted" />
          <h3 className="text-sm font-semibold text-text">Time-to-Fill by Department</h3>
        </div>
        {timeToFill.length > 0 ? (
          <div className="space-y-3">
            {timeToFill.map((item) => {
              const maxDays = Math.max(...timeToFill.map((t) => t.avgDays), 1);
              const pct = (item.avgDays / maxDays) * 100;
              return (
                <div key={item.department}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-text">{item.department}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-text-muted">{item.requisitionCount} req{item.requisitionCount !== 1 ? 's' : ''}</span>
                      <span className="text-sm font-medium text-text">{item.avgDays} days</span>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${item.avgDays > 45 ? 'bg-red-400' : item.avgDays > 30 ? 'bg-yellow-400' : 'bg-green-400'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm text-text-muted">No time-to-fill data available.</p>
          </div>
        )}
      </div>

      {/* Interview-to-Hire Ratio */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-4 w-4 text-text-muted" />
          <h3 className="text-sm font-semibold text-text">Interview-to-Hire Ratio by Position</h3>
        </div>
        {interviewRatio.length > 0 ? (
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-background border-b border-border">
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Position</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Total Interviews</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Total Hires</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Ratio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {interviewRatio.map((item, idx) => (
                  <tr key={idx} className="bg-card hover:bg-background/50 transition-colors">
                    <td className="px-4 py-3 text-sm text-text font-medium">{item.position}</td>
                    <td className="px-4 py-3 text-sm text-text-muted">{item.totalInterviews}</td>
                    <td className="px-4 py-3 text-sm text-text-muted">{item.totalHires}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        parseFloat(item.ratio) <= 3 ? 'bg-green-50 text-green-700' : parseFloat(item.ratio) <= 6 ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-700'
                      }`}>
                        {item.ratio}:1
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-6">
            <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm text-text-muted">No interview ratio data available.</p>
          </div>
        )}
      </div>

      {/* Upcoming Joiners */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <UserPlus className="h-4 w-4 text-text-muted" />
          <h3 className="text-sm font-semibold text-text">Upcoming Joiners</h3>
        </div>
        {upcomingJoiners.length > 0 ? (
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-background border-b border-border">
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Name</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Designation</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Department</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Joining Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {upcomingJoiners.map((joiner) => {
                  const joinDate = new Date(joiner.joiningDate);
                  const daysUntil = Math.ceil((joinDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  return (
                    <tr key={joiner.id} className="bg-card hover:bg-background/50 transition-colors">
                      <td className="px-4 py-3 text-sm text-text font-medium">{joiner.name}</td>
                      <td className="px-4 py-3 text-sm text-text-muted">{joiner.designation}</td>
                      <td className="px-4 py-3 text-sm text-text-muted">{joiner.department}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3 text-text-muted" />
                          <span className="text-sm text-text">{joinDate.toLocaleDateString()}</span>
                          {daysUntil >= 0 && (
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${
                              daysUntil <= 7 ? 'bg-green-50 text-green-700' : daysUntil <= 30 ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-700'
                            }`}>
                              {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil}d`}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-6">
            <UserPlus className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm text-text-muted">No upcoming joiners scheduled.</p>
          </div>
        )}
      </div>
    </div>
  );
}
