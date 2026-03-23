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
  Inbox,
} from 'lucide-react';

const selectClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary appearance-none';

interface BuddyAssignment {
  id: string;
  newHireName: string;
  newHireId: string;
  buddyName: string;
  buddyId: string;
  assignedDate: string;
  interactionCount: number;
  feedbackStatus: string;
  status: string;
}

interface TeamMember {
  id: string;
  name: string;
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  completed: 'bg-blue-100 text-blue-700',
  pending: 'bg-yellow-50 text-yellow-700',
};

const FEEDBACK_STYLES: Record<string, string> = {
  submitted: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-50 text-yellow-700',
  not_due: 'bg-gray-100 text-gray-600',
};

export default function BuddyAssignmentTab() {
  const [assignments, setAssignments] = useState<BuddyAssignment[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [newHires, setNewHires] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [showAssignForm, setShowAssignForm] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<BuddyAssignment | null>(null);
  const [formData, setFormData] = useState({ newHireId: '', buddyId: '' });
  const [isSaving, setIsSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [assignRes, membersRes, hiresRes] = await Promise.all([
        api.get('/onboarding-offboarding/manager/buddies').catch(() => ({ data: [] })),
        api.get('/onboarding-offboarding/manager/team-members').catch(() => ({ data: [] })),
        api.get('/onboarding-offboarding/manager/new-hires').catch(() => ({ data: [] })),
      ]);
      const assignData = assignRes.data;
      setAssignments(Array.isArray(assignData) ? assignData : assignData?.data ?? []);
      const membersData = membersRes.data;
      setTeamMembers(Array.isArray(membersData) ? membersData : membersData?.data ?? []);
      const hiresData = hiresRes.data;
      setNewHires(Array.isArray(hiresData) ? hiresData : hiresData?.data ?? []);
    } catch {
      setError('Failed to load buddy assignments.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async () => {
    setError(null);
    if (!formData.newHireId || !formData.buddyId) {
      setError('Both new hire and buddy must be selected.');
      return;
    }
    setIsSaving(true);
    try {
      if (editingAssignment) {
        await api.patch(`/onboarding-offboarding/manager/buddies/${editingAssignment.id}`, formData);
        setSuccess('Buddy reassigned successfully.');
      } else {
        await api.post('/onboarding-offboarding/manager/buddies', formData);
        setSuccess('Buddy assigned successfully.');
      }
      setShowAssignForm(false);
      setEditingAssignment(null);
      setFormData({ newHireId: '', buddyId: '' });
      loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to save buddy assignment.');
    } finally {
      setIsSaving(false);
    }
  };

  const openAssign = () => {
    setEditingAssignment(null);
    setFormData({ newHireId: '', buddyId: '' });
    setShowAssignForm(true);
  };

  const openReassign = (assignment: BuddyAssignment) => {
    setEditingAssignment(assignment);
    setFormData({ newHireId: assignment.newHireId, buddyId: assignment.buddyId });
    setShowAssignForm(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading buddy assignments...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-text flex items-center gap-2">
          <Users className="h-5 w-5" />
          Buddy Assignment
        </h2>
        <p className="text-sm text-text-muted">Assign buddies to new hires for smoother onboarding.</p>
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

      <div className="flex items-center justify-end">
        <button type="button" onClick={openAssign} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover transition-colors">
          <Plus className="h-4 w-4" />
          Assign Buddy
        </button>
      </div>

      {/* Table */}
      <div className="border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-background border-b border-border">
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">New Hire</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Buddy</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Assigned</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Interactions</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Feedback</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Status</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {assignments.map((a) => (
              <tr key={a.id} className="bg-card hover:bg-background/50 transition-colors">
                <td className="px-4 py-3 text-sm text-text font-medium">{a.newHireName}</td>
                <td className="px-4 py-3 text-sm text-text-muted">{a.buddyName}</td>
                <td className="px-4 py-3 text-sm text-text-muted">
                  {a.assignedDate ? new Date(a.assignedDate).toLocaleDateString() : '--'}
                </td>
                <td className="px-4 py-3 text-sm text-text-muted">{a.interactionCount}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${FEEDBACK_STYLES[a.feedbackStatus] || 'bg-gray-100 text-gray-600'}`}>
                    {a.feedbackStatus.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[a.status] || 'bg-gray-100 text-gray-600'}`}>
                    {a.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button type="button" onClick={() => openReassign(a)} className="p-1 text-text-muted hover:text-primary transition-colors" title="Reassign buddy">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
            {assignments.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center">
                  <Inbox className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm text-text-muted">No buddy assignments yet. Assign buddies to new hires.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Assign/Reassign Modal */}
      {showAssignForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-card border border-border rounded-xl shadow-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text">
                {editingAssignment ? 'Reassign Buddy' : 'Assign Buddy'}
              </h3>
              <button type="button" onClick={() => { setShowAssignForm(false); setEditingAssignment(null); }} className="text-text-muted hover:text-text">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">New Hire *</label>
                <select
                  value={formData.newHireId}
                  onChange={(e) => setFormData({ ...formData, newHireId: e.target.value })}
                  className={selectClassName}
                  disabled={!!editingAssignment}
                >
                  <option value="">Select new hire</option>
                  {newHires.map((h) => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Buddy *</label>
                <select
                  value={formData.buddyId}
                  onChange={(e) => setFormData({ ...formData, buddyId: e.target.value })}
                  className={selectClassName}
                >
                  <option value="">Select buddy</option>
                  {teamMembers.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button type="button" onClick={handleSave} disabled={isSaving} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors">
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingAssignment ? 'Reassign' : 'Assign Buddy'}
              </button>
              <button type="button" onClick={() => { setShowAssignForm(false); setEditingAssignment(null); }} className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
