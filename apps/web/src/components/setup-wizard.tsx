'use client';

import { useEffect, useState } from 'react';
import { useSetupStore } from '@/lib/setup-store';
import { useModuleStore } from '@/lib/module-store';
import { MODULES } from '@hrms/shared';
import { Check, Circle, Loader2, CheckCircle2, Sparkles } from 'lucide-react';
import CompanyProfileForm from '@/components/setup-steps/company-profile-form';
import WorkWeekForm from '@/components/setup-steps/work-week-form';
import DepartmentsForm from '@/components/setup-steps/departments-form';
import DesignationsForm from '@/components/setup-steps/designations-form';
import InviteEmployeesForm from '@/components/setup-steps/invite-employees-form';
import { api } from '@/lib/api';

interface SetupWizardProps {
  moduleId: string;
}

export default function SetupWizard({ moduleId }: SetupWizardProps) {
  const { setupInfo, isLoading, error, fetchSetupInfo, completeStep, completeSetup } =
    useSetupStore();
  const { fetchModules } = useModuleStore();
  const [activeStepId, setActiveStepId] = useState<string | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [templateName, setTemplateName] = useState<string | null>(null);

  const moduleDef = MODULES[moduleId];

  useEffect(() => {
    fetchSetupInfo(moduleId);
  }, [moduleId, fetchSetupInfo]);

  // Check if a template was applied (for the smart defaults banner)
  useEffect(() => {
    if (moduleId !== 'cold-start-setup') return;

    async function checkTemplate() {
      try {
        const res = await api.get('/templates/status');
        if (res.data?.applied && res.data?.templateName) {
          setTemplateName(res.data.templateName);
        }
      } catch {
        // No template status — no banner
      }
    }
    checkTemplate();
  }, [moduleId]);

  // Set active step to first incomplete step when setup info loads
  useEffect(() => {
    if (setupInfo && !activeStepId) {
      const firstIncomplete = setupInfo.steps.find((s) => !s.completed);
      if (firstIncomplete) {
        setActiveStepId(firstIncomplete.id);
      } else if (setupInfo.steps.length > 0) {
        setActiveStepId(setupInfo.steps[setupInfo.steps.length - 1].id);
      }
    }
  }, [setupInfo, activeStepId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-text-muted" />
        <span className="ml-2 text-text-muted">Loading setup...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card rounded-xl border border-border p-6">
        <p className="text-red-600">Error: {error}</p>
        <button
          onClick={() => fetchSetupInfo(moduleId)}
          className="mt-3 px-4 py-2 text-sm rounded-lg border border-border text-text hover:bg-background transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!setupInfo) return null;

  // Setup is fully completed
  if (setupInfo.setupStatus === 'completed') {
    return (
      <div className="bg-card rounded-xl border border-border p-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-50 mb-4">
          <CheckCircle2 className="h-8 w-8 text-accent" />
        </div>
        <h2 className="text-xl font-semibold text-text">Setup Complete</h2>
        <p className="text-text-muted mt-2">
          {moduleDef?.name || moduleId} has been fully configured.
        </p>
      </div>
    );
  }

  const activeStep = setupInfo.steps.find((s) => s.id === activeStepId);
  const allRequiredDone = setupInfo.steps
    .filter((s) => s.required)
    .every((s) => s.completed);
  const progress =
    setupInfo.totalSteps > 0
      ? Math.round((setupInfo.completedSteps / setupInfo.totalSteps) * 100)
      : 0;

  const handleStepComplete = async () => {
    if (!activeStepId) return;
    setIsCompleting(true);
    try {
      await completeStep(moduleId, activeStepId);
      // Auto-advance to next incomplete step
      const updated = useSetupStore.getState().setupInfo;
      if (updated) {
        const nextIncomplete = updated.steps.find((s) => !s.completed);
        if (nextIncomplete) {
          setActiveStepId(nextIncomplete.id);
        }
      }
    } catch {
      // error handled in store
    } finally {
      setIsCompleting(false);
    }
  };

  const handleGenericCompleteStep = async () => {
    if (!activeStepId) return;
    setIsCompleting(true);
    try {
      await completeStep(moduleId, activeStepId);
      // Auto-advance to next incomplete step
      const updated = useSetupStore.getState().setupInfo;
      if (updated) {
        const nextIncomplete = updated.steps.find((s) => !s.completed);
        if (nextIncomplete) {
          setActiveStepId(nextIncomplete.id);
        }
      }
    } catch {
      // error handled in store
    } finally {
      setIsCompleting(false);
    }
  };

  const handleCompleteSetup = async () => {
    setIsFinishing(true);
    try {
      await completeSetup(moduleId);
      // Refetch modules so sidebar updates
      await fetchModules();
    } catch {
      // error handled in store
    } finally {
      setIsFinishing(false);
    }
  };

  /**
   * Determines whether the current active step has a dedicated form component.
   * Returns true for cold-start-setup steps that have matching form components.
   */
  const hasDedicatedForm = (): boolean => {
    if (moduleId !== 'cold-start-setup' || !activeStep) return false;
    const formStepIds = ['company-profile', 'work-week', 'departments', 'designations', 'invite-employees'];
    return formStepIds.includes(activeStep.id);
  };

  /**
   * Renders the appropriate form component for the active step.
   */
  const renderStepForm = () => {
    if (moduleId !== 'cold-start-setup' || !activeStep) return null;

    switch (activeStep.id) {
      case 'company-profile':
        return <CompanyProfileForm onComplete={handleStepComplete} />;
      case 'work-week':
        return <WorkWeekForm onComplete={handleStepComplete} />;
      case 'departments':
        return <DepartmentsForm onComplete={handleStepComplete} />;
      case 'designations':
        return <DesignationsForm onComplete={handleStepComplete} />;
      case 'invite-employees':
        return <InviteEmployeesForm onComplete={handleStepComplete} />;
      default:
        return null;
    }
  };

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border">
        <h2 className="text-lg font-semibold text-text">
          Setup: {moduleDef?.name || moduleId}
        </h2>
        <div className="flex items-center gap-3 mt-2">
          <div className="flex-1 h-2 bg-background rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-sm text-text-muted whitespace-nowrap">
            {setupInfo.completedSteps}/{setupInfo.totalSteps} steps
          </span>
        </div>
      </div>

      <div className="flex min-h-[400px]">
        {/* Step Sidebar */}
        <div className="w-72 border-r border-border bg-background/50 p-4 space-y-1">
          {setupInfo.steps.map((step) => {
            const isActive = step.id === activeStepId;
            return (
              <button
                key={step.id}
                onClick={() => setActiveStepId(step.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm transition-colors ${
                  isActive
                    ? 'bg-card border border-border shadow-sm'
                    : 'hover:bg-card/60'
                }`}
              >
                {step.completed ? (
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-green-100 shrink-0">
                    <Check className="h-3.5 w-3.5 text-accent" />
                  </div>
                ) : (
                  <div className="flex items-center justify-center w-6 h-6 rounded-full border border-border bg-card shrink-0">
                    <span className="text-xs font-medium text-text-muted">
                      {step.order}
                    </span>
                  </div>
                )}
                <span
                  className={`truncate ${
                    step.completed
                      ? 'text-text-muted line-through'
                      : isActive
                        ? 'text-text font-medium'
                        : 'text-text'
                  }`}
                >
                  {step.title}
                </span>
                {step.required && !step.completed && (
                  <span className="ml-auto text-[10px] font-medium text-red-500 uppercase shrink-0">
                    Req
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Step Content */}
        <div className="flex-1 p-6 flex flex-col">
          {activeStep ? (
            <>
              <div className="flex-1">
                {/* Step Header */}
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
                    Step {activeStep.order}
                  </span>
                  {activeStep.required && (
                    <span className="text-xs px-1.5 py-0.5 bg-red-50 text-red-600 rounded font-medium">
                      Required
                    </span>
                  )}
                  {activeStep.completed && (
                    <span className="text-xs px-1.5 py-0.5 bg-green-50 text-accent rounded font-medium">
                      Completed
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-semibold text-text mt-1">
                  {activeStep.title}
                </h3>
                <p className="text-text-muted mt-3 leading-relaxed">
                  {activeStep.description}
                </p>

                {/* Template Smart Defaults Banner */}
                {templateName && moduleId === 'cold-start-setup' && !activeStep.completed && (
                  <div className="mt-4 px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 shrink-0" />
                    <span>
                      Defaults applied from <strong>{templateName}</strong> template. You can customize below.
                    </span>
                  </div>
                )}

                {/* Step Form Content */}
                {!activeStep.completed && hasDedicatedForm() ? (
                  <div className="mt-6">
                    {renderStepForm()}
                  </div>
                ) : !activeStep.completed ? (
                  /* Generic fallback for non-cold-start modules */
                  <div className="mt-6 flex items-center gap-3 pt-4 border-t border-border">
                    <button
                      onClick={handleGenericCompleteStep}
                      disabled={isCompleting}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isCompleting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Circle className="h-4 w-4" />
                      )}
                      Mark as Complete
                    </button>
                  </div>
                ) : null}
              </div>

              {/* Complete Setup Button (always visible when all required steps are done) */}
              {allRequiredDone && (
                <div className="mt-6 flex items-center gap-3 pt-4 border-t border-border">
                  <button
                    onClick={handleCompleteSetup}
                    disabled={isFinishing}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-accent hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isFinishing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    Complete Setup
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-text-muted">
              Select a step to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
