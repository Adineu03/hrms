'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  Clock,
  Search,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  CheckCircle2,
  XCircle,
  X,
  FileText,
} from 'lucide-react';

const inputClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary';
const selectClassName = inputClassName + ' appearance-none';

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-blue-50 text-blue-700',
  pending: 'bg-yellow-50 text-yellow-700',
  approved: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-700',
  cancelled: 'bg-gray-100 text-gray-600',
};

interface LeaveRecord {
  id: string;
  leaveTypeId: string;
  leaveTypeName: string;
  fromDate: string;
  toDate: string;
  days: number;
  status: string;
  reason: string;
  isHalfDay: boolean;
  halfDayType: string | null;
  appliedOn: string;
  approvalChain?: ApprovalStep[];
}

interface ApprovalStep {
  approverName: string;
  status: string;
  comment: string;
  actionDate: string | null;
}

interface YtdSummary {
  totalUsed: number;
  totalPending: number;
  totalCancelled: number;
}

interface LeaveType {
  id: string;
  name: string;
}

export default function LeaveHistoryTab() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [records, setRecords] = useState<LeaveRecord[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [ytdSummary, setYtdSummary] = useState<YtdSummary>({ totalUsed: 0, totalPending: 0, totalCancelled: 0 });
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [leaveTypeFilter, setLeaveTypeFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);

  // Expanded row
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedDetail, setExpandedDetail] = useState<LeaveRecord | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Reapply
  const [reapplyingId, setReapplyingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (leaveTypeFilter) params.set('leaveTypeId', leaveTypeFilter);
      if (searchQuery) params.set('search', searchQuery);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      params.set('page', String(page));
      params.set('limit', '20');

      const [histRes, balRes] = await Promise.all([
        api.get(`/leave-management/employee/history?${params.toString()}`),
        api.get('/leave-management/employee/balance'),
      ]);

      const histData = histRes.data;
      if (Array.isArray(histData)) {
        setRecords(histData);
        setTotalPages(1);
      } else {
        setRecords(histData?.data || []);
        setTotalPages(histData?.totalPages || 1);
      }

      // Calculate YTD summary from records
      const allRecords = Array.isArray(histData) ? histData : histData?.data || [];
      const summary: YtdSummary = { totalUsed: 0, totalPending: 0, totalCancelled: 0 };
      allRecords.forEach((r: LeaveRecord) => {
        if (r.status === 'approved') summary.totalUsed += r.days;
        if (r.status === 'pending') summary.totalPending += r.days;
        if (r.status === 'cancelled') summary.totalCancelled += r.days;
      });
      setYtdSummary(summary);

      // Extract leave types for filter dropdown
      const balances = Array.isArray(balRes.data) ? balRes.data : balRes.data?.data || [];
      const types: LeaveType[] = balances.map((b: Record<string, unknown>) => ({
        id: b.leaveTypeId as string,
        name: b.leaveTypeName as string,
      }));
      setLeaveTypes(types);
    } catch {
      setError('Failed to load leave history.');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, leaveTypeFilter, searchQuery, dateFrom, dateTo, page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleExpand = async (recordId: string) => {
    if (expandedId === recordId) {
      setExpandedId(null);
      setExpandedDetail(null);
      return;
    }
    setExpandedId(recordId);
    setIsLoadingDetail(true);
    try {
      const res = await api.get(`/leave-management/employee/history/${recordId}`);
      setExpandedDetail(res.data);
    } catch {
      setExpandedDetail(null);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleReapply = async (recordId: string) => {
    setReapplyingId(recordId);
    setError(null);
    try {
      await api.post(`/leave-management/employee/history/${recordId}/reapply`);
      setSuccess('Leave request resubmitted successfully.');
      await loadData();
    } catch {
      setError('Failed to reapply leave request.');
    } finally {
      setReapplyingId(null);
    }
  };

  if (isLoading && records.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Messages */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          {success}
          <button type="button" onClick={() => setSuccess(null)} className="ml-auto">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* YTD Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-text-muted">Total Records</p>
          <p className="text-2xl font-bold text-text mt-1">{records.length}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-text-muted">Days Used</p>
          <p className="text-2xl font-bold text-green-700 mt-1">{ytdSummary.totalUsed}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-text-muted">Days Pending</p>
          <p className="text-2xl font-bold text-yellow-700 mt-1">{ytdSummary.totalPending}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-text-muted">Days Cancelled</p>
          <p className="text-2xl font-bold text-gray-500 mt-1">{ytdSummary.totalCancelled}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="w-44">
          <label className="block text-xs font-medium text-text-muted mb-1">Leave Type</label>
          <select
            value={leaveTypeFilter}
            onChange={(e) => { setLeaveTypeFilter(e.target.value); setPage(1); }}
            className={selectClassName}
          >
            <option value="">All Types</option>
            {leaveTypes.map((lt) => (
              <option key={lt.id} value={lt.id}>{lt.name}</option>
            ))}
          </select>
        </div>
        <div className="w-36">
          <label className="block text-xs font-medium text-text-muted mb-1">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className={selectClassName}
          >
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
            <option value="draft">Draft</option>
          </select>
        </div>
        <div className="w-36">
          <label className="block text-xs font-medium text-text-muted mb-1">From Date</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            className={inputClassName}
          />
        </div>
        <div className="w-36">
          <label className="block text-xs font-medium text-text-muted mb-1">To Date</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            className={inputClassName}
          />
        </div>
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs font-medium text-text-muted mb-1">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              placeholder="Search by reason..."
              className={inputClassName + ' pl-9'}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      {records.length > 0 ? (
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-background border-b border-border">
                <th className="text-left px-4 py-3 font-medium text-text-muted">Leave Type</th>
                <th className="text-left px-4 py-3 font-medium text-text-muted">From</th>
                <th className="text-left px-4 py-3 font-medium text-text-muted">To</th>
                <th className="text-left px-4 py-3 font-medium text-text-muted">Days</th>
                <th className="text-left px-4 py-3 font-medium text-text-muted">Status</th>
                <th className="text-left px-4 py-3 font-medium text-text-muted">Applied On</th>
                <th className="text-left px-4 py-3 font-medium text-text-muted">Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.map((rec) => (
                <>
                  <tr
                    key={rec.id}
                    className="border-b border-border last:border-0 hover:bg-background/50 cursor-pointer"
                    onClick={() => handleExpand(rec.id)}
                  >
                    <td className="px-4 py-3 text-text font-medium">
                      <div className="flex items-center gap-2">
                        {rec.leaveTypeName}
                        {expandedId === rec.id ? (
                          <ChevronUp className="h-3.5 w-3.5 text-text-muted" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5 text-text-muted" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-text-muted">
                      {new Date(rec.fromDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-text-muted">
                      {new Date(rec.toDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-text">
                      {rec.days}
                      {rec.isHalfDay && (
                        <span className="text-xs text-text-muted ml-1">(half)</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          STATUS_STYLES[rec.status] || 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {rec.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-muted">
                      {new Date(rec.appliedOn).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      {rec.status === 'rejected' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReapply(rec.id);
                          }}
                          disabled={reapplyingId === rec.id}
                          className="text-primary hover:text-primary/80 text-xs font-medium disabled:opacity-50 flex items-center gap-1"
                        >
                          {reapplyingId === rec.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3 w-3" />
                          )}
                          Reapply
                        </button>
                      )}
                    </td>
                  </tr>

                  {/* Expanded Detail Row */}
                  {expandedId === rec.id && (
                    <tr key={`${rec.id}-detail`} className="border-b border-border">
                      <td colSpan={7} className="px-4 py-4 bg-background/30">
                        {isLoadingDetail ? (
                          <div className="flex items-center gap-2 text-sm text-text-muted py-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading details...
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {/* Reason */}
                            <div>
                              <p className="text-xs font-medium text-text-muted mb-1">Reason</p>
                              <p className="text-sm text-text">
                                {expandedDetail?.reason || rec.reason || 'No reason provided.'}
                              </p>
                            </div>

                            {/* Approval Chain */}
                            {expandedDetail?.approvalChain && expandedDetail.approvalChain.length > 0 && (
                              <div>
                                <p className="text-xs font-medium text-text-muted mb-2">Approval Chain</p>
                                <div className="space-y-2">
                                  {expandedDetail.approvalChain.map((step, idx) => (
                                    <div
                                      key={idx}
                                      className="flex items-start gap-3 text-sm"
                                    >
                                      <div className="mt-0.5">
                                        {step.status === 'approved' ? (
                                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                                        ) : step.status === 'rejected' ? (
                                          <XCircle className="h-4 w-4 text-red-600" />
                                        ) : (
                                          <Clock className="h-4 w-4 text-yellow-600" />
                                        )}
                                      </div>
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                          <span className="font-medium text-text">{step.approverName}</span>
                                          <span
                                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                              STATUS_STYLES[step.status] || 'bg-gray-100 text-gray-600'
                                            }`}
                                          >
                                            {step.status}
                                          </span>
                                        </div>
                                        {step.comment && (
                                          <p className="text-xs text-text-muted mt-0.5">
                                            &ldquo;{step.comment}&rdquo;
                                          </p>
                                        )}
                                        {step.actionDate && (
                                          <p className="text-xs text-text-muted mt-0.5">
                                            {new Date(step.actionDate).toLocaleString()}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-8">
          <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm text-text-muted">No leave records found.</p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-1.5 text-sm border border-border rounded-lg disabled:opacity-50 hover:bg-background transition-colors"
          >
            Previous
          </button>
          <span className="text-sm text-text-muted">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1.5 text-sm border border-border rounded-lg disabled:opacity-50 hover:bg-background transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
