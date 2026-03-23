'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  ClipboardList,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Inbox,
} from 'lucide-react';

interface Survey {
  id: string;
  title: string;
  type: string;
  description: string;
  isAnonymous: boolean;
  status: string;
  closesAt: string;
  questionsCount: number;
}

interface Question {
  id: string;
  text: string;
  type: 'rating' | 'text' | 'multiple-choice';
  options?: string[];
}

interface PastResponse {
  id: string;
  surveyTitle: string;
  submittedAt: string;
  status: string;
}

export default function SurveyParticipationTab() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [pastResponses, setPastResponses] = useState<PastResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showSurveyModal, setShowSurveyModal] = useState(false);
  const [activeSurvey, setActiveSurvey] = useState<Survey | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [surveysRes, responsesRes] = await Promise.all([
        api.get('/engagement-culture/employee/surveys').catch(() => ({ data: { data: [] } })),
        api.get('/engagement-culture/employee/surveys/my-responses').catch(() => ({ data: { data: [] } })),
      ]);

      const surveysData = Array.isArray(surveysRes.data) ? surveysRes.data : Array.isArray(surveysRes.data?.data) ? surveysRes.data.data : [];
      const responsesData = Array.isArray(responsesRes.data) ? responsesRes.data : Array.isArray(responsesRes.data?.data) ? responsesRes.data.data : [];

      setSurveys(surveysData);
      setPastResponses(responsesData);
    } catch {
      setError('Failed to load surveys.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openSurvey = async (survey: Survey) => {
    setActiveSurvey(survey);
    setAnswers({});
    setShowSurveyModal(true);
    try {
      setLoadingQuestions(true);
      const res = await api.get(`/engagement-culture/employee/surveys/${survey.id}/questions`).catch(() => ({ data: { data: [] } }));
      const questionsData = Array.isArray(res.data) ? res.data : Array.isArray(res.data?.data) ? res.data.data : [];
      setQuestions(questionsData);
    } catch {
      setError('Failed to load survey questions.');
      setShowSurveyModal(false);
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handleSubmitSurvey = async () => {
    if (!activeSurvey) return;
    try {
      setSubmitting(true);
      setError('');
      await api.post(`/engagement-culture/employee/surveys/${activeSurvey.id}/submit`, { answers });
      setSuccess('Survey submitted successfully.');
      setShowSurveyModal(false);
      loadData();
    } catch {
      setError('Failed to submit survey.');
    } finally {
      setSubmitting(false);
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
        <ClipboardList className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-text">Survey Participation</h2>
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

      {/* Active Surveys */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-text uppercase tracking-wider mb-3">Active Surveys</h3>
        {surveys.length === 0 ? (
          <div className="text-center py-12">
            <Inbox className="h-10 w-10 text-text-muted mx-auto mb-3" />
            <p className="text-text-muted text-sm">No active surveys available.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {surveys.map((survey) => (
              <div key={survey.id} className="bg-background rounded-xl border border-border p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-text mb-1">{survey.title}</h4>
                    <p className="text-sm text-text-muted mb-2">{survey.description || 'No description provided.'}</p>
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 capitalize">
                        {survey.type}
                      </span>
                      {survey.isAnonymous && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                          Anonymous
                        </span>
                      )}
                      {survey.closesAt && (
                        <span className="text-xs text-text-muted">
                          Closes: {new Date(survey.closesAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => openSurvey(survey)}
                    className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors whitespace-nowrap"
                  >
                    Take Survey
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Past Responses */}
      <div>
        <h3 className="text-sm font-semibold text-text uppercase tracking-wider mb-3">My Past Responses</h3>
        {pastResponses.length === 0 ? (
          <div className="text-center py-8">
            <Inbox className="h-8 w-8 text-text-muted mx-auto mb-2" />
            <p className="text-text-muted text-sm">No past survey responses.</p>
          </div>
        ) : (
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-background">
                <tr>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Survey</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Submitted On</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pastResponses.map((r) => (
                  <tr key={r.id} className="hover:bg-background/50">
                    <td className="px-4 py-3 text-sm text-text font-medium">{r.surveyTitle}</td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {r.submittedAt ? new Date(r.submittedAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        {r.status || 'submitted'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Survey Taking Modal */}
      {showSurveyModal && activeSurvey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-card rounded-xl border border-border p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text">{activeSurvey.title}</h3>
              <button onClick={() => setShowSurveyModal(false)} className="p-1 text-text-muted hover:text-text">
                <X className="h-5 w-5" />
              </button>
            </div>

            {activeSurvey.description && (
              <p className="text-sm text-text-muted mb-4">{activeSurvey.description}</p>
            )}

            {loadingQuestions ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
              </div>
            ) : questions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-text-muted text-sm">No questions available for this survey.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {questions.map((q, idx) => (
                  <div key={q.id} className="p-4 border border-border rounded-lg bg-background">
                    <p className="text-sm font-medium text-text mb-3">
                      {idx + 1}. {q.text}
                    </p>
                    {q.type === 'rating' && (
                      <div className="flex items-center gap-2">
                        {[1, 2, 3, 4, 5].map((val) => (
                          <button
                            key={val}
                            onClick={() => setAnswers({ ...answers, [q.id]: val })}
                            className={`w-10 h-10 rounded-lg border text-sm font-medium transition-colors ${
                              answers[q.id] === val
                                ? 'bg-primary text-white border-primary'
                                : 'bg-white text-text border-border hover:border-primary'
                            }`}
                          >
                            {val}
                          </button>
                        ))}
                      </div>
                    )}
                    {q.type === 'text' && (
                      <textarea
                        value={(answers[q.id] as string) || ''}
                        onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                        placeholder="Your response..."
                      />
                    )}
                    {q.type === 'multiple-choice' && q.options && (
                      <div className="space-y-2">
                        {q.options.map((option, optIdx) => (
                          <label key={optIdx} className="flex items-center gap-2 text-sm text-text cursor-pointer">
                            <input
                              type="radio"
                              name={`question-${q.id}`}
                              checked={answers[q.id] === option}
                              onChange={() => setAnswers({ ...answers, [q.id]: option })}
                              className="border-border"
                            />
                            {option}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowSurveyModal(false)} className="px-4 py-2 text-sm font-medium text-text-muted border border-border rounded-lg hover:bg-background transition-colors">
                Cancel
              </button>
              <button
                onClick={handleSubmitSurvey}
                disabled={submitting || questions.length === 0}
                className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit Survey'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
