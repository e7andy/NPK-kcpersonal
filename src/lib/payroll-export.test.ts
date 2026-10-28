import { describe, expect, it } from "vitest";
import { payrollRows, toCsv } from "./payroll-export";
import type { PayrollPerson } from "./schedule";

const person: PayrollPerson = {
  userId: "u1",
  name: "Test Testsson",
  fortnoxEmployeeId: "101",
  days: [
    { date: "2027-07-02", isWeekend: false, normalMinutes: 330, weekendMinutes: 0, sickMinutes: 0, trustMinutes: 0 },
    { date: "2027-07-03", isWeekend: true, normalMinutes: 450, weekendMinutes: 450, sickMinutes: 0, trustMinutes: 60 },
  ],
  total: { normalMinutes: 780, weekendMinutes: 450, sickMinutes: 0, trustMinutes: 60 },
};

describe("payroll export", () => {
  it("adds a total row per person", () => {
    const rows = payrollRows([person]);
    expect(rows).toHaveLength(3);
    expect(rows[2].isTotal).toBe(true);
    expect(rows[2].row[4]).toBe(780);
  });

  it("writes CSV with semicolons, decimal comma and BOM", () => {
    const csv = toCsv([person]);
    expect(csv.startsWith("﻿")).toBe(true);
    const lines = csv.trim().split("\r\n");
    expect(lines[0]).toContain("Normaltid (h);Helgtimmar (h);Sjuk (h);Förtroendetid (h)");
    expect(lines[2]).toBe("101;Test Testsson;2027-07-03;lör;7,50;7,50;0,00;1,00");
    expect(lines[3]).toBe("101;Test Testsson;Summa;;13,00;7,50;0,00;1,00");
  });
});
