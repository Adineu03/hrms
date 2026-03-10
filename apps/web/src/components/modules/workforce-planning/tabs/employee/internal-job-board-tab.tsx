'use client';
import { useState, useEffect } from 'react';
import { Loader2, Briefcase, CheckCircle, AlertCircle, X } from 'lucide-react';
import { api } from '@/lib/api';

interface JobBoardItem {
  id: string;
  planName: string;
  planYear: number;
  departmentId?: string;
  departmentName?: string;
  targetHeadcount: number;
  currentHeadcount: number;
  openSlots?: number;
}

export default function InternalJobBoardTab() {
  const [jobs, setJobs] = useState<JobBoardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [coverNotes, setCoverNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const res = await api.get('/workforce-planning/employee/job-board');
      setJobs(res.data?.data || res.data || []);
    } catch {
      setError('Failed to load internal job board');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (id: string) => {
    try {
      setApplyingId(id);
      await api.post(`/workforce-planning/employee/job-board/${id}/apply`, { coverNote: coverNotes[id] || '' });
      setSuccessMsg('Application submitted successfully!');
      setCoverNotes((prev) => { const n = { ...prev }; delete n[id]; return n; });
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch {
      setError('Failed to submit application');
    } finally {
      setApplyingId(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        <span className="ml-2 text-gray-500">Loading job board...</span>
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

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-[#2c2c2c] mb-4 flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-indigo-600" />
          Internal Job Board
        </h2>
        <p className="text-sm text-gray-500 mb-4">Explore open positions within the organization and apply for internal transfers.</p>

        {jobs.length === 0 ? (
          <div className="text-center py-12">
            <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No open positions available at this time.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Plan Name</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Year</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Department</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Target HC</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Current HC</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Open Slots</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Apply</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {jobs.map((job) => {
                  const openSlots = job.openSlots ?? Math.max(0, (job.targetHeadcount || 0) - (job.currentHeadcount || 0));
                  return (
                    <tr key={job.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-2 font-medium text-[#2c2c2c]">{job.planName}</td>
                      <td className="py-3 px-2 text-gray-600">{job.planYear}</td>
                      <td className="py-3 px-2 text-gray-600">{job.departmentName || job.departmentId || '—'}</td>
                      <td className="py-3 px-2 text-gray-700">{job.targetHeadcount}</td>
                      <td className="py-3 px-2 text-gray-700">{job.currentHeadcount}</td>
                      <td className="py-3 px-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${openSlots > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {openSlots}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        {openSlots > 0 ? (
                          <div className="flex flex-col gap-1">
                            <input
                              type="text"
                              placeholder="Cover note (optional)"
                              value={coverNotes[job.id] || ''}
                              onChange={(e) => setCoverNotes((prev) => ({ ...prev, [job.id]: e.target.value }))}
                              className="border border-gray-300 rounded px-2 py-1 text-xs text-[#2c2c2c] focus:outline-none focus:ring-1 focus:ring-indigo-500 w-40"
                            />
                            <button
                              onClick={() => handleApply(job.id)}
                              disabled={applyingId === job.id}
                              className="flex items-center gap-1 px-3 py-1 bg-indigo-600 text-white rounded text-xs font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                            >
                              {applyingId === job.id && <Loader2 className="w-3 h-3 animate-spin" />}
                              Apply
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">No openings</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
