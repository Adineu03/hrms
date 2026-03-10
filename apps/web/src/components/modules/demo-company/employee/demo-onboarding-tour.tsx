'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import {
  CheckCircle,
  Circle,
  Clock,
  CalendarDays,
  FileText,
  ClipboardList,
  GraduationCap,
  PartyPopper,
} from 'lucide-react';

interface TourStep {
  id: string;
  stepNumber: number;
  title: string;
  description: string;
  iconKey: 'attendance' | 'leave' | 'payslip' | 'timesheet' | 'course';
  completed: boolean;
}

const STEP_ICONS: Record<TourStep['iconKey'], React.ElementType> = {
  attendance: Clock,
  leave: CalendarDays,
  payslip: FileText,
  timesheet: ClipboardList,
  course: GraduationCap,
};

const STEP_COLORS: Record<TourStep['iconKey'], string> = {
  attendance: 'text-indigo-600 bg-indigo-50',
  leave: 'text-amber-600 bg-amber-50',
  payslip: 'text-green-600 bg-green-50',
  timesheet: 'text-blue-600 bg-blue-50',
  course: 'text-purple-600 bg-purple-50',
};

export default function DemoOnboardingTour() {
  const user = useAuthStore((s) => s.user);
  const [steps, setSteps] = useState<TourStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [tourCompleted, setTourCompleted] = useState(false);
  const [submittingTour, setSubmittingTour] = useState(false);

  const fetchSteps = () => {
    setLoading(true);
    setError('');
    api.get('/demo-company/employee/demo-onboarding-tour/steps')
      .then((r) => {
        const data: TourStep[] = r.data.data ?? [];
        setSteps(data);
        setTourCompleted(data.length > 0 && data.every((s) => s.completed));
      })
      .catch(() => setError('Failed to load tour steps.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSteps();
  }, []);

  const handleLearnHow = async (stepId: string) => {
    setCompletingId(stepId);
    try {
      await api.post('/demo-company/employee/demo-onboarding-tour/complete', { stepId });
      setSteps((prev) => {
        const updated = prev.map((s) => (s.id === stepId ? { ...s, completed: true } : s));
        setTourCompleted(updated.every((s) => s.completed));
        return updated;
      });
    } catch {
      // silently ignore
    } finally {
      setCompletingId(null);
    }
  };

  const handleCompleteTour = async () => {
    setSubmittingTour(true);
    try {
      await api.post('/demo-company/employee/demo-onboarding-tour/complete', { all: true });
      setTourCompleted(true);
      setSteps((prev) => prev.map((s) => ({ ...s, completed: true })));
    } catch {
      // silently ignore
    } finally {
      setSubmittingTour(false);
    }
  };

  const completedCount = steps.filter((s) => s.completed).length;
  const totalCount = steps.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const firstName = user?.firstName ?? 'there';

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center text-gray-400 text-sm">
        Loading your tour...
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-red-200 shadow-sm p-6">
        <p className="text-red-600 text-sm">{error}</p>
        <button onClick={fetchSteps} className="mt-2 text-sm text-indigo-600 hover:underline">Retry</button>
      </div>
    );
  }

  if (tourCompleted) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-green-200 shadow-sm p-10 text-center">
          <PartyPopper className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[#2c2c2c] mb-2">Tour Complete, {firstName}!</h2>
          <p className="text-gray-500 text-sm max-w-md mx-auto">
            You&apos;ve completed all 5 onboarding steps. You now know how to mark attendance, apply leave, view your payslip, submit timesheets, and complete a course.
          </p>
          <div className="mt-4 flex justify-center">
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-medium">
              <CheckCircle className="h-4 w-4" />
              5/5 Steps Completed
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-6">
        <h2 className="text-lg font-bold text-[#2c2c2c] mb-1">Welcome, {firstName}!</h2>
        <p className="text-sm text-gray-600">
          This quick tour will show you the 5 most important things you can do in HRMS. Complete each step to earn your onboarding badge.
        </p>
      </div>

      {/* Progress Bar */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-[#2c2c2c]">Your Progress</span>
          <span className="text-sm font-bold text-indigo-600">{completedCount}/{totalCount} completed</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3">
          <div
            className="bg-indigo-500 h-3 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex justify-between mt-1.5">
          {Array.from({ length: totalCount }).map((_, i) => (
            <span
              key={i}
              className={`text-xs ${i < completedCount ? 'text-indigo-600' : 'text-gray-300'}`}
            >
              {i + 1}
            </span>
          ))}
        </div>
      </div>

      {/* Step Cards */}
      <div className="space-y-3">
        {steps.map((step) => {
          const Icon = STEP_ICONS[step.iconKey] ?? Circle;
          const color = STEP_COLORS[step.iconKey] ?? STEP_COLORS.attendance;
          const isLoading = completingId === step.id;

          return (
            <div
              key={step.id}
              className={`bg-white rounded-xl border shadow-sm p-5 transition-all ${
                step.completed ? 'border-green-200 bg-green-50/30' : 'border-gray-200'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl flex-shrink-0 ${step.completed ? 'text-green-600 bg-green-50' : color}`}>
                  {step.completed ? <CheckCircle className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-gray-400">Step {step.stepNumber}</span>
                    {step.completed && (
                      <span className="text-xs bg-green-100 text-green-700 rounded-full px-2 py-0.5 font-medium">
                        Done
                      </span>
                    )}
                  </div>
                  <h3 className={`font-semibold mt-0.5 ${step.completed ? 'text-gray-400' : 'text-[#2c2c2c]'}`}>
                    {step.title}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">{step.description}</p>
                </div>

                {!step.completed && (
                  <button
                    onClick={() => handleLearnHow(step.id)}
                    disabled={isLoading}
                    className="flex-shrink-0 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors whitespace-nowrap"
                  >
                    {isLoading ? 'Loading...' : 'Learn How'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Complete Tour Button */}
      {completedCount > 0 && completedCount < totalCount && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-[#2c2c2c]">Mark all steps as complete</p>
            <p className="text-xs text-gray-400 mt-0.5">Already familiar with the platform? Skip ahead.</p>
          </div>
          <button
            onClick={handleCompleteTour}
            disabled={submittingTour}
            className="px-4 py-2 border border-indigo-300 text-indigo-600 rounded-lg text-sm font-medium hover:bg-indigo-50 disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            {submittingTour ? 'Completing...' : 'Complete Tour'}
          </button>
        </div>
      )}
    </div>
  );
}
