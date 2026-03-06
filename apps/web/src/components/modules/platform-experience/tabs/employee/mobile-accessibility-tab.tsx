'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Settings,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Sun,
  Moon,
  Monitor,
  Bell,
  Mail,
  Smartphone,
  MessageSquare,
} from 'lucide-react';

interface UserPreferences {
  theme: string;
  locale: string;
  dateFormat: string;
  fontSize: number;
  highContrast: boolean;
  reduceMotion: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
  inAppNotifications: boolean;
  smsNotifications: boolean;
}

const LOCALE_OPTIONS = [
  { value: 'en-US', label: 'English (US)' },
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'en-IN', label: 'English (India)' },
  { value: 'hi-IN', label: 'Hindi' },
  { value: 'fr-FR', label: 'French' },
  { value: 'de-DE', label: 'German' },
  { value: 'es-ES', label: 'Spanish' },
  { value: 'ja-JP', label: 'Japanese' },
];

const DATE_FORMAT_OPTIONS = [
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
  { value: 'DD-MMM-YYYY', label: 'DD-MMM-YYYY' },
];

const THEME_OPTIONS = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

export default function MobileAccessibilityTab() {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/platform-experience/employee/preferences');
      const data = res.data?.data || res.data || {};
      setPreferences({
        theme: data.theme || 'light',
        locale: data.locale || 'en-US',
        dateFormat: data.dateFormat || 'MM/DD/YYYY',
        fontSize: data.fontSize || 14,
        highContrast: data.highContrast ?? false,
        reduceMotion: data.reduceMotion ?? false,
        emailNotifications: data.emailNotifications ?? true,
        pushNotifications: data.pushNotifications ?? true,
        inAppNotifications: data.inAppNotifications ?? true,
        smsNotifications: data.smsNotifications ?? false,
      });
    } catch {
      setError('Failed to load preferences.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async () => {
    if (!preferences) return;
    try {
      setSaving(true);
      setError('');
      await api.patch('/platform-experience/employee/preferences', preferences);
      setSuccess('Preferences saved successfully.');
    } catch {
      setError('Failed to save preferences.');
    } finally {
      setSaving(false);
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

  if (error && !preferences) {
    return (
      <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
        <AlertCircle className="h-4 w-4 shrink-0" />
        {error}
      </div>
    );
  }

  if (!preferences) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Settings className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-text">Preferences &amp; Accessibility</h2>
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

      {/* Theme Selector */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-text uppercase tracking-wider mb-3">Theme</h3>
        <div className="grid grid-cols-3 gap-4">
          {THEME_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isSelected = preferences.theme === option.value;
            return (
              <button
                key={option.value}
                onClick={() => setPreferences({ ...preferences, theme: option.value })}
                className={`p-5 rounded-xl border-2 transition-colors text-center ${
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-background hover:border-primary/30'
                }`}
              >
                <Icon className={`h-8 w-8 mx-auto mb-2 ${isSelected ? 'text-primary' : 'text-text-muted'}`} />
                <p className={`text-sm font-medium ${isSelected ? 'text-primary' : 'text-text'}`}>{option.label}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Locale & Date Format */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-text uppercase tracking-wider mb-3">Regional Settings</h3>
        <div className="bg-background rounded-xl border border-border p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text mb-1">Locale</label>
              <select
                value={preferences.locale}
                onChange={(e) => setPreferences({ ...preferences, locale: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary appearance-none"
              >
                {LOCALE_OPTIONS.map((l) => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1">Date Format</label>
              <select
                value={preferences.dateFormat}
                onChange={(e) => setPreferences({ ...preferences, dateFormat: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary appearance-none"
              >
                {DATE_FORMAT_OPTIONS.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Accessibility Settings */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-text uppercase tracking-wider mb-3">Accessibility</h3>
        <div className="bg-background rounded-xl border border-border p-6 space-y-5">
          {/* Font Size Slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-text">Font Size</label>
              <span className="text-sm text-text-muted">{preferences.fontSize}px</span>
            </div>
            <input
              type="range"
              min={12}
              max={20}
              step={1}
              value={preferences.fontSize}
              onChange={(e) => setPreferences({ ...preferences, fontSize: parseInt(e.target.value) })}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between text-xs text-text-muted mt-1">
              <span>Small (12px)</span>
              <span>Large (20px)</span>
            </div>
          </div>

          {/* High Contrast Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text">High Contrast</p>
              <p className="text-xs text-text-muted">Increase contrast for better visibility</p>
            </div>
            <button
              onClick={() => setPreferences({ ...preferences, highContrast: !preferences.highContrast })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.highContrast ? 'bg-primary' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences.highContrast ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Reduce Motion Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text">Reduce Motion</p>
              <p className="text-xs text-text-muted">Minimize animations and transitions</p>
            </div>
            <button
              onClick={() => setPreferences({ ...preferences, reduceMotion: !preferences.reduceMotion })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.reduceMotion ? 'bg-primary' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences.reduceMotion ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Notification Channel Toggles */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-text uppercase tracking-wider mb-3">Notification Channels</h3>
        <div className="bg-background rounded-xl border border-border p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-text-muted" />
              <div>
                <p className="text-sm font-medium text-text">Email Notifications</p>
                <p className="text-xs text-text-muted">Receive notifications via email</p>
              </div>
            </div>
            <button
              onClick={() => setPreferences({ ...preferences, emailNotifications: !preferences.emailNotifications })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.emailNotifications ? 'bg-primary' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences.emailNotifications ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Smartphone className="h-4 w-4 text-text-muted" />
              <div>
                <p className="text-sm font-medium text-text">Push Notifications</p>
                <p className="text-xs text-text-muted">Receive push notifications on your device</p>
              </div>
            </div>
            <button
              onClick={() => setPreferences({ ...preferences, pushNotifications: !preferences.pushNotifications })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.pushNotifications ? 'bg-primary' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences.pushNotifications ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="h-4 w-4 text-text-muted" />
              <div>
                <p className="text-sm font-medium text-text">In-App Notifications</p>
                <p className="text-xs text-text-muted">Show notifications within the application</p>
              </div>
            </div>
            <button
              onClick={() => setPreferences({ ...preferences, inAppNotifications: !preferences.inAppNotifications })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.inAppNotifications ? 'bg-primary' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences.inAppNotifications ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-4 w-4 text-text-muted" />
              <div>
                <p className="text-sm font-medium text-text">SMS Notifications</p>
                <p className="text-xs text-text-muted">Receive notifications via text message</p>
              </div>
            </div>
            <button
              onClick={() => setPreferences({ ...preferences, smsNotifications: !preferences.smsNotifications })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.smsNotifications ? 'bg-primary' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences.smsNotifications ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Preferences'}
        </button>
      </div>
    </div>
  );
}
