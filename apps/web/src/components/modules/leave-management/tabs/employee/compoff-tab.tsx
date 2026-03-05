'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  Gift,
  PlusCircle,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  X,
} from 'lucide-react';

const inputClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary';
const selectClassName = inputClassName + ' appearance-none';

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700',
  approved: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-700',
  active: 'bg-green-50 text-green-700',
  used: 'bg-blue-50 text-blue-700',
  expired: 'bg-red-50 text-red-700',
  cancelled: 'bg-gray-100 text-gray-600',
};

interface CompoffBalance {
  earned: number;
  used: number;
  expired: number;
  available: number;
}

interface CompoffRecord {
  id: string;
  earnedDate: string;
  reason: string;
  workType: string;
  days: number;
  expiryDate: string | null;
  status: string;
  createdAt: string;
}

interface ExpiringCompoff {
  id: string;
  earnedDate: string;
  days: number;
  expiryDate: string;
  daysUntilExpiry: number;
}

export default function CompoffTab() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [balance, setBalance] = useState<CompoffBalance>({ earned: 0, used: 0, expired: 0, available: 0 });
  const [records, setRecords] = useState<CompoffRecord[]>([]);
  const [expiringRecords, setExpiringRecords] = useState<ExpiringCompoff[]>([]);

  // Claim form
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [claimEarnedDate, setClaimEarnedDate] = useState('');
  const [claimReason, setClaimReason] = useState('');
  const [claimWorkType, setClaimWorkType] = useState('weekend');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [recRes, balRes, expRes] = await Promise.all([
        api.get('/leave-management/employee/compoff'),
        api.get('/leave-management/employee/compoff/balance'),
        api.get('/leave-management/employee/compoff/expiring-soon').catch(() => ({ data: [] })),
      ]);

      setRecords(Array.isArray(recRes.data) ? recRes.data : recRes.data?.data || []);
      setBalance(balRes.data || { earned: 0, used: 0, expired: 0, available: 0 });
      setExpiringRecords(Array.isArray(expRes.data) ? expRes.data : expRes.data?.data || []);
    } catch {
      setError('Failed to load comp-off data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleClaimSubmit = async () => {
    setError(null);
    setSuccess(null);

    if (!claimEarnedDate) {
      setError('Please select the date you worked.');
      return;
    }
    if (!claimReason.trim()) {
      setError('Please provide a reason for your comp-off claim.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/leave-management/employee/compoff/claim', {
        earnedDate: claimEarnedDate,
        reason: claimReason.trim(),
        workType: claimWorkType,
      });
      setSuccess('Comp-off claim submitted successfully.');
      setShowClaimForm(false);
      setClaimEarnedDate('');
      setClaimReason('');
      setClaimWorkType('weekend');
      await loadData();
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? ((err as { response?: { data?: { message?: string } } }).response?.data?.message ??
            'Failed to submit comp-off claim.')
          : 'Failed to submit comp-off claim.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Messages */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          {success}
          <button type="button" onClick={() => setSuccess(null)} className="ml-auto">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Balance Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-text-muted">Earned</p>
          <p className="text-2xl font-bold text-text mt-1">{balance.earned}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-text-muted">Used</p>
          <p className="text-2xl font-bold text-blue-700 mt-1">{balance.used}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-text-muted">Expired</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{balance.expired}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-text-muted">Available</p>
          <p className="text-2xl font-bold text-green-700 mt-1">{balance.available}</p>
        </div>
      </div>

      {/* Expiring Soon Section */}
      {expiringRecords.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-yellow-700" />
            <h3 className="text-sm font-semibold text-yellow-800">Expiring Soon</h3>
          </div>
          <div className="space-y-2">
            {expiringRecords.map((exp) => (
              <div
                key={exp.id}
                className="flex items-center justify-between bg-white/70 rounded-lg px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-yellow-800">
                    {exp.days} day{exp.days !== 1 ? 's' : ''} comp-off
                  </p>
                  <p className="text-xs text-yellow-700">
                    Earned: {new Date(exp.earnedDate).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-yellow-800">
                    {exp.daysUntilExpiry} day{exp.daysUntilExpiry !== 1 ? 's' : ''} left
                  </p>
                  <p className="text-xs text-yellow-700">
                    Expires: {new Date(exp.expiryDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Claim Comp-Off Section */}
      <div className="bg-card border border-border rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Gift className="h-4 w-4 text-primary" />
            <h3 className="text-base font-semibold text-text">Claim Comp-Off</h3>
          </div>
          {!showClaimForm && (
            <button
              type="button"
              onClick={() => setShowClaimForm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/5 rounded-lg transition-colors"
            >
              <PlusCircle className="h-4 w-4" />
              New Claim
            </button>
          )}
        </div>

        {showClaimForm && (
          <div className="space-y-4 border-t border-border pt-4">
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">Date Worked</label>
              <input
                type="date"
                value={claimEarnedDate}
                onChange={(e) => setClaimEarnedDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className={inputClassName}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1.5">Work Type</label>
              <select
                value={claimWorkType}
                onChange={(e) => setClaimWorkType(e.target.value)}
                className={selectClassName}
              >
                <option value="weekend">Weekend Work</option>
                <option value="holiday">Holiday Work</option>
                <option value="extra_hours">Extra Hours</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1.5">Reason</label>
              <textarea
                value={claimReason}
                onChange={(e) => setClaimReason(e.target.value)}
                placeholder="Describe the work done..."
                rows={3}
                className={inputClassName + ' resize-none'}
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowClaimForm(false);
                  setClaimEarnedDate('');
                  setClaimReason('');
                  setClaimWorkType('weekend');
                }}
                className="flex-1 py-2 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClaimSubmit}
                disabled={isSubmitting}
                className="flex-1 py-2 rounded-lg text-sm font-semibold bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <PlusCircle className="h-4 w-4" />
                )}
                Submit Claim
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Comp-Off Records Table */}
      {records.length > 0 ? (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="h-5 w-5 text-text-muted" />
            <h2 className="text-lg font-semibold text-text">Comp-Off Records</h2>
          </div>

          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-background border-b border-border">
                  <th className="text-left px-4 py-3 font-medium text-text-muted">Date Earned</th>
                  <th className="text-left px-4 py-3 font-medium text-text-muted">Reason</th>
                  <th className="text-left px-4 py-3 font-medium text-text-muted">Work Type</th>
                  <th className="text-left px-4 py-3 font-medium text-text-muted">Days</th>
                  <th className="text-left px-4 py-3 font-medium text-text-muted">Expiry</th>
                  <th className="text-left px-4 py-3 font-medium text-text-muted">Status</th>
                </tr>
              </thead>
              <tbody>
                {records.map((rec) => (
                  <tr key={rec.id} className="border-b border-border last:border-0 hover:bg-background/50">
                    <td className="px-4 py-3 text-text font-medium">
                      {new Date(rec.earnedDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-text-muted max-w-[200px] truncate">
                      {rec.reason}
                    </td>
                    <td className="px-4 py-3 text-text-muted capitalize">
                      {rec.workType.replace('_', ' ')}
                    </td>
                    <td className="px-4 py-3 text-text">{rec.days}</td>
                    <td className="px-4 py-3 text-text-muted">
                      {rec.expiryDate
                        ? new Date(rec.expiryDate).toLocaleDateString()
                        : 'N/A'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          STATUS_STYLES[rec.status] || 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {rec.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <Gift className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm text-text-muted">No comp-off records found.</p>
          <p className="text-xs text-text-muted mt-1">Claim comp-off for days you worked on weekends or holidays.</p>
        </div>
      )}
    </div>
  );
}
