'use client';

import { useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { useModuleStore } from '@/lib/module-store';
import { useAuthStore } from '@/lib/auth-store';
import type { PageContext } from '@hrms/shared';

/**
 * Reads the active tab label from the DOM by finding the tab button
 * with active styling (border-primary or text-primary).
 */
function getActiveTabFromDOM(): string | null {
  if (typeof document === 'undefined') return null;
  const tabContainer = document.querySelector('main .border-b.border-border, main .border-b');
  if (!tabContainer) return null;
  for (const btn of tabContainer.querySelectorAll('button')) {
    const cls = btn.className || '';
    if (cls.includes('border-primary') || cls.includes('text-primary')) {
      return btn.textContent?.trim() || null;
    }
  }
  return null;
}

/**
 * Returns a function that produces a fresh PageContext snapshot.
 * Called at message-send time so the active tab is read from the DOM live.
 */
export function usePageContext() {
  const pathname = usePathname();
  const { modules } = useModuleStore();
  const { user } = useAuthStore();

  const getPageContext = useCallback((): PageContext => {
    let moduleId: string | null = null;
    let moduleName: string | null = null;

    const match = pathname.match(/^\/dashboard\/modules\/([^/]+)/);
    if (match) {
      moduleId = match[1];
      const mod = modules.find((m) => m.id === moduleId);
      if (mod) {
        moduleName = mod.name;
      }
    }

    return {
      moduleId,
      moduleName,
      activeTab: getActiveTabFromDOM(),
      userRole: user?.role || 'employee',
      pathname,
    };
  }, [pathname, modules, user]);

  return getPageContext;
}
