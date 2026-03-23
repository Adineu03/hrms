'use client';
import { useState, useEffect } from 'react';
import { Loader2, X, AlertCircle, FileCheck, Download, Award, FolderOpen } from 'lucide-react';
import { api } from '@/lib/api';

interface TeamReport {
  generatedAt: string;
  period: string;
  totalMembers: number;
  compliantCount: number;
  nonCompliantCount: number;
  overdueTrainings: number;
  pendingAcknowledgments: number;
  openViolations: number;
}

interface Certification {
  id: string;
  employeeId: string;
  employeeName: string;
  certificationName: string;
  issuedDate: string;
  expiryDate: string;
  status: 'active' | 'expiring_soon' | 'expired';
  issuingBody: string;
}

interface EvidenceItem {
  id: string;
  category: string;
  title: string;
  description: string;
  collectedDate: string;
  collectedBy: string;
  status: string;
  fileCount: number;
}

const certStatusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  expiring_soon: 'bg-yellow-100 text-yellow-700',
  expired: 'bg-red-100 text-red-700',
};

export default function AuditSupportTab() {
  const [teamReport, setTeamReport] = useState<TeamReport | null>(null);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeSection, setActiveSection] = useState<'report' | 'certifications' | 'evidence'>('report');

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [reportRes, certRes, evidenceRes] = await Promise.all([
        api.get('/compliance-audit/manager/audit-support/team-report').catch(() => ({ data: {} })),
        api.get('/compliance-audit/manager/audit-support/certifications').catch(() => ({ data: [] })),
        api.get('/compliance-audit/manager/audit-support/evidence').catch(() => ({ data: [] })),
      ]);
      const reportRaw = reportRes.data?.data || reportRes.data;
      if (reportRaw && typeof reportRaw === 'object') {
        setTeamReport({
          period: reportRaw.period || 'Current Period',
          generatedAt: reportRaw.generatedAt || reportRaw.reportGeneratedAt || new Date().toISOString(),
          totalMembers: reportRaw.totalMembers ?? reportRaw.trainings?.total ?? 0,
          compliantCount: reportRaw.compliantCount ?? Math.round((reportRaw.overallComplianceScore ?? 0) / 100 * (reportRaw.trainings?.total ?? 0)),
          nonCompliantCount: reportRaw.nonCompliantCount ?? (reportRaw.trainings?.total ?? 0) - Math.round((reportRaw.overallComplianceScore ?? 0) / 100 * (reportRaw.trainings?.total ?? 0)),
          overdueTrainings: reportRaw.overdueTrainings ?? reportRaw.trainings?.byStatus?.overdue ?? 0,
          pendingAcknowledgments: reportRaw.pendingAcknowledgments ?? reportRaw.acknowledgments?.total ?? 0,
          openViolations: reportRaw.openViolations ?? 0,
        });
      } else {
        setTeamReport(null);
      }

      const certRaw = certRes.data?.data || certRes.data;
      setCertifications(Array.isArray(certRaw) ? certRaw : []);

      const evidenceRaw = evidenceRes.data?.data || evidenceRes.data;
      setEvidence(Array.isArray(evidenceRaw) ? evidenceRaw : []);
    } catch {
      setError('Failed to load audit support data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        <span className="ml-2 text-gray-500">Loading audit support data...</span>
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
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => setActiveSection('report')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeSection === 'report' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            Team Report
          </button>
          <button
            onClick={() => setActiveSection('certifications')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeSection === 'certifications' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            Certifications
          </button>
          <button
            onClick={() => setActiveSection('evidence')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeSection === 'evidence' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            Evidence Collection
          </button>
        </div>

        {activeSection === 'report' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-[#2c2c2c]">Team Compliance Report</h3>
              <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                <Download className="w-4 h-4" />
                Download Report
              </button>
            </div>
            {!teamReport ? (
              <div className="text-center py-10">
                <FileCheck className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">No report data available.</p>
              </div>
            ) : (
              <div>
                <p className="text-xs text-gray-500 mb-4">
                  Period: <span className="font-medium text-[#2c2c2c]">{teamReport.period}</span> &nbsp;|&nbsp;
                  Generated: <span className="font-medium text-[#2c2c2c]">{new Date(teamReport.generatedAt).toLocaleDateString()}</span>
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="border border-gray-200 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-[#2c2c2c]">{teamReport.totalMembers}</p>
                    <p className="text-xs text-gray-500 mt-1">Total Members</p>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-green-600">{teamReport.compliantCount}</p>
                    <p className="text-xs text-gray-500 mt-1">Compliant</p>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-red-600">{teamReport.nonCompliantCount}</p>
                    <p className="text-xs text-gray-500 mt-1">Non-Compliant</p>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-orange-600">{teamReport.overdueTrainings}</p>
                    <p className="text-xs text-gray-500 mt-1">Overdue Trainings</p>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-yellow-600">{teamReport.pendingAcknowledgments}</p>
                    <p className="text-xs text-gray-500 mt-1">Pending Acks</p>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-purple-600">{teamReport.openViolations}</p>
                    <p className="text-xs text-gray-500 mt-1">Open Violations</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeSection === 'certifications' && (
          <div>
            <h3 className="text-base font-semibold text-[#2c2c2c] mb-4">Employee Certifications</h3>
            {certifications.length === 0 ? (
              <div className="text-center py-10">
                <Award className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">No certifications found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Employee</th>
                      <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Certification</th>
                      <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Issuing Body</th>
                      <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Issued</th>
                      <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Expiry</th>
                      <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {certifications.map((cert) => (
                      <tr key={cert.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-2 font-medium text-[#2c2c2c]">{cert.employeeName}</td>
                        <td className="py-3 px-2 text-gray-600">{cert.certificationName}</td>
                        <td className="py-3 px-2 text-gray-500 text-xs">{cert.issuingBody}</td>
                        <td className="py-3 px-2 text-gray-600 text-xs">{new Date(cert.issuedDate).toLocaleDateString()}</td>
                        <td className="py-3 px-2 text-gray-600 text-xs">{new Date(cert.expiryDate).toLocaleDateString()}</td>
                        <td className="py-3 px-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${certStatusColors[cert.status]}`}>
                            {cert.status.replace('_', ' ')}
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

        {activeSection === 'evidence' && (
          <div>
            <h3 className="text-base font-semibold text-[#2c2c2c] mb-4">Evidence Collection Dashboard</h3>
            {evidence.length === 0 ? (
              <div className="text-center py-10">
                <FolderOpen className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">No evidence items found.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {evidence.map((item) => (
                  <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-[#2c2c2c] text-sm">{item.title}</p>
                        <p className="text-xs text-gray-500 capitalize">{item.category}</p>
                      </div>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                        {item.fileCount} file{item.fileCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span>Collected by {item.collectedBy}</span>
                      <span>{new Date(item.collectedDate).toLocaleDateString()}</span>
                    </div>
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
