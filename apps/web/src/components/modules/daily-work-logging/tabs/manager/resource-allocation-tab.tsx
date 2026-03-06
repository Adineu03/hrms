'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  Users,
  X,
  Inbox,
} from 'lucide-react';

const inputClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary';
const selectClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary appearance-none';

interface ResourceEntry {
  employeeId: string;
  employeeName: string;
  capacity: number;
  allocated: number;
  available: number;
  utilization: number;
  status: 'under' | 'optimal' | 'over';
}

interface AssignForm {
  employeeId: string;
  projectId: string;
  hours: number;
}

export default function ResourceAllocationTab() {
  const [resources, setResources] = useState<ResourceEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Assign modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignForm, setAssignForm] = useState<AssignForm>({ employeeId: '', projectId: '', hours: 0 });
  const [isAssigning, setIsAssigning] = useState(false);

  const loadData = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get('/daily-work-logging/manager/resources');
      setResources(Array.isArray(res.data) ? res.data : res.data?.data || []);
    } catch {
      setError('Failed to load resource allocation data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAssign = async () => {
    if (!assignForm.employeeId || !assignForm.projectId || assignForm.hours <= 0) {
      setError('All fields are required.');
      return;
    }
    setError(null);
    setIsAssigning(true);
    try {
      await api.post('/daily-work-logging/manager/resources/assign', assignForm);
      setSuccess('Resource assigned successfully.');
      setShowAssignModal(false);
      setAssignForm({ employeeId: '', projectId: '', hours: 0 });
      await loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to assign resource.');
    } finally {
      setIsAssigning(false);
    }
  };

  const renderProgressBar = (percent: number) => {
    let color = 'bg-primary';
    if (percent > 100) color = 'bg-red-500';
    else if (percent > 85) color = 'bg-yellow-500';
    else if (percent < 50) color = 'bg-gray-400';

    return (
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`${color} h-2 rounded-full transition-all`}
          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        />
      </div>
    );
  };

  const STATUS_STYLES: Record<string, string> = {
    under: 'bg-blue-50 text-blue-700',
    optimal: 'bg-green-50 text-green-700',
    over: 'bg-red-50 text-red-700',
  };

  const STATUS_LABELS: Record<string, string> = {
    under: 'Under-allocated',
    optimal: 'Optimal',
    over: 'Over-allocated',
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading resource allocation...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text flex items-center gap-2">
            <Users className="h-5 w-5" />
            Resource Allocation
          </h2>
          <p className="text-sm text-text-muted">View capacity, allocation, and utilization for your team.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowAssignModal(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-white hover:bg-primary-hover transition-colors"
        >
          <Users className="h-3.5 w-3.5" />
          Assign to Project
        </button>
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

      {/* Capacity Table */}
      <div className="border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-background border-b border-border">
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Employee</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Capacity (hrs)</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Allocated (hrs)</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Available (hrs)</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3 w-40">Utilization</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {resources.map((r) => (
              <tr key={r.employeeId} className="bg-card hover:bg-background/50 transition-colors">
                <td className="px-4 py-3 text-sm text-text font-medium">{r.employeeName}</td>
                <td className="px-4 py-3 text-sm text-text-muted">{r.capacity.toFixed(1)}</td>
                <td className="px-4 py-3 text-sm text-text-muted">{r.allocated.toFixed(1)}</td>
                <td className="px-4 py-3 text-sm">
                  <span className={r.available < 0 ? 'text-red-700 font-medium' : 'text-green-700 font-medium'}>
                    {r.available.toFixed(1)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1">{renderProgressBar(r.utilization)}</div>
                    <span className="text-xs font-medium text-text w-10 text-right">{r.utilization.toFixed(0)}%</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[r.status]}`}>
                    {STATUS_LABELS[r.status]}
                  </span>
                </td>
              </tr>
            ))}
            {resources.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center">
                  <Inbox className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm text-text-muted">No resource data available.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Assign Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-card border border-border rounded-xl shadow-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text">Assign to Project</h3>
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="text-text-muted hover:text-text"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Employee</label>
                <select
                  value={assignForm.employeeId}
                  onChange={(e) => setAssignForm({ ...assignForm, employeeId: e.target.value })}
                  className={selectClassName}
                >
                  <option value="">Select employee</option>
                  {resources.map((r) => (
                    <option key={r.employeeId} value={r.employeeId}>{r.employeeName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Project ID</label>
                <input
                  type="text"
                  value={assignForm.projectId}
                  onChange={(e) => setAssignForm({ ...assignForm, projectId: e.target.value })}
                  className={inputClassName}
                  placeholder="Enter project ID"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Allocated Hours</label>
                <input
                  type="number"
                  value={assignForm.hours}
                  onChange={(e) => setAssignForm({ ...assignForm, hours: parseFloat(e.target.value) || 0 })}
                  min={0}
                  step={0.5}
                  className={inputClassName}
                />
              </div>
            </div>
            <div className="flex items-center gap-3 mt-6">
              <button
                type="button"
                onClick={handleAssign}
                disabled={isAssigning}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors"
              >
                {isAssigning && <Loader2 className="h-4 w-4 animate-spin" />}
                Assign
              </button>
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors"
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
