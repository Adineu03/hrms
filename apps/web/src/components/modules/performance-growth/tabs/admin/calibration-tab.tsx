'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  Scale,
  Inbox,
  ChevronDown,
  ChevronUp,
  Save,
  History,
} from 'lucide-react';

const selectClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary appearance-none';

interface CalibrationEmployee {
  id: string;
  employeeName: string;
  designation: string;
  preCalibrated: number;
  calibrated: number | null;
  managerRating: number;
  selfRating: number;
}

interface CalibrationGroup {
  id: string;
  name: string;
  type: string;
  totalEmployees: number;
  status: string;
  employees: CalibrationEmployee[];
  distribution: { rating: number; count: number; targetPercent: number }[];
}

interface AuditEntry {
  id: string;
  employeeName: string;
  previousRating: number;
  newRating: number;
  changedBy: string;
  reason: string;
  changedAt: string;
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
};

export default function CalibrationTab() {
  const [groups, setGroups] = useState<CalibrationGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [editedRatings, setEditedRatings] = useState<Record<string, number>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showAuditTrail, setShowAuditTrail] = useState(false);
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [viewMode, setViewMode] = useState<'table' | 'distribution'>('table');

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/performance-growth/admin/calibration/groups').catch(() => ({ data: [] }));
      setGroups(Array.isArray(res.data) ? res.data : res.data?.data || []);
    } catch {
      setError('Failed to load calibration data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRatingChange = (employeeId: string, rating: number) => {
    setEditedRatings((prev) => ({ ...prev, [employeeId]: rating }));
  };

  const handleSaveCalibration = async (groupId: string) => {
    const groupEdits = groups
      .find((g) => g.id === groupId)
      ?.employees.filter((emp) => editedRatings[emp.id] !== undefined)
      .map((emp) => ({ employeeId: emp.id, calibratedRating: editedRatings[emp.id] }));

    if (!groupEdits || groupEdits.length === 0) {
      setError('No changes to save.');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await api.patch('/performance-growth/admin/calibration/ratings', { updates: groupEdits.map((e) => ({ assignmentId: e.employeeId, calibratedRating: e.calibratedRating })) });
      setSuccess('Calibration saved successfully.');
      setEditedRatings({});
      loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to save calibration.');
    } finally {
      setIsSaving(false);
    }
  };

  const loadAuditTrail = async () => {
    try {
      const res = await api.get('/performance-growth/admin/calibration/audit-trail').catch(() => ({ data: [] }));
      setAuditEntries(Array.isArray(res.data) ? res.data : res.data?.data || []);
      setShowAuditTrail(true);
    } catch {
      setError('Failed to load audit trail.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading calibration data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text flex items-center gap-2">
            <Scale className="h-5 w-5" />
            Performance Calibration
          </h2>
          <p className="text-sm text-text-muted">Calibrate performance ratings across teams and departments.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setViewMode(viewMode === 'table' ? 'distribution' : 'table')}
            className="px-3 py-2 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors"
          >
            {viewMode === 'table' ? 'Distribution View' : 'Table View'}
          </button>
          <button
            type="button"
            onClick={loadAuditTrail}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors"
          >
            <History className="h-4 w-4" />
            Audit Trail
          </button>
        </div>
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

      {groups.length === 0 ? (
        <div className="text-center py-12">
          <Inbox className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm text-text-muted">No calibration groups available.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <div key={group.id} className="border border-border rounded-xl overflow-hidden">
              {/* Group Header */}
              <div
                className="bg-background px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-background/80 transition-colors"
                onClick={() => setExpandedGroup(expandedGroup === group.id ? null : group.id)}
              >
                <div className="flex items-center gap-3">
                  {expandedGroup === group.id ? <ChevronUp className="h-4 w-4 text-text-muted" /> : <ChevronDown className="h-4 w-4 text-text-muted" />}
                  <div>
                    <span className="text-sm font-semibold text-text">{group.name}</span>
                    <span className="text-xs text-text-muted ml-2 capitalize">({group.type})</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-text-muted">{group.totalEmployees} employees</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[group.status] || 'bg-gray-100 text-gray-600'}`}>
                    {group.status?.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>

              {/* Expanded Content */}
              {expandedGroup === group.id && (
                <div className="px-4 py-4">
                  {viewMode === 'distribution' && group.distribution && (
                    <div className="mb-4">
                      <h4 className="text-xs font-semibold text-text-muted uppercase mb-3">Force Distribution</h4>
                      <div className="grid grid-cols-5 gap-2">
                        {group.distribution.map((bucket) => {
                          const actualPercent = group.totalEmployees > 0
                            ? Math.round((bucket.count / group.totalEmployees) * 100)
                            : 0;
                          return (
                            <div key={bucket.rating} className="bg-background border border-border rounded-lg p-3 text-center">
                              <p className="text-lg font-bold text-text">{bucket.count}</p>
                              <p className="text-xs text-text-muted">Rating {bucket.rating}</p>
                              <div className="mt-2 flex items-center justify-center gap-1">
                                <span className="text-[10px] text-text-muted">Target: {bucket.targetPercent}%</span>
                              </div>
                              <div className="mt-1">
                                <span className={`text-[10px] font-medium ${actualPercent > bucket.targetPercent ? 'text-red-600' : 'text-green-600'}`}>
                                  Actual: {actualPercent}%
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {viewMode === 'table' && (
                    <div className="border border-border rounded-xl overflow-hidden">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-background border-b border-border">
                            <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Employee</th>
                            <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Self Rating</th>
                            <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Manager Rating</th>
                            <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Pre-Calibrated</th>
                            <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Calibrated</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {(group.employees || []).map((emp) => (
                            <tr key={emp.id} className="bg-card hover:bg-background/50 transition-colors">
                              <td className="px-4 py-3">
                                <span className="text-sm text-text font-medium">{emp.employeeName}</span>
                                <p className="text-xs text-text-muted">{emp.designation}</p>
                              </td>
                              <td className="px-4 py-3 text-sm text-text-muted">{emp.selfRating}</td>
                              <td className="px-4 py-3 text-sm text-text-muted">{emp.managerRating}</td>
                              <td className="px-4 py-3 text-sm text-text-muted">{emp.preCalibrated}</td>
                              <td className="px-4 py-3">
                                <select
                                  value={editedRatings[emp.id] ?? emp.calibrated ?? emp.preCalibrated}
                                  onChange={(e) => handleRatingChange(emp.id, parseFloat(e.target.value))}
                                  className={`${selectClassName} !w-20`}
                                >
                                  {[1, 2, 3, 4, 5].map((r) => (
                                    <option key={r} value={r}>{r}</option>
                                  ))}
                                </select>
                              </td>
                            </tr>
                          ))}
                          {(group.employees || []).length === 0 && (
                            <tr>
                              <td colSpan={5} className="px-4 py-6 text-center text-sm text-text-muted">
                                No employees in this group.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className="flex items-center justify-end mt-4">
                    <button
                      type="button"
                      onClick={() => handleSaveCalibration(group.id)}
                      disabled={isSaving}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors"
                    >
                      {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Save Calibration
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Audit Trail Modal */}
      {showAuditTrail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-card border border-border rounded-xl shadow-lg p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text flex items-center gap-2">
                <History className="h-4 w-4" />
                Calibration Audit Trail
              </h3>
              <button type="button" onClick={() => setShowAuditTrail(false)} className="text-text-muted hover:text-text">
                <ChevronUp className="h-4 w-4" />
              </button>
            </div>
            {auditEntries.length === 0 ? (
              <p className="text-sm text-text-muted text-center py-6">No audit entries yet.</p>
            ) : (
              <div className="space-y-3">
                {auditEntries.map((entry) => (
                  <div key={entry.id} className="bg-background rounded-lg px-3 py-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-text font-medium">{entry.employeeName}</span>
                      <span className="text-[10px] text-text-muted">{new Date(entry.changedAt).toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-text-muted mt-0.5">
                      {entry.previousRating} → {entry.newRating} by {entry.changedBy}
                    </p>
                    {entry.reason && <p className="text-xs text-text-muted italic mt-0.5">{entry.reason}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
