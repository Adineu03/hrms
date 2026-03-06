'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { Users, Loader2, AlertCircle, Inbox } from 'lucide-react';

interface PulseResult {
  id: string;
  surveyTitle: string;
  date: string;
  teamScore: number;
  orgAvg: number;
  participation: number;
}

interface TeamMember {
  id: string;
  name: string;
  designation: string;
  engagementScore: number;
  lastSurveyDate: string;
  trend: string;
}

interface TeamEngagementData {
  teamScore: number;
  teamEnps: number;
  participationRate: number;
  pulseResults: PulseResult[];
  members: TeamMember[];
}

export default function TeamEngagementTab() {
  const [data, setData] = useState<TeamEngagementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [engagementRes, pulseRes, participationRes] = await Promise.all([
        api.get('/engagement-culture/manager/team-engagement'),
        api.get('/engagement-culture/manager/pulse-results'),
        api.get('/engagement-culture/manager/participation'),
      ]);

      const engagement = engagementRes.data?.data || engagementRes.data || {};
      const pulseResults = Array.isArray(pulseRes.data) ? pulseRes.data : pulseRes.data?.data || [];
      const participation = participationRes.data?.data || participationRes.data || {};

      setData({
        teamScore: engagement.teamScore || 0,
        teamEnps: engagement.teamEnps || 0,
        participationRate: participation.participationRate || engagement.participationRate || 0,
        pulseResults,
        members: Array.isArray(engagement.members) ? engagement.members : [],
      });
    } catch {
      setError('Failed to load team engagement data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
        <AlertCircle className="h-4 w-4 shrink-0" />
        {error}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Users className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-text">Team Engagement Overview</h2>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-background rounded-xl border border-border p-5">
          <p className="text-sm text-text-muted mb-1">Team Score</p>
          <p className="text-2xl font-bold text-text">{data?.teamScore || 0}%</p>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div
              className={`h-2 rounded-full ${(data?.teamScore || 0) >= 70 ? 'bg-green-500' : (data?.teamScore || 0) >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
              style={{ width: `${Math.min(data?.teamScore || 0, 100)}%` }}
            />
          </div>
        </div>
        <div className="bg-background rounded-xl border border-border p-5">
          <p className="text-sm text-text-muted mb-1">Team eNPS</p>
          <p className="text-2xl font-bold text-text">{data?.teamEnps || 0}</p>
          <p className="text-xs text-text-muted mt-1">
            {(data?.teamEnps || 0) >= 50 ? 'Excellent' : (data?.teamEnps || 0) >= 20 ? 'Good' : (data?.teamEnps || 0) >= 0 ? 'Fair' : 'Needs Attention'}
          </p>
        </div>
        <div className="bg-background rounded-xl border border-border p-5">
          <p className="text-sm text-text-muted mb-1">Participation Rate</p>
          <p className="text-2xl font-bold text-text">{data?.participationRate || 0}%</p>
        </div>
      </div>

      {/* Recent Pulse Results */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-text uppercase tracking-wider mb-3">Recent Pulse Results</h3>
        {(!data?.pulseResults || data.pulseResults.length === 0) ? (
          <div className="text-center py-8">
            <Inbox className="h-8 w-8 text-text-muted mx-auto mb-2" />
            <p className="text-text-muted text-sm">No pulse results available.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.pulseResults.map((pulse) => (
              <div key={pulse.id} className="bg-background rounded-lg border border-border p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-text">{pulse.surveyTitle}</span>
                  <span className="text-xs text-text-muted">
                    {pulse.date ? new Date(pulse.date).toLocaleDateString() : '—'}
                  </span>
                </div>
                <div className="flex items-center gap-6">
                  <div>
                    <p className="text-xs text-text-muted">Team Score</p>
                    <p className="text-sm font-semibold text-text">{pulse.teamScore}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-text-muted">Org Average</p>
                    <p className="text-sm font-semibold text-text">{pulse.orgAvg}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-text-muted">Participation</p>
                    <p className="text-sm font-semibold text-text">{pulse.participation}%</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Team Member Engagement */}
      <div>
        <h3 className="text-sm font-semibold text-text uppercase tracking-wider mb-3">Team Member Engagement</h3>
        {(!data?.members || data.members.length === 0) ? (
          <div className="text-center py-12">
            <Inbox className="h-10 w-10 text-text-muted mx-auto mb-3" />
            <p className="text-text-muted text-sm">No team members found.</p>
          </div>
        ) : (
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-background">
                <tr>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Name</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Designation</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Engagement Score</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Last Survey</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Trend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.members.map((m) => (
                  <tr key={m.id} className="hover:bg-background/50">
                    <td className="px-4 py-3 text-sm text-text font-medium">{m.name}</td>
                    <td className="px-4 py-3 text-sm text-text-muted">{m.designation}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${m.engagementScore >= 70 ? 'bg-green-500' : m.engagementScore >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                            style={{ width: `${Math.min(m.engagementScore, 100)}%` }}
                          />
                        </div>
                        <span className="text-sm text-text">{m.engagementScore}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {m.lastSurveyDate ? new Date(m.lastSurveyDate).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        m.trend === 'up' ? 'bg-green-100 text-green-700' : m.trend === 'down' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {m.trend === 'up' ? 'Improving' : m.trend === 'down' ? 'Declining' : 'Stable'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
