'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  Users,
  Inbox,
  Star,
  Target,
  Clock,
  TrendingUp,
} from 'lucide-react';

interface TeamMember {
  id: string;
  name: string;
  designation: string;
  currentRating: number;
  goalCompletionPercent: number;
  reviewStatus: string;
  lastReviewDate: string;
}

interface PendingAction {
  id: string;
  type: string;
  description: string;
  employeeName: string;
  dueDate: string;
}

interface TeamSummary {
  teamSize: number;
  avgRating: number;
  goalsOnTrackPercent: number;
  pendingReviews: number;
  members: TeamMember[];
  pendingActions: PendingAction[];
  ratingDistribution: { rating: number; count: number }[];
}

const REVIEW_STATUS_STYLES: Record<string, string> = {
  completed: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-50 text-yellow-700',
  in_progress: 'bg-blue-100 text-blue-700',
  overdue: 'bg-red-100 text-red-700',
  not_started: 'bg-gray-100 text-gray-600',
};

export default function TeamPerformanceTab() {
  const [data, setData] = useState<TeamSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/performance-growth/manager/team-dashboard');
      setData(res.data?.data || res.data);
    } catch {
      setError('Failed to load team performance data.');
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
        <span className="ml-2 text-sm text-text-muted">Loading team performance...</span>
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

  const summary = {
    teamSize: 0,
    avgRating: 0,
    goalsOnTrackPercent: 0,
    pendingReviews: 0,
    members: [],
    pendingActions: [],
    ratingDistribution: [],
    ...data,
  };

  const ratingDist = Array.isArray(summary.ratingDistribution) ? summary.ratingDistribution : [];
  const maxDistCount = Math.max(...(ratingDist.map((d: any) => d.count) || [1]), 1);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text flex items-center gap-2">
          <Users className="h-5 w-5" />
          Team Performance Overview
        </h2>
        <p className="text-sm text-text-muted">View your team&apos;s performance at a glance.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-background border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-blue-500" />
            <p className="text-xs text-text-muted uppercase font-semibold">Team Size</p>
          </div>
          <p className="text-2xl font-bold text-text">{summary.teamSize}</p>
        </div>
        <div className="bg-background border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Star className="h-4 w-4 text-yellow-500" />
            <p className="text-xs text-text-muted uppercase font-semibold">Avg Rating</p>
          </div>
          <p className="text-2xl font-bold text-text">{(summary.avgRating ?? 0).toFixed(1)}</p>
        </div>
        <div className="bg-background border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-4 w-4 text-green-500" />
            <p className="text-xs text-text-muted uppercase font-semibold">Goals On Track</p>
          </div>
          <p className="text-2xl font-bold text-text">{summary.goalsOnTrackPercent}%</p>
        </div>
        <div className="bg-background border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-orange-500" />
            <p className="text-xs text-text-muted uppercase font-semibold">Pending Reviews</p>
          </div>
          <p className="text-2xl font-bold text-text">{summary.pendingReviews}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Team Members Table */}
        <div className="lg:col-span-2">
          <h3 className="text-sm font-semibold text-text mb-3">Direct Reports</h3>
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-background border-b border-border">
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Name</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Rating</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Goals</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Review</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {summary.members.map((member) => (
                  <tr key={member.id} className="bg-card hover:bg-background/50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="text-sm text-text font-medium">{member.name}</span>
                      <p className="text-xs text-text-muted">{member.designation}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Star className={`h-3.5 w-3.5 ${(member.currentRating ?? 0) >= 4 ? 'text-yellow-500' : (member.currentRating ?? 0) >= 3 ? 'text-blue-400' : 'text-gray-400'}`} />
                        <span className="text-sm text-text">{(member.currentRating ?? 0).toFixed(1)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-14 bg-gray-200 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full ${member.goalCompletionPercent >= 80 ? 'bg-green-500' : member.goalCompletionPercent >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                            style={{ width: `${member.goalCompletionPercent}%` }}
                          />
                        </div>
                        <span className="text-xs text-text-muted">{member.goalCompletionPercent}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${REVIEW_STATUS_STYLES[member.reviewStatus] || 'bg-gray-100 text-gray-600'}`}>
                        {member.reviewStatus?.replace(/_/g, ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
                {summary.members.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center">
                      <Inbox className="h-10 w-10 mx-auto mb-3 opacity-40" />
                      <p className="text-sm text-text-muted">No direct reports found.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-4">
          {/* Pending Actions */}
          <div className="bg-background border border-border rounded-xl p-4">
            <h3 className="text-sm font-semibold text-text mb-3">Pending Actions</h3>
            {summary.pendingActions.length === 0 ? (
              <p className="text-xs text-text-muted text-center py-4">No pending actions.</p>
            ) : (
              <div className="space-y-2">
                {summary.pendingActions.map((action) => (
                  <div key={action.id} className="bg-card border border-border rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        action.type === 'review' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-50 text-yellow-700'
                      }`}>
                        {action.type}
                      </span>
                      <span className="text-xs text-text font-medium">{action.employeeName}</span>
                    </div>
                    <p className="text-xs text-text-muted mt-0.5">{action.description}</p>
                    {action.dueDate && (
                      <p className="text-[10px] text-text-muted mt-0.5">Due: {new Date(action.dueDate).toLocaleDateString()}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Team Distribution */}
          <div className="bg-background border border-border rounded-xl p-4">
            <h3 className="text-sm font-semibold text-text flex items-center gap-2 mb-3">
              <TrendingUp className="h-4 w-4" />
              Rating Distribution
            </h3>
            {summary.ratingDistribution.length === 0 ? (
              <p className="text-xs text-text-muted text-center py-4">No data available.</p>
            ) : (
              <div className="space-y-2">
                {summary.ratingDistribution.map((item) => (
                  <div key={item.rating} className="flex items-center gap-2">
                    <span className="text-xs text-text-muted w-8">R{item.rating}</span>
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-primary transition-all"
                        style={{ width: `${(item.count / maxDistCount) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-text-muted w-6 text-right">{item.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
