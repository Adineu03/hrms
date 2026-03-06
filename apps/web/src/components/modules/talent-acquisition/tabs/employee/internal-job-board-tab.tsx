'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  Search,
  Briefcase,
  MapPin,
  Clock,
  Building2,
  Heart,
  CheckCircle2,
  X,
  Bookmark,
  BookmarkCheck,
  Sparkles,
  Inbox,
  ChevronDown,
  ChevronUp,
  Send,
  Calendar,
} from 'lucide-react';

const inputClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary';
const selectClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary appearance-none';

interface InternalJob {
  id: string;
  title: string;
  department: string;
  departmentId: string;
  location: string;
  locationId: string;
  employmentType: string;
  description: string;
  requirements: string[];
  responsibilities: string[];
  benefits: string[];
  postedDate: string;
  applicationDeadline: string;
  isApplied: boolean;
  isBookmarked: boolean;
}

interface FilterOptions {
  departments: { id: string; name: string }[];
  locations: { id: string; name: string }[];
  employmentTypes: string[];
}

export default function InternalJobBoardTab() {
  const [jobs, setJobs] = useState<InternalJob[]>([]);
  const [bookmarkedJobs, setBookmarkedJobs] = useState<InternalJob[]>([]);
  const [recommendedJobs, setRecommendedJobs] = useState<InternalJob[]>([]);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    departments: [],
    locations: [],
    employmentTypes: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filters
  const [searchKeyword, setSearchKeyword] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // View toggle
  const [viewMode, setViewMode] = useState<'all' | 'bookmarked' | 'recommended'>('all');

  // Detail / apply
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [applyingJobId, setApplyingJobId] = useState<string | null>(null);
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const [togglingBookmark, setTogglingBookmark] = useState<string | null>(null);

  const loadJobs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (departmentFilter) params.append('department', departmentFilter);
      if (locationFilter) params.append('location', locationFilter);
      if (typeFilter) params.append('employmentType', typeFilter);
      if (searchKeyword.trim()) params.append('search', searchKeyword.trim());

      const [jobsRes, bookmarksRes, recommendedRes] = await Promise.all([
        api.get(`/talent-acquisition/employee/jobs?${params.toString()}`),
        api.get('/talent-acquisition/employee/jobs/bookmarks'),
        api.get('/talent-acquisition/employee/jobs/recommended'),
      ]);

      setJobs(Array.isArray(jobsRes.data) ? jobsRes.data : jobsRes.data?.data || []);
      setBookmarkedJobs(Array.isArray(bookmarksRes.data) ? bookmarksRes.data : bookmarksRes.data?.data || []);
      setRecommendedJobs(Array.isArray(recommendedRes.data) ? recommendedRes.data : recommendedRes.data?.data || []);

      // Extract unique filter options from jobs
      const allJobs = Array.isArray(jobsRes.data) ? jobsRes.data : jobsRes.data?.data || [];
      const depts = new Map<string, string>();
      const locs = new Map<string, string>();
      const types = new Set<string>();
      allJobs.forEach((j: InternalJob) => {
        if (j.departmentId && j.department) depts.set(j.departmentId, j.department);
        if (j.locationId && j.location) locs.set(j.locationId, j.location);
        if (j.employmentType) types.add(j.employmentType);
      });
      setFilterOptions({
        departments: Array.from(depts, ([id, name]) => ({ id, name })),
        locations: Array.from(locs, ([id, name]) => ({ id, name })),
        employmentTypes: Array.from(types),
      });
    } catch {
      setError('Failed to load internal job postings.');
    } finally {
      setIsLoading(false);
    }
  }, [departmentFilter, locationFilter, typeFilter, searchKeyword]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const handleApply = async () => {
    if (!applyingJobId) return;
    setIsApplying(true);
    setError(null);
    try {
      await api.post(`/talent-acquisition/employee/jobs/${applyingJobId}/apply`, {
        coverLetter: coverLetter.trim() || undefined,
      });
      setSuccess('Application submitted successfully!');
      setShowApplyDialog(false);
      setCoverLetter('');
      setApplyingJobId(null);
      // Update local state
      setJobs((prev) =>
        prev.map((j) => (j.id === applyingJobId ? { ...j, isApplied: true } : j))
      );
      setTimeout(() => setSuccess(null), 4000);
    } catch {
      setError('Failed to submit application.');
    } finally {
      setIsApplying(false);
    }
  };

  const handleToggleBookmark = async (jobId: string, isCurrentlyBookmarked: boolean) => {
    setTogglingBookmark(jobId);
    setError(null);
    try {
      if (isCurrentlyBookmarked) {
        await api.delete(`/talent-acquisition/employee/jobs/${jobId}/bookmark`);
      } else {
        await api.post(`/talent-acquisition/employee/jobs/${jobId}/bookmark`);
      }
      const updateBookmark = (j: InternalJob) =>
        j.id === jobId ? { ...j, isBookmarked: !isCurrentlyBookmarked } : j;
      setJobs((prev) => prev.map(updateBookmark));
      setRecommendedJobs((prev) => prev.map(updateBookmark));
      if (isCurrentlyBookmarked) {
        setBookmarkedJobs((prev) => prev.filter((j) => j.id !== jobId));
      } else {
        const job = jobs.find((j) => j.id === jobId) || recommendedJobs.find((j) => j.id === jobId);
        if (job) setBookmarkedJobs((prev) => [...prev, { ...job, isBookmarked: true }]);
      }
    } catch {
      setError('Failed to update bookmark.');
    } finally {
      setTogglingBookmark(null);
    }
  };

  const openApplyDialog = (jobId: string) => {
    setApplyingJobId(jobId);
    setCoverLetter('');
    setShowApplyDialog(true);
  };

  const getDisplayJobs = (): InternalJob[] => {
    if (viewMode === 'bookmarked') return bookmarkedJobs;
    if (viewMode === 'recommended') return recommendedJobs;
    return jobs;
  };

  const displayJobs = getDisplayJobs();

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const typeColors: Record<string, string> = {
    full_time: 'bg-blue-50 text-blue-700',
    part_time: 'bg-purple-50 text-purple-700',
    contract: 'bg-orange-50 text-orange-700',
    intern: 'bg-teal-50 text-teal-700',
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading job board...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-text flex items-center gap-2">
          <Briefcase className="h-5 w-5" />
          Internal Job Board
        </h2>
        <p className="text-sm text-text-muted">Browse and apply to internal positions.</p>
      </div>

      {/* Alerts */}
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

      {/* View Toggle */}
      <div className="flex items-center gap-2 border-b border-border">
        {(['all', 'bookmarked', 'recommended'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setViewMode(mode)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              viewMode === mode
                ? 'border-primary text-primary'
                : 'border-transparent text-text-muted hover:text-text'
            }`}
          >
            {mode === 'all' && 'All Jobs'}
            {mode === 'bookmarked' && (
              <span className="flex items-center gap-1.5">
                <Bookmark className="h-3.5 w-3.5" />
                Bookmarked ({bookmarkedJobs.length})
              </span>
            )}
            {mode === 'recommended' && (
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                Recommended ({recommendedJobs.length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Filter Bar */}
      {viewMode === 'all' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="Search positions..."
              className={`${inputClassName} pl-9`}
            />
          </div>
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className={selectClassName}
          >
            <option value="">All Departments</option>
            {filterOptions.departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className={selectClassName}
          >
            <option value="">All Locations</option>
            {filterOptions.locations.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className={selectClassName}
          >
            <option value="">All Types</option>
            {filterOptions.employmentTypes.map((t) => (
              <option key={t} value={t}>{t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</option>
            ))}
          </select>
        </div>
      )}

      {/* Job Cards Grid */}
      {displayJobs.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {displayJobs.map((job) => (
            <div key={job.id} className="bg-card border border-border rounded-xl p-4 flex flex-col">
              {/* Card Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-text truncate">{job.title}</h3>
                  <div className="flex items-center gap-3 mt-1 text-xs text-text-muted flex-wrap">
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {job.department}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {job.location}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleBookmark(job.id, job.isBookmarked)}
                  disabled={togglingBookmark === job.id}
                  className="p-1.5 text-text-muted hover:text-primary transition-colors flex-shrink-0"
                >
                  {togglingBookmark === job.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : job.isBookmarked ? (
                    <BookmarkCheck className="h-4 w-4 text-primary" />
                  ) : (
                    <Bookmark className="h-4 w-4" />
                  )}
                </button>
              </div>

              {/* Type + Dates */}
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    typeColors[job.employmentType] || 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {job.employmentType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                </span>
                <span className="text-xs text-text-muted flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Posted {formatDate(job.postedDate)}
                </span>
                {job.applicationDeadline && (
                  <span className="text-xs text-text-muted flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Deadline {formatDate(job.applicationDeadline)}
                  </span>
                )}
                {job.isApplied && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                    Applied
                  </span>
                )}
              </div>

              {/* Expand/Collapse */}
              <button
                type="button"
                onClick={() =>
                  setExpandedJobId(expandedJobId === job.id ? null : job.id)
                }
                className="mt-3 text-xs text-primary hover:text-primary-hover font-medium flex items-center gap-1 transition-colors"
              >
                {expandedJobId === job.id ? (
                  <>
                    <ChevronUp className="h-3.5 w-3.5" />
                    Hide Details
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3.5 w-3.5" />
                    View Details
                  </>
                )}
              </button>

              {/* Expanded Detail */}
              {expandedJobId === job.id && (
                <div className="mt-3 pt-3 border-t border-border space-y-3">
                  {job.description && (
                    <div>
                      <h4 className="text-xs font-semibold text-text uppercase tracking-wider mb-1">Description</h4>
                      <p className="text-sm text-text-muted whitespace-pre-line">{job.description}</p>
                    </div>
                  )}
                  {job.requirements?.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-text uppercase tracking-wider mb-1">Requirements</h4>
                      <ul className="list-disc list-inside text-sm text-text-muted space-y-0.5">
                        {job.requirements.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {job.responsibilities?.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-text uppercase tracking-wider mb-1">Responsibilities</h4>
                      <ul className="list-disc list-inside text-sm text-text-muted space-y-0.5">
                        {job.responsibilities.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {job.benefits?.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-text uppercase tracking-wider mb-1">Benefits</h4>
                      <ul className="list-disc list-inside text-sm text-text-muted space-y-0.5">
                        {job.benefits.map((b, i) => (
                          <li key={i}>{b}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Apply Button */}
              <div className="mt-auto pt-3">
                {job.isApplied ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Already Applied
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => openApplyDialog(job.id)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover transition-colors"
                  >
                    <Send className="h-3.5 w-3.5" />
                    Apply Now
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Inbox className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm text-text-muted">
            {viewMode === 'bookmarked'
              ? 'No bookmarked positions yet.'
              : viewMode === 'recommended'
              ? 'No recommended positions available right now.'
              : 'No internal positions available right now.'}
          </p>
        </div>
      )}

      {/* Apply Confirmation Dialog */}
      {showApplyDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-lg border border-border w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-text">Confirm Application</h3>
              <button
                type="button"
                onClick={() => {
                  setShowApplyDialog(false);
                  setApplyingJobId(null);
                  setCoverLetter('');
                }}
                className="p-1 text-text-muted hover:text-text transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm text-text-muted mb-4">
              Are you sure you want to apply for this position? Your current profile will be shared with the hiring team.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-text mb-1.5">
                Cover Letter <span className="text-text-muted font-normal">(optional)</span>
              </label>
              <textarea
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                placeholder="Share why you're a great fit for this role..."
                rows={4}
                className={`${inputClassName} resize-none`}
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleApply}
                disabled={isApplying}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {isApplying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Submit Application
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowApplyDialog(false);
                  setApplyingJobId(null);
                  setCoverLetter('');
                }}
                className="px-4 py-2.5 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
