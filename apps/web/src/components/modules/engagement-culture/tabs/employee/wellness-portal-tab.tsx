'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Flower2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Inbox,
} from 'lucide-react';

interface WellnessProgram {
  id: string;
  name: string;
  type: string;
  description: string;
  startDate: string;
  endDate: string;
  maxParticipants: number;
  participantsCount: number;
  isEnrolled: boolean;
}

interface MyParticipation {
  id: string;
  programName: string;
  programType: string;
  progress: number;
  enrolledAt: string;
  status: string;
}

interface WellnessPortalData {
  programs: WellnessProgram[];
  participations: MyParticipation[];
  wellnessPoints: number;
}

export default function WellnessPortalTab() {
  const [data, setData] = useState<WellnessPortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [programsRes, participationsRes, pointsRes] = await Promise.all([
        api.get('/engagement-culture/employee/wellness/programs'),
        api.get('/engagement-culture/employee/wellness/my-participations'),
        api.get('/engagement-culture/employee/wellness/points'),
      ]);

      const programs = Array.isArray(programsRes.data) ? programsRes.data : programsRes.data?.data || [];
      const participations = Array.isArray(participationsRes.data) ? participationsRes.data : participationsRes.data?.data || [];
      const pointsData = pointsRes.data?.data || pointsRes.data || {};

      setData({
        programs,
        participations,
        wellnessPoints: pointsData.points || pointsData.wellnessPoints || 0,
      });
    } catch {
      setError('Failed to load wellness data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleEnroll = async (programId: string) => {
    try {
      setError('');
      await api.post(`/engagement-culture/employee/wellness/enroll`, { programId });
      setSuccess('Enrolled in program successfully.');
      loadData();
    } catch {
      setError('Failed to enroll in program.');
    }
  };

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(''), 3000);
      return () => clearTimeout(t);
    }
  }, [success]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
      </div>
    );
  }

  if (error && !data) {
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
        <Flower2 className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-text">Wellness Portal</h2>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-3 mb-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {success}
        </div>
      )}

      {/* Wellness Points */}
      <div className="bg-background rounded-xl border border-border p-6 mb-8">
        <p className="text-sm text-text-muted mb-1">My Wellness Points</p>
        <p className="text-3xl font-bold text-text">{data?.wellnessPoints || 0}</p>
        <p className="text-xs text-text-muted mt-1">Earned from program participation and activities</p>
      </div>

      {/* My Participations */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-text uppercase tracking-wider mb-3">My Participations</h3>
        {(!data?.participations || data.participations.length === 0) ? (
          <div className="text-center py-8">
            <Inbox className="h-8 w-8 text-text-muted mx-auto mb-2" />
            <p className="text-text-muted text-sm">You haven&apos;t enrolled in any wellness programs yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.participations.map((p) => (
              <div key={p.id} className="bg-background rounded-xl border border-border p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="text-sm font-medium text-text">{p.programName}</h4>
                    <span className="text-xs text-text-muted capitalize">{p.programType?.replace('-', ' ') || '—'}</span>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    p.status === 'active' ? 'bg-green-100 text-green-700' : p.status === 'completed' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {p.status}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-gray-200 rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full ${p.progress >= 100 ? 'bg-green-500' : 'bg-primary'}`}
                      style={{ width: `${Math.min(p.progress || 0, 100)}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-text">{p.progress || 0}%</span>
                </div>
                <p className="text-xs text-text-muted mt-2">
                  Enrolled: {p.enrolledAt ? new Date(p.enrolledAt).toLocaleDateString() : '—'}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Available Programs */}
      <div>
        <h3 className="text-sm font-semibold text-text uppercase tracking-wider mb-3">Available Programs</h3>
        {(!data?.programs || data.programs.length === 0) ? (
          <div className="text-center py-12">
            <Inbox className="h-10 w-10 text-text-muted mx-auto mb-3" />
            <p className="text-text-muted text-sm">No wellness programs available at this time.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.programs.map((program) => (
              <div key={program.id} className="bg-background rounded-xl border border-border p-5">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="text-sm font-semibold text-text">{program.name}</h4>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 capitalize">
                    {program.type?.replace('-', ' ') || '—'}
                  </span>
                </div>
                <p className="text-sm text-text-muted mb-3">{program.description || 'No description available.'}</p>
                <div className="flex items-center gap-4 text-xs text-text-muted mb-3">
                  {program.startDate && (
                    <span>Starts: {new Date(program.startDate).toLocaleDateString()}</span>
                  )}
                  {program.endDate && (
                    <span>Ends: {new Date(program.endDate).toLocaleDateString()}</span>
                  )}
                  <span>
                    {program.participantsCount || 0}{program.maxParticipants ? ` / ${program.maxParticipants}` : ''} enrolled
                  </span>
                </div>
                {program.isEnrolled ? (
                  <span className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-green-600 border border-green-300 rounded-lg bg-green-50">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Enrolled
                  </span>
                ) : (
                  <button
                    onClick={() => handleEnroll(program.id)}
                    className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors"
                  >
                    Enroll
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
