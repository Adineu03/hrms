'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  Inbox,
  Calendar,
  X,
  ArrowRight,
} from 'lucide-react';

const inputClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary';
const selectClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary appearance-none';

interface ProbationRecord {
  id: string;
  employeeName: string;
  employeeId: string;
  department: string;
  startDate: string;
  endDate: string;
  reviewDate: string | null;
  status: string;
  daysRemaining: number;
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-blue-100 text-blue-700',
  review_due: 'bg-yellow-50 text-yellow-700',
  confirmed: 'bg-green-100 text-green-700',
  extended: 'bg-orange-100 text-orange-700',
  terminated: 'bg-red-100 text-red-700',
};

type ActionType = 'review' | 'confirm' | 'extend' | null;

export default function ProbationMgmtTab() {
  const [records, setRecords] = useState<ProbationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [actionType, setActionType] = useState<ActionType>(null);
  const [selectedRecord, setSelectedRecord] = useState<ProbationRecord | null>(null);
  const [actionFormData, setActionFormData] = useState({ reviewDate: '', extendDays: 30, notes: '' });
  const [isSaving, setIsSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/onboarding-offboarding/manager/probation');
      setRecords(Array.isArray(res.data) ? res.data : res.data?.data || []);
    } catch {
      setError('Failed to load probation records.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAction = async () => {
    if (!selectedRecord || !actionType) return;
    setIsSaving(true);
    setError(null);
    try {
      switch (actionType) {
        case 'review':
          await api.patch(`/onboarding-offboarding/manager/probation/${selectedRecord.id}/schedule-review`, {
            reviewDate: actionFormData.reviewDate,
            notes: actionFormData.notes,
          });
          setSuccess('Review scheduled.');
          break;
        case 'confirm':
          await api.patch(`/onboarding-offboarding/manager/probation/${selectedRecord.id}/confirm`, {
            notes: actionFormData.notes,
          });
          setSuccess('Employee confirmed.');
          break;
        case 'extend':
          await api.patch(`/onboarding-offboarding/manager/probation/${selectedRecord.id}/extend`, {
            extendDays: actionFormData.extendDays,
            notes: actionFormData.notes,
          });
          setSuccess('Probation extended.');
          break;
      }
      setActionType(null);
      setSelectedRecord(null);
      setActionFormData({ reviewDate: '', extendDays: 30, notes: '' });
      loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError(`Failed to ${actionType} probation.`);
    } finally {
      setIsSaving(false);
    }
  };

  const openAction = (record: ProbationRecord, type: ActionType) => {
    setSelectedRecord(record);
    setActionType(type);
    setActionFormData({ reviewDate: '', extendDays: 30, notes: '' });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading probation records...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-text flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Probation Management
        </h2>
        <p className="text-sm text-text-muted">Track probation periods, schedule reviews, and confirm or extend probation.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />{error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />{success}
        </div>
      )}

      {/* Table */}
      <div className="border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-background border-b border-border">
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Employee</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Start Date</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">End Date</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Days Left</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Review Date</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Status</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {records.map((rec) => (
              <tr key={rec.id} className="bg-card hover:bg-background/50 transition-colors">
                <td className="px-4 py-3">
                  <div className="text-sm text-text font-medium">{rec.employeeName}</div>
                  <div className="text-xs text-text-muted">{rec.department}</div>
                </td>
                <td className="px-4 py-3 text-sm text-text-muted">
                  {rec.startDate ? new Date(rec.startDate).toLocaleDateString() : '--'}
                </td>
                <td className="px-4 py-3 text-sm text-text-muted">
                  {rec.endDate ? new Date(rec.endDate).toLocaleDateString() : '--'}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-sm font-medium ${rec.daysRemaining <= 7 ? 'text-red-600' : rec.daysRemaining <= 30 ? 'text-yellow-600' : 'text-text-muted'}`}>
                    {rec.daysRemaining > 0 ? rec.daysRemaining : 'Overdue'}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-text-muted">
                  {rec.reviewDate ? new Date(rec.reviewDate).toLocaleDateString() : 'Not scheduled'}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[rec.status] || 'bg-gray-100 text-gray-600'}`}>
                    {rec.status.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    {rec.status !== 'confirmed' && rec.status !== 'terminated' && (
                      <>
                        <button
                          type="button"
                          onClick={() => openAction(rec, 'review')}
                          className="px-2 py-1 text-[10px] font-medium text-text-muted hover:text-primary border border-border rounded transition-colors"
                          title="Schedule Review"
                        >
                          <Calendar className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openAction(rec, 'confirm')}
                          className="px-2 py-1 text-[10px] font-medium text-text-muted hover:text-green-600 border border-border rounded transition-colors"
                          title="Confirm"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openAction(rec, 'extend')}
                          className="px-2 py-1 text-[10px] font-medium text-text-muted hover:text-orange-600 border border-border rounded transition-colors"
                          title="Extend"
                        >
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {records.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center">
                  <Inbox className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm text-text-muted">No probation records found.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Action Modal */}
      {actionType && selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-card border border-border rounded-xl shadow-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text capitalize">
                {actionType === 'review' && 'Schedule Probation Review'}
                {actionType === 'confirm' && 'Confirm Employee'}
                {actionType === 'extend' && 'Extend Probation'}
              </h3>
              <button type="button" onClick={() => { setActionType(null); setSelectedRecord(null); }} className="text-text-muted hover:text-text">
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-sm text-text-muted mb-4">
              Employee: <strong className="text-text">{selectedRecord.employeeName}</strong>
            </p>

            <div className="space-y-4">
              {actionType === 'review' && (
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Review Date *</label>
                  <input
                    type="date"
                    value={actionFormData.reviewDate}
                    onChange={(e) => setActionFormData({ ...actionFormData, reviewDate: e.target.value })}
                    className={inputClassName}
                  />
                </div>
              )}
              {actionType === 'extend' && (
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Extend by (days)</label>
                  <select
                    value={actionFormData.extendDays}
                    onChange={(e) => setActionFormData({ ...actionFormData, extendDays: parseInt(e.target.value) })}
                    className={selectClassName}
                  >
                    <option value={15}>15 days</option>
                    <option value={30}>30 days</option>
                    <option value={60}>60 days</option>
                    <option value={90}>90 days</option>
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Notes</label>
                <textarea
                  value={actionFormData.notes}
                  onChange={(e) => setActionFormData({ ...actionFormData, notes: e.target.value })}
                  className={`${inputClassName} min-h-[60px]`}
                  placeholder="Add notes..."
                  rows={3}
                />
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button type="button" onClick={handleAction} disabled={isSaving} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors">
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                {actionType === 'review' && 'Schedule Review'}
                {actionType === 'confirm' && 'Confirm Employee'}
                {actionType === 'extend' && 'Extend Probation'}
              </button>
              <button type="button" onClick={() => { setActionType(null); setSelectedRecord(null); }} className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
