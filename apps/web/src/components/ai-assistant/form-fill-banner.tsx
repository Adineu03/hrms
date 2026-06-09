'use client';

import { Sparkles, Undo2, X } from 'lucide-react';
import { useChatStore } from '@/lib/chat-store';

export default function FormFillBanner() {
  const { formFillActive, formFillCount, undoFormFill, dismissFormFill } = useChatStore();

  if (!formFillActive) return null;

  return (
    <div className="fixed top-16 left-64 right-0 z-40 px-6 py-0 pointer-events-none">
      <div className="pointer-events-auto max-w-2xl mx-auto bg-blue-50 border-l-4 border-blue-400 p-3 rounded-r-lg shadow-md flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-blue-800">
          <Sparkles className="h-4 w-4 text-blue-500 shrink-0" />
          <span>
            AI filled <strong>{formFillCount}</strong> field{formFillCount !== 1 ? 's' : ''}. Review the values below, then submit when ready.
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={undoFormFill}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-md transition-colors"
          >
            <Undo2 className="h-3 w-3" />
            Undo All
          </button>
          <button
            onClick={dismissFormFill}
            className="text-blue-400 hover:text-blue-600 transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
