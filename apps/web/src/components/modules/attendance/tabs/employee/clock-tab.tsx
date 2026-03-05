'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  Clock,
  Play,
  Square,
  Coffee,
  MapPin,
  Monitor,
  Home,
  Smartphone,
  Timer,
  CheckCircle2,
  ChevronDown,
} from 'lucide-react';

const inputClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary';

interface ClockStatus {
  isClockedIn: boolean;
  clockInTime: string | null;
  clockInMethod: string | null;
  isOnBreak: boolean;
  breakStartTime: string | null;
  breakType: string | null;
  shiftName: string | null;
  shiftStart: string | null;
  shiftEnd: string | null;
  todayLogs: TimelineEntry[];
  totalWorkedMinutes: number;
  totalBreakMinutes: number;
  overtimeMinutes: number;
}

interface TimelineEntry {
  id: string;
  type: 'clock_in' | 'clock_out' | 'break_start' | 'break_end';
  timestamp: string;
  method?: string;
  breakType?: string;
  note?: string;
}

const CLOCK_METHODS = [
  { value: 'web', label: 'Web', icon: Monitor },
  { value: 'wfh', label: 'WFH', icon: Home },
  { value: 'mobile', label: 'Mobile', icon: Smartphone },
];

const BREAK_TYPES = [
  { value: 'lunch', label: 'Lunch Break' },
  { value: 'tea', label: 'Tea Break' },
  { value: 'personal', label: 'Personal Break' },
];

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

function formatTimeShort(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function formatElapsed(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const mins = Math.floor(totalMinutes % 60);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function getElapsedMinutes(fromIso: string): number {
  const start = new Date(fromIso).getTime();
  const now = Date.now();
  return Math.max(0, (now - start) / 60000);
}

export default function ClockTab() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isActioning, setIsActioning] = useState(false);

  const [status, setStatus] = useState<ClockStatus | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [elapsedWork, setElapsedWork] = useState(0);
  const [elapsedBreak, setElapsedBreak] = useState(0);

  // Clock-in form
  const [clockMethod, setClockMethod] = useState('web');
  const [clockRemarks, setClockRemarks] = useState('');

  // Break form
  const [breakType, setBreakType] = useState('lunch');
  const [showBreakSelector, setShowBreakSelector] = useState(false);

  // Real-time clock: update every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Update elapsed timers every second
  useEffect(() => {
    if (!status?.isClockedIn || !status.clockInTime) return;

    const timer = setInterval(() => {
      const totalElapsed = getElapsedMinutes(status.clockInTime!);
      setElapsedWork(totalElapsed - (status.totalBreakMinutes || 0));

      if (status.isOnBreak && status.breakStartTime) {
        setElapsedBreak(getElapsedMinutes(status.breakStartTime));
      }
    }, 1000);

    // Run immediately
    const totalElapsed = getElapsedMinutes(status.clockInTime);
    setElapsedWork(totalElapsed - (status.totalBreakMinutes || 0));
    if (status.isOnBreak && status.breakStartTime) {
      setElapsedBreak(getElapsedMinutes(status.breakStartTime));
    }

    return () => clearInterval(timer);
  }, [status]);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await api.get('/attendance/employee/clock/status');
      setStatus(res.data);
    } catch {
      setError('Failed to load attendance status.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load status on mount
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Poll status every 30 seconds
  useEffect(() => {
    const poller = setInterval(() => {
      fetchStatus();
    }, 30000);
    return () => clearInterval(poller);
  }, [fetchStatus]);

  const showSuccessMessage = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3000);
  };

  const getGeolocation = (): Promise<{ lat: number; lng: number } | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(null),
        { timeout: 5000 }
      );
    });
  };

  const handleClockIn = async () => {
    setError(null);
    setIsActioning(true);
    try {
      const geo = await getGeolocation();
      await api.post('/attendance/employee/clock/in', {
        method: clockMethod,
        remarks: clockRemarks || undefined,
        latitude: geo?.lat,
        longitude: geo?.lng,
      });
      setClockRemarks('');
      showSuccessMessage('Clocked in successfully!');
      await fetchStatus();
    } catch {
      setError('Failed to clock in. Please try again.');
    } finally {
      setIsActioning(false);
    }
  };

  const handleClockOut = async () => {
    setError(null);
    setIsActioning(true);
    try {
      const geo = await getGeolocation();
      await api.post('/attendance/employee/clock/out', {
        method: clockMethod,
        latitude: geo?.lat,
        longitude: geo?.lng,
      });
      showSuccessMessage('Clocked out successfully!');
      await fetchStatus();
    } catch {
      setError('Failed to clock out. Please try again.');
    } finally {
      setIsActioning(false);
    }
  };

  const handleStartBreak = async () => {
    setError(null);
    setIsActioning(true);
    try {
      await api.post('/attendance/employee/clock/break/start', {
        breakType,
      });
      setShowBreakSelector(false);
      showSuccessMessage('Break started.');
      await fetchStatus();
    } catch {
      setError('Failed to start break.');
    } finally {
      setIsActioning(false);
    }
  };

  const handleEndBreak = async () => {
    setError(null);
    setIsActioning(true);
    try {
      await api.post('/attendance/employee/clock/break/end');
      showSuccessMessage('Break ended.');
      await fetchStatus();
    } catch {
      setError('Failed to end break.');
    } finally {
      setIsActioning(false);
    }
  };

  const getTimelineIcon = (type: string) => {
    switch (type) {
      case 'clock_in':
        return <Play className="h-3.5 w-3.5 text-green-600" />;
      case 'clock_out':
        return <Square className="h-3.5 w-3.5 text-red-600" />;
      case 'break_start':
        return <Coffee className="h-3.5 w-3.5 text-yellow-600" />;
      case 'break_end':
        return <Play className="h-3.5 w-3.5 text-blue-600" />;
      default:
        return <Clock className="h-3.5 w-3.5 text-text-muted" />;
    }
  };

  const getTimelineLabel = (entry: TimelineEntry) => {
    switch (entry.type) {
      case 'clock_in':
        return `Clocked In${entry.method ? ` (${entry.method.toUpperCase()})` : ''}`;
      case 'clock_out':
        return `Clocked Out${entry.method ? ` (${entry.method.toUpperCase()})` : ''}`;
      case 'break_start':
        return `Break Started${entry.breakType ? ` - ${entry.breakType}` : ''}`;
      case 'break_end':
        return 'Break Ended';
      default:
        return entry.type;
    }
  };

  const getTimelineDotColor = (type: string) => {
    switch (type) {
      case 'clock_in':
        return 'bg-green-500';
      case 'clock_out':
        return 'bg-red-500';
      case 'break_start':
        return 'bg-yellow-500';
      case 'break_end':
        return 'bg-blue-500';
      default:
        return 'bg-gray-400';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading attendance status...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Messages */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          {success}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Real-Time Clock Display */}
      <div className="text-center py-4">
        <div className="text-5xl font-mono font-bold text-text tracking-wider">
          {formatTime(currentTime)}
        </div>
        <p className="text-sm text-text-muted mt-2">
          {currentTime.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      {/* Current Status Card */}
      <div
        className={`rounded-xl border-2 p-5 text-center ${
          status?.isClockedIn
            ? 'border-green-200 bg-green-50/50'
            : 'border-border bg-background'
        }`}
      >
        <div className="flex items-center justify-center gap-2 mb-1">
          <div
            className={`w-3 h-3 rounded-full ${
              status?.isClockedIn
                ? status?.isOnBreak
                  ? 'bg-yellow-500 animate-pulse'
                  : 'bg-green-500 animate-pulse'
                : 'bg-gray-400'
            }`}
          />
          <span className="text-lg font-semibold text-text">
            {status?.isClockedIn
              ? status?.isOnBreak
                ? 'On Break'
                : 'Clocked In'
              : 'Not Clocked In'}
          </span>
        </div>

        {status?.isClockedIn && status.clockInTime && (
          <div className="flex items-center justify-center gap-6 mt-3 text-sm text-text-muted">
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              <span>In at {formatTimeShort(status.clockInTime)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Timer className="h-4 w-4" />
              <span>Working: {formatElapsed(elapsedWork)}</span>
            </div>
            {status.shiftName && (
              <div className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                <span>
                  {status.shiftName} ({status.shiftStart} - {status.shiftEnd})
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Clock In Section (when NOT clocked in) */}
      {!status?.isClockedIn && (
        <div className="bg-card rounded-xl border border-border p-6 space-y-5">
          <h3 className="text-base font-semibold text-text">Start Your Day</h3>

          {/* Method Selector */}
          <div>
            <label className="block text-sm font-medium text-text mb-2">
              Clock-in Method
            </label>
            <div className="flex gap-3">
              {CLOCK_METHODS.map((m) => {
                const Icon = m.icon;
                const isSelected = clockMethod === m.value;
                return (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setClockMethod(m.value)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border-2 transition-colors ${
                      isSelected
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border text-text-muted hover:border-primary/40 hover:text-text'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-sm font-medium text-text mb-1.5">
              Remarks <span className="text-text-muted font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={clockRemarks}
              onChange={(e) => setClockRemarks(e.target.value)}
              placeholder="e.g., Working from client site today"
              className={inputClassName}
            />
          </div>

          {/* Clock In Button */}
          <button
            type="button"
            onClick={handleClockIn}
            disabled={isActioning}
            className="w-full py-4 rounded-xl text-lg font-semibold bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-3"
          >
            {isActioning ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <Play className="h-6 w-6" />
            )}
            Clock In
          </button>
        </div>
      )}

      {/* Clocked In Controls */}
      {status?.isClockedIn && (
        <div className="space-y-4">
          {/* Break Controls */}
          <div className="bg-card rounded-xl border border-border p-5">
            <h3 className="text-base font-semibold text-text mb-4">Break Controls</h3>

            {!status.isOnBreak ? (
              <div className="space-y-3">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowBreakSelector(!showBreakSelector)}
                    className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg border border-border text-sm text-text hover:bg-background transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Coffee className="h-4 w-4 text-text-muted" />
                      {BREAK_TYPES.find((b) => b.value === breakType)?.label || 'Select Break Type'}
                    </span>
                    <ChevronDown className={`h-4 w-4 text-text-muted transition-transform ${showBreakSelector ? 'rotate-180' : ''}`} />
                  </button>

                  {showBreakSelector && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-10 overflow-hidden">
                      {BREAK_TYPES.map((bt) => (
                        <button
                          key={bt.value}
                          type="button"
                          onClick={() => {
                            setBreakType(bt.value);
                            setShowBreakSelector(false);
                          }}
                          className={`w-full px-4 py-2.5 text-left text-sm hover:bg-background transition-colors ${
                            breakType === bt.value ? 'bg-primary/5 text-primary font-medium' : 'text-text'
                          }`}
                        >
                          {bt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleStartBreak}
                  disabled={isActioning}
                  className="w-full py-3 rounded-lg text-sm font-semibold bg-yellow-500 text-white hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {isActioning ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Coffee className="h-4 w-4" />
                  )}
                  Start Break
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                  <p className="text-sm text-yellow-700 font-medium">
                    On {status.breakType || 'Break'}
                  </p>
                  <p className="text-3xl font-mono font-bold text-yellow-800 mt-1">
                    {formatElapsed(elapsedBreak)}
                  </p>
                  <p className="text-xs text-yellow-600 mt-1">
                    Started at {status.breakStartTime ? formatTimeShort(status.breakStartTime) : '--'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleEndBreak}
                  disabled={isActioning}
                  className="w-full py-3 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {isActioning ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  End Break
                </button>
              </div>
            )}
          </div>

          {/* Clock Out Button */}
          <button
            type="button"
            onClick={handleClockOut}
            disabled={isActioning || status.isOnBreak}
            className="w-full py-4 rounded-xl text-lg font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-3"
            title={status.isOnBreak ? 'End your break before clocking out' : undefined}
          >
            {isActioning ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <Square className="h-6 w-6" />
            )}
            Clock Out
          </button>
          {status.isOnBreak && (
            <p className="text-xs text-text-muted text-center">
              Please end your break before clocking out.
            </p>
          )}
        </div>
      )}

      {/* Today's Timeline */}
      {status?.todayLogs && status.todayLogs.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-base font-semibold text-text mb-4">Today&apos;s Timeline</h3>

          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-border" />

            <div className="space-y-4">
              {status.todayLogs.map((entry) => (
                <div key={entry.id} className="flex items-start gap-3 relative">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${getTimelineDotColor(entry.type)} bg-opacity-20 border-2 border-current`}
                    style={{ borderColor: 'transparent' }}
                  >
                    <div className={`w-2.5 h-2.5 rounded-full ${getTimelineDotColor(entry.type)}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-text flex items-center gap-1.5">
                        {getTimelineIcon(entry.type)}
                        {getTimelineLabel(entry)}
                      </span>
                      <span className="text-xs text-text-muted font-mono">
                        {formatTimeShort(entry.timestamp)}
                      </span>
                    </div>
                    {entry.note && (
                      <p className="text-xs text-text-muted mt-0.5">{entry.note}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Summary Stats */}
          <div className="mt-5 pt-4 border-t border-border grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-xs text-text-muted">Total Worked</p>
              <p className="text-lg font-semibold text-text">
                {formatElapsed(status.totalWorkedMinutes || 0)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-text-muted">Break Time</p>
              <p className="text-lg font-semibold text-text">
                {formatElapsed(status.totalBreakMinutes || 0)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-text-muted">Overtime</p>
              <p className={`text-lg font-semibold ${(status.overtimeMinutes || 0) > 0 ? 'text-green-700' : 'text-text'}`}>
                {formatElapsed(status.overtimeMinutes || 0)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Empty Timeline State */}
      {(!status?.todayLogs || status.todayLogs.length === 0) && !status?.isClockedIn && (
        <div className="bg-card rounded-xl border border-border p-8 text-center">
          <Clock className="h-10 w-10 text-text-muted mx-auto mb-3" />
          <p className="text-sm text-text-muted">No activity logged today.</p>
          <p className="text-xs text-text-muted mt-1">Clock in to start tracking your work hours.</p>
        </div>
      )}
    </div>
  );
}
