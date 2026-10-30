/**
 * Builds the personal calendar feed (iCalendar, RFC 5545) for a summer
 * worker. Pure functions so the format can be unit tested.
 *
 * Times are written in UTC so every calendar app shows them right without
 * needing a VTIMEZONE block. Shifts are stored as local Stockholm times.
 */

import { paidMinutes, formatDuration, shortTime, type ShiftType } from "./time";

export const TIME_ZONE = "Europe/Stockholm";

export interface CalendarShift {
  id: string;
  date: string; // YYYY-MM-DD, local Stockholm date
  startTime: string; // HH:MM or HH:MM:SS
  endTime: string;
  lunchMinutes: number;
  type: ShiftType;
  status: "planned" | "sick";
}

/** Offset of Stockholm from UTC in minutes at the given instant (60 or 120). */
function stockholmOffsetMinutes(instant: number): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(instant));
  const get = (type: string) => Number(parts.find((p) => p.type === type)!.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return Math.round((asUtc - instant) / 60000);
}

/** Converts a local Stockholm date and time to a UTC timestamp in ms. */
export function stockholmToUtc(date: string, time: string): number {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const naive = Date.UTC(y, m - 1, d, hh, mm);
  // Two passes handle the days when daylight saving time starts or ends.
  let utc = naive - stockholmOffsetMinutes(naive) * 60000;
  utc = naive - stockholmOffsetMinutes(utc) * 60000;
  return utc;
}

/** 20270703T080000Z */
export function formatUtc(ms: number): string {
  return new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** Escapes TEXT values (RFC 5545 3.3.11). */
export function escapeText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Folds a content line to at most 75 octets per line (RFC 5545 3.1). */
export function foldLine(line: string): string {
  const bytes = new TextEncoder();
  const out: string[] = [];
  let current = "";
  let size = 0;
  for (const char of line) {
    const charSize = bytes.encode(char).length;
    const limit = out.length === 0 ? 75 : 74; // continuation lines start with a space
    if (size + charSize > limit) {
      out.push(current);
      current = "";
      size = 0;
    }
    current += char;
    size += charSize;
  }
  out.push(current);
  return out.join("\r\n ");
}

export function shiftSummary(shift: CalendarShift): string {
  return shift.type === "trust" ? "Förtroendetid, kanotcentralen" : "Pass, kanotcentralen";
}

export function shiftDescription(shift: CalendarShift): string {
  const lunch = shift.lunchMinutes > 0 ? `Lunch ${shift.lunchMinutes} min` : "Ingen lunch";
  return `${shortTime(shift.startTime)}–${shortTime(shift.endTime)}. ${lunch}. Arbetstid ${formatDuration(paidMinutes(shift))}.`;
}

/**
 * The whole feed. Sick shifts are left out, so a shift disappears from the
 * calendar when it is marked sick and the replacement gets it instead.
 */
export function buildCalendar(opts: {
  shifts: CalendarShift[];
  host: string;
  appUrl?: string;
  now?: Date;
}): string {
  const stamp = formatUtc((opts.now ?? new Date()).getTime());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//kcpersonal//Mina pass//SV",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Kanotcentralen – mina pass",
    `X-WR-TIMEZONE:${TIME_ZONE}`,
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
  ];
  for (const shift of opts.shifts) {
    if (shift.status === "sick") continue;
    lines.push(
      "BEGIN:VEVENT",
      `UID:shift-${shift.id}@${opts.host}`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${formatUtc(stockholmToUtc(shift.date, shift.startTime))}`,
      `DTEND:${formatUtc(stockholmToUtc(shift.date, shift.endTime))}`,
      `SUMMARY:${escapeText(shiftSummary(shift))}`,
      `DESCRIPTION:${escapeText(shiftDescription(shift))}`,
      ...(opts.appUrl ? [`URL:${opts.appUrl}/day/${shift.date}`] : []),
      "TRANSP:OPAQUE",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join("\r\n") + "\r\n";
}
