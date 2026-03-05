'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  X,
  Palmtree,
} from 'lucide-react';

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700',
  approved: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-700',
};

const STATUS_DOT_COLORS: Record<string, string> = {
  pending: 'bg-yellow-400',
  approved: 'bg-green-500',
  rejected: 'bg-red-500',
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface CalendarDay {
  date: string;
  isWeekend: boolean;
  isToday: boolean;
  myLeave: {
    status: string;
    leaveTypeName: string;
    isHalfDay: boolean;
    halfDayType: string | null;
  } | null;
  holiday: {
    name: string;
    type: string;
  } | null;
  teamOnLeaveCount: number;
}

interface LongWeekend {
  startDate: string;
  endDate: string;
  days: number;
  holidays: string[];
}

interface DayDetail {
  date: string;
  myLeave: {
    status: string;
    leaveTypeName: string;
    isHalfDay: boolean;
    halfDayType: string | null;
    reason: string;
  } | null;
  holiday: {
    name: string;
    type: string;
  } | null;
  teamMembers: {
    name: string;
    leaveType: string;
    status: string;
  }[];
}

export default function LeaveCalendarTab() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState(now.getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(now.getFullYear());

  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [longWeekends, setLongWeekends] = useState<LongWeekend[]>([]);

  // Selected day detail
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dayDetail, setDayDetail] = useState<DayDetail | null>(null);

  const loadCalendar = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [calRes, lwRes] = await Promise.all([
        api.get(`/leave-management/employee/calendar/monthly?month=${currentMonth}&year=${currentYear}`),
        api.get('/leave-management/employee/calendar/long-weekends').catch(() => ({ data: [] })),
      ]);

      const days = Array.isArray(calRes.data) ? calRes.data : calRes.data?.days || calRes.data?.data || [];
      setCalendarDays(days);

      const lw = Array.isArray(lwRes.data) ? lwRes.data : lwRes.data?.data || [];
      setLongWeekends(lw);
    } catch {
      setError('Failed to load calendar data.');
    } finally {
      setIsLoading(false);
    }
  }, [currentMonth, currentYear]);

  useEffect(() => {
    loadCalendar();
  }, [loadCalendar]);

  const navigateMonth = (direction: -1 | 1) => {
    let newMonth = currentMonth + direction;
    let newYear = currentYear;
    if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    } else if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    }
    setCurrentMonth(newMonth);
    setCurrentYear(newYear);
    setSelectedDate(null);
    setDayDetail(null);
  };

  const handleDayClick = (day: CalendarDay) => {
    if (selectedDate === day.date) {
      setSelectedDate(null);
      setDayDetail(null);
      return;
    }
    setSelectedDate(day.date);
    // Build detail from calendar data
    setDayDetail({
      date: day.date,
      myLeave: day.myLeave
        ? { ...day.myLeave, reason: '' }
        : null,
      holiday: day.holiday,
      teamMembers: [],
    });
  };

  const getMonthName = (month: number) => {
    const date = new Date(2000, month - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'long' });
  };

  // Build calendar grid
  const firstDayOfMonth = new Date(currentYear, currentMonth - 1, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();

  // Build a map from date string to CalendarDay for quick lookup
  const dayMap = new Map<string, CalendarDay>();
  calendarDays.forEach((d) => {
    const dateStr = new Date(d.date).toISOString().split('T')[0];
    dayMap.set(dateStr, d);
  });

  // Build grid cells
  const gridCells: (CalendarDay | null)[] = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    gridCells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const calDay = dayMap.get(dateStr) || {
      date: dateStr,
      isWeekend: new Date(currentYear, currentMonth - 1, day).getDay() === 0 || new Date(currentYear, currentMonth - 1, day).getDay() === 6,
      isToday: dateStr === new Date().toISOString().split('T')[0],
      myLeave: null,
      holiday: null,
      teamOnLeaveCount: 0,
    };
    gridCells.push(calDay);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-center gap-2">
        <AlertCircle className="h-4 w-4 flex-shrink-0" />
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-text">Leave Calendar</h2>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigateMonth(-1)}
            className="p-1.5 rounded-lg border border-border hover:bg-background transition-colors"
          >
            <ChevronLeft className="h-4 w-4 text-text" />
          </button>
          <span className="text-sm font-semibold text-text min-w-[140px] text-center">
            {getMonthName(currentMonth)} {currentYear}
          </span>
          <button
            type="button"
            onClick={() => navigateMonth(1)}
            className="p-1.5 rounded-lg border border-border hover:bg-background transition-colors"
          >
            <ChevronRight className="h-4 w-4 text-text" />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-text-muted">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span>Approved</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <span>Pending</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span>Rejected</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-indigo-500" />
          <span>Holiday</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-gray-300" />
          <span>Weekend</span>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="border border-border rounded-xl overflow-hidden">
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 bg-background border-b border-border">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="text-center py-2.5 text-xs font-semibold text-text-muted uppercase"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Day Cells */}
        <div className="grid grid-cols-7">
          {gridCells.map((cell, idx) => {
            if (!cell) {
              return <div key={`empty-${idx}`} className="border-b border-r border-border bg-background/30 min-h-[80px]" />;
            }

            const dayNum = new Date(cell.date).getDate();
            const isSelected = selectedDate === cell.date;
            const hasLeave = !!cell.myLeave;
            const hasHoliday = !!cell.holiday;

            return (
              <div
                key={cell.date}
                onClick={() => handleDayClick(cell)}
                className={`border-b border-r border-border min-h-[80px] p-1.5 cursor-pointer transition-colors relative ${
                  cell.isWeekend ? 'bg-gray-50' : 'bg-card'
                } ${cell.isToday ? 'ring-2 ring-inset ring-primary/30' : ''} ${
                  isSelected ? 'bg-primary/5' : 'hover:bg-background/50'
                }`}
              >
                {/* Day Number */}
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-xs font-medium ${
                      cell.isToday
                        ? 'bg-primary text-white w-5 h-5 rounded-full flex items-center justify-center'
                        : cell.isWeekend
                        ? 'text-text-muted'
                        : 'text-text'
                    }`}
                  >
                    {dayNum}
                  </span>
                  {cell.teamOnLeaveCount > 0 && (
                    <span className="text-[10px] bg-orange-100 text-orange-700 px-1 rounded font-medium">
                      {cell.teamOnLeaveCount}
                    </span>
                  )}
                </div>

                {/* Markers */}
                <div className="space-y-0.5">
                  {hasHoliday && (
                    <div className="text-[10px] bg-indigo-50 text-indigo-700 px-1 rounded truncate">
                      {cell.holiday!.name}
                    </div>
                  )}
                  {hasLeave && (
                    <div className="flex items-center gap-1">
                      <div
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          STATUS_DOT_COLORS[cell.myLeave!.status] || 'bg-gray-400'
                        }`}
                      />
                      <span className="text-[10px] text-text-muted truncate">
                        {cell.myLeave!.leaveTypeName}
                        {cell.myLeave!.isHalfDay && ' (H)'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Day Detail Panel */}
      {selectedDate && dayDetail && (
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-text">
              {new Date(dayDetail.date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </h3>
            <button
              type="button"
              onClick={() => { setSelectedDate(null); setDayDetail(null); }}
              className="text-text-muted hover:text-text"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-3">
            {/* Holiday */}
            {dayDetail.holiday && (
              <div className="flex items-center gap-2 text-sm bg-indigo-50 text-indigo-700 rounded-lg px-3 py-2">
                <Palmtree className="h-4 w-4 flex-shrink-0" />
                <span className="font-medium">{dayDetail.holiday.name}</span>
                <span className="text-xs opacity-75">({dayDetail.holiday.type})</span>
              </div>
            )}

            {/* My Leave */}
            {dayDetail.myLeave && (
              <div className="text-sm">
                <p className="font-medium text-text mb-1">My Leave</p>
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      STATUS_STYLES[dayDetail.myLeave.status] || 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {dayDetail.myLeave.status}
                  </span>
                  <span className="text-text-muted">{dayDetail.myLeave.leaveTypeName}</span>
                  {dayDetail.myLeave.isHalfDay && (
                    <span className="text-xs text-text-muted">
                      ({dayDetail.myLeave.halfDayType === 'first_half' ? 'First Half' : 'Second Half'})
                    </span>
                  )}
                </div>
                {dayDetail.myLeave.reason && (
                  <p className="text-xs text-text-muted mt-1">{dayDetail.myLeave.reason}</p>
                )}
              </div>
            )}

            {/* Team Members on Leave */}
            {dayDetail.teamMembers && dayDetail.teamMembers.length > 0 && (
              <div className="text-sm">
                <p className="font-medium text-text mb-2">Team on Leave</p>
                <div className="space-y-1.5">
                  {dayDetail.teamMembers.map((tm, idx) => (
                    <div key={idx} className="flex items-center justify-between py-1 text-xs">
                      <span className="text-text font-medium">{tm.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-text-muted">{tm.leaveType}</span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            STATUS_STYLES[tm.status] || 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {tm.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No Info */}
            {!dayDetail.holiday && !dayDetail.myLeave && dayDetail.teamMembers.length === 0 && (
              <p className="text-sm text-text-muted">No leave or holiday information for this day.</p>
            )}
          </div>
        </div>
      )}

      {/* Long Weekends */}
      {longWeekends.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <Palmtree className="h-4 w-4 text-indigo-500" />
            <h3 className="text-base font-semibold text-text">Upcoming Long Weekends</h3>
          </div>
          <div className="space-y-3">
            {longWeekends.map((lw, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between py-2.5 border-b border-border last:border-0"
              >
                <div>
                  <p className="text-sm font-medium text-text">
                    {new Date(lw.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    {' - '}
                    {new Date(lw.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                  <p className="text-xs text-text-muted">{lw.holidays.join(', ')}</p>
                </div>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                  {lw.days} days
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
