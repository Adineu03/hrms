'use client';
import { useState, useEffect } from 'react';
import { Loader2, X, AlertCircle, MessageSquare, Search, Phone, CheckCircle, Shield } from 'lucide-react';
import { api } from '@/lib/api';

interface HotlineInfo {
  phoneNumber: string;
  emailAddress: string;
  availability: string;
  anonymityGuaranteed: boolean;
  responseTimeDays: number;
}

interface EthicsStatus {
  referenceCode: string;
  category: string;
  status: string;
  submittedDate: string;
  lastUpdated: string;
  timeline: Array<{
    date: string;
    status: string;
    note?: string;
  }>;
}

const statusColors: Record<string, string> = {
  received: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  findings: 'bg-purple-100 text-purple-700',
  resolution: 'bg-orange-100 text-orange-700',
  closed: 'bg-green-100 text-green-700',
};

const statusLabels: Record<string, string> = {
  received: 'Received',
  in_progress: 'Under Investigation',
  findings: 'Findings Stage',
  resolution: 'Resolution',
  closed: 'Closed',
};

const categoryOptions = [
  { value: 'harassment', label: 'Harassment' },
  { value: 'fraud', label: 'Fraud / Financial Misconduct' },
  { value: 'discrimination', label: 'Discrimination' },
  { value: 'safety', label: 'Safety Violation' },
  { value: 'data_breach', label: 'Data Breach / Privacy Violation' },
  { value: 'conflict_of_interest', label: 'Conflict of Interest' },
  { value: 'other', label: 'Other' },
];

export default function WhistleblowerEthicsPortalTab() {
  const [activeSection, setActiveSection] = useState<'submit' | 'track' | 'hotline'>('submit');
  const [hotlineInfo, setHotlineInfo] = useState<HotlineInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successCode, setSuccessCode] = useState('');

  const [form, setForm] = useState({
    category: 'other',
    description: '',
    incidentDate: '',
    location: '',
    isAnonymous: true,
  });

  const [trackCode, setTrackCode] = useState('');
  const [trackResult, setTrackResult] = useState<EthicsStatus | null>(null);
  const [tracking, setTracking] = useState(false);

  useEffect(() => {
    fetchHotline();
  }, []);

  const fetchHotline = async () => {
    try {
      const res = await api.get('/compliance-audit/employee/ethics-portal/hotline');
      setHotlineInfo(res.data?.data || res.data);
    } catch {
      // hotline info is optional
    }
  };

  const handleSubmit = async () => {
    if (!form.category || !form.description) return;
    try {
      setSubmitting(true);
      setError('');
      const res = await api.post('/compliance-audit/employee/ethics-portal/submit', form);
      const code = res.data?.data?.referenceCode || res.data?.referenceCode || `ETH-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      setSuccessCode(code);
      setForm({ category: 'other', description: '', incidentDate: '', location: '', isAnonymous: true });
    } catch {
      setError('Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTrack = async () => {
    if (!trackCode) return;
    try {
      setTracking(true);
      setError('');
      const res = await api.get(`/compliance-audit/employee/ethics-portal/status/${trackCode}`);
      setTrackResult(res.data?.data || res.data);
    } catch {
      setError('Report not found. Please check the reference code.');
      setTrackResult(null);
    } finally {
      setTracking(false);
    }
  };

  const ToggleSwitch = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
    <button
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${checked ? 'bg-indigo-600' : 'bg-gray-300'}`}
    >
      <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : 'translate-x-1'}`} />
    </button>
  );

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
        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={() => setActiveSection('submit')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeSection === 'submit' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            Submit Report
          </button>
          <button
            onClick={() => setActiveSection('track')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeSection === 'track' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            Track Status
          </button>
          <button
            onClick={() => setActiveSection('hotline')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeSection === 'hotline' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            Hotline Info
          </button>
        </div>

        {activeSection === 'submit' && (
          <>
            {successCode ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-lg font-bold text-[#2c2c2c] mb-2">Report Submitted Successfully</h3>
                <p className="text-sm text-gray-600 mb-4">Your ethics report has been submitted anonymously.</p>
                <div className="inline-block bg-indigo-50 border-2 border-indigo-200 rounded-xl px-8 py-4 mb-4">
                  <p className="text-xs text-gray-500 mb-1">Your Reference Code</p>
                  <p className="text-2xl font-bold text-indigo-600 font-mono tracking-wider">{successCode}</p>
                </div>
                <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-yellow-800 text-sm mx-auto max-w-md">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Save this code to track your report status. We cannot retrieve it for you.</span>
                </div>
                <button
                  onClick={() => setSuccessCode('')}
                  className="mt-4 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                >
                  Submit Another Report
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-6">
                  <Shield className="w-5 h-5 text-indigo-600 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-indigo-800">Your safety is our priority</p>
                    <p className="text-xs text-indigo-700">Reports are treated with strict confidentiality. Anonymous submission is available and default.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                    <select
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-[#2c2c2c] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {categoryOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                    <textarea
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      rows={4}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-[#2c2c2c] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Describe the incident or concern in detail..."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Incident Date (Optional)</label>
                      <input
                        type="date"
                        value={form.incidentDate}
                        onChange={(e) => setForm({ ...form, incidentDate: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-[#2c2c2c] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Location (Optional)</label>
                      <input
                        type="text"
                        value={form.location}
                        onChange={(e) => setForm({ ...form, location: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-[#2c2c2c] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="e.g., Office floor 3, Remote"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between border border-gray-200 rounded-lg p-3">
                    <div>
                      <p className="text-sm font-medium text-[#2c2c2c]">Submit Anonymously</p>
                      <p className="text-xs text-gray-500">Your identity will not be revealed to investigators</p>
                    </div>
                    <ToggleSwitch
                      checked={form.isAnonymous}
                      onChange={(v) => setForm({ ...form, isAnonymous: v })}
                    />
                  </div>

                  <button
                    onClick={handleSubmit}
                    disabled={submitting || !form.description}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <MessageSquare className="w-4 h-4" />
                    )}
                    Submit Ethics Report
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {activeSection === 'track' && (
          <div>
            <h3 className="text-base font-semibold text-[#2c2c2c] mb-2">Track Your Report</h3>
            <p className="text-sm text-gray-500 mb-4">Enter the reference code you received when you submitted your report.</p>
            <div className="flex items-center gap-3 mb-4">
              <input
                type="text"
                value={trackCode}
                onChange={(e) => setTrackCode(e.target.value.toUpperCase())}
                placeholder="e.g., ETH-ABC123"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={handleTrack}
                disabled={tracking || !trackCode}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {tracking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Track
              </button>
            </div>

            {trackResult && (
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-sm font-bold text-indigo-600">{trackResult.referenceCode}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[trackResult.status] || 'bg-gray-100 text-gray-700'}`}>
                    {statusLabels[trackResult.status] || trackResult.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  Category: <span className="font-medium capitalize">{trackResult.category.replace('_', ' ')}</span>
                </p>
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Timeline</p>
                  {trackResult.timeline.map((event, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${idx === trackResult.timeline.length - 1 ? 'bg-indigo-600' : 'bg-gray-300'}`} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${statusColors[event.status] || 'bg-gray-100 text-gray-700'}`}>
                            {statusLabels[event.status] || event.status}
                          </span>
                          <span className="text-xs text-gray-400">{new Date(event.date).toLocaleDateString()}</span>
                        </div>
                        {event.note && <p className="text-xs text-gray-600 mt-0.5">{event.note}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeSection === 'hotline' && (
          <div>
            <h3 className="text-base font-semibold text-[#2c2c2c] mb-4">Ethics Hotline Information</h3>
            {!hotlineInfo ? (
              <div className="text-center py-10">
                <Phone className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">Hotline information not available. Please contact HR directly.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                      <Shield className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-[#2c2c2c]">Confidential Ethics Hotline</p>
                      {hotlineInfo.anonymityGuaranteed && (
                        <p className="text-xs text-indigo-600">Anonymity Guaranteed</p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white rounded-lg p-3 border border-indigo-100">
                      <p className="text-xs text-gray-500 mb-1">Phone Number</p>
                      <p className="font-medium text-[#2c2c2c]">{hotlineInfo.phoneNumber}</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-indigo-100">
                      <p className="text-xs text-gray-500 mb-1">Email Address</p>
                      <p className="font-medium text-[#2c2c2c]">{hotlineInfo.emailAddress}</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-indigo-100">
                      <p className="text-xs text-gray-500 mb-1">Availability</p>
                      <p className="font-medium text-[#2c2c2c]">{hotlineInfo.availability}</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-indigo-100">
                      <p className="text-xs text-gray-500 mb-1">Response Time</p>
                      <p className="font-medium text-[#2c2c2c]">Within {hotlineInfo.responseTimeDays} business days</p>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-600">
                  <p className="font-medium text-[#2c2c2c] mb-1">Your Rights</p>
                  <ul className="space-y-1 list-disc list-inside text-xs">
                    <li>You are protected against retaliation for good-faith reporting</li>
                    <li>All reports are investigated by a neutral party</li>
                    <li>Anonymous reports are accepted and given equal treatment</li>
                    <li>Your identity is never disclosed without your consent</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
