'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { CheckCircle, Circle, ChevronRight, BookOpen, Layers } from 'lucide-react';

interface WalkthroughStep {
  id: string;
  stepNumber: number;
  title: string;
  description: string;
  featureRef: string;
  moduleRef: string;
  completed: boolean;
}

export default function DemoWalkthrough() {
  const [steps, setSteps] = useState<WalkthroughStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<string | null>(null);

  const fetchSteps = () => {
    setLoading(true);
    setError('');
    api.get('/demo-company/manager/demo-walkthrough/steps')
      .then((r) => {
        const data: WalkthroughStep[] = r.data.data ?? [];
        setSteps(data);
        // Set active step to first incomplete step
        const firstIncomplete = data.find((s) => !s.completed);
        if (firstIncomplete) setActiveStep(firstIncomplete.id);
        else if (data.length > 0) setActiveStep(data[0].id);
      })
      .catch(() => setError('Failed to load walkthrough steps.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSteps();
  }, []);

  const handleMarkComplete = async (stepId: string) => {
    setCompletingId(stepId);
    try {
      await api.post('/demo-company/manager/demo-walkthrough/complete', { stepId });
      setSteps((prev) =>
        prev.map((s) => (s.id === stepId ? { ...s, completed: true } : s))
      );
      // Advance to next incomplete step
      const updated = steps.map((s) => (s.id === stepId ? { ...s, completed: true } : s));
      const nextIncomplete = updated.find((s) => !s.completed);
      if (nextIncomplete) setActiveStep(nextIncomplete.id);
    } catch {
      // silently ignore
    } finally {
      setCompletingId(null);
    }
  };

  const completedCount = steps.filter((s) => s.completed).length;
  const totalCount = steps.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center text-gray-400 text-sm">
        Loading walkthrough steps...
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

  return (
    <div className="space-y-6">
      {/* Pre-filled Data Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <BookOpen className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800">
          <span className="font-semibold">Demo Data Active:</span> This walkthrough uses pre-seeded realistic data — employees, leave records, attendance logs, and performance data are all populated for your exploration.
        </p>
      </div>

      {/* Progress Header */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold text-[#2c2c2c]">Demo Walkthrough Progress</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              Step {Math.min(completedCount + 1, totalCount)} of {totalCount}
            </p>
          </div>
          <span className="text-2xl font-bold text-indigo-600">{progressPercent}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3">
          <div
            className="bg-indigo-500 h-3 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-2">{completedCount} of {totalCount} steps completed</p>
      </div>

      {/* Steps */}
      {steps.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-10 text-center">
          <p className="text-gray-400 text-sm">No walkthrough steps available.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {steps.map((step) => {
            const isActive = activeStep === step.id;
            return (
              <div
                key={step.id}
                className={`bg-white rounded-xl border shadow-sm transition-all ${
                  isActive ? 'border-indigo-300 ring-1 ring-indigo-200' : 'border-gray-200'
                }`}
              >
                <button
                  className="w-full text-left"
                  onClick={() => setActiveStep(isActive ? null : step.id)}
                >
                  <div className="flex items-center gap-4 p-4">
                    <div className="flex-shrink-0">
                      {step.completed ? (
                        <CheckCircle className="h-6 w-6 text-green-500" />
                      ) : (
                        <Circle className={`h-6 w-6 ${isActive ? 'text-indigo-500' : 'text-gray-300'}`} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 font-medium">Step {step.stepNumber}</span>
                        {step.completed && (
                          <span className="text-xs bg-green-100 text-green-700 rounded-full px-2 py-0.5 font-medium">
                            Completed
                          </span>
                        )}
                      </div>
                      <p className={`font-medium mt-0.5 ${step.completed ? 'text-gray-400 line-through' : 'text-[#2c2c2c]'}`}>
                        {step.title}
                      </p>
                    </div>
                    <ChevronRight className={`h-4 w-4 text-gray-400 transition-transform ${isActive ? 'rotate-90' : ''}`} />
                  </div>
                </button>

                {isActive && (
                  <div className="px-4 pb-4 border-t border-gray-100 pt-4">
                    <p className="text-sm text-gray-600 mb-4">{step.description}</p>

                    <div className="flex gap-3 flex-wrap mb-4">
                      <div className="flex items-center gap-1.5 text-xs text-indigo-600 bg-indigo-50 rounded-full px-3 py-1">
                        <Layers className="h-3 w-3" />
                        <span>{step.moduleRef}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-100 rounded-full px-3 py-1">
                        <BookOpen className="h-3 w-3" />
                        <span>{step.featureRef}</span>
                      </div>
                    </div>

                    {!step.completed && (
                      <button
                        onClick={() => handleMarkComplete(step.id)}
                        disabled={completingId === step.id}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                      >
                        <CheckCircle className="h-4 w-4" />
                        {completingId === step.id ? 'Marking...' : 'Mark Complete'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {completedCount === totalCount && totalCount > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
          <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
          <p className="font-semibold text-green-800">Walkthrough Complete!</p>
          <p className="text-sm text-green-600 mt-1">You&apos;ve explored all the key features in this demo environment.</p>
        </div>
      )}
    </div>
  );
}
