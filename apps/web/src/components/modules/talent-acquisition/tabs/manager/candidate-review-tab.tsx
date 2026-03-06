'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Star,
  MessageSquare,
  ArrowRightLeft,
  User,
  Briefcase,
  Send,
  UserSearch,
} from 'lucide-react';

interface Candidate {
  id: string;
  applicationId: string;
  name: string;
  email: string;
  currentTitle: string;
  currentCompany: string;
  experience: number;
  overallScore: number;
  stage: string;
  source: string;
  appliedAt: string;
  interviewScores: { round: string; score: number; interviewer: string }[];
  notes: { id: string; author: string; text: string; createdAt: string }[];
  resumeUrl: string;
  skills: string[];
}

interface CompareData {
  candidates: Candidate[];
  criteria: { name: string; scores: { applicationId: string; score: number }[] }[];
}

const inputClassName = 'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary';
const selectClassName = 'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary appearance-none';

const STAGE_STYLES: Record<string, string> = {
  applied: 'bg-gray-50 text-gray-700',
  screening: 'bg-yellow-50 text-yellow-700',
  shortlisted: 'bg-indigo-50 text-indigo-700',
  interview: 'bg-blue-50 text-blue-700',
  evaluation: 'bg-purple-50 text-purple-700',
  offer: 'bg-green-50 text-green-700',
  hired: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-red-50 text-red-700',
};

const SOURCE_STYLES: Record<string, string> = {
  referral: 'bg-purple-50 text-purple-700',
  job_board: 'bg-blue-50 text-blue-700',
  career_page: 'bg-green-50 text-green-700',
  linkedin: 'bg-indigo-50 text-indigo-700',
  agency: 'bg-orange-50 text-orange-700',
  direct: 'bg-gray-50 text-gray-700',
};

const STAGES = ['applied', 'screening', 'shortlisted', 'interview', 'evaluation', 'offer', 'hired', 'rejected'];

export default function CandidateReviewTab() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Note form
  const [noteText, setNoteText] = useState('');

  // Stage move
  const [moveStage, setMoveStage] = useState('');

  // Compare mode
  const [compareMode, setCompareMode] = useState(false);
  const [compareIds, setCompareIds] = useState<Set<string>>(new Set());
  const [compareData, setCompareData] = useState<CompareData | null>(null);
  const [isComparing, setIsComparing] = useState(false);

  const loadData = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get('/talent-acquisition/manager/candidates');
      setCandidates(Array.isArray(res.data) ? res.data : res.data?.data || []);
    } catch {
      setError('Failed to load candidates.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const addNote = async () => {
    if (!selectedCandidate || !noteText.trim()) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await api.post(`/talent-acquisition/manager/candidates/${selectedCandidate.applicationId}/note`, {
        text: noteText.trim(),
      });
      const newNote = res.data?.data || res.data;
      setSelectedCandidate((prev) => prev ? { ...prev, notes: [...(prev.notes || []), newNote] } : null);
      setNoteText('');
      setSuccess('Note added successfully.');
      setTimeout(() => setSuccess(null), 4000);
    } catch {
      setError('Failed to add note.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMoveStage = async () => {
    if (!selectedCandidate || !moveStage) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await api.post(`/talent-acquisition/manager/candidates/${selectedCandidate.applicationId}/move-stage`, {
        stage: moveStage,
      });
      setSelectedCandidate((prev) => prev ? { ...prev, stage: moveStage } : null);
      setCandidates((prev) =>
        prev.map((c) => (c.applicationId === selectedCandidate.applicationId ? { ...c, stage: moveStage } : c))
      );
      setSuccess(`Candidate moved to ${formatLabel(moveStage)} stage.`);
      setMoveStage('');
      setTimeout(() => setSuccess(null), 4000);
    } catch {
      setError('Failed to move candidate stage.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleCompare = (appId: string) => {
    setCompareIds((prev) => {
      const next = new Set(prev);
      if (next.has(appId)) {
        next.delete(appId);
      } else if (next.size < 3) {
        next.add(appId);
      }
      return next;
    });
  };

  const runCompare = async () => {
    if (compareIds.size < 2) return;
    setIsComparing(true);
    setError(null);
    try {
      const ids = Array.from(compareIds).join(',');
      const res = await api.get(`/talent-acquisition/manager/candidates/compare?applicationIds=${ids}`);
      setCompareData(res.data?.data || res.data);
    } catch {
      setError('Failed to compare candidates.');
    } finally {
      setIsComparing(false);
    }
  };

  const formatLabel = (s: string) => s.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  const renderStars = (score: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star
          key={i}
          className={`h-3 w-3 ${i <= Math.round(score / 2) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
        />
      );
    }
    return stars;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading candidates...</span>
      </div>
    );
  }

  // Compare view
  if (compareData) {
    return (
      <div className="space-y-5">
        <button
          type="button"
          onClick={() => { setCompareData(null); setCompareMode(false); setCompareIds(new Set()); }}
          className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-primary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Candidates
        </button>

        <h3 className="text-sm font-semibold text-text">Candidate Comparison</h3>
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-background border-b border-border">
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Attribute</th>
                {compareData.candidates?.map((c) => (
                  <th key={c.applicationId} className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                    {c.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr className="bg-card hover:bg-background/50">
                <td className="px-4 py-3 text-sm text-text-muted font-medium">Experience</td>
                {compareData.candidates?.map((c) => (
                  <td key={c.applicationId} className="px-4 py-3 text-sm text-text">{c.experience} years</td>
                ))}
              </tr>
              <tr className="bg-card hover:bg-background/50">
                <td className="px-4 py-3 text-sm text-text-muted font-medium">Current Role</td>
                {compareData.candidates?.map((c) => (
                  <td key={c.applicationId} className="px-4 py-3 text-sm text-text">{c.currentTitle}</td>
                ))}
              </tr>
              <tr className="bg-card hover:bg-background/50">
                <td className="px-4 py-3 text-sm text-text-muted font-medium">Overall Score</td>
                {compareData.candidates?.map((c) => (
                  <td key={c.applicationId} className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {renderStars(c.overallScore)}
                      <span className="text-xs text-text-muted ml-1">{c.overallScore}/10</span>
                    </div>
                  </td>
                ))}
              </tr>
              <tr className="bg-card hover:bg-background/50">
                <td className="px-4 py-3 text-sm text-text-muted font-medium">Stage</td>
                {compareData.candidates?.map((c) => (
                  <td key={c.applicationId} className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STAGE_STYLES[c.stage] || 'bg-gray-50 text-gray-700'}`}>
                      {formatLabel(c.stage)}
                    </span>
                  </td>
                ))}
              </tr>
              {compareData.criteria?.map((cr) => (
                <tr key={cr.name} className="bg-card hover:bg-background/50">
                  <td className="px-4 py-3 text-sm text-text-muted font-medium">{cr.name}</td>
                  {compareData.candidates?.map((c) => {
                    const s = cr.scores.find((sc) => sc.applicationId === c.applicationId);
                    return (
                      <td key={c.applicationId} className="px-4 py-3 text-sm text-text font-medium">
                        {s ? s.score : '--'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Detail view
  if (selectedCandidate) {
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

        <button type="button" onClick={() => setSelectedCandidate(null)} className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-primary transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to Candidates
        </button>

        {/* Profile */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-text">{selectedCandidate.name}</h3>
              <p className="text-sm text-text-muted">{selectedCandidate.currentTitle} at {selectedCandidate.currentCompany}</p>
              <p className="text-xs text-text-muted mt-1">{selectedCandidate.email}</p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1">{renderStars(selectedCandidate.overallScore)}</div>
              <p className="text-xs text-text-muted mt-1">Score: {selectedCandidate.overallScore}/10</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-text-muted">Experience</p>
              <p className="text-sm font-medium text-text">{selectedCandidate.experience} years</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Stage</p>
              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STAGE_STYLES[selectedCandidate.stage] || 'bg-gray-50 text-gray-700'}`}>
                {formatLabel(selectedCandidate.stage)}
              </span>
            </div>
            <div>
              <p className="text-xs text-text-muted">Source</p>
              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${SOURCE_STYLES[selectedCandidate.source] || 'bg-gray-50 text-gray-700'}`}>
                {formatLabel(selectedCandidate.source)}
              </span>
            </div>
            <div>
              <p className="text-xs text-text-muted">Applied</p>
              <p className="text-sm text-text">{new Date(selectedCandidate.appliedAt).toLocaleDateString()}</p>
            </div>
          </div>
          {selectedCandidate.skills?.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-text-muted mb-1">Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {selectedCandidate.skills.map((skill) => (
                  <span key={skill} className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Interview Scores */}
        {selectedCandidate.interviewScores?.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-5">
            <h4 className="text-sm font-semibold text-text mb-3">Interview Scores</h4>
            <div className="space-y-2">
              {selectedCandidate.interviewScores.map((is, idx) => (
                <div key={idx} className="flex items-center justify-between bg-background rounded-lg p-3 border border-border">
                  <div>
                    <p className="text-sm font-medium text-text">{is.round}</p>
                    <p className="text-xs text-text-muted">by {is.interviewer}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {renderStars(is.score)}
                    <span className="text-xs font-medium text-text ml-1">{is.score}/10</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Move Stage */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h4 className="text-sm font-semibold text-text mb-3">Move Stage</h4>
          <div className="flex items-center gap-3">
            <select value={moveStage} onChange={(e) => setMoveStage(e.target.value)} className={selectClassName}>
              <option value="">Select stage...</option>
              {STAGES.filter((s) => s !== selectedCandidate.stage).map((s) => (
                <option key={s} value={s}>{formatLabel(s)}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleMoveStage}
              disabled={!moveStage || isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Move
            </button>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h4 className="text-sm font-semibold text-text mb-3">Notes</h4>
          {selectedCandidate.notes?.length > 0 ? (
            <div className="space-y-2 mb-4">
              {selectedCandidate.notes.map((note) => (
                <div key={note.id} className="bg-background rounded-lg p-3 border border-border">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-text">{note.author}</span>
                    <span className="text-[10px] text-text-muted">{new Date(note.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-xs text-text-muted">{note.text}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-text-muted mb-4">No notes yet.</p>
          )}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              className={inputClassName}
              placeholder="Add a note..."
              onKeyDown={(e) => { if (e.key === 'Enter') addNote(); }}
            />
            <button
              type="button"
              onClick={addNote}
              disabled={!noteText.trim() || isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        </div>
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

      {/* Actions */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text">Candidates for Review</h3>
        <div className="flex items-center gap-2">
          {compareMode && compareIds.size >= 2 && (
            <button
              type="button"
              onClick={runCompare}
              disabled={isComparing}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors"
            >
              {isComparing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRightLeft className="h-4 w-4" />}
              Compare ({compareIds.size})
            </button>
          )}
          <button
            type="button"
            onClick={() => { setCompareMode(!compareMode); setCompareIds(new Set()); }}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
              compareMode ? 'bg-primary text-white border-primary' : 'border-border text-text hover:bg-background'
            }`}
          >
            <ArrowRightLeft className="h-4 w-4" />
            {compareMode ? 'Cancel Compare' : 'Compare Mode'}
          </button>
        </div>
      </div>

      {candidates.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <UserSearch className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm text-text-muted">No candidates to review for your open positions.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {candidates.map((candidate) => (
            <div
              key={candidate.applicationId}
              className={`bg-card border rounded-xl p-4 transition-all cursor-pointer ${
                compareMode && compareIds.has(candidate.applicationId)
                  ? 'border-primary ring-2 ring-primary/20'
                  : 'border-border hover:shadow-sm'
              }`}
              onClick={() => compareMode ? toggleCompare(candidate.applicationId) : setSelectedCandidate(candidate)}
            >
              {compareMode && (
                <div className="flex justify-end mb-2">
                  <input
                    type="checkbox"
                    checked={compareIds.has(candidate.applicationId)}
                    onChange={() => toggleCompare(candidate.applicationId)}
                    className="rounded border-border text-primary focus:ring-primary"
                  />
                </div>
              )}
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text truncate">{candidate.name}</p>
                  <p className="text-xs text-text-muted truncate">
                    <Briefcase className="inline h-3 w-3 mr-1" />
                    {candidate.currentTitle} at {candidate.currentCompany}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  {renderStars(candidate.overallScore)}
                  <span className="text-xs text-text-muted ml-1">{candidate.overallScore}/10</span>
                </div>
                <span className="text-xs text-text-muted">{candidate.experience}y exp</span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${STAGE_STYLES[candidate.stage] || 'bg-gray-50 text-gray-700'}`}>
                  {formatLabel(candidate.stage)}
                </span>
                <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${SOURCE_STYLES[candidate.source] || 'bg-gray-50 text-gray-700'}`}>
                  {formatLabel(candidate.source)}
                </span>
              </div>
              {candidate.notes?.length > 0 && (
                <div className="mt-2 flex items-center gap-1 text-[10px] text-text-muted">
                  <MessageSquare className="h-3 w-3" />
                  {candidate.notes.length} note{candidate.notes.length !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
