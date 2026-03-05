'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  CalendarOff,
  Home,
  UserX,
  ChevronDown,
  ChevronUp,
  Filter,
} from 'lucide-react';

interface TeamMemberAttendance {
  id: string;
  employeeName: string;
  status: 'present' | 'absent' | 'late' | 'on_leave' | 'wfh' | 'not_clocked_in' | 'half_day';
  clockIn?: string;
  clockOut?: string;
  lateMinutes?: number;
  workHours?: number;
  shift?: string;
  department?: string;
  designation?: string;
}

interface DashboardSummary {
  present: number;
  absent: number;
  late: number;
  onLeave: number;
  wfh: number;
  notClockedIn: number;
}

const STATUS_STYLES: Record<string, string> = {
  present: 'bg-green-50 text-green-700',
  absent: 'bg-red-50 text-red-700',
  late: 'bg-yellow-50 text-yellow-700',
  on_leave: 'bg-blue-50 text-blue-700',
  wfh: 'bg-purple-50 text-purple-700',
  not_clocked_in: 'bg-gray-50 text-gray-600',
  half_day: 'bg-orange-50 text-orange-700',
};

const STATUS_LABELS: Record<string, string> = {
  present: 'Present',
  absent: 'Absent',
  late: 'Late',
  on_leave: 'On Leave',
  wfh: 'WFH',
  not_clocked_in: 'Not Clocked In',
  half_day: 'Half Day',
};

const selectClassName =
  'px-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary appearance-none text-sm';

function formatTime(time?: string): string {
  if (!time) return '--';
  try {
    return new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return time;
  }
}

function formatHours(hours?: number): string {
  if (hours === undefined || hours === null) return '--';
  return `${hours.toFixed(1)}h`;
}

export default function TeamDashboardTab() {
  const [members, setMembers] = useState<TeamMemberAttendance[]>([]);
  const [summary, setSummary] = useState<DashboardSummary>({
    present: 0,
    absent: 0,
    late: 0,
    onLeave: 0,
    wfh: 0,
    notClockedIn: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [statusFilter, setStatusFilter] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadData = async (date: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get('/attendance/manager/team-dashboard/today', {
        params: { date },
      });
      const data = res.data;
      const teamMembers: TeamMemberAttendance[] = data.members || data.attendance || data || [];
      setMembers(teamMembers);

      // Calculate summary from data or use provided summary
      if (data.summary) {
        setSummary(data.summary);
      } else {
        const calc: DashboardSummary = {
          present: 0,
          absent: 0,
          late: 0,
          onLeave: 0,
          wfh: 0,
          notClockedIn: 0,
        };
        teamMembers.forEach((m) => {
          switch (m.status) {
            case 'present':
              calc.present++;
              break;
            case 'absent':
              calc.absent++;
              break;
            case 'late':
              calc.late++;
              break;
            case 'on_leave':
              calc.onLeave++;
              break;
            case 'wfh':
              calc.wfh++;
              break;
            case 'not_clocked_in':
              calc.notClockedIn++;
              break;
          }
        });
        setSummary(calc);
      }
    } catch {
      setError('Failed to load team dashboard data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData(selectedDate);
  }, [selectedDate]);

  const filteredMembers = statusFilter
    ? members.filter((m) => m.status === statusFilter)
    : members;

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
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span className="text-xs font-medium text-green-700 uppercase tracking-wider">Present</span>
          </div>
          <p className="text-2xl font-bold text-green-700">{summary.present}</p>
        </div>
        <div className="bg-red-50 rounded-lg p-4 border border-red-200">
          <div className="flex items-center gap-2 mb-1">
            <XCircle className="h-4 w-4 text-red-600" />
            <span className="text-xs font-medium text-red-700 uppercase tracking-wider">Absent</span>
          </div>
          <p className="text-2xl font-bold text-red-700">{summary.absent}</p>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-4 w-4 text-yellow-600" />
            <span className="text-xs font-medium text-yellow-700 uppercase tracking-wider">Late</span>
          </div>
          <p className="text-2xl font-bold text-yellow-700">{summary.late}</p>
        </div>
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center gap-2 mb-1">
            <CalendarOff className="h-4 w-4 text-blue-600" />
            <span className="text-xs font-medium text-blue-700 uppercase tracking-wider">On Leave</span>
          </div>
          <p className="text-2xl font-bold text-blue-700">{summary.onLeave}</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
          <div className="flex items-center gap-2 mb-1">
            <Home className="h-4 w-4 text-purple-600" />
            <span className="text-xs font-medium text-purple-700 uppercase tracking-wider">WFH</span>
          </div>
          <p className="text-2xl font-bold text-purple-700">{summary.wfh}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-1">
            <UserX className="h-4 w-4 text-gray-500" />
            <span className="text-xs font-medium text-gray-600 uppercase tracking-wider">Not Clocked In</span>
          </div>
          <p className="text-2xl font-bold text-gray-600">{summary.notClockedIn}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-text-muted">Date:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className={selectClassName}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-text-muted" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={selectClassName}
          >
            <option value="">All Statuses</option>
            <option value="present">Present</option>
            <option value="absent">Absent</option>
            <option value="late">Late</option>
            <option value="on_leave">On Leave</option>
            <option value="wfh">WFH</option>
            <option value="not_clocked_in">Not Clocked In</option>
          </select>
        </div>
        <span className="text-sm text-text-muted ml-auto">
          Showing {filteredMembers.length} of {members.length} members
        </span>
      </div>

      {/* Attendance Table */}
      <div className="border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-background border-b border-border">
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3 w-8" />
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                Employee Name
              </th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                Status
              </th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                Clock In
              </th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                Clock Out
              </th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                Late (min)
              </th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                Work Hours
              </th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                Shift
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredMembers.map((member) => {
              const isExpanded = expandedId === member.id;
              return (
                <tr key={member.id} className="bg-card">
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : member.id)}
                      className="text-text-muted hover:text-text transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-sm text-text font-medium">
                    {member.employeeName}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        STATUS_STYLES[member.status] || STATUS_STYLES.not_clocked_in
                      }`}
                    >
                      {STATUS_LABELS[member.status] || member.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-muted">
                    {formatTime(member.clockIn)}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-muted">
                    {formatTime(member.clockOut)}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-muted">
                    {member.lateMinutes !== undefined && member.lateMinutes > 0 ? (
                      <span className="text-yellow-700 font-medium">{member.lateMinutes}</span>
                    ) : (
                      '--'
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-muted">
                    {formatHours(member.workHours)}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-muted">
                    {member.shift || '--'}
                  </td>
                </tr>
              );
            })}
            {/* Expanded detail rows rendered separately to keep table structure clean */}
            {filteredMembers.map((member) => {
              if (expandedId !== member.id) return null;
              return (
                <tr key={`${member.id}-detail`} className="bg-background/30">
                  <td colSpan={8} className="px-8 py-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-text">Department: </span>
                        <span className="text-text-muted">{member.department || '--'}</span>
                      </div>
                      <div>
                        <span className="font-medium text-text">Designation: </span>
                        <span className="text-text-muted">{member.designation || '--'}</span>
                      </div>
                      <div>
                        <span className="font-medium text-text">Shift: </span>
                        <span className="text-text-muted">{member.shift || '--'}</span>
                      </div>
                      <div>
                        <span className="font-medium text-text">Work Hours: </span>
                        <span className="text-text-muted">{formatHours(member.workHours)}</span>
                      </div>
                      {member.lateMinutes !== undefined && member.lateMinutes > 0 && (
                        <div>
                          <span className="font-medium text-text">Late By: </span>
                          <span className="text-yellow-700">{member.lateMinutes} minutes</span>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredMembers.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-8 text-center text-sm text-text-muted"
                >
                  {members.length === 0
                    ? 'No attendance data available for this date.'
                    : 'No members match the selected filter.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
