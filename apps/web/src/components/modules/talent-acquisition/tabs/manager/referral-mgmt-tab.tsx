'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  Plus,
  X,
  Users,
  Gift,
  Send,
  DollarSign,
  UserPlus,
  Inbox,
} from 'lucide-react';

interface Referral {
  id: string;
  candidateName: string;
  candidateEmail: string;
  candidatePhone: string;
  position: string;
  jobPostingId: string;
  status: string;
  bonusStatus: string;
  relationship: string;
  notes: string;
  submittedAt: string;
}

interface TeamReferral {
  employeeId: string;
  employeeName: string;
  totalReferrals: number;
  hired: number;
  inProcess: number;
}

interface BonusEntry {
  id: string;
  referralId: string;
  candidateName: string;
  position: string;
  amount: number;
  status: 'eligible' | 'processing' | 'paid';
}

interface JobPosting {
  id: string;
  title: string;
  department: string;
}

const inputClassName = 'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary';
const selectClassName = 'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary appearance-none';

const STATUS_STYLES: Record<string, string> = {
  submitted: 'bg-blue-50 text-blue-700',
  screening: 'bg-yellow-50 text-yellow-700',
  shortlisted: 'bg-indigo-50 text-indigo-700',
  interviewing: 'bg-purple-50 text-purple-700',
  hired: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-700',
};

const BONUS_STYLES: Record<string, string> = {
  eligible: 'bg-blue-50 text-blue-700',
  processing: 'bg-yellow-50 text-yellow-700',
  paid: 'bg-green-50 text-green-700',
};

export default function ReferralMgmtTab() {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [teamReferrals, setTeamReferrals] = useState<TeamReferral[]>([]);
  const [bonuses, setBonuses] = useState<BonusEntry[]>([]);
  const [jobPostings, setJobPostings] = useState<JobPosting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showReferralForm, setShowReferralForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeSection, setActiveSection] = useState<'my' | 'team' | 'bonus'>('my');

  const [form, setForm] = useState({
    jobPostingId: '',
    candidateName: '',
    candidateEmail: '',
    candidatePhone: '',
    candidateResume: '',
    relationship: '',
    notes: '',
  });

  const loadData = useCallback(async () => {
    setError(null);
    try {
      const [refRes, teamRes, bonusRes, jobRes] = await Promise.all([
        api.get('/talent-acquisition/manager/referrals'),
        api.get('/talent-acquisition/manager/referrals/team'),
        api.get('/talent-acquisition/manager/referrals/bonus'),
        api.get('/talent-acquisition/manager/referrals/eligible').catch(() => ({ data: [] })),
      ]);
      setReferrals(Array.isArray(refRes.data) ? refRes.data : refRes.data?.data || []);
      setTeamReferrals(Array.isArray(teamRes.data) ? teamRes.data : teamRes.data?.data || []);
      setBonuses(Array.isArray(bonusRes.data) ? bonusRes.data : bonusRes.data?.data || []);
      setJobPostings(Array.isArray(jobRes.data) ? jobRes.data : jobRes.data?.data || []);
    } catch {
      setError('Failed to load referral data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const submitReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.jobPostingId || !form.candidateName.trim() || !form.candidateEmail.trim()) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await api.post('/talent-acquisition/manager/referrals', form);
      const newRef = res.data?.data || res.data;
      setReferrals((prev) => [newRef, ...prev]);
      setSuccess('Referral submitted successfully.');
      setShowReferralForm(false);
      setForm({ jobPostingId: '', candidateName: '', candidateEmail: '', candidatePhone: '', candidateResume: '', relationship: '', notes: '' });
      setTimeout(() => setSuccess(null), 4000);
    } catch {
      setError('Failed to submit referral.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatLabel = (s: string) => s.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  const eligibleBonuses = bonuses.filter((b) => b.status === 'eligible').length;
  const processingBonuses = bonuses.filter((b) => b.status === 'processing').length;
  const paidBonuses = bonuses.filter((b) => b.status === 'paid').length;
  const totalBonusAmount = bonuses.filter((b) => b.status === 'paid').reduce((sum, b) => sum + b.amount, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading referrals...</span>
      </div>
    );
  }

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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center gap-2 mb-1">
            <Send className="h-4 w-4 text-blue-600" />
            <span className="text-xs font-medium text-blue-700 uppercase tracking-wider">My Referrals</span>
          </div>
          <p className="text-2xl font-bold text-blue-700">{referrals.length}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span className="text-xs font-medium text-green-700 uppercase tracking-wider">Hired</span>
          </div>
          <p className="text-2xl font-bold text-green-700">{referrals.filter((r) => r.status === 'hired').length}</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
          <div className="flex items-center gap-2 mb-1">
            <Users className="h-4 w-4 text-purple-600" />
            <span className="text-xs font-medium text-purple-700 uppercase tracking-wider">Team Referrals</span>
          </div>
          <p className="text-2xl font-bold text-purple-700">{teamReferrals.reduce((sum, t) => sum + t.totalReferrals, 0)}</p>
        </div>
        <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="h-4 w-4 text-orange-600" />
            <span className="text-xs font-medium text-orange-700 uppercase tracking-wider">Bonus Earned</span>
          </div>
          <p className="text-2xl font-bold text-orange-700">${totalBonusAmount.toLocaleString()}</p>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 bg-background rounded-lg p-1 border border-border">
          <button
            type="button"
            onClick={() => setActiveSection('my')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${activeSection === 'my' ? 'bg-white text-text shadow-sm' : 'text-text-muted hover:text-text'}`}
          >
            My Referrals
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('team')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${activeSection === 'team' ? 'bg-white text-text shadow-sm' : 'text-text-muted hover:text-text'}`}
          >
            Team Referrals
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('bonus')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${activeSection === 'bonus' ? 'bg-white text-text shadow-sm' : 'text-text-muted hover:text-text'}`}
          >
            Bonus Tracking
          </button>
        </div>
        {activeSection === 'my' && (
          <button
            type="button"
            onClick={() => setShowReferralForm(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover transition-colors"
          >
            <Plus className="h-4 w-4" />
            Submit Referral
          </button>
        )}
      </div>

      {/* My Referrals Table */}
      {activeSection === 'my' && (
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-background border-b border-border">
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Candidate</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Position</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Status</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Bonus Status</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {referrals.map((ref) => (
                <tr key={ref.id} className="bg-card hover:bg-background/50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-text">{ref.candidateName}</p>
                    <p className="text-xs text-text-muted">{ref.candidateEmail}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-muted">{ref.position}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[ref.status] || 'bg-gray-50 text-gray-700'}`}>
                      {formatLabel(ref.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${BONUS_STYLES[ref.bonusStatus] || 'bg-gray-50 text-gray-700'}`}>
                      {ref.bonusStatus ? formatLabel(ref.bonusStatus) : '--'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-muted">
                    {new Date(ref.submittedAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {referrals.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center">
                    <UserPlus className="h-10 w-10 mx-auto mb-3 opacity-40" />
                    <p className="text-sm text-text-muted">No referrals submitted yet. Start referring great candidates!</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Team Referrals */}
      {activeSection === 'team' && (
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-background border-b border-border">
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Team Member</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Total Referrals</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Hired</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">In Process</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Success Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {teamReferrals.map((tr) => {
                const successRate = tr.totalReferrals > 0 ? ((tr.hired / tr.totalReferrals) * 100).toFixed(0) : '0';
                return (
                  <tr key={tr.employeeId} className="bg-card hover:bg-background/50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-text">{tr.employeeName}</td>
                    <td className="px-4 py-3 text-sm text-text font-medium">{tr.totalReferrals}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                        {tr.hired}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                        {tr.inProcess}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden max-w-[80px]">
                          <div
                            className="h-full rounded-full bg-green-500"
                            style={{ width: `${successRate}%` }}
                          />
                        </div>
                        <span className="text-xs text-text-muted font-medium">{successRate}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {teamReferrals.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center">
                    <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
                    <p className="text-sm text-text-muted">No team referral data available.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Bonus Tracking */}
      {activeSection === 'bonus' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200 text-center">
              <p className="text-xs font-medium text-blue-700 uppercase tracking-wider">Eligible</p>
              <p className="text-xl font-bold text-blue-700">{eligibleBonuses}</p>
            </div>
            <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200 text-center">
              <p className="text-xs font-medium text-yellow-700 uppercase tracking-wider">Processing</p>
              <p className="text-xl font-bold text-yellow-700">{processingBonuses}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3 border border-green-200 text-center">
              <p className="text-xs font-medium text-green-700 uppercase tracking-wider">Paid</p>
              <p className="text-xl font-bold text-green-700">{paidBonuses}</p>
            </div>
          </div>

          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-background border-b border-border">
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Candidate</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Position</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Amount</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {bonuses.map((bonus) => (
                  <tr key={bonus.id} className="bg-card hover:bg-background/50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-text">{bonus.candidateName}</td>
                    <td className="px-4 py-3 text-sm text-text-muted">{bonus.position}</td>
                    <td className="px-4 py-3 text-sm font-medium text-text">${bonus.amount.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${BONUS_STYLES[bonus.status] || 'bg-gray-50 text-gray-700'}`}>
                        {formatLabel(bonus.status)}
                      </span>
                    </td>
                  </tr>
                ))}
                {bonuses.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center">
                      <Gift className="h-10 w-10 mx-auto mb-3 opacity-40" />
                      <p className="text-sm text-text-muted">No referral bonuses yet.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Submit Referral Modal */}
      {showReferralForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-card border border-border rounded-xl shadow-lg p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text">Submit Referral</h3>
              <button type="button" onClick={() => setShowReferralForm(false)} className="text-text-muted hover:text-text">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={submitReferral} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Job Posting *</label>
                <select value={form.jobPostingId} onChange={(e) => setForm({ ...form, jobPostingId: e.target.value })} className={selectClassName} required>
                  <option value="">Select position...</option>
                  {jobPostings.map((jp) => (
                    <option key={jp.id} value={jp.id}>{jp.title} - {jp.department}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Candidate Name *</label>
                <input type="text" value={form.candidateName} onChange={(e) => setForm({ ...form, candidateName: e.target.value })} className={inputClassName} placeholder="Full name" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Email *</label>
                  <input type="email" value={form.candidateEmail} onChange={(e) => setForm({ ...form, candidateEmail: e.target.value })} className={inputClassName} placeholder="email@example.com" required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Phone</label>
                  <input type="tel" value={form.candidatePhone} onChange={(e) => setForm({ ...form, candidatePhone: e.target.value })} className={inputClassName} placeholder="+1 (555) 000-0000" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Resume URL</label>
                <input type="url" value={form.candidateResume} onChange={(e) => setForm({ ...form, candidateResume: e.target.value })} className={inputClassName} placeholder="https://..." />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Relationship</label>
                <input type="text" value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })} className={inputClassName} placeholder="e.g. Former colleague, University classmate" />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} className={inputClassName} placeholder="Why do you recommend this candidate?" />
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors">
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Submit Referral
                </button>
                <button type="button" onClick={() => setShowReferralForm(false)} className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
