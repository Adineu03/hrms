'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  MessageCircle,
  Inbox,
  Send,
  Reply,
  Heart,
  X,
} from 'lucide-react';

const inputClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary';
const selectClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary appearance-none';

interface FeedbackReceived {
  id: string;
  fromName: string;
  isAnonymous: boolean;
  type: string;
  category: string;
  content: string;
  createdAt: string;
  canRespond: boolean;
}

interface FeedbackRequest {
  id: string;
  fromName: string;
  cycleName: string;
  dueDate: string;
  status: string;
}

interface KudosEntry {
  id: string;
  fromName: string;
  toName: string;
  message: string;
  createdAt: string;
}

interface Colleague {
  id: string;
  firstName: string;
  lastName: string;
}

const FEEDBACK_TYPES = [
  { value: 'appreciation', label: 'Appreciation' },
  { value: 'constructive', label: 'Constructive' },
  { value: 'suggestion', label: 'Suggestion' },
  { value: 'recognition', label: 'Recognition' },
];

const FEEDBACK_CATEGORIES = [
  { value: 'work_quality', label: 'Work Quality' },
  { value: 'collaboration', label: 'Collaboration' },
  { value: 'communication', label: 'Communication' },
  { value: 'initiative', label: 'Initiative' },
  { value: 'problem_solving', label: 'Problem Solving' },
];

const TYPE_STYLES: Record<string, string> = {
  appreciation: 'bg-green-100 text-green-700',
  constructive: 'bg-blue-100 text-blue-700',
  suggestion: 'bg-purple-100 text-purple-700',
  recognition: 'bg-yellow-50 text-yellow-700',
  coaching: 'bg-indigo-100 text-indigo-700',
};

export default function FeedbackTab() {
  const [received, setReceived] = useState<FeedbackReceived[]>([]);
  const [requests, setRequests] = useState<FeedbackRequest[]>([]);
  const [kudos, setKudos] = useState<KudosEntry[]>([]);
  const [colleagues, setColleagues] = useState<Colleague[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Give feedback form
  const [feedbackForm, setFeedbackForm] = useState({
    colleagueId: '',
    type: 'appreciation',
    category: 'work_quality',
    content: '',
    isAnonymous: false,
  });

  // Respond modal
  const [showRespondModal, setShowRespondModal] = useState(false);
  const [respondFeedbackId, setRespondFeedbackId] = useState<string | null>(null);
  const [respondContent, setRespondContent] = useState('');

  // Pending request quick form
  const [requestResponses, setRequestResponses] = useState<Record<string, string>>({});

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [rcvRes, reqRes, kudosRes, colRes] = await Promise.all([
        api.get('/performance-growth/employee/feedback/received'),
        api.get('/performance-growth/employee/feedback/requests'),
        api.get('/performance-growth/employee/feedback/kudos'),
        api.get('/performance-growth/employee/feedback/colleagues'),
      ]);
      setReceived(Array.isArray(rcvRes.data) ? rcvRes.data : rcvRes.data?.data || []);
      setRequests(Array.isArray(reqRes.data) ? reqRes.data : reqRes.data?.data || []);
      setKudos(Array.isArray(kudosRes.data) ? kudosRes.data : kudosRes.data?.data || []);
      setColleagues(Array.isArray(colRes.data) ? colRes.data : colRes.data?.data || []);
    } catch {
      setError('Failed to load feedback data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleGiveFeedback = async () => {
    setError(null);
    if (!feedbackForm.colleagueId || !feedbackForm.content.trim()) {
      setError('Colleague and feedback content are required.');
      return;
    }
    setIsSaving(true);
    try {
      await api.post('/performance-growth/employee/feedback/give', feedbackForm);
      setSuccess('Feedback sent successfully.');
      setFeedbackForm({ colleagueId: '', type: 'appreciation', category: 'work_quality', content: '', isAnonymous: false });
      loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to send feedback.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRespond = async () => {
    if (!respondFeedbackId || !respondContent.trim()) {
      setError('Response content is required.');
      return;
    }
    setIsSaving(true);
    try {
      await api.post(`/performance-growth/employee/feedback/${respondFeedbackId}/respond`, {
        content: respondContent,
      });
      setSuccess('Response sent.');
      setShowRespondModal(false);
      setRespondFeedbackId(null);
      setRespondContent('');
      loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to send response.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFillRequest = async (requestId: string) => {
    const content = requestResponses[requestId]?.trim();
    if (!content) {
      setError('Feedback content is required.');
      return;
    }
    setIsSaving(true);
    try {
      await api.post(`/performance-growth/employee/feedback/requests/${requestId}/respond`, { content });
      setSuccess('Feedback request completed.');
      setRequestResponses((prev) => ({ ...prev, [requestId]: '' }));
      loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to submit feedback.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading feedback...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Feedback
        </h2>
        <p className="text-sm text-text-muted">View received feedback, give feedback, and respond to requests.</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Feedback Received */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-text">Feedback Received ({received.length})</h3>
          {received.length === 0 ? (
            <div className="text-center py-8 bg-background border border-border rounded-xl">
              <Inbox className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-xs text-text-muted">No feedback received yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {received.map((fb) => (
                <div key={fb.id} className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm text-text font-medium">{fb.isAnonymous ? 'Anonymous' : fb.fromName}</span>
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${TYPE_STYLES[fb.type] || 'bg-gray-100 text-gray-600'}`}>
                      {fb.type}
                    </span>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600">
                      {fb.category?.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-text mb-2">{fb.content}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-text-muted">{new Date(fb.createdAt).toLocaleDateString()}</span>
                    {fb.canRespond && (
                      <button
                        type="button"
                        onClick={() => { setRespondFeedbackId(fb.id); setRespondContent(''); setShowRespondModal(true); }}
                        className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary-hover font-medium transition-colors"
                      >
                        <Reply className="h-3 w-3" />
                        Respond
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Give Feedback Form */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-text flex items-center gap-2">
            <Send className="h-4 w-4" />
            Give Feedback
          </h3>
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Colleague</label>
              <select value={feedbackForm.colleagueId} onChange={(e) => setFeedbackForm({ ...feedbackForm, colleagueId: e.target.value })} className={selectClassName}>
                <option value="">Select Colleague</option>
                {colleagues.map((c) => (
                  <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
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
              <label className="block text-xs font-medium text-text-muted mb-1">Content</label>
              <textarea value={feedbackForm.content} onChange={(e) => setFeedbackForm({ ...feedbackForm, content: e.target.value })} className={`${inputClassName} min-h-[80px]`} placeholder="Write your feedback..." rows={3} />
            </div>
            <label className="flex items-center gap-2 text-sm text-text">
              <input type="checkbox" checked={feedbackForm.isAnonymous} onChange={(e) => setFeedbackForm({ ...feedbackForm, isAnonymous: e.target.checked })} className="rounded border-border text-primary focus:ring-primary" />
              Send anonymously
            </label>
            <button
              type="button"
              onClick={handleGiveFeedback}
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

      {/* Pending Requests */}
      {requests.filter((r) => r.status === 'pending').length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-text">Pending Feedback Requests ({requests.filter((r) => r.status === 'pending').length})</h3>
          <div className="space-y-3">
            {requests.filter((r) => r.status === 'pending').map((req) => (
              <div key={req.id} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-sm text-text font-medium">Feedback for {req.fromName}</span>
                    <p className="text-xs text-text-muted">{req.cycleName} -- Due: {req.dueDate ? new Date(req.dueDate).toLocaleDateString() : '--'}</p>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700">
                    pending
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <textarea
                    value={requestResponses[req.id] || ''}
                    onChange={(e) => setRequestResponses((prev) => ({ ...prev, [req.id]: e.target.value }))}
                    className={`${inputClassName} min-h-[60px]`}
                    placeholder="Write your feedback..."
                    rows={2}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleFillRequest(req.id)}
                  disabled={isSaving}
                  className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors"
                >
                  Submit Feedback
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Kudos Wall */}
      {kudos.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-text flex items-center gap-2">
            <Heart className="h-4 w-4 text-red-400" />
            Public Kudos Wall
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {kudos.slice(0, 9).map((entry) => (
              <div key={entry.id} className="bg-card border border-border rounded-xl p-3">
                <p className="text-xs text-text mb-1">{entry.message}</p>
                <div className="flex items-center justify-between text-[10px] text-text-muted">
                  <span>{entry.fromName} → {entry.toName}</span>
                  <span>{new Date(entry.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Respond Modal */}
      {showRespondModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-card border border-border rounded-xl shadow-lg p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text">Respond to Feedback</h3>
              <button type="button" onClick={() => setShowRespondModal(false)} className="text-text-muted hover:text-text">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Your Response</label>
                <textarea value={respondContent} onChange={(e) => setRespondContent(e.target.value)} className={`${inputClassName} min-h-[80px]`} placeholder="Write your response..." rows={3} />
              </div>
            </div>
            <div className="flex items-center gap-3 mt-6">
              <button type="button" onClick={handleRespond} disabled={isSaving} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors">
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                Send Response
              </button>
              <button type="button" onClick={() => setShowRespondModal(false)} className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
