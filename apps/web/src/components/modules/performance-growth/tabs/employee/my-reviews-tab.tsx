'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  ClipboardCheck,
  Inbox,
  Eye,
  X,
  Send,
  Calendar,
  TrendingUp,
} from 'lucide-react';

const inputClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary';

interface ReviewPhase {
  name: string;
  status: string;
}

interface CurrentReviewStatus {
  cycleName: string;
  currentPhase: string;
  timelineProgress: number;
  phases: ReviewPhase[];
}

interface CompletedReview {
  id: string;
  cycleName: string;
  finalRating: number;
  selfRating: number;
  managerRating: number;
  managerComments: string;
  completedAt: string;
  isAcknowledged: boolean;
  hasAppeal: boolean;
}

interface YoyTrend {
  year: string;
  rating: number;
}

const PHASE_STYLES: Record<string, string> = {
  completed: 'bg-green-500',
  active: 'bg-blue-500',
  pending: 'bg-gray-300',
};

export default function MyReviewsTab() {
  const [currentStatus, setCurrentStatus] = useState<CurrentReviewStatus | null>(null);
  const [completedReviews, setCompletedReviews] = useState<CompletedReview[]>([]);
  const [yoyTrend, setYoyTrend] = useState<YoyTrend[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Detail modal
  const [detailReview, setDetailReview] = useState<CompletedReview | null>(null);

  // Appeal modal
  const [showAppealModal, setShowAppealModal] = useState(false);
  const [appealReviewId, setAppealReviewId] = useState<string | null>(null);
  const [appealReason, setAppealReason] = useState('');

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [statusRes, historyRes, trendRes] = await Promise.all([
        api.get('/performance-growth/employee/my-reviews/current'),
        api.get('/performance-growth/employee/my-reviews/history'),
        api.get('/performance-growth/employee/my-reviews/trend'),
      ]);
      setCurrentStatus(statusRes.data?.data || statusRes.data);
      setCompletedReviews(Array.isArray(historyRes.data) ? historyRes.data : historyRes.data?.data || []);
      setYoyTrend(Array.isArray(trendRes.data) ? trendRes.data : trendRes.data?.data || []);
    } catch {
      setError('Failed to load review data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAcknowledge = async (reviewId: string) => {
    setIsSaving(true);
    try {
      await api.patch(`/performance-growth/employee/my-reviews/${reviewId}/acknowledge`);
      setSuccess('Review acknowledged.');
      setDetailReview(null);
      loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to acknowledge review.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAppeal = async () => {
    if (!appealReviewId || !appealReason.trim()) {
      setError('Please provide a reason for the appeal.');
      return;
    }
    setIsSaving(true);
    try {
      await api.post(`/performance-growth/employee/my-reviews/${appealReviewId}/appeal`, {
        reason: appealReason,
      });
      setSuccess('Appeal submitted.');
      setShowAppealModal(false);
      setAppealReviewId(null);
      setAppealReason('');
      loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to submit appeal.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading reviews...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5" />
          My Reviews
        </h2>
        <p className="text-sm text-text-muted">Track your review status and view completed reviews.</p>
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

      {/* Current Review Status */}
      {currentStatus && (
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-text">{currentStatus.cycleName}</h3>
            <span className="text-xs text-text-muted capitalize">Current: {currentStatus.currentPhase?.replace(/_/g, ' ')}</span>
          </div>
          {/* Timeline Progress */}
          <div className="mb-3">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${currentStatus.timelineProgress || 0}%` }} />
            </div>
          </div>
          {/* Phases */}
          {currentStatus.phases?.length > 0 && (
            <div className="flex items-center gap-1">
              {currentStatus.phases.map((phase, idx) => (
                <div key={idx} className="flex items-center gap-1">
                  <div className={`w-3 h-3 rounded-full ${PHASE_STYLES[phase.status] || 'bg-gray-300'}`} />
                  <span className={`text-[10px] ${phase.status === 'active' ? 'text-text font-medium' : 'text-text-muted'}`}>
                    {phase.name}
                  </span>
                  {idx < currentStatus.phases.length - 1 && (
                    <div className="w-6 h-0.5 bg-gray-200 mx-1" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Completed Reviews */}
        <div className="lg:col-span-2 space-y-3">
          <h3 className="text-sm font-semibold text-text">Review History</h3>
          {completedReviews.length === 0 ? (
            <div className="text-center py-8">
              <Inbox className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm text-text-muted">No completed reviews yet.</p>
            </div>
          ) : (
            <div className="border border-border rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-background border-b border-border">
                    <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Cycle</th>
                    <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Rating</th>
                    <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Date</th>
                    <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Status</th>
                    <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {completedReviews.map((review) => (
                    <tr key={review.id} className="bg-card hover:bg-background/50 transition-colors">
                      <td className="px-4 py-3 text-sm text-text font-medium">{review.cycleName}</td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-bold ${review.finalRating >= 4 ? 'text-green-600' : review.finalRating >= 3 ? 'text-blue-600' : 'text-yellow-600'}`}>
                          {review.finalRating.toFixed(1)}/5
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-text-muted">{new Date(review.completedAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        {review.isAcknowledged ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Acknowledged</span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700">Pending Ack</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => setDetailReview(review)} className="p-1 text-text-muted hover:text-primary transition-colors" title="View Details">
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          {!review.hasAppeal && review.isAcknowledged && (
                            <button type="button" onClick={() => { setAppealReviewId(review.id); setAppealReason(''); setShowAppealModal(true); }} className="p-1 text-text-muted hover:text-orange-600 transition-colors" title="Appeal">
                              <Send className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Year-over-Year Trend */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-text flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Rating Trend
          </h3>
          {yoyTrend.length === 0 ? (
            <div className="text-center py-8 bg-background border border-border rounded-xl">
              <Calendar className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-xs text-text-muted">Not enough data for trend.</p>
            </div>
          ) : (
            <div className="bg-background border border-border rounded-xl p-4 space-y-3">
              {yoyTrend.map((entry, idx) => (
                <div key={entry.year} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text font-medium">{entry.year}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-text">{entry.rating.toFixed(1)}</span>
                      {idx > 0 && (
                        <span className={`text-[10px] font-medium ${entry.rating >= yoyTrend[idx - 1].rating ? 'text-green-600' : 'text-red-600'}`}>
                          {entry.rating >= yoyTrend[idx - 1].rating ? '+' : ''}{(entry.rating - yoyTrend[idx - 1].rating).toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${(entry.rating / 5) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Review Detail Modal */}
      {detailReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-card border border-border rounded-xl shadow-lg p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text">Review Details - {detailReview.cycleName}</h3>
              <button type="button" onClick={() => setDetailReview(null)} className="text-text-muted hover:text-text">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-background rounded-lg p-3 text-center">
                  <p className="text-[10px] text-text-muted uppercase font-semibold">Self Rating</p>
                  <p className="text-lg font-bold text-text">{detailReview.selfRating.toFixed(1)}</p>
                </div>
                <div className="bg-background rounded-lg p-3 text-center">
                  <p className="text-[10px] text-text-muted uppercase font-semibold">Manager Rating</p>
                  <p className="text-lg font-bold text-text">{detailReview.managerRating.toFixed(1)}</p>
                </div>
                <div className="bg-primary/10 rounded-lg p-3 text-center border border-primary/20">
                  <p className="text-[10px] text-primary uppercase font-semibold">Final Rating</p>
                  <p className="text-lg font-bold text-primary">{detailReview.finalRating.toFixed(1)}</p>
                </div>
              </div>

              {detailReview.managerComments && (
                <div>
                  <h4 className="text-xs font-semibold text-text-muted uppercase mb-1">Manager Comments</h4>
                  <p className="text-sm text-text bg-background rounded-lg p-3">{detailReview.managerComments}</p>
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-text-muted">
                <span>Completed: {new Date(detailReview.completedAt).toLocaleDateString()}</span>
                {detailReview.hasAppeal && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-orange-100 text-orange-700">Appeal Filed</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6">
              {!detailReview.isAcknowledged && (
                <button type="button" onClick={() => handleAcknowledge(detailReview.id)} disabled={isSaving} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors">
                  {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Acknowledge
                </button>
              )}
              <button type="button" onClick={() => setDetailReview(null)} className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Appeal Modal */}
      {showAppealModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-card border border-border rounded-xl shadow-lg p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text">File Review Appeal</h3>
              <button type="button" onClick={() => setShowAppealModal(false)} className="text-text-muted hover:text-text">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Reason for Appeal *</label>
                <textarea value={appealReason} onChange={(e) => setAppealReason(e.target.value)} className={`${inputClassName} min-h-[100px]`} placeholder="Explain why you disagree with the review outcome..." rows={4} />
              </div>
            </div>
            <div className="flex items-center gap-3 mt-6">
              <button type="button" onClick={handleAppeal} disabled={isSaving} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors">
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                Submit Appeal
              </button>
              <button type="button" onClick={() => setShowAppealModal(false)} className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
