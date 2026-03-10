'use client';
import { useState, useEffect } from 'react';
import { Loader2, X, AlertCircle, BookOpen, Clock, Calendar, Shield, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '@/lib/api';

interface WorkingHoursData {
  employeeId: string;
  employeeName: string;
  weeklyHours: number;
  maxAllowed: number;
  overtimeHours: number;
  status: 'compliant' | 'warning' | 'non_compliant';
}

interface LeaveCompliance {
  employeeId: string;
  employeeName: string;
  mandatoryLeavesTaken: number;
  mandatoryLeavesRequired: number;
  carryoverDays: number;
  status: 'compliant' | 'warning' | 'non_compliant';
}

interface HealthSafetyChecklist {
  id: string;
  title: string;
  category: string;
  status: 'pending' | 'completed' | 'overdue';
  dueDate: string;
  completedDate?: string;
  assignedTo?: string;
}

interface ContractorClassification {
  id: string;
  name: string;
  type: 'employee' | 'contractor' | 'consultant';
  riskLevel: 'low' | 'medium' | 'high';
  lastReviewDate: string;
  nextReviewDate: string;
  complianceStatus: 'compliant' | 'review_needed' | 'non_compliant';
  notes?: string;
}

const statusColors: Record<string, string> = {
  compliant: 'bg-green-100 text-green-700',
  warning: 'bg-yellow-100 text-yellow-700',
  non_compliant: 'bg-red-100 text-red-700',
  review_needed: 'bg-orange-100 text-orange-700',
  pending: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
};

const riskColors: Record<string, string> = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-red-100 text-red-700',
};

export default function LaborLawComplianceTab() {
  const [workingHours, setWorkingHours] = useState<WorkingHoursData[]>([]);
  const [leaveCompliance, setLeaveCompliance] = useState<LeaveCompliance[]>([]);
  const [healthSafety, setHealthSafety] = useState<HealthSafetyChecklist[]>([]);
  const [contractors, setContractors] = useState<ContractorClassification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedSection, setExpandedSection] = useState<string | null>('working-hours');

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [whRes, lcRes, hsRes, ccRes] = await Promise.all([
        api.get('/compliance-audit/manager/labor-law/working-hours'),
        api.get('/compliance-audit/manager/labor-law/leave-compliance'),
        api.get('/compliance-audit/manager/labor-law/health-safety'),
        api.get('/compliance-audit/manager/labor-law/contractor-classification'),
      ]);
      setWorkingHours(whRes.data?.data || whRes.data || []);
      setLeaveCompliance(lcRes.data?.data || lcRes.data || []);
      setHealthSafety(hsRes.data?.data || hsRes.data || []);
      setContractors(ccRes.data?.data || ccRes.data || []);
    } catch {
      setError('Failed to load labor law compliance data');
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (id: string) => {
    setExpandedSection(expandedSection === id ? null : id);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        <span className="ml-2 text-gray-500">Loading labor law compliance data...</span>
      </div>
    );
  }

  const sections = [
    {
      id: 'working-hours',
      label: 'Working Hours Compliance',
      icon: Clock,
      count: workingHours.length,
    },
    {
      id: 'leave-compliance',
      label: 'Leave Compliance Tracker',
      icon: Calendar,
      count: leaveCompliance.length,
    },
    {
      id: 'health-safety',
      label: 'Health & Safety Checklists',
      icon: Shield,
      count: healthSafety.length,
    },
    {
      id: 'contractor',
      label: 'Contractor Classification',
      icon: Users,
      count: contractors.length,
    },
  ];

  return (
    <div className="space-y-3">
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
          <button onClick={() => setError('')} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {sections.map(({ id, label, icon: Icon, count }) => (
        <div key={id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <button
            onClick={() => toggleSection(id)}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 rounded-lg">
                <Icon className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-[#2c2c2c] text-sm">{label}</p>
                <p className="text-xs text-gray-500">{count} record{count !== 1 ? 's' : ''}</p>
              </div>
            </div>
            {expandedSection === id ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </button>

          {expandedSection === id && (
            <div className="border-t border-gray-200 p-4">
              {id === 'working-hours' && (
                workingHours.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-4">No working hours data available.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-2 px-2 text-xs font-semibold text-gray-500 uppercase">Employee</th>
                          <th className="text-left py-2 px-2 text-xs font-semibold text-gray-500 uppercase">Weekly Hours</th>
                          <th className="text-left py-2 px-2 text-xs font-semibold text-gray-500 uppercase">Max Allowed</th>
                          <th className="text-left py-2 px-2 text-xs font-semibold text-gray-500 uppercase">Overtime</th>
                          <th className="text-left py-2 px-2 text-xs font-semibold text-gray-500 uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {workingHours.map((w) => (
                          <tr key={w.employeeId} className="hover:bg-gray-50">
                            <td className="py-2 px-2 font-medium text-[#2c2c2c]">{w.employeeName}</td>
                            <td className="py-2 px-2 text-gray-600">{w.weeklyHours}h</td>
                            <td className="py-2 px-2 text-gray-600">{w.maxAllowed}h</td>
                            <td className="py-2 px-2 text-orange-600">{w.overtimeHours}h</td>
                            <td className="py-2 px-2">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[w.status]}`}>
                                {w.status.replace('_', ' ')}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              )}

              {id === 'leave-compliance' && (
                leaveCompliance.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-4">No leave compliance data available.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-2 px-2 text-xs font-semibold text-gray-500 uppercase">Employee</th>
                          <th className="text-left py-2 px-2 text-xs font-semibold text-gray-500 uppercase">Leaves Taken</th>
                          <th className="text-left py-2 px-2 text-xs font-semibold text-gray-500 uppercase">Required</th>
                          <th className="text-left py-2 px-2 text-xs font-semibold text-gray-500 uppercase">Carryover</th>
                          <th className="text-left py-2 px-2 text-xs font-semibold text-gray-500 uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {leaveCompliance.map((l) => (
                          <tr key={l.employeeId} className="hover:bg-gray-50">
                            <td className="py-2 px-2 font-medium text-[#2c2c2c]">{l.employeeName}</td>
                            <td className="py-2 px-2 text-gray-600">{l.mandatoryLeavesTaken}</td>
                            <td className="py-2 px-2 text-gray-600">{l.mandatoryLeavesRequired}</td>
                            <td className="py-2 px-2 text-blue-600">{l.carryoverDays}</td>
                            <td className="py-2 px-2">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[l.status]}`}>
                                {l.status.replace('_', ' ')}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              )}

              {id === 'health-safety' && (
                healthSafety.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-4">No health & safety checklists found.</p>
                ) : (
                  <div className="space-y-2">
                    {healthSafety.map((item) => (
                      <div key={item.id} className="flex items-center justify-between border border-gray-200 rounded-lg p-3">
                        <div>
                          <p className="font-medium text-[#2c2c2c] text-sm">{item.title}</p>
                          <p className="text-xs text-gray-500 capitalize">{item.category} — Due: {new Date(item.dueDate).toLocaleDateString()}</p>
                          {item.assignedTo && <p className="text-xs text-gray-400">Assigned: {item.assignedTo}</p>}
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[item.status]}`}>
                          {item.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )
              )}

              {id === 'contractor' && (
                contractors.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-4">No contractor classification records.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-2 px-2 text-xs font-semibold text-gray-500 uppercase">Name</th>
                          <th className="text-left py-2 px-2 text-xs font-semibold text-gray-500 uppercase">Type</th>
                          <th className="text-left py-2 px-2 text-xs font-semibold text-gray-500 uppercase">Risk Level</th>
                          <th className="text-left py-2 px-2 text-xs font-semibold text-gray-500 uppercase">Last Review</th>
                          <th className="text-left py-2 px-2 text-xs font-semibold text-gray-500 uppercase">Next Review</th>
                          <th className="text-left py-2 px-2 text-xs font-semibold text-gray-500 uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {contractors.map((c) => (
                          <tr key={c.id} className="hover:bg-gray-50">
                            <td className="py-2 px-2 font-medium text-[#2c2c2c]">{c.name}</td>
                            <td className="py-2 px-2">
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium capitalize">{c.type}</span>
                            </td>
                            <td className="py-2 px-2">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${riskColors[c.riskLevel]}`}>
                                {c.riskLevel}
                              </span>
                            </td>
                            <td className="py-2 px-2 text-gray-500 text-xs">{new Date(c.lastReviewDate).toLocaleDateString()}</td>
                            <td className="py-2 px-2 text-gray-500 text-xs">{new Date(c.nextReviewDate).toLocaleDateString()}</td>
                            <td className="py-2 px-2">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[c.complianceStatus]}`}>
                                {c.complianceStatus.replace('_', ' ')}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
