'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Search,
  Plus,
  Trash2,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Inbox,
  Settings,
  Link,
} from 'lucide-react';

interface SearchConfig {
  enableGlobalSearch: boolean;
  enableModuleSearch: boolean;
  maxResults: number;
  indexingEnabled: boolean;
}

interface Shortcut {
  id: string;
  label: string;
  url: string;
  icon: string;
  isGlobal: boolean;
  sortOrder: number;
  createdAt: string;
}

export default function SearchNavigationConfigTab() {
  const [config, setConfig] = useState<SearchConfig | null>(null);
  const [shortcuts, setShortcuts] = useState<Shortcut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [savingConfig, setSavingConfig] = useState(false);

  const [showShortcutModal, setShowShortcutModal] = useState(false);
  const [formLabel, setFormLabel] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formIcon, setFormIcon] = useState('');
  const [formIsGlobal, setFormIsGlobal] = useState(true);
  const [savingShortcut, setSavingShortcut] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [configRes, shortcutsRes] = await Promise.all([
        api.get('/platform-experience/admin/search-nav/config'),
        api.get('/platform-experience/admin/search-nav/shortcuts'),
      ]);

      const configData = configRes.data?.data || configRes.data || {};
      const shortcutsData = Array.isArray(shortcutsRes.data) ? shortcutsRes.data : shortcutsRes.data?.data || [];

      setConfig({
        enableGlobalSearch: configData.enableGlobalSearch ?? true,
        enableModuleSearch: configData.enableModuleSearch ?? true,
        maxResults: configData.maxResults || 20,
        indexingEnabled: configData.indexingEnabled ?? true,
      });
      setShortcuts(shortcutsData);
    } catch {
      setError('Failed to load search configuration.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveConfig = async () => {
    if (!config) return;
    try {
      setSavingConfig(true);
      setError('');
      await api.patch('/platform-experience/admin/search-nav/config', config);
      setSuccess('Search configuration saved successfully.');
    } catch {
      setError('Failed to save search configuration.');
    } finally {
      setSavingConfig(false);
    }
  };

  const openCreateShortcut = () => {
    setFormLabel('');
    setFormUrl('');
    setFormIcon('');
    setFormIsGlobal(true);
    setShowShortcutModal(true);
  };

  const handleCreateShortcut = async () => {
    if (!formLabel.trim() || !formUrl.trim()) return;
    try {
      setSavingShortcut(true);
      setError('');
      await api.post('/platform-experience/admin/search-nav/shortcuts', {
        label: formLabel.trim(),
        url: formUrl.trim(),
        icon: formIcon.trim() || undefined,
        isGlobal: formIsGlobal,
      });
      setSuccess('Shortcut created successfully.');
      setShowShortcutModal(false);
      loadData();
    } catch {
      setError('Failed to create shortcut.');
    } finally {
      setSavingShortcut(false);
    }
  };

  const handleDeleteShortcut = async (id: string) => {
    if (!confirm('Are you sure you want to delete this shortcut?')) return;
    try {
      setError('');
      await api.delete(`/platform-experience/admin/search-nav/shortcuts/${id}`);
      setSuccess('Shortcut deleted.');
      loadData();
    } catch {
      setError('Failed to delete shortcut.');
    }
  };

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(''), 3000);
      return () => clearTimeout(t);
    }
  }, [success]);

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
        <h2 className="text-lg font-semibold text-text">Search &amp; Navigation Configuration</h2>
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

      {/* Search Configuration */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <Settings className="h-4 w-4 text-text-muted" />
          <h3 className="text-sm font-semibold text-text uppercase tracking-wider">Search Settings</h3>
        </div>
        {config && (
          <div className="bg-background rounded-xl border border-border p-6">
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="flex items-center gap-2 text-sm text-text">
                  <input
                    type="checkbox"
                    checked={config.enableGlobalSearch}
                    onChange={(e) => setConfig({ ...config, enableGlobalSearch: e.target.checked })}
                    className="rounded border-border"
                  />
                  Enable Global Search
                </label>
                <label className="flex items-center gap-2 text-sm text-text">
                  <input
                    type="checkbox"
                    checked={config.enableModuleSearch}
                    onChange={(e) => setConfig({ ...config, enableModuleSearch: e.target.checked })}
                    className="rounded border-border"
                  />
                  Enable Module Search
                </label>
                <label className="flex items-center gap-2 text-sm text-text">
                  <input
                    type="checkbox"
                    checked={config.indexingEnabled}
                    onChange={(e) => setConfig({ ...config, indexingEnabled: e.target.checked })}
                    className="rounded border-border"
                  />
                  Enable Search Indexing
                </label>
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Max Results</label>
                  <input
                    type="number"
                    value={config.maxResults}
                    onChange={(e) => setConfig({ ...config, maxResults: parseInt(e.target.value) || 20 })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                    min={5}
                    max={100}
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={handleSaveConfig}
                  disabled={savingConfig}
                  className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50"
                >
                  {savingConfig ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Configuration'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Shortcuts */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Link className="h-4 w-4 text-text-muted" />
            <h3 className="text-sm font-semibold text-text uppercase tracking-wider">Navigation Shortcuts</h3>
          </div>
          <button onClick={openCreateShortcut} className="flex items-center gap-2 px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-lg hover:bg-primary-hover transition-colors">
            <Plus className="h-3.5 w-3.5" />
            Add Shortcut
          </button>
        </div>
        {shortcuts.length === 0 ? (
          <div className="text-center py-12">
            <Inbox className="h-10 w-10 text-text-muted mx-auto mb-3" />
            <p className="text-text-muted text-sm">No navigation shortcuts configured.</p>
          </div>
        ) : (
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-background">
                <tr>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Label</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">URL</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Global</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Order</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {shortcuts.map((s) => (
                  <tr key={s.id} className="hover:bg-background/50">
                    <td className="px-4 py-3 text-sm text-text font-medium">{s.label}</td>
                    <td className="px-4 py-3 text-sm text-text-muted">{s.url}</td>
                    <td className="px-4 py-3">
                      {s.isGlobal ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Yes</span>
                      ) : (
                        <span className="text-sm text-text-muted">No</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-text">{s.sortOrder || 0}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleDeleteShortcut(s.id)} className="p-1 text-text-muted hover:text-red-600 transition-colors" title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Shortcut Modal */}
      {showShortcutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-card rounded-xl border border-border p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text">Add Shortcut</h3>
              <button onClick={() => setShowShortcutModal(false)} className="p-1 text-text-muted hover:text-text">
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
                  placeholder="e.g. Employee Directory"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">URL</label>
                <input
                  type="text"
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="e.g. /dashboard/modules/core-hr"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Icon (optional)</label>
                <input
                  type="text"
                  value={formIcon}
                  onChange={(e) => setFormIcon(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="e.g. users"
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm text-text pb-2">
                  <input
                    type="checkbox"
                    checked={formIsGlobal}
                    onChange={(e) => setFormIsGlobal(e.target.checked)}
                    className="rounded border-border"
                  />
                  Global shortcut (visible to all users)
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowShortcutModal(false)} className="px-4 py-2 text-sm font-medium text-text-muted border border-border rounded-lg hover:bg-background transition-colors">
                Cancel
              </button>
              <button onClick={handleCreateShortcut} disabled={savingShortcut || !formLabel.trim() || !formUrl.trim()} className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50">
                {savingShortcut ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
