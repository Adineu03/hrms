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

/** "₹15,00,000" (Indian digit grouping, no decimals). */
export function formatINR(value: number | string | null | undefined): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return EM_DASH;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);
}

/** Compact lakh/crore style for KPI tiles: "₹15.0L", "₹1.2Cr", "₹47.6k". */
export function formatINRCompact(value: number | string | null | undefined): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return EM_DASH;
  const abs = Math.abs(n);
  if (abs >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(1)}Cr`;
  if (abs >= 1_00_000) return `₹${(n / 1_00_000).toFixed(1)}L`;
  if (abs >= 1_000) return `₹${(n / 1_000).toFixed(1)}k`;
  return `₹${Math.round(n)}`;
}
