/**
 * Date helpers working on plain "YYYY-MM-DD" strings.
 *
 * Shifts belong to a local calendar day in Europe/Stockholm and never cross
 * midnight, so dates are handled as strings and all arithmetic is done in UTC
 * to avoid daylight saving surprises.
 */

export const TIME_ZONE = "Europe/Stockholm";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_RE = /^\d{4}-\d{2}$/;

export function isDateString(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const d = parseDate(value);
  return formatDate(d) === value;
}

export function isMonthString(value: string): boolean {
  if (!MONTH_RE.test(value)) return false;
  const m = Number(value.slice(5, 7));
  return m >= 1 && m <= 12;
}

/** Parses "YYYY-MM-DD" into a Date at UTC midnight. */
export function parseDate(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Formats a UTC-midnight Date as "YYYY-MM-DD". */
export function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(value: string, days: number): string {
  const d = parseDate(value);
  d.setUTCDate(d.getUTCDate() + days);
  return formatDate(d);
}

/** Today's date in Stockholm. */
export function today(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** ISO weekday: 1 = Monday … 7 = Sunday. */
export function isoWeekday(value: string): number {
  const day = parseDate(value).getUTCDay();
  return day === 0 ? 7 : day;
}

export function isSaturdayOrSunday(value: string): boolean {
  return isoWeekday(value) >= 6;
}

/** Monday of the ISO week containing the date. */
export function startOfWeek(value: string): string {
  return addDays(value, 1 - isoWeekday(value));
}

/** ISO week number. */
export function isoWeek(value: string): number {
  const d = parseDate(value);
  // Thursday of the same week decides which year the week belongs to.
  d.setUTCDate(d.getUTCDate() + 4 - isoWeekday(value));
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - yearStart) / 86_400_000 + 1) / 7);
}

/** Inclusive list of dates from start to end. */
export function dateRange(start: string, end: string): string[] {
  const out: string[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) out.push(d);
  return out;
}

/** "YYYY-MM" of a date. */
export function monthOf(value: string): string {
  return value.slice(0, 7);
}

export function firstDayOfMonth(month: string): string {
  return `${month}-01`;
}

export function lastDayOfMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return formatDate(new Date(Date.UTC(y, m, 0)));
}

export function addMonths(month: string, months: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + months, 1));
  return formatDate(d).slice(0, 7);
}

const WEEKDAYS_SHORT = ["mån", "tis", "ons", "tor", "fre", "lör", "sön"];
const WEEKDAYS_LONG = ["måndag", "tisdag", "onsdag", "torsdag", "fredag", "lördag", "söndag"];
const MONTHS = [
  "januari", "februari", "mars", "april", "maj", "juni",
  "juli", "augusti", "september", "oktober", "november", "december",
];

export function weekdayShort(value: string): string {
  return WEEKDAYS_SHORT[isoWeekday(value) - 1];
}

export function weekdayLong(value: string): string {
  return WEEKDAYS_LONG[isoWeekday(value) - 1];
}

/** "3 juli" */
export function dayMonth(value: string): string {
  const d = parseDate(value);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

const MONTHS_SHORT = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

/** "3 jul" */
export function dayMonthShort(value: string): string {
  const d = parseDate(value);
  return `${d.getUTCDate()} ${MONTHS_SHORT[d.getUTCMonth()]}`;
}

/** "juli 2027" */
export function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

/** "juli 2027" → "Juli 2027" */
export function upperFirst(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
