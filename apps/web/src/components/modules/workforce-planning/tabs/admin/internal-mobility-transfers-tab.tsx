'use client';
import { useState, useEffect } from 'react';
import { Loader2, X, ArrowLeftRight, CheckCircle, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';

interface MobilityStats {
  totalRequests: number;
  pending: number;
  approved: number;
  completed: number;
}

interface MobilityRequest {
  id: string;
  employeeId: string;
  employeeName?: string;
  requestType: string;
  fromDepartment?: string;
  toDepartment?: string;
  effectiveDate?: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled';
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  completed: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

export default function InternalMobilityTransfersTab() {
  const [requests, setRequests] = useState<MobilityRequest[]>([]);
  const [stats, setStats] = useState<MobilityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [reqRes, statsRes] = await Promise.allSettled([
        api.get('/workforce-planning/admin/internal-mobility'),
        api.get('/workforce-planning/admin/internal-mobility/stats'),
      ]);
      if (reqRes.status === 'fulfilled') setRequests(reqRes.value.data?.data || reqRes.value.data || []);
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data?.data || statsRes.value.data || null);
    } catch {
      setError('Failed to load mobility requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await api.patch(`/workforce-planning/admin/internal-mobility/${id}/approve`);
      setSuccessMsg('Request approved');
      fetchData();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch {
      setError('Failed to approve request');
    }
  };

  const handleReject = async (id: string) => {
    try {
      await api.patch(`/workforce-planning/admin/internal-mobility/${id}/reject`);
      setSuccessMsg('Request rejected');
      fetchData();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch {
      setError('Failed to reject request');
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        <span className="ml-2 text-gray-500">Loading mobility requests...</span>
      </div>
    );
  }

  const statCards = [
    { label: 'Total Requests', value: stats?.totalRequests ?? 0, color: 'text-indigo-600' },
    { label: 'Pending', value: stats?.pending ?? 0, color: 'text-yellow-600' },
    { label: 'Approved', value: stats?.approved ?? 0, color: 'text-green-600' },
    { label: 'Completed', value: stats?.completed ?? 0, color: 'text-blue-600' },
  ];

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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">{card.label}</p>
            <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-[#2c2c2c] mb-4">Mobility & Transfer Requests</h2>
        {requests.length === 0 ? (
          <div className="text-center py-12">
            <ArrowLeftRight className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No mobility requests found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Employee</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Request Type</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">From Dept</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">To Dept</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Effective Date</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-2">
                      <div className="font-medium text-[#2c2c2c]">{req.employeeName || req.employeeId}</div>
                    </td>
                    <td className="py-3 px-2 text-gray-600 capitalize">{req.requestType?.replace(/_/g, ' ')}</td>
                    <td className="py-3 px-2 text-gray-600">{req.fromDepartment || '—'}</td>
                    <td className="py-3 px-2 text-gray-600">{req.toDepartment || '—'}</td>
                    <td className="py-3 px-2 text-gray-600">
                      {req.effectiveDate ? new Date(req.effectiveDate).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3 px-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[req.status] || 'bg-gray-100 text-gray-700'}`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-1">
                        {req.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(req.id)}
                              className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(req.id)}
                              className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </div>
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
