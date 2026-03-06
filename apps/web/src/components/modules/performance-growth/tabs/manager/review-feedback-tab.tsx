'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  MessageSquare,
  Inbox,
  ChevronDown,
  ChevronUp,
  Send,
  Star,
  Clock,
} from 'lucide-react';

const inputClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary';
const selectClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary appearance-none';

interface PendingReview {
  id: string;
  employeeName: string;
  employeeId: string;
  cycleName: string;
  status: string;
  selfAssessment: {
    rating: number;
    comments: string;
    achievements: string[];
  } | null;
  managerRating: number | null;
  managerComments: string | null;
}

interface FeedbackEntry {
  id: string;
  toEmployeeName: string;
  type: string;
  category: string;
  content: string;
  createdAt: string;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  submitted: 'bg-green-100 text-green-700',
};

const FEEDBACK_TYPES = [
  { value: 'appreciation', label: 'Appreciation' },
  { value: 'constructive', label: 'Constructive' },
  { value: 'coaching', label: 'Coaching' },
  { value: 'recognition', label: 'Recognition' },
];

const FEEDBACK_CATEGORIES = [
  { value: 'work_quality', label: 'Work Quality' },
  { value: 'collaboration', label: 'Collaboration' },
  { value: 'communication', label: 'Communication' },
  { value: 'leadership', label: 'Leadership' },
  { value: 'initiative', label: 'Initiative' },
];

export default function ReviewFeedbackTab() {
  const [pendingReviews, setPendingReviews] = useState<PendingReview[]>([]);
  const [feedbackHistory, setFeedbackHistory] = useState<FeedbackEntry[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [expandedReview, setExpandedReview] = useState<string | null>(null);
  const [reviewRatings, setReviewRatings] = useState<Record<string, { rating: number; comments: string }>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Quick feedback form
  const [feedbackForm, setFeedbackForm] = useState({
    employeeId: '',
    type: 'appreciation',
    category: 'work_quality',
    content: '',
  });

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [reviewRes, feedbackRes, empRes] = await Promise.all([
        api.get('/performance-growth/manager/reviews'),
        api.get('/performance-growth/manager/feedback-history'),
        api.get('/performance-growth/manager/employees'),
      ]);
      setPendingReviews(Array.isArray(reviewRes.data) ? reviewRes.data : reviewRes.data?.data || []);
      setFeedbackHistory(Array.isArray(feedbackRes.data) ? feedbackRes.data : feedbackRes.data?.data || []);
      setEmployees(Array.isArray(empRes.data) ? empRes.data : empRes.data?.data || []);
    } catch {
      setError('Failed to load reviews and feedback.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubmitReview = async (reviewId: string) => {
    const reviewData = reviewRatings[reviewId];
    if (!reviewData || !reviewData.rating) {
      setError('Please provide a rating.');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await api.post(`/performance-growth/manager/reviews/${reviewId}/submit`, {
        managerRating: reviewData.rating,
        managerComments: reviewData.comments,
      });
      setSuccess('Review submitted successfully.');
      loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to submit review.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendFeedback = async () => {
    setError(null);
    if (!feedbackForm.employeeId || !feedbackForm.content.trim()) {
      setError('Employee and feedback content are required.');
      return;
    }
    setIsSaving(true);
    try {
      await api.post('/performance-growth/manager/feedback', feedbackForm);
      setSuccess('Feedback sent successfully.');
      setFeedbackForm({ employeeId: '', type: 'appreciation', category: 'work_quality', content: '' });
      loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to send feedback.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading reviews and feedback...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Reviews & Feedback
        </h2>
        <p className="text-sm text-text-muted">Complete pending reviews and provide continuous feedback.</p>
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

      {/* Pending Reviews */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-text flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Pending Reviews ({pendingReviews.filter((r) => r.status !== 'completed').length})
        </h3>
        {pendingReviews.length === 0 ? (
          <div className="text-center py-8">
            <Inbox className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm text-text-muted">No pending reviews.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingReviews.map((review) => (
              <div key={review.id} className="border border-border rounded-xl overflow-hidden">
                <div
                  className="bg-card px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-background/50 transition-colors"
                  onClick={() => setExpandedReview(expandedReview === review.id ? null : review.id)}
                >
                  <div className="flex items-center gap-3">
                    {expandedReview === review.id ? <ChevronUp className="h-4 w-4 text-text-muted" /> : <ChevronDown className="h-4 w-4 text-text-muted" />}
                    <div>
                      <span className="text-sm font-medium text-text">{review.employeeName}</span>
                      <span className="text-xs text-text-muted ml-2">{review.cycleName}</span>
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[review.status] || 'bg-gray-100 text-gray-600'}`}>
                    {review.status?.replace(/_/g, ' ')}
                  </span>
                </div>

                {expandedReview === review.id && (
                  <div className="px-4 py-4 border-t border-border space-y-4">
                    {/* Side-by-side: Self Assessment and Manager Review */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Self Assessment */}
                      <div className="bg-background rounded-lg p-4">
                        <h4 className="text-xs font-semibold text-text-muted uppercase mb-2">Self-Assessment</h4>
                        {review.selfAssessment ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Star className="h-3.5 w-3.5 text-yellow-500" />
                              <span className="text-sm text-text font-medium">Rating: {review.selfAssessment.rating}/5</span>
                            </div>
                            {review.selfAssessment.comments && (
                              <p className="text-xs text-text-muted">{review.selfAssessment.comments}</p>
                            )}
                            {review.selfAssessment.achievements?.length > 0 && (
                              <div>
                                <span className="text-[10px] text-text-muted uppercase font-semibold">Achievements:</span>
                                <ul className="list-disc list-inside text-xs text-text-muted mt-1">
                                  {review.selfAssessment.achievements.map((a, i) => (
                                    <li key={i}>{a}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-text-muted italic">Self-assessment not yet submitted.</p>
                        )}
                      </div>

                      {/* Manager Review Form */}
                      <div className="bg-background rounded-lg p-4">
                        <h4 className="text-xs font-semibold text-text-muted uppercase mb-2">Manager Review</h4>
                        {review.status === 'completed' ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Star className="h-3.5 w-3.5 text-yellow-500" />
                              <span className="text-sm text-text font-medium">Rating: {review.managerRating}/5</span>
                            </div>
                            {review.managerComments && (
                              <p className="text-xs text-text-muted">{review.managerComments}</p>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div>
                              <label className="block text-[10px] font-medium text-text-muted mb-1">Rating *</label>
                              <select
                                value={reviewRatings[review.id]?.rating || ''}
                                onChange={(e) => setReviewRatings((prev) => ({
                                  ...prev,
                                  [review.id]: { ...prev[review.id], rating: parseInt(e.target.value), comments: prev[review.id]?.comments || '' },
                                }))}
                                className={selectClassName}
                              >
                                <option value="">Select Rating</option>
                                {[1, 2, 3, 4, 5].map((r) => (
                                  <option key={r} value={r}>{r} - {['Unsatisfactory', 'Needs Improvement', 'Meets Expectations', 'Exceeds Expectations', 'Outstanding'][r - 1]}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] font-medium text-text-muted mb-1">Comments</label>
                              <textarea
                                value={reviewRatings[review.id]?.comments || ''}
                                onChange={(e) => setReviewRatings((prev) => ({
                                  ...prev,
                                  [review.id]: { ...prev[review.id], rating: prev[review.id]?.rating || 0, comments: e.target.value },
                                }))}
                                className={`${inputClassName} min-h-[60px]`}
                                placeholder="Manager comments..."
                                rows={3}
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => handleSubmitReview(review.id)}
                              disabled={isSaving}
                              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors"
                            >
                              {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                              Submit Review
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Feedback Form */}
      <div className="border border-border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-text flex items-center gap-2 mb-4">
          <Send className="h-4 w-4" />
          Give Quick Feedback
        </h3>
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Employee</label>
              <select value={feedbackForm.employeeId} onChange={(e) => setFeedbackForm({ ...feedbackForm, employeeId: e.target.value })} className={selectClassName}>
                <option value="">Select Employee</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Type</label>
              <select value={feedbackForm.type} onChange={(e) => setFeedbackForm({ ...feedbackForm, type: e.target.value })} className={selectClassName}>
                {FEEDBACK_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Category</label>
              <select value={feedbackForm.category} onChange={(e) => setFeedbackForm({ ...feedbackForm, category: e.target.value })} className={selectClassName}>
                {FEEDBACK_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Feedback</label>
            <textarea value={feedbackForm.content} onChange={(e) => setFeedbackForm({ ...feedbackForm, content: e.target.value })} className={`${inputClassName} min-h-[80px]`} placeholder="Write your feedback..." rows={3} />
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSendFeedback}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors"
            >
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              <Send className="h-4 w-4" />
              Send Feedback
            </button>
          </div>
        </div>
      </div>

      {/* Feedback History */}
      {feedbackHistory.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-text">Recent Feedback History</h3>
          <div className="space-y-2">
            {feedbackHistory.slice(0, 10).map((entry) => (
              <div key={entry.id} className="bg-background border border-border rounded-lg px-4 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm text-text font-medium">To: {entry.toEmployeeName}</span>
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                    entry.type === 'appreciation' || entry.type === 'recognition' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {entry.type}
                  </span>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600">
                    {entry.category?.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="text-xs text-text-muted">{entry.content}</p>
                <p className="text-[10px] text-text-muted mt-1">{new Date(entry.createdAt).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
