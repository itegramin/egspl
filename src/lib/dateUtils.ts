/**
 * Date and Time formatting utilities standardized for Indian Standard Time (IST / Asia/Kolkata).
 */

const TIMEZONE_IST = 'Asia/Kolkata';
const LOCALE_IN = 'en-IN';

/**
 * Safely parse date to a Date object. Returns null if invalid or undefined.
 */
export function parseDate(dateVal: string | number | Date | null | undefined): Date | null {
  if (!dateVal) return null;
  const d = typeof dateVal === 'string' || typeof dateVal === 'number' ? new Date(dateVal) : dateVal;
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Formats a date string/timestamp into Indian Standard Date (e.g., "26 Aug 2026").
 */
export function formatDateIST(
  dateVal: string | number | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = parseDate(dateVal);
  if (!d) return '—';

  const defaultOpts: Intl.DateTimeFormatOptions = {
    timeZone: TIMEZONE_IST,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...options,
  };

  return new Intl.DateTimeFormat(LOCALE_IN, defaultOpts).format(d);
}

/**
 * Formats a time string/timestamp into Indian Standard Time (e.g., "01:30 PM").
 */
export function formatTimeIST(
  dateVal: string | number | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = parseDate(dateVal);
  if (!d) return '—';

  const defaultOpts: Intl.DateTimeFormatOptions = {
    timeZone: TIMEZONE_IST,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    ...options,
  };

  return new Intl.DateTimeFormat(LOCALE_IN, defaultOpts).format(d);
}

/**
 * Formats a date string/timestamp into complete Indian Standard Date & Time (e.g., "26 Aug 2026, 01:30 PM IST").
 */
export function formatDateTimeIST(
  dateVal: string | number | Date | null | undefined,
  includeTimezoneLabel = true
): string {
  const d = parseDate(dateVal);
  if (!d) return '—';

  const datePart = formatDateIST(d);
  const timePart = formatTimeIST(d);

  return `${datePart}, ${timePart}${includeTimezoneLabel ? ' IST' : ''}`;
}

/**
 * Formats a short date for compact tables/badges (e.g., "26 Aug").
 */
export function formatShortDateIST(dateVal: string | number | Date | null | undefined): string {
  const d = parseDate(dateVal);
  if (!d) return '—';

  return new Intl.DateTimeFormat(LOCALE_IN, {
    timeZone: TIMEZONE_IST,
    day: 'numeric',
    month: 'short',
  }).format(d);
}

/**
 * Formats full weekday date for dashboard header (e.g., "Wednesday, 26 Aug 2026").
 */
export function formatHeaderDateIST(dateVal: Date = new Date()): string {
  return new Intl.DateTimeFormat(LOCALE_IN, {
    timeZone: TIMEZONE_IST,
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(dateVal);
}
