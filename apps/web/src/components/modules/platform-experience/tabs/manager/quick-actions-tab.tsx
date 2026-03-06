'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Zap,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Inbox,
  Clock,
  ClipboardCheck,
  Calendar,
  FileText,
  Timer,
} from 'lucide-react';

interface QuickAction {
  id: string;
  label: string;
  type: string;
  count: number;
  icon: string;
}

interface RecentItem {
  id: string;
  title: string;
  type: string;
  timestamp: string;
  status: string;
}

interface PendingApproval {
  id: string;
  employeeName: string;
  type: string;
  details: string;
  requestedAt: string;
  status: string;
}

export default function QuickActionsTab() {
  const [actions, setActions] = useState<QuickAction[]>([]);
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [approving, setApproving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [actionsRes, recentRes, pendingRes] = await Promise.all([
        api.get('/platform-experience/manager/quick-actions'),
        api.get('/platform-experience/manager/quick-actions/recent'),
        api.get('/platform-experience/manager/quick-actions/pending-approvals'),
      ]);

      const actionsData = Array.isArray(actionsRes.data) ? actionsRes.data : actionsRes.data?.data || [];
      const recentData = Array.isArray(recentRes.data) ? recentRes.data : recentRes.data?.data || [];
      const pendingData = Array.isArray(pendingRes.data) ? pendingRes.data : pendingRes.data?.data || [];

      setActions(actionsData);
      setRecentItems(recentData);
      setPendingApprovals(pendingData);
    } catch {
      setError('Failed to load quick actions data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleBulkApprove = async () => {
    if (!confirm('Approve all pending items?')) return;
    try {
      setApproving(true);
      setError('');
      const ids = pendingApprovals.map((a) => a.id);
      await api.post('/platform-experience/manager/quick-actions/bulk-approve', { ids });
      setSuccess('All pending items approved successfully.');
      loadData();
    } catch {
      setError('Failed to bulk approve items.');
    } finally {
      setApproving(false);
    }
  };

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(''), 3000);
      return () => clearTimeout(t);
    }
  }, [success]);

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'leave': return Calendar;
      case 'overtime': return Timer;
      case 'document': return FileText;
      case 'approval': return ClipboardCheck;
      default: return Zap;
    }
  };

  const getTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      leave: 'bg-blue-100 text-blue-700',
      overtime: 'bg-purple-100 text-purple-700',
      document: 'bg-yellow-100 text-yellow-700',
      approval: 'bg-green-100 text-green-700',
    };
    return styles[type] || 'bg-gray-100 text-gray-700';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Zap className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-text">Quick Actions</h2>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-3 mb-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {success}
        </div>
      )}

      {/* Quick Action Cards */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-text uppercase tracking-wider mb-3">Action Items</h3>
        {actions.length === 0 ? (
          <div className="text-center py-8">
            <Inbox className="h-8 w-8 text-text-muted mx-auto mb-2" />
            <p className="text-text-muted text-sm">No action items at this time.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {actions.map((action) => {
              const Icon = getActionIcon(action.type);
              return (
                <div key={action.id} className="bg-background rounded-xl border border-border p-5">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-text">{action.label}</p>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getTypeBadge(action.type)} capitalize`}>
                        {action.type}
                      </span>
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-text mt-2">{action.count}</p>
                  <p className="text-xs text-text-muted mt-1">pending items</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Items */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="h-4 w-4 text-text-muted" />
          <h3 className="text-sm font-semibold text-text uppercase tracking-wider">Recent Activity</h3>
        </div>
        {recentItems.length === 0 ? (
          <div className="text-center py-8">
            <Inbox className="h-8 w-8 text-text-muted mx-auto mb-2" />
            <p className="text-text-muted text-sm">No recent activity.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentItems.map((item) => (
              <div key={item.id} className="bg-background rounded-lg border border-border p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getTypeBadge(item.type)} capitalize`}>
                    {item.type}
                  </span>
                  <span className="text-sm text-text">{item.title}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    item.status === 'approved' ? 'bg-green-100 text-green-700' : item.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {item.status}
                  </span>
                  <span className="text-xs text-text-muted">
                    {item.timestamp ? new Date(item.timestamp).toLocaleDateString() : '—'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending Approvals */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-text-muted" />
            <h3 className="text-sm font-semibold text-text uppercase tracking-wider">Pending Approvals</h3>
          </div>
          {pendingApprovals.length > 0 && (
            <button
              onClick={handleBulkApprove}
              disabled={approving}
              className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {approving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              Approve All
            </button>
          )}
        </div>
        {pendingApprovals.length === 0 ? (
          <div className="text-center py-8">
            <Inbox className="h-8 w-8 text-text-muted mx-auto mb-2" />
            <p className="text-text-muted text-sm">No pending approvals.</p>
          </div>
        ) : (
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-background">
                <tr>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Employee</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Type</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Details</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Requested</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pendingApprovals.map((a) => (
                  <tr key={a.id} className="hover:bg-background/50">
                    <td className="px-4 py-3 text-sm text-text font-medium">{a.employeeName}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeBadge(a.type)} capitalize`}>
                        {a.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">{a.details || '—'}</td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {a.requestedAt ? new Date(a.requestedAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                        {a.status || 'pending'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
