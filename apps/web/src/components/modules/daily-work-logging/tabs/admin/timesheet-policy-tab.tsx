'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  Check,
  Settings,
  Save,
  Plus,
  X,
} from 'lucide-react';

const inputClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary';
const selectClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary appearance-none';

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'bi_weekly', label: 'Bi-Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

const ROUNDING_RULE_OPTIONS = [
  { value: 'none', label: 'No Rounding' },
  { value: 'nearest', label: 'Round to Nearest' },
  { value: 'up', label: 'Round Up' },
  { value: 'down', label: 'Round Down' },
];

const ROUNDING_INTERVAL_OPTIONS = [
  { value: '5', label: '5 minutes' },
  { value: '6', label: '6 minutes (0.1 hour)' },
  { value: '15', label: '15 minutes (quarter hour)' },
  { value: '30', label: '30 minutes (half hour)' },
  { value: '60', label: '60 minutes (full hour)' },
];

interface AutoApprovalRule {
  id: string;
  condition: string;
  maxHours: number;
}

interface PolicyData {
  submissionFrequency: string;
  submissionDeadline: string;
  customDeadline: string;
  gracePeriodMinutes: number;
  minHoursPerDay: number;
  maxHoursPerDay: number;
  minHoursPerWeek: number;
  maxHoursPerWeek: number;
  roundingRule: string;
  roundingInterval: string;
  lockAfterApproval: boolean;
  lockAfterDays: number;
  dailyMandatory: boolean;
  requireDescription: boolean;
  autoApprovalEnabled: boolean;
  autoApprovalRules: AutoApprovalRule[];
  escalationEnabled: boolean;
  escalationHours: number;
}

const defaultPolicy: PolicyData = {
  submissionFrequency: 'daily',
  submissionDeadline: '23:59',
  customDeadline: '',
  gracePeriodMinutes: 30,
  minHoursPerDay: 0,
  maxHoursPerDay: 12,
  minHoursPerWeek: 0,
  maxHoursPerWeek: 60,
  roundingRule: 'none',
  roundingInterval: '15',
  lockAfterApproval: true,
  lockAfterDays: 7,
  dailyMandatory: false,
  requireDescription: false,
  autoApprovalEnabled: false,
  autoApprovalRules: [],
  escalationEnabled: false,
  escalationHours: 48,
};

export default function TimesheetPolicyTab() {
  const [policy, setPolicy] = useState<PolicyData>(defaultPolicy);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    loadPolicy();
  }, []);

  const loadPolicy = async () => {
    try {
      const res = await api.get('/daily-work-logging/admin/policy');
      const data = res.data?.data || res.data;
      if (data) {
        setPolicy({ ...defaultPolicy, ...data });
      }
    } catch {
      // No policy yet -- use defaults
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setError(null);
    setSuccessMsg(null);
    setIsSaving(true);
    try {
      await api.post('/daily-work-logging/admin/policy', policy);
      setSuccessMsg('Timesheet policy saved successfully.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch {
      setError('Failed to save timesheet policy.');
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

  const addAutoApprovalRule = () => {
    setPolicy({
      ...policy,
      autoApprovalRules: [
        ...policy.autoApprovalRules,
        { id: crypto.randomUUID(), condition: 'hours_under', maxHours: 8 },
      ],
    });
  };

  const removeAutoApprovalRule = (id: string) => {
    setPolicy({
      ...policy,
      autoApprovalRules: policy.autoApprovalRules.filter((r) => r.id !== id),
    });
  };

  const updateAutoApprovalRule = (id: string, field: keyof AutoApprovalRule, value: string | number) => {
    setPolicy({
      ...policy,
      autoApprovalRules: policy.autoApprovalRules.map((r) =>
        r.id === id ? { ...r, [field]: value } : r
      ),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading timesheet policy...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Timesheet Policy Configuration
          </h2>
          <p className="text-sm text-text-muted">
            Configure submission rules, hour limits, rounding, and auto-approval for daily work logs.
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <Check className="h-4 w-4 flex-shrink-0" />
          {successMsg}
        </div>
      )}

      <div className="space-y-6">
        {/* Submission Settings */}
        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold text-text">Submission Settings</h3>
          <p className="text-xs text-text-muted">Define how often employees must submit timesheets and the deadline.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Submission Frequency</label>
              <select
                value={policy.submissionFrequency}
                onChange={(e) => setPolicy({ ...policy, submissionFrequency: e.target.value })}
                className={selectClassName}
              >
                {FREQUENCY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Submission Deadline</label>
              <input
                type="time"
                value={policy.submissionDeadline}
                onChange={(e) => setPolicy({ ...policy, submissionDeadline: e.target.value })}
                className={inputClassName}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Custom Deadline (if applicable)</label>
              <input
                type="text"
                value={policy.customDeadline}
                onChange={(e) => setPolicy({ ...policy, customDeadline: e.target.value })}
                placeholder="e.g. Next business day 10:00 AM"
                className={inputClassName}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Grace Period (minutes)</label>
              <input
                type="number"
                value={policy.gracePeriodMinutes}
                onChange={(e) => setPolicy({ ...policy, gracePeriodMinutes: parseInt(e.target.value) || 0 })}
                min={0}
                className={inputClassName}
              />
            </div>
          </div>
        </div>

        {/* Hours Configuration */}
        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold text-text">Hours Configuration</h3>
          <p className="text-xs text-text-muted">Set minimum and maximum working hours per day and week.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Min Hours/Day</label>
              <input
                type="number"
                value={policy.minHoursPerDay}
                onChange={(e) => setPolicy({ ...policy, minHoursPerDay: parseFloat(e.target.value) || 0 })}
                min={0}
                step={0.5}
                className={inputClassName}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Max Hours/Day</label>
              <input
                type="number"
                value={policy.maxHoursPerDay}
                onChange={(e) => setPolicy({ ...policy, maxHoursPerDay: parseFloat(e.target.value) || 0 })}
                min={0}
                step={0.5}
                className={inputClassName}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Min Hours/Week</label>
              <input
                type="number"
                value={policy.minHoursPerWeek}
                onChange={(e) => setPolicy({ ...policy, minHoursPerWeek: parseFloat(e.target.value) || 0 })}
                min={0}
                step={0.5}
                className={inputClassName}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Max Hours/Week</label>
              <input
                type="number"
                value={policy.maxHoursPerWeek}
                onChange={(e) => setPolicy({ ...policy, maxHoursPerWeek: parseFloat(e.target.value) || 0 })}
                min={0}
                step={0.5}
                className={inputClassName}
              />
            </div>
          </div>
        </div>

        {/* Rounding Rules */}
        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold text-text">Rounding Rules</h3>
          <p className="text-xs text-text-muted">Configure how time entries are rounded for billing and reporting.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Rounding Rule</label>
              <select
                value={policy.roundingRule}
                onChange={(e) => setPolicy({ ...policy, roundingRule: e.target.value })}
                className={selectClassName}
              >
                {ROUNDING_RULE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            {policy.roundingRule !== 'none' && (
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Rounding Interval</label>
                <select
                  value={policy.roundingInterval}
                  onChange={(e) => setPolicy({ ...policy, roundingInterval: e.target.value })}
                  className={selectClassName}
                >
                  {ROUNDING_INTERVAL_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Lock Settings */}
        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold text-text">Lock Settings</h3>
          <p className="text-xs text-text-muted">Prevent changes to timesheets after approval or a set period.</p>
          {renderToggle(
            policy.lockAfterApproval,
            (v) => setPolicy({ ...policy, lockAfterApproval: v }),
            'Lock Timesheet After Approval',
          )}
          <div className="pt-2">
            <label className="block text-xs font-medium text-text-muted mb-1">Lock After X Days (from submission date)</label>
            <input
              type="number"
              value={policy.lockAfterDays}
              onChange={(e) => setPolicy({ ...policy, lockAfterDays: parseInt(e.target.value) || 0 })}
              min={0}
              className={`${inputClassName} w-40`}
            />
            <p className="text-xs text-text-muted mt-1">Set to 0 to disable time-based locking.</p>
          </div>
        </div>

        {/* Mandatory Fields */}
        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold text-text">Mandatory Fields</h3>
          <p className="text-xs text-text-muted">Require employees to fill in certain fields on their timesheets.</p>
          <div className="space-y-3">
            {renderToggle(
              policy.dailyMandatory,
              (v) => setPolicy({ ...policy, dailyMandatory: v }),
              'Daily Timesheet Submission is Mandatory',
            )}
            {renderToggle(
              policy.requireDescription,
              (v) => setPolicy({ ...policy, requireDescription: v }),
              'Require Description for Each Entry',
            )}
          </div>
        </div>

        {/* Auto-Approval */}
        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold text-text">Auto-Approval</h3>
          <p className="text-xs text-text-muted">Automatically approve timesheets meeting certain conditions.</p>
          {renderToggle(
            policy.autoApprovalEnabled,
            (v) => setPolicy({ ...policy, autoApprovalEnabled: v }),
            'Enable Auto-Approval',
          )}
          {policy.autoApprovalEnabled && (
            <div className="pt-2 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-text-muted">Approval Rules</span>
                <button
                  type="button"
                  onClick={addAutoApprovalRule}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  Add Rule
                </button>
              </div>
              {policy.autoApprovalRules.length === 0 && (
                <p className="text-xs text-text-muted italic">No auto-approval rules configured. Add a rule to get started.</p>
              )}
              {policy.autoApprovalRules.map((rule) => (
                <div key={rule.id} className="flex items-center gap-3 bg-background rounded-lg p-3">
                  <select
                    value={rule.condition}
                    onChange={(e) => updateAutoApprovalRule(rule.id, 'condition', e.target.value)}
                    className={`${selectClassName} w-48`}
                  >
                    <option value="hours_under">Total Hours Under</option>
                    <option value="hours_exact">Total Hours Exactly</option>
                    <option value="all_billable">All Hours Billable</option>
                    <option value="has_description">All Entries Have Description</option>
                  </select>
                  {(rule.condition === 'hours_under' || rule.condition === 'hours_exact') && (
                    <input
                      type="number"
                      value={rule.maxHours}
                      onChange={(e) => updateAutoApprovalRule(rule.id, 'maxHours', parseFloat(e.target.value) || 0)}
                      min={0}
                      step={0.5}
                      className={`${inputClassName} w-24`}
                      placeholder="Hours"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => removeAutoApprovalRule(rule.id)}
                    className="text-text-muted hover:text-red-600 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Escalation */}
        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold text-text">Escalation Settings</h3>
          <p className="text-xs text-text-muted">Escalate pending timesheet approvals after a certain duration.</p>
          {renderToggle(
            policy.escalationEnabled,
            (v) => setPolicy({ ...policy, escalationEnabled: v }),
            'Enable Escalation',
          )}
          {policy.escalationEnabled && (
            <div className="pt-2">
              <label className="block text-xs font-medium text-text-muted mb-1">Escalation After (hours)</label>
              <input
                type="number"
                value={policy.escalationHours}
                onChange={(e) => setPolicy({ ...policy, escalationHours: parseInt(e.target.value) || 0 })}
                min={1}
                className={`${inputClassName} w-40`}
              />
            </div>
          )}
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
            Save Policy
          </button>
        </div>
      </div>
    </div>
  );
}
