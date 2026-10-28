import { describe, expect, it } from "vitest";
import {
  addDays,
  addMonths,
  dateRange,
  isDateString,
  isoWeek,
  isoWeekday,
  lastDayOfMonth,
  startOfWeek,
  today,
} from "./dates";
import { easterSunday, defaultHolidays } from "./holidays";

describe("dates", () => {
  it("validates date strings", () => {
    expect(isDateString("2027-07-03")).toBe(true);
    expect(isDateString("2027-02-30")).toBe(false);
    expect(isDateString("2027-7-3")).toBe(false);
  });

  it("adds days across month and year boundaries and DST changes", () => {
    expect(addDays("2027-06-30", 1)).toBe("2027-07-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2027-03-28", 1)).toBe("2027-03-29");
    expect(addDays("2026-10-25", -1)).toBe("2026-10-24");
  });

  it("computes ISO weekday, week start and week number", () => {
    expect(isoWeekday("2027-07-05")).toBe(1);
    expect(isoWeekday("2027-07-04")).toBe(7);
    expect(startOfWeek("2027-07-04")).toBe("2027-06-28");
    expect(isoWeek("2027-01-01")).toBe(53);
    expect(isoWeek("2027-07-05")).toBe(27);
  });

  it("handles month helpers", () => {
    expect(lastDayOfMonth("2028-02")).toBe("2028-02-29");
    expect(addMonths("2027-12", 1)).toBe("2028-01");
    expect(addMonths("2027-01", -1)).toBe("2026-12");
    expect(dateRange("2027-07-30", "2027-08-02")).toHaveLength(4);
  });

  it("returns today's date in Stockholm", () => {
    // 23:30 UTC on 30 June is already 1 July in Stockholm (UTC+2).
    expect(today(new Date("2027-06-30T23:30:00Z"))).toBe("2027-07-01");
  });
});

describe("Swedish public holidays", () => {
  it("computes Easter", () => {
    expect(easterSunday(2026)).toBe("2026-04-05");
    expect(easterSunday(2027)).toBe("2027-03-28");
  });

  it("computes the moving holidays for 2027", () => {
    const byName = Object.fromEntries(defaultHolidays(2027).map((h) => [h.name, h.date]));
    expect(byName["Långfredagen"]).toBe("2027-03-26");
    expect(byName["Kristi himmelsfärdsdag"]).toBe("2027-05-06");
    expect(byName["Midsommarafton"]).toBe("2027-06-25");
    expect(byName["Midsommardagen"]).toBe("2027-06-26");
    expect(byName["Alla helgons dag"]).toBe("2027-11-06");
  });

  it("returns 14 days sorted by date", () => {
    const list = defaultHolidays(2026);
    expect(list).toHaveLength(14);
    expect(list.find((h) => h.name === "Midsommarafton")?.date).toBe("2026-06-19");
    expect([...list].sort((a, b) => a.date.localeCompare(b.date))).toEqual(list);
  });
});
