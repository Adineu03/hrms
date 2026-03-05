'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  Check,
  Shield,
  Save,
} from 'lucide-react';

const inputClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary';
const selectClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary appearance-none';

const LEAVE_YEAR_OPTIONS = [
  { value: 'calendar_year', label: 'Calendar Year (Jan - Dec)' },
  { value: 'financial_year', label: 'Financial Year (Apr - Mar)' },
  { value: 'custom', label: 'Custom' },
];

const SANDWICH_RULE_TYPES = [
  { value: 'none', label: 'None' },
  { value: 'include_weekends', label: 'Include Weekends Between Leaves' },
  { value: 'include_holidays', label: 'Include Holidays Between Leaves' },
  { value: 'include_both', label: 'Include Weekends & Holidays' },
];

interface PolicyData {
  leaveYearType: string;
  leaveYearCustomStart: string;
  sandwichRuleEnabled: boolean;
  sandwichRuleType: string;
  autoApprovalEnabled: boolean;
  autoApprovalMaxDays: number;
  autoApprovalLeaveTypes: string;
  escalationEnabled: boolean;
  escalationHours: number;
  halfDayEnabled: boolean;
  backdatedLeaveAllowed: boolean;
  backdatedMaxDays: number;
  minDaysBeforeRequest: number;
  negativeBalanceEnabled: boolean;
  negativeBalanceMaxDays: number;
  compoffEarningRuleWeekday: number;
  compoffEarningRuleWeekend: number;
  compoffEarningRuleHoliday: number;
  compoffExpiryDays: number;
  encashmentEnabled: boolean;
  encashmentMinBalance: number;
  encashmentMaxDaysPerYear: number;
  encashmentPayPerDay: number;
}

const defaultPolicy: PolicyData = {
  leaveYearType: 'calendar_year',
  leaveYearCustomStart: '01-01',
  sandwichRuleEnabled: false,
  sandwichRuleType: 'none',
  autoApprovalEnabled: false,
  autoApprovalMaxDays: 1,
  autoApprovalLeaveTypes: '',
  escalationEnabled: false,
  escalationHours: 48,
  halfDayEnabled: true,
  backdatedLeaveAllowed: true,
  backdatedMaxDays: 7,
  minDaysBeforeRequest: 0,
  negativeBalanceEnabled: false,
  negativeBalanceMaxDays: 3,
  compoffEarningRuleWeekday: 1,
  compoffEarningRuleWeekend: 1,
  compoffEarningRuleHoliday: 1,
  compoffExpiryDays: 90,
  encashmentEnabled: false,
  encashmentMinBalance: 5,
  encashmentMaxDaysPerYear: 10,
  encashmentPayPerDay: 0,
};

export default function LeavePolicyTab() {
  const [policy, setPolicy] = useState<PolicyData>(defaultPolicy);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    loadPolicy();
  }, []);

  const loadPolicy = async () => {
    try {
      const res = await api.get('/leave-management/admin/policy');
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
      await api.post('/leave-management/admin/policy', policy);
      setSuccessMsg('Leave policy saved successfully.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch {
      setError('Failed to save leave policy.');
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading leave policy...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Leave Policy Configuration
          </h2>
          <p className="text-sm text-text-muted">
            Configure the leave policy settings for your organization.
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
        {/* Leave Year Configuration */}
        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold text-text">Leave Year Configuration</h3>
          <p className="text-xs text-text-muted">Define how leave years are calculated for balance accruals and resets.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Leave Year Type</label>
              <select
                value={policy.leaveYearType}
                onChange={(e) => setPolicy({ ...policy, leaveYearType: e.target.value })}
                className={`${selectClassName} text-sm`}
              >
                {LEAVE_YEAR_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            {policy.leaveYearType === 'custom' && (
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Custom Year Start (MM-DD)</label>
                <input
                  type="text"
                  value={policy.leaveYearCustomStart}
                  onChange={(e) => setPolicy({ ...policy, leaveYearCustomStart: e.target.value })}
                  placeholder="MM-DD, e.g. 04-01"
                  className={`${inputClassName} text-sm`}
                />
              </div>
            )}
          </div>
        </div>

        {/* Sandwich Rule */}
        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold text-text">Sandwich Rule</h3>
          <p className="text-xs text-text-muted">Count weekends/holidays between consecutive leave days as leave.</p>
          {renderToggle(
            policy.sandwichRuleEnabled,
            (v) => setPolicy({ ...policy, sandwichRuleEnabled: v }),
            'Enable Sandwich Rule',
          )}
          {policy.sandwichRuleEnabled && (
            <div className="pt-2">
              <label className="block text-xs font-medium text-text-muted mb-1">Sandwich Rule Type</label>
              <select
                value={policy.sandwichRuleType}
                onChange={(e) => setPolicy({ ...policy, sandwichRuleType: e.target.value })}
                className={`${selectClassName} text-sm w-full sm:w-80`}
              >
                {SANDWICH_RULE_TYPES.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Auto-Approval */}
        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold text-text">Auto-Approval</h3>
          <p className="text-xs text-text-muted">Automatically approve leave requests meeting certain criteria.</p>
          {renderToggle(
            policy.autoApprovalEnabled,
            (v) => setPolicy({ ...policy, autoApprovalEnabled: v }),
            'Enable Auto-Approval',
          )}
          {policy.autoApprovalEnabled && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Max Days for Auto-Approval</label>
                <input
                  type="number"
                  value={policy.autoApprovalMaxDays}
                  onChange={(e) => setPolicy({ ...policy, autoApprovalMaxDays: parseInt(e.target.value) || 0 })}
                  min={1}
                  className={`${inputClassName} text-sm`}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Applicable Leave Types (comma separated)</label>
                <input
                  type="text"
                  value={policy.autoApprovalLeaveTypes}
                  onChange={(e) => setPolicy({ ...policy, autoApprovalLeaveTypes: e.target.value })}
                  placeholder="e.g. casual, sick"
                  className={`${inputClassName} text-sm`}
                />
              </div>
            </div>
          )}
        </div>

        {/* Escalation */}
        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold text-text">Escalation Settings</h3>
          <p className="text-xs text-text-muted">Escalate pending leave requests after a certain duration.</p>
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
                className={`${inputClassName} text-sm w-40`}
              />
            </div>
          )}
        </div>

        {/* Leave Request Settings */}
        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold text-text">Leave Request Settings</h3>
          <div className="space-y-3">
            {renderToggle(
              policy.halfDayEnabled,
              (v) => setPolicy({ ...policy, halfDayEnabled: v }),
              'Allow Half-Day Leaves',
            )}
            {renderToggle(
              policy.backdatedLeaveAllowed,
              (v) => setPolicy({ ...policy, backdatedLeaveAllowed: v }),
              'Allow Backdated Leave Requests',
            )}
          </div>
          {policy.backdatedLeaveAllowed && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Max Backdated Days</label>
                <input
                  type="number"
                  value={policy.backdatedMaxDays}
                  onChange={(e) => setPolicy({ ...policy, backdatedMaxDays: parseInt(e.target.value) || 0 })}
                  min={0}
                  className={`${inputClassName} text-sm`}
                />
              </div>
            </div>
          )}
          <div className="pt-2">
            <label className="block text-xs font-medium text-text-muted mb-1">Minimum Days Before Request</label>
            <input
              type="number"
              value={policy.minDaysBeforeRequest}
              onChange={(e) => setPolicy({ ...policy, minDaysBeforeRequest: parseInt(e.target.value) || 0 })}
              min={0}
              className={`${inputClassName} text-sm w-40`}
            />
            <p className="text-xs text-text-muted mt-1">How many days in advance employees must apply for leave (0 = same day).</p>
          </div>
        </div>

        {/* Negative Balance */}
        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold text-text">Negative Balance</h3>
          <p className="text-xs text-text-muted">Allow employees to take leave beyond their available balance.</p>
          {renderToggle(
            policy.negativeBalanceEnabled,
            (v) => setPolicy({ ...policy, negativeBalanceEnabled: v }),
            'Allow Negative Balance',
          )}
          {policy.negativeBalanceEnabled && (
            <div className="pt-2">
              <label className="block text-xs font-medium text-text-muted mb-1">Max Negative Days Allowed</label>
              <input
                type="number"
                value={policy.negativeBalanceMaxDays}
                onChange={(e) => setPolicy({ ...policy, negativeBalanceMaxDays: parseInt(e.target.value) || 0 })}
                min={1}
                className={`${inputClassName} text-sm w-40`}
              />
            </div>
          )}
        </div>

        {/* Comp-Off Earning Rules */}
        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold text-text">Comp-Off Earning Rules</h3>
          <p className="text-xs text-text-muted">Configure how compensatory off days are earned for extra work.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Weekday Work (days earned)</label>
              <input
                type="number"
                value={policy.compoffEarningRuleWeekday}
                onChange={(e) => setPolicy({ ...policy, compoffEarningRuleWeekday: parseFloat(e.target.value) || 0 })}
                step={0.5}
                min={0}
                className={`${inputClassName} text-sm`}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Weekend Work (days earned)</label>
              <input
                type="number"
                value={policy.compoffEarningRuleWeekend}
                onChange={(e) => setPolicy({ ...policy, compoffEarningRuleWeekend: parseFloat(e.target.value) || 0 })}
                step={0.5}
                min={0}
                className={`${inputClassName} text-sm`}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Holiday Work (days earned)</label>
              <input
                type="number"
                value={policy.compoffEarningRuleHoliday}
                onChange={(e) => setPolicy({ ...policy, compoffEarningRuleHoliday: parseFloat(e.target.value) || 0 })}
                step={0.5}
                min={0}
                className={`${inputClassName} text-sm`}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Comp-Off Expiry (days)</label>
            <input
              type="number"
              value={policy.compoffExpiryDays}
              onChange={(e) => setPolicy({ ...policy, compoffExpiryDays: parseInt(e.target.value) || 0 })}
              min={0}
              className={`${inputClassName} text-sm w-40`}
            />
            <p className="text-xs text-text-muted mt-1">Number of days after which an unused comp-off expires (0 = never).</p>
          </div>
        </div>

        {/* Encashment Rules */}
        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold text-text">Encashment Rules</h3>
          <p className="text-xs text-text-muted">Configure leave encashment settings for eligible leave types.</p>
          {renderToggle(
            policy.encashmentEnabled,
            (v) => setPolicy({ ...policy, encashmentEnabled: v }),
            'Enable Leave Encashment',
          )}
          {policy.encashmentEnabled && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Min Balance to Encash</label>
                <input
                  type="number"
                  value={policy.encashmentMinBalance}
                  onChange={(e) => setPolicy({ ...policy, encashmentMinBalance: parseInt(e.target.value) || 0 })}
                  min={0}
                  className={`${inputClassName} text-sm`}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Max Days Per Year</label>
                <input
                  type="number"
                  value={policy.encashmentMaxDaysPerYear}
                  onChange={(e) => setPolicy({ ...policy, encashmentMaxDaysPerYear: parseInt(e.target.value) || 0 })}
                  min={0}
                  className={`${inputClassName} text-sm`}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Pay Per Day (currency)</label>
                <input
                  type="number"
                  value={policy.encashmentPayPerDay}
                  onChange={(e) => setPolicy({ ...policy, encashmentPayPerDay: parseFloat(e.target.value) || 0 })}
                  min={0}
                  className={`${inputClassName} text-sm`}
                />
              </div>
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
