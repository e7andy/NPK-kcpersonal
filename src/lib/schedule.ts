import "server-only";
import { and, asc, eq, gte, inArray, lte, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { holidays, monthApprovals, shiftTemplates, shifts, user } from "@/db/schema";
import { firstDayOfMonth, isSaturdayOrSunday, lastDayOfMonth, monthOf } from "./dates";
import {
  addSummaries,
  EMPTY_SUMMARY,
  overlaps,
  summarizeDay,
  type DaySummary,
  type ShiftTimes,
} from "./time";

export interface ShiftRow {
  id: string;
  userId: string;
  userName: string;
  date: string;
  startTime: string;
  endTime: string;
  lunchMinutes: number;
  type: "regular" | "trust";
  status: "planned" | "sick";
  replacesShiftId: string | null;
  note: string | null;
}

const shiftColumns = {
  id: shifts.id,
  userId: shifts.userId,
  userName: user.name,
  date: shifts.date,
  startTime: shifts.startTime,
  endTime: shifts.endTime,
  lunchMinutes: shifts.lunchMinutes,
  type: shifts.type,
  status: shifts.status,
  replacesShiftId: shifts.replacesShiftId,
  note: shifts.note,
};

export async function getShifts(opts: {
  from: string;
  to: string;
  userId?: string;
}): Promise<ShiftRow[]> {
  const conditions = [gte(shifts.date, opts.from), lte(shifts.date, opts.to)];
  if (opts.userId) conditions.push(eq(shifts.userId, opts.userId));
  return db
    .select(shiftColumns)
    .from(shifts)
    .innerJoin(user, eq(user.id, shifts.userId))
    .where(and(...conditions))
    .orderBy(asc(shifts.date), asc(shifts.startTime), asc(user.name));
}

export async function getShift(id: string): Promise<ShiftRow | null> {
  const [row] = await db
    .select(shiftColumns)
    .from(shifts)
    .innerJoin(user, eq(user.id, shifts.userId))
    .where(eq(shifts.id, id));
  return row ?? null;
}

/** Map of date → holiday name in the range. */
export async function getHolidays(from: string, to: string): Promise<Map<string, string>> {
  const rows = await db
    .select()
    .from(holidays)
    .where(and(gte(holidays.date, from), lte(holidays.date, to)));
  return new Map(rows.map((r) => [r.date, r.name]));
}

/** Weekend in the payroll sense: Saturday, Sunday or a date in the holidays table. */
export function isWeekendDay(date: string, holidayMap: Map<string, string>): boolean {
  return isSaturdayOrSunday(date) || holidayMap.has(date);
}

export async function getActiveTemplates() {
  return db
    .select()
    .from(shiftTemplates)
    .where(eq(shiftTemplates.active, true))
    .orderBy(asc(shiftTemplates.sortOrder), asc(shiftTemplates.startTime));
}

/** Active users with the worker role, sorted by name. */
export async function getWorkers() {
  return db
    .select({ id: user.id, name: user.name })
    .from(user)
    .where(and(eq(user.active, true), sql`'worker' = any(${user.roles})`))
    .orderBy(asc(user.name));
}

// ---------------------------------------------------------------------------
// Month approval and locking
// ---------------------------------------------------------------------------

export type MonthStatus = {
  month: string;
  locked: boolean;
  status: "open" | "approved" | "unlocked";
  approvedAt: Date | null;
  approvedByName: string | null;
  unlockComment: string | null;
};

export async function getMonthStatus(month: string): Promise<MonthStatus> {
  const [row] = await db
    .select({
      status: monthApprovals.status,
      approvedAt: monthApprovals.approvedAt,
      approvedByName: user.name,
      unlockComment: monthApprovals.unlockComment,
    })
    .from(monthApprovals)
    .leftJoin(user, eq(user.id, monthApprovals.approvedBy))
    .where(eq(monthApprovals.month, firstDayOfMonth(month)));
  if (!row) {
    return { month, locked: false, status: "open", approvedAt: null, approvedByName: null, unlockComment: null };
  }
  return {
    month,
    locked: row.status === "approved",
    status: row.status,
    approvedAt: row.approvedAt,
    approvedByName: row.approvedByName,
    unlockComment: row.status === "unlocked" ? row.unlockComment : null,
  };
}

export async function getLockedMonths(): Promise<Set<string>> {
  const rows = await db
    .select({ month: monthApprovals.month })
    .from(monthApprovals)
    .where(eq(monthApprovals.status, "approved"));
  return new Set(rows.map((r) => monthOf(r.month)));
}

export async function isDateLocked(date: string): Promise<boolean> {
  return (await getMonthStatus(monthOf(date))).locked;
}

// ---------------------------------------------------------------------------
// Overlaps and replacements
// ---------------------------------------------------------------------------

/** Returns an overlapping shift for the user on the date, if any. */
export async function findOverlap(
  userId: string,
  date: string,
  times: ShiftTimes,
  excludeShiftId?: string,
): Promise<ShiftRow | null> {
  const conditions = [eq(shifts.userId, userId), eq(shifts.date, date)];
  if (excludeShiftId) conditions.push(ne(shifts.id, excludeShiftId));
  const sameDay = await db
    .select(shiftColumns)
    .from(shifts)
    .innerJoin(user, eq(user.id, shifts.userId))
    .where(and(...conditions));
  return sameDay.find((s) => overlaps(s, times)) ?? null;
}

/** Active workers, other than the sick person, who are free during the shift. */
export async function getReplacementCandidates(shift: ShiftRow) {
  const workers = await getWorkers();
  const sameDay = await getShifts({ from: shift.date, to: shift.date });
  const busy = new Set(sameDay.filter((s) => overlaps(s, shift)).map((s) => s.userId));
  return workers.filter((w) => w.id !== shift.userId && !busy.has(w.id));
}

// ---------------------------------------------------------------------------
// Payroll
// ---------------------------------------------------------------------------

export interface PayrollDay extends DaySummary {
  date: string;
  isWeekend: boolean;
}

export interface PayrollPerson {
  userId: string;
  name: string;
  fortnoxEmployeeId: string | null;
  days: PayrollDay[]; // only days with any time
  total: DaySummary;
}

export async function buildPayroll(month: string): Promise<PayrollPerson[]> {
  const from = firstDayOfMonth(month);
  const to = lastDayOfMonth(month);
  const [rows, holidayMap] = await Promise.all([getShifts({ from, to }), getHolidays(from, to)]);

  const userIds = [...new Set(rows.map((r) => r.userId))];
  const people = userIds.length
    ? await db
        .select({ id: user.id, name: user.name, fortnoxEmployeeId: user.fortnoxEmployeeId })
        .from(user)
        .where(inArray(user.id, userIds))
    : [];

  const byUserDay = new Map<string, Map<string, ShiftRow[]>>();
  for (const r of rows) {
    const days = byUserDay.get(r.userId) ?? new Map<string, ShiftRow[]>();
    days.set(r.date, [...(days.get(r.date) ?? []), r]);
    byUserDay.set(r.userId, days);
  }

  return people
    .map((p) => {
      const days: PayrollDay[] = [];
      let total = EMPTY_SUMMARY;
      for (const [date, dayShifts] of [...(byUserDay.get(p.id) ?? new Map())].sort()) {
        const isWeekend = isWeekendDay(date, holidayMap);
        const summary = summarizeDay(dayShifts, isWeekend);
        days.push({ date, isWeekend, ...summary });
        total = addSummaries(total, summary);
      }
      return { userId: p.id, name: p.name, fortnoxEmployeeId: p.fortnoxEmployeeId, days, total };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "sv"));
}
