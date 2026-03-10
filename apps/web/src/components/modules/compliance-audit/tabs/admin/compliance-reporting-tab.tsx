'use client';
import { useState, useEffect } from 'react';
import { Loader2, X, AlertCircle, BarChart3, CheckCircle, Users, FileText, ClipboardList } from 'lucide-react';
import { api } from '@/lib/api';

interface DashboardSummary {
  totalPolicies: number;
  publishedPolicies: number;
  pendingAcknowledgments: number;
  completedTrainings: number;
  overdueItems: number;
  overallComplianceScore: number;
  openEthicsComplaints: number;
  pendingChecklists: number;
}

interface TrainingCompletion {
  trainingId: string;
  title: string;
  totalAssigned: number;
  completed: number;
  inProgress: number;
  overdue: number;
  completionRate: number;
}

interface PolicyAcknowledgment {
  policyId: string;
  policyTitle: string;
  policyCode: string;
  totalRequired: number;
  acknowledged: number;
  pending: number;
  acknowledgmentRate: number;
}

interface ChecklistStatus {
  category: string;
  total: number;
  completed: number;
  pending: number;
  overdue: number;
  completionRate: number;
}

const SECTIONS = [
  { id: 'summary', label: 'Dashboard Summary' },
  { id: 'training', label: 'Training Completion' },
  { id: 'policy-ack', label: 'Policy Acknowledgment' },
  { id: 'checklist', label: 'Checklist Status' },
];

export default function ComplianceReportingTab() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [training, setTraining] = useState<TrainingCompletion[]>([]);
  const [policyAck, setPolicyAck] = useState<PolicyAcknowledgment[]>([]);
  const [checklistStatus, setChecklistStatus] = useState<ChecklistStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeSection, setActiveSection] = useState('summary');

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [sumRes, trainRes, ackRes, checkRes] = await Promise.all([
        api.get('/compliance-audit/admin/reporting/dashboard'),
        api.get('/compliance-audit/admin/reporting/training-completion'),
        api.get('/compliance-audit/admin/reporting/policy-acknowledgment'),
        api.get('/compliance-audit/admin/reporting/checklist-status'),
      ]);
      setSummary(sumRes.data?.data || sumRes.data);
      setTraining(trainRes.data?.data || trainRes.data || []);
      setPolicyAck(ackRes.data?.data || ackRes.data || []);
      setChecklistStatus(checkRes.data?.data || checkRes.data || []);
    } catch {
      setError('Failed to load compliance reports');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getRateColor = (rate: number) => {
    if (rate >= 80) return 'bg-green-100 text-green-700';
    if (rate >= 60) return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        <span className="ml-2 text-gray-500">Loading compliance reports...</span>
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
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeSection === section.id ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              {section.label}
            </button>
          ))}
        </div>

        {activeSection === 'summary' && summary && (
          <div>
            <h3 className="text-base font-semibold text-[#2c2c2c] mb-4">Compliance Dashboard Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="border border-gray-200 rounded-lg p-4 text-center">
                <p className={`text-3xl font-bold ${getScoreColor(summary.overallComplianceScore)}`}>
                  {summary.overallComplianceScore}%
                </p>
                <p className="text-xs text-gray-500 mt-1">Overall Score</p>
              </div>
              <div className="border border-gray-200 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-[#2c2c2c]">{summary.publishedPolicies}/{summary.totalPolicies}</p>
                <p className="text-xs text-gray-500 mt-1">Policies Published</p>
              </div>
              <div className="border border-gray-200 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-yellow-600">{summary.pendingAcknowledgments}</p>
                <p className="text-xs text-gray-500 mt-1">Pending Acks</p>
              </div>
              <div className="border border-gray-200 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-green-600">{summary.completedTrainings}</p>
                <p className="text-xs text-gray-500 mt-1">Training Completions</p>
              </div>
              <div className="border border-gray-200 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-red-600">{summary.overdueItems}</p>
                <p className="text-xs text-gray-500 mt-1">Overdue Items</p>
              </div>
              <div className="border border-gray-200 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-orange-600">{summary.openEthicsComplaints}</p>
                <p className="text-xs text-gray-500 mt-1">Open Ethics Cases</p>
              </div>
              <div className="border border-gray-200 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-blue-600">{summary.pendingChecklists}</p>
                <p className="text-xs text-gray-500 mt-1">Pending Checklists</p>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'training' && (
          <div>
            <h3 className="text-base font-semibold text-[#2c2c2c] mb-4">Training Completion Report</h3>
            {training.length === 0 ? (
              <div className="text-center py-10">
                <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">No training data available.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Training</th>
                      <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Assigned</th>
                      <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Completed</th>
                      <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">In Progress</th>
                      <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Overdue</th>
                      <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Completion Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {training.map((t) => (
                      <tr key={t.trainingId} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-2 font-medium text-[#2c2c2c]">{t.title}</td>
                        <td className="py-3 px-2 text-gray-600">{t.totalAssigned}</td>
                        <td className="py-3 px-2 text-green-600 font-medium">{t.completed}</td>
                        <td className="py-3 px-2 text-blue-600">{t.inProgress}</td>
                        <td className="py-3 px-2 text-red-600">{t.overdue}</td>
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-24">
                              <div
                                className={`h-2 rounded-full ${t.completionRate >= 80 ? 'bg-green-500' : t.completionRate >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                style={{ width: `${t.completionRate}%` }}
                              />
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getRateColor(t.completionRate)}`}>
                              {t.completionRate}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeSection === 'policy-ack' && (
          <div>
            <h3 className="text-base font-semibold text-[#2c2c2c] mb-4">Policy Acknowledgment Report</h3>
            {policyAck.length === 0 ? (
              <div className="text-center py-10">
                <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">No policy acknowledgment data.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Policy</th>
                      <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Code</th>
                      <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Required</th>
                      <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Acknowledged</th>
                      <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Pending</th>
                      <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ack Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {policyAck.map((p) => (
                      <tr key={p.policyId} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-2 font-medium text-[#2c2c2c]">{p.policyTitle}</td>
                        <td className="py-3 px-2 text-gray-500 font-mono text-xs">{p.policyCode}</td>
                        <td className="py-3 px-2 text-gray-600">{p.totalRequired}</td>
                        <td className="py-3 px-2 text-green-600 font-medium">{p.acknowledged}</td>
                        <td className="py-3 px-2 text-yellow-600">{p.pending}</td>
                        <td className="py-3 px-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getRateColor(p.acknowledgmentRate)}`}>
                            {p.acknowledgmentRate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeSection === 'checklist' && (
          <div>
            <h3 className="text-base font-semibold text-[#2c2c2c] mb-4">Checklist Status Breakdown</h3>
            {checklistStatus.length === 0 ? (
              <div className="text-center py-10">
                <ClipboardList className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">No checklist data available.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</th>
                      <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</th>
                      <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Completed</th>
                      <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Pending</th>
                      <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Overdue</th>
                      <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Completion Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {checklistStatus.map((c) => (
                      <tr key={c.category} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-2 font-medium text-[#2c2c2c] capitalize">{c.category}</td>
                        <td className="py-3 px-2 text-gray-600">{c.total}</td>
                        <td className="py-3 px-2 text-green-600 font-medium">{c.completed}</td>
                        <td className="py-3 px-2 text-yellow-600">{c.pending}</td>
                        <td className="py-3 px-2 text-red-600">{c.overdue}</td>
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-24">
                              <div
                                className={`h-2 rounded-full ${c.completionRate >= 80 ? 'bg-green-500' : c.completionRate >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                style={{ width: `${c.completionRate}%` }}
                              />
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getRateColor(c.completionRate)}`}>
                              {c.completionRate}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
