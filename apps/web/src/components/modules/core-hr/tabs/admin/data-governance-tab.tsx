'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  Database,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const selectClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary appearance-none';
const inputClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary';

interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  entity: string;
  entityId: string | null;
  description: string | null;
}

const ACTION_STYLES: Record<string, string> = {
  create: 'bg-green-50 text-green-700',
  update: 'bg-blue-50 text-blue-700',
  delete: 'bg-red-50 text-red-700',
  read: 'bg-gray-100 text-gray-600',
  export: 'bg-purple-50 text-purple-700',
  login: 'bg-yellow-50 text-yellow-700',
};

const ENTITY_TYPES = [
  'employee',
  'department',
  'designation',
  'salary_structure',
  'benefit_plan',
  'document',
  'custom_field',
];

const ACTION_TYPES = ['create', 'update', 'delete', 'read', 'export', 'login'];

const PAGE_SIZE = 20;

export default function DataGovernanceTab() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [filterEntity, setFilterEntity] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  // Pagination
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadAuditLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filterEntity, filterAction, filterDateFrom, filterDateTo]);

  const loadAuditLogs = async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string | number> = {
        page,
        limit: PAGE_SIZE,
      };
      if (filterEntity) params.entity = filterEntity;
      if (filterAction) params.action = filterAction;
      if (filterDateFrom) params.dateFrom = filterDateFrom;
      if (filterDateTo) params.dateTo = filterDateTo;

      const res = await api.get('/core-hr/admin/data-governance/audit-logs', { params });
      const data = res.data;
      setLogs(Array.isArray(data) ? data : data.data || []);
      setTotalCount(data.total ?? data.totalCount ?? (Array.isArray(data) ? data.length : 0));
    } catch {
      setError('Failed to load audit logs.');
    } finally {
      setIsLoading(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const clearFilters = () => {
    setFilterEntity('');
    setFilterAction('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setPage(1);
  };

  const hasActiveFilters = filterEntity || filterAction || filterDateFrom || filterDateTo;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-text flex items-center gap-2">
          <Database className="h-5 w-5" />
          Data Governance &amp; Audit Logs
        </h2>
        <p className="text-sm text-text-muted">
          Track all data changes and user actions across the system.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-40">
          <label className="block text-xs font-medium text-text-muted mb-1">Entity Type</label>
          <select
            value={filterEntity}
            onChange={(e) => {
              setFilterEntity(e.target.value);
              setPage(1);
            }}
            className={`${selectClassName} text-sm`}
          >
            <option value="">All Entities</option>
            {ENTITY_TYPES.map((et) => (
              <option key={et} value={et}>
                {et.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>
        <div className="w-36">
          <label className="block text-xs font-medium text-text-muted mb-1">Action</label>
          <select
            value={filterAction}
            onChange={(e) => {
              setFilterAction(e.target.value);
              setPage(1);
            }}
            className={`${selectClassName} text-sm`}
          >
            <option value="">All Actions</option>
            {ACTION_TYPES.map((at) => (
              <option key={at} value={at}>
                {at}
              </option>
            ))}
          </select>
        </div>
        <div className="w-40">
          <label className="block text-xs font-medium text-text-muted mb-1">Date From</label>
          <input
            type="date"
            value={filterDateFrom}
            onChange={(e) => {
              setFilterDateFrom(e.target.value);
              setPage(1);
            }}
            className={`${inputClassName} text-sm`}
          />
        </div>
        <div className="w-40">
          <label className="block text-xs font-medium text-text-muted mb-1">Date To</label>
          <input
            type="date"
            value={filterDateTo}
            onChange={(e) => {
              setFilterDateTo(e.target.value);
              setPage(1);
            }}
            className={`${inputClassName} text-sm`}
          />
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium border border-border text-text-muted hover:text-text hover:bg-background transition-colors"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Audit Log Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
          <span className="ml-2 text-sm text-text-muted">Loading audit logs...</span>
        </div>
      ) : (
        <>
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-background border-b border-border">
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                    Timestamp
                  </th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                    User
                  </th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                    Action
                  </th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                    Entity
                  </th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className="bg-card hover:bg-background/50 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-text-muted whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-text font-medium">
                      {log.userName}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          ACTION_STYLES[log.action] || ACTION_STYLES.read
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-background text-text-muted border border-border">
                        {log.entity.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted max-w-[300px] truncate">
                      {log.description || '--'}
                    </td>
                  </tr>
                ))}

                {/* Empty State */}
                {logs.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-sm text-text-muted"
                    >
                      No audit logs found. Logs will appear here as users interact with the system.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-text-muted">
                Showing {(page - 1) * PAGE_SIZE + 1} to{' '}
                {Math.min(page * PAGE_SIZE, totalCount)} of {totalCount} entries
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>
                <span className="text-sm text-text-muted">
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
