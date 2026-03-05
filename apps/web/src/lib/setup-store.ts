import { create } from 'zustand';
import { api } from './api';
import type { ModuleSetupInfo } from '@hrms/shared';
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

interface SetupState {
  setupInfo: ModuleSetupInfo | null;
  isLoading: boolean;
  error: string | null;
  fetchSetupInfo: (moduleId: string) => Promise<void>;
  completeStep: (moduleId: string, stepId: string) => Promise<void>;
  completeSetup: (moduleId: string) => Promise<void>;
}

export const useSetupStore = create<SetupState>((set, get) => ({
  setupInfo: null,
  isLoading: false,
  error: null,

  fetchSetupInfo: async (moduleId: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.get<ModuleSetupInfo>(`/modules/${moduleId}/setup`);
      set({ setupInfo: res.data, isLoading: false });
    } catch (err: unknown) {
      set({ error: getErrorMessage(err, 'Failed to fetch setup info'), isLoading: false });
    }
  },

  completeStep: async (moduleId: string, stepId: string) => {
    try {
      await api.post(`/modules/${moduleId}/setup/${stepId}/complete`);
      await get().fetchSetupInfo(moduleId);
    } catch (err: unknown) {
      set({ error: getErrorMessage(err, 'Failed to complete step') });
      throw err;
    }
  },

  completeSetup: async (moduleId: string) => {
    try {
      await api.post(`/modules/${moduleId}/setup/complete`);
      await get().fetchSetupInfo(moduleId);
    } catch (err: unknown) {
      set({ error: getErrorMessage(err, 'Failed to complete setup') });
      throw err;
    }
  },
}));
