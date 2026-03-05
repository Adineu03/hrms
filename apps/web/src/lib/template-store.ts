import { create } from 'zustand';
import { api } from './api';
import type { IndustryTemplate, IndustryTemplateSummary } from '@hrms/shared';
import { AxiosError } from 'axios';

function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof AxiosError) {
    return err.response?.data?.message || err.message || fallback;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return fallback;
}

interface TemplateState {
  templates: IndustryTemplateSummary[];
  selectedTemplate: IndustryTemplate | null;
  isLoading: boolean;
  error: string | null;
  fetchTemplates: () => Promise<void>;
  fetchTemplate: (industryId: string) => Promise<void>;
  applyTemplate: (industryId: string) => Promise<void>;
}

export const useTemplateStore = create<TemplateState>((set) => ({
  templates: [],
  selectedTemplate: null,
  isLoading: false,
  error: null,

  fetchTemplates: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.get<IndustryTemplateSummary[]>('/templates');
      set({ templates: res.data, isLoading: false });
    } catch (err: unknown) {
      set({ error: getErrorMessage(err, 'Failed to fetch templates'), isLoading: false });
    }
  },

  fetchTemplate: async (industryId: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.get<IndustryTemplate>(`/templates/${industryId}`);
      set({ selectedTemplate: res.data, isLoading: false });
    } catch (err: unknown) {
      set({ error: getErrorMessage(err, 'Failed to fetch template details'), isLoading: false });
    }
  },

  applyTemplate: async (industryId: string) => {
    set({ isLoading: true, error: null });
    try {
      await api.post('/templates/apply', { industryId });
      set({ isLoading: false });
    } catch (err: unknown) {
      set({ error: getErrorMessage(err, 'Failed to apply template'), isLoading: false });
      throw err;
    }
  },
}));
