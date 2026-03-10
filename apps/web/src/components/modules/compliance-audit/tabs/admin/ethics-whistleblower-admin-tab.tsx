'use client';
import { useState, useEffect } from 'react';
import { Loader2, X, AlertCircle, Eye, ChevronDown, ChevronUp, UserCheck } from 'lucide-react';
import { api } from '@/lib/api';

interface EthicsComplaint {
  id: string;
  referenceCode: string;
  category: string;
  status: 'received' | 'in_progress' | 'findings' | 'resolution' | 'closed';
  isAnonymous: boolean;
  reportedDate: string;
  investigatorId?: string;
  investigatorName?: string;
  description: string;
  investigationNotes?: string;
  outcome?: string;
  incidentDate?: string;
  location?: string;
}

interface EthicsAnalytics {
  total: number;
  byStatus: Record<string, number>;
  byCategory: Record<string, number>;
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
  in_progress: 'In Progress',
  findings: 'Findings',
  resolution: 'Resolution',
  closed: 'Closed',
};

const categoryColors: Record<string, string> = {
  harassment: 'bg-red-100 text-red-700',
  fraud: 'bg-orange-100 text-orange-700',
  discrimination: 'bg-yellow-100 text-yellow-700',
  safety: 'bg-blue-100 text-blue-700',
  data_breach: 'bg-purple-100 text-purple-700',
  conflict_of_interest: 'bg-indigo-100 text-indigo-700',
  other: 'bg-gray-100 text-gray-700',
};

export default function EthicsWhistleblowerAdminTab() {
  const [complaints, setComplaints] = useState<EthicsComplaint[]>([]);
  const [analytics, setAnalytics] = useState<EthicsAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'complaints' | 'analytics'>('complaints');

  const [assignForm, setAssignForm] = useState({ investigatorId: '', investigatorName: '' });
  const [statusForm, setStatusForm] = useState({ status: '' });
  const [closeForm, setCloseForm] = useState({ outcome: '' });
  const [actionComplaintId, setActionComplaintId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'assign' | 'status' | 'close' | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchComplaints();
    fetchAnalytics();
  }, []);

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const res = await api.get('/compliance-audit/admin/ethics');
      setComplaints(res.data?.data || res.data || []);
    } catch {
      setError('Failed to load ethics complaints');
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await api.get('/compliance-audit/admin/ethics/analytics');
      setAnalytics(res.data?.data || res.data);
    } catch {
      // analytics is optional
    }
  };

  const handleAssign = async (id: string) => {
    try {
      setSubmitting(true);
      await api.patch(`/compliance-audit/admin/ethics/${id}/assign`, assignForm);
      setActionComplaintId(null);
      setActionType(null);
      setAssignForm({ investigatorId: '', investigatorName: '' });
      fetchComplaints();
    } catch {
      setError('Failed to assign investigator');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string) => {
    if (!statusForm.status) return;
    try {
      setSubmitting(true);
      await api.patch(`/compliance-audit/admin/ethics/${id}/update-status`, { status: statusForm.status });
      setActionComplaintId(null);
      setActionType(null);
      setStatusForm({ status: '' });
      fetchComplaints();
    } catch {
      setError('Failed to update status');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = async (id: string) => {
    if (!closeForm.outcome) return;
    try {
      setSubmitting(true);
      await api.patch(`/compliance-audit/admin/ethics/${id}/close`, { outcome: closeForm.outcome });
      setActionComplaintId(null);
      setActionType(null);
      setCloseForm({ outcome: '' });
      fetchComplaints();
    } catch {
      setError('Failed to close case');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        <span className="ml-2 text-gray-500">Loading ethics complaints...</span>
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
            onClick={() => setActiveSection('complaints')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeSection === 'complaints' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            Ethics Complaints
          </button>
          <button
            onClick={() => setActiveSection('analytics')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeSection === 'analytics' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            Analytics
          </button>
        </div>

        {activeSection === 'analytics' && analytics && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border border-gray-200 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-[#2c2c2c]">{analytics.total}</p>
                <p className="text-sm text-gray-500 mt-1">Total Complaints</p>
              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-gray-600 mb-2">By Status</p>
                <div className="space-y-1">
                  {Object.entries(analytics.byStatus || {}).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[status] || 'bg-gray-100 text-gray-700'}`}>
                        {statusLabels[status] || status}
                      </span>
                      <span className="text-sm font-medium text-[#2c2c2c]">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-gray-600 mb-2">By Category</p>
                <div className="space-y-1">
                  {Object.entries(analytics.byCategory || {}).map(([cat, count]) => (
                    <div key={cat} className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${categoryColors[cat] || 'bg-gray-100 text-gray-700'}`}>
                        {cat.replace('_', ' ')}
                      </span>
                      <span className="text-sm font-medium text-[#2c2c2c]">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'complaints' && (
          <>
            {complaints.length === 0 ? (
              <div className="text-center py-12">
                <Eye className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No ethics complaints found.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {complaints.map((complaint) => (
                  <div key={complaint.id} className="border border-gray-200 rounded-lg overflow-hidden">
                    <div
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => setExpandedId(expandedId === complaint.id ? null : complaint.id)}
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                          {complaint.referenceCode}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${categoryColors[complaint.category] || 'bg-gray-100 text-gray-700'}`}>
                          {complaint.category.replace('_', ' ')}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[complaint.status]}`}>
                          {statusLabels[complaint.status]}
                        </span>
                        {complaint.isAnonymous && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">Anonymous</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-500">{new Date(complaint.reportedDate).toLocaleDateString()}</span>
                        {expandedId === complaint.id ? (
                          <ChevronUp className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                    </div>

                    {expandedId === complaint.id && (
                      <div className="border-t border-gray-200 p-4 bg-gray-50">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <p className="text-xs font-semibold text-gray-500 mb-1">Description</p>
                            <p className="text-sm text-gray-700">{complaint.description}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-gray-500 mb-1">Investigation Notes</p>
                            <p className="text-sm text-gray-700">{complaint.investigationNotes || 'No notes yet.'}</p>
                          </div>
                          {complaint.outcome && (
                            <div className="md:col-span-2">
                              <p className="text-xs font-semibold text-gray-500 mb-1">Outcome</p>
                              <p className="text-sm text-gray-700">{complaint.outcome}</p>
                            </div>
                          )}
                          {complaint.investigatorName && (
                            <div>
                              <p className="text-xs font-semibold text-gray-500 mb-1">Assigned Investigator</p>
                              <p className="text-sm text-gray-700 flex items-center gap-1">
                                <UserCheck className="w-4 h-4 text-indigo-600" />
                                {complaint.investigatorName}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-200">
                          {/* Assign Investigator */}
                          {actionComplaintId === complaint.id && actionType === 'assign' ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                placeholder="Investigator name"
                                value={assignForm.investigatorName}
                                onChange={(e) => setAssignForm({ ...assignForm, investigatorName: e.target.value })}
                                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              />
                              <button
                                onClick={() => handleAssign(complaint.id)}
                                disabled={submitting}
                                className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 disabled:opacity-50"
                              >
                                {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Assign'}
                              </button>
                              <button onClick={() => setActionComplaintId(null)} className="px-2 py-1.5 text-gray-500 text-xs hover:text-gray-700">Cancel</button>
                            </div>
                          ) : (
                            <button
                              onClick={() => { setActionComplaintId(complaint.id); setActionType('assign'); }}
                              className="flex items-center gap-1 px-3 py-1.5 border border-indigo-300 text-indigo-700 rounded-lg text-xs font-medium hover:bg-indigo-50 transition-colors"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              Assign Investigator
                            </button>
                          )}

                          {/* Update Status */}
                          {actionComplaintId === complaint.id && actionType === 'status' ? (
                            <div className="flex items-center gap-2">
                              <select
                                value={statusForm.status}
                                onChange={(e) => setStatusForm({ status: e.target.value })}
                                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              >
                                <option value="">Select status</option>
                                {(['received', 'in_progress', 'findings', 'resolution', 'closed']).map((s) => (
                                  <option key={s} value={s}>{statusLabels[s]}</option>
                                ))}
                              </select>
                              <button
                                onClick={() => handleUpdateStatus(complaint.id)}
                                disabled={submitting}
                                className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 disabled:opacity-50"
                              >
                                Update
                              </button>
                              <button onClick={() => setActionComplaintId(null)} className="px-2 py-1.5 text-gray-500 text-xs hover:text-gray-700">Cancel</button>
                            </div>
                          ) : (
                            <button
                              onClick={() => { setActionComplaintId(complaint.id); setActionType('status'); }}
                              className="px-3 py-1.5 border border-yellow-300 text-yellow-700 rounded-lg text-xs font-medium hover:bg-yellow-50 transition-colors"
                            >
                              Update Status
                            </button>
                          )}

                          {/* Close Case */}
                          {complaint.status !== 'closed' && (
                            actionComplaintId === complaint.id && actionType === 'close' ? (
                              <div className="flex items-center gap-2 w-full mt-2">
                                <textarea
                                  placeholder="Outcome / resolution notes..."
                                  value={closeForm.outcome}
                                  onChange={(e) => setCloseForm({ outcome: e.target.value })}
                                  rows={2}
                                  className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                />
                                <div className="flex flex-col gap-1">
                                  <button
                                    onClick={() => handleClose(complaint.id)}
                                    disabled={submitting}
                                    className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 disabled:opacity-50"
                                  >
                                    Close Case
                                  </button>
                                  <button onClick={() => setActionComplaintId(null)} className="px-2 py-1 text-gray-500 text-xs hover:text-gray-700">Cancel</button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => { setActionComplaintId(complaint.id); setActionType('close'); }}
                                className="px-3 py-1.5 border border-red-300 text-red-700 rounded-lg text-xs font-medium hover:bg-red-50 transition-colors"
                              >
                                Close Case
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    )}
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
