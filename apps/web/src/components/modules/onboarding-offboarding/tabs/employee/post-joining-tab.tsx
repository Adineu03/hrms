'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  HeartHandshake,
  Inbox,
  Calendar,
  MessageSquare,
  GraduationCap,
  Monitor,
  Heart,
  X,
} from 'lucide-react';

const inputClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary';
const selectClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary appearance-none';

interface CheckIn {
  id: string;
  type: string;
  dueDate: string;
  status: string;
  completedDate: string | null;
  feedback: string | null;
}

interface BenefitStatus {
  id: string;
  benefitName: string;
  status: string;
  enrolledDate: string | null;
}

interface SupportRequest {
  id: string;
  type: string;
  subject: string;
  status: string;
  createdAt: string;
}

interface CompanyEvent {
  id: string;
  title: string;
  date: string;
  type: string;
  description: string;
}

interface PostJoiningData {
  checkIns: CheckIn[];
  benefits: BenefitStatus[];
  supportRequests: SupportRequest[];
  upcomingEvents: CompanyEvent[];
}

const CHECKIN_STYLES: Record<string, string> = {
  completed: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-50 text-yellow-700',
  overdue: 'bg-red-100 text-red-700',
  upcoming: 'bg-blue-100 text-blue-700',
};

const BENEFIT_STYLES: Record<string, string> = {
  enrolled: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-50 text-yellow-700',
  not_eligible: 'bg-gray-100 text-gray-600',
};

const REQUEST_STATUS_STYLES: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-50 text-yellow-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-600',
};

type FormType = 'feedback' | 'training' | 'it_support' | null;

export default function PostJoiningTab() {
  const [data, setData] = useState<PostJoiningData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [showForm, setShowForm] = useState<FormType>(null);
  const [feedbackCheckInId, setFeedbackCheckInId] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [requestForm, setRequestForm] = useState({ type: 'training', subject: '', description: '' });
  const [isSaving, setIsSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/onboarding-offboarding/employee/post-joining');
      setData(res.data?.data || res.data);
    } catch {
      setError('Failed to load post-joining support data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubmitFeedback = async () => {
    if (!feedbackCheckInId || !feedbackText.trim()) {
      setError('Please provide feedback.');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await api.patch(`/onboarding-offboarding/employee/post-joining/check-ins/${feedbackCheckInId}/feedback`, {
        feedback: feedbackText,
      });
      setSuccess('Feedback submitted.');
      setShowForm(null);
      setFeedbackCheckInId(null);
      setFeedbackText('');
      loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to submit feedback.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitRequest = async () => {
    if (!requestForm.subject.trim()) {
      setError('Subject is required.');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await api.post('/onboarding-offboarding/employee/post-joining/support-requests', requestForm);
      setSuccess('Request submitted.');
      setShowForm(null);
      setRequestForm({ type: 'training', subject: '', description: '' });
      loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to submit request.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading post-joining support...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <Inbox className="h-10 w-10 mx-auto mb-3 opacity-40" />
        <p className="text-sm text-text-muted">No post-joining data available.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-text flex items-center gap-2">
          <HeartHandshake className="h-5 w-5" />
          Post-Joining Support
        </h2>
        <p className="text-sm text-text-muted">30-60-90 day check-ins, benefits status, and support resources.</p>
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

      {/* 30-60-90 Day Check-Ins */}
      <div>
        <h3 className="text-sm font-semibold text-text flex items-center gap-2 mb-3">
          <Calendar className="h-4 w-4" />
          Check-In Schedule
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(data.checkIns || []).map((checkIn) => (
            <div key={checkIn.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-text capitalize">{checkIn.type.replace(/_/g, ' ')}</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${CHECKIN_STYLES[checkIn.status] || 'bg-gray-100 text-gray-600'}`}>
                  {checkIn.status}
                </span>
              </div>
              <p className="text-xs text-text-muted mb-2">
                Due: {checkIn.dueDate ? new Date(checkIn.dueDate).toLocaleDateString() : '--'}
              </p>
              {checkIn.feedback && (
                <p className="text-xs text-text bg-background rounded p-2 mb-2">{checkIn.feedback}</p>
              )}
              {checkIn.status === 'pending' && (
                <button
                  type="button"
                  onClick={() => {
                    setFeedbackCheckInId(checkIn.id);
                    setFeedbackText('');
                    setShowForm('feedback');
                  }}
                  className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary-hover font-medium transition-colors"
                >
                  <MessageSquare className="h-3 w-3" />
                  Submit Feedback
                </button>
              )}
            </div>
          ))}
          {(data.checkIns || []).length === 0 && (
            <div className="col-span-3 text-center py-6">
              <Calendar className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-xs text-text-muted">No check-ins scheduled yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-sm font-semibold text-text mb-3">Quick Actions</h3>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => { setRequestForm({ type: 'training', subject: '', description: '' }); setShowForm('training'); }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-border text-text hover:bg-background transition-colors"
          >
            <GraduationCap className="h-3.5 w-3.5" />
            Request Training
          </button>
          <button
            type="button"
            onClick={() => { setRequestForm({ type: 'it_support', subject: '', description: '' }); setShowForm('it_support'); }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-border text-text hover:bg-background transition-colors"
          >
            <Monitor className="h-3.5 w-3.5" />
            IT Support
          </button>
        </div>
      </div>

      {/* Benefits Status */}
      {(data.benefits || []).length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-text flex items-center gap-2 mb-3">
            <Heart className="h-4 w-4" />
            Benefits Status
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {data.benefits.map((benefit) => (
              <div key={benefit.id} className="bg-card border border-border rounded-lg px-4 py-3 flex items-center justify-between">
                <div>
                  <span className="text-sm text-text font-medium">{benefit.benefitName}</span>
                  {benefit.enrolledDate && (
                    <p className="text-[10px] text-text-muted">Enrolled: {new Date(benefit.enrolledDate).toLocaleDateString()}</p>
                  )}
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${BENEFIT_STYLES[benefit.status] || 'bg-gray-100 text-gray-600'}`}>
                  {benefit.status.replace(/_/g, ' ')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Support Requests */}
      {(data.supportRequests || []).length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-text mb-3">Your Support Requests</h3>
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-background border-b border-border">
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Type</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Subject</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Date</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.supportRequests.map((req) => (
                  <tr key={req.id} className="bg-card hover:bg-background/50 transition-colors">
                    <td className="px-4 py-3 text-sm text-text-muted capitalize">{req.type.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3 text-sm text-text font-medium">{req.subject}</td>
                    <td className="px-4 py-3 text-sm text-text-muted">{new Date(req.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${REQUEST_STATUS_STYLES[req.status] || 'bg-gray-100 text-gray-600'}`}>
                        {req.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Upcoming Events */}
      {(data.upcomingEvents || []).length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-text flex items-center gap-2 mb-3">
            <Calendar className="h-4 w-4" />
            Upcoming Company Events
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {data.upcomingEvents.map((event) => (
              <div key={event.id} className="bg-card border border-border rounded-lg px-4 py-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-text">{event.title}</span>
                  <span className="text-[10px] text-text-muted capitalize bg-background px-2 py-0.5 rounded">{event.type}</span>
                </div>
                <p className="text-xs text-text-muted">{new Date(event.date).toLocaleDateString()}</p>
                {event.description && <p className="text-xs text-text-muted mt-1">{event.description}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {showForm === 'feedback' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-card border border-border rounded-xl shadow-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text">Submit Check-In Feedback</h3>
              <button type="button" onClick={() => { setShowForm(null); setFeedbackCheckInId(null); }} className="text-text-muted hover:text-text">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Your Feedback *</label>
                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  className={`${inputClassName} min-h-[100px]`}
                  placeholder="How has your experience been so far? Any challenges or suggestions?"
                  rows={4}
                />
              </div>
            </div>
            <div className="flex items-center gap-3 mt-6">
              <button type="button" onClick={handleSubmitFeedback} disabled={isSaving} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors">
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                Submit Feedback
              </button>
              <button type="button" onClick={() => { setShowForm(null); setFeedbackCheckInId(null); }} className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Training/IT Support Request Modal */}
      {(showForm === 'training' || showForm === 'it_support') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-card border border-border rounded-xl shadow-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text">
                {showForm === 'training' ? 'Request Training' : 'IT Support Request'}
              </h3>
              <button type="button" onClick={() => setShowForm(null)} className="text-text-muted hover:text-text">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Subject *</label>
                <input
                  type="text"
                  value={requestForm.subject}
                  onChange={(e) => setRequestForm({ ...requestForm, subject: e.target.value })}
                  className={inputClassName}
                  placeholder={showForm === 'training' ? 'e.g. React advanced training' : 'e.g. VPN access issue'}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Description</label>
                <textarea
                  value={requestForm.description}
                  onChange={(e) => setRequestForm({ ...requestForm, description: e.target.value })}
                  className={`${inputClassName} min-h-[80px]`}
                  placeholder="Provide details about your request..."
                  rows={3}
                />
              </div>
            </div>
            <div className="flex items-center gap-3 mt-6">
              <button type="button" onClick={handleSubmitRequest} disabled={isSaving} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors">
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                Submit Request
              </button>
              <button type="button" onClick={() => setShowForm(null)} className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
