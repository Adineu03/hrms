'use client';
import { useState, useEffect } from 'react';
import { Loader2, X, AlertCircle, CheckSquare, Check, Clock, ChevronLeft, FileText } from 'lucide-react';
import { api } from '@/lib/api';

interface Policy {
  id: string;
  title: string;
  category: string;
  version: string;
  effectiveDate: string;
  content?: string;
  acknowledgmentStatus: 'acknowledged' | 'pending';
  acknowledgedAt?: string;
}

const categoryColors: Record<string, string> = {
  hr: 'bg-blue-100 text-blue-700',
  it: 'bg-purple-100 text-purple-700',
  safety: 'bg-orange-100 text-orange-700',
  ethics: 'bg-teal-100 text-teal-700',
  'data-privacy': 'bg-indigo-100 text-indigo-700',
  other: 'bg-gray-100 text-gray-700',
};

export default function PolicyAcknowledgmentTab() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [pendingPolicies, setPendingPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [acknowledging, setAcknowledging] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    fetchPolicies();
  }, []);

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      const [allRes, pendingRes] = await Promise.all([
        api.get('/compliance-audit/employee/policy-acknowledgment'),
        api.get('/compliance-audit/employee/policy-acknowledgment/pending'),
      ]);
      setPolicies(allRes.data?.data || allRes.data || []);
      setPendingPolicies(pendingRes.data?.data || pendingRes.data || []);
    } catch {
      setError('Failed to load policies');
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async (policyId: string) => {
    try {
      setAcknowledging(true);
      await api.post(`/compliance-audit/employee/policy-acknowledgment/${policyId}/acknowledge`);
      setSuccessMsg('Policy acknowledged successfully');
      setSelectedPolicy(null);
      fetchPolicies();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch {
      setError('Failed to acknowledge policy');
    } finally {
      setAcknowledging(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        <span className="ml-2 text-gray-500">Loading policies...</span>
      </div>
    );
  }

  if (selectedPolicy) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <button
          onClick={() => setSelectedPolicy(null)}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to policies
        </button>

        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-[#2c2c2c]">{selectedPolicy.title}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${categoryColors[selectedPolicy.category] || 'bg-gray-100 text-gray-700'}`}>
                {selectedPolicy.category}
              </span>
              <span className="text-xs text-gray-500">Version {selectedPolicy.version}</span>
              <span className="text-xs text-gray-500">Effective: {new Date(selectedPolicy.effectiveDate).toLocaleDateString()}</span>
            </div>
          </div>
          {selectedPolicy.acknowledgmentStatus === 'acknowledged' && (
            <span className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
              <Check className="w-3 h-3" />
              Acknowledged
            </span>
          )}
        </div>

        <div className="border border-gray-200 rounded-lg p-4 mb-4 bg-gray-50 min-h-48">
          {selectedPolicy.content ? (
            <div className="text-sm text-gray-700 whitespace-pre-wrap">{selectedPolicy.content}</div>
          ) : (
            <div className="text-sm text-gray-500 italic">Policy content not available. Please review the physical document or contact HR.</div>
          )}
        </div>

        {selectedPolicy.acknowledgmentStatus === 'pending' ? (
          <div className="flex items-center justify-between border border-yellow-200 bg-yellow-50 rounded-lg p-4">
            <div>
              <p className="text-sm font-medium text-yellow-800">Action Required</p>
              <p className="text-xs text-yellow-700">By clicking Acknowledge, you confirm you have read and understood this policy.</p>
            </div>
            <button
              onClick={() => handleAcknowledge(selectedPolicy.id)}
              disabled={acknowledging}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors ml-4 whitespace-nowrap"
            >
              {acknowledging ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckSquare className="w-4 h-4" />}
              I Acknowledge
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 border border-green-200 bg-green-50 rounded-lg p-3 text-green-700 text-sm">
            <Check className="w-4 h-4" />
            You acknowledged this policy on {selectedPolicy.acknowledgedAt ? new Date(selectedPolicy.acknowledgedAt).toLocaleString() : 'a previous date'}.
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {successMsg && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg p-3 text-green-700 text-sm">
          <Check className="w-4 h-4" />
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

      {pendingPolicies.length > 0 && (
        <div className="flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <Clock className="w-5 h-5 text-yellow-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-yellow-800">Action Required</p>
            <p className="text-xs text-yellow-700">
              You have {pendingPolicies.length} policy acknowledgment{pendingPolicies.length !== 1 ? 's' : ''} pending. Please review and acknowledge them.
            </p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-[#2c2c2c] mb-4">Policies</h2>
        {policies.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No policies assigned to you.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {policies.map((policy) => (
              <div
                key={policy.id}
                onClick={() => setSelectedPolicy(policy)}
                className="flex items-center justify-between border border-gray-200 rounded-lg p-4 cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg mt-0.5 ${policy.acknowledgmentStatus === 'acknowledged' ? 'bg-green-50' : 'bg-yellow-50'}`}>
                    {policy.acknowledgmentStatus === 'acknowledged' ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Clock className="w-4 h-4 text-yellow-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-[#2c2c2c] text-sm">{policy.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${categoryColors[policy.category] || 'bg-gray-100 text-gray-700'}`}>
                        {policy.category}
                      </span>
                      <span className="text-xs text-gray-500">v{policy.version}</span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-500">Effective {new Date(policy.effectiveDate).toLocaleDateString()}</span>
                    </div>
                    {policy.acknowledgedAt && (
                      <p className="text-xs text-green-600 mt-0.5">
                        Acknowledged on {new Date(policy.acknowledgedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${policy.acknowledgmentStatus === 'acknowledged' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {policy.acknowledgmentStatus === 'acknowledged' ? 'Acknowledged' : 'Pending'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
