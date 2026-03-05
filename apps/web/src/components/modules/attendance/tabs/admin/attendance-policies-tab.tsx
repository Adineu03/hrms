'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  Check,
  Shield,
  AlertCircle,
  Save,
} from 'lucide-react';

const inputClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary';
const selectClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary appearance-none';

const TRACKING_METHODS = [
  { value: 'web', label: 'Web' },
  { value: 'mobile', label: 'Mobile' },
  { value: 'biometric', label: 'Biometric' },
  { value: 'geo_fence', label: 'Geo-Fence' },
  { value: 'wifi', label: 'WiFi' },
  { value: 'qr', label: 'QR Code' },
  { value: 'manual', label: 'Manual' },
];

interface PolicyData {
  trackingMethods: string[];
  graceMinutesLate: number;
  graceMinutesEarly: number;
  halfDayThresholdMinutes: number;
  fullDayThresholdMinutes: number;
  lateMarkRules: string;
  overtimeEnabled: boolean;
  maxOvertimePerDay: number;
  maxOvertimePerWeek: number;
  maxOvertimePerMonth: number;
  overtimeApprovalType: string;
  regularizationDeadlineDays: number;
  regularizationApprovalRequired: boolean;
  autoClockOut: boolean;
  autoClockOutTime: string;
  geoFenceEnabled: boolean;
  wifiValidationEnabled: boolean;
  allowedWifiNetworks: string;
  payrollCutoffDay: number;
  lockAfterPayroll: boolean;
}

const defaultPolicy: PolicyData = {
  trackingMethods: ['web'],
  graceMinutesLate: 15,
  graceMinutesEarly: 15,
  halfDayThresholdMinutes: 240,
  fullDayThresholdMinutes: 480,
  lateMarkRules: '{}',
  overtimeEnabled: false,
  maxOvertimePerDay: 4,
  maxOvertimePerWeek: 20,
  maxOvertimePerMonth: 60,
  overtimeApprovalType: 'pre_approval',
  regularizationDeadlineDays: 7,
  regularizationApprovalRequired: true,
  autoClockOut: false,
  autoClockOutTime: '23:00',
  geoFenceEnabled: false,
  wifiValidationEnabled: false,
  allowedWifiNetworks: '',
  payrollCutoffDay: 25,
  lockAfterPayroll: false,
};

export default function AttendancePoliciesTab() {
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
      const res = await api.get('/attendance/admin/policies');
      const data = res.data?.data || res.data;
      if (data) {
        setPolicy({
          ...defaultPolicy,
          ...data,
          trackingMethods: Array.isArray(data.trackingMethods)
            ? data.trackingMethods
            : defaultPolicy.trackingMethods,
          allowedWifiNetworks: Array.isArray(data.allowedWifiNetworks)
            ? data.allowedWifiNetworks.join(', ')
            : data.allowedWifiNetworks || '',
          lateMarkRules:
            typeof data.lateMarkRules === 'object'
              ? JSON.stringify(data.lateMarkRules, null, 2)
              : data.lateMarkRules || '{}',
        });
      }
    } catch {
      // No policy yet — use defaults, not an error
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setError(null);
    setSuccessMsg(null);
    setIsSaving(true);
    try {
      const payload = {
        ...policy,
        allowedWifiNetworks: policy.allowedWifiNetworks
          ? policy.allowedWifiNetworks.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
        lateMarkRules: (() => {
          try {
            return JSON.parse(policy.lateMarkRules);
          } catch {
            return {};
          }
        })(),
      };
      await api.post('/attendance/admin/policies', payload);
      setSuccessMsg('Attendance policy saved successfully.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch {
      setError('Failed to save attendance policy.');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleTrackingMethod = (method: string) => {
    setPolicy((prev) => ({
      ...prev,
      trackingMethods: prev.trackingMethods.includes(method)
        ? prev.trackingMethods.filter((m) => m !== method)
        : [...prev.trackingMethods, method],
    }));
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
        <span className="ml-2 text-sm text-text-muted">Loading attendance policy...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Attendance Policy
          </h2>
          <p className="text-sm text-text-muted">
            Configure the attendance policy for your organization.
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
        {/* Tracking Methods */}
        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold text-text">Tracking Methods</h3>
          <p className="text-xs text-text-muted">Select which methods employees can use to record attendance.</p>
          <div className="flex flex-wrap gap-3">
            {TRACKING_METHODS.map((method) => (
              <label
                key={method.value}
                className="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={policy.trackingMethods.includes(method.value)}
                  onChange={() => toggleTrackingMethod(method.value)}
                  className="rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-sm text-text">{method.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Grace Periods */}
        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold text-text">Grace Periods</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Grace Minutes Late</label>
              <input
                type="number"
                value={policy.graceMinutesLate}
                onChange={(e) => setPolicy({ ...policy, graceMinutesLate: parseInt(e.target.value) || 0 })}
                className={`${inputClassName} text-sm`}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Grace Minutes Early Leave</label>
              <input
                type="number"
                value={policy.graceMinutesEarly}
                onChange={(e) => setPolicy({ ...policy, graceMinutesEarly: parseInt(e.target.value) || 0 })}
                className={`${inputClassName} text-sm`}
              />
            </div>
          </div>
        </div>

        {/* Thresholds */}
        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold text-text">Day Thresholds</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Half-Day Threshold (minutes)</label>
              <input
                type="number"
                value={policy.halfDayThresholdMinutes}
                onChange={(e) => setPolicy({ ...policy, halfDayThresholdMinutes: parseInt(e.target.value) || 0 })}
                className={`${inputClassName} text-sm`}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Full-Day Threshold (minutes)</label>
              <input
                type="number"
                value={policy.fullDayThresholdMinutes}
                onChange={(e) => setPolicy({ ...policy, fullDayThresholdMinutes: parseInt(e.target.value) || 0 })}
                className={`${inputClassName} text-sm`}
              />
            </div>
          </div>
        </div>

        {/* Late Mark Rules */}
        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold text-text">Late Mark Rules</h3>
          <p className="text-xs text-text-muted">Define late mark rules as JSON configuration.</p>
          <textarea
            value={policy.lateMarkRules}
            onChange={(e) => setPolicy({ ...policy, lateMarkRules: e.target.value })}
            rows={4}
            placeholder='{"maxLatePerMonth": 3, "deductionPerLate": 0.5}'
            className={`${inputClassName} text-sm font-mono`}
          />
        </div>

        {/* Overtime Settings */}
        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold text-text">Overtime Settings</h3>
          {renderToggle(
            policy.overtimeEnabled,
            (v) => setPolicy({ ...policy, overtimeEnabled: v }),
            'Enable Overtime',
          )}
          {policy.overtimeEnabled && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Max OT Per Day (hours)</label>
                <input
                  type="number"
                  value={policy.maxOvertimePerDay}
                  onChange={(e) => setPolicy({ ...policy, maxOvertimePerDay: parseFloat(e.target.value) || 0 })}
                  className={`${inputClassName} text-sm`}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Max OT Per Week (hours)</label>
                <input
                  type="number"
                  value={policy.maxOvertimePerWeek}
                  onChange={(e) => setPolicy({ ...policy, maxOvertimePerWeek: parseFloat(e.target.value) || 0 })}
                  className={`${inputClassName} text-sm`}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Max OT Per Month (hours)</label>
                <input
                  type="number"
                  value={policy.maxOvertimePerMonth}
                  onChange={(e) => setPolicy({ ...policy, maxOvertimePerMonth: parseFloat(e.target.value) || 0 })}
                  className={`${inputClassName} text-sm`}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">OT Approval Type</label>
                <select
                  value={policy.overtimeApprovalType}
                  onChange={(e) => setPolicy({ ...policy, overtimeApprovalType: e.target.value })}
                  className={`${selectClassName} text-sm`}
                >
                  <option value="pre_approval">Pre-Approval</option>
                  <option value="post_facto">Post-Facto</option>
                  <option value="both">Both</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Regularization */}
        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold text-text">Regularization</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Regularization Deadline (days)</label>
              <input
                type="number"
                value={policy.regularizationDeadlineDays}
                onChange={(e) => setPolicy({ ...policy, regularizationDeadlineDays: parseInt(e.target.value) || 0 })}
                className={`${inputClassName} text-sm`}
              />
            </div>
            <div className="flex items-end pb-1">
              {renderToggle(
                policy.regularizationApprovalRequired,
                (v) => setPolicy({ ...policy, regularizationApprovalRequired: v }),
                'Approval Required',
              )}
            </div>
          </div>
        </div>

        {/* Auto Clock-Out */}
        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold text-text">Auto Clock-Out</h3>
          {renderToggle(
            policy.autoClockOut,
            (v) => setPolicy({ ...policy, autoClockOut: v }),
            'Enable Auto Clock-Out',
          )}
          {policy.autoClockOut && (
            <div className="pt-2">
              <label className="block text-xs font-medium text-text-muted mb-1">Auto Clock-Out Time</label>
              <input
                type="time"
                value={policy.autoClockOutTime}
                onChange={(e) => setPolicy({ ...policy, autoClockOutTime: e.target.value })}
                className={`${inputClassName} text-sm w-40`}
              />
            </div>
          )}
        </div>

        {/* Geo-Fence & WiFi */}
        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold text-text">Geo-Fence &amp; WiFi Settings</h3>
          <div className="space-y-3">
            {renderToggle(
              policy.geoFenceEnabled,
              (v) => setPolicy({ ...policy, geoFenceEnabled: v }),
              'Enable Geo-Fence Validation',
            )}
            {renderToggle(
              policy.wifiValidationEnabled,
              (v) => setPolicy({ ...policy, wifiValidationEnabled: v }),
              'Enable WiFi Validation',
            )}
            {policy.wifiValidationEnabled && (
              <div className="pt-2">
                <label className="block text-xs font-medium text-text-muted mb-1">Allowed WiFi Networks (comma separated)</label>
                <textarea
                  value={policy.allowedWifiNetworks}
                  onChange={(e) => setPolicy({ ...policy, allowedWifiNetworks: e.target.value })}
                  rows={3}
                  placeholder="Office-WiFi-5G, Office-WiFi-2.4G, Guest-Network"
                  className={`${inputClassName} text-sm`}
                />
              </div>
            )}
          </div>
        </div>

        {/* Payroll Integration */}
        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold text-text">Payroll Integration</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Payroll Cutoff Day</label>
              <input
                type="number"
                value={policy.payrollCutoffDay}
                onChange={(e) => setPolicy({ ...policy, payrollCutoffDay: parseInt(e.target.value) || 1 })}
                min={1}
                max={31}
                className={`${inputClassName} text-sm`}
              />
            </div>
            <div className="flex items-end pb-1">
              {renderToggle(
                policy.lockAfterPayroll,
                (v) => setPolicy({ ...policy, lockAfterPayroll: v }),
                'Lock After Payroll',
              )}
            </div>
          </div>
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
