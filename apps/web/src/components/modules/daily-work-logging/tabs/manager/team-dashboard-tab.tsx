'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  LayoutDashboard,
  Clock,
  Users,
  FileText,
  ChevronDown,
  ChevronUp,
  Inbox,
} from 'lucide-react';

interface DashboardSummary {
  totalTeamHoursToday: number;
  totalTeamHoursThisWeek: number;
  pendingSubmissions: number;
  teamSize: number;
}

interface TeamMemberStatus {
  employeeId: string;
  employeeName: string;
  status: 'submitted' | 'pending' | 'draft' | 'not_started' | 'late';
  hoursToday: number;
  hoursThisWeek: number;
  todayEntries: TodayEntry[];
}

interface TodayEntry {
  id: string;
  project: string;
  taskCategory: string;
  hours: number;
  description: string;
}

const STATUS_STYLES: Record<string, string> = {
  submitted: 'bg-green-50 text-green-700',
  pending: 'bg-yellow-50 text-yellow-700',
  draft: 'bg-blue-50 text-blue-700',
  not_started: 'bg-gray-100 text-gray-600',
  late: 'bg-red-50 text-red-700',
};

const STATUS_LABELS: Record<string, string> = {
  submitted: 'Submitted',
  pending: 'Pending',
  draft: 'Draft',
  not_started: 'Not Started',
  late: 'Late',
};

export default function TeamDashboardTab() {
  const [summary, setSummary] = useState<DashboardSummary>({
    totalTeamHoursToday: 0,
    totalTeamHoursThisWeek: 0,
    pendingSubmissions: 0,
    teamSize: 0,
  });
  const [teamMembers, setTeamMembers] = useState<TeamMemberStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setError(null);
    try {
      const [summaryRes, teamRes] = await Promise.all([
        api.get('/daily-work-logging/manager/dashboard/summary').catch(() => null),
        api.get('/daily-work-logging/manager/dashboard/today').catch(() => null),
      ]);
      const summaryRaw = summaryRes?.data;
      const summaryData = summaryRaw?.data || summaryRaw;
      if (summaryData && typeof summaryData === 'object') {
        setSummary({
          totalTeamHoursToday: summaryData.totalTeamHoursToday || 0,
          totalTeamHoursThisWeek: summaryData.totalTeamHoursThisWeek || 0,
          pendingSubmissions: summaryData.pendingSubmissions || 0,
          teamSize: summaryData.teamSize || 0,
        });
      }
      const teamRaw = teamRes?.data;
      const teamArr = Array.isArray(teamRaw) ? teamRaw : Array.isArray(teamRaw?.data) ? teamRaw.data : [];
      setTeamMembers(teamArr);
    } catch {
      setError('Failed to load team dashboard.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading team dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-text flex items-center gap-2">
          <LayoutDashboard className="h-5 w-5" />
          Team Dashboard
        </h2>
        <p className="text-sm text-text-muted">Overview of your team&apos;s daily work logging status.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-4 w-4 text-blue-600" />
            <span className="text-xs font-medium text-blue-700 uppercase tracking-wider">Hours Today</span>
          </div>
          <p className="text-2xl font-bold text-blue-700">{summary.totalTeamHoursToday.toFixed(1)}</p>
        </div>
        <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-4 w-4 text-indigo-600" />
            <span className="text-xs font-medium text-indigo-700 uppercase tracking-wider">Hours This Week</span>
          </div>
          <p className="text-2xl font-bold text-indigo-700">{summary.totalTeamHoursThisWeek.toFixed(1)}</p>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="h-4 w-4 text-yellow-600" />
            <span className="text-xs font-medium text-yellow-700 uppercase tracking-wider">Pending</span>
          </div>
          <p className="text-2xl font-bold text-yellow-700">{summary.pendingSubmissions}</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
          <div className="flex items-center gap-2 mb-1">
            <Users className="h-4 w-4 text-purple-600" />
            <span className="text-xs font-medium text-purple-700 uppercase tracking-wider">Team Size</span>
          </div>
          <p className="text-2xl font-bold text-purple-700">{summary.teamSize}</p>
        </div>
      </div>

      {/* Team Status Table */}
      <div className="border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-background border-b border-border">
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Employee</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Status</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Hours Today</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Hours This Week</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {teamMembers.map((member) => (
              <>
                <tr key={member.employeeId} className="bg-card hover:bg-background/50 transition-colors">
                  <td className="px-4 py-3 text-sm text-text font-medium">{member.employeeName}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[member.status]}`}>
                      {STATUS_LABELS[member.status] || member.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-muted">{member.hoursToday.toFixed(1)}</td>
                  <td className="px-4 py-3 text-sm text-text-muted">{member.hoursThisWeek.toFixed(1)}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => toggleExpand(member.employeeId)}
                      className="text-text-muted hover:text-primary transition-colors"
                      title="View today's entries"
                    >
                      {expandedId === member.employeeId ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>
                  </td>
                </tr>
                {expandedId === member.employeeId && (
                  <tr key={`${member.employeeId}-entries`} className="bg-background/30">
                    <td colSpan={5} className="px-8 py-3">
                      <p className="text-xs font-semibold text-text mb-2">Today&apos;s Work</p>
                      {member.todayEntries && member.todayEntries.length > 0 ? (
                        <div className="space-y-1.5">
                          {member.todayEntries.map((entry) => (
                            <div key={entry.id} className="flex items-center gap-4 text-xs bg-card rounded-lg px-3 py-2 border border-border">
                              <span className="text-text font-medium">{entry.project}</span>
                              <span className="text-text-muted">{entry.taskCategory}</span>
                              <span className="text-primary font-medium">{entry.hours.toFixed(1)}h</span>
                              <span className="text-text-muted truncate flex-1">{entry.description}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-text-muted py-1">No entries logged today.</p>
                      )}
                    </td>
                  </tr>
                )}
              </>
            ))}
            {teamMembers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center">
                  <Inbox className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm text-text-muted">No team members found.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
