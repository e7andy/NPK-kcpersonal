/**
 * Days that count as weekend for payroll: Swedish public holidays ("röda
 * dagar") plus Midsommarafton, which kanotcentralen also counts as a holiday.
 * Used to pre-fill the holidays table; the table is the source of truth and
 * admins can add or remove days.
 */

import { addDays, formatDate } from "./dates";

export interface Holiday {
  date: string;
  name: string;
}

/** Easter Sunday (Gregorian), anonymous Gregorian algorithm. */
export function easterSunday(year: number): string {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return formatDate(new Date(Date.UTC(year, month - 1, day)));
}

/** The first Saturday on or after the given day of the month. */
function saturdayBetween(year: number, month: number, fromDay: number): string {
  for (let day = fromDay; day < fromDay + 7; day++) {
    const d = new Date(Date.UTC(year, month - 1, day));
    if (d.getUTCDay() === 6) return formatDate(d);
  }
  throw new Error("unreachable");
}

export function defaultHolidays(year: number): Holiday[] {
  const easter = easterSunday(year);
  const p = (m: number, d: number) =>
    `${year}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  return [
    { date: p(1, 1), name: "Nyårsdagen" },
    { date: p(1, 6), name: "Trettondedag jul" },
    { date: addDays(easter, -2), name: "Långfredagen" },
    { date: easter, name: "Påskdagen" },
    { date: addDays(easter, 1), name: "Annandag påsk" },
    { date: p(5, 1), name: "Första maj" },
    { date: addDays(easter, 39), name: "Kristi himmelsfärdsdag" },
    { date: addDays(easter, 49), name: "Pingstdagen" },
    { date: p(6, 6), name: "Sveriges nationaldag" },
    { date: addDays(saturdayBetween(year, 6, 20), -1), name: "Midsommarafton" },
    { date: saturdayBetween(year, 6, 20), name: "Midsommardagen" },
    { date: saturdayBetween(year, 10, 31), name: "Alla helgons dag" },
    { date: p(12, 25), name: "Juldagen" },
    { date: p(12, 26), name: "Annandag jul" },
  ].sort((a, b) => a.date.localeCompare(b.date));
}
