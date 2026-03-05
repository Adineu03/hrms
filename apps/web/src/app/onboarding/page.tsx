'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { useModuleStore } from '@/lib/module-store';
import IndustryTemplatePicker from '@/components/industry-template-picker';
import { Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

export default function OnboardingPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, loadFromStorage } = useAuthStore();
  const { activateModule, fetchModules } = useModuleStore();
  const [checkingTemplate, setCheckingTemplate] = useState(true);

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // Check if template is already applied
  useEffect(() => {
    if (!isAuthenticated) return;

    async function checkExistingTemplate() {
      try {
        const res = await api.get('/templates/status');
        if (res.data?.applied) {
          // Template already applied, skip to cold start setup
          router.push('/dashboard/modules/cold-start-setup');
          return;
        }
      } catch {
        // No template status endpoint or not applied yet — that's fine, show picker
      }
      setCheckingTemplate(false);
    }

    checkExistingTemplate();
  }, [isAuthenticated, router]);

  const handleTemplateComplete = async () => {
    // Auto-activate the cold-start-setup module, then navigate
    try {
      await activateModule('cold-start-setup');
    } catch {
      // Module might already be active — ignore error
    }
    await fetchModules();
    router.push('/dashboard/modules/cold-start-setup');
  };

  if (authLoading || !isAuthenticated || !user || checkingTemplate) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-text-muted" />
        <span className="ml-2 text-text-muted">Loading...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <IndustryTemplatePicker onComplete={handleTemplateComplete} />
    </div>
  );
}
