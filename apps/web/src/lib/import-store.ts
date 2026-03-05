import { create } from 'zustand';
import { api } from './api';
import { AxiosError } from 'axios';
import type {
  ImportUploadResult,
  ColumnMappingData,
  ImportValidationResult,
  ImportExecuteResult,
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

export type ImportStep =
  | 'template'
  | 'upload'
  | 'mapping'
  | 'preview'
  | 'importing'
  | 'results';

interface ImportState {
  currentStep: ImportStep;
  uploadResult: ImportUploadResult | null;
  columnMapping: ColumnMappingData;
  validationResult: ImportValidationResult | null;
  executeResult: ImportExecuteResult | null;
  isProcessing: boolean;
  error: string | null;

  setStep: (step: ImportStep) => void;
  uploadFile: (file: File, type: string) => Promise<void>;
  setColumnMapping: (field: string, sourceColumn: string) => void;
  submitMapping: () => Promise<void>;
  validate: () => Promise<void>;
  execute: () => Promise<void>;
  reset: () => void;
}

export const useImportStore = create<ImportState>((set, get) => ({
  currentStep: 'template',
  uploadResult: null,
  columnMapping: {},
  validationResult: null,
  executeResult: null,
  isProcessing: false,
  error: null,

  setStep: (step) => set({ currentStep: step }),

  uploadFile: async (file, type) => {
    set({ isProcessing: true, error: null });
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);
      const res = await api.post('/data-import/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      set({
        uploadResult: res.data,
        columnMapping: res.data.suggestedMapping || {},
        currentStep: 'mapping',
        isProcessing: false,
      });
    } catch (err: unknown) {
      set({
        isProcessing: false,
        error: getErrorMessage(err, 'Upload failed'),
      });
    }
  },

  setColumnMapping: (field, sourceColumn) => {
    set({
      columnMapping: { ...get().columnMapping, [field]: sourceColumn },
    });
  },

  submitMapping: async () => {
    const { uploadResult, columnMapping } = get();
    if (!uploadResult) return;
    set({ isProcessing: true, error: null });
    try {
      await api.post(`/data-import/${uploadResult.importId}/map-columns`, {
        mapping: columnMapping,
      });
      set({ isProcessing: false });
      // auto-validate after mapping
      await get().validate();
    } catch (err: unknown) {
      set({
        isProcessing: false,
        error: getErrorMessage(err, 'Mapping failed'),
      });
    }
  },

  validate: async () => {
    const { uploadResult } = get();
    if (!uploadResult) return;
    set({ isProcessing: true, error: null });
    try {
      const res = await api.get(
        `/data-import/${uploadResult.importId}/validate`,
      );
      set({
        validationResult: res.data,
        currentStep: 'preview',
        isProcessing: false,
      });
    } catch (err: unknown) {
      set({
        isProcessing: false,
        error: getErrorMessage(err, 'Validation failed'),
      });
    }
  },

  execute: async () => {
    const { uploadResult } = get();
    if (!uploadResult) return;
    set({ isProcessing: true, currentStep: 'importing', error: null });
    try {
      const res = await api.post(
        `/data-import/${uploadResult.importId}/execute`,
      );
      set({
        executeResult: res.data,
        currentStep: 'results',
        isProcessing: false,
      });
    } catch (err: unknown) {
      set({
        isProcessing: false,
        error: getErrorMessage(err, 'Import failed'),
      });
    }
  },

  reset: () =>
    set({
      currentStep: 'template',
      uploadResult: null,
      columnMapping: {},
      validationResult: null,
      executeResult: null,
      isProcessing: false,
      error: null,
    }),
}));
