'use client';

import { useRef, useState } from 'react';
import { useImportStore, type ImportStep } from '@/lib/import-store';
import { EMPLOYEE_IMPORT_FIELDS } from '@hrms/shared';
import {
  Loader2,
  Download,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  XCircle,
  RefreshCw,
} from 'lucide-react';

const selectClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary appearance-none';

const STEPS: { id: ImportStep; label: string; number: number }[] = [
  { id: 'template', label: 'Template', number: 1 },
  { id: 'upload', label: 'Upload', number: 2 },
  { id: 'mapping', label: 'Mapping', number: 3 },
  { id: 'preview', label: 'Preview', number: 4 },
  { id: 'results', label: 'Results', number: 5 },
];

export default function ImportTab() {
  const {
    currentStep,
    uploadResult,
    columnMapping,
    validationResult,
    executeResult,
    isProcessing,
    error,
    setStep,
    uploadFile,
    setColumnMapping,
    submitMapping,
    execute,
    reset,
  } = useImportStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep);

  const handleFileSelect = (file: File) => {
    uploadFile(file, 'employees');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => {
    setDragActive(false);
  };

  const handleDownloadTemplate = () => {
    // Build CSV from EMPLOYEE_IMPORT_FIELDS
    const headers = EMPLOYEE_IMPORT_FIELDS.map((f) => f.label).join(',');
    const csv = headers + '\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'employee-import-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text mb-1">Data Import</h2>
        <p className="text-sm text-text-muted">
          Bulk import employees from a CSV or Excel file.
        </p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((step, idx) => {
          const isActive = step.id === currentStep;
          const isCompleted = idx < currentStepIndex;
          const isImporting = currentStep === 'importing';
          return (
            <div key={step.id} className="flex items-center gap-2">
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-white'
                    : isCompleted
                      ? 'bg-primary/10 text-primary'
                      : 'bg-background text-text-muted border border-border'
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : isActive && isImporting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <span>{step.number}</span>
                )}
                {step.label}
              </div>
              {idx < STEPS.length - 1 && (
                <ArrowRight className="h-3.5 w-3.5 text-text-muted" />
              )}
            </div>
          );
        })}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Step 1: Template */}
      {currentStep === 'template' && (
        <div className="bg-background rounded-lg border border-border p-6">
          <div className="text-center">
            <FileSpreadsheet className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-text mb-2">
              Download Import Template
            </h3>
            <p className="text-sm text-text-muted mb-6 max-w-md mx-auto">
              Download the CSV template, fill in your employee data, and
              upload it in the next step. Required fields are marked with an
              asterisk.
            </p>

            <div className="mb-6">
              <div className="inline-block text-left bg-card rounded-lg border border-border p-4">
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                  Template Fields
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {EMPLOYEE_IMPORT_FIELDS.map((f) => (
                    <span
                      key={f.field}
                      className={`px-2 py-0.5 rounded text-xs ${
                        f.required
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'bg-background text-text-muted border border-border'
                      }`}
                    >
                      {f.label}
                      {f.required && ' *'}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover transition-colors"
              >
                <Download className="h-4 w-4" />
                Download CSV Template
              </button>
              <button
                type="button"
                onClick={() => setStep('upload')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors"
              >
                Skip to Upload
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Upload */}
      {currentStep === 'upload' && (
        <div className="space-y-4">
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
              dragActive
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50 hover:bg-background'
            }`}
          >
            <Upload className="h-10 w-10 text-text-muted mx-auto mb-4" />
            <p className="text-sm font-medium text-text mb-1">
              Drop your CSV or Excel file here
            </p>
            <p className="text-xs text-text-muted">
              or click to browse. Supports .csv, .xlsx, .xls files.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
              }}
            />
          </div>

          {isProcessing && (
            <div className="flex items-center justify-center gap-2 py-4">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-sm text-text-muted">
                Uploading and parsing file...
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={() => setStep('template')}
            className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-text transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Template
          </button>
        </div>
      )}

      {/* Step 3: Column Mapping */}
      {currentStep === 'mapping' && uploadResult && (
        <div className="space-y-5">
          <div className="bg-background rounded-lg border border-border p-4">
            <p className="text-sm text-text">
              <span className="font-medium">File:</span>{' '}
              {uploadResult.fileName} ({uploadResult.rowCount} rows detected)
            </p>
          </div>

          <p className="text-sm text-text-muted">
            Map your file columns to the employee fields below. Pre-filled
            mappings are based on column header similarity.
          </p>

          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-background border-b border-border">
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                    Employee Field
                  </th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                    Your File Column
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {EMPLOYEE_IMPORT_FIELDS.map((field) => (
                  <tr key={field.field} className="bg-card">
                    <td className="px-4 py-3 text-sm">
                      <span className="text-text font-medium">
                        {field.label}
                      </span>
                      {field.required && (
                        <span className="text-red-500 ml-1">*</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <select
                        value={columnMapping[field.field] || ''}
                        onChange={(e) =>
                          setColumnMapping(field.field, e.target.value)
                        }
                        className={`${selectClassName} text-sm`}
                      >
                        <option value="">-- Not mapped --</option>
                        {uploadResult.headers.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep('upload')}
              className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-text transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <button
              type="button"
              onClick={submitMapping}
              disabled={isProcessing}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Validating...
                </>
              ) : (
                <>
                  Validate & Preview
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Preview */}
      {currentStep === 'preview' && validationResult && (
        <div className="space-y-5">
          {/* Validation Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-background rounded-lg border border-border p-4 text-center">
              <p className="text-2xl font-bold text-text">
                {validationResult.totalRows}
              </p>
              <p className="text-xs text-text-muted mt-1">Total Rows</p>
            </div>
            <div className="bg-green-50 rounded-lg border border-green-200 p-4 text-center">
              <p className="text-2xl font-bold text-green-700">
                {validationResult.validRows}
              </p>
              <p className="text-xs text-green-600 mt-1">Valid</p>
            </div>
            <div
              className={`rounded-lg border p-4 text-center ${
                validationResult.errorRows > 0
                  ? 'bg-red-50 border-red-200'
                  : 'bg-background border-border'
              }`}
            >
              <p
                className={`text-2xl font-bold ${
                  validationResult.errorRows > 0
                    ? 'text-red-700'
                    : 'text-text-muted'
                }`}
              >
                {validationResult.errorRows}
              </p>
              <p
                className={`text-xs mt-1 ${
                  validationResult.errorRows > 0
                    ? 'text-red-600'
                    : 'text-text-muted'
                }`}
              >
                Errors
              </p>
            </div>
          </div>

          {/* Errors List */}
          {validationResult.errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-1.5">
                <XCircle className="h-4 w-4" />
                Validation Errors ({validationResult.errors.length})
              </h4>
              <div className="max-h-40 overflow-y-auto space-y-1.5">
                {validationResult.errors.slice(0, 20).map((err, idx) => (
                  <p key={idx} className="text-xs text-red-600">
                    Row {err.row}, Column &quot;{err.column}&quot;:{' '}
                    {err.error}
                  </p>
                ))}
                {validationResult.errors.length > 20 && (
                  <p className="text-xs text-red-500 font-medium">
                    ... and {validationResult.errors.length - 20} more errors
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Preview Table */}
          {validationResult.preview.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-text mb-2">
                Data Preview (first {validationResult.preview.length} rows)
              </h4>
              <div className="border border-border rounded-xl overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-background border-b border-border">
                      {Object.keys(validationResult.preview[0]).map(
                        (key) => (
                          <th
                            key={key}
                            className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-3 py-2 whitespace-nowrap"
                          >
                            {key}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {validationResult.preview.map((row, idx) => (
                      <tr key={idx} className="bg-card">
                        {Object.values(row).map((val, ci) => (
                          <td
                            key={ci}
                            className="px-3 py-2 text-xs text-text whitespace-nowrap"
                          >
                            {String(val ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep('mapping')}
              className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-text transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Mapping
            </button>
            <button
              type="button"
              onClick={execute}
              disabled={isProcessing || validationResult.validRows === 0}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  Import {validationResult.validRows} Employees
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Importing State */}
      {currentStep === 'importing' && (
        <div className="bg-background rounded-lg border border-border p-12 text-center">
          <Loader2 className="h-10 w-10 text-primary animate-spin mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-text mb-1">
            Importing Data...
          </h3>
          <p className="text-sm text-text-muted">
            Please wait while we process your employee data. This may take a
            moment.
          </p>
        </div>
      )}

      {/* Step 5: Results */}
      {currentStep === 'results' && executeResult && (
        <div className="space-y-5">
          <div className="bg-green-50 rounded-lg border border-green-200 p-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-green-800 mb-1">
              Import Complete
            </h3>
            <p className="text-sm text-green-700">
              Successfully imported {executeResult.importedRows} employees.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-green-50 rounded-lg border border-green-200 p-4 text-center">
              <p className="text-2xl font-bold text-green-700">
                {executeResult.importedRows}
              </p>
              <p className="text-xs text-green-600 mt-1">Imported</p>
            </div>
            <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-4 text-center">
              <p className="text-2xl font-bold text-yellow-700">
                {executeResult.skippedRows}
              </p>
              <p className="text-xs text-yellow-600 mt-1">Skipped</p>
            </div>
            <div
              className={`rounded-lg border p-4 text-center ${
                executeResult.errors.length > 0
                  ? 'bg-red-50 border-red-200'
                  : 'bg-background border-border'
              }`}
            >
              <p
                className={`text-2xl font-bold ${
                  executeResult.errors.length > 0
                    ? 'text-red-700'
                    : 'text-text-muted'
                }`}
              >
                {executeResult.errors.length}
              </p>
              <p
                className={`text-xs mt-1 ${
                  executeResult.errors.length > 0
                    ? 'text-red-600'
                    : 'text-text-muted'
                }`}
              >
                Errors
              </p>
            </div>
          </div>

          {executeResult.errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-red-700 mb-2">
                Import Errors
              </h4>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {executeResult.errors.map((err, idx) => (
                  <p key={idx} className="text-xs text-red-600">
                    Row {err.row}: {err.error}
                  </p>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-center">
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Import More Data
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
