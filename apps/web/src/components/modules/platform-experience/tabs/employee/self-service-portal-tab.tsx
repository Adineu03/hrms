'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  FileText,
  Loader2,
  AlertCircle,
  Inbox,
  Download,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from 'lucide-react';

interface SelfServiceSummary {
  totalRequests: number;
  pending: number;
  approved: number;
  rejected: number;
}

interface ServiceRequest {
  id: string;
  type: string;
  subject: string;
  status: string;
  createdAt: string;
  resolvedAt: string;
}

interface Document {
  id: string;
  name: string;
  type: string;
  uploadedAt: string;
  size: string;
  downloadUrl: string;
}

export default function SelfServicePortalTab() {
  const [summary, setSummary] = useState<SelfServiceSummary | null>(null);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [summaryRes, requestsRes, docsRes] = await Promise.all([
        api.get('/platform-experience/employee/self-service/summary'),
        api.get('/platform-experience/employee/self-service/requests'),
        api.get('/platform-experience/employee/self-service/documents'),
      ]);

      const summaryData = summaryRes.data?.data || summaryRes.data || {};
      const requestsData = Array.isArray(requestsRes.data) ? requestsRes.data : requestsRes.data?.data || [];
      const docsData = Array.isArray(docsRes.data) ? docsRes.data : docsRes.data?.data || [];

      setSummary({
        totalRequests: summaryData.totalRequests || 0,
        pending: summaryData.pending || 0,
        approved: summaryData.approved || 0,
        rejected: summaryData.rejected || 0,
      });
      setRequests(requestsData);
      setDocuments(docsData);
    } catch {
      setError('Failed to load self-service data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700',
      approved: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
      in_progress: 'bg-blue-100 text-blue-700',
      completed: 'bg-green-100 text-green-700',
    };
    return styles[status] || 'bg-gray-100 text-gray-700';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
      case 'completed':
        return <CheckCircle2 className="h-3.5 w-3.5" />;
      case 'rejected':
        return <XCircle className="h-3.5 w-3.5" />;
      case 'pending':
        return <Clock className="h-3.5 w-3.5" />;
      default:
        return <AlertTriangle className="h-3.5 w-3.5" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
      </div>
    );
  }

  if (error && !summary) {
    return (
      <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
        <AlertCircle className="h-4 w-4 shrink-0" />
        {error}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <FileText className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-text">Self-Service Portal</h2>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-background rounded-xl border border-border p-5">
            <p className="text-sm text-text-muted mb-1">Total Requests</p>
            <p className="text-2xl font-bold text-text">{summary.totalRequests}</p>
          </div>
          <div className="bg-background rounded-xl border border-border p-5">
            <div className="flex items-center gap-1 mb-1">
              <Clock className="h-3.5 w-3.5 text-yellow-500" />
              <p className="text-sm text-text-muted">Pending</p>
            </div>
            <p className="text-2xl font-bold text-text">{summary.pending}</p>
          </div>
          <div className="bg-background rounded-xl border border-border p-5">
            <div className="flex items-center gap-1 mb-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
              <p className="text-sm text-text-muted">Approved</p>
            </div>
            <p className="text-2xl font-bold text-text">{summary.approved}</p>
          </div>
          <div className="bg-background rounded-xl border border-border p-5">
            <div className="flex items-center gap-1 mb-1">
              <XCircle className="h-3.5 w-3.5 text-red-500" />
              <p className="text-sm text-text-muted">Rejected</p>
            </div>
            <p className="text-2xl font-bold text-text">{summary.rejected}</p>
          </div>
        </div>
      )}

      {/* Recent Requests */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-text uppercase tracking-wider mb-3">Recent Requests</h3>
        {requests.length === 0 ? (
          <div className="text-center py-12">
            <Inbox className="h-10 w-10 text-text-muted mx-auto mb-3" />
            <p className="text-text-muted text-sm">No service requests found.</p>
          </div>
        ) : (
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-background">
                <tr>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Type</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Subject</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Status</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Created</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Resolved</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {requests.map((r) => (
                  <tr key={r.id} className="hover:bg-background/50">
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 capitalize">
                        {r.type?.replace('_', ' ') || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text font-medium">{r.subject}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(r.status)}`}>
                        {getStatusIcon(r.status)}
                        {r.status?.replace('_', ' ') || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {r.resolvedAt ? new Date(r.resolvedAt).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Documents */}
      <div>
        <h3 className="text-sm font-semibold text-text uppercase tracking-wider mb-3">My Documents</h3>
        {documents.length === 0 ? (
          <div className="text-center py-8">
            <Inbox className="h-8 w-8 text-text-muted mx-auto mb-2" />
            <p className="text-text-muted text-sm">No documents available.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {documents.map((doc) => (
              <div key={doc.id} className="bg-background rounded-xl border border-border p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary shrink-0" />
                    <h4 className="text-sm font-medium text-text truncate">{doc.name}</h4>
                  </div>
                  {doc.downloadUrl && (
                    <a
                      href={doc.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 text-text-muted hover:text-primary transition-colors"
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-text-muted">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 capitalize">
                    {doc.type?.replace('_', ' ') || '—'}
                  </span>
                  {doc.size && <span>{doc.size}</span>}
                  <span>{doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : '—'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
