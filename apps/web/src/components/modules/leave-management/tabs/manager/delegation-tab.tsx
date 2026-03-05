'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  Plus,
  Trash2,
  UserCog,
  Edit2,
  X,
  Clock,
  Inbox,
} from 'lucide-react';

interface Delegation {
  id: string;
  delegateId: string;
  delegateName: string;
  startDate: string;
  endDate: string;
  type: 'full' | 'partial';
  status: 'active' | 'expired' | 'revoked';
  createdAt: string;
}

interface DelegatedApproval {
  id: string;
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  status: 'pending' | 'approved' | 'rejected';
  delegatedFrom: string;
}

interface TeamMember {
  id: string;
  name: string;
}

const inputClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary text-sm';
const selectClassName = inputClassName + ' appearance-none';

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-50 text-green-700',
  expired: 'bg-gray-100 text-gray-600',
  revoked: 'bg-red-50 text-red-700',
  pending: 'bg-yellow-50 text-yellow-700',
  approved: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-700',
};

export default function DelegationTab() {
  const [delegations, setDelegations] = useState<Delegation[]>([]);
  const [delegatedApprovals, setDelegatedApprovals] = useState<DelegatedApproval[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Create/edit form
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formDelegateId, setFormDelegateId] = useState('');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formType, setFormType] = useState<'full' | 'partial'>('full');
  const [isSaving, setIsSaving] = useState(false);

  // Delete/revoke
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Delegated approval action
  const [actionModal, setActionModal] = useState<{
    approvalId: string;
    action: 'approve' | 'reject';
    employeeName: string;
  } | null>(null);
  const [actionComment, setActionComment] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [delegationsRes, approvalsRes, teamRes] = await Promise.all([
        api.get('/leave-management/manager/delegations'),
        api.get('/leave-management/manager/delegations/pending-approvals'),
        api.get('/leave-management/manager/delegations/team-members'),
      ]);
      setDelegations(
        Array.isArray(delegationsRes.data)
          ? delegationsRes.data
          : delegationsRes.data?.data || []
      );
      setDelegatedApprovals(
        Array.isArray(approvalsRes.data)
          ? approvalsRes.data
          : approvalsRes.data?.data || []
      );
      setTeamMembers(
        Array.isArray(teamRes.data) ? teamRes.data : teamRes.data?.data || []
      );
    } catch {
      setError('Failed to load delegation data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const activeDelegation = delegations.find((d) => d.status === 'active');
  const historyDelegations = delegations.filter((d) => d.status !== 'active');

  const resetForm = () => {
    setFormDelegateId('');
    setFormStartDate('');
    setFormEndDate('');
    setFormType('full');
    setEditingId(null);
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!formDelegateId || !formStartDate || !formEndDate) {
      setError('Please fill in all delegation fields.');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      if (editingId) {
        const res = await api.patch(`/leave-management/manager/delegations/${editingId}`, {
          delegateId: formDelegateId,
          startDate: formStartDate,
          endDate: formEndDate,
          type: formType,
        });
        const updated = res.data?.data || res.data;
        setDelegations((prev) =>
          prev.map((d) => (d.id === editingId ? { ...d, ...updated } : d))
        );
        setSuccessMessage('Delegation updated successfully.');
      } else {
        const res = await api.post('/leave-management/manager/delegations', {
          delegateId: formDelegateId,
          startDate: formStartDate,
          endDate: formEndDate,
          type: formType,
        });
        const newDelegation = res.data?.data || res.data;
        if (newDelegation?.id) {
          setDelegations((prev) => [newDelegation, ...prev]);
        }
        setSuccessMessage('Delegation created successfully.');
      }
      resetForm();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch {
      setError(`Failed to ${editingId ? 'update' : 'create'} delegation.`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRevoke = async (id: string) => {
    setIsDeleting(id);
    setError(null);
    try {
      await api.delete(`/leave-management/manager/delegations/${id}`);
      setDelegations((prev) =>
        prev.map((d) => (d.id === id ? { ...d, status: 'revoked' as const } : d))
      );
      setSuccessMessage('Delegation revoked successfully.');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch {
      setError('Failed to revoke delegation.');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleEdit = (delegation: Delegation) => {
    setEditingId(delegation.id);
    setFormDelegateId(delegation.delegateId);
    setFormStartDate(delegation.startDate.split('T')[0]);
    setFormEndDate(delegation.endDate.split('T')[0]);
    setFormType(delegation.type);
    setShowForm(true);
  };

  const handleDelegatedAction = async () => {
    if (!actionModal) return;
    setIsProcessing(true);
    setError(null);
    try {
      await api.patch(
        `/leave-management/manager/delegations/approvals/${actionModal.approvalId}/${actionModal.action}`,
        { comment: actionComment.trim() || undefined }
      );
      setDelegatedApprovals((prev) =>
        prev.map((a) =>
          a.id === actionModal.approvalId
            ? {
                ...a,
                status: actionModal.action === 'approve' ? ('approved' as const) : ('rejected' as const),
              }
            : a
        )
      );
      setSuccessMessage(
        `Delegated request ${actionModal.action === 'approve' ? 'approved' : 'rejected'} successfully.`
      );
      setActionModal(null);
      setActionComment('');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch {
      setError(`Failed to ${actionModal.action} delegated request.`);
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading delegation data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          {successMessage}
        </div>
      )}

      {/* Active Delegation Card */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-text flex items-center gap-2">
            <UserCog className="h-4 w-4 text-primary" />
            Current Delegation
          </h3>
          {!activeDelegation && (
            <button
              type="button"
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-white hover:bg-primary-hover transition-colors"
            >
              <Plus className="h-3 w-3" />
              Create Delegation
            </button>
          )}
        </div>

        {activeDelegation ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-green-800">
                  Delegated to: {activeDelegation.delegateName}
                </p>
                <p className="text-xs text-green-700">
                  {new Date(activeDelegation.startDate).toLocaleDateString()} -{' '}
                  {new Date(activeDelegation.endDate).toLocaleDateString()}
                </p>
                <p className="text-xs text-green-700">
                  Type: {activeDelegation.type === 'full' ? 'Full Delegation' : 'Partial Delegation'}
                </p>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES.active}`}
                >
                  Active
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleEdit(activeDelegation)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors"
                >
                  <Edit2 className="h-3 w-3" />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleRevoke(activeDelegation.id)}
                  disabled={isDeleting === activeDelegation.id}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  {isDeleting === activeDelegation.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Trash2 className="h-3 w-3" />
                  )}
                  Revoke
                </button>
              </div>
            </div>
          </div>
        ) : !showForm ? (
          <div className="text-center py-6 bg-background rounded-lg border border-border">
            <UserCog className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm text-text-muted">No active delegation.</p>
            <p className="text-xs text-text-muted mt-1">
              Create a delegation to assign your approval authority while you are away.
            </p>
          </div>
        ) : null}
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <div className="bg-background border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-text">
              {editingId ? 'Edit Delegation' : 'Create Delegation'}
            </h3>
            <button
              type="button"
              onClick={resetForm}
              className="text-text-muted hover:text-text"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">
                Delegate To
              </label>
              <select
                value={formDelegateId}
                onChange={(e) => setFormDelegateId(e.target.value)}
                className={selectClassName}
              >
                <option value="">Select team member...</option>
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">
                Delegation Type
              </label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value as 'full' | 'partial')}
                className={selectClassName}
              >
                <option value="full">Full (all approvals)</option>
                <option value="partial">Partial (specific types)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={formStartDate}
                onChange={(e) => setFormStartDate(e.target.value)}
                className={inputClassName}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">
                End Date
              </label>
              <input
                type="date"
                value={formEndDate}
                onChange={(e) => setFormEndDate(e.target.value)}
                className={inputClassName}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors"
            >
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingId ? 'Update Delegation' : 'Create Delegation'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Pending Delegated Approvals */}
      <div>
        <h3 className="text-sm font-semibold text-text mb-3 flex items-center gap-2">
          <Clock className="h-4 w-4 text-yellow-600" />
          Pending Delegated Approvals
        </h3>

        {delegatedApprovals.filter((a) => a.status === 'pending').length > 0 ? (
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-background border-b border-border">
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                    Employee
                  </th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                    Leave Type
                  </th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                    Dates
                  </th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                    Days
                  </th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                    Delegated From
                  </th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {delegatedApprovals
                  .filter((a) => a.status === 'pending')
                  .map((approval) => (
                    <tr
                      key={approval.id}
                      className="bg-card hover:bg-background/50 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm text-text font-medium">
                        {approval.employeeName}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-muted">{approval.leaveType}</td>
                      <td className="px-4 py-3 text-sm text-text-muted">
                        {new Date(approval.startDate).toLocaleDateString()} -{' '}
                        {new Date(approval.endDate).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-muted font-medium">
                        {approval.days}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-muted">
                        {approval.delegatedFrom}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              setActionModal({
                                approvalId: approval.id,
                                action: 'approve',
                                employeeName: approval.employeeName,
                              })
                            }
                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-green-600 text-white hover:bg-green-700"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setActionModal({
                                approvalId: approval.id,
                                action: 'reject',
                                employeeName: approval.employeeName,
                              })
                            }
                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-red-600 text-white hover:bg-red-700"
                          >
                            <X className="h-3 w-3" />
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-6 bg-background rounded-lg border border-border">
            <Inbox className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm text-text-muted">No pending delegated approvals.</p>
          </div>
        )}
      </div>

      {/* Delegation History */}
      <div>
        <h3 className="text-sm font-semibold text-text mb-3">Delegation History</h3>

        {historyDelegations.length > 0 ? (
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-background border-b border-border">
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                    Delegate
                  </th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                    Period
                  </th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                    Type
                  </th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                    Status
                  </th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {historyDelegations.map((d) => (
                  <tr key={d.id} className="bg-card hover:bg-background/50 transition-colors">
                    <td className="px-4 py-3 text-sm text-text font-medium">{d.delegateName}</td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {new Date(d.startDate).toLocaleDateString()} -{' '}
                      {new Date(d.endDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {d.type === 'full' ? 'Full' : 'Partial'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          STATUS_STYLES[d.status]
                        }`}
                      >
                        {d.status.charAt(0).toUpperCase() + d.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {new Date(d.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-6 bg-background rounded-lg border border-border">
            <UserCog className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm text-text-muted">No delegation history.</p>
          </div>
        )}
      </div>

      {/* Delegated Action Modal */}
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-card border border-border rounded-xl shadow-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text">
                {actionModal.action === 'approve' ? 'Approve' : 'Reject'} Delegated Request
              </h3>
              <button
                type="button"
                onClick={() => {
                  setActionModal(null);
                  setActionComment('');
                }}
                className="text-text-muted hover:text-text"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-sm text-text-muted mb-4">
              {actionModal.action === 'approve'
                ? `Approve delegated leave request from ${actionModal.employeeName}?`
                : `Reject delegated leave request from ${actionModal.employeeName}?`}
            </p>

            <div className="mb-4">
              <label className="block text-xs font-medium text-text-muted mb-1">
                Comment (optional)
              </label>
              <textarea
                value={actionComment}
                onChange={(e) => setActionComment(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                placeholder="Add a comment..."
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleDelegatedAction}
                disabled={isProcessing}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50 transition-colors ${
                  actionModal.action === 'approve'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
                {actionModal.action === 'approve' ? 'Approve' : 'Reject'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setActionModal(null);
                  setActionComment('');
                }}
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
