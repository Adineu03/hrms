'use client';

import { useEffect, useState } from 'react';
import { useTemplateStore } from '@/lib/template-store';
import type { IndustryTemplate } from '@hrms/shared';
import {
  Monitor,
  Factory,
  HeartPulse,
  ShoppingCart,
  Settings,
  Check,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const TEMPLATE_ICONS: Record<string, LucideIcon> = {
  Monitor,
  Factory,
  HeartPulse,
  ShoppingCart,
  Settings,
};

const ICON_FALLBACK_MAP: Record<string, LucideIcon> = {
  'it-services': Monitor,
  manufacturing: Factory,
  healthcare: HeartPulse,
  retail: ShoppingCart,
  custom: Settings,
};

interface IndustryTemplatePickerProps {
  onComplete: () => void;
}

export default function IndustryTemplatePicker({ onComplete }: IndustryTemplatePickerProps) {
  const { templates, selectedTemplate, isLoading, error, fetchTemplates, fetchTemplate, applyTemplate } =
    useTemplateStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleSelectTemplate = async (templateId: string) => {
    setSelectedId(templateId);
    setApplyError(null);
    await fetchTemplate(templateId);
  };

  const handleApply = async () => {
    if (!selectedId) return;
    setIsApplying(true);
    setApplyError(null);
    try {
      await applyTemplate(selectedId);
      onComplete();
    } catch {
      setApplyError('Failed to apply template. Please try again.');
    } finally {
      setIsApplying(false);
    }
  };

  const handleSkip = async () => {
    setIsApplying(true);
    setApplyError(null);
    try {
      await applyTemplate('custom');
      onComplete();
    } catch {
      setApplyError('Failed to apply template. Please try again.');
    } finally {
      setIsApplying(false);
    }
  };

  function getIconForTemplate(template: { id: string; icon: string }): LucideIcon {
    return TEMPLATE_ICONS[template.icon] || ICON_FALLBACK_MAP[template.id] || Settings;
  }

  function formatDays(days: string[]): string {
    if (days.length === 0) return 'None';
    if (days.length === 7) return 'All days';
    if (days.length === 6) {
      const missing = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].find(
        (d) => !days.includes(d),
      );
      return `All except ${missing}`;
    }
    return days.join(', ');
  }

  function formatTime(time: string): string {
    const [h, m] = time.split(':');
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h12 = hour % 12 || 12;
    return `${h12}:${m} ${ampm}`;
  }

  function getDeptNames(template: IndustryTemplate): string {
    return template.departments.map((d) => d.name).join(', ');
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-card rounded-xl border border-border shadow-sm p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-text">Choose Your Industry</h1>
          <p className="text-text-muted mt-2">
            We&apos;ll pre-configure your HRMS with sensible defaults
          </p>
        </div>

        {/* Error */}
        {(error || applyError) && (
          <div className="mb-6 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {applyError || error}
          </div>
        )}

        {/* Template Grid */}
        {isLoading && templates.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-text-muted" />
            <span className="ml-2 text-text-muted">Loading templates...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {templates.map((tmpl) => {
              const Icon = getIconForTemplate(tmpl);
              const isSelected = selectedId === tmpl.id;

              return (
                <button
                  key={tmpl.id}
                  onClick={() => handleSelectTemplate(tmpl.id)}
                  className={`relative flex items-start gap-4 p-4 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/5 shadow-md'
                      : 'border-border bg-card hover:shadow-md hover:border-border'
                  }`}
                >
                  {/* Checkmark */}
                  {isSelected && (
                    <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                  )}

                  <div className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                    isSelected ? 'bg-primary/10' : 'bg-background'
                  }`}>
                    <Icon className={`h-5 w-5 ${isSelected ? 'text-primary' : 'text-text-muted'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium ${isSelected ? 'text-primary' : 'text-text'}`}>
                      {tmpl.name}
                    </p>
                    <p className="text-sm text-text-muted mt-0.5 leading-relaxed">
                      {tmpl.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Preview Section */}
        {selectedTemplate && selectedId && selectedId !== 'custom' && (
          <div className="mb-8 rounded-xl border border-border bg-background p-5">
            <h3 className="text-sm font-semibold text-text uppercase tracking-wider mb-4">
              Template Preview
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-text-muted font-medium mb-1">Work Week</p>
                <p className="text-text">
                  {formatDays(selectedTemplate.workWeek.days)}
                </p>
                <p className="text-text-muted">
                  {formatTime(selectedTemplate.workWeek.startTime)} &ndash;{' '}
                  {formatTime(selectedTemplate.workWeek.endTime)}
                </p>
              </div>
              <div>
                <p className="text-text-muted font-medium mb-1">Leave Policy</p>
                <p className="text-text">
                  CL {selectedTemplate.leave.casual}, SL {selectedTemplate.leave.sick}, EL{' '}
                  {selectedTemplate.leave.earned}
                </p>
                {selectedTemplate.leave.wfh && (
                  <p className="text-accent text-xs mt-0.5">WFH enabled</p>
                )}
              </div>
              <div>
                <p className="text-text-muted font-medium mb-1">Departments</p>
                <p className="text-text leading-relaxed">
                  {getDeptNames(selectedTemplate)}
                </p>
              </div>
              <div>
                <p className="text-text-muted font-medium mb-1">Designations</p>
                <p className="text-text">
                  {selectedTemplate.designations.length} designations pre-configured
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleSkip}
            disabled={isApplying}
            className="text-sm text-text-muted hover:text-text transition-colors disabled:opacity-50"
          >
            Skip, I&apos;ll configure manually
          </button>
          <button
            onClick={handleApply}
            disabled={!selectedId || isApplying}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium text-white bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isApplying ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Applying...
              </>
            ) : (
              <>
                Apply &amp; Continue
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
