'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  MessageSquare,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Inbox,
  ArrowUpRight,
  MessageCircle,
  Sparkles,
} from 'lucide-react';

interface FeedbackItem {
  id: string;
  employeeName: string | null;
  category: string;
  message: string;
  isAnonymous: boolean;
  status: string;
  managerResponse?: string | null;
  escalationReason?: string | null;
  surveyTitle?: string | null;
  createdAt: string;
}

interface Suggestion {
  id: string;
  title: string;
  description: string;
  submittedBy: string;
  isAnonymous: boolean;
  status: string;
  votes: number;
  createdAt: string;
}

const fmtDate = (d?: string | null) => {
  if (!d) return '—';
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString();
};

const suggestionBadgeClass = (status: string) =>
  status === 'implemented'
    ? 'bg-green-100 text-green-700'
    : status === 'planned'
      ? 'bg-blue-100 text-blue-700'
      : status === 'under_review' || status === 'in_review'
        ? 'bg-yellow-100 text-yellow-700'
        : status === 'rejected'
          ? 'bg-red-100 text-red-700'
          : 'bg-gray-100 text-gray-700';

export default function FeedbackSuggestionsTab() {
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [digesting, setDigesting] = useState(false);
  const [digest, setDigest] = useState<string | null>(null);

  const handleGenerateDigest = async () => {
    const items = [
      ...feedback.map((f) => f.message),
      ...suggestions.map((s) => `${s.title}: ${s.description}`),
    ]
      .map((t) => (t || '').trim())
      .filter(Boolean);
    if (items.length === 0) {
      setError('There is no feedback to summarize yet.');
      return;
    }
    setDigesting(true);
    setError('');
    setDigest(null);
    try {
      const res = await api.post('/engagement-culture/manager/feedback/digest', { items });
      const data = res.data;
      if (!data?.ok) {
        setError(data?.message || 'AI digest is unavailable.');
        return;
      }
      setDigest(data.digest);
    } catch {
      setError('Failed to generate a digest. Please try again.');
    } finally {
      setDigesting(false);
    }
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [feedbackRes, suggestionsRes] = await Promise.all([
        api.get('/engagement-culture/manager/feedback').catch(() => ({ data: [] })),
        api.get('/engagement-culture/manager/feedback/suggestions').catch(() => ({ data: [] })),
      ]);

      const rawFeedback = feedbackRes.data?.data ?? feedbackRes.data;
      const feedbackData = Array.isArray(rawFeedback) ? rawFeedback : [];
      const rawSuggestions = suggestionsRes.data?.data ?? suggestionsRes.data;
      const suggestionsData = Array.isArray(rawSuggestions) ? rawSuggestions : [];

      setFeedback(feedbackData);
      setSuggestions(suggestionsData);
    } catch {
      setError('Failed to load feedback data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRespond = async (id: string) => {
    const response = prompt('Enter your response:');
    if (!response?.trim()) return;
    try {
      setError('');
      await api.post(`/engagement-culture/manager/feedback/${id}/respond`, { response: response.trim() });
      setSuccess('Response submitted successfully.');
      loadData();
    } catch {
      setError('Failed to submit response.');
    }
  };

  const handleEscalate = async (id: string) => {
    if (!confirm('Are you sure you want to escalate this feedback?')) return;
    try {
      setError('');
      await api.post(`/engagement-culture/manager/feedback/${id}/escalate`);
      setSuccess('Feedback escalated to HR.');
      loadData();
    } catch {
      setError('Failed to escalate feedback.');
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

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-6">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-text">Feedback &amp; Suggestions</h2>
        </div>
        <button
          type="button"
          onClick={handleGenerateDigest}
          disabled={digesting}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border border-primary/40 text-primary hover:bg-primary/5 disabled:opacity-50 transition-colors"
        >
          {digesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {digesting ? 'Summarizing…' : 'Generate Digest'}
        </button>
      </div>

      {digest && (
        <div className="mb-6 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-text flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-primary" />
              AI Feedback Digest
            </h3>
            <button type="button" onClick={() => setDigest(null)} className="text-text-muted hover:text-text text-xs">
              Dismiss
            </button>
          </div>
          <p className="text-sm text-text whitespace-pre-wrap">{digest}</p>
        </div>
      )}

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

      {/* Stat cards — computed from the same rows the lists below render, so they always agree */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-background rounded-xl border border-border p-5">
          <p className="text-sm text-text-muted mb-1">Total Feedback</p>
          <p className="text-2xl font-bold text-text">{feedback.length}</p>
          <p className="text-xs text-text-muted mt-1">
            {feedback.filter((f) => f.isAnonymous).length} anonymous
          </p>
        </div>
        <div className="bg-background rounded-xl border border-border p-5">
          <p className="text-sm text-text-muted mb-1">Awaiting Response</p>
          <p className="text-2xl font-bold text-text">{feedback.filter((f) => f.status === 'new').length}</p>
        </div>
        <div className="bg-background rounded-xl border border-border p-5">
          <p className="text-sm text-text-muted mb-1">Responded</p>
          <p className="text-2xl font-bold text-text">{feedback.filter((f) => f.status === 'responded').length}</p>
        </div>
        <div className="bg-background rounded-xl border border-border p-5">
          <p className="text-sm text-text-muted mb-1">Escalated</p>
          <p className="text-2xl font-bold text-text">{feedback.filter((f) => f.status === 'escalated').length}</p>
        </div>
      </div>

      {/* Feedback Items */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-text uppercase tracking-wider mb-3">Team Feedback</h3>
        {feedback.length === 0 ? (
          <div className="text-center py-12">
            <Inbox className="h-10 w-10 text-text-muted mx-auto mb-3" />
            <p className="text-text-muted text-sm">No feedback items received.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {feedback.map((item) => (
              <div key={item.id} className="bg-background rounded-xl border border-border p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-text">
                        {item.isAnonymous ? 'Anonymous' : item.employeeName || 'Unknown'}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                        {item.category}
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        item.status === 'new' ? 'bg-yellow-100 text-yellow-700' : item.status === 'responded' ? 'bg-green-100 text-green-700' : item.status === 'escalated' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                    <p className="text-sm text-text-muted">{item.message}</p>
                  </div>
                  <span className="text-xs text-text-muted whitespace-nowrap ml-4">
                    {fmtDate(item.createdAt)}
                  </span>
                </div>
                {item.managerResponse && (
                  <div className="mt-3 rounded-lg bg-green-50 border border-green-200 px-3 py-2">
                    <p className="text-xs font-medium text-green-700 mb-0.5">Your response</p>
                    <p className="text-xs text-green-800">{item.managerResponse}</p>
                  </div>
                )}
                {item.status === 'escalated' && item.escalationReason && (
                  <div className="mt-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2">
                    <p className="text-xs font-medium text-red-700 mb-0.5">Escalated to HR</p>
                    <p className="text-xs text-red-800">{item.escalationReason}</p>
                  </div>
                )}
                {item.status === 'new' && (
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={() => handleRespond(item.id)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-primary border border-primary rounded-lg hover:bg-primary hover:text-white transition-colors"
                    >
                      <MessageCircle className="h-3 w-3" />
                      Respond
                    </button>
                    <button
                      onClick={() => handleEscalate(item.id)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-600 hover:text-white transition-colors"
                    >
                      <ArrowUpRight className="h-3 w-3" />
                      Escalate
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Suggestions Tracking */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-text uppercase tracking-wider">Suggestion Tracking</h3>
          {suggestions.length > 0 && (
            <span className="text-xs text-text-muted">
              {suggestions.length} suggestion{suggestions.length === 1 ? '' : 's'} ·{' '}
              {suggestions.reduce((sum, s) => sum + (Number(s.votes) || 0), 0)} votes ·{' '}
              {suggestions.filter((s) => s.status === 'implemented').length} implemented
            </span>
          )}
        </div>
        {suggestions.length === 0 ? (
          <div className="text-center py-8">
            <Inbox className="h-8 w-8 text-text-muted mx-auto mb-2" />
            <p className="text-text-muted text-sm">No suggestions submitted.</p>
          </div>
        ) : (
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-background">
                <tr>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Title</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Submitted By</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Votes</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Status</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {suggestions.map((s) => (
                  <tr key={s.id} className="hover:bg-background/50">
                    <td className="px-4 py-3">
                      <p className="text-sm text-text font-medium">{s.title}</p>
                      <p className="text-xs text-text-muted mt-0.5">{s.description}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {s.isAnonymous ? 'Anonymous' : s.submittedBy || 'Unknown'}
                    </td>
                    <td className="px-4 py-3 text-sm text-text font-medium">{Number(s.votes) || 0}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${suggestionBadgeClass(s.status)}`}>
                        {(s.status || 'new').replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {fmtDate(s.createdAt)}
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
