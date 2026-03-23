'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  Plus,
  X,
  Inbox,
  Filter,
  Bell,
  AlertTriangle,
} from 'lucide-react';

const inputClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary';
const selectClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary appearance-none';

interface Assignment {
  id: string;
  courseId: string;
  courseTitle: string;
  employeeId: string;
  employeeName: string;
  deadline: string;
  status: string;
  completionPercent: number;
  assignedAt: string;
}

interface OverdueItem {
  id: string;
  courseTitle: string;
  employeeName: string;
  deadline: string;
  daysOverdue: number;
}

const STATUS_STYLES: Record<string, string> = {
  completed: 'bg-green-100 text-green-700',
  in_progress: 'bg-blue-100 text-blue-700',
  not_started: 'bg-gray-100 text-gray-600',
  overdue: 'bg-red-100 text-red-700',
};

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All Assignments' },
  { value: 'completed', label: 'Completed' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'not_started', label: 'Not Started' },
];

const defaultAssignForm = {
  courseId: '',
  employeeIds: '',
  deadline: '',
};

export default function LearningAssignmentsTab() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [overdueItems, setOverdueItems] = useState<OverdueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState('all');

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignForm, setAssignForm] = useState(defaultAssignForm);
  const [isSaving, setIsSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [aRes, oRes] = await Promise.all([
        api.get('/learning-development/manager/assignments').catch(() => null),
        api.get('/learning-development/manager/assignments/overdue').catch(() => null),
      ]);
      const aData = aRes?.data?.data ?? aRes?.data;
      const oData = oRes?.data?.data ?? oRes?.data;
      setAssignments(Array.isArray(aData) ? aData : []);
      setOverdueItems(Array.isArray(oData) ? oData : []);
    } catch {
      setError('Failed to load learning assignments.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAssign = async () => {
    setError(null);
    if (!assignForm.courseId.trim()) {
      setError('Course ID is required.');
      return;
    }
    if (!assignForm.employeeIds.trim()) {
      setError('At least one employee ID is required.');
      return;
    }
    setIsSaving(true);
    try {
      const employeeIds = assignForm.employeeIds.split(',').map((id) => id.trim()).filter(Boolean);
      await api.post('/learning-development/manager/assignments', {
        courseId: assignForm.courseId,
        employeeIds,
        deadline: assignForm.deadline || undefined,
      });
      setSuccess('Course assigned successfully.');
      setShowAssignModal(false);
      setAssignForm(defaultAssignForm);
      loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to assign course.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendReminder = async (assignmentId: string) => {
    try {
      await api.post(`/learning-development/manager/assignments/${assignmentId}/reminder`);
      setSuccess('Reminder sent.');
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to send reminder.');
    }
  };

  const filteredAssignments = statusFilter === 'all'
    ? assignments
    : assignments.filter((a) => a.status === statusFilter);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading learning assignments...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text flex items-center gap-2">
          <ClipboardList className="h-5 w-5" />
          Learning Assignments
        </h2>
        <p className="text-sm text-text-muted">Assign courses to team members and track their progress.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />{error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />{success}
        </div>
      )}

      {/* Overdue Alerts */}
      {overdueItems.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-red-700 flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4" />
            Overdue Assignments ({overdueItems.length})
          </h3>
          <div className="space-y-2">
            {overdueItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between bg-white border border-red-200 rounded-lg px-3 py-2">
                <div>
                  <span className="text-sm text-text font-medium">{item.employeeName}</span>
                  <p className="text-xs text-text-muted">{item.courseTitle}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-red-600 font-medium">{item.daysOverdue} days overdue</span>
                  <p className="text-[10px] text-text-muted">Due: {new Date(item.deadline).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-text-muted" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`${selectClassName} !w-auto`}
          >
            {STATUS_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={() => setShowAssignModal(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover transition-colors"
        >
          <Plus className="h-4 w-4" />
          Assign Course
        </button>
      </div>

      {/* Assignments Table */}
      <div className="border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-background border-b border-border">
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Employee</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Course</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Deadline</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Progress</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Status</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredAssignments.map((assignment) => (
              <tr key={assignment.id} className="bg-card hover:bg-background/50 transition-colors">
                <td className="px-4 py-3">
                  <span className="text-sm text-text font-medium">{assignment.employeeName}</span>
                </td>
                <td className="px-4 py-3 text-sm text-text-muted">{assignment.courseTitle}</td>
                <td className="px-4 py-3 text-sm text-text-muted">
                  {assignment.deadline ? new Date(assignment.deadline).toLocaleDateString() : '--'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-14 bg-gray-200 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${assignment.completionPercent >= 80 ? 'bg-green-500' : assignment.completionPercent >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${assignment.completionPercent || 0}%` }}
                      />
                    </div>
                    <span className="text-xs text-text-muted">{assignment.completionPercent || 0}%</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[assignment.status] || 'bg-gray-100 text-gray-600'}`}>
                    {assignment.status?.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {assignment.status !== 'completed' && (
                    <button
                      type="button"
                      onClick={() => handleSendReminder(assignment.id)}
                      className="p-1 text-text-muted hover:text-primary transition-colors"
                      title="Send Reminder"
                    >
                      <Bell className="h-3.5 w-3.5" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {filteredAssignments.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center">
                  <Inbox className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm text-text-muted">No assignments found.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Assign Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-card border border-border rounded-xl shadow-lg p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text">Assign Course</h3>
              <button type="button" onClick={() => { setShowAssignModal(false); setAssignForm(defaultAssignForm); }} className="text-text-muted hover:text-text">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Course ID *</label>
                <input type="text" value={assignForm.courseId} onChange={(e) => setAssignForm({ ...assignForm, courseId: e.target.value })} className={inputClassName} placeholder="Enter course ID" />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Employee IDs (comma separated) *</label>
                <textarea value={assignForm.employeeIds} onChange={(e) => setAssignForm({ ...assignForm, employeeIds: e.target.value })} className={`${inputClassName} min-h-[60px]`} placeholder="employee-id-1, employee-id-2" rows={2} />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Deadline</label>
                <input type="date" value={assignForm.deadline} onChange={(e) => setAssignForm({ ...assignForm, deadline: e.target.value })} className={inputClassName} />
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button type="button" onClick={handleAssign} disabled={isSaving} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors">
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                Assign
              </button>
              <button type="button" onClick={() => { setShowAssignModal(false); setAssignForm(defaultAssignForm); }} className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
