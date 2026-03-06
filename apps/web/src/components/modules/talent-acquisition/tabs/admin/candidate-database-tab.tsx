'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  Users,
  Plus,
  Pencil,
  X,
  Search,
  Eye,
  AlertTriangle,
  Inbox,
  Tag,
} from 'lucide-react';

const inputClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary';
const selectClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary appearance-none';

interface Candidate {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  currentTitle: string;
  currentCompany: string;
  experienceYears: number;
  skills: string[];
  source: string;
  currentLocation: string;
  tags: string[];
  status: string;
  isDuplicate: boolean;
  createdAt: string;
}

interface ApplicationHistory {
  id: string;
  jobTitle: string;
  appliedAt: string;
  stage: string;
  status: string;
}

const SOURCE_OPTIONS = [
  { value: '', label: 'All Sources' },
  { value: 'job_portal', label: 'Job Portal' },
  { value: 'referral', label: 'Referral' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'career_page', label: 'Career Page' },
  { value: 'agency', label: 'Agency' },
  { value: 'campus', label: 'Campus' },
  { value: 'direct', label: 'Direct' },
  { value: 'other', label: 'Other' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'in_process', label: 'In Process' },
  { value: 'hired', label: 'Hired' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'withdrawn', label: 'Withdrawn' },
  { value: 'blacklisted', label: 'Blacklisted' },
];

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-50 text-green-700',
  in_process: 'bg-blue-50 text-blue-700',
  hired: 'bg-purple-50 text-purple-700',
  rejected: 'bg-red-50 text-red-700',
  withdrawn: 'bg-gray-100 text-gray-600',
  blacklisted: 'bg-red-100 text-red-800',
};

const TAG_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-green-100 text-green-700',
  'bg-purple-100 text-purple-700',
  'bg-orange-100 text-orange-700',
  'bg-cyan-100 text-cyan-700',
  'bg-pink-100 text-pink-700',
];

const defaultFormData = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  currentTitle: '',
  currentCompany: '',
  experienceYears: 0,
  skills: '',
  source: 'direct',
  currentLocation: '',
};

export default function CandidateDatabaseTab() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterExpMin, setFilterExpMin] = useState('');
  const [filterExpMax, setFilterExpMax] = useState('');

  // Create form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState(defaultFormData);
  const [isSaving, setIsSaving] = useState(false);

  // Detail view
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [applicationHistory, setApplicationHistory] = useState<ApplicationHistory[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const loadCandidates = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (filterSource) params.set('source', filterSource);
      if (filterStatus) params.set('status', filterStatus);
      if (filterExpMin) params.set('expMin', filterExpMin);
      if (filterExpMax) params.set('expMax', filterExpMax);

      const res = await api.get(`/talent-acquisition/admin/candidates?${params.toString()}`);
      setCandidates(Array.isArray(res.data) ? res.data : res.data?.data || []);
    } catch {
      setError('Failed to load candidates.');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, filterSource, filterStatus, filterExpMin, filterExpMax]);

  useEffect(() => {
    loadCandidates();
  }, [loadCandidates]);

  const handleCreate = async () => {
    setError(null);
    if (!formData.firstName.trim() || !formData.email.trim()) {
      setError('First name and email are required.');
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        ...formData,
        skills: formData.skills.split(',').map((s) => s.trim()).filter(Boolean),
      };
      const res = await api.post('/talent-acquisition/admin/candidates', payload);
      const newCandidate = res.data?.data || res.data;
      setCandidates((prev) => [newCandidate, ...prev]);
      setShowCreateForm(false);
      setFormData(defaultFormData);
      if (newCandidate.isDuplicate) {
        setSuccess('Candidate added. Note: A potential duplicate was detected.');
      } else {
        setSuccess('Candidate added successfully.');
      }
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to add candidate.');
    } finally {
      setIsSaving(false);
    }
  };

  const viewCandidateDetail = async (candidate: Candidate) => {
    setSelectedCandidate(candidate);
    setIsLoadingHistory(true);
    try {
      const res = await api.get(`/talent-acquisition/admin/candidates/${candidate.id}/history`);
      setApplicationHistory(Array.isArray(res.data) ? res.data : res.data?.data || []);
    } catch {
      setApplicationHistory([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleSearch = () => {
    loadCandidates();
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-text flex items-center gap-2">
          <Users className="h-5 w-5" />
          Candidate Database & Search
        </h2>
        <p className="text-sm text-text-muted">Browse, search, and manage your candidate pool.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          {success}
        </div>
      )}

      {/* Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className={`${inputClassName} pl-9`}
            placeholder="Search by name or email..."
          />
        </div>
        <button
          type="button"
          onClick={handleSearch}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover transition-colors"
        >
          Search
        </button>
        <button
          type="button"
          onClick={() => setShowCreateForm(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Candidate
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={filterSource}
          onChange={(e) => setFilterSource(e.target.value)}
          className={`${selectClassName} w-auto min-w-[140px]`}
        >
          {SOURCE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className={`${selectClassName} w-auto min-w-[140px]`}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <div className="flex items-center gap-1.5 text-xs text-text-muted">
          <span>Exp:</span>
          <input
            type="number"
            value={filterExpMin}
            onChange={(e) => setFilterExpMin(e.target.value)}
            className={`${inputClassName} w-16 text-center`}
            placeholder="Min"
            min={0}
          />
          <span>-</span>
          <input
            type="number"
            value={filterExpMax}
            onChange={(e) => setFilterExpMax(e.target.value)}
            className={`${inputClassName} w-16 text-center`}
            placeholder="Max"
            min={0}
          />
          <span>yrs</span>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
          <span className="ml-2 text-sm text-text-muted">Loading candidates...</span>
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-background border-b border-border">
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Name</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Email</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Title</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Company</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Exp</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Source</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Tags</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Status</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {candidates.map((candidate) => (
                <tr key={candidate.id} className="bg-card hover:bg-background/50 transition-colors">
                  <td className="px-4 py-3 text-sm text-text font-medium">
                    <div className="flex items-center gap-1.5">
                      {candidate.firstName} {candidate.lastName}
                      {candidate.isDuplicate && (
                        <span title="Potential duplicate"><AlertTriangle className="h-3.5 w-3.5 text-yellow-500" /></span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-muted">{candidate.email}</td>
                  <td className="px-4 py-3 text-sm text-text-muted">{candidate.currentTitle || '--'}</td>
                  <td className="px-4 py-3 text-sm text-text-muted">{candidate.currentCompany || '--'}</td>
                  <td className="px-4 py-3 text-sm text-text-muted">{candidate.experienceYears} yr{candidate.experienceYears !== 1 ? 's' : ''}</td>
                  <td className="px-4 py-3 text-sm text-text-muted capitalize">{candidate.source?.replace(/_/g, ' ') || '--'}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(candidate.tags || []).slice(0, 3).map((tag, i) => (
                        <span
                          key={i}
                          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${TAG_COLORS[i % TAG_COLORS.length]}`}
                        >
                          {tag}
                        </span>
                      ))}
                      {(candidate.tags || []).length > 3 && (
                        <span className="text-[10px] text-text-muted">+{candidate.tags.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[candidate.status] || 'bg-gray-100 text-gray-600'}`}>
                      {candidate.status?.replace(/_/g, ' ') || 'active'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => viewCandidateDetail(candidate)}
                        className="p-1 text-text-muted hover:text-primary transition-colors"
                        title="View Details"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {candidates.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center">
                    <Inbox className="h-10 w-10 mx-auto mb-3 opacity-40" />
                    <p className="text-sm text-text-muted">No candidates found. Add your first candidate or adjust filters.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Candidate Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-card border border-border rounded-xl shadow-lg p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text">Add Candidate</h3>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setFormData(defaultFormData);
                }}
                className="text-text-muted hover:text-text"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">First Name *</label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className={inputClassName}
                    placeholder="John"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Last Name</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className={inputClassName}
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Email *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={inputClassName}
                    placeholder="john@example.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className={inputClassName}
                    placeholder="+1 234 567 890"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Current Title</label>
                  <input
                    type="text"
                    value={formData.currentTitle}
                    onChange={(e) => setFormData({ ...formData, currentTitle: e.target.value })}
                    className={inputClassName}
                    placeholder="Software Engineer"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Current Company</label>
                  <input
                    type="text"
                    value={formData.currentCompany}
                    onChange={(e) => setFormData({ ...formData, currentCompany: e.target.value })}
                    className={inputClassName}
                    placeholder="Acme Inc."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Experience (years)</label>
                  <input
                    type="number"
                    value={formData.experienceYears}
                    onChange={(e) => setFormData({ ...formData, experienceYears: parseFloat(e.target.value) || 0 })}
                    min={0}
                    className={inputClassName}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Source</label>
                  <select
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    className={selectClassName}
                  >
                    {SOURCE_OPTIONS.filter((o) => o.value !== '').map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Current Location</label>
                <input
                  type="text"
                  value={formData.currentLocation}
                  onChange={(e) => setFormData({ ...formData, currentLocation: e.target.value })}
                  className={inputClassName}
                  placeholder="New York, NY"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Skills (comma-separated)</label>
                <input
                  type="text"
                  value={formData.skills}
                  onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                  className={inputClassName}
                  placeholder="React, Node.js, TypeScript"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button
                type="button"
                onClick={handleCreate}
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors"
              >
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                Add Candidate
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setFormData(defaultFormData);
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Candidate Detail Modal */}
      {selectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-card border border-border rounded-xl shadow-lg p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text">Candidate Details</h3>
              <button
                type="button"
                onClick={() => {
                  setSelectedCandidate(null);
                  setApplicationHistory([]);
                }}
                className="text-text-muted hover:text-text"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-background rounded-lg p-4 border border-border">
                <h4 className="text-sm font-semibold text-text mb-2">
                  {selectedCandidate.firstName} {selectedCandidate.lastName}
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs text-text-muted">
                  <div><span className="font-medium">Email:</span> {selectedCandidate.email}</div>
                  <div><span className="font-medium">Phone:</span> {selectedCandidate.phone || '--'}</div>
                  <div><span className="font-medium">Title:</span> {selectedCandidate.currentTitle || '--'}</div>
                  <div><span className="font-medium">Company:</span> {selectedCandidate.currentCompany || '--'}</div>
                  <div><span className="font-medium">Experience:</span> {selectedCandidate.experienceYears} yrs</div>
                  <div><span className="font-medium">Source:</span> {selectedCandidate.source?.replace(/_/g, ' ') || '--'}</div>
                  <div><span className="font-medium">Location:</span> {selectedCandidate.currentLocation || '--'}</div>
                  <div>
                    <span className="font-medium">Status:</span>{' '}
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_STYLES[selectedCandidate.status] || 'bg-gray-100 text-gray-600'}`}>
                      {selectedCandidate.status?.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
                {selectedCandidate.skills && selectedCandidate.skills.length > 0 && (
                  <div className="mt-3">
                    <span className="text-xs font-medium text-text-muted">Skills:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedCandidate.skills.map((skill, i) => (
                        <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-background border border-border text-[10px] text-text">
                          <Tag className="h-2.5 w-2.5" />
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Application History */}
              <div>
                <h4 className="text-xs font-semibold text-text mb-2">Application History</h4>
                {isLoadingHistory ? (
                  <div className="flex items-center gap-2 py-3">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-text-muted" />
                    <span className="text-xs text-text-muted">Loading history...</span>
                  </div>
                ) : applicationHistory.length > 0 ? (
                  <div className="border border-border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-background border-b border-border">
                          <th className="text-left text-[10px] font-semibold text-text-muted uppercase px-3 py-2">Job</th>
                          <th className="text-left text-[10px] font-semibold text-text-muted uppercase px-3 py-2">Applied</th>
                          <th className="text-left text-[10px] font-semibold text-text-muted uppercase px-3 py-2">Stage</th>
                          <th className="text-left text-[10px] font-semibold text-text-muted uppercase px-3 py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {applicationHistory.map((app) => (
                          <tr key={app.id} className="bg-card">
                            <td className="px-3 py-1.5 text-xs text-text">{app.jobTitle}</td>
                            <td className="px-3 py-1.5 text-xs text-text-muted">
                              {new Date(app.appliedAt).toLocaleDateString()}
                            </td>
                            <td className="px-3 py-1.5 text-xs text-text-muted">{app.stage}</td>
                            <td className="px-3 py-1.5 text-xs text-text-muted capitalize">{app.status?.replace(/_/g, ' ')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-text-muted py-2">No application history found.</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setSelectedCandidate(null);
                  setApplicationHistory([]);
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
