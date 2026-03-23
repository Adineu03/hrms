'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  Plus,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle2,
  XCircle,
  Zap,
} from 'lucide-react';

interface ChangeRequest {
  id: string;
  type: string;
  employeeName: string;
  employeeId: string;
  status: 'pending' | 'approved' | 'rejected' | 'implemented';
  proposedData: Record<string, unknown>;
  justification?: string;
  budgetImpact?: string;
  createdAt: string;
}

interface TeamEmployee {
  id: string;
  firstName: string;
  lastName?: string;
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700',
  approved: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-700',
  implemented: 'bg-blue-50 text-blue-700',
};

const STATUS_ICONS: Record<string, typeof Clock> = {
  pending: Clock,
  approved: CheckCircle2,
  rejected: XCircle,
  implemented: Zap,
};

const REQUEST_TYPES = [
  { value: 'promotion', label: 'Promotion' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'salary_revision', label: 'Salary Revision' },
  { value: 'role_change', label: 'Role Change' },
  { value: 'department_change', label: 'Department Change' },
  { value: 'designation_change', label: 'Designation Change' },
  { value: 'other', label: 'Other' },
];

const inputClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary text-sm';
const selectClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary appearance-none text-sm';

export default function ChangeRequestsTab() {
  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  const [employees, setEmployees] = useState<TeamEmployee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New request form
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState('promotion');
  const [formEmployeeId, setFormEmployeeId] = useState('');
  const [formProposedData, setFormProposedData] = useState('{}');
  const [formJustification, setFormJustification] = useState('');
  const [formBudgetImpact, setFormBudgetImpact] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Expandable rows
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [requestsRes, teamRes] = await Promise.all([
          api.get('/core-hr/manager/change-requests').catch(() => ({ data: [] })),
          api.get('/core-hr/manager/team').catch(() => ({ data: [] })),
        ]);
        const requestsRaw = requestsRes.data?.requests || requestsRes.data?.data || requestsRes.data;
        setRequests(Array.isArray(requestsRaw) ? requestsRaw : []);
        const teamRaw = teamRes.data?.members || teamRes.data?.data || teamRes.data;
        const teamData = Array.isArray(teamRaw) ? teamRaw : [];
        setEmployees(
          teamData.map((e: Record<string, unknown>) => ({
            id: e.id as string,
            firstName: e.firstName as string,
            lastName: (e.lastName as string) || '',
          })),
        );
      } catch {
        setError('Failed to load change requests.');
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formEmployeeId) {
      setError('Please select an employee.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      let parsedData: Record<string, unknown> = {};
      try {
        parsedData = JSON.parse(formProposedData);
      } catch {
        setError('Proposed data must be valid JSON.');
        setIsSubmitting(false);
        return;
      }
      const res = await api.post('/core-hr/manager/change-requests', {
        type: formType,
        employeeId: formEmployeeId,
        proposedData: parsedData,
        justification: formJustification.trim() || undefined,
        budgetImpact: formBudgetImpact.trim() || undefined,
      });
      const newRequest = res.data;
      if (newRequest?.id) {
        setRequests((prev) => [newRequest, ...prev]);
      } else {
        // Reload
        const reloadRes = await api.get('/core-hr/manager/change-requests');
        const reloadRaw = reloadRes.data?.requests || reloadRes.data?.data || reloadRes.data;
        setRequests(Array.isArray(reloadRaw) ? reloadRaw : []);
      }
      setSuccessMessage('Change request created successfully.');
      setShowForm(false);
      setFormType('promotion');
      setFormEmployeeId('');
      setFormProposedData('{}');
      setFormJustification('');
      setFormBudgetImpact('');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch {
      setError('Failed to create change request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading change requests...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text">Change Requests</h2>
          <p className="text-sm text-text-muted">
            Submit and track employee change requests for HR approval.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          New Request
        </button>
      </div>

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

      {/* New Request Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-background border border-border rounded-xl p-5 space-y-4"
        >
          <h3 className="text-sm font-semibold text-text">New Change Request</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">
                Request Type
              </label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value)}
                className={selectClassName}
              >
                {REQUEST_TYPES.map((rt) => (
                  <option key={rt.value} value={rt.value}>
                    {rt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">
                Employee
              </label>
              <select
                value={formEmployeeId}
                onChange={(e) => setFormEmployeeId(e.target.value)}
                className={selectClassName}
              >
                <option value="">Select employee...</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName || ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">
              Proposed Data (JSON)
            </label>
            <textarea
              value={formProposedData}
              onChange={(e) => setFormProposedData(e.target.value)}
              rows={3}
              className={inputClassName}
              placeholder='{"newDesignation": "Lead Engineer", "effectiveDate": "2026-04-01"}'
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">
                Justification
              </label>
              <textarea
                value={formJustification}
                onChange={(e) => setFormJustification(e.target.value)}
                rows={2}
                className={inputClassName}
                placeholder="Reason for the change request..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">
                Budget Impact
              </label>
              <textarea
                value={formBudgetImpact}
                onChange={(e) => setFormBudgetImpact(e.target.value)}
                rows={2}
                className={inputClassName}
                placeholder="Expected budget impact, if any..."
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Submit Request
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Requests Table */}
      <div className="border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-background border-b border-border">
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3 w-8" />
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                Type
              </th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                Employee
              </th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                Status
              </th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                Submitted
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {requests.map((req) => {
              const StatusIcon = STATUS_ICONS[req.status] || Clock;
              const isExpanded = expandedId === req.id;
              return (
                <>
                  <tr
                    key={req.id}
                    className="bg-card hover:bg-background/50 transition-colors cursor-pointer"
                    onClick={() =>
                      setExpandedId(isExpanded ? null : req.id)
                    }
                  >
                    <td className="px-4 py-3">
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-text-muted" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-text-muted" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-text font-medium capitalize">
                      {(req.type || '').replace(/_/g, ' ')}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {req.employeeName}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          STATUS_STYLES[req.status] || STATUS_STYLES.pending
                        }`}
                      >
                        <StatusIcon className="h-3 w-3" />
                        {req.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {new Date(req.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr key={`${req.id}-detail`} className="bg-background/30">
                      <td colSpan={5} className="px-8 py-4">
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="font-medium text-text">Proposed Data: </span>
                            <code className="text-xs bg-background px-2 py-1 rounded border border-border text-text-muted">
                              {JSON.stringify(req.proposedData)}
                            </code>
                          </div>
                          {req.justification && (
                            <div>
                              <span className="font-medium text-text">Justification: </span>
                              <span className="text-text-muted">{req.justification}</span>
                            </div>
                          )}
                          {req.budgetImpact && (
                            <div>
                              <span className="font-medium text-text">Budget Impact: </span>
                              <span className="text-text-muted">{req.budgetImpact}</span>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
            {requests.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-sm text-text-muted"
                >
                  No change requests yet. Click &quot;New Request&quot; to submit one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
