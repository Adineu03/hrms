import { create } from 'zustand';
import { api } from './api';
import { AxiosError } from 'axios';
import type { EmployeeProfileData, BankDetails } from '@hrms/shared';

function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof AxiosError) {
    return err.response?.data?.message || err.message || fallback;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return fallback;
}

interface EmployeeProfileState {
  profile: EmployeeProfileData | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;

  fetchProfile: () => Promise<void>;
  updateProfile: (data: Partial<EmployeeProfileData>) => Promise<void>;
  updateBankDetails: (data: BankDetails) => Promise<void>;
}

export const useEmployeeProfileStore = create<EmployeeProfileState>(
  (set) => ({
    profile: null,
    isLoading: false,
    isSaving: false,
    error: null,

    fetchProfile: async () => {
      set({ isLoading: true, error: null });
      try {
        const res = await api.get('/cold-start/my-profile');
        set({ profile: res.data, isLoading: false });
      } catch (err: unknown) {
        set({
          isLoading: false,
          error: getErrorMessage(err, 'Failed to load profile'),
        });
      }
    },

    updateProfile: async (data) => {
      set({ isSaving: true, error: null });
      try {
        const res = await api.patch('/cold-start/my-profile', data);
        set({ profile: res.data, isSaving: false });
      } catch (err: unknown) {
        set({
          isSaving: false,
          error: getErrorMessage(err, 'Failed to update profile'),
        });
        throw err;
      }
    },

    updateBankDetails: async (data) => {
      set({ isSaving: true, error: null });
      try {
        const res = await api.patch(
          '/cold-start/my-profile/bank-details',
          data,
        );
        set({ profile: res.data, isSaving: false });
      } catch (err: unknown) {
        set({
          isSaving: false,
          error: getErrorMessage(err, 'Failed to update bank details'),
        });
        throw err;
      }
    },
  }),
);
