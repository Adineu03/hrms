'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  Gift,
  Inbox,
  Download,
  X,
  Check,
  Building2,
  MapPin,
  DollarSign,
  Calendar,
  Clock,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  FileText,
  ArrowRight,
} from 'lucide-react';

const inputClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700',
  accepted: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-700',
  expired: 'bg-gray-100 text-gray-600',
  withdrawn: 'bg-gray-100 text-gray-600',
};

interface OfferDetails {
  id: string;
  designation: string;
  department: string;
  location: string;
  salary: number;
  currency: string;
  status: string;
  joiningDate: string;
  validUntil: string;
  benefits: string[];
  salaryBreakdown: { component: string; amount: number }[];
  offerTerms: string;
  documentUrl: string | null;
}

interface JoiningFormality {
  id: string;
  label: string;
  completed: boolean;
  category: string;
}

interface JoiningInfo {
  formalities: JoiningFormality[];
  documentsSubmitted: { name: string; status: string }[];
  joiningDateConfirmed: boolean;
  joiningDate: string;
}

export default function OfferJoiningTab() {
  const [offers, setOffers] = useState<OfferDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Detail view
  const [expandedOfferId, setExpandedOfferId] = useState<string | null>(null);

  // Accept dialog
  const [showAcceptDialog, setShowAcceptDialog] = useState(false);
  const [acceptTargetId, setAcceptTargetId] = useState<string | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);

  // Reject dialog
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  // Joining formalities
  const [joiningInfo, setJoiningInfo] = useState<Record<string, JoiningInfo>>({});
  const [loadingJoining, setLoadingJoining] = useState<string | null>(null);
  const [confirmingJoining, setConfirmingJoining] = useState<string | null>(null);

  const loadOffers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get('/talent-acquisition/employee/offers');
      setOffers(Array.isArray(res.data) ? res.data : res.data?.data || []);
    } catch {
      setError('Failed to load offers.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOffers();
  }, [loadOffers]);

  const loadJoiningInfo = async (offerId: string) => {
    setLoadingJoining(offerId);
    try {
      const res = await api.get(`/talent-acquisition/employee/offers/${offerId}/joining`);
      const data = res.data?.data || res.data;
      setJoiningInfo((prev) => ({ ...prev, [offerId]: data }));
    } catch {
      setError('Failed to load joining formalities.');
    } finally {
      setLoadingJoining(null);
    }
  };

  const handleExpand = async (offerId: string) => {
    if (expandedOfferId === offerId) {
      setExpandedOfferId(null);
      return;
    }
    setExpandedOfferId(offerId);
    const offer = offers.find((o) => o.id === offerId);
    if (offer?.status === 'accepted' && !joiningInfo[offerId]) {
      await loadJoiningInfo(offerId);
    }
  };

  const openAcceptDialog = (offerId: string) => {
    setAcceptTargetId(offerId);
    setShowAcceptDialog(true);
  };

  const handleAccept = async () => {
    if (!acceptTargetId) return;
    setIsAccepting(true);
    setError(null);
    try {
      await api.post(`/talent-acquisition/employee/offers/${acceptTargetId}/accept`);
      setSuccess('Offer accepted! Congratulations on your new role.');
      setShowAcceptDialog(false);
      setOffers((prev) =>
        prev.map((o) => (o.id === acceptTargetId ? { ...o, status: 'accepted' } : o))
      );
      setAcceptTargetId(null);
      setTimeout(() => setSuccess(null), 5000);
    } catch {
      setError('Failed to accept offer.');
    } finally {
      setIsAccepting(false);
    }
  };

  const openRejectDialog = (offerId: string) => {
    setRejectTargetId(offerId);
    setRejectReason('');
    setShowRejectDialog(true);
  };

  const handleReject = async () => {
    if (!rejectTargetId) return;
    if (!rejectReason.trim()) {
      setError('Please provide a reason for declining the offer.');
      return;
    }
    setIsRejecting(true);
    setError(null);
    try {
      await api.post(`/talent-acquisition/employee/offers/${rejectTargetId}/reject`, {
        reason: rejectReason.trim(),
      });
      setSuccess('Offer declined.');
      setShowRejectDialog(false);
      setOffers((prev) =>
        prev.map((o) => (o.id === rejectTargetId ? { ...o, status: 'rejected' } : o))
      );
      setRejectTargetId(null);
      setTimeout(() => setSuccess(null), 4000);
    } catch {
      setError('Failed to decline offer.');
    } finally {
      setIsRejecting(false);
    }
  };

  const handleDownloadOffer = async (offerId: string) => {
    try {
      const res = await api.get(`/talent-acquisition/employee/offers/${offerId}/document`);
      const url = res.data?.url || res.data?.data?.url;
      if (url) {
        window.open(url, '_blank');
      } else {
        setError('Offer document not available.');
      }
    } catch {
      setError('Failed to download offer letter.');
    }
  };

  const handleConfirmJoining = async (offerId: string) => {
    setConfirmingJoining(offerId);
    setError(null);
    try {
      await api.post(`/talent-acquisition/employee/offers/${offerId}/joining/confirm`);
      setSuccess('Joining date confirmed.');
      if (joiningInfo[offerId]) {
        setJoiningInfo((prev) => ({
          ...prev,
          [offerId]: { ...prev[offerId], joiningDateConfirmed: true },
        }));
      }
      setTimeout(() => setSuccess(null), 4000);
    } catch {
      setError('Failed to confirm joining date.');
    } finally {
      setConfirmingJoining(null);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatLabel = (str: string) =>
    str.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  const isOfferExpired = (validUntil: string) => {
    if (!validUntil) return false;
    return new Date(validUntil) < new Date();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading offers...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-text flex items-center gap-2">
          <Gift className="h-5 w-5" />
          Offer &amp; Joining
        </h2>
        <p className="text-sm text-text-muted">View and manage offers for internal transfers or promotions.</p>
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

      {/* Offers */}
      {offers.length > 0 ? (
        <div className="space-y-4">
          {offers.map((offer) => (
            <div key={offer.id} className="bg-card border border-border rounded-xl p-4">
              {/* Offer Card Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-text">{offer.designation}</h3>
                  <div className="flex items-center gap-3 mt-1 text-xs text-text-muted flex-wrap">
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {offer.department}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {offer.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      {formatCurrency(offer.salary, offer.currency)}
                    </span>
                  </div>
                </div>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${
                    STATUS_COLORS[offer.status] || 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {formatLabel(offer.status)}
                </span>
              </div>

              {/* Dates */}
              <div className="flex items-center gap-4 mt-3 text-xs text-text-muted flex-wrap">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Joining: {formatDate(offer.joiningDate)}
                </span>
                <span className={`flex items-center gap-1 ${isOfferExpired(offer.validUntil) ? 'text-red-600' : ''}`}>
                  <Clock className="h-3 w-3" />
                  Valid Until: {formatDate(offer.validUntil)}
                  {isOfferExpired(offer.validUntil) && ' (Expired)'}
                </span>
              </div>

              {/* Expand / Actions */}
              <div className="mt-3 flex items-center gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleExpand(offer.id)}
                  className="text-xs text-primary hover:text-primary-hover font-medium flex items-center gap-1 transition-colors"
                >
                  {expandedOfferId === offer.id ? (
                    <>
                      <ChevronUp className="h-3.5 w-3.5" />
                      Hide Details
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3.5 w-3.5" />
                      View Details
                    </>
                  )}
                </button>

                {offer.status === 'pending' && !isOfferExpired(offer.validUntil) && (
                  <>
                    <button
                      type="button"
                      onClick={() => openAcceptDialog(offer.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-white hover:bg-primary-hover transition-colors"
                    >
                      <Check className="h-3 w-3" />
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={() => openRejectDialog(offer.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
                    >
                      <X className="h-3 w-3" />
                      Decline
                    </button>
                  </>
                )}

                {offer.documentUrl && (
                  <button
                    type="button"
                    onClick={() => handleDownloadOffer(offer.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border text-text hover:bg-background transition-colors"
                  >
                    <Download className="h-3 w-3" />
                    Download Offer Letter
                  </button>
                )}
              </div>

              {/* Expanded Detail */}
              {expandedOfferId === offer.id && (
                <div className="mt-4 pt-4 border-t border-border space-y-4">
                  {/* Offer Terms */}
                  {offer.offerTerms && (
                    <div>
                      <h4 className="text-xs font-semibold text-text uppercase tracking-wider mb-1">Offer Terms</h4>
                      <p className="text-sm text-text-muted whitespace-pre-line">{offer.offerTerms}</p>
                    </div>
                  )}

                  {/* Salary Breakdown */}
                  {offer.salaryBreakdown?.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-text uppercase tracking-wider mb-2">Salary Breakdown</h4>
                      <div className="border border-border rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-background border-b border-border">
                              <th className="text-left px-4 py-2 font-medium text-text-muted">Component</th>
                              <th className="text-right px-4 py-2 font-medium text-text-muted">Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {offer.salaryBreakdown.map((item, idx) => (
                              <tr key={idx} className="border-b border-border last:border-0">
                                <td className="px-4 py-2 text-text">{item.component}</td>
                                <td className="px-4 py-2 text-right font-medium text-text">
                                  {formatCurrency(item.amount, offer.currency)}
                                </td>
                              </tr>
                            ))}
                            <tr className="bg-background font-semibold">
                              <td className="px-4 py-2 text-text">Total</td>
                              <td className="px-4 py-2 text-right text-primary">
                                {formatCurrency(offer.salary, offer.currency)}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Benefits */}
                  {offer.benefits?.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-text uppercase tracking-wider mb-1">Benefits</h4>
                      <ul className="list-disc list-inside text-sm text-text-muted space-y-0.5">
                        {offer.benefits.map((b, i) => (
                          <li key={i}>{b}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Joining Formalities (for accepted offers) */}
                  {offer.status === 'accepted' && (
                    <div className="pt-2">
                      <h4 className="text-xs font-semibold text-text uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <ClipboardCheck className="h-3.5 w-3.5 text-primary" />
                        Joining Formalities
                      </h4>

                      {loadingJoining === offer.id ? (
                        <div className="flex items-center gap-2 text-sm text-text-muted py-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading joining details...
                        </div>
                      ) : joiningInfo[offer.id] ? (
                        <div className="space-y-4">
                          {/* Checklist */}
                          {joiningInfo[offer.id].formalities.length > 0 && (
                            <div className="space-y-1.5">
                              {joiningInfo[offer.id].formalities.map((item) => (
                                <label
                                  key={item.id}
                                  className="flex items-center gap-2 text-sm text-text p-2 rounded-lg hover:bg-background/50 cursor-default"
                                >
                                  <input
                                    type="checkbox"
                                    checked={item.completed}
                                    readOnly
                                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                                  />
                                  <span className={item.completed ? 'line-through text-text-muted' : ''}>
                                    {item.label}
                                  </span>
                                  {item.category && (
                                    <span className="ml-auto text-xs text-text-muted">({item.category})</span>
                                  )}
                                </label>
                              ))}
                            </div>
                          )}

                          {/* Document Submission Status */}
                          {joiningInfo[offer.id].documentsSubmitted?.length > 0 && (
                            <div>
                              <h5 className="text-xs font-medium text-text mb-2">Document Submissions</h5>
                              <div className="space-y-1">
                                {joiningInfo[offer.id].documentsSubmitted.map((doc, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-center justify-between text-sm p-2 border-b border-border last:border-0"
                                  >
                                    <span className="flex items-center gap-2 text-text">
                                      <FileText className="h-3.5 w-3.5 text-text-muted" />
                                      {doc.name}
                                    </span>
                                    <span
                                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                        doc.status === 'submitted'
                                          ? 'bg-green-50 text-green-700'
                                          : doc.status === 'pending'
                                          ? 'bg-yellow-50 text-yellow-700'
                                          : 'bg-gray-100 text-gray-600'
                                      }`}
                                    >
                                      {formatLabel(doc.status)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Joining Date Confirmation */}
                          <div className="p-3 bg-background rounded-lg">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-sm">
                                <Calendar className="h-4 w-4 text-primary" />
                                <span className="text-text font-medium">
                                  Joining Date: {formatDate(joiningInfo[offer.id].joiningDate)}
                                </span>
                              </div>
                              {joiningInfo[offer.id].joiningDateConfirmed ? (
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  Confirmed
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleConfirmJoining(offer.id)}
                                  disabled={confirmingJoining === offer.id}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors"
                                >
                                  {confirmingJoining === offer.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Check className="h-3 w-3" />
                                  )}
                                  Confirm Joining Date
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Joining Timeline for accepted */}
                          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-center gap-2 text-sm text-green-800">
                              <ArrowRight className="h-4 w-4" />
                              <span className="font-medium">
                                You have accepted this offer. Your joining date is {formatDate(offer.joiningDate)}.
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => loadJoiningInfo(offer.id)}
                          className="text-xs text-primary hover:text-primary-hover font-medium flex items-center gap-1 transition-colors"
                        >
                          <ClipboardCheck className="h-3.5 w-3.5" />
                          Load Joining Details
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Inbox className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm text-text-muted">No offers to review.</p>
        </div>
      )}

      {/* Accept Confirmation Dialog */}
      {showAcceptDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-lg border border-border w-full max-w-sm mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-text">Accept Offer</h3>
              <button
                type="button"
                onClick={() => {
                  setShowAcceptDialog(false);
                  setAcceptTargetId(null);
                }}
                className="p-1 text-text-muted hover:text-text transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm text-text-muted mb-5">
              Are you sure you want to accept this offer? By accepting, you agree to the offer terms and confirm your intent to join on the specified date.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleAccept}
                disabled={isAccepting}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {isAccepting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Accept Offer
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAcceptDialog(false);
                  setAcceptTargetId(null);
                }}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Confirmation Dialog */}
      {showRejectDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-lg border border-border w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-text">Decline Offer</h3>
              <button
                type="button"
                onClick={() => {
                  setShowRejectDialog(false);
                  setRejectTargetId(null);
                }}
                className="p-1 text-text-muted hover:text-text transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm text-text-muted mb-3">
              Are you sure you want to decline this offer? Please provide a reason.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for declining..."
              rows={3}
              className={`${inputClassName} resize-none mb-4`}
            />
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleReject}
                disabled={isRejecting}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {isRejecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                Decline Offer
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowRejectDialog(false);
                  setRejectTargetId(null);
                }}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors"
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
