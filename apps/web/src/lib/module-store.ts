import { create } from 'zustand';
import { api } from './api';
import type { ModuleWithStatus } from '@hrms/shared';
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

interface ModuleState {
  modules: ModuleWithStatus[];
  isLoading: boolean;
  error: string | null;
  fetchModules: () => Promise<void>;
  activateModule: (moduleId: string) => Promise<void>;
  deactivateModule: (moduleId: string) => Promise<void>;
}

export const useModuleStore = create<ModuleState>((set, get) => ({
  modules: [],
  isLoading: false,
  error: null,

  fetchModules: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.get<ModuleWithStatus[]>('/modules');
      set({ modules: res.data, isLoading: false });
    } catch (err: unknown) {
      set({ error: getErrorMessage(err, 'Failed to fetch modules'), isLoading: false });
    }
  },

  activateModule: async (moduleId: string) => {
    try {
      await api.post(`/modules/${moduleId}/activate`);
      await get().fetchModules();
    } catch (err: unknown) {
      set({ error: getErrorMessage(err, 'Failed to activate module') });
      throw err;
    }
  },

  deactivateModule: async (moduleId: string) => {
    try {
      await api.post(`/modules/${moduleId}/deactivate`);
      await get().fetchModules();
    } catch (err: unknown) {
      set({ error: getErrorMessage(err, 'Failed to deactivate module') });
      throw err;
    }
  },
}));
