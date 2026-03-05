'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  Target,
  Clock,
  Flame,
  Coffee,
  Award,
  TrendingUp,
  TrendingDown,
  Minus,
  Star,
  Zap,
  Sun,
  Shield,
} from 'lucide-react';

interface PunctualityData {
  score: number;
  onTimeDays: number;
  totalDays: number;
  avgLateMinutes: number;
}

interface WorkHoursData {
  avgPerDay: number;
  avgPerWeek: number;
  teamAvgPerDay: number;
  comparedToTeam: 'higher' | 'lower' | 'equal';
  differenceMinutes: number;
}

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastBreakDate: string | null;
}

interface BreakAnalysis {
  avgBreakMinutes: number;
  breakdown: Array<{
    type: string;
    avgMinutes: number;
    count: number;
  }>;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  earned: boolean;
  earnedDate: string | null;
  icon: string;
}

const ACHIEVEMENT_ICONS: Record<string, typeof Star> = {
  perfect_attendance: Shield,
  early_bird: Sun,
  streak_7: Flame,
  streak_30: Zap,
  streak_90: Star,
  no_breaks_abused: Coffee,
  consistent_hours: Clock,
};

function CircularProgress({ percentage, size = 120, strokeWidth = 10 }: { percentage: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  const getColor = (pct: number) => {
    if (pct >= 90) return '#16a34a'; // green-600
    if (pct >= 70) return '#ca8a04'; // yellow-600
    return '#dc2626'; // red-600
  };

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e5e5e5"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getColor(percentage)}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-text">{Math.round(percentage)}%</span>
      </div>
    </div>
  );
}

export default function AttendanceInsightsTab() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [punctuality, setPunctuality] = useState<PunctualityData | null>(null);
  const [workHours, setWorkHours] = useState<WorkHoursData | null>(null);
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [breakAnalysis, setBreakAnalysis] = useState<BreakAnalysis | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  const fetchInsights = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [punctRes, workRes, streakRes, breakRes, achieveRes] = await Promise.all([
        api.get('/attendance/employee/insights/punctuality'),
        api.get('/attendance/employee/insights/work-hours'),
        api.get('/attendance/employee/insights/streak'),
        api.get('/attendance/employee/insights/break-analysis'),
        api.get('/attendance/employee/insights/achievements'),
      ]);
      setPunctuality(punctRes.data);
      setWorkHours(workRes.data);
      setStreak(streakRes.data);
      setBreakAnalysis(breakRes.data);
      setAchievements(Array.isArray(achieveRes.data) ? achieveRes.data : achieveRes.data.data || []);
    } catch {
      setError('Failed to load attendance insights.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  const getComparisonIcon = (compared: string) => {
    if (compared === 'higher') return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (compared === 'lower') return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-text-muted" />;
  };

  const getComparisonText = (compared: string, diffMinutes: number) => {
    const diffHours = (diffMinutes / 60).toFixed(1);
    if (compared === 'higher') return `${diffHours}h more than team avg`;
    if (compared === 'lower') return `${diffHours}h less than team avg`;
    return 'Same as team avg';
  };

  const getComparisonColor = (compared: string) => {
    if (compared === 'higher') return 'text-green-600';
    if (compared === 'lower') return 'text-red-600';
    return 'text-text-muted';
  };

  const getBreakTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'lunch':
        return 'bg-orange-100 text-orange-700';
      case 'tea':
        return 'bg-green-100 text-green-700';
      case 'personal':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading attendance insights...</span>
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
      {/* Top Row: Punctuality + Work Hours */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Punctuality Score */}
        {punctuality && (
          <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
            <h3 className="text-base font-semibold text-text flex items-center gap-2 mb-4">
              <Target className="h-5 w-5 text-primary" />
              Punctuality Score
            </h3>

            <div className="flex items-center gap-6">
              <CircularProgress percentage={punctuality.score} />
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-text-muted">On-time Days</p>
                  <p className="text-lg font-semibold text-text">
                    {punctuality.onTimeDays}{' '}
                    <span className="text-sm font-normal text-text-muted">
                      / {punctuality.totalDays}
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-text-muted">Avg Late</p>
                  <p className="text-lg font-semibold text-text">
                    {punctuality.avgLateMinutes.toFixed(0)}{' '}
                    <span className="text-sm font-normal text-text-muted">minutes</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Work Hours */}
        {workHours && (
          <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
            <h3 className="text-base font-semibold text-text flex items-center gap-2 mb-4">
              <Clock className="h-5 w-5 text-primary" />
              Work Hours
            </h3>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-text-muted">Avg Per Day</p>
                  <p className="text-2xl font-bold text-text">{workHours.avgPerDay.toFixed(1)}h</p>
                </div>
                <div>
                  <p className="text-xs text-text-muted">Avg Per Week</p>
                  <p className="text-2xl font-bold text-text">{workHours.avgPerWeek.toFixed(1)}h</p>
                </div>
              </div>

              <div className="bg-background rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-text-muted">Team Average</p>
                    <p className="text-sm font-semibold text-text">
                      {workHours.teamAvgPerDay.toFixed(1)}h/day
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {getComparisonIcon(workHours.comparedToTeam)}
                    <span className={`text-xs font-medium ${getComparisonColor(workHours.comparedToTeam)}`}>
                      {getComparisonText(workHours.comparedToTeam, workHours.differenceMinutes)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Middle Row: Streak + Break Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Attendance Streak */}
        {streak && (
          <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
            <h3 className="text-base font-semibold text-text flex items-center gap-2 mb-4">
              <Flame className="h-5 w-5 text-orange-500" />
              Attendance Streak
            </h3>

            <div className="space-y-4">
              <div className="text-center bg-orange-50 rounded-lg p-4">
                <p className="text-4xl font-bold text-orange-600">{streak.currentStreak}</p>
                <p className="text-sm text-orange-700 font-medium">Consecutive Days</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-text-muted">Longest Streak</p>
                  <p className="text-lg font-semibold text-text">
                    {streak.longestStreak}{' '}
                    <span className="text-xs font-normal text-text-muted">days</span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-text-muted">Last Break</p>
                  <p className="text-sm font-medium text-text">
                    {streak.lastBreakDate
                      ? new Date(streak.lastBreakDate + 'T00:00:00').toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })
                      : 'None'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Break Analysis */}
        {breakAnalysis && (
          <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
            <h3 className="text-base font-semibold text-text flex items-center gap-2 mb-4">
              <Coffee className="h-5 w-5 text-amber-600" />
              Break Analysis
            </h3>

            <div className="space-y-4">
              <div>
                <p className="text-xs text-text-muted">Average Break Time Per Day</p>
                <p className="text-2xl font-bold text-text">
                  {breakAnalysis.avgBreakMinutes.toFixed(0)}{' '}
                  <span className="text-sm font-normal text-text-muted">minutes</span>
                </p>
              </div>

              {breakAnalysis.breakdown.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-text-muted font-medium">Breakdown by Type</p>
                  {breakAnalysis.breakdown.map((bt) => (
                    <div
                      key={bt.type}
                      className="flex items-center justify-between bg-background rounded-lg px-3 py-2.5"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getBreakTypeColor(bt.type)}`}
                        >
                          {bt.type}
                        </span>
                        <span className="text-xs text-text-muted">{bt.count} times</span>
                      </div>
                      <span className="text-sm font-semibold text-text">
                        {bt.avgMinutes.toFixed(0)}m avg
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {breakAnalysis.breakdown.length === 0 && (
                <p className="text-sm text-text-muted text-center py-2">
                  No break data available yet.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Achievements */}
      {achievements.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
          <h3 className="text-base font-semibold text-text flex items-center gap-2 mb-4">
            <Award className="h-5 w-5 text-yellow-500" />
            Achievements
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {achievements.map((achievement) => {
              const IconComponent = ACHIEVEMENT_ICONS[achievement.icon] || Award;
              return (
                <div
                  key={achievement.id}
                  className={`rounded-lg border p-4 transition-colors ${
                    achievement.earned
                      ? 'border-yellow-200 bg-yellow-50/50'
                      : 'border-border bg-background opacity-60'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        achievement.earned
                          ? 'bg-yellow-100 text-yellow-600'
                          : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      <IconComponent className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p
                        className={`text-sm font-semibold ${
                          achievement.earned ? 'text-text' : 'text-text-muted'
                        }`}
                      >
                        {achievement.name}
                      </p>
                      <p className="text-xs text-text-muted mt-0.5">{achievement.description}</p>
                      {achievement.earned && achievement.earnedDate && (
                        <p className="text-xs text-yellow-700 mt-1 font-medium">
                          Earned{' '}
                          {new Date(achievement.earnedDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </p>
                      )}
                      {!achievement.earned && (
                        <p className="text-xs text-text-muted mt-1 italic">Not earned yet</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!punctuality && !workHours && !streak && !breakAnalysis && achievements.length === 0 && (
        <div className="bg-card rounded-xl border border-border p-8 text-center">
          <TrendingUp className="h-10 w-10 text-text-muted mx-auto mb-3" />
          <p className="text-sm text-text-muted">No insights data available yet.</p>
          <p className="text-xs text-text-muted mt-1">
            Insights will appear after you have some attendance history.
          </p>
        </div>
      )}
    </div>
  );
}
