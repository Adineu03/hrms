'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  UserMinus,
  Inbox,
  Calendar,
  ShieldCheck,
} from 'lucide-react';

interface DepartingMember {
  id: string;
  employeeName: string;
  department: string;
  designation: string;
  exitType: string;
  lastWorkingDate: string;
  clearanceStatus: string;
  knowledgeTransferStatus: string;
  handoverStatus: string;
  daysRemaining: number;
}

const STATUS_STYLES: Record<string, string> = {
  completed: 'bg-green-100 text-green-700',
  in_progress: 'bg-blue-100 text-blue-700',
  pending: 'bg-yellow-50 text-yellow-700',
  not_started: 'bg-gray-100 text-gray-600',
  overdue: 'bg-red-100 text-red-700',
};

const EXIT_TYPE_STYLES: Record<string, string> = {
  resignation: 'bg-blue-50 text-blue-700',
  termination: 'bg-red-50 text-red-700',
  retirement: 'bg-purple-50 text-purple-700',
  contract_end: 'bg-orange-50 text-orange-700',
};

export default function TeamOffboardingTab() {
  const [members, setMembers] = useState<DepartingMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/onboarding-offboarding/manager/team-offboarding');
      setMembers(Array.isArray(res.data) ? res.data : res.data?.data || []);
    } catch {
      setError('Failed to load team offboarding data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleApproveClearance = async (memberId: string) => {
    setError(null);
    try {
      await api.patch(`/onboarding-offboarding/manager/team-offboarding/${memberId}/approve-clearance`);
      setSuccess('Manager clearance approved.');
      loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to approve clearance.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading team offboarding...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-text flex items-center gap-2">
          <UserMinus className="h-5 w-5" />
          Team Offboarding Progress
        </h2>
        <p className="text-sm text-text-muted">Track exit processes for departing team members.</p>
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

      {members.length === 0 ? (
        <div className="text-center py-12">
          <Inbox className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm text-text-muted">No team members currently in offboarding process.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {members.map((member) => (
            <div key={member.id} className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-text">{member.employeeName}</h3>
                  <p className="text-xs text-text-muted">{member.designation} - {member.department}</p>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${EXIT_TYPE_STYLES[member.exitType] || 'bg-gray-100 text-gray-600'}`}>
                  {member.exitType.replace(/_/g, ' ')}
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs text-text-muted mb-4">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Last day: {member.lastWorkingDate ? new Date(member.lastWorkingDate).toLocaleDateString() : '--'}
                </span>
                <span className={member.daysRemaining <= 3 ? 'text-red-600 font-medium' : ''}>
                  {member.daysRemaining > 0 ? `${member.daysRemaining} days left` : 'Past last day'}
                </span>
              </div>

              {/* Status Sections */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-muted">Clearance</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_STYLES[member.clearanceStatus] || 'bg-gray-100 text-gray-600'}`}>
                    {member.clearanceStatus.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-muted">Knowledge Transfer</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_STYLES[member.knowledgeTransferStatus] || 'bg-gray-100 text-gray-600'}`}>
                    {member.knowledgeTransferStatus.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-muted">Handover</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_STYLES[member.handoverStatus] || 'bg-gray-100 text-gray-600'}`}>
                    {member.handoverStatus.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>

              {member.clearanceStatus !== 'completed' && (
                <button
                  type="button"
                  onClick={() => handleApproveClearance(member.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-white hover:bg-primary-hover transition-colors w-full justify-center"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Approve Manager Clearance
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
