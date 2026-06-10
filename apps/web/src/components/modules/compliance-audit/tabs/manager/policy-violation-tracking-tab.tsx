'use client';
import { useState, useEffect } from 'react';
import { Loader2, X, AlertCircle, Plus, AlertTriangle, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';

interface PolicyViolation {
  id: string;
  employeeId: string;
  employeeName: string;
  policyId: string;
  policyTitle: string;
  violationType: string;
  description: string;
  severity: 'minor' | 'major' | 'gross';
  date: string;
  disciplinaryActionStatus?: string;
  disciplinaryAction?: string;
}

interface ViolationHistory {
  employeeId: string;
  employeeName: string;
  violations: PolicyViolation[];
}

interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
}

interface PolicyOption {
  id: string;
  title: string;
}

const severityColors: Record<string, string> = {
  minor: 'bg-yellow-100 text-yellow-700',
  major: 'bg-orange-100 text-orange-700',
  gross: 'bg-red-100 text-red-700',
};

const disciplinaryStatusColors: Record<string, string> = {
  open: 'bg-yellow-100 text-yellow-700',
  under_review: 'bg-orange-100 text-orange-700',
  action_taken: 'bg-blue-100 text-blue-700',
  closed: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  warning_issued: 'bg-orange-100 text-orange-700',
  suspended: 'bg-red-100 text-red-700',
  terminated: 'bg-red-200 text-red-800',
  resolved: 'bg-green-100 text-green-700',
  none: 'bg-gray-100 text-gray-600',
};

export default function PolicyViolationTrackingTab() {
  const [violations, setViolations] = useState<PolicyViolation[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [policies, setPolicies] = useState<PolicyOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [historyEmployeeId, setHistoryEmployeeId] = useState('');
  const [history, setHistory] = useState<ViolationHistory | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [disciplinaryViolationId, setDisciplinaryViolationId] = useState<string | null>(null);
  const [disciplinaryAction, setDisciplinaryAction] = useState('');

  const [form, setForm] = useState({
    employeeId: '',
    policyId: '',
    violationType: '',
    description: '',
    severity: 'minor' as 'minor' | 'major' | 'gross',
  });

  useEffect(() => {
    fetchViolations();
    fetchReferenceData();
  }, []);

  const fetchViolations = async () => {
    try {
      setLoading(true);
      const res = await api.get('/compliance-audit/manager/policy-violations');
      const raw = res.data?.data || res.data;
      setViolations(Array.isArray(raw) ? raw : []);
    } catch {
      setError('Failed to load policy violations');
    } finally {
      setLoading(false);
    }
  };

  const fetchReferenceData = async () => {
    const [teamRes, policyRes] = await Promise.all([
      api.get('/core-hr/manager/team').catch(() => ({ data: [] })),
      api.get('/compliance-audit/employee/policy-acknowledgment').catch(() => ({ data: [] })),
    ]);
    const teamRaw = teamRes.data?.data || teamRes.data;
    setTeamMembers(Array.isArray(teamRaw) ? teamRaw : []);
    const policyRaw = policyRes.data?.data || policyRes.data;
    setPolicies(Array.isArray(policyRaw) ? policyRaw : []);
  };

  const handleCreate = async () => {
    if (!form.employeeId || !form.violationType) return;
    try {
      setSubmitting(true);
      await api.post('/compliance-audit/manager/policy-violations', form);
      setForm({ employeeId: '', policyId: '', violationType: '', description: '', severity: 'minor' });
      setShowForm(false);
      fetchViolations();
    } catch {
      setError('Failed to record violation');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDisciplinaryAction = async (id: string) => {
    if (!disciplinaryAction) return;
    try {
      await api.patch(`/compliance-audit/manager/policy-violations/${id}/disciplinary-action`, { action: disciplinaryAction });
      setDisciplinaryViolationId(null);
      setDisciplinaryAction('');
      fetchViolations();
    } catch {
      setError('Failed to record disciplinary action');
    }
  };

  const fetchHistory = async () => {
    if (!historyEmployeeId) return;
    try {
      setLoadingHistory(true);
      const res = await api.get(`/compliance-audit/manager/policy-violations/history/${historyEmployeeId}`);
      const histRaw = res.data?.data || res.data;
      if (Array.isArray(histRaw)) {
        setHistory({ employeeId: historyEmployeeId, employeeName: histRaw[0]?.employeeName || historyEmployeeId, violations: histRaw });
      } else if (histRaw && Array.isArray(histRaw.violations)) {
        setHistory(histRaw);
      } else {
        setHistory({ employeeId: historyEmployeeId, employeeName: historyEmployeeId, violations: [] });
      }
    } catch {
      setError('Failed to load violation history');
    } finally {
      setLoadingHistory(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        <span className="ml-2 text-gray-500">Loading violations...</span>
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

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[#2c2c2c]">Policy Violations</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Record Violation
          </button>
        </div>

        {showForm && (
          <div className="mb-6 p-4 border border-indigo-100 bg-indigo-50 rounded-lg">
            <h3 className="text-sm font-semibold text-[#2c2c2c] mb-3">Record New Violation</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Employee *</label>
                <select
                  value={form.employeeId}
                  onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select team member</option>
                  {teamMembers.map((m) => (
                    <option key={m.id} value={m.id}>{`${m.firstName} ${m.lastName}`.trim()}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Related Policy</label>
                <select
                  value={form.policyId}
                  onChange={(e) => setForm({ ...form, policyId: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">None (optional)</option>
                  {policies.map((p) => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Violation Type *</label>
                <input
                  type="text"
                  value={form.violationType}
                  onChange={(e) => setForm({ ...form, violationType: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., Code of Conduct, Safety, Data"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Severity</label>
                <select
                  value={form.severity}
                  onChange={(e) => setForm({ ...form, severity: e.target.value as 'minor' | 'major' | 'gross' })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="minor">Minor</option>
                  <option value="major">Major</option>
                  <option value="gross">Gross</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Describe the violation..."
                />
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleCreate}
                disabled={submitting}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Record Violation
              </button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}

        {violations.length === 0 ? (
          <div className="text-center py-12">
            <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No policy violations recorded.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Employee</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Policy</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Violation Type</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Severity</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Disciplinary Status</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {violations.map((v) => (
                  <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-2 font-medium text-[#2c2c2c]">{v.employeeName}</td>
                    <td className="py-3 px-2 text-gray-600">{v.policyTitle || '—'}</td>
                    <td className="py-3 px-2 text-gray-600">{v.violationType}</td>
                    <td className="py-3 px-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${severityColors[v.severity]}`}>
                        {v.severity}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-gray-600 text-xs">{new Date(v.date).toLocaleDateString()}</td>
                    <td className="py-3 px-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${disciplinaryStatusColors[v.disciplinaryActionStatus || 'none']}`}>
                        {v.disciplinaryActionStatus?.replace('_', ' ') || 'None'}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      {disciplinaryViolationId === v.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            placeholder="Action taken"
                            value={disciplinaryAction}
                            onChange={(e) => setDisciplinaryAction(e.target.value)}
                            className="border border-gray-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 w-32"
                          />
                          <button
                            onClick={() => handleDisciplinaryAction(v.id)}
                            className="px-2 py-1 bg-indigo-600 text-white rounded text-xs hover:bg-indigo-700"
                          >
                            Save
                          </button>
                          <button onClick={() => setDisciplinaryViolationId(null)} className="px-1 text-gray-500 text-xs">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDisciplinaryViolationId(v.id)}
                          className="flex items-center gap-1 px-2 py-1 text-xs border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          Record Action
                          <ChevronRight className="w-3 h-3" />
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

      {/* Violation History Panel */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-base font-semibold text-[#2c2c2c] mb-3">Employee Violation History</h3>
        <div className="flex items-center gap-3 mb-4">
          <select
            value={historyEmployeeId}
            onChange={(e) => setHistoryEmployeeId(e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Select team member</option>
            {teamMembers.map((m) => (
              <option key={m.id} value={m.id}>{`${m.firstName} ${m.lastName}`.trim()}</option>
            ))}
          </select>
          <button
            onClick={fetchHistory}
            disabled={loadingHistory || !historyEmployeeId}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {loadingHistory ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Load History
          </button>
        </div>
        {history && (
          <div>
            <p className="text-sm font-medium text-[#2c2c2c] mb-3">{history.employeeName} — {history.violations.length} violation{history.violations.length !== 1 ? 's' : ''}</p>
            {history.violations.length === 0 ? (
              <p className="text-sm text-gray-500">No violations on record.</p>
            ) : (
              <div className="space-y-2">
                {history.violations.map((v) => (
                  <div key={v.id} className="flex items-center justify-between border border-gray-200 rounded-lg p-3">
                    <div>
                      <p className="text-sm font-medium text-[#2c2c2c]">{v.violationType}</p>
                      <p className="text-xs text-gray-500">{new Date(v.date).toLocaleDateString()}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${severityColors[v.severity]}`}>
                      {v.severity}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
