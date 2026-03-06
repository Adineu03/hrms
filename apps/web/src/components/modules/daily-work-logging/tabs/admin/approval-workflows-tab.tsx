'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  GitBranch,
  Plus,
  X,
  Save,
  Clock,
  Users,
} from 'lucide-react';

const inputClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary';
const selectClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary appearance-none';

interface ApprovalLevel {
  id: string;
  level: number;
  approverType: string;
  approverRole: string;
  isRequired: boolean;
}

interface DelegationRule {
  id: string;
  fromRole: string;
  toRole: string;
  condition: string;
}

interface WorkflowData {
  approvalLevels: ApprovalLevel[];
  autoApprovalEnabled: boolean;
  autoApprovalConditions: string[];
  escalationEnabled: boolean;
  escalationHours: number;
  escalationTarget: string;
  delegationRules: DelegationRule[];
  pendingCount: number;
}

const defaultWorkflow: WorkflowData = {
  approvalLevels: [],
  autoApprovalEnabled: false,
  autoApprovalConditions: [],
  escalationEnabled: false,
  escalationHours: 48,
  escalationTarget: 'skip_level_manager',
  delegationRules: [],
  pendingCount: 0,
};

export default function ApprovalWorkflowsTab() {
  const [workflow, setWorkflow] = useState<WorkflowData>(defaultWorkflow);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [newCondition, setNewCondition] = useState('');

  useEffect(() => {
    loadWorkflow();
  }, []);

  const loadWorkflow = async () => {
    try {
      const res = await api.get('/daily-work-logging/admin/workflows');
      const data = res.data?.data || res.data;
      if (data) {
        setWorkflow({ ...defaultWorkflow, ...data });
      }
    } catch {
      // Use defaults
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setError(null);
    setSuccess(null);
    setIsSaving(true);
    try {
      await api.post('/daily-work-logging/admin/workflows', workflow);
      setSuccess('Approval workflow saved successfully.');
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to save approval workflow.');
    } finally {
      setIsSaving(false);
    }
  };

  const renderToggle = (
    checked: boolean,
    onChange: (val: boolean) => void,
    label: string,
  ) => (
    <label className="flex items-center gap-2 cursor-pointer">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-9 h-5 rounded-full transition-colors ${
          checked ? 'bg-primary' : 'bg-gray-300'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
            checked ? 'translate-x-4' : ''
          }`}
        />
      </button>
      <span className="text-sm text-text">{label}</span>
    </label>
  );

  const addLevel = () => {
    const nextLevel = workflow.approvalLevels.length + 1;
    setWorkflow({
      ...workflow,
      approvalLevels: [
        ...workflow.approvalLevels,
        {
          id: crypto.randomUUID(),
          level: nextLevel,
          approverType: 'direct_manager',
          approverRole: '',
          isRequired: true,
        },
      ],
    });
  };

  const removeLevel = (id: string) => {
    setWorkflow({
      ...workflow,
      approvalLevels: workflow.approvalLevels
        .filter((l) => l.id !== id)
        .map((l, i) => ({ ...l, level: i + 1 })),
    });
  };

  const updateLevel = (id: string, field: keyof ApprovalLevel, value: string | boolean) => {
    setWorkflow({
      ...workflow,
      approvalLevels: workflow.approvalLevels.map((l) =>
        l.id === id ? { ...l, [field]: value } : l
      ),
    });
  };

  const addCondition = () => {
    if (!newCondition.trim()) return;
    setWorkflow({
      ...workflow,
      autoApprovalConditions: [...workflow.autoApprovalConditions, newCondition.trim()],
    });
    setNewCondition('');
  };

  const removeCondition = (index: number) => {
    setWorkflow({
      ...workflow,
      autoApprovalConditions: workflow.autoApprovalConditions.filter((_, i) => i !== index),
    });
  };

  const addDelegationRule = () => {
    setWorkflow({
      ...workflow,
      delegationRules: [
        ...workflow.delegationRules,
        {
          id: crypto.randomUUID(),
          fromRole: 'manager',
          toRole: 'team_lead',
          condition: 'on_leave',
        },
      ],
    });
  };

  const removeDelegationRule = (id: string) => {
    setWorkflow({
      ...workflow,
      delegationRules: workflow.delegationRules.filter((r) => r.id !== id),
    });
  };

  const updateDelegationRule = (id: string, field: keyof DelegationRule, value: string) => {
    setWorkflow({
      ...workflow,
      delegationRules: workflow.delegationRules.map((r) =>
        r.id === id ? { ...r, [field]: value } : r
      ),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading approval workflows...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-text flex items-center gap-2">
          <GitBranch className="h-5 w-5" />
          Approval Workflows
        </h2>
        <p className="text-sm text-text-muted">Configure approval chain, auto-approval, escalation, and delegation rules.</p>
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

      {/* Pending Submissions Overview */}
      {workflow.pendingCount > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3">
          <Clock className="h-5 w-5 text-yellow-600" />
          <div>
            <p className="text-sm font-medium text-yellow-800">
              {workflow.pendingCount} pending submission{workflow.pendingCount !== 1 ? 's' : ''} awaiting approval
            </p>
            <p className="text-xs text-yellow-700">These timesheets are waiting in the approval queue.</p>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Approval Levels */}
        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-text">Approval Levels</h3>
              <p className="text-xs text-text-muted">Define the chain of approvers for timesheet submissions.</p>
            </div>
            <button
              type="button"
              onClick={addLevel}
              className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
            >
              <Plus className="h-3 w-3" />
              Add Level
            </button>
          </div>

          {workflow.approvalLevels.length === 0 && (
            <p className="text-xs text-text-muted italic">No approval levels configured. Submissions will go directly to managers.</p>
          )}

          {workflow.approvalLevels.map((level) => (
            <div key={level.id} className="flex items-center gap-3 bg-background rounded-lg p-3">
              <span className="text-xs font-bold text-primary bg-primary/10 rounded-full w-6 h-6 flex items-center justify-center">
                {level.level}
              </span>
              <select
                value={level.approverType}
                onChange={(e) => updateLevel(level.id, 'approverType', e.target.value)}
                className={`${selectClassName} w-48`}
              >
                <option value="direct_manager">Direct Manager</option>
                <option value="skip_level_manager">Skip-Level Manager</option>
                <option value="department_head">Department Head</option>
                <option value="hr_admin">HR Admin</option>
                <option value="project_manager">Project Manager</option>
                <option value="custom_role">Custom Role</option>
              </select>
              {level.approverType === 'custom_role' && (
                <input
                  type="text"
                  value={level.approverRole}
                  onChange={(e) => updateLevel(level.id, 'approverRole', e.target.value)}
                  className={`${inputClassName} w-40`}
                  placeholder="Role name"
                />
              )}
              <label className="flex items-center gap-1 text-xs text-text-muted whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={level.isRequired}
                  onChange={(e) => updateLevel(level.id, 'isRequired', e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary"
                />
                Required
              </label>
              <button
                type="button"
                onClick={() => removeLevel(level.id)}
                className="text-text-muted hover:text-red-600 transition-colors ml-auto"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Auto-Approval Rules */}
        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold text-text">Auto-Approval Rules</h3>
          <p className="text-xs text-text-muted">Define conditions under which timesheets are automatically approved.</p>
          {renderToggle(
            workflow.autoApprovalEnabled,
            (v) => setWorkflow({ ...workflow, autoApprovalEnabled: v }),
            'Enable Auto-Approval',
          )}
          {workflow.autoApprovalEnabled && (
            <div className="space-y-2 pt-2">
              {workflow.autoApprovalConditions.map((cond, i) => (
                <div key={i} className="flex items-center gap-2 bg-background rounded-lg px-3 py-2">
                  <span className="text-sm text-text flex-1">{cond}</span>
                  <button
                    type="button"
                    onClick={() => removeCondition(i)}
                    className="text-text-muted hover:text-red-600 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newCondition}
                  onChange={(e) => setNewCondition(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addCondition()}
                  className={`${inputClassName} flex-1`}
                  placeholder="e.g. Total hours between 7.5 and 9"
                />
                <button
                  type="button"
                  onClick={addCondition}
                  disabled={!newCondition.trim()}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  Add
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Escalation Settings */}
        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold text-text">Escalation Settings</h3>
          <p className="text-xs text-text-muted">Automatically escalate pending approvals after a specified time.</p>
          {renderToggle(
            workflow.escalationEnabled,
            (v) => setWorkflow({ ...workflow, escalationEnabled: v }),
            'Enable Escalation',
          )}
          {workflow.escalationEnabled && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Escalation After (hours)</label>
                <input
                  type="number"
                  value={workflow.escalationHours}
                  onChange={(e) => setWorkflow({ ...workflow, escalationHours: parseInt(e.target.value) || 0 })}
                  min={1}
                  className={`${inputClassName} w-40`}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Escalate To</label>
                <select
                  value={workflow.escalationTarget}
                  onChange={(e) => setWorkflow({ ...workflow, escalationTarget: e.target.value })}
                  className={selectClassName}
                >
                  <option value="skip_level_manager">Skip-Level Manager</option>
                  <option value="department_head">Department Head</option>
                  <option value="hr_admin">HR Admin</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Delegation Rules */}
        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-text flex items-center gap-2">
                <Users className="h-4 w-4" />
                Delegation Rules
              </h3>
              <p className="text-xs text-text-muted">Configure who can approve when the primary approver is unavailable.</p>
            </div>
            <button
              type="button"
              onClick={addDelegationRule}
              className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
            >
              <Plus className="h-3 w-3" />
              Add Rule
            </button>
          </div>

          {workflow.delegationRules.length === 0 && (
            <p className="text-xs text-text-muted italic">No delegation rules configured.</p>
          )}

          {workflow.delegationRules.map((rule) => (
            <div key={rule.id} className="flex items-center gap-3 bg-background rounded-lg p-3">
              <span className="text-xs text-text-muted">When</span>
              <select
                value={rule.fromRole}
                onChange={(e) => updateDelegationRule(rule.id, 'fromRole', e.target.value)}
                className={`${selectClassName} w-36`}
              >
                <option value="manager">Manager</option>
                <option value="department_head">Dept Head</option>
                <option value="hr_admin">HR Admin</option>
              </select>
              <span className="text-xs text-text-muted">is</span>
              <select
                value={rule.condition}
                onChange={(e) => updateDelegationRule(rule.id, 'condition', e.target.value)}
                className={`${selectClassName} w-36`}
              >
                <option value="on_leave">On Leave</option>
                <option value="unavailable">Unavailable</option>
                <option value="always">Always (Co-approver)</option>
              </select>
              <span className="text-xs text-text-muted">delegate to</span>
              <select
                value={rule.toRole}
                onChange={(e) => updateDelegationRule(rule.id, 'toRole', e.target.value)}
                className={`${selectClassName} w-36`}
              >
                <option value="team_lead">Team Lead</option>
                <option value="skip_level_manager">Skip-Level Manager</option>
                <option value="hr_admin">HR Admin</option>
              </select>
              <button
                type="button"
                onClick={() => removeDelegationRule(rule.id)}
                className="text-text-muted hover:text-red-600 transition-colors ml-auto"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Save Button */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover transition-colors disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Workflow
          </button>
        </div>
      </div>
    </div>
  );
}
