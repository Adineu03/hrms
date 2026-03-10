'use client';
import { useState, useEffect } from 'react';
import { Loader2, Plus, X, ArrowLeftRight, CheckCircle, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';

interface TransferRequest {
  id: string;
  employeeId: string;
  employeeName?: string;
  requestType: string;
  toDepartmentId: string;
  effectiveDate?: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled';
  backfillRequired: boolean;
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  completed: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

const requestTypeOptions = [
  { value: 'transfer', label: 'Transfer' },
  { value: 'lateral_move', label: 'Lateral Move' },
  { value: 'promotion', label: 'Promotion' },
  { value: 'location_change', label: 'Location Change' },
];

export default function TransferMobilityRequestsTab() {
  const [requests, setRequests] = useState<TransferRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const [form, setForm] = useState({
    employeeId: '',
    requestType: 'transfer',
    toDepartmentId: '',
    reason: '',
    effectiveDate: '',
    backfillRequired: false,
  });

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await api.get('/workforce-planning/manager/transfer-requests');
      setRequests(res.data?.data || res.data || []);
    } catch {
      setError('Failed to load transfer requests');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!form.employeeId || !form.toDepartmentId) return;
    try {
      setSubmitting(true);
      await api.post('/workforce-planning/manager/transfer-requests', form);
      setForm({ employeeId: '', requestType: 'transfer', toDepartmentId: '', reason: '', effectiveDate: '', backfillRequired: false });
      setShowForm(false);
      setSuccessMsg('Transfer request submitted successfully');
      fetchRequests();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch {
      setError('Failed to submit transfer request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackfill = async (id: string) => {
    try {
      await api.post(`/workforce-planning/manager/transfer-requests/${id}/backfill`);
      setSuccessMsg('Backfill request created');
      fetchRequests();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch {
      setError('Failed to create backfill request');
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        <span className="ml-2 text-gray-500">Loading transfer requests...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {successMsg && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg p-3 text-green-700 text-sm">
          <CheckCircle className="w-4 h-4" />
          {successMsg}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
          <button onClick={() => setError('')} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[#2c2c2c]">Transfer & Mobility Requests</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Submit Request
          </button>
        </div>

        {showForm && (
          <div className="mb-6 p-4 border border-indigo-100 bg-indigo-50 rounded-lg">
            <h3 className="text-sm font-semibold text-[#2c2c2c] mb-3">New Transfer Request</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Employee ID *</label>
                <input
                  type="text"
                  value={form.employeeId}
                  onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-[#2c2c2c] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="EMP-001"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Request Type</label>
                <select
                  value={form.requestType}
                  onChange={(e) => setForm({ ...form, requestType: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-[#2c2c2c] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {requestTypeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">To Department ID *</label>
                <input
                  type="text"
                  value={form.toDepartmentId}
                  onChange={(e) => setForm({ ...form, toDepartmentId: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-[#2c2c2c] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Department ID"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Effective Date</label>
                <input
                  type="date"
                  value={form.effectiveDate}
                  onChange={(e) => setForm({ ...form, effectiveDate: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-[#2c2c2c] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Reason</label>
                <textarea
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-[#2c2c2c] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Reason for transfer..."
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="backfillReq"
                  checked={form.backfillRequired}
                  onChange={(e) => setForm({ ...form, backfillRequired: e.target.checked })}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="backfillReq" className="text-sm text-gray-700">Backfill Required</label>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleCreate}
                disabled={submitting}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Submit Request
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {requests.length === 0 ? (
          <div className="text-center py-12">
            <ArrowLeftRight className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No transfer requests found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Employee</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">To Dept</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Effective Date</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Backfill</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-2 font-medium text-[#2c2c2c]">{req.employeeName || req.employeeId}</td>
                    <td className="py-3 px-2 text-gray-600 capitalize">{req.requestType?.replace(/_/g, ' ')}</td>
                    <td className="py-3 px-2 text-gray-600 font-mono text-xs">{req.toDepartmentId}</td>
                    <td className="py-3 px-2 text-gray-600">
                      {req.effectiveDate ? new Date(req.effectiveDate).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3 px-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[req.status] || 'bg-gray-100 text-gray-700'}`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      {req.backfillRequired ? (
                        <span className="text-xs text-orange-600 font-medium">Required</span>
                      ) : (
                        <span className="text-xs text-gray-400">Not required</span>
                      )}
                    </td>
                    <td className="py-3 px-2">
                      {req.status === 'pending' && req.backfillRequired && (
                        <button
                          onClick={() => handleBackfill(req.id)}
                          className="px-2 py-1 text-xs bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 transition-colors"
                        >
                          Backfill
                        </button>
                      )}
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
