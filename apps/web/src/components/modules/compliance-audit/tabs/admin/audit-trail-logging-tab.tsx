'use client';
import React, { useState, useEffect } from 'react';
import { Loader2, Plus, X, ClipboardList, Download, AlertCircle, Eye, Pencil, Trash2, FileDown } from 'lucide-react';
import { api } from '@/lib/api';

interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: 'create' | 'update' | 'delete' | 'view' | 'export';
  entityType: string;
  entityId: string;
  module: string;
  description: string;
  ipAddress?: string;
  createdAt: string;
}

interface AuditConfig {
  id: string;
  entityName: string;
  retentionDays: number;
  trackCreate: boolean;
  trackUpdate: boolean;
  trackDelete: boolean;
  trackView: boolean;
  trackExport: boolean;
}

const actionColors: Record<string, string> = {
  create: 'bg-green-100 text-green-700',
  update: 'bg-blue-100 text-blue-700',
  delete: 'bg-red-100 text-red-700',
  view: 'bg-gray-100 text-gray-700',
  export: 'bg-purple-100 text-purple-700',
};

const actionIcons: Record<string, React.ReactElement> = {
  create: <Plus className="w-3 h-3" />,
  update: <Pencil className="w-3 h-3" />,
  delete: <Trash2 className="w-3 h-3" />,
  view: <Eye className="w-3 h-3" />,
  export: <FileDown className="w-3 h-3" />,
};

export default function AuditTrailLoggingTab() {
  const [activeSection, setActiveSection] = useState<'logs' | 'configs'>('logs');
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [configs, setConfigs] = useState<AuditConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [configForm, setConfigForm] = useState({
    entityName: '',
    retentionDays: 365,
    trackCreate: true,
    trackUpdate: true,
    trackDelete: true,
    trackView: false,
    trackExport: false,
  });

  useEffect(() => {
    if (activeSection === 'logs') fetchLogs();
    else fetchConfigs();
  }, [activeSection]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await api.get('/compliance-audit/admin/audit-trail/logs');
      setLogs(res.data?.data || res.data || []);
    } catch {
      setError('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      const res = await api.get('/compliance-audit/admin/audit-trail/configs');
      setConfigs(res.data?.data || res.data || []);
    } catch {
      setError('Failed to load audit configurations');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateConfig = async () => {
    if (!configForm.entityName) return;
    try {
      setSubmitting(true);
      await api.post('/compliance-audit/admin/audit-trail/configs', configForm);
      setConfigForm({ entityName: '', retentionDays: 365, trackCreate: true, trackUpdate: true, trackDelete: true, trackView: false, trackExport: false });
      setShowConfigForm(false);
      fetchConfigs();
    } catch {
      setError('Failed to create config');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportLogs = async () => {
    try {
      setExporting(true);
      await api.get('/compliance-audit/admin/audit-trail/export');
    } catch {
      setError('Export failed');
    } finally {
      setExporting(false);
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
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveSection('logs')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeSection === 'logs' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              Audit Logs
            </button>
            <button
              onClick={() => setActiveSection('configs')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeSection === 'configs' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              Trail Configurations
            </button>
          </div>
          {activeSection === 'logs' && (
            <button
              onClick={handleExportLogs}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Export Logs
            </button>
          )}
          {activeSection === 'configs' && (
            <button
              onClick={() => setShowConfigForm(!showConfigForm)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Config
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            <span className="ml-2 text-gray-500 text-sm">Loading...</span>
          </div>
        ) : activeSection === 'logs' ? (
          <>
            {logs.length === 0 ? (
              <div className="text-center py-12">
                <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No audit logs found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">User</th>
                      <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Action</th>
                      <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Module / Entity</th>
                      <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</th>
                      <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">IP Address</th>
                      <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">When</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-2 font-medium text-[#2c2c2c]">{log.userName}</td>
                        <td className="py-3 px-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${actionColors[log.action]}`}>
                            {actionIcons[log.action]}
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-gray-600">
                          <div>{log.module}</div>
                          <div className="text-xs text-gray-400">{log.entityType}</div>
                        </td>
                        <td className="py-3 px-2 text-gray-600 max-w-xs truncate">{log.description}</td>
                        <td className="py-3 px-2 text-gray-500 font-mono text-xs">{log.ipAddress || '—'}</td>
                        <td className="py-3 px-2 text-gray-500 text-xs">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : (
          <>
            {showConfigForm && (
              <div className="mb-6 p-4 border border-indigo-100 bg-indigo-50 rounded-lg">
                <h3 className="text-sm font-semibold text-[#2c2c2c] mb-3">New Audit Configuration</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Entity Name *</label>
                    <input
                      type="text"
                      value={configForm.entityName}
                      onChange={(e) => setConfigForm({ ...configForm, entityName: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="e.g., Employee, Policy, Payroll"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Retention Days</label>
                    <input
                      type="number"
                      value={configForm.retentionDays}
                      onChange={(e) => setConfigForm({ ...configForm, retentionDays: parseInt(e.target.value) })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      min={30}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-2">Track Events</label>
                    <div className="flex flex-wrap gap-4">
                      {(['trackCreate', 'trackUpdate', 'trackDelete', 'trackView', 'trackExport'] as const).map((key) => (
                        <div key={key} className="flex items-center gap-2">
                          <ToggleSwitch
                            checked={configForm[key]}
                            onChange={(v) => setConfigForm({ ...configForm, [key]: v })}
                          />
                          <span className="text-sm text-gray-700">{key.replace('track', '')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handleCreateConfig}
                    disabled={submitting}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    Save Configuration
                  </button>
                  <button
                    onClick={() => setShowConfigForm(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {configs.length === 0 ? (
              <div className="text-center py-12">
                <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No audit configurations found. Add your first configuration.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Entity</th>
                      <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Retention (Days)</th>
                      <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Create</th>
                      <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Update</th>
                      <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Delete</th>
                      <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">View</th>
                      <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Export</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {configs.map((cfg) => (
                      <tr key={cfg.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-2 font-medium text-[#2c2c2c]">{cfg.entityName}</td>
                        <td className="py-3 px-2 text-gray-600">{cfg.retentionDays}</td>
                        {(['trackCreate', 'trackUpdate', 'trackDelete', 'trackView', 'trackExport'] as const).map((key) => (
                          <td key={key} className="py-3 px-2">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg[key] ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                              {cfg[key] ? 'On' : 'Off'}
                            </span>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
