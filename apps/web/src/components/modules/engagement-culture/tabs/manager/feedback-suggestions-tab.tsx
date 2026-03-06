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
} from 'lucide-react';

interface FeedbackItem {
  id: string;
  employeeName: string;
  category: string;
  message: string;
  isAnonymous: boolean;
  status: string;
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

export default function FeedbackSuggestionsTab() {
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [feedbackRes, suggestionsRes] = await Promise.all([
        api.get('/engagement-culture/manager/feedback'),
        api.get('/engagement-culture/manager/suggestions'),
      ]);

      const feedbackData = Array.isArray(feedbackRes.data) ? feedbackRes.data : feedbackRes.data?.data || [];
      const suggestionsData = Array.isArray(suggestionsRes.data) ? suggestionsRes.data : suggestionsRes.data?.data || [];

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
      <div className="flex items-center gap-2 mb-6">
        <MessageSquare className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-text">Feedback &amp; Suggestions</h2>
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
                        {item.isAnonymous ? 'Anonymous' : item.employeeName}
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
                    {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '—'}
                  </span>
                </div>
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
        <h3 className="text-sm font-semibold text-text uppercase tracking-wider mb-3">Suggestion Tracking</h3>
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
                      {s.isAnonymous ? 'Anonymous' : s.submittedBy}
                    </td>
                    <td className="px-4 py-3 text-sm text-text font-medium">{s.votes || 0}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        s.status === 'implemented' ? 'bg-green-100 text-green-700' : s.status === 'in-review' ? 'bg-blue-100 text-blue-700' : s.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : '—'}
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
