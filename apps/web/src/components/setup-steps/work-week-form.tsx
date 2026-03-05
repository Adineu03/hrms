'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { api } from '@/lib/api';
import type { WorkWeekData } from '@hrms/shared';
import { Loader2, CheckCircle2 } from 'lucide-react';

const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const TIMEZONES = [
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST)' },
  { value: 'America/New_York', label: 'America/New_York (EST)' },
  { value: 'Europe/London', label: 'Europe/London (GMT)' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST)' },
  { value: 'UTC', label: 'UTC' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GST)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST)' },
  { value: 'Europe/Berlin', label: 'Europe/Berlin (CET)' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney (AEST)' },
];

interface WorkWeekFormProps {
  onComplete: () => void;
}

export default function WorkWeekForm({ onComplete }: WorkWeekFormProps) {
  const [formData, setFormData] = useState<WorkWeekData>({
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    startTime: '09:00',
    endTime: '18:00',
    timezone: 'Asia/Kolkata',
  });
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function loadWorkWeek() {
      try {
        const res = await api.get<WorkWeekData>('/cold-start/work-week');
        if (res.data) {
          setFormData({
            days: res.data.days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
            startTime: res.data.startTime || '09:00',
            endTime: res.data.endTime || '18:00',
            timezone: res.data.timezone || 'Asia/Kolkata',
          });
        }
      } catch {
        // No existing data — use defaults
      } finally {
        setIsLoadingData(false);
      }
    }
    loadWorkWeek();
  }, []);

  const toggleDay = (day: string) => {
    setFormData((prev) => ({
      ...prev,
      days: prev.days.includes(day) ? prev.days.filter((d) => d !== day) : [...prev.days, day],
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (formData.days.length === 0) {
      setError('Please select at least one working day.');
      return;
    }
    setError(null);
    setIsSaving(true);

    try {
      await api.post('/cold-start/work-week', formData);
      setSuccess(true);
      setTimeout(() => {
        onComplete();
      }, 800);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr?.response?.data?.message || 'Failed to save work week configuration.');
    } finally {
      setIsSaving(false);
    }
  };

  const inputClassName =
    'w-full px-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary';

  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading work week...</span>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <CheckCircle2 className="h-10 w-10 text-accent mb-3" />
        <p className="text-text font-medium">Work week saved!</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">
      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Working Days */}
      <div>
        <label className="block text-sm font-medium text-text mb-3">Working Days</label>
        <div className="flex flex-wrap gap-2">
          {ALL_DAYS.map((day) => {
            const isSelected = formData.days.includes(day);
            return (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
                  isSelected
                    ? 'bg-primary text-white border-primary'
                    : 'bg-background text-text border-border hover:border-primary hover:text-primary'
                }`}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>

      {/* Start & End Time */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="startTime" className="block text-sm font-medium text-text mb-1.5">
            Start Time
          </label>
          <input
            id="startTime"
            type="time"
            required
            value={formData.startTime}
            onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
            className={inputClassName}
          />
        </div>
        <div>
          <label htmlFor="endTime" className="block text-sm font-medium text-text mb-1.5">
            End Time
          </label>
          <input
            id="endTime"
            type="time"
            required
            value={formData.endTime}
            onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
            className={inputClassName}
          />
        </div>
      </div>

      {/* Timezone */}
      <div>
        <label htmlFor="timezone" className="block text-sm font-medium text-text mb-1.5">
          Timezone
        </label>
        <select
          id="timezone"
          required
          value={formData.timezone}
          onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
          className={`${inputClassName} appearance-none`}
        >
          {TIMEZONES.map((tz) => (
            <option key={tz.value} value={tz.value}>
              {tz.label}
            </option>
          ))}
        </select>
      </div>

      {/* Submit */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save & Continue'
          )}
        </button>
      </div>
    </form>
  );
}
