'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  Plus,
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronDown,
  ChevronRight,
  Eye,
  Send,
  XCircle,
} from 'lucide-react';

const inputClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary';
const selectClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary appearance-none';

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  pending: { bg: 'bg-yellow-50', text: 'text-yellow-700' },
  in_review: { bg: 'bg-blue-50', text: 'text-blue-700' },
  approved: { bg: 'bg-green-50', text: 'text-green-700' },
  rejected: { bg: 'bg-red-50', text: 'text-red-700' },
  completed: { bg: 'bg-green-50', text: 'text-green-700' },
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending: <Clock className="h-3 w-3" />,
  in_review: <Eye className="h-3 w-3" />,
  approved: <CheckCircle2 className="h-3 w-3" />,
  rejected: <XCircle className="h-3 w-3" />,
  completed: <CheckCircle2 className="h-3 w-3" />,
};

interface RequestType {
  id: string;
  name: string;
  description: string;
}

interface ServiceRequest {
  id: string;
  type: string;
  subject: string;
  description: string;
  status: string;
  data?: Record<string, unknown>;
  createdAt: string;
  sla?: string;
  resolvedAt?: string;
}

export default function SelfServiceTab() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [requestTypes, setRequestTypes] = useState<RequestType[]>([]);
  const [showNewForm, setShowNewForm] = useState(false);
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);

  // New request form
  const [newRequest, setNewRequest] = useState({
    type: '',
    subject: '',
    description: '',
    data: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [requestsRes, typesRes] = await Promise.all([
        api.get('/core-hr/employee/requests'),
        api.get('/core-hr/employee/requests/types'),
      ]);
      const rawReqs = requestsRes.data;
      setRequests(Array.isArray(rawReqs) ? rawReqs : Array.isArray(rawReqs?.data) ? rawReqs.data : []);
      const rawTypes = typesRes.data;
      setRequestTypes(Array.isArray(rawTypes) ? rawTypes : Array.isArray(rawTypes?.data) ? rawTypes.data : []);
    } catch {
      setError('Failed to load requests.');
      setRequests([]);
      setRequestTypes([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitRequest = async (e: FormEvent) => {
    e.preventDefault();
    if (!newRequest.type || !newRequest.subject.trim()) {
      setError('Request type and subject are required.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      let parsedData: Record<string, unknown> | undefined;
      if (newRequest.data.trim()) {
        try {
          parsedData = JSON.parse(newRequest.data);
        } catch {
          setError('Additional data must be valid JSON.');
          setIsSubmitting(false);
          return;
        }
      }

      await api.post('/core-hr/employee/requests', {
        type: newRequest.type,
        subject: newRequest.subject.trim(),
        description: newRequest.description.trim(),
        data: parsedData,
      });

      setSuccessMessage('Request submitted successfully.');
      setNewRequest({ type: '', subject: '', description: '', data: '' });
      setShowNewForm(false);
      fetchData();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch {
      setError('Failed to submit request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleRequestExpand = (id: string) => {
    setExpandedRequestId(expandedRequestId === id ? null : id);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-text-muted" />
        <span className="ml-2 text-text-muted">Loading requests...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Messages */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          {successMessage}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Request Type Cards */}
      {requestTypes.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-text mb-3">Available Request Types</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {requestTypes.map((rt) => (
              <div
                key={rt.id}
                onClick={() => {
                  setNewRequest({ ...newRequest, type: rt.id });
                  setShowNewForm(true);
                }}
                className="border border-border rounded-lg p-3 bg-card hover:shadow-sm hover:border-primary/50 cursor-pointer transition-all"
              >
                <h4 className="text-sm font-medium text-text">{rt.name}</h4>
                {rt.description && (
                  <p className="text-xs text-text-muted mt-1 line-clamp-2">{rt.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Header with New Request Button */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-text">My Requests</h3>
        <button
          type="button"
          onClick={() => setShowNewForm(!showNewForm)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          New Request
        </button>
      </div>

      {/* New Request Form */}
      {showNewForm && (
        <form
          onSubmit={handleSubmitRequest}
          className="border border-border rounded-lg p-4 space-y-4 bg-background"
        >
          <h4 className="text-sm font-semibold text-text">Submit New Request</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">
                Request Type *
              </label>
              <select
                required
                value={newRequest.type}
                onChange={(e) => setNewRequest({ ...newRequest, type: e.target.value })}
                className={`${selectClassName} text-sm`}
              >
                <option value="">Select type</option>
                {requestTypes.map((rt) => (
                  <option key={rt.id} value={rt.id}>
                    {rt.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Subject *</label>
              <input
                type="text"
                required
                value={newRequest.subject}
                onChange={(e) => setNewRequest({ ...newRequest, subject: e.target.value })}
                placeholder="Brief subject of your request"
                className={`${inputClassName} text-sm`}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Description</label>
            <textarea
              rows={3}
              value={newRequest.description}
              onChange={(e) => setNewRequest({ ...newRequest, description: e.target.value })}
              placeholder="Describe your request in detail..."
              className={`${inputClassName} text-sm resize-none`}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">
              Additional Data <span className="font-normal">(optional, JSON format)</span>
            </label>
            <textarea
              rows={2}
              value={newRequest.data}
              onChange={(e) => setNewRequest({ ...newRequest, data: e.target.value })}
              placeholder='{"key": "value"}'
              className={`${inputClassName} text-sm resize-none font-mono`}
            />
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Submit Request
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => setShowNewForm(false)}
              className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Existing Requests Table */}
      {requests.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="h-10 w-10 text-text-muted mx-auto mb-3" />
          <p className="text-sm text-text-muted">No requests submitted yet.</p>
          <p className="text-xs text-text-muted mt-1">
            Use the &quot;New Request&quot; button to submit a self-service request.
          </p>
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-background border-b border-border">
                <th className="w-8 px-2 py-3" />
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                  Subject
                </th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                  Type
                </th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                  Status
                </th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                  Submitted
                </th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                  SLA
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {requests.map((req) => {
                const isExpanded = expandedRequestId === req.id;
                const statusStyle = STATUS_STYLES[req.status] || STATUS_STYLES.pending;
                const statusIcon = STATUS_ICONS[req.status] || STATUS_ICONS.pending;

                return (
                  <>
                    <tr
                      key={req.id}
                      onClick={() => toggleRequestExpand(req.id)}
                      className="bg-card hover:bg-background/50 cursor-pointer transition-colors"
                    >
                      <td className="px-2 py-3 text-center">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-text-muted mx-auto" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-text-muted mx-auto" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-text font-medium">{req.subject}</td>
                      <td className="px-4 py-3 text-sm text-text-muted">{req.type}</td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}
                        >
                          {statusIcon}
                          {req.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-text-muted">
                        {new Date(req.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-muted">{req.sla || '--'}</td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${req.id}-detail`} className="bg-background/50">
                        <td colSpan={6} className="px-6 py-4">
                          <div className="space-y-3 max-w-2xl">
                            <div>
                              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">
                                Description
                              </p>
                              <p className="text-sm text-text">
                                {req.description || 'No description provided.'}
                              </p>
                            </div>
                            {req.data && Object.keys(req.data).length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">
                                  Additional Data
                                </p>
                                <pre className="text-xs text-text bg-card border border-border rounded-lg p-3 overflow-auto font-mono">
                                  {JSON.stringify(req.data, null, 2)}
                                </pre>
                              </div>
                            )}
                            {req.resolvedAt && (
                              <div>
                                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">
                                  Resolved On
                                </p>
                                <p className="text-sm text-text">
                                  {new Date(req.resolvedAt).toLocaleString()}
                                </p>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
