'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useColdStartFeatureStore } from '@/lib/cold-start-feature-store';
import {
  Loader2,
  Mail,
  Send,
  UserPlus,
  XCircle,
  Users,
  AlertCircle,
  CheckCircle2,
  Clock,
} from 'lucide-react';

const inputClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary';
const selectClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary appearance-none';

const ROLE_OPTIONS = [
  { value: 'employee', label: 'Employee' },
  { value: 'manager', label: 'Manager' },
  { value: 'admin', label: 'Admin' },
];

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700',
  accepted: 'bg-green-50 text-green-700',
  expired: 'bg-red-50 text-red-700',
  revoked: 'bg-gray-100 text-gray-600',
};

const ROLE_STYLES: Record<string, string> = {
  super_admin: 'bg-purple-50 text-purple-700',
  admin: 'bg-blue-50 text-blue-700',
  manager: 'bg-indigo-50 text-indigo-700',
  employee: 'bg-background text-text-muted',
};

export default function UsersTab() {
  const {
    invitations,
    isInvitationsLoading,
    fetchInvitations,
    sendInvitation,
    revokeInvitation,
    employees,
    isEmployeesLoading,
    fetchEmployees,
    error,
  } = useColdStartFeatureStore();

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteFirstName, setInviteFirstName] = useState('');
  const [inviteLastName, setInviteLastName] = useState('');
  const [inviteRole, setInviteRole] = useState('employee');
  const [isSending, setIsSending] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  useEffect(() => {
    fetchInvitations();
    fetchEmployees();
  }, [fetchInvitations, fetchEmployees]);

  const handleSendInvite = async (e: FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) {
      setLocalError('Email is required.');
      return;
    }
    setLocalError(null);
    setSuccessMessage(null);
    setIsSending(true);
    try {
      await sendInvitation({
        email: inviteEmail.trim(),
        firstName: inviteFirstName.trim() || undefined,
        lastName: inviteLastName.trim() || undefined,
        role: inviteRole,
      });
      setSuccessMessage(`Invitation sent to ${inviteEmail}.`);
      setInviteEmail('');
      setInviteFirstName('');
      setInviteLastName('');
      setInviteRole('employee');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch {
      setLocalError('Failed to send invitation.');
    } finally {
      setIsSending(false);
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      await revokeInvitation(id);
      setRevokingId(null);
    } catch {
      setLocalError('Failed to revoke invitation.');
    }
  };

  const isDataLoading =
    (isInvitationsLoading && invitations.length === 0) ||
    (isEmployeesLoading && employees.length === 0);

  if (isDataLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">
          Loading users...
        </span>
      </div>
    );
  }

  const displayError = localError || error;

  return (
    <div className="space-y-8">
      {/* Invite Section */}
      <div>
        <h2 className="text-lg font-semibold text-text mb-1">
          Invite Users
        </h2>
        <p className="text-sm text-text-muted mb-4">
          Send email invitations to add new users to your organization.
        </p>

        {displayError && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {displayError}
          </div>
        )}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 mb-4 text-sm flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
            {successMessage}
          </div>
        )}

        <form
          onSubmit={handleSendInvite}
          className="flex flex-wrap items-end gap-3"
        >
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-text-muted mb-1">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
              <input
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="user@company.com"
                className={`${inputClassName} pl-10 text-sm`}
              />
            </div>
          </div>
          <div className="w-32">
            <label className="block text-xs font-medium text-text-muted mb-1">
              First Name
            </label>
            <input
              type="text"
              value={inviteFirstName}
              onChange={(e) => setInviteFirstName(e.target.value)}
              placeholder="First"
              className={`${inputClassName} text-sm`}
            />
          </div>
          <div className="w-32">
            <label className="block text-xs font-medium text-text-muted mb-1">
              Last Name
            </label>
            <input
              type="text"
              value={inviteLastName}
              onChange={(e) => setInviteLastName(e.target.value)}
              placeholder="Last"
              className={`${inputClassName} text-sm`}
            />
          </div>
          <div className="w-32">
            <label className="block text-xs font-medium text-text-muted mb-1">
              Role
            </label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className={`${selectClassName} text-sm`}
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={isSending}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Send Invite
          </button>
        </form>
      </div>

      <hr className="border-border" />

      {/* Existing Employees */}
      <div>
        <h2 className="text-lg font-semibold text-text mb-1 flex items-center gap-2">
          <Users className="h-5 w-5" />
          Employees ({employees.length})
        </h2>
        <p className="text-sm text-text-muted mb-4">
          Active users in your organization.
        </p>

        {employees.length === 0 ? (
          <div className="text-center py-8 text-sm text-text-muted">
            No employees added yet. Send invitations above to add users.
          </div>
        ) : (
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-background border-b border-border">
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                    Name
                  </th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                    Email
                  </th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                    Role
                  </th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {employees.map((emp) => (
                  <tr
                    key={emp.id}
                    className="bg-card hover:bg-background/50 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-text font-medium">
                      {emp.firstName} {emp.lastName || ''}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {emp.email}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          ROLE_STYLES[emp.role] || ROLE_STYLES.employee
                        }`}
                      >
                        {emp.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          emp.isActive
                            ? 'bg-green-50 text-green-700'
                            : 'bg-red-50 text-red-700'
                        }`}
                      >
                        {emp.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-text mb-1 flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invitations ({invitations.length})
          </h2>
          <p className="text-sm text-text-muted mb-4">
            Pending and past invitations.
          </p>

          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-background border-b border-border">
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                    Email
                  </th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                    Name
                  </th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                    Role
                  </th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                    Status
                  </th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                    Sent
                  </th>
                  <th className="text-right text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3 w-24">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invitations.map((inv) => (
                  <tr
                    key={inv.id}
                    className="bg-card hover:bg-background/50 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-text">
                      {inv.email}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {inv.firstName || ''} {inv.lastName || ''}
                      {!inv.firstName && !inv.lastName && '--'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          ROLE_STYLES[inv.role] || ROLE_STYLES.employee
                        }`}
                      >
                        {inv.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          STATUS_STYLES[inv.status] ||
                          STATUS_STYLES.pending
                        }`}
                      >
                        {inv.status === 'pending' && (
                          <Clock className="h-3 w-3" />
                        )}
                        {inv.status === 'accepted' && (
                          <CheckCircle2 className="h-3 w-3" />
                        )}
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {new Date(inv.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {inv.status === 'pending' && (
                        <>
                          {revokingId === inv.id ? (
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => handleRevoke(inv.id)}
                                className="px-2 py-1 text-xs rounded bg-red-500 text-white hover:bg-red-600 transition-colors"
                              >
                                Revoke
                              </button>
                              <button
                                type="button"
                                onClick={() => setRevokingId(null)}
                                className="px-2 py-1 text-xs rounded border border-border text-text hover:bg-background transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setRevokingId(inv.id)}
                              className="p-1.5 rounded-lg text-text-muted hover:text-red-500 hover:bg-red-50 transition-colors"
                              title="Revoke invitation"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
