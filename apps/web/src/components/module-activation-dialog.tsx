'use client';

import { useState } from 'react';
import { useModuleStore } from '@/lib/module-store';
import { MODULES } from '@hrms/shared';
import type { ModuleWithStatus } from '@hrms/shared';
import { X, AlertTriangle, Loader2, Power, PowerOff } from 'lucide-react';
import { AxiosError } from 'axios';

interface ModuleActivationDialogProps {
  module: ModuleWithStatus;
  onClose: () => void;
}

export default function ModuleActivationDialog({
  module,
  onClose,
}: ModuleActivationDialogProps) {
  const { activateModule, deactivateModule, modules } = useModuleStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isActive = module.isActive;

  // Find which dependencies are satisfied and which are not
  const depStatus = module.dependencies.map((depId) => {
    const depModule = modules.find((m) => m.id === depId);
    const depDef = MODULES[depId];
    return {
      id: depId,
      name: depDef?.name || depId,
      satisfied: depModule?.isActive ?? false,
    };
  });

  // Find modules that depend on this one (for deactivation warning)
  const dependentModules = modules.filter(
    (m) => m.isActive && m.dependencies.includes(module.id)
  );

  const handleActivate = async () => {
    setIsProcessing(true);
    setError(null);
    try {
      await activateModule(module.id);
      onClose();
    } catch (err: unknown) {
      if (err instanceof AxiosError) {
        setError(err.response?.data?.message || err.message || 'Activation failed');
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Activation failed');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeactivate = async () => {
    setIsProcessing(true);
    setError(null);
    try {
      await deactivateModule(module.id);
      onClose();
    } catch (err: unknown) {
      if (err instanceof AxiosError) {
        setError(err.response?.data?.message || err.message || 'Deactivation failed');
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Deactivation failed');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative bg-card rounded-xl border border-border shadow-lg w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-text">
            {isActive ? 'Deactivate' : 'Activate'} Module
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-background transition-colors text-text-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4">
          {/* Module Info */}
          <div>
            <h3 className="font-semibold text-text">{module.name}</h3>
            <p className="text-sm text-text-muted mt-1">{module.description}</p>
          </div>

          {/* Dependencies (for activation) */}
          {!isActive && depStatus.length > 0 && (
            <div>
              <p className="text-sm font-medium text-text mb-2">Dependencies:</p>
              <ul className="space-y-1.5">
                {depStatus.map((dep) => (
                  <li
                    key={dep.id}
                    className="flex items-center gap-2 text-sm"
                  >
                    <span
                      className={`inline-block w-2 h-2 rounded-full ${
                        dep.satisfied ? 'bg-accent' : 'bg-red-400'
                      }`}
                    />
                    <span className={dep.satisfied ? 'text-text' : 'text-red-600'}>
                      {dep.name}
                    </span>
                    <span className="text-xs text-text-muted">
                      {dep.satisfied ? '(active)' : '(not active)'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Lock reason */}
          {!isActive && !module.canActivate && module.lockReason && (
            <div className="flex items-start gap-2 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
              <p className="text-sm text-yellow-800">{module.lockReason}</p>
            </div>
          )}

          {/* Deactivation warning */}
          {isActive && dependentModules.length > 0 && (
            <div className="flex items-start gap-2 p-3 bg-red-50 rounded-lg border border-red-200">
              <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-800">
                  Warning: The following active modules depend on this one:
                </p>
                <ul className="mt-1 space-y-0.5">
                  {dependentModules.map((m) => (
                    <li key={m.id} className="text-sm text-red-700">
                      - {m.name}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 rounded-lg border border-red-200">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 text-sm rounded-lg border border-border text-text hover:bg-background transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          {isActive ? (
            <button
              onClick={handleDeactivate}
              disabled={isProcessing}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <PowerOff className="h-4 w-4" />
              )}
              Deactivate
            </button>
          ) : (
            <button
              onClick={handleActivate}
              disabled={isProcessing || !module.canActivate}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg font-medium text-white bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Power className="h-4 w-4" />
              )}
              Activate
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
