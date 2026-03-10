'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { ShieldCheck, AlertCircle, FileText } from 'lucide-react';

interface ComplianceSummary {
  policyAcknowledgmentRate: number;
  auditFindingsOpen: number;
  statutoryFilingStatus: string;
  trainingCompletionRate: number;
  overdueItems: number;
}

export default function ComplianceAnalytics() {
  const [summary, setSummary] = useState<ComplianceSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/people-analytics/admin/compliance-analytics/summary')
      .then((r) => setSummary(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-400 text-sm py-8 text-center">Loading compliance analytics...</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {summary && (
          <>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-2"><ShieldCheck className="h-5 w-5 text-green-500" /><span className="text-sm text-gray-500">Policy Acknowledgment</span></div>
              <div className="text-2xl font-bold text-[#2c2c2c]">{summary.policyAcknowledgmentRate}%</div>
              <div className="mt-2 w-full bg-gray-100 rounded-full h-2"><div className="bg-green-500 h-2 rounded-full" style={{ width: `${summary.policyAcknowledgmentRate}%` }} /></div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-2"><AlertCircle className="h-5 w-5 text-amber-500" /><span className="text-sm text-gray-500">Open Audit Findings</span></div>
              <div className="text-2xl font-bold text-[#2c2c2c]">{summary.auditFindingsOpen}</div>
              <div className="text-xs text-gray-400 mt-1">{summary.overdueItems} overdue</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-2"><FileText className="h-5 w-5 text-indigo-500" /><span className="text-sm text-gray-500">Training Completion</span></div>
              <div className="text-2xl font-bold text-[#2c2c2c]">{summary.trainingCompletionRate}%</div>
              <div className="mt-2 w-full bg-gray-100 rounded-full h-2"><div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${summary.trainingCompletionRate}%` }} /></div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
