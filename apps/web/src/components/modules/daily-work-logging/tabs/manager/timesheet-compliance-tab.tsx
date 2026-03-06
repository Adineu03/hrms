'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  ClipboardCheck,
  Bell,
  Inbox,
} from 'lucide-react';

interface ComplianceEntry {
  employeeId: string;
  employeeName: string;
  submitted: number;
  pending: number;
  missing: number;
  complianceScore: number;
}

interface ComplianceScores {
  teamAverage: number;
  highestScore: number;
  lowestScore: number;
  totalSubmissionsDue: number;
  totalSubmitted: number;
}

export default function TimesheetComplianceTab() {
  const [entries, setEntries] = useState<ComplianceEntry[]>([]);
  const [scores, setScores] = useState<ComplianceScores>({
    teamAverage: 0,
    highestScore: 0,
    lowestScore: 0,
    totalSubmissionsDue: 0,
    totalSubmitted: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setError(null);
    try {
      const [compRes, scoresRes] = await Promise.all([
        api.get('/daily-work-logging/manager/compliance'),
        api.get('/daily-work-logging/manager/compliance/scores'),
      ]);
      setEntries(Array.isArray(compRes.data) ? compRes.data : compRes.data?.data || []);
      const scoresData = scoresRes.data?.data || scoresRes.data;
      if (scoresData) {
        setScores({
          teamAverage: scoresData.teamAverage || 0,
          highestScore: scoresData.highestScore || 0,
          lowestScore: scoresData.lowestScore || 0,
          totalSubmissionsDue: scoresData.totalSubmissionsDue || 0,
          totalSubmitted: scoresData.totalSubmitted || 0,
        });
      }
    } catch {
      setError('Failed to load compliance data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSendReminder = async (employeeId: string) => {
    setSendingReminder(employeeId);
    setError(null);
    try {
      await api.post('/daily-work-logging/manager/compliance/remind', { employeeId });
      setSuccess('Reminder sent successfully.');
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to send reminder.');
    } finally {
      setSendingReminder(null);
    }
  };

  const renderProgressBar = (percent: number) => {
    let color = 'bg-green-500';
    if (percent < 70) color = 'bg-red-500';
    else if (percent < 90) color = 'bg-yellow-500';

    return (
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`${color} h-2 rounded-full transition-all`}
          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        />
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading compliance data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-text flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5" />
          Timesheet Compliance
        </h2>
        <p className="text-sm text-text-muted">Track submission compliance and send reminders to team members.</p>
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

      {/* Compliance Score Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <span className="text-xs font-medium text-blue-700 uppercase tracking-wider">Team Average</span>
          <p className="text-2xl font-bold text-blue-700">{scores.teamAverage.toFixed(0)}%</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <span className="text-xs font-medium text-green-700 uppercase tracking-wider">Highest</span>
          <p className="text-2xl font-bold text-green-700">{scores.highestScore.toFixed(0)}%</p>
        </div>
        <div className="bg-red-50 rounded-lg p-4 border border-red-200">
          <span className="text-xs font-medium text-red-700 uppercase tracking-wider">Lowest</span>
          <p className="text-2xl font-bold text-red-700">{scores.lowestScore.toFixed(0)}%</p>
        </div>
        <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
          <span className="text-xs font-medium text-indigo-700 uppercase tracking-wider">Due</span>
          <p className="text-2xl font-bold text-indigo-700">{scores.totalSubmissionsDue}</p>
        </div>
        <div className="bg-teal-50 rounded-lg p-4 border border-teal-200">
          <span className="text-xs font-medium text-teal-700 uppercase tracking-wider">Submitted</span>
          <p className="text-2xl font-bold text-teal-700">{scores.totalSubmitted}</p>
        </div>
      </div>

      {/* Submission Tracker Table */}
      <div className="border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-background border-b border-border">
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Employee</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Submitted</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Pending</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Missing</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3 w-40">Score</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {entries.map((entry) => (
              <tr key={entry.employeeId} className="bg-card hover:bg-background/50 transition-colors">
                <td className="px-4 py-3 text-sm text-text font-medium">{entry.employeeName}</td>
                <td className="px-4 py-3 text-sm text-green-700 font-medium">{entry.submitted}</td>
                <td className="px-4 py-3 text-sm text-yellow-700">{entry.pending}</td>
                <td className="px-4 py-3 text-sm text-red-700">{entry.missing}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1">{renderProgressBar(entry.complianceScore)}</div>
                    <span className="text-xs font-medium text-text w-10 text-right">{entry.complianceScore.toFixed(0)}%</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {(entry.pending > 0 || entry.missing > 0) && (
                    <button
                      type="button"
                      onClick={() => handleSendReminder(entry.employeeId)}
                      disabled={sendingReminder === entry.employeeId}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-yellow-500 text-white hover:bg-yellow-600 disabled:opacity-50 transition-colors"
                    >
                      {sendingReminder === entry.employeeId ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Bell className="h-3 w-3" />
                      )}
                      Remind
                    </button>
                  )}
                  {entry.pending === 0 && entry.missing === 0 && (
                    <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Compliant
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center">
                  <Inbox className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm text-text-muted">No compliance data available.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
