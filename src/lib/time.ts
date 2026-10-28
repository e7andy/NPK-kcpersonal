/**
 * Calculation rules for worked time. See docs/datamodell.md.
 *
 * Worked time is never stored; it is always derived from the shift's start,
 * end and lunch. All functions here are pure so they can be unit tested.
 */

/**
 * "regular": normal working time.
 * "trust": förtroendetid – extra time outside normal working hours, such as
 * supervision or offboarding. Reported separately and never part of normal
 * or weekend time.
 */
export type ShiftType = "regular" | "trust";
export type ShiftStatus = "planned" | "sick";

export interface ShiftTimes {
  startTime: string; // "HH:MM" or "HH:MM:SS"
  endTime: string;
  lunchMinutes: number;
}

export interface ShiftForCalc extends ShiftTimes {
  type: ShiftType;
  status: ShiftStatus;
}

export interface DaySummary {
  /** Worked minutes on planned regular shifts. */
  normalMinutes: number;
  /** Equal to normalMinutes on weekends and public holidays, otherwise 0. */
  weekendMinutes: number;
  /** Planned minutes on regular shifts marked sick. */
  sickMinutes: number;
  /** Minutes on planned trust-time shifts (förtroendetid). */
  trustMinutes: number;
}

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)(:00)?$/;

export function isTimeString(value: string): boolean {
  return TIME_RE.test(value);
}

/** Minutes since midnight for "HH:MM" or "HH:MM:SS". */
export function toMinutes(time: string): number {
  const m = TIME_RE.exec(time);
  if (!m) throw new Error(`Invalid time: ${time}`);
  return Number(m[1]) * 60 + Number(m[2]);
}

/** "HH:MM" from "HH:MM" or "HH:MM:SS". */
export function shortTime(time: string): string {
  return time.slice(0, 5);
}

export function shiftLengthMinutes(shift: ShiftTimes): number {
  return toMinutes(shift.endTime) - toMinutes(shift.startTime);
}

/** Paid minutes of a shift: length minus lunch. */
export function paidMinutes(shift: ShiftTimes): number {
  return shiftLengthMinutes(shift) - shift.lunchMinutes;
}

/** Returns a Swedish error message, or null if the shift times are valid. */
export function validateShiftTimes(shift: ShiftTimes): string | null {
  if (!isTimeString(shift.startTime) || !isTimeString(shift.endTime)) {
    return "Ange tider som TT:MM.";
  }
  const length = shiftLengthMinutes(shift);
  if (length <= 0) return "Sluttiden måste vara efter starttiden.";
  if (!Number.isInteger(shift.lunchMinutes) || shift.lunchMinutes < 0) {
    return "Lunch måste vara ett heltal minuter, 0 eller mer.";
  }
  if (shift.lunchMinutes >= length) return "Lunchen måste vara kortare än passet.";
  return null;
}

/** True if two shifts on the same day overlap. Touching ends do not overlap. */
export function overlaps(a: ShiftTimes, b: ShiftTimes): boolean {
  return (
    toMinutes(a.startTime) < toMinutes(b.endTime) &&
    toMinutes(b.startTime) < toMinutes(a.endTime)
  );
}

export function summarizeDay(shifts: ShiftForCalc[], isWeekend: boolean): DaySummary {
  let normalMinutes = 0;
  let sickMinutes = 0;
  let trustMinutes = 0;
  for (const shift of shifts) {
    const minutes = paidMinutes(shift);
    if (shift.type === "trust") {
      // Trust time that is not worked (marked sick) gives no time at all.
      if (shift.status === "planned") trustMinutes += minutes;
    } else if (shift.status === "sick") {
      sickMinutes += minutes;
    } else {
      normalMinutes += minutes;
    }
  }
  return {
    normalMinutes,
    weekendMinutes: isWeekend ? normalMinutes : 0,
    sickMinutes,
    trustMinutes,
  };
}

export function addSummaries(a: DaySummary, b: DaySummary): DaySummary {
  return {
    normalMinutes: a.normalMinutes + b.normalMinutes,
    weekendMinutes: a.weekendMinutes + b.weekendMinutes,
    sickMinutes: a.sickMinutes + b.sickMinutes,
    trustMinutes: a.trustMinutes + b.trustMinutes,
  };
}

export const EMPTY_SUMMARY: DaySummary = {
  normalMinutes: 0,
  weekendMinutes: 0,
  sickMinutes: 0,
  trustMinutes: 0,
};

/** Hours with two decimals, as a number (minutes / 60). */
export function toHours(minutes: number): number {
  return Math.round((minutes / 60) * 100) / 100;
}

/** Hours with a Swedish decimal comma, e.g. "7,50". */
export function formatHours(minutes: number): string {
  return toHours(minutes).toFixed(2).replace(".", ",");
}

/** Duration as "7 h 30 min". */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}
