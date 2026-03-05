'use client';

import { MODULES } from '@hrms/shared';
import { CheckCircle2 } from 'lucide-react';

interface FeatureModePlaceholderProps {
  moduleId: string;
}

export default function FeatureModePlaceholder({ moduleId }: FeatureModePlaceholderProps) {
  const moduleDef = MODULES[moduleId];

  return (
    <div className="bg-card rounded-xl border border-border p-8 text-center max-w-lg mx-auto mt-8">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-50 mb-4">
        <CheckCircle2 className="h-8 w-8 text-accent" />
      </div>
      <h2 className="text-xl font-semibold text-text">
        {moduleDef?.name || moduleId}
      </h2>
      <p className="text-text-muted mt-2">{moduleDef?.description}</p>
      <div className="mt-6 p-4 bg-background rounded-lg border border-border">
        <p className="text-sm text-text-muted">
          Module setup complete &mdash; features coming in next steps.
        </p>
      </div>
    </div>
  );
}
