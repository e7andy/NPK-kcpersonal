import ExcelJS from "exceljs";
import { weekdayShort } from "./dates";
import type { PayrollPerson } from "./schedule";
import { formatHours, toHours } from "./time";

export const EXPORT_COLUMNS = [
  "Anställningsnummer",
  "Namn",
  "Datum",
  "Veckodag",
  "Normaltid (h)",
  "Helgtimmar (h)",
  "Sjuk (h)",
  "Förtroendetid (h)",
] as const;

type Row = [string, string, string, string, number, number, number, number];

/** One row per person and day with time, followed by a total row per person. */
export function payrollRows(people: PayrollPerson[]): { row: Row; isTotal: boolean }[] {
  const out: { row: Row; isTotal: boolean }[] = [];
  for (const p of people) {
    const id = p.fortnoxEmployeeId ?? "";
    for (const d of p.days) {
      out.push({
        isTotal: false,
        row: [
          id,
          p.name,
          d.date,
          weekdayShort(d.date),
          d.normalMinutes,
          d.weekendMinutes,
          d.sickMinutes,
          d.trustMinutes,
        ],
      });
    }
    out.push({
      isTotal: true,
      row: [
        id,
        p.name,
        "Summa",
        "",
        p.total.normalMinutes,
        p.total.weekendMinutes,
        p.total.sickMinutes,
        p.total.trustMinutes,
      ],
    });
  }
  return out;
}

/** Semicolon-separated CSV with decimal comma and BOM, which Swedish Excel opens correctly. */
export function toCsv(people: PayrollPerson[]): string {
  const escape = (v: string) => {
    // A leading = + - @ (or tab/CR) makes Excel treat the cell as a formula.
    const safe = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
    return /[;"\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  const lines = [EXPORT_COLUMNS.join(";")];
  for (const { row } of payrollRows(people)) {
    const [a, b, c, d, ...minutes] = row;
    lines.push([a, b, c, d].map(escape).concat(minutes.map((m) => formatHours(m))).join(";"));
  }
  return "﻿" + lines.join("\r\n") + "\r\n";
}

export async function toXlsx(people: PayrollPerson[], month: string): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "kcpersonal";
  const ws = wb.addWorksheet(`Lön ${month}`);
  ws.columns = EXPORT_COLUMNS.map((header, i) => ({
    header,
    width: i === 1 ? 24 : i >= 4 ? 16 : 14,
    style: i >= 4 ? { numFmt: "0.00" } : undefined,
  }));
  ws.getRow(1).font = { bold: true };
  ws.views = [{ state: "frozen", ySplit: 1 }];
  for (const { row, isTotal } of payrollRows(people)) {
    const [a, b, c, d, ...minutes] = row;
    const added = ws.addRow([a, b, c, d, ...minutes.map(toHours)]);
    if (isTotal) added.font = { bold: true };
  }
  return Buffer.from(await wb.xlsx.writeBuffer());
}
