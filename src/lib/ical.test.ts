import { describe, expect, it } from "vitest";
import { buildCalendar, escapeText, foldLine, formatUtc, stockholmToUtc, type CalendarShift } from "./ical";

const shift = (overrides: Partial<CalendarShift> = {}): CalendarShift => ({
  id: "abc",
  date: "2027-07-03",
  startTime: "09:00:00",
  endTime: "15:00:00",
  lunchMinutes: 30,
  type: "regular",
  status: "planned",
  ...overrides,
});

describe("stockholmToUtc", () => {
  it("uses summer time (UTC+2) in July", () => {
    expect(formatUtc(stockholmToUtc("2027-07-03", "09:00"))).toBe("20270703T070000Z");
  });

  it("uses standard time (UTC+1) in January", () => {
    expect(formatUtc(stockholmToUtc("2027-01-15", "09:00"))).toBe("20270115T080000Z");
  });

  it("handles the days daylight saving time changes", () => {
    // 2027-03-28: clocks go forward at 02:00. 2027-10-31: back at 03:00.
    expect(formatUtc(stockholmToUtc("2027-03-28", "01:00"))).toBe("20270328T000000Z");
    expect(formatUtc(stockholmToUtc("2027-03-28", "09:00"))).toBe("20270328T070000Z");
    expect(formatUtc(stockholmToUtc("2027-10-31", "09:00"))).toBe("20271031T080000Z");
  });
});

describe("text helpers", () => {
  it("escapes special characters", () => {
    expect(escapeText("a,b;c\\d\ne")).toBe("a\\,b\\;c\\\\d\\ne");
  });

  it("folds long lines at 75 octets without splitting characters", () => {
    const line = "DESCRIPTION:" + "å".repeat(60);
    const folded = foldLine(line);
    const parts = folded.split("\r\n");
    expect(parts.length).toBeGreaterThan(1);
    for (const part of parts) expect(new TextEncoder().encode(part).length).toBeLessThanOrEqual(75);
    expect(parts.map((p, i) => (i === 0 ? p : p.slice(1))).join("")).toBe(line);
  });

  it("leaves short lines alone", () => {
    expect(foldLine("VERSION:2.0")).toBe("VERSION:2.0");
  });
});

describe("buildCalendar", () => {
  const now = new Date("2027-06-01T10:00:00Z");

  it("writes one event per planned shift with UTC times", () => {
    const ics = buildCalendar({ shifts: [shift()], host: "kcpersonal.example", now });
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics).toContain("UID:shift-abc@kcpersonal.example");
    expect(ics).toContain("DTSTART:20270703T070000Z");
    expect(ics).toContain("DTEND:20270703T130000Z");
    expect(ics).toContain("DTSTAMP:20270601T100000Z");
    expect(ics).toContain("SUMMARY:Pass\\, kanotcentralen");
    expect(ics).toContain("DESCRIPTION:09:00–15:00. Lunch 30 min. Arbetstid 5 h 30 min.");
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(1);
  });

  it("leaves out sick shifts", () => {
    const ics = buildCalendar({ shifts: [shift({ status: "sick" })], host: "h", now });
    expect(ics).not.toContain("BEGIN:VEVENT");
  });

  it("names trust time and handles shifts without lunch", () => {
    const ics = buildCalendar({ shifts: [shift({ type: "trust", lunchMinutes: 0 })], host: "h", now });
    expect(ics).toContain("SUMMARY:Förtroendetid\\, kanotcentralen");
    expect(ics).toContain("Ingen lunch. Arbetstid 6 h.");
  });

  it("links to the day page when the app address is known", () => {
    const ics = buildCalendar({ shifts: [shift()], host: "h", appUrl: "https://kc.example", now });
    expect(ics).toContain("URL:https://kc.example/day/2027-07-03");
  });

  it("uses CRLF line endings throughout", () => {
    const ics = buildCalendar({ shifts: [shift()], host: "h", now });
    expect(ics.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/);
  });
});
