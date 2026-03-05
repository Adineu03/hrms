import type { ImportValidationError } from '@hrms/shared';

export class EmployeeValidator {
  static validate(
    rows: Record<string, unknown>[],
    mapping: Record<string, string>,
    existingEmails: Set<string>,
  ): { validRows: Record<string, unknown>[]; errors: ImportValidationError[] } {
    const errors: ImportValidationError[] = [];
    const validRows: Record<string, unknown>[] = [];
    const seenEmails = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowErrors: ImportValidationError[] = [];
      const rowNum = i + 2; // +2 for header row + 0-index

      // Map columns
      const mapped: Record<string, unknown> = {};
      for (const [targetField, sourceColumn] of Object.entries(mapping)) {
        mapped[targetField] = row[sourceColumn] ?? '';
      }

      // Required: email
      const email = String(mapped['email'] || '').trim().toLowerCase();
      if (!email) {
        rowErrors.push({ row: rowNum, column: 'email', error: 'Email is required', severity: 'error' });
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        rowErrors.push({ row: rowNum, column: 'email', error: 'Invalid email format', severity: 'error' });
      } else if (existingEmails.has(email)) {
        rowErrors.push({ row: rowNum, column: 'email', error: 'Email already exists in system', severity: 'error' });
      } else if (seenEmails.has(email)) {
        rowErrors.push({ row: rowNum, column: 'email', error: 'Duplicate email in file', severity: 'error' });
      }
      if (email) seenEmails.add(email);

      // Required: firstName
      if (!mapped['firstName'] || !String(mapped['firstName']).trim()) {
        rowErrors.push({ row: rowNum, column: 'firstName', error: 'First name is required', severity: 'error' });
      }

      // Warnings for optional fields
      if (!mapped['department'] || !String(mapped['department']).trim()) {
        rowErrors.push({ row: rowNum, column: 'department', error: 'No department specified', severity: 'warning' });
      }

      errors.push(...rowErrors);
      if (!rowErrors.some(e => e.severity === 'error')) {
        validRows.push(mapped);
      }
    }

    return { validRows, errors };
  }
}
