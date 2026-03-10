'use client';
import { useState, useEffect } from 'react';
import { Loader2, X, AlertCircle, Lock, Shield, FileText, Bell } from 'lucide-react';
import { api } from '@/lib/api';

interface PrivacySummary {
  dataClassifications: number;
  pendingDsars: number;
  consentCompliance: number;
  retentionSchedules: number;
}

interface DsarRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  requestType: string;
  status: string;
  requestDate: string;
  dueDate: string;
  completedDate?: string;
}

interface BreachNotification {
  id: string;
  title: string;
  severity: string;
  reportedDate: string;
  affectedRecords: number;
  status: string;
  reportedBy: string;
  description: string;
}

const dsarStatusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
  rejected: 'bg-gray-100 text-gray-600',
};

const breachSeverityColors: Record<string, string> = {
  low: 'bg-yellow-100 text-yellow-700',
  medium: 'bg-orange-100 text-orange-700',
  high: 'bg-red-100 text-red-700',
  critical: 'bg-red-200 text-red-800',
};

export default function DataPrivacyGdprTab() {
  const [summary, setSummary] = useState<PrivacySummary | null>(null);
  const [dsarRequests, setDsarRequests] = useState<DsarRequest[]>([]);
  const [breachNotifications, setBreachNotifications] = useState<BreachNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeSection, setActiveSection] = useState<'dsar' | 'breach'>('dsar');

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [summaryRes, dsarRes, breachRes] = await Promise.all([
        api.get('/compliance-audit/admin/data-privacy/summary'),
        api.get('/compliance-audit/admin/data-privacy/dsar-requests'),
        api.get('/compliance-audit/admin/data-privacy/breach-notifications'),
      ]);
      setSummary(summaryRes.data?.data || summaryRes.data);
      setDsarRequests(dsarRes.data?.data || dsarRes.data || []);
      setBreachNotifications(breachRes.data?.data || breachRes.data || []);
    } catch {
      setError('Failed to load data privacy information');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        <span className="ml-2 text-gray-500">Loading data privacy info...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
          <button onClick={() => setError('')} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <Lock className="w-5 h-5 text-indigo-600" />
            </div>
            <span className="text-sm text-gray-500">Data Classifications</span>
          </div>
          <p className="text-2xl font-bold text-[#2c2c2c]">{summary?.dataClassifications ?? '—'}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-yellow-50 rounded-lg">
              <FileText className="w-5 h-5 text-yellow-600" />
            </div>
            <span className="text-sm text-gray-500">Pending DSARs</span>
          </div>
          <p className="text-2xl font-bold text-[#2c2c2c]">{summary?.pendingDsars ?? '—'}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-50 rounded-lg">
              <Shield className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-sm text-gray-500">Consent Compliance</span>
          </div>
          <p className="text-2xl font-bold text-[#2c2c2c]">{summary?.consentCompliance != null ? `${summary.consentCompliance}%` : '—'}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-50 rounded-lg">
              <Bell className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-sm text-gray-500">Retention Schedules</span>
          </div>
          <p className="text-2xl font-bold text-[#2c2c2c]">{summary?.retentionSchedules ?? '—'}</p>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => setActiveSection('dsar')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeSection === 'dsar' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            DSAR Requests
          </button>
          <button
            onClick={() => setActiveSection('breach')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeSection === 'breach' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            Breach Notifications
          </button>
        </div>

        {activeSection === 'dsar' && (
          <>
            <h3 className="text-base font-semibold text-[#2c2c2c] mb-3">Data Subject Access Requests (DSAR)</h3>
            {dsarRequests.length === 0 ? (
              <div className="text-center py-10">
                <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">No DSAR requests found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Employee</th>
                      <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Request Type</th>
                      <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                      <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Requested</th>
                      <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Due Date</th>
                      <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Completed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {dsarRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-2 font-medium text-[#2c2c2c]">{req.employeeName}</td>
                        <td className="py-3 px-2 text-gray-600">{req.requestType}</td>
                        <td className="py-3 px-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${dsarStatusColors[req.status] || 'bg-gray-100 text-gray-700'}`}>
                            {req.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-gray-600 text-xs">{new Date(req.requestDate).toLocaleDateString()}</td>
                        <td className="py-3 px-2 text-gray-600 text-xs">{new Date(req.dueDate).toLocaleDateString()}</td>
                        <td className="py-3 px-2 text-gray-600 text-xs">
                          {req.completedDate ? new Date(req.completedDate).toLocaleDateString() : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {activeSection === 'breach' && (
          <>
            <h3 className="text-base font-semibold text-[#2c2c2c] mb-3">Breach Notifications</h3>
            {breachNotifications.length === 0 ? (
              <div className="text-center py-10">
                <Bell className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">No breach notifications found.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {breachNotifications.map((breach) => (
                  <div key={breach.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-medium text-[#2c2c2c]">{breach.title}</h4>
                        <p className="text-xs text-gray-500">Reported by {breach.reportedBy} on {new Date(breach.reportedDate).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${breachSeverityColors[breach.severity] || 'bg-gray-100 text-gray-700'}`}>
                          {breach.severity}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${dsarStatusColors[breach.status] || 'bg-gray-100 text-gray-700'}`}>
                          {breach.status}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">{breach.description}</p>
                    <p className="text-xs text-gray-500 mt-1">Affected records: <span className="font-medium text-red-600">{breach.affectedRecords.toLocaleString()}</span></p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
