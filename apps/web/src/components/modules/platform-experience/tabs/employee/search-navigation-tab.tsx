'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Search,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Inbox,
  Star,
  StarOff,
  Trash2,
  Clock,
  Plus,
  X,
} from 'lucide-react';

interface Bookmark {
  id: string;
  label: string;
  url: string;
  icon: string;
  createdAt: string;
}

interface SearchResult {
  id: string;
  title: string;
  type: string;
  module: string;
  url: string;
  snippet: string;
}

export default function SearchNavigationTab() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showBookmarkModal, setShowBookmarkModal] = useState(false);

  const [formLabel, setFormLabel] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [savingBookmark, setSavingBookmark] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/platform-experience/employee/search/bookmarks');
      const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setBookmarks(data);
    } catch {
      setError('Failed to load bookmarks.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      setSearching(true);
      const res = await api.get('/platform-experience/employee/search/search', {
        params: { q: query.trim() },
      });
      const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setSearchResults(data);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        handleSearch(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, handleSearch]);

  const openCreateBookmark = () => {
    setFormLabel('');
    setFormUrl('');
    setShowBookmarkModal(true);
  };

  const handleCreateBookmark = async () => {
    if (!formLabel.trim() || !formUrl.trim()) return;
    try {
      setSavingBookmark(true);
      setError('');
      await api.post('/platform-experience/employee/search/bookmarks', {
        label: formLabel.trim(),
        url: formUrl.trim(),
      });
      setSuccess('Bookmark added successfully.');
      setShowBookmarkModal(false);
      loadData();
    } catch {
      setError('Failed to add bookmark.');
    } finally {
      setSavingBookmark(false);
    }
  };

  const handleDeleteBookmark = async (id: string) => {
    if (!confirm('Remove this bookmark?')) return;
    try {
      setError('');
      await api.delete(`/platform-experience/employee/search/bookmarks/${id}`);
      setSuccess('Bookmark removed.');
      loadData();
    } catch {
      setError('Failed to remove bookmark.');
    }
  };

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(''), 3000);
      return () => clearTimeout(t);
    }
  }, [success]);

  const getResultTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      employee: 'bg-blue-100 text-blue-700',
      module: 'bg-green-100 text-green-700',
      document: 'bg-yellow-100 text-yellow-700',
      page: 'bg-purple-100 text-purple-700',
    };
    return styles[type] || 'bg-gray-100 text-gray-700';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Search className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-text">Search &amp; Navigation</h2>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-3 mb-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {success}
        </div>
      )}

      {/* Search Bar */}
      <div className="relative mb-8">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-border rounded-xl bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary"
            placeholder="Search employees, modules, documents..."
          />
          {searching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-text-muted" />
          )}
        </div>

        {/* Search Results Dropdown */}
        {searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-10 max-h-80 overflow-y-auto">
            {searchResults.map((result) => (
              <a
                key={result.id}
                href={result.url || '#'}
                className="block px-4 py-3 hover:bg-background transition-colors border-b border-border last:border-b-0"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getResultTypeBadge(result.type)} capitalize`}>
                    {result.type}
                  </span>
                  {result.module && (
                    <span className="text-xs text-text-muted">{result.module}</span>
                  )}
                </div>
                <p className="text-sm font-medium text-text">{result.title}</p>
                {result.snippet && (
                  <p className="text-xs text-text-muted mt-0.5">{result.snippet}</p>
                )}
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Bookmarks / Favorites */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-yellow-500" />
            <h3 className="text-sm font-semibold text-text uppercase tracking-wider">Bookmarks</h3>
          </div>
          <button onClick={openCreateBookmark} className="flex items-center gap-2 px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-lg hover:bg-primary-hover transition-colors">
            <Plus className="h-3.5 w-3.5" />
            Add Bookmark
          </button>
        </div>
        {bookmarks.length === 0 ? (
          <div className="text-center py-8">
            <StarOff className="h-8 w-8 text-text-muted mx-auto mb-2" />
            <p className="text-text-muted text-sm">No bookmarks saved yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {bookmarks.map((b) => (
              <div key={b.id} className="bg-background rounded-xl border border-border p-4">
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-yellow-500 shrink-0" />
                    <a href={b.url || '#'} className="text-sm font-medium text-text hover:text-primary transition-colors">
                      {b.label}
                    </a>
                  </div>
                  <button onClick={() => handleDeleteBookmark(b.id)} className="p-1 text-text-muted hover:text-red-600 transition-colors" title="Remove">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="text-xs text-text-muted ml-6 truncate">{b.url}</p>
                <p className="text-xs text-text-muted ml-6 mt-1">
                  {b.createdAt ? new Date(b.createdAt).toLocaleDateString() : '—'}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Items */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Clock className="h-4 w-4 text-text-muted" />
          <h3 className="text-sm font-semibold text-text uppercase tracking-wider">Recently Visited</h3>
        </div>
        <div className="text-center py-8">
          <Clock className="h-8 w-8 text-text-muted mx-auto mb-2" />
          <p className="text-text-muted text-sm">Recent items will appear here as you navigate.</p>
        </div>
      </div>

      {/* Add Bookmark Modal */}
      {showBookmarkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-card rounded-xl border border-border p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text">Add Bookmark</h3>
              <button onClick={() => setShowBookmarkModal(false)} className="p-1 text-text-muted hover:text-text">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text mb-1">Label</label>
                <input
                  type="text"
                  value={formLabel}
                  onChange={(e) => setFormLabel(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="e.g. My Leave Balance"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">URL</label>
                <input
                  type="text"
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="e.g. /dashboard/modules/leave-management"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowBookmarkModal(false)} className="px-4 py-2 text-sm font-medium text-text-muted border border-border rounded-lg hover:bg-background transition-colors">
                Cancel
              </button>
              <button onClick={handleCreateBookmark} disabled={savingBookmark || !formLabel.trim() || !formUrl.trim()} className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50">
                {savingBookmark ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
