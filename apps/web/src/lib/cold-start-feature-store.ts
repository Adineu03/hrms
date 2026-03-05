import { create } from 'zustand';
import { api } from './api';
import { AxiosError } from 'axios';
import type {
  LocationData,
  GradeData,
  OrgSettingsData,
  EnhancedCompanyProfileData,
  SettingsDashboard,
  InvitationData,
  EmployeeWithProfile,
} from '@hrms/shared';

function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof AxiosError) {
    return err.response?.data?.message || err.message || fallback;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return fallback;
}

interface ColdStartFeatureState {
  // Dashboard
  dashboard: SettingsDashboard | null;
  isDashboardLoading: boolean;
  fetchDashboard: () => Promise<void>;

  // Company profile
  companyProfile: EnhancedCompanyProfileData | null;
  isProfileLoading: boolean;
  fetchCompanyProfile: () => Promise<void>;
  saveCompanyProfile: (data: EnhancedCompanyProfileData) => Promise<void>;

  // Org settings
  orgSettings: OrgSettingsData | null;
  isSettingsLoading: boolean;
  fetchOrgSettings: () => Promise<void>;
  saveOrgSettings: (data: OrgSettingsData) => Promise<void>;

  // Locations
  locations: LocationData[];
  isLocationsLoading: boolean;
  fetchLocations: () => Promise<void>;
  createLocation: (data: LocationData) => Promise<void>;
  updateLocation: (id: string, data: Partial<LocationData>) => Promise<void>;
  deleteLocation: (id: string) => Promise<void>;

  // Grades
  grades: GradeData[];
  isGradesLoading: boolean;
  fetchGrades: () => Promise<void>;
  createGrade: (data: GradeData) => Promise<void>;
  updateGrade: (id: string, data: Partial<GradeData>) => Promise<void>;
  deleteGrade: (id: string) => Promise<void>;

  // Invitations
  invitations: InvitationData[];
  isInvitationsLoading: boolean;
  fetchInvitations: () => Promise<void>;
  sendInvitation: (data: {
    email: string;
    firstName?: string;
    lastName?: string;
    role?: string;
  }) => Promise<void>;
  revokeInvitation: (id: string) => Promise<void>;

  // Employees
  employees: EmployeeWithProfile[];
  isEmployeesLoading: boolean;
  fetchEmployees: () => Promise<void>;

  error: string | null;
}

export const useColdStartFeatureStore = create<ColdStartFeatureState>(
  (set, get) => ({
    // Initial state
    dashboard: null,
    isDashboardLoading: false,
    companyProfile: null,
    isProfileLoading: false,
    orgSettings: null,
    isSettingsLoading: false,
    locations: [],
    isLocationsLoading: false,
    grades: [],
    isGradesLoading: false,
    invitations: [],
    isInvitationsLoading: false,
    employees: [],
    isEmployeesLoading: false,
    error: null,

    fetchDashboard: async () => {
      set({ isDashboardLoading: true, error: null });
      try {
        const res = await api.get('/cold-start/settings/dashboard');
        set({ dashboard: res.data, isDashboardLoading: false });
      } catch (err: unknown) {
        set({
          isDashboardLoading: false,
          error: getErrorMessage(err, 'Failed to load dashboard'),
        });
      }
    },

    fetchCompanyProfile: async () => {
      set({ isProfileLoading: true, error: null });
      try {
        const res = await api.get('/cold-start/company-profile');
        set({ companyProfile: res.data, isProfileLoading: false });
      } catch (err: unknown) {
        set({
          isProfileLoading: false,
          error: getErrorMessage(err, 'Failed to load company profile'),
        });
      }
    },

    saveCompanyProfile: async (data) => {
      set({ error: null });
      try {
        await api.post('/cold-start/company-profile', data);
        set({ companyProfile: data });
      } catch (err: unknown) {
        set({
          error: getErrorMessage(err, 'Failed to save company profile'),
        });
        throw err;
      }
    },

    fetchOrgSettings: async () => {
      set({ isSettingsLoading: true, error: null });
      try {
        const res = await api.get('/cold-start/org-settings');
        set({ orgSettings: res.data, isSettingsLoading: false });
      } catch (err: unknown) {
        set({
          isSettingsLoading: false,
          error: getErrorMessage(err, 'Failed to load org settings'),
        });
      }
    },

    saveOrgSettings: async (data) => {
      set({ error: null });
      try {
        await api.post('/cold-start/org-settings', data);
        set({ orgSettings: data });
      } catch (err: unknown) {
        set({
          error: getErrorMessage(err, 'Failed to save org settings'),
        });
        throw err;
      }
    },

    fetchLocations: async () => {
      set({ isLocationsLoading: true, error: null });
      try {
        const res = await api.get('/cold-start/locations');
        set({ locations: res.data, isLocationsLoading: false });
      } catch (err: unknown) {
        set({
          isLocationsLoading: false,
          error: getErrorMessage(err, 'Failed to load locations'),
        });
      }
    },

    createLocation: async (data) => {
      set({ error: null });
      try {
        const res = await api.post('/cold-start/locations', data);
        set({ locations: [...get().locations, res.data] });
      } catch (err: unknown) {
        set({
          error: getErrorMessage(err, 'Failed to create location'),
        });
        throw err;
      }
    },

    updateLocation: async (id, data) => {
      set({ error: null });
      try {
        const res = await api.patch(`/cold-start/locations/${id}`, data);
        set({
          locations: get().locations.map((l) =>
            l.id === id ? res.data : l,
          ),
        });
      } catch (err: unknown) {
        set({
          error: getErrorMessage(err, 'Failed to update location'),
        });
        throw err;
      }
    },

    deleteLocation: async (id) => {
      set({ error: null });
      try {
        await api.delete(`/cold-start/locations/${id}`);
        set({
          locations: get().locations.filter((l) => l.id !== id),
        });
      } catch (err: unknown) {
        set({
          error: getErrorMessage(err, 'Failed to delete location'),
        });
        throw err;
      }
    },

    fetchGrades: async () => {
      set({ isGradesLoading: true, error: null });
      try {
        const res = await api.get('/cold-start/grades');
        set({ grades: res.data, isGradesLoading: false });
      } catch (err: unknown) {
        set({
          isGradesLoading: false,
          error: getErrorMessage(err, 'Failed to load grades'),
        });
      }
    },

    createGrade: async (data) => {
      set({ error: null });
      try {
        const res = await api.post('/cold-start/grades', data);
        set({ grades: [...get().grades, res.data] });
      } catch (err: unknown) {
        set({ error: getErrorMessage(err, 'Failed to create grade') });
        throw err;
      }
    },

    updateGrade: async (id, data) => {
      set({ error: null });
      try {
        const res = await api.patch(`/cold-start/grades/${id}`, data);
        set({
          grades: get().grades.map((g) => (g.id === id ? res.data : g)),
        });
      } catch (err: unknown) {
        set({ error: getErrorMessage(err, 'Failed to update grade') });
        throw err;
      }
    },

    deleteGrade: async (id) => {
      set({ error: null });
      try {
        await api.delete(`/cold-start/grades/${id}`);
        set({ grades: get().grades.filter((g) => g.id !== id) });
      } catch (err: unknown) {
        set({ error: getErrorMessage(err, 'Failed to delete grade') });
        throw err;
      }
    },

    fetchInvitations: async () => {
      set({ isInvitationsLoading: true, error: null });
      try {
        const res = await api.get('/cold-start/invitations');
        set({ invitations: res.data, isInvitationsLoading: false });
      } catch (err: unknown) {
        set({
          isInvitationsLoading: false,
          error: getErrorMessage(err, 'Failed to load invitations'),
        });
      }
    },

    sendInvitation: async (data) => {
      set({ error: null });
      try {
        const res = await api.post('/cold-start/invitations/send', data);
        set({ invitations: [res.data, ...get().invitations] });
      } catch (err: unknown) {
        set({
          error: getErrorMessage(err, 'Failed to send invitation'),
        });
        throw err;
      }
    },

    revokeInvitation: async (id) => {
      set({ error: null });
      try {
        await api.delete(`/cold-start/invitations/${id}`);
        set({
          invitations: get().invitations.filter((i) => i.id !== id),
        });
      } catch (err: unknown) {
        set({
          error: getErrorMessage(err, 'Failed to revoke invitation'),
        });
        throw err;
      }
    },

    fetchEmployees: async () => {
      set({ isEmployeesLoading: true, error: null });
      try {
        const res = await api.get('/cold-start/employees');
        set({ employees: res.data, isEmployeesLoading: false });
      } catch (err: unknown) {
        set({
          isEmployeesLoading: false,
          error: getErrorMessage(err, 'Failed to load employees'),
        });
      }
    },
  }),
);
