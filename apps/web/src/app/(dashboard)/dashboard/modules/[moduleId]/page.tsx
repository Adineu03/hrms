'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useModuleStore } from '@/lib/module-store';
import { useAuthStore } from '@/lib/auth-store';
import { MODULES } from '@hrms/shared';
import SetupWizard from '@/components/setup-wizard';
import FeatureModePlaceholder from '@/components/feature-mode-placeholder';
import ColdStartFeatureMode from '@/components/modules/cold-start/cold-start-feature-mode';
import ModuleActivationDialog from '@/components/module-activation-dialog';
import { Power, Lock, Loader2 } from 'lucide-react';

export default function ModulePage() {
  const params = useParams();
  const moduleId = params.moduleId as string;
  const { modules, isLoading, fetchModules } = useModuleStore();
  const user = useAuthStore((s) => s.user);
  const [showActivateDialog, setShowActivateDialog] = useState(false);

  useEffect(() => {
    if (modules.length === 0) {
      fetchModules();
    }
  }, [modules.length, fetchModules]);

  const moduleDef = MODULES[moduleId];
  const moduleStatus = modules.find((m) => m.id === moduleId);
  const isAdmin = user?.role === 'super_admin' || user?.role === 'admin';

  if (isLoading && modules.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-text-muted" />
        <span className="ml-2 text-text-muted">Loading module...</span>
      </div>
    );
  }

  if (!moduleDef) {
    return (
      <div className="bg-card rounded-xl border border-border p-8 text-center max-w-lg mx-auto mt-8">
        <h2 className="text-xl font-semibold text-text">Module Not Found</h2>
        <p className="text-text-muted mt-2">
          The module &quot;{moduleId}&quot; does not exist.
        </p>
      </div>
    );
  }

  // Module not active — show activation prompt
  if (!moduleStatus?.isActive) {
    return (
      <div className="max-w-lg mx-auto mt-8">
        <div className="bg-card rounded-xl border border-border p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-background mb-4">
            {moduleStatus?.activationStatus === 'locked' ? (
              <Lock className="h-8 w-8 text-text-muted" />
            ) : (
              <Power className="h-8 w-8 text-text-muted" />
            )}
          </div>
          <h2 className="text-xl font-semibold text-text">{moduleDef.name}</h2>
          <p className="text-text-muted mt-2">{moduleDef.description}</p>

          {moduleStatus?.lockReason && (
            <p className="mt-3 text-sm text-yellow-700 bg-yellow-50 rounded-lg px-4 py-2 border border-yellow-200">
              {moduleStatus.lockReason}
            </p>
          )}

          <div className="mt-6">
            {isAdmin ? (
              <button
                onClick={() => setShowActivateDialog(true)}
                disabled={moduleStatus?.activationStatus === 'locked'}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Power className="h-4 w-4" />
                Activate Module
              </button>
            ) : (
              <p className="text-sm text-text-muted">
                Contact your administrator to activate this module.
              </p>
            )}
          </div>
        </div>

        {showActivateDialog && moduleStatus && (
          <ModuleActivationDialog
            module={moduleStatus}
            onClose={() => setShowActivateDialog(false)}
          />
        )}
      </div>
    );
  }

  // Module active + setup not completed — show Setup Wizard
  if (moduleStatus.setupStatus !== 'completed') {
    return (
      <div className="max-w-4xl">
        <SetupWizard moduleId={moduleId} />
      </div>
    );
  }

  // Module active + setup completed — show Feature Mode
  if (moduleId === 'cold-start-setup') {
    return <ColdStartFeatureMode moduleId={moduleId} />;
  }
  return <FeatureModePlaceholder moduleId={moduleId} />;
}
