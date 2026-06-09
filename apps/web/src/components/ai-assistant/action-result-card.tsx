'use client';

import { CheckCircle2, XCircle } from 'lucide-react';
import type { ActionResult } from '@hrms/shared';

interface ActionResultCardProps {
  result: ActionResult;
}

export default function ActionResultCard({ result }: ActionResultCardProps) {
  return (
    <div className="mt-2 bg-background rounded-lg border border-border p-3">
      {/* Status header */}
      <div className="flex items-center gap-2 mb-2">
        {result.success ? (
          <CheckCircle2 className="h-4 w-4 text-accent shrink-0" />
        ) : (
          <XCircle className="h-4 w-4 text-red-500 shrink-0" />
        )}
        <span className={`text-xs font-medium ${result.success ? 'text-accent' : 'text-red-500'}`}>
          {result.success ? 'Success' : 'Failed'}
        </span>
      </div>

      {/* Data display */}
      {result.data && typeof result.data === 'object' && !Array.isArray(result.data) && (
        <div className="space-y-1 text-xs">
          {Object.entries(result.data).map(([key, value]) => {
            // Skip nested arrays/objects for simple display
            if (typeof value === 'object' && value !== null) return null;
            return (
              <div key={key} className="flex justify-between gap-2">
                <span className="text-text-muted">{formatKey(key)}</span>
                <span className="text-text font-medium">{String(value)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function formatKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase())
    .trim();
}
