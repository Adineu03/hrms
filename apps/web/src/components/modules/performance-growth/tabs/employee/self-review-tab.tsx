'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  FileEdit,
  Inbox,
  Calendar,
  Plus,
  Trash2,
  Save,
  Send,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

const inputClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary';
const selectClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary appearance-none';

interface CompetencyRating {
  competencyId: string;
  competencyName: string;
  rating: number | string;
}

interface CurrentReview {
  id: string;
  cycleName: string;
  cycleId: string;
  deadline: string;
  status: string;
  ratingScale: string;
  selfRating: number | string | null;
  selfComments: string;
  achievements?: string[];
  competencyRatings?: CompetencyRating[];
}

interface PreviousReview {
  id: string;
  cycleName: string;
  selfRating: number | string;
  finalRating: number | string;
  submittedAt: string;
  comments: string;
}

const STATUS_STYLES: Record<string, string> = {
  not_started: 'bg-gray-100 text-gray-600',
  draft: 'bg-yellow-50 text-yellow-700',
  submitted: 'bg-green-100 text-green-700',
  completed: 'bg-blue-100 text-blue-700',
};

export default function SelfReviewTab() {
  const [currentReview, setCurrentReview] = useState<CurrentReview | null>(null);
  const [previousReviews, setPreviousReviews] = useState<PreviousReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [selfRating, setSelfRating] = useState<number>(0);
  const [selfComments, setSelfComments] = useState('');
  const [achievements, setAchievements] = useState<string[]>(['']);
  const [competencyRatings, setCompetencyRatings] = useState<Record<string, number>>({});
  const [showPrevious, setShowPrevious] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [currentRes, prevRes] = await Promise.all([
        api.get('/performance-growth/employee/self-review').catch(() => ({ data: null })),
        api.get('/performance-growth/employee/self-review/previous').catch(() => ({ data: [] })),
      ]);
      const current = currentRes.data?.data || currentRes.data;
      setCurrentReview(current);
      const prevData = prevRes.data?.data ?? prevRes.data;
      setPreviousReviews(Array.isArray(prevData) ? prevData : []);

      if (current) {
        setSelfRating(Math.round(Number(current.selfRating) || 0));
        setSelfComments(current.selfComments || '');
        setAchievements(Array.isArray(current.achievements) && current.achievements.length > 0 ? current.achievements : ['']);
        const compRatings: Record<string, number> = {};
        // competencyRatings may arrive as an object map {} instead of an array — guard before forEach.
        if (Array.isArray(current.competencyRatings)) {
          current.competencyRatings.forEach((cr: CompetencyRating) => {
            compRatings[cr.competencyId] = Number(cr.rating) || 0;
          });
        }
        setCompetencyRatings(compRatings);
      }
    } catch {
      setError('Failed to load self-review data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveDraft = async () => {
    if (!currentReview) return;
    setIsSaving(true);
    setError(null);
    try {
      await api.patch(`/performance-growth/employee/self-review/${currentReview.id}`, {
        selfRating,
        selfComments,
        achievements: achievements.filter((a) => a.trim()),
        competencyRatings: Object.entries(competencyRatings).map(([id, rating]) => ({
          competencyId: id,
          rating,
        })),
      });
      setSuccess('Draft saved.');
      loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to save draft.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!currentReview) return;
    if (!selfRating) {
      setError('Please provide your self-rating.');
      return;
    }
    if (!confirm('Are you sure you want to submit? You will not be able to edit after submission.')) return;
    setIsSaving(true);
    setError(null);
    try {
      await api.post(`/performance-growth/employee/self-review/${currentReview.id}/submit`, {
        selfRating,
        selfComments,
        achievements: achievements.filter((a) => a.trim()),
        competencyRatings: Object.entries(competencyRatings).map(([id, rating]) => ({
          competencyId: id,
          rating,
        })),
      });
      setSuccess('Self-review submitted successfully.');
      loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to submit self-review.');
    } finally {
      setIsSaving(false);
    }
  };

  const addAchievement = () => setAchievements((prev) => [...prev, '']);
  const removeAchievement = (index: number) => setAchievements((prev) => prev.filter((_, i) => i !== index));
  const updateAchievement = (index: number, value: string) => {
    setAchievements((prev) => prev.map((a, i) => (i === index ? value : a)));
  };

  const ratingOptions = currentReview?.ratingScale === '1-10'
    ? Array.from({ length: 10 }, (_, i) => i + 1)
    : [1, 2, 3, 4, 5];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading self-review...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text flex items-center gap-2">
          <FileEdit className="h-5 w-5" />
          Self-Review
        </h2>
        <p className="text-sm text-text-muted">Complete your self-assessment for the current review cycle.</p>
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

      {!currentReview ? (
        <div className="text-center py-12">
          <Inbox className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm text-text-muted">No active review cycle. Self-review will be available when a cycle is launched.</p>
        </div>
      ) : (
        <>
          {/* Cycle Info Card */}
          <div className="bg-background border border-border rounded-xl p-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-text">{currentReview.cycleName}</h3>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-text-muted flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Deadline: {currentReview.deadline ? new Date(currentReview.deadline).toLocaleDateString() : '--'}
                </span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[currentReview.status] || 'bg-gray-100 text-gray-600'}`}>
                  {currentReview.status?.replace(/_/g, ' ')}
                </span>
              </div>
            </div>
          </div>

          {/* Self-Review Form */}
          {currentReview.status !== 'submitted' && currentReview.status !== 'completed' ? (
            <div className="space-y-5">
              {/* Rating */}
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Overall Self-Rating *</label>
                <select value={selfRating} onChange={(e) => setSelfRating(parseInt(e.target.value))} className={`${selectClassName} !w-40`}>
                  <option value={0}>Select Rating</option>
                  {ratingOptions.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              {/* Comments */}
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Comments</label>
                <textarea value={selfComments} onChange={(e) => setSelfComments(e.target.value)} className={`${inputClassName} min-h-[100px]`} placeholder="Describe your performance during this period..." rows={4} />
              </div>

              {/* Achievements */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-medium text-text-muted">Key Achievements</label>
                  <button type="button" onClick={addAchievement} className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-primary text-white hover:bg-primary-hover transition-colors">
                    <Plus className="h-3 w-3" />
                    Add
                  </button>
                </div>
                <div className="space-y-2">
                  {achievements.map((achievement, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input type="text" value={achievement} onChange={(e) => updateAchievement(index, e.target.value)} className={inputClassName} placeholder={`Achievement ${index + 1}`} />
                      {achievements.length > 1 && (
                        <button type="button" onClick={() => removeAchievement(index)} className="text-text-muted hover:text-red-600 transition-colors flex-shrink-0">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Competency Ratings */}
              {Array.isArray(currentReview.competencyRatings) && currentReview.competencyRatings.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-2">Competency Self-Ratings</label>
                  <div className="space-y-2">
                    {currentReview.competencyRatings.map((cr) => (
                      <div key={cr.competencyId} className="flex items-center justify-between bg-background rounded-lg px-3 py-2">
                        <span className="text-sm text-text">{cr.competencyName}</span>
                        <select
                          value={competencyRatings[cr.competencyId] || 0}
                          onChange={(e) => setCompetencyRatings((prev) => ({ ...prev, [cr.competencyId]: parseInt(e.target.value) }))}
                          className={`${selectClassName} !w-24`}
                        >
                          <option value={0}>Rate</option>
                          {ratingOptions.map((r) => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3">
                <button type="button" onClick={handleSaveDraft} disabled={isSaving} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-border text-text hover:bg-background disabled:opacity-50 transition-colors">
                  {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                  <Save className="h-4 w-4" />
                  Save Draft
                </button>
                <button type="button" onClick={handleSubmit} disabled={isSaving} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors">
                  {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                  <Send className="h-4 w-4" />
                  Submit Review
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-700">
                <CheckCircle2 className="h-5 w-5 inline mr-2" />
                Your self-review has been submitted and is now read-only.
              </div>

              {/* Read-only summary */}
              <div className="bg-card border border-border rounded-xl p-4 space-y-4">
                <div>
                  <p className="text-xs font-medium text-text-muted uppercase">Overall Self-Rating</p>
                  <p className="text-2xl font-bold text-text mt-1">
                    {Number(currentReview.selfRating) || 0}
                    <span className="text-sm font-medium text-text-muted">/{currentReview.ratingScale === '1-10' ? 10 : 5}</span>
                  </p>
                </div>
                {currentReview.selfComments && (
                  <div>
                    <p className="text-xs font-medium text-text-muted uppercase mb-1">Comments</p>
                    <p className="text-sm text-text">{currentReview.selfComments}</p>
                  </div>
                )}
                {Array.isArray(currentReview.achievements) && currentReview.achievements.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-text-muted uppercase mb-1">Key Achievements</p>
                    <ul className="space-y-1">
                      {currentReview.achievements.map((achievement, idx) => (
                        <li key={idx} className="text-sm text-text flex items-start gap-2">
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-600 mt-0.5 flex-shrink-0" />
                          {achievement}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Previous Reviews */}
      {previousReviews.length > 0 && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setShowPrevious(!showPrevious)}
            className="text-sm font-semibold text-text flex items-center gap-2"
          >
            {showPrevious ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            Previous Self-Reviews ({previousReviews.length})
          </button>
          {showPrevious && (
            <div className="space-y-2">
              {previousReviews.map((review) => (
                <div key={review.id} className="bg-background border border-border rounded-lg px-4 py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text font-medium">{review.cycleName}</span>
                    <span className="text-xs text-text-muted">{new Date(review.submittedAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-text-muted">
                    <span>Self: {Number(review.selfRating) || 0}/5</span>
                    <span>Final: {Number(review.finalRating) || 0}/5</span>
                  </div>
                  {review.comments && <p className="text-xs text-text-muted mt-1">{review.comments}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
