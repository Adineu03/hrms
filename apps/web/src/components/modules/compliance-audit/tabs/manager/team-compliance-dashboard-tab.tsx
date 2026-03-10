'use client';
import { useState, useEffect } from 'react';
import { Loader2, X, AlertCircle, Users, CheckCircle, Clock, Bell } from 'lucide-react';
import { api } from '@/lib/api';

interface TeamOverview {
  totalMembers: number;
  compliantPercentage: number;
  overdueItems: number;
  pendingAcknowledgments: number;
}

interface TeamMember {
  id: string;
  name: string;
  designation: string;
  trainingStatus: 'compliant' | 'in_progress' | 'overdue' | 'not_started';
  policyAckStatus: 'all_acknowledged' | 'pending' | 'overdue';
  overdueCount: number;
  ragStatus: 'green' | 'yellow' | 'red';
}

interface OverdueItem {
  id: string;
  employeeId: string;
  employeeName: string;
  type: string;
  title: string;
  daysOverdue: number;
}

const trainingStatusColors: Record<string, string> = {
  compliant: 'bg-green-100 text-green-700',
  in_progress: 'bg-blue-100 text-blue-700',
  overdue: 'bg-red-100 text-red-700',
  not_started: 'bg-gray-100 text-gray-600',
};

const policyAckColors: Record<string, string> = {
  all_acknowledged: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  overdue: 'bg-red-100 text-red-700',
};

const ragColors: Record<string, string> = {
  green: 'bg-green-500',
  yellow: 'bg-yellow-500',
  red: 'bg-red-500',
};

export default function TeamComplianceDashboardTab() {
  const [overview, setOverview] = useState<TeamOverview | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [overdueItems, setOverdueItems] = useState<OverdueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [remindingId, setRemindingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [activeSection, setActiveSection] = useState<'members' | 'overdue'>('members');

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [overviewRes, membersRes, overdueRes] = await Promise.all([
        api.get('/compliance-audit/manager/team-compliance/overview'),
        api.get('/compliance-audit/manager/team-compliance/members'),
        api.get('/compliance-audit/manager/team-compliance/overdue'),
      ]);
      setOverview(overviewRes.data?.data || overviewRes.data);
      setMembers(membersRes.data?.data || membersRes.data || []);
      setOverdueItems(overdueRes.data?.data || overdueRes.data || []);
    } catch {
      setError('Failed to load team compliance data');
    } finally {
      setLoading(false);
    }
  };

  const handleSendReminder = async (employeeId: string) => {
    try {
      setRemindingId(employeeId);
      await api.post(`/compliance-audit/manager/team-compliance/remind/${employeeId}`);
      setSuccessMsg('Reminder sent successfully');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch {
      setError('Failed to send reminder');
    } finally {
      setRemindingId(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        <span className="ml-2 text-gray-500">Loading team compliance data...</span>
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

      {/* Overview Stats */}
      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-indigo-50 rounded-lg">
                <Users className="w-5 h-5 text-indigo-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-[#2c2c2c]">{overview.totalMembers}</p>
            <p className="text-sm text-gray-500">Total Members</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-50 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-green-600">{overview.compliantPercentage}%</p>
            <p className="text-sm text-gray-500">Compliant</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-red-50 rounded-lg">
                <Clock className="w-5 h-5 text-red-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-red-600">{overview.overdueItems}</p>
            <p className="text-sm text-gray-500">Overdue Items</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-yellow-50 rounded-lg">
                <Bell className="w-5 h-5 text-yellow-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-yellow-600">{overview.pendingAcknowledgments}</p>
            <p className="text-sm text-gray-500">Pending Acks</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => setActiveSection('members')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeSection === 'members' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            Team Members
          </button>
          <button
            onClick={() => setActiveSection('overdue')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeSection === 'overdue' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            Overdue Items {overdueItems.length > 0 && <span className="ml-1 bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full text-xs">{overdueItems.length}</span>}
          </button>
        </div>

        {activeSection === 'members' && (
          <>
            {members.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No team members found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Employee</th>
                      <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Training Status</th>
                      <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Policy Ack</th>
                      <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Overdue</th>
                      <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                      <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {members.map((member) => (
                      <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-2">
                          <p className="font-medium text-[#2c2c2c]">{member.name}</p>
                          <p className="text-xs text-gray-500">{member.designation}</p>
                        </td>
                        <td className="py-3 px-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${trainingStatusColors[member.trainingStatus]}`}>
                            {member.trainingStatus.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${policyAckColors[member.policyAckStatus]}`}>
                            {member.policyAckStatus.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-2">
                          {member.overdueCount > 0 ? (
                            <span className="text-red-600 font-medium">{member.overdueCount}</span>
                          ) : (
                            <span className="text-gray-400">0</span>
                          )}
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-1.5">
                            <div className={`w-2.5 h-2.5 rounded-full ${ragColors[member.ragStatus]}`} />
                            <span className="text-xs text-gray-600 capitalize">{member.ragStatus}</span>
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <button
                            onClick={() => handleSendReminder(member.id)}
                            disabled={remindingId === member.id}
                            className="flex items-center gap-1 px-2 py-1 text-xs border border-indigo-300 text-indigo-700 rounded-lg hover:bg-indigo-50 disabled:opacity-50 transition-colors"
                          >
                            {remindingId === member.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Bell className="w-3 h-3" />
                            )}
                            Remind
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {activeSection === 'overdue' && (
          <>
            {overdueItems.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No overdue items. Your team is on track!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {overdueItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between border border-red-100 bg-red-50 rounded-lg p-4">
                    <div>
                      <p className="font-medium text-[#2c2c2c] text-sm">{item.title}</p>
                      <p className="text-xs text-gray-500">{item.employeeName} — <span className="capitalize">{item.type}</span></p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                        {item.daysOverdue} day{item.daysOverdue !== 1 ? 's' : ''} overdue
                      </span>
                      <button
                        onClick={() => handleSendReminder(item.employeeId)}
                        disabled={remindingId === item.employeeId}
                        className="flex items-center gap-1 px-2 py-1 text-xs bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                      >
                        {remindingId === item.employeeId ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Bell className="w-3 h-3" />
                        )}
                        Remind
                      </button>
                    </div>
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
