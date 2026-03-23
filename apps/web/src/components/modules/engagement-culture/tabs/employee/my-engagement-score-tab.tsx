'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { TrendingUp, Loader2, AlertCircle, Inbox, Award } from 'lucide-react';

interface ScoreBreakdown {
  category: string;
  score: number;
  maxScore: number;
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: string;
}

interface ParticipationEntry {
  id: string;
  activity: string;
  type: string;
  date: string;
  pointsEarned: number;
}

interface EngagementData {
  overallScore: number;
  breakdown: ScoreBreakdown[];
  badges: Badge[];
  history: ParticipationEntry[];
}

export default function MyEngagementScoreTab() {
  const [data, setData] = useState<EngagementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [engagementRes, historyRes, badgesRes] = await Promise.all([
        api.get('/engagement-culture/employee/my-engagement').catch(() => ({ data: { data: {} } })),
        api.get('/engagement-culture/employee/my-engagement/participation').catch(() => ({ data: { data: [] } })),
        api.get('/engagement-culture/employee/my-engagement/badges').catch(() => ({ data: { data: [] } })),
      ]);

      const engagement = engagementRes.data?.data || engagementRes.data || {};
      const history = Array.isArray(historyRes.data) ? historyRes.data : Array.isArray(historyRes.data?.data) ? historyRes.data.data : [];
      const badges = Array.isArray(badgesRes.data) ? badgesRes.data : Array.isArray(badgesRes.data?.data) ? badgesRes.data.data : [];

      setData({
        overallScore: engagement.overallScore || engagement.score || 0,
        breakdown: Array.isArray(engagement.breakdown) ? engagement.breakdown : [],
        badges,
        history,
      });
    } catch {
      setError('Failed to load engagement data.');
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

  if (!data) {
    return (
      <div className="text-center py-12">
        <Inbox className="h-10 w-10 text-text-muted mx-auto mb-3" />
        <p className="text-text-muted text-sm">No engagement data available.</p>
      </div>
    );
  }

  const scoreColor = data.overallScore >= 70 ? 'text-green-600' : data.overallScore >= 50 ? 'text-yellow-600' : 'text-red-600';
  const scoreBgColor = data.overallScore >= 70 ? 'bg-green-500' : data.overallScore >= 50 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <TrendingUp className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-text">My Engagement Score</h2>
      </div>

      {/* Score Gauge */}
      <div className="bg-background rounded-xl border border-border p-8 mb-8 text-center">
        <div className="relative w-32 h-32 mx-auto mb-4">
          <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
            <circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="12"
            />
            <circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              stroke="currentColor"
              strokeWidth="12"
              strokeDasharray={`${(data.overallScore / 100) * 327} 327`}
              strokeLinecap="round"
              className={scoreColor}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-3xl font-bold ${scoreColor}`}>{data.overallScore}</span>
          </div>
        </div>
        <p className="text-sm text-text-muted">Overall Engagement Score</p>
        <p className="text-xs text-text-muted mt-1">out of 100</p>
      </div>

      {/* Score Breakdown */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-text uppercase tracking-wider mb-3">Score Breakdown</h3>
        {data.breakdown.length === 0 ? (
          <p className="text-sm text-text-muted">No score breakdown available.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {data.breakdown.map((item, idx) => (
              <div key={idx} className="bg-background rounded-xl border border-border p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-text">{item.category}</span>
                  <span className="text-sm font-bold text-text">{item.score}/{item.maxScore}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full ${scoreBgColor}`}
                    style={{ width: `${item.maxScore > 0 ? Math.min((item.score / item.maxScore) * 100, 100) : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Badges & Achievements */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-text uppercase tracking-wider mb-3">Badges &amp; Achievements</h3>
        {data.badges.length === 0 ? (
          <div className="text-center py-8">
            <Award className="h-8 w-8 text-text-muted mx-auto mb-2" />
            <p className="text-text-muted text-sm">No badges earned yet. Keep participating!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {data.badges.map((badge) => (
              <div key={badge.id} className="bg-background rounded-xl border border-border p-4 text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary text-xl mx-auto mb-2">
                  {badge.icon || '★'}
                </div>
                <h4 className="text-sm font-medium text-text mb-1">{badge.name}</h4>
                <p className="text-xs text-text-muted">{badge.description}</p>
                <p className="text-xs text-text-muted mt-1">
                  {badge.earnedAt ? new Date(badge.earnedAt).toLocaleDateString() : ''}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Participation History */}
      <div>
        <h3 className="text-sm font-semibold text-text uppercase tracking-wider mb-3">Participation History</h3>
        {data.history.length === 0 ? (
          <div className="text-center py-8">
            <Inbox className="h-8 w-8 text-text-muted mx-auto mb-2" />
            <p className="text-text-muted text-sm">No participation history yet.</p>
          </div>
        ) : (
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-background">
                <tr>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Activity</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Type</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Points Earned</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.history.map((entry) => (
                  <tr key={entry.id} className="hover:bg-background/50">
                    <td className="px-4 py-3 text-sm text-text font-medium">{entry.activity}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 capitalize">
                        {entry.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">
                      <span className="text-green-600">+{entry.pointsEarned || 0}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {entry.date ? new Date(entry.date).toLocaleDateString() : '—'}
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
