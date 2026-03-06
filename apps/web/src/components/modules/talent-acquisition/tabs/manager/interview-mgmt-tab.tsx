'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  Video,
  Phone,
  MapPin,
  Calendar,
  Clock,
  ArrowLeft,
  Users,
  X,
  Inbox,
} from 'lucide-react';

interface Interview {
  id: string;
  candidateName: string;
  candidateEmail: string;
  position: string;
  requisitionId: string;
  scheduledAt: string;
  duration: number;
  type: 'video' | 'in_person' | 'phone';
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  location: string;
  meetingLink: string;
  evaluationCriteria: EvaluationCriterion[];
  candidateProfile: CandidateProfile;
}

interface EvaluationCriterion {
  id: string;
  name: string;
  description: string;
  maxScore: number;
}

interface CandidateProfile {
  name: string;
  email: string;
  phone: string;
  currentTitle: string;
  currentCompany: string;
  experience: number;
  resumeUrl: string;
}

interface PanelFeedback {
  interviewerId: string;
  interviewerName: string;
  scores: { criterionId: string; criterionName: string; score: number }[];
  overallScore: number;
  decision: string;
  notes: string;
  submittedAt: string;
}

const STATUS_STYLES: Record<string, string> = {
  scheduled: 'bg-blue-50 text-blue-700 border-blue-200',
  confirmed: 'bg-green-50 text-green-700 border-green-200',
  completed: 'bg-purple-50 text-purple-700 border-purple-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
  no_show: 'bg-gray-50 text-gray-700 border-gray-200',
};

const TYPE_ICON: Record<string, React.ReactNode> = {
  video: <Video className="h-4 w-4" />,
  in_person: <MapPin className="h-4 w-4" />,
  phone: <Phone className="h-4 w-4" />,
};

const inputClassName = 'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary';
const selectClassName = 'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary appearance-none';

export default function InterviewMgmtTab() {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null);
  const [panelFeedback, setPanelFeedback] = useState<PanelFeedback[]>([]);
  const [showPanelFeedback, setShowPanelFeedback] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Feedback form state
  const [feedbackScores, setFeedbackScores] = useState<Record<string, number>>({});
  const [overallScore, setOverallScore] = useState(5);
  const [decision, setDecision] = useState('hire');
  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  const loadData = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get('/talent-acquisition/manager/interviews');
      setInterviews(Array.isArray(res.data) ? res.data : res.data?.data || []);
    } catch {
      setError('Failed to load interviews.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openDetail = (interview: Interview) => {
    setSelectedInterview(interview);
    setFeedbackSubmitted(false);
    setShowPanelFeedback(false);
    setPanelFeedback([]);
    setFeedbackNotes('');
    setOverallScore(5);
    setDecision('hire');
    const scores: Record<string, number> = {};
    interview.evaluationCriteria?.forEach((c) => {
      scores[c.id] = 5;
    });
    setFeedbackScores(scores);
  };

  const submitFeedback = async () => {
    if (!selectedInterview) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await api.post(`/talent-acquisition/manager/interviews/${selectedInterview.id}/feedback`, {
        scores: Object.entries(feedbackScores).map(([criterionId, score]) => ({ criterionId, score })),
        overallScore,
        decision,
        notes: feedbackNotes.trim(),
      });
      setFeedbackSubmitted(true);
      setSuccess('Feedback submitted successfully.');
      setInterviews((prev) =>
        prev.map((i) => (i.id === selectedInterview.id ? { ...i, status: 'completed' as const } : i))
      );
      setTimeout(() => setSuccess(null), 4000);
    } catch {
      setError('Failed to submit feedback.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const loadPanelFeedback = async () => {
    if (!selectedInterview) return;
    try {
      const res = await api.get(`/talent-acquisition/manager/interviews/${selectedInterview.id}/panel-feedback`);
      setPanelFeedback(Array.isArray(res.data) ? res.data : res.data?.data || []);
      setShowPanelFeedback(true);
    } catch {
      setError('Failed to load panel feedback.');
    }
  };

  const formatDateTime = (dt: string) => {
    const d = new Date(dt);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + ' at ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const formatStatus = (s: string) => s.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading interviews...</span>
      </div>
    );
  }

  // Detail view
  if (selectedInterview) {
    return (
      <div className="space-y-5">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 text-sm flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
            {success}
          </div>
        )}

        <button type="button" onClick={() => setSelectedInterview(null)} className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-primary transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to Interviews
        </button>

        {/* Candidate Profile */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-text mb-3">Candidate Profile</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-text-muted">Name</p>
              <p className="text-sm font-medium text-text">{selectedInterview.candidateProfile?.name || selectedInterview.candidateName}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Email</p>
              <p className="text-sm text-text">{selectedInterview.candidateProfile?.email || selectedInterview.candidateEmail}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Current Role</p>
              <p className="text-sm text-text">{selectedInterview.candidateProfile?.currentTitle || '--'} at {selectedInterview.candidateProfile?.currentCompany || '--'}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Experience</p>
              <p className="text-sm text-text">{selectedInterview.candidateProfile?.experience || 0} years</p>
            </div>
          </div>
        </div>

        {/* Interview Details */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-text mb-3">Interview Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-text-muted">Position</p>
              <p className="text-sm font-medium text-text">{selectedInterview.position}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Date & Time</p>
              <p className="text-sm text-text">{formatDateTime(selectedInterview.scheduledAt)}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Type</p>
              <div className="flex items-center gap-1 text-sm text-text">
                {TYPE_ICON[selectedInterview.type]}
                {formatStatus(selectedInterview.type)}
              </div>
            </div>
            <div>
              <p className="text-xs text-text-muted">Duration</p>
              <p className="text-sm text-text">{selectedInterview.duration} min</p>
            </div>
          </div>
        </div>

        {/* Feedback Form */}
        {!feedbackSubmitted && (selectedInterview.status === 'scheduled' || selectedInterview.status === 'confirmed') ? (
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-text mb-4">Evaluation Scorecard</h3>
            {selectedInterview.evaluationCriteria?.length > 0 ? (
              <div className="space-y-4">
                {selectedInterview.evaluationCriteria.map((criterion) => (
                  <div key={criterion.id}>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-text">{criterion.name}</label>
                      <span className="text-xs text-text-muted font-medium">{feedbackScores[criterion.id] || 0}/{criterion.maxScore}</span>
                    </div>
                    {criterion.description && <p className="text-xs text-text-muted mb-1">{criterion.description}</p>}
                    <input
                      type="range"
                      min={1}
                      max={criterion.maxScore}
                      value={feedbackScores[criterion.id] || 5}
                      onChange={(e) => setFeedbackScores({ ...feedbackScores, [criterion.id]: Number(e.target.value) })}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-text-muted mb-4">No evaluation criteria defined. Provide an overall score below.</p>
            )}

            <div className="mt-4 space-y-4 border-t border-border pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Overall Score (1-10)</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={overallScore}
                    onChange={(e) => setOverallScore(Number(e.target.value))}
                    className={inputClassName}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Decision</label>
                  <select value={decision} onChange={(e) => setDecision(e.target.value)} className={selectClassName}>
                    <option value="strong_hire">Strong Hire</option>
                    <option value="hire">Hire</option>
                    <option value="next_round">Next Round</option>
                    <option value="no_hire">No Hire</option>
                    <option value="strong_no_hire">Strong No Hire</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Notes</label>
                <textarea value={feedbackNotes} onChange={(e) => setFeedbackNotes(e.target.value)} rows={3} className={inputClassName} placeholder="Additional observations, strengths, concerns..." />
              </div>
              <button
                type="button"
                onClick={submitFeedback}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Submit Feedback
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-green-50 border border-green-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <h3 className="text-sm font-semibold text-green-700">Feedback Submitted</h3>
            </div>
            <p className="text-xs text-green-600">Your evaluation has been recorded for this interview.</p>
            <button
              type="button"
              onClick={loadPanelFeedback}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-green-200 text-green-700 hover:bg-green-50 transition-colors"
            >
              <Users className="h-3 w-3" />
              View Panel Feedback
            </button>
          </div>
        )}

        {/* Panel Feedback */}
        {showPanelFeedback && (
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-text mb-4">Panel Feedback</h3>
            {panelFeedback.length > 0 ? (
              <div className="space-y-4">
                {panelFeedback.map((fb) => (
                  <div key={fb.interviewerId} className="bg-background rounded-lg p-4 border border-border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-text">{fb.interviewerName}</span>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${fb.decision === 'strong_hire' || fb.decision === 'hire' ? 'bg-green-50 text-green-700' : fb.decision === 'next_round' ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'}`}>
                          {formatStatus(fb.decision)}
                        </span>
                        <span className="text-xs font-medium text-text-muted">Score: {fb.overallScore}/10</span>
                      </div>
                    </div>
                    {fb.scores?.length > 0 && (
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        {fb.scores.map((s) => (
                          <div key={s.criterionId} className="flex items-center justify-between text-xs">
                            <span className="text-text-muted">{s.criterionName}</span>
                            <span className="font-medium text-text">{s.score}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {fb.notes && <p className="text-xs text-text-muted italic">&quot;{fb.notes}&quot;</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-muted text-center py-4">No other panel feedback available yet.</p>
            )}
          </div>
        )}
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-5">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          {success}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="h-4 w-4 text-blue-600" />
            <span className="text-xs font-medium text-blue-700 uppercase tracking-wider">Scheduled</span>
          </div>
          <p className="text-2xl font-bold text-blue-700">{interviews.filter((i) => i.status === 'scheduled').length}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span className="text-xs font-medium text-green-700 uppercase tracking-wider">Confirmed</span>
          </div>
          <p className="text-2xl font-bold text-green-700">{interviews.filter((i) => i.status === 'confirmed').length}</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-4 w-4 text-purple-600" />
            <span className="text-xs font-medium text-purple-700 uppercase tracking-wider">Completed</span>
          </div>
          <p className="text-2xl font-bold text-purple-700">{interviews.filter((i) => i.status === 'completed').length}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-1">
            <X className="h-4 w-4 text-gray-600" />
            <span className="text-xs font-medium text-gray-700 uppercase tracking-wider">Cancelled</span>
          </div>
          <p className="text-2xl font-bold text-gray-700">{interviews.filter((i) => i.status === 'cancelled' || i.status === 'no_show').length}</p>
        </div>
      </div>

      {/* Interview Cards */}
      <h3 className="text-sm font-semibold text-text">Upcoming Interviews</h3>
      {interviews.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <Inbox className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm text-text-muted">No interviews assigned to you.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {interviews.map((interview) => (
            <div
              key={interview.id}
              className="bg-card border border-border rounded-xl p-4 hover:shadow-sm transition-shadow cursor-pointer"
              onClick={() => openDetail(interview)}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold text-text">{interview.candidateName}</p>
                  <p className="text-xs text-text-muted">{interview.position}</p>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[interview.status] || 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                  {formatStatus(interview.status)}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-text-muted">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatDateTime(interview.scheduledAt)}
                </div>
                <div className="flex items-center gap-1">
                  {TYPE_ICON[interview.type]}
                  {formatStatus(interview.type)}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {interview.duration} min
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
