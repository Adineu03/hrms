/**
 * Shared display formatters. Every date column in the app should render
 * through these so null/missing/invalid values show as "—" instead of
 * "Invalid Date".
 */

const EM_DASH = '—';

function parseDate(value: string | number | Date | null | undefined): Date | null {
  if (value === null || value === undefined || value === '') return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "12 Jun 2026" — or "—" for null/invalid input. */
export function formatDate(value: string | number | Date | null | undefined): string {
  const d = parseDate(value);
  if (!d) return EM_DASH;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** "12 Jun 2026, 10:30 AM" — or "—" for null/invalid input. */
export function formatDateTime(value: string | number | Date | null | undefined): string {
  const d = parseDate(value);
  if (!d) return EM_DASH;
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}
