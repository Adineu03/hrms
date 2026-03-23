'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { Heart, Loader2, AlertCircle, Inbox } from 'lucide-react';

interface WellnessParticipation {
  id: string;
  employeeName: string;
  programName: string;
  programType: string;
  status: string;
  progress: number;
  enrolledAt: string;
}

interface Recommendation {
  id: string;
  title: string;
  description: string;
  priority: string;
}

interface TeamWellnessData {
  participationRate: number;
  activePrograms: number;
  participations: WellnessParticipation[];
  recommendations: Recommendation[];
}

export default function TeamWellnessTab() {
  const [data, setData] = useState<TeamWellnessData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [wellnessRes, stressRes] = await Promise.all([
        api.get('/engagement-culture/manager/team-wellness').catch(() => ({ data: {} })),
        api.get('/engagement-culture/manager/team-wellness/stress-indicators').catch(() => ({ data: {} })),
      ]);

      const wellness = wellnessRes.data?.data || wellnessRes.data || {};
      const stress = stressRes.data?.data || stressRes.data || {};

      setData({
        participationRate: wellness.participationRate || 0,
        activePrograms: wellness.activePrograms || 0,
        participations: Array.isArray(wellness.participations) ? wellness.participations : [],
        recommendations: Array.isArray(stress.recommendations) ? stress.recommendations : Array.isArray(wellness.recommendations) ? wellness.recommendations : [],
      });
    } catch {
      setError('Failed to load team wellness data.');
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
        <Heart className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-text">Team Wellness Overview</h2>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <div className="bg-background rounded-xl border border-border p-5">
          <p className="text-sm text-text-muted mb-1">Participation Rate</p>
          <p className="text-2xl font-bold text-text">{data?.participationRate || 0}%</p>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div
              className={`h-2 rounded-full ${(data?.participationRate || 0) >= 70 ? 'bg-green-500' : (data?.participationRate || 0) >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
              style={{ width: `${Math.min(data?.participationRate || 0, 100)}%` }}
            />
          </div>
        </div>
        <div className="bg-background rounded-xl border border-border p-5">
          <p className="text-sm text-text-muted mb-1">Active Programs</p>
          <p className="text-2xl font-bold text-text">{data?.activePrograms || 0}</p>
        </div>
      </div>

      {/* Team Wellness Participation */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-text uppercase tracking-wider mb-3">Team Wellness Participation</h3>
        {(!data?.participations || data.participations.length === 0) ? (
          <div className="text-center py-12">
            <Inbox className="h-10 w-10 text-text-muted mx-auto mb-3" />
            <p className="text-text-muted text-sm">No wellness participation data available.</p>
          </div>
        ) : (
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-background">
                <tr>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Employee</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Program</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Type</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Progress</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.participations.map((p) => (
                  <tr key={p.id} className="hover:bg-background/50">
                    <td className="px-4 py-3 text-sm text-text font-medium">{p.employeeName}</td>
                    <td className="px-4 py-3 text-sm text-text-muted">{p.programName}</td>
                    <td className="px-4 py-3 text-sm text-text-muted capitalize">{p.programType?.replace('-', ' ') || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className="h-2 rounded-full bg-primary"
                            style={{ width: `${Math.min(p.progress || 0, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-text-muted">{p.progress || 0}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        p.status === 'active' ? 'bg-green-100 text-green-700' : p.status === 'completed' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recommendations */}
      <div>
        <h3 className="text-sm font-semibold text-text uppercase tracking-wider mb-3">Recommendations</h3>
        {(!data?.recommendations || data.recommendations.length === 0) ? (
          <div className="text-center py-8">
            <Inbox className="h-8 w-8 text-text-muted mx-auto mb-2" />
            <p className="text-text-muted text-sm">No recommendations at this time.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.recommendations.map((rec) => (
              <div key={rec.id} className="bg-background rounded-lg border border-border p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-text mb-1">{rec.title}</h4>
                    <p className="text-sm text-text-muted">{rec.description}</p>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium shrink-0 ml-4 ${
                    rec.priority === 'high' ? 'bg-red-100 text-red-700' : rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                  }`}>
                    {rec.priority}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
