'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  Rocket,
  Inbox,
  Briefcase,
  Star,
  ArrowRight,
  Send,
  Award,
  Target,
  Clock,
} from 'lucide-react';

interface CareerTrack {
  id: string;
  name: string;
  type: string;
  description: string;
  levels: string[];
}

interface TargetRole {
  title: string;
  requiredSkills: string[];
  requiredExperience: string;
  currentSkillMatch: number;
}

interface GapItem {
  skill: string;
  currentLevel: string;
  requiredLevel: string;
  progressPercent: number;
}

interface InternalOpportunity {
  id: string;
  title: string;
  department: string;
  type: string;
  postedDate: string;
}

interface PromotionReadiness {
  overallScore: number;
  criteria: { name: string; met: boolean; notes: string }[];
}

interface GrowthMilestone {
  id: string;
  title: string;
  achievedDate: string;
  type: string;
}

interface CareerData {
  tracks: CareerTrack[];
  targetRole: TargetRole | null;
  gaps: GapItem[];
  opportunities: InternalOpportunity[];
  promotionReadiness: PromotionReadiness | null;
  milestones: GrowthMilestone[];
}

const TRACK_TYPE_STYLES: Record<string, string> = {
  ic: 'bg-blue-100 text-blue-700',
  management: 'bg-purple-100 text-purple-700',
  specialist: 'bg-emerald-100 text-emerald-700',
};

export default function CareerGrowthTab() {
  const [data, setData] = useState<CareerData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/performance-growth/employee/career');
      setData(res.data?.data || res.data);
    } catch {
      setError('Failed to load career growth data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRequestDiscussion = async () => {
    setIsSaving(true);
    try {
      await api.post('/performance-growth/employee/career/request-discussion');
      setSuccess('Career discussion request sent to your manager.');
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to send request.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading career growth...</span>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-center gap-2">
        <AlertCircle className="h-4 w-4 flex-shrink-0" />{error}
      </div>
    );
  }

  const career = data || {
    tracks: [],
    targetRole: null,
    gaps: [],
    opportunities: [],
    promotionReadiness: null,
    milestones: [],
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text flex items-center gap-2">
            <Rocket className="h-5 w-5" />
            Career Growth
          </h2>
          <p className="text-sm text-text-muted">Explore career paths, identify gaps, and plan your growth.</p>
        </div>
        <button
          type="button"
          onClick={handleRequestDiscussion}
          disabled={isSaving}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors"
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Request Career Discussion
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />{error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />{success}
        </div>
      )}

      {/* Career Paths */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-text flex items-center gap-2">
          <Briefcase className="h-4 w-4" />
          Available Career Tracks
        </h3>
        {career.tracks.length === 0 ? (
          <div className="text-center py-8 bg-background border border-border rounded-xl">
            <Inbox className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-xs text-text-muted">No career tracks defined yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {career.tracks.map((track) => (
              <div key={track.id} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-text">{track.name}</h4>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase ${TRACK_TYPE_STYLES[track.type] || 'bg-gray-100 text-gray-600'}`}>
                    {track.type}
                  </span>
                </div>
                {track.description && <p className="text-xs text-text-muted mb-3">{track.description}</p>}
                {track.levels?.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1">
                    {track.levels.map((level, idx) => (
                      <div key={idx} className="flex items-center gap-1">
                        <span className="text-[10px] text-text-muted bg-background px-2 py-0.5 rounded">{level}</span>
                        {idx < track.levels.length - 1 && <ArrowRight className="h-2.5 w-2.5 text-text-muted" />}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Target Role */}
        {career.targetRole && (
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-text flex items-center gap-2 mb-3">
              <Target className="h-4 w-4" />
              Target Role
            </h3>
            <p className="text-lg font-bold text-text mb-2">{career.targetRole.title}</p>
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-text-muted">Skill Match</span>
                <span className="text-xs font-medium text-text">{career.targetRole.currentSkillMatch}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${career.targetRole.currentSkillMatch >= 80 ? 'bg-green-500' : career.targetRole.currentSkillMatch >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                  style={{ width: `${career.targetRole.currentSkillMatch}%` }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <div>
                <span className="text-[10px] text-text-muted uppercase font-semibold">Required Skills:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {career.targetRole.requiredSkills.map((skill, idx) => (
                    <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700">{skill}</span>
                  ))}
                </div>
              </div>
              {career.targetRole.requiredExperience && (
                <div>
                  <span className="text-[10px] text-text-muted uppercase font-semibold">Required Experience:</span>
                  <p className="text-xs text-text-muted mt-0.5">{career.targetRole.requiredExperience}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Gap Analysis */}
        {career.gaps.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-text mb-3">Gap Analysis</h3>
            <div className="space-y-3">
              {career.gaps.map((gap, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text font-medium">{gap.skill}</span>
                    <span className="text-[10px] text-text-muted">{gap.currentLevel} → {gap.requiredLevel}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${gap.progressPercent >= 80 ? 'bg-green-500' : gap.progressPercent >= 50 ? 'bg-yellow-500' : 'bg-red-400'}`}
                      style={{ width: `${gap.progressPercent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Internal Opportunities */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-text flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            Internal Opportunities
          </h3>
          {career.opportunities.length === 0 ? (
            <div className="text-center py-6 bg-background border border-border rounded-xl">
              <Inbox className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-xs text-text-muted">No internal opportunities at this time.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {career.opportunities.map((opp) => (
                <div key={opp.id} className="bg-card border border-border rounded-lg px-4 py-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm text-text font-medium">{opp.title}</h4>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700">{opp.type}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-text-muted">
                    <span>{opp.department}</span>
                    <span>Posted: {opp.postedDate ? new Date(opp.postedDate).toLocaleDateString() : '--'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Promotion Readiness */}
        {career.promotionReadiness && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-text flex items-center gap-2">
              <Star className="h-4 w-4" />
              Promotion Readiness
            </h3>
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="relative w-16 h-16">
                  <svg className="w-full h-full" viewBox="0 0 36 36">
                    <path
                      d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#e5e7eb"
                      strokeWidth="3"
                    />
                    <path
                      d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      className={career.promotionReadiness.overallScore >= 80 ? 'text-green-500' : career.promotionReadiness.overallScore >= 50 ? 'text-yellow-500' : 'text-red-400'}
                      strokeWidth="3"
                      strokeDasharray={`${career.promotionReadiness.overallScore}, 100`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-bold text-text">{career.promotionReadiness.overallScore}%</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-text">
                    {career.promotionReadiness.overallScore >= 80 ? 'Ready for Promotion' : career.promotionReadiness.overallScore >= 50 ? 'Getting Close' : 'Work In Progress'}
                  </p>
                  <p className="text-xs text-text-muted">
                    {career.promotionReadiness.criteria.filter((c) => c.met).length} of {career.promotionReadiness.criteria.length} criteria met
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                {career.promotionReadiness.criteria.map((criterion, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    {criterion.met ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border-2 border-gray-300 flex-shrink-0 mt-0.5" />
                    )}
                    <div>
                      <span className={`text-xs ${criterion.met ? 'text-text' : 'text-text-muted'}`}>{criterion.name}</span>
                      {criterion.notes && <p className="text-[10px] text-text-muted">{criterion.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Growth Milestones Timeline */}
      {career.milestones.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-text flex items-center gap-2">
            <Award className="h-4 w-4" />
            Growth Milestones
          </h3>
          <div className="relative pl-6">
            <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-border" />
            <div className="space-y-4">
              {career.milestones.map((milestone) => (
                <div key={milestone.id} className="relative">
                  <div className="absolute -left-4 top-1 w-3 h-3 rounded-full bg-primary border-2 border-white" />
                  <div className="bg-card border border-border rounded-lg px-4 py-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-text font-medium">{milestone.title}</span>
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary capitalize">{milestone.type}</span>
                    </div>
                    <span className="text-[10px] text-text-muted flex items-center gap-1 mt-0.5">
                      <Clock className="h-2.5 w-2.5" />
                      {milestone.achievedDate ? new Date(milestone.achievedDate).toLocaleDateString() : '--'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
