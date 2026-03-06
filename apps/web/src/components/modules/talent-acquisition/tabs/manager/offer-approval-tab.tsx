'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  X,
  FileText,
  DollarSign,
  MapPin,
  Building,
  Clock,
  Eye,
  MessageSquare,
  Inbox,
} from 'lucide-react';

interface PendingOffer {
  id: string;
  candidateName: string;
  candidateEmail: string;
  designation: string;
  department: string;
  salary: number;
  location: string;
  joiningDate: string;
  employmentType: string;
  status: string;
  createdAt: string;
  candidateProfile: {
    name: string;
    email: string;
    phone: string;
    currentTitle: string;
    currentCompany: string;
    experience: number;
  };
  interviewSummary: {
    rounds: number;
    avgScore: number;
    finalDecision: string;
    interviewers: { name: string; score: number; decision: string }[];
  };
  offerDetails: {
    baseSalary: number;
    bonus: number;
    equity: string;
    benefits: string;
    noticePeriod: string;
    probationPeriod: string;
  };
}

interface TrackedOffer {
  id: string;
  candidateName: string;
  designation: string;
  salary: number;
  status: 'accepted' | 'pending' | 'rejected' | 'counter_offered';
  approvedAt: string;
  respondedAt: string;
}

const inputClassName = 'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary';

const OFFER_STATUS_STYLES: Record<string, string> = {
  pending_approval: 'bg-yellow-50 text-yellow-700',
  approved: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-700',
  counter_offered: 'bg-orange-50 text-orange-700',
  accepted: 'bg-emerald-50 text-emerald-700',
  declined: 'bg-red-50 text-red-700',
  pending: 'bg-blue-50 text-blue-700',
};

export default function OfferApprovalTab() {
  const [offers, setOffers] = useState<PendingOffer[]>([]);
  const [trackedOffers, setTrackedOffers] = useState<TrackedOffer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedOffer, setSelectedOffer] = useState<PendingOffer | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeSection, setActiveSection] = useState<'pending' | 'tracking'>('pending');

  // Action modals
  const [actionModal, setActionModal] = useState<{
    offerId: string;
    action: 'approve' | 'reject' | 'counter';
    candidateName: string;
  } | null>(null);
  const [actionComment, setActionComment] = useState('');
  const [counterSalary, setCounterSalary] = useState('');
  const [counterNotes, setCounterNotes] = useState('');

  const loadData = useCallback(async () => {
    setError(null);
    try {
      const [offersRes, trackingRes] = await Promise.all([
        api.get('/talent-acquisition/manager/offers'),
        api.get('/talent-acquisition/manager/offers/tracking'),
      ]);
      setOffers(Array.isArray(offersRes.data) ? offersRes.data : offersRes.data?.data || []);
      setTrackedOffers(Array.isArray(trackingRes.data) ? trackingRes.data : trackingRes.data?.data || []);
    } catch {
      setError('Failed to load offers.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleApprove = async (offerId: string, comment: string) => {
    setIsProcessing(true);
    setError(null);
    try {
      await api.post(`/talent-acquisition/manager/offers/${offerId}/approve`, {
        comment: comment.trim() || undefined,
      });
      setOffers((prev) => prev.filter((o) => o.id !== offerId));
      setSuccess('Offer approved successfully.');
      setActionModal(null);
      setActionComment('');
      setSelectedOffer(null);
      setTimeout(() => setSuccess(null), 4000);
    } catch {
      setError('Failed to approve offer.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (offerId: string, reason: string) => {
    if (!reason.trim()) {
      setError('A reason is required when rejecting an offer.');
      return;
    }
    setIsProcessing(true);
    setError(null);
    try {
      await api.post(`/talent-acquisition/manager/offers/${offerId}/reject`, {
        reason: reason.trim(),
      });
      setOffers((prev) => prev.filter((o) => o.id !== offerId));
      setSuccess('Offer rejected.');
      setActionModal(null);
      setActionComment('');
      setSelectedOffer(null);
      setTimeout(() => setSuccess(null), 4000);
    } catch {
      setError('Failed to reject offer.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCounter = async (offerId: string) => {
    if (!counterSalary.trim()) {
      setError('Suggested salary is required for counter-offer.');
      return;
    }
    setIsProcessing(true);
    setError(null);
    try {
      await api.post(`/talent-acquisition/manager/offers/${offerId}/counter`, {
        suggestedSalary: Number(counterSalary),
        notes: counterNotes.trim() || undefined,
      });
      setOffers((prev) => prev.filter((o) => o.id !== offerId));
      setSuccess('Counter-offer submitted.');
      setActionModal(null);
      setCounterSalary('');
      setCounterNotes('');
      setSelectedOffer(null);
      setTimeout(() => setSuccess(null), 4000);
    } catch {
      setError('Failed to submit counter-offer.');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatLabel = (s: string) => s.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading offers...</span>
      </div>
    );
  }

  // Detail view
  if (selectedOffer) {
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

        <button type="button" onClick={() => setSelectedOffer(null)} className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-primary transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to Offers
        </button>

        {/* Candidate Profile */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-text mb-3">Candidate Profile</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-text-muted">Name</p>
              <p className="text-sm font-medium text-text">{selectedOffer.candidateProfile?.name || selectedOffer.candidateName}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Email</p>
              <p className="text-sm text-text">{selectedOffer.candidateProfile?.email || selectedOffer.candidateEmail}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Phone</p>
              <p className="text-sm text-text">{selectedOffer.candidateProfile?.phone || '--'}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Current Role</p>
              <p className="text-sm text-text">{selectedOffer.candidateProfile?.currentTitle || '--'} at {selectedOffer.candidateProfile?.currentCompany || '--'}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Experience</p>
              <p className="text-sm text-text">{selectedOffer.candidateProfile?.experience || 0} years</p>
            </div>
          </div>
        </div>

        {/* Interview Summary */}
        {selectedOffer.interviewSummary && (
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-text mb-3">Interview Summary</h3>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <p className="text-xs text-text-muted">Rounds</p>
                <p className="text-sm font-medium text-text">{selectedOffer.interviewSummary.rounds}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted">Avg Score</p>
                <p className="text-sm font-medium text-text">{selectedOffer.interviewSummary.avgScore}/10</p>
              </div>
              <div>
                <p className="text-xs text-text-muted">Final Decision</p>
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                  selectedOffer.interviewSummary.finalDecision === 'hire' || selectedOffer.interviewSummary.finalDecision === 'strong_hire'
                    ? 'bg-green-50 text-green-700'
                    : 'bg-yellow-50 text-yellow-700'
                }`}>
                  {formatLabel(selectedOffer.interviewSummary.finalDecision)}
                </span>
              </div>
            </div>
            {selectedOffer.interviewSummary.interviewers?.length > 0 && (
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-background border-b border-border">
                      <th className="text-left text-[10px] font-semibold text-text-muted uppercase px-3 py-2">Interviewer</th>
                      <th className="text-left text-[10px] font-semibold text-text-muted uppercase px-3 py-2">Score</th>
                      <th className="text-left text-[10px] font-semibold text-text-muted uppercase px-3 py-2">Decision</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {selectedOffer.interviewSummary.interviewers.map((iv, idx) => (
                      <tr key={idx} className="bg-card">
                        <td className="px-3 py-2 text-xs text-text font-medium">{iv.name}</td>
                        <td className="px-3 py-2 text-xs text-text">{iv.score}/10</td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            iv.decision === 'hire' || iv.decision === 'strong_hire' ? 'bg-green-50 text-green-700' : iv.decision === 'next_round' ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'
                          }`}>
                            {formatLabel(iv.decision)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Offer Details */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-text mb-3">Offer Details</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-text-muted">Designation</p>
              <p className="text-sm font-medium text-text">{selectedOffer.designation}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Department</p>
              <p className="text-sm text-text">{selectedOffer.department}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Location</p>
              <div className="flex items-center gap-1 text-sm text-text">
                <MapPin className="h-3 w-3 text-text-muted" />
                {selectedOffer.location}
              </div>
            </div>
            <div>
              <p className="text-xs text-text-muted">Base Salary</p>
              <p className="text-sm font-medium text-text">${(selectedOffer.offerDetails?.baseSalary || selectedOffer.salary).toLocaleString()}</p>
            </div>
            {selectedOffer.offerDetails?.bonus > 0 && (
              <div>
                <p className="text-xs text-text-muted">Bonus</p>
                <p className="text-sm text-text">${selectedOffer.offerDetails.bonus.toLocaleString()}</p>
              </div>
            )}
            {selectedOffer.offerDetails?.equity && (
              <div>
                <p className="text-xs text-text-muted">Equity</p>
                <p className="text-sm text-text">{selectedOffer.offerDetails.equity}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-text-muted">Employment Type</p>
              <p className="text-sm text-text">{formatLabel(selectedOffer.employmentType)}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Joining Date</p>
              <p className="text-sm text-text">{new Date(selectedOffer.joiningDate).toLocaleDateString()}</p>
            </div>
            {selectedOffer.offerDetails?.probationPeriod && (
              <div>
                <p className="text-xs text-text-muted">Probation</p>
                <p className="text-sm text-text">{selectedOffer.offerDetails.probationPeriod}</p>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setActionModal({ offerId: selectedOffer.id, action: 'approve', candidateName: selectedOffer.candidateName })}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
          >
            <CheckCircle2 className="h-4 w-4" />
            Approve Offer
          </button>
          <button
            type="button"
            onClick={() => setActionModal({ offerId: selectedOffer.id, action: 'reject', candidateName: selectedOffer.candidateName })}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
          >
            <XCircle className="h-4 w-4" />
            Reject Offer
          </button>
          <button
            type="button"
            onClick={() => setActionModal({ offerId: selectedOffer.id, action: 'counter', candidateName: selectedOffer.candidateName })}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors"
          >
            <MessageSquare className="h-4 w-4" />
            Counter-Offer
          </button>
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

      {/* Section Toggle */}
      <div className="flex items-center gap-1 bg-background rounded-lg p-1 border border-border w-fit">
        <button
          type="button"
          onClick={() => setActiveSection('pending')}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${activeSection === 'pending' ? 'bg-white text-text shadow-sm' : 'text-text-muted hover:text-text'}`}
        >
          Pending Approval ({offers.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('tracking')}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${activeSection === 'tracking' ? 'bg-white text-text shadow-sm' : 'text-text-muted hover:text-text'}`}
        >
          Tracking ({trackedOffers.length})
        </button>
      </div>

      {/* Pending Offers */}
      {activeSection === 'pending' && (
        <>
          {offers.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-8 text-center">
              <Inbox className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm text-text-muted">No offers pending your approval.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {offers.map((offer) => (
                <div key={offer.id} className="bg-card border border-border rounded-xl p-5 hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-sm font-semibold text-text">{offer.candidateName}</p>
                      <p className="text-xs text-text-muted">{offer.candidateEmail}</p>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${OFFER_STATUS_STYLES[offer.status] || 'bg-gray-50 text-gray-700'}`}>
                      {formatLabel(offer.status)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="flex items-center gap-1.5 text-xs text-text-muted">
                      <Building className="h-3 w-3" />
                      <span>{offer.designation}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-text-muted">
                      <FileText className="h-3 w-3" />
                      <span>{offer.department}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-text-muted">
                      <DollarSign className="h-3 w-3" />
                      <span className="font-medium text-text">${offer.salary.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-text-muted">
                      <MapPin className="h-3 w-3" />
                      <span>{offer.location}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedOffer(offer)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                    >
                      <Eye className="h-3 w-3" />
                      View Details
                    </button>
                    <button
                      type="button"
                      onClick={() => setActionModal({ offerId: offer.id, action: 'approve', candidateName: offer.candidateName })}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => setActionModal({ offerId: offer.id, action: 'reject', candidateName: offer.candidateName })}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
                    >
                      <XCircle className="h-3 w-3" />
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Tracking */}
      {activeSection === 'tracking' && (
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-background border-b border-border">
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Candidate</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Designation</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Salary</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Status</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Approved</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Responded</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {trackedOffers.map((offer) => (
                <tr key={offer.id} className="bg-card hover:bg-background/50 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-text">{offer.candidateName}</td>
                  <td className="px-4 py-3 text-sm text-text-muted">{offer.designation}</td>
                  <td className="px-4 py-3 text-sm font-medium text-text">${offer.salary.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${OFFER_STATUS_STYLES[offer.status] || 'bg-gray-50 text-gray-700'}`}>
                      {formatLabel(offer.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-muted">
                    {offer.approvedAt ? new Date(offer.approvedAt).toLocaleDateString() : '--'}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-muted">
                    {offer.respondedAt ? new Date(offer.respondedAt).toLocaleDateString() : '--'}
                  </td>
                </tr>
              ))}
              {trackedOffers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center">
                    <Clock className="h-10 w-10 mx-auto mb-3 opacity-40" />
                    <p className="text-sm text-text-muted">No tracked offers yet.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Action Modal */}
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-card border border-border rounded-xl shadow-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text">
                {actionModal.action === 'approve' && 'Approve Offer'}
                {actionModal.action === 'reject' && 'Reject Offer'}
                {actionModal.action === 'counter' && 'Counter-Offer'}
              </h3>
              <button
                type="button"
                onClick={() => { setActionModal(null); setActionComment(''); setCounterSalary(''); setCounterNotes(''); }}
                className="text-text-muted hover:text-text"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-sm text-text-muted mb-4">
              {actionModal.action === 'approve' && `Approve the offer for ${actionModal.candidateName}?`}
              {actionModal.action === 'reject' && `Reject the offer for ${actionModal.candidateName}?`}
              {actionModal.action === 'counter' && `Submit a counter-offer for ${actionModal.candidateName}?`}
            </p>

            {actionModal.action === 'approve' && (
              <div className="mb-4">
                <label className="block text-xs font-medium text-text-muted mb-1">Comment (optional)</label>
                <textarea
                  value={actionComment}
                  onChange={(e) => setActionComment(e.target.value)}
                  rows={3}
                  className={inputClassName}
                  placeholder="Add a comment..."
                />
              </div>
            )}

            {actionModal.action === 'reject' && (
              <div className="mb-4">
                <label className="block text-xs font-medium text-text-muted mb-1">Reason *</label>
                <textarea
                  value={actionComment}
                  onChange={(e) => setActionComment(e.target.value)}
                  rows={3}
                  className={inputClassName}
                  placeholder="Provide a reason for rejection..."
                />
              </div>
            )}

            {actionModal.action === 'counter' && (
              <div className="space-y-4 mb-4">
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Suggested Salary *</label>
                  <input
                    type="number"
                    value={counterSalary}
                    onChange={(e) => setCounterSalary(e.target.value)}
                    className={inputClassName}
                    placeholder="e.g. 95000"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Notes</label>
                  <textarea
                    value={counterNotes}
                    onChange={(e) => setCounterNotes(e.target.value)}
                    rows={3}
                    className={inputClassName}
                    placeholder="Justification or additional notes..."
                  />
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              {actionModal.action === 'approve' && (
                <button
                  type="button"
                  onClick={() => handleApprove(actionModal.offerId, actionComment)}
                  disabled={isProcessing}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
                  Approve
                </button>
              )}
              {actionModal.action === 'reject' && (
                <button
                  type="button"
                  onClick={() => handleReject(actionModal.offerId, actionComment)}
                  disabled={isProcessing || !actionComment.trim()}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
                  Reject
                </button>
              )}
              {actionModal.action === 'counter' && (
                <button
                  type="button"
                  onClick={() => handleCounter(actionModal.offerId)}
                  disabled={isProcessing || !counterSalary.trim()}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors"
                >
                  {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
                  Submit Counter
                </button>
              )}
              <button
                type="button"
                onClick={() => { setActionModal(null); setActionComment(''); setCounterSalary(''); setCounterNotes(''); }}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
