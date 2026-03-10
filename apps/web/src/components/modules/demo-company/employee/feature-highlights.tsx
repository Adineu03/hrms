'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import {
  Clock,
  CalendarDays,
  FileText,
  ClipboardList,
  GraduationCap,
  ArrowRight,
  X,
  Sparkles,
} from 'lucide-react';

interface FeatureHighlight {
  id: string;
  iconKey: 'attendance' | 'leave' | 'payslip' | 'timesheet' | 'course';
  title: string;
  description: string;
  moduleLink: string;
  moduleLabel: string;
}

const FEATURE_ICONS: Record<FeatureHighlight['iconKey'], React.ElementType> = {
  attendance: Clock,
  leave: CalendarDays,
  payslip: FileText,
  timesheet: ClipboardList,
  course: GraduationCap,
};

const FEATURE_COLORS: Record<FeatureHighlight['iconKey'], { icon: string; card: string; btn: string }> = {
  attendance: {
    icon: 'text-indigo-600 bg-indigo-50',
    card: 'border-indigo-100 hover:border-indigo-300',
    btn: 'text-indigo-600 hover:bg-indigo-50',
  },
  leave: {
    icon: 'text-amber-600 bg-amber-50',
    card: 'border-amber-100 hover:border-amber-300',
    btn: 'text-amber-600 hover:bg-amber-50',
  },
  payslip: {
    icon: 'text-green-600 bg-green-50',
    card: 'border-green-100 hover:border-green-300',
    btn: 'text-green-600 hover:bg-green-50',
  },
  timesheet: {
    icon: 'text-blue-600 bg-blue-50',
    card: 'border-blue-100 hover:border-blue-300',
    btn: 'text-blue-600 hover:bg-blue-50',
  },
  course: {
    icon: 'text-purple-600 bg-purple-50',
    card: 'border-purple-100 hover:border-purple-300',
    btn: 'text-purple-600 hover:bg-purple-50',
  },
};

const FALLBACK_HIGHLIGHTS: FeatureHighlight[] = [
  {
    id: 'attendance',
    iconKey: 'attendance',
    title: 'Mark Attendance',
    description: 'Clock in and out with a single tap. Track your daily work hours, view your attendance history, and monitor patterns over time.',
    moduleLink: '/dashboard/attendance',
    moduleLabel: 'Time & Attendance',
  },
  {
    id: 'leave',
    iconKey: 'leave',
    title: 'Apply for Leave',
    description: 'Request leave in seconds — choose the type, dates, and add a note. Track approvals and view your remaining leave balance.',
    moduleLink: '/dashboard/leave-management',
    moduleLabel: 'Leave Management',
  },
  {
    id: 'payslip',
    iconKey: 'payslip',
    title: 'View Your Payslip',
    description: 'Access your monthly payslips anytime. See earnings, deductions, taxes, and your net pay breakdown in a clear format.',
    moduleLink: '/dashboard/payroll-processing',
    moduleLabel: 'Payroll Processing',
  },
  {
    id: 'timesheet',
    iconKey: 'timesheet',
    title: 'Submit Timesheets',
    description: 'Log daily work against projects and tasks. Submit weekly timesheets for manager approval and track billable vs. non-billable hours.',
    moduleLink: '/dashboard/daily-work-logging',
    moduleLabel: 'Daily Work Logging',
  },
  {
    id: 'course',
    iconKey: 'course',
    title: 'Complete a Course',
    description: 'Browse your assigned learning courses, watch videos, complete quizzes, and earn certificates to grow your skills.',
    moduleLink: '/dashboard/learning-development',
    moduleLabel: 'Learning & Development',
  },
];

export default function FeatureHighlights() {
  const [highlights, setHighlights] = useState<FeatureHighlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const [dismissing, setDismissing] = useState(false);

  useEffect(() => {
    api.get('/demo-company/employee/feature-highlights')
      .then((r) => {
        const data = r.data.data;
        if (data?.dismissed) {
          setDismissed(true);
        } else {
          setHighlights(data?.highlights ?? FALLBACK_HIGHLIGHTS);
        }
      })
      .catch(() => {
        setHighlights(FALLBACK_HIGHLIGHTS);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleDismiss = async () => {
    setDismissing(true);
    try {
      await api.post('/demo-company/employee/feature-highlights/dismiss', {});
      setDismissed(true);
    } catch {
      setDismissed(true); // dismiss locally even on error
    } finally {
      setDismissing(false);
    }
  };

  const handleGoToModule = (link: string) => {
    window.location.href = link;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center text-gray-400 text-sm">
        Loading feature highlights...
      </div>
    );
  }

  if (dismissed) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-10 text-center">
        <Sparkles className="h-10 w-10 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 font-medium">Feature highlights dismissed</p>
        <p className="text-gray-400 text-sm mt-1">You&apos;ve already dismissed these highlights.</p>
        <button
          onClick={() => setDismissed(false)}
          className="mt-4 text-sm text-indigo-600 hover:underline"
        >
          Show again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#2c2c2c]">Feature Highlights</h2>
          <p className="text-sm text-gray-500 mt-0.5">Explore the key features available to you as an employee</p>
        </div>
        <button
          onClick={handleDismiss}
          disabled={dismissing}
          className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-500 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          <X className="h-4 w-4" />
          {dismissing ? 'Dismissing...' : 'Dismiss All'}
        </button>
      </div>

      {/* Highlights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {highlights.map((highlight) => {
          const Icon = FEATURE_ICONS[highlight.iconKey] ?? Sparkles;
          const colors = FEATURE_COLORS[highlight.iconKey] ?? FEATURE_COLORS.attendance;

          return (
            <div
              key={highlight.id}
              className={`bg-white rounded-xl border shadow-sm p-6 flex flex-col gap-4 transition-all ${colors.card}`}
            >
              {/* Icon + Title */}
              <div className="flex items-start gap-3">
                <div className={`p-3 rounded-xl flex-shrink-0 ${colors.icon}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#2c2c2c]">{highlight.title}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{highlight.moduleLabel}</p>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-gray-600 flex-1">{highlight.description}</p>

              {/* Go to Module */}
              <button
                onClick={() => handleGoToModule(highlight.moduleLink)}
                className={`flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-lg transition-colors ${colors.btn}`}
              >
                Go to {highlight.moduleLabel}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Dismiss Footer */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-center justify-between gap-4">
        <p className="text-sm text-gray-500">
          Already familiar with these features? Dismiss the highlights to keep your dashboard clean.
        </p>
        <button
          onClick={handleDismiss}
          disabled={dismissing}
          className="flex-shrink-0 flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm font-medium hover:bg-white disabled:opacity-50 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
          {dismissing ? 'Dismissing...' : 'Dismiss'}
        </button>
      </div>
    </div>
  );
}
