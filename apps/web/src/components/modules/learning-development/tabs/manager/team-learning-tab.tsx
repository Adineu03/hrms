'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  Users,
  Inbox,
  CheckCircle2,
  Clock,
  Award,
  ShieldCheck,
} from 'lucide-react';

interface TeamMember {
  id: string;
  name: string;
  designation: string;
  coursesCompleted: number;
  certificationsCount: number;
  learningHours: number;
  complianceStatus: string;
  completionPercent: number;
}

interface TeamSummary {
  teamSize: number;
  avgCompletionPercent: number;
  complianceCompletionPercent: number;
  totalHours: number;
  members: TeamMember[];
}

const COMPLIANCE_STYLES: Record<string, string> = {
  compliant: 'bg-green-100 text-green-700',
  non_compliant: 'bg-red-100 text-red-700',
  partial: 'bg-yellow-50 text-yellow-700',
  pending: 'bg-gray-100 text-gray-600',
};

export default function TeamLearningTab() {
  const [data, setData] = useState<TeamSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/learning-development/manager/team-learning');
      setData(res.data?.data || res.data);
    } catch {
      setError('Failed to load team learning data.');
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
        <span className="ml-2 text-sm text-text-muted">Loading team learning data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-center gap-2">
        <AlertCircle className="h-4 w-4 flex-shrink-0" />{error}
      </div>
    );
  }

  const summary = data || {
    teamSize: 0,
    avgCompletionPercent: 0,
    complianceCompletionPercent: 0,
    totalHours: 0,
    members: [],
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text flex items-center gap-2">
          <Users className="h-5 w-5" />
          Team Learning Overview
        </h2>
        <p className="text-sm text-text-muted">View your team&apos;s learning progress at a glance.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-background border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-blue-500" />
            <p className="text-xs text-text-muted uppercase font-semibold">Team Members</p>
          </div>
          <p className="text-2xl font-bold text-text">{summary.teamSize}</p>
        </div>
        <div className="bg-background border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <p className="text-xs text-text-muted uppercase font-semibold">Avg Completion</p>
          </div>
          <p className="text-2xl font-bold text-text">{summary.avgCompletionPercent}%</p>
        </div>
        <div className="bg-background border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="h-4 w-4 text-purple-500" />
            <p className="text-xs text-text-muted uppercase font-semibold">Compliance</p>
          </div>
          <p className="text-2xl font-bold text-text">{summary.complianceCompletionPercent}%</p>
        </div>
        <div className="bg-background border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-orange-500" />
            <p className="text-xs text-text-muted uppercase font-semibold">Total Hours</p>
          </div>
          <p className="text-2xl font-bold text-text">{summary.totalHours}</p>
        </div>
      </div>

      {/* Team Members Table */}
      <div className="border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-background border-b border-border">
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Name</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Courses Completed</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Certifications</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Learning Hours</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Completion</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Compliance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {summary.members.map((member) => (
              <tr key={member.id} className="bg-card hover:bg-background/50 transition-colors">
                <td className="px-4 py-3">
                  <span className="text-sm text-text font-medium">{member.name}</span>
                  <p className="text-xs text-text-muted">{member.designation}</p>
                </td>
                <td className="px-4 py-3 text-sm text-text-muted">{member.coursesCompleted}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <Award className="h-3.5 w-3.5 text-yellow-500" />
                    <span className="text-sm text-text-muted">{member.certificationsCount}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-text-muted">{member.learningHours}h</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-14 bg-gray-200 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${member.completionPercent >= 80 ? 'bg-green-500' : member.completionPercent >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${member.completionPercent}%` }}
                      />
                    </div>
                    <span className="text-xs text-text-muted">{member.completionPercent}%</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${COMPLIANCE_STYLES[member.complianceStatus] || 'bg-gray-100 text-gray-600'}`}>
                    {member.complianceStatus?.replace(/_/g, ' ')}
                  </span>
                </td>
              </tr>
            ))}
            {summary.members.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center">
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
