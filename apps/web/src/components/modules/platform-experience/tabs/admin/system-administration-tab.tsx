'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Shield,
  Loader2,
  AlertCircle,
  Inbox,
  Activity,
  Users,
  Database,
  Clock,
} from 'lucide-react';

interface SystemHealth {
  uptime: string;
  activeSessions: number;
  cacheHitRate: number;
  queueSize: number;
  dbConnectionPool: number;
  memoryUsage: number;
}

interface AuditLog {
  id: string;
  userName: string;
  action: string;
  resource: string;
  details: string;
  ipAddress: string;
  createdAt: string;
}

interface ActiveSession {
  id: string;
  userName: string;
  role: string;
  ipAddress: string;
  lastActivity: string;
  startedAt: string;
}

interface BulkOperation {
  id: string;
  type: string;
  status: string;
  totalRecords: number;
  processedRecords: number;
  startedAt: string;
  completedAt: string;
}

export default function SystemAdministrationTab() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [bulkOps, setBulkOps] = useState<BulkOperation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [healthRes, sessionsRes, auditRes, bulkRes] = await Promise.all([
        api.get('/platform-experience/admin/system/health'),
        api.get('/platform-experience/admin/system/sessions'),
        api.get('/platform-experience/admin/system/audit-logs'),
        api.get('/platform-experience/admin/system/bulk-operations'),
      ]);

      const healthData = healthRes.data?.data || healthRes.data || {};
      const sessionsData = Array.isArray(sessionsRes.data) ? sessionsRes.data : sessionsRes.data?.data || [];
      const auditData = Array.isArray(auditRes.data) ? auditRes.data : auditRes.data?.data || [];
      const bulkData = Array.isArray(bulkRes.data) ? bulkRes.data : bulkRes.data?.data || [];

      setHealth({
        uptime: healthData.uptime || '—',
        activeSessions: healthData.activeSessions || 0,
        cacheHitRate: healthData.cacheHitRate || 0,
        queueSize: healthData.queueSize || 0,
        dbConnectionPool: healthData.dbConnectionPool || 0,
        memoryUsage: healthData.memoryUsage || 0,
      });
      setSessions(sessionsData);
      setAuditLogs(auditData);
      setBulkOps(bulkData);
    } catch {
      setError('Failed to load system data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      completed: 'bg-green-100 text-green-700',
      running: 'bg-blue-100 text-blue-700',
      failed: 'bg-red-100 text-red-700',
      pending: 'bg-yellow-100 text-yellow-700',
      queued: 'bg-gray-100 text-gray-700',
    };
    return styles[status] || 'bg-gray-100 text-gray-700';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
      </div>
    );
  }

  if (error && !health) {
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
        <Shield className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-text">System Administration</h2>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* System Health Cards */}
      {health && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="h-4 w-4 text-text-muted" />
            <h3 className="text-sm font-semibold text-text uppercase tracking-wider">System Health</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-background rounded-xl border border-border p-5">
              <p className="text-sm text-text-muted mb-1">Uptime</p>
              <p className="text-2xl font-bold text-text">{health.uptime}</p>
            </div>
            <div className="bg-background rounded-xl border border-border p-5">
              <p className="text-sm text-text-muted mb-1">Active Sessions</p>
              <p className="text-2xl font-bold text-text">{health.activeSessions}</p>
            </div>
            <div className="bg-background rounded-xl border border-border p-5">
              <p className="text-sm text-text-muted mb-1">Cache Hit Rate</p>
              <p className="text-2xl font-bold text-text">{health.cacheHitRate}%</p>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div
                  className={`h-2 rounded-full ${health.cacheHitRate >= 80 ? 'bg-green-500' : health.cacheHitRate >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                  style={{ width: `${Math.min(health.cacheHitRate, 100)}%` }}
                />
              </div>
            </div>
            <div className="bg-background rounded-xl border border-border p-5">
              <p className="text-sm text-text-muted mb-1">Queue Size</p>
              <p className="text-2xl font-bold text-text">{health.queueSize}</p>
            </div>
            <div className="bg-background rounded-xl border border-border p-5">
              <p className="text-sm text-text-muted mb-1">DB Connection Pool</p>
              <p className="text-2xl font-bold text-text">{health.dbConnectionPool}</p>
            </div>
            <div className="bg-background rounded-xl border border-border p-5">
              <p className="text-sm text-text-muted mb-1">Memory Usage</p>
              <p className="text-2xl font-bold text-text">{health.memoryUsage}%</p>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div
                  className={`h-2 rounded-full ${health.memoryUsage <= 70 ? 'bg-green-500' : health.memoryUsage <= 85 ? 'bg-yellow-500' : 'bg-red-500'}`}
                  style={{ width: `${Math.min(health.memoryUsage, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active Sessions */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <Users className="h-4 w-4 text-text-muted" />
          <h3 className="text-sm font-semibold text-text uppercase tracking-wider">Active Sessions</h3>
        </div>
        {sessions.length === 0 ? (
          <div className="text-center py-8">
            <Inbox className="h-8 w-8 text-text-muted mx-auto mb-2" />
            <p className="text-text-muted text-sm">No active sessions found.</p>
          </div>
        ) : (
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-background">
                <tr>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">User</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Role</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">IP Address</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Last Activity</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Started</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sessions.map((s) => (
                  <tr key={s.id} className="hover:bg-background/50">
                    <td className="px-4 py-3 text-sm text-text font-medium">{s.userName}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 capitalize">
                        {s.role?.replace('_', ' ') || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">{s.ipAddress || '—'}</td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {s.lastActivity ? new Date(s.lastActivity).toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {s.startedAt ? new Date(s.startedAt).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Audit Logs */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="h-4 w-4 text-text-muted" />
          <h3 className="text-sm font-semibold text-text uppercase tracking-wider">Audit Logs</h3>
        </div>
        {auditLogs.length === 0 ? (
          <div className="text-center py-8">
            <Inbox className="h-8 w-8 text-text-muted mx-auto mb-2" />
            <p className="text-text-muted text-sm">No audit logs available.</p>
          </div>
        ) : (
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-background">
                <tr>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">User</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Action</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Resource</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">IP</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-background/50">
                    <td className="px-4 py-3 text-sm text-text font-medium">{log.userName}</td>
                    <td className="px-4 py-3 text-sm text-text-muted">{log.action}</td>
                    <td className="px-4 py-3 text-sm text-text-muted">{log.resource}</td>
                    <td className="px-4 py-3 text-sm text-text-muted">{log.ipAddress || '—'}</td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {log.createdAt ? new Date(log.createdAt).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bulk Operations */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Database className="h-4 w-4 text-text-muted" />
          <h3 className="text-sm font-semibold text-text uppercase tracking-wider">Bulk Operations</h3>
        </div>
        {bulkOps.length === 0 ? (
          <div className="text-center py-8">
            <Inbox className="h-8 w-8 text-text-muted mx-auto mb-2" />
            <p className="text-text-muted text-sm">No bulk operations found.</p>
          </div>
        ) : (
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-background">
                <tr>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Type</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Status</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Progress</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Started</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Completed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {bulkOps.map((op) => (
                  <tr key={op.id} className="hover:bg-background/50">
                    <td className="px-4 py-3 text-sm text-text font-medium capitalize">{op.type?.replace('_', ' ') || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(op.status)}`}>
                        {op.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${op.status === 'completed' ? 'bg-green-500' : 'bg-primary'}`}
                            style={{ width: `${op.totalRecords > 0 ? Math.min((op.processedRecords / op.totalRecords) * 100, 100) : 0}%` }}
                          />
                        </div>
                        <span className="text-xs text-text-muted">{op.processedRecords || 0}/{op.totalRecords || 0}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {op.startedAt ? new Date(op.startedAt).toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {op.completedAt ? new Date(op.completedAt).toLocaleString() : '—'}
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
