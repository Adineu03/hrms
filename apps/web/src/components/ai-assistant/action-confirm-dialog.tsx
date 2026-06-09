'use client';

import { ShieldCheck, X } from 'lucide-react';
import { useChatStore } from '@/lib/chat-store';

export default function ActionConfirmDialog() {
  const { pendingAction, executeAction, cancelAction } = useChatStore();

  if (!pendingAction) return null;

  return (
    <div className="mx-4 mb-3 border border-border rounded-xl bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center shrink-0">
          <ShieldCheck className="h-4 w-4 text-yellow-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text">Confirm action</p>
          <p className="text-sm text-text-muted mt-1">{pendingAction.description}</p>

          {Object.keys(pendingAction.parameters).length > 0 && (
            <div className="mt-2 bg-background rounded-lg p-2 text-xs space-y-1">
              {Object.entries(pendingAction.parameters).map(([key, value]) => (
                <div key={key} className="flex gap-2">
                  <span className="text-text-muted font-medium">{key}:</span>
                  <span className="text-text">{String(value)}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 mt-3">
            <button
              onClick={executeAction}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-accent text-white hover:opacity-90 transition-opacity"
            >
              Allow
            </button>
            <button
              onClick={cancelAction}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-background text-text-muted hover:text-text border border-border transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
        <button
          onClick={cancelAction}
          className="text-text-muted hover:text-text transition-colors shrink-0"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
