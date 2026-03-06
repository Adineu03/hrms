'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  Users,
  Send,
  Trophy,
  Medal,
  Award,
  UserPlus,
  ClipboardList,
  BarChart3,
  Inbox,
  DollarSign,
  ExternalLink,
} from 'lucide-react';

const inputClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary';
const selectClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary appearance-none';

interface EligiblePosition {
  id: string;
  title: string;
  department: string;
}

interface Referral {
  id: string;
  candidateName: string;
  candidateEmail: string;
  positionTitle: string;
  status: string;
  bonusStatus: string;
  bonusAmount: number | null;
  submittedDate: string;
}

interface LeaderboardEntry {
  rank: number;
  employeeName: string;
  employeeId: string;
  totalReferrals: number;
  hired: number;
  bonusEarned: number;
}

const STATUS_COLORS: Record<string, string> = {
  submitted: 'bg-blue-50 text-blue-700',
  screening: 'bg-yellow-50 text-yellow-700',
  interviewing: 'bg-indigo-50 text-indigo-700',
  shortlisted: 'bg-purple-50 text-purple-700',
  offered: 'bg-green-50 text-green-700',
  hired: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-red-50 text-red-700',
  withdrawn: 'bg-gray-100 text-gray-600',
};

const BONUS_STATUS_COLORS: Record<string, string> = {
  not_eligible: 'bg-gray-100 text-gray-600',
  eligible: 'bg-blue-50 text-blue-700',
  processing: 'bg-yellow-50 text-yellow-700',
  paid: 'bg-green-50 text-green-700',
};

export default function EmployeeReferralTab() {
  const [activeSection, setActiveSection] = useState<'submit' | 'my_referrals' | 'leaderboard'>('submit');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Submit form
  const [eligiblePositions, setEligiblePositions] = useState<EligiblePosition[]>([]);
  const [formData, setFormData] = useState({
    jobPostingId: '',
    candidateName: '',
    candidateEmail: '',
    candidatePhone: '',
    candidateResume: '',
    relationship: '',
    notes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // My referrals
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [referralHistory, setReferralHistory] = useState<Referral[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Leaderboard
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [positionsRes, referralsRes, leaderboardRes] = await Promise.all([
        api.get('/talent-acquisition/employee/referrals/eligible'),
        api.get('/talent-acquisition/employee/referrals'),
        api.get('/talent-acquisition/employee/referrals/leaderboard'),
      ]);

      setEligiblePositions(
        Array.isArray(positionsRes.data) ? positionsRes.data : positionsRes.data?.data || []
      );
      setReferrals(
        Array.isArray(referralsRes.data) ? referralsRes.data : referralsRes.data?.data || []
      );
      setLeaderboard(
        Array.isArray(leaderboardRes.data) ? leaderboardRes.data : leaderboardRes.data?.data || []
      );
    } catch {
      setError('Failed to load referral data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadHistory = async () => {
    try {
      const res = await api.get('/talent-acquisition/employee/referrals/history');
      setReferralHistory(Array.isArray(res.data) ? res.data : res.data?.data || []);
      setShowHistory(true);
    } catch {
      setError('Failed to load referral history.');
    }
  };

  const handleSubmitReferral = async () => {
    setError(null);
    setSuccess(null);
    if (!formData.jobPostingId) {
      setError('Please select a position.');
      return;
    }
    if (!formData.candidateName.trim()) {
      setError('Please enter the candidate name.');
      return;
    }
    if (!formData.candidateEmail.trim()) {
      setError('Please enter the candidate email.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/talent-acquisition/employee/referrals', {
        jobPostingId: formData.jobPostingId,
        candidateName: formData.candidateName.trim(),
        candidateEmail: formData.candidateEmail.trim(),
        candidatePhone: formData.candidatePhone.trim() || undefined,
        candidateResume: formData.candidateResume.trim() || undefined,
        relationship: formData.relationship.trim() || undefined,
        notes: formData.notes.trim() || undefined,
      });
      setSuccess('Referral submitted successfully!');
      setFormData({
        jobPostingId: '',
        candidateName: '',
        candidateEmail: '',
        candidatePhone: '',
        candidateResume: '',
        relationship: '',
        notes: '',
      });
      await loadData();
      setTimeout(() => setSuccess(null), 4000);
    } catch {
      setError('Failed to submit referral.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
    if (rank === 3) return <Award className="h-5 w-5 text-amber-600" />;
    return <span className="text-sm font-bold text-text-muted w-5 text-center">{rank}</span>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading referral portal...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-text flex items-center gap-2">
          <Users className="h-5 w-5" />
          Employee Referral Portal
        </h2>
        <p className="text-sm text-text-muted">Refer candidates and track your referrals.</p>
      </div>

      {/* Alerts */}
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

      {/* Section Tabs */}
      <div className="flex items-center gap-2 border-b border-border">
        {[
          { key: 'submit' as const, label: 'Submit Referral', icon: UserPlus },
          { key: 'my_referrals' as const, label: 'My Referrals', icon: ClipboardList },
          { key: 'leaderboard' as const, label: 'Leaderboard', icon: BarChart3 },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveSection(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeSection === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-text-muted hover:text-text'
            }`}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Submit Referral Section */}
      {activeSection === 'submit' && (
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h3 className="text-sm font-semibold text-text flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-primary" />
            Submit a Referral
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-text mb-1.5">Position *</label>
              <select
                value={formData.jobPostingId}
                onChange={(e) => setFormData({ ...formData, jobPostingId: e.target.value })}
                className={selectClassName}
              >
                <option value="">Select a position</option>
                {eligiblePositions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} — {p.department}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1.5">Candidate Name *</label>
              <input
                type="text"
                value={formData.candidateName}
                onChange={(e) => setFormData({ ...formData, candidateName: e.target.value })}
                placeholder="Full name"
                className={inputClassName}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1.5">Candidate Email *</label>
              <input
                type="email"
                value={formData.candidateEmail}
                onChange={(e) => setFormData({ ...formData, candidateEmail: e.target.value })}
                placeholder="candidate@example.com"
                className={inputClassName}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1.5">Candidate Phone</label>
              <input
                type="tel"
                value={formData.candidatePhone}
                onChange={(e) => setFormData({ ...formData, candidatePhone: e.target.value })}
                placeholder="+1 (555) 000-0000"
                className={inputClassName}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1.5">Resume URL</label>
              <input
                type="url"
                value={formData.candidateResume}
                onChange={(e) => setFormData({ ...formData, candidateResume: e.target.value })}
                placeholder="https://..."
                className={inputClassName}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1.5">Relationship</label>
              <select
                value={formData.relationship}
                onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                className={selectClassName}
              >
                <option value="">Select relationship</option>
                <option value="former_colleague">Former Colleague</option>
                <option value="friend">Friend</option>
                <option value="classmate">Classmate</option>
                <option value="professional_network">Professional Network</option>
                <option value="family">Family</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-text mb-1.5">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Why do you recommend this candidate?"
                rows={3}
                className={`${inputClassName} resize-none`}
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleSubmitReferral}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Submit Referral
            </button>
          </div>
        </div>
      )}

      {/* My Referrals Section */}
      {activeSection === 'my_referrals' && (
        <div className="space-y-4">
          {referrals.length > 0 ? (
            <div className="border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-background border-b border-border">
                    <th className="text-left px-4 py-3 font-medium text-text-muted">Candidate</th>
                    <th className="text-left px-4 py-3 font-medium text-text-muted">Position</th>
                    <th className="text-left px-4 py-3 font-medium text-text-muted">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-text-muted">Bonus</th>
                    <th className="text-left px-4 py-3 font-medium text-text-muted">Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {referrals.map((ref) => (
                    <tr key={ref.id} className="border-b border-border last:border-0 hover:bg-background/50">
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-text font-medium">{ref.candidateName}</p>
                          <p className="text-xs text-text-muted">{ref.candidateEmail}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-text">{ref.positionTitle}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            STATUS_COLORS[ref.status] || 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {ref.status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              BONUS_STATUS_COLORS[ref.bonusStatus] || 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {ref.bonusStatus.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                          </span>
                          {ref.bonusAmount != null && ref.bonusAmount > 0 && (
                            <span className="text-xs text-text-muted flex items-center gap-0.5">
                              <DollarSign className="h-3 w-3" />
                              {ref.bonusAmount.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-text-muted">{formatDate(ref.submittedDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-10">
              <Inbox className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm text-text-muted">You haven&apos;t submitted any referrals yet.</p>
            </div>
          )}

          {/* History toggle */}
          {!showHistory ? (
            <button
              type="button"
              onClick={loadHistory}
              className="text-sm text-primary hover:text-primary-hover font-medium flex items-center gap-1 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              View Referral History
            </button>
          ) : referralHistory.length > 0 ? (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-text">Referral History</h4>
              <div className="border border-border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-background border-b border-border">
                      <th className="text-left px-4 py-3 font-medium text-text-muted">Candidate</th>
                      <th className="text-left px-4 py-3 font-medium text-text-muted">Position</th>
                      <th className="text-left px-4 py-3 font-medium text-text-muted">Status</th>
                      <th className="text-left px-4 py-3 font-medium text-text-muted">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {referralHistory.map((ref) => (
                      <tr key={ref.id} className="border-b border-border last:border-0 hover:bg-background/50">
                        <td className="px-4 py-3 text-text font-medium">{ref.candidateName}</td>
                        <td className="px-4 py-3 text-text">{ref.positionTitle}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              STATUS_COLORS[ref.status] || 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {ref.status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-text-muted">{formatDate(ref.submittedDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <p className="text-sm text-text-muted">No referral history found.</p>
          )}
        </div>
      )}

      {/* Leaderboard Section */}
      {activeSection === 'leaderboard' && (
        <div className="space-y-4">
          {leaderboard.length > 0 ? (
            <div className="border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-background border-b border-border">
                    <th className="text-left px-4 py-3 font-medium text-text-muted w-16">Rank</th>
                    <th className="text-left px-4 py-3 font-medium text-text-muted">Name</th>
                    <th className="text-center px-4 py-3 font-medium text-text-muted">Total Referrals</th>
                    <th className="text-center px-4 py-3 font-medium text-text-muted">Hired</th>
                    <th className="text-right px-4 py-3 font-medium text-text-muted">Bonus Earned</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry) => (
                    <tr
                      key={entry.employeeId}
                      className={`border-b border-border last:border-0 hover:bg-background/50 ${
                        entry.rank <= 3 ? 'bg-yellow-50/30' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center">
                          {getRankIcon(entry.rank)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-medium ${entry.rank <= 3 ? 'text-text' : 'text-text-muted'}`}>
                          {entry.employeeName}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-text">{entry.totalReferrals}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                          {entry.hired}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-text">
                        ${entry.bonusEarned.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-10">
              <Trophy className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm text-text-muted">No leaderboard data available yet.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
