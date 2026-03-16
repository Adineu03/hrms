'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Inbox,
  RefreshCw,
} from 'lucide-react';

interface PolicyAcknowledgement {
  id: string;
  employeeName: string;
  employeeId: string;
  policyName: string;
  acknowledgedDate: string | null;
  status: string;
}

interface TrainingCompletion {
  id: string;
  employeeName: string;
  employeeId: string;
  trainingName: string;
  completedDate: string | null;
  score: number | null;
  status: string;
}

const STATUS_STYLES: Record<string, string> = {
  acknowledged: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-50 text-yellow-700',
  overdue: 'bg-red-100 text-red-700',
  completed: 'bg-green-100 text-green-700',
  in_progress: 'bg-blue-100 text-blue-700',
  not_started: 'bg-gray-100 text-gray-600',
};

type ViewMode = 'policies' | 'training';

export default function CompliancePolicyTab() {
  const [viewMode, setViewMode] = useState<ViewMode>('policies');
  const [policyAcks, setPolicyAcks] = useState<PolicyAcknowledgement[]>([]);
  const [trainingCompletions, setTrainingCompletions] = useState<TrainingCompletion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [policyRes, trainingRes] = await Promise.all([
        api.get('/onboarding-offboarding/admin/compliance/acknowledgements').catch(() => ({ data: [] })),
        api.get('/onboarding-offboarding/admin/compliance/training-completion').catch(() => ({ data: [] })),
      ]);
      setPolicyAcks(Array.isArray(policyRes.data) ? policyRes.data : policyRes.data?.data || []);
      setTrainingCompletions(Array.isArray(trainingRes.data) ? trainingRes.data : trainingRes.data?.data || []);
    } catch {
      setError('Failed to load compliance data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSendReminder = async (employeeId: string, type: string) => {
    setError(null);
    try {
      await api.post('/onboarding-offboarding/admin/compliance/send-reminder', { employeeId, type });
      setSuccess('Reminder sent successfully.');
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to send reminder.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading compliance data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-text flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          Compliance & Policy Tracking
        </h2>
        <p className="text-sm text-text-muted">Track policy acknowledgements and mandatory training completion.</p>
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

      {/* View Toggle */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setViewMode('policies')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            viewMode === 'policies'
              ? 'bg-primary text-white'
              : 'border border-border text-text hover:bg-background'
          }`}
        >
          Policy Acknowledgements
        </button>
        <button
          type="button"
          onClick={() => setViewMode('training')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            viewMode === 'training'
              ? 'bg-primary text-white'
              : 'border border-border text-text hover:bg-background'
          }`}
        >
          Training Completion
        </button>
      </div>

      {/* Policy Acknowledgements Table */}
      {viewMode === 'policies' && (
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-background border-b border-border">
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Employee</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Policy</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Acknowledged Date</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Status</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {policyAcks.map((ack) => (
                <tr key={ack.id} className="bg-card hover:bg-background/50 transition-colors">
                  <td className="px-4 py-3 text-sm text-text font-medium">{ack.employeeName}</td>
                  <td className="px-4 py-3 text-sm text-text-muted">{ack.policyName}</td>
                  <td className="px-4 py-3 text-sm text-text-muted">
                    {ack.acknowledgedDate ? new Date(ack.acknowledgedDate).toLocaleDateString() : '--'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[ack.status] || 'bg-gray-100 text-gray-600'}`}>
                      {ack.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {ack.status !== 'acknowledged' && (
                      <button
                        type="button"
                        onClick={() => handleSendReminder(ack.employeeId, 'policy')}
                        className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary-hover transition-colors"
                      >
                        <RefreshCw className="h-3 w-3" />
                        Send Reminder
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {policyAcks.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center">
                    <Inbox className="h-10 w-10 mx-auto mb-3 opacity-40" />
                    <p className="text-sm text-text-muted">No policy acknowledgement records.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Training Completion Table */}
      {viewMode === 'training' && (
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-background border-b border-border">
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Employee</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Training</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Completed Date</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Score</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Status</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {trainingCompletions.map((tc) => (
                <tr key={tc.id} className="bg-card hover:bg-background/50 transition-colors">
                  <td className="px-4 py-3 text-sm text-text font-medium">{tc.employeeName}</td>
                  <td className="px-4 py-3 text-sm text-text-muted">{tc.trainingName}</td>
                  <td className="px-4 py-3 text-sm text-text-muted">
                    {tc.completedDate ? new Date(tc.completedDate).toLocaleDateString() : '--'}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-muted">{tc.score != null ? `${tc.score}%` : '--'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[tc.status] || 'bg-gray-100 text-gray-600'}`}>
                      {tc.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {tc.status !== 'completed' && (
                      <button
                        type="button"
                        onClick={() => handleSendReminder(tc.employeeId, 'training')}
                        className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary-hover transition-colors"
                      >
                        <RefreshCw className="h-3 w-3" />
                        Send Reminder
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {trainingCompletions.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center">
                    <Inbox className="h-10 w-10 mx-auto mb-3 opacity-40" />
                    <p className="text-sm text-text-muted">No training completion records.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
