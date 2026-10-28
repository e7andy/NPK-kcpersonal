/**
 * Seeds the database with FAKE demo data. All names and emails are invented.
 * Never put real people in here – the repository may be public.
 *
 * Run: npm run db:seed   (deletes existing schedule data first)
 */
import { randomUUID } from "node:crypto";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import { addDays, addMonths, dateRange, firstDayOfMonth, monthOf, today } from "../lib/dates";
import { swedishPublicHolidays } from "../lib/holidays";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

// Deterministic pseudo-random numbers so the demo data is the same every run.
let seed = 42;
function random(): number {
  seed = (seed * 1_103_515_245 + 12_345) % 2 ** 31;
  return seed / 2 ** 31;
}

const staff: { name: string; email: string; roles: schema.Role[] }[] = [
  { name: "Ada Admin", email: "admin@example.com", roles: ["admin"] },
  { name: "Petra Planerare", email: "planerare@example.com", roles: ["planner"] },
  { name: "Lars Lönesson", email: "lon@example.com", roles: ["payroll"] },
  { name: "Alva Bergström", email: "alva@example.com", roles: ["worker"] },
  { name: "Elis Strand", email: "elis@example.com", roles: ["worker"] },
  { name: "Freja Holm", email: "freja@example.com", roles: ["worker"] },
  { name: "Hugo Lind", email: "hugo@example.com", roles: ["worker"] },
  { name: "Ines Ek", email: "ines@example.com", roles: ["worker"] },
  { name: "Melker Sjö", email: "melker@example.com", roles: ["worker"] },
  { name: "Nora Vik", email: "nora@example.com", roles: ["worker"] },
  { name: "Ville Ström", email: "ville@example.com", roles: ["worker"] },
];

const templates = [
  { name: "Förmiddag", startTime: "09:00", endTime: "14:00", lunchMinutes: 0 },
  { name: "Eftermiddag", startTime: "13:00", endTime: "19:00", lunchMinutes: 30 },
  { name: "Heldag", startTime: "09:00", endTime: "18:00", lunchMinutes: 60 },
  { name: "Kväll", startTime: "16:00", endTime: "21:00", lunchMinutes: 0 },
];

async function main() {
  await db.transaction(async (tx) => {
    await tx.delete(schema.auditLog);
    await tx.delete(schema.shifts);
    await tx.delete(schema.monthApprovals);
    await tx.delete(schema.shiftTemplates);
    await tx.delete(schema.holidays);
    await tx.delete(schema.session);
    await tx.delete(schema.verification);
    await tx.delete(schema.user);

    const users = staff.map((s) => ({
      id: randomUUID(),
      ...s,
      emailVerified: true,
      phone: null,
      fortnoxEmployeeId: null as string | null,
    }));
    let employeeNo = 101;
    for (const u of users) {
      if (u.roles.includes("worker")) u.fortnoxEmployeeId = String(employeeNo++);
    }
    await tx.insert(schema.user).values(users);

    const templateRows = templates.map((t, i) => ({ id: randomUUID(), sortOrder: i, ...t }));
    await tx.insert(schema.shiftTemplates).values(templateRows);

    const year = Number(today().slice(0, 4));
    await tx
      .insert(schema.holidays)
      .values([...swedishPublicHolidays(year), ...swedishPublicHolidays(year + 1)]);

    // Shifts from the start of last month until four weeks from today.
    const planner = users.find((u) => u.roles.includes("planner"))!;
    const workers = users.filter((u) => u.roles.includes("worker"));
    const supervisor = workers[0];
    const lastMonth = addMonths(monthOf(today()), -1);
    const days = dateRange(firstDayOfMonth(lastMonth), addDays(today(), 28));

    const shiftRows: (typeof schema.shifts.$inferInsert)[] = [];
    for (const date of days) {
      const shuffled = [...workers].sort(() => random() - 0.5);
      const count = 3 + Math.floor(random() * 3);
      for (const w of shuffled.slice(0, count)) {
        const t = templateRows[Math.floor(random() * templateRows.length)];
        shiftRows.push({
          id: randomUUID(),
          userId: w.id,
          date,
          startTime: t.startTime,
          endTime: t.endTime,
          lunchMinutes: t.lunchMinutes,
          templateId: t.id,
          createdBy: planner.id,
          updatedBy: planner.id,
        });
        if (w.id === supervisor.id && t.endTime <= "20:00" && random() < 0.5) {
          const end = `${String(Number(t.endTime.slice(0, 2)) + 1).padStart(2, "0")}:00`;
          shiftRows.push({
            id: randomUUID(),
            userId: w.id,
            date,
            startTime: t.endTime,
            endTime: end,
            lunchMinutes: 0,
            type: "supervision",
            note: "Arbetsledning",
            createdBy: planner.id,
            updatedBy: planner.id,
          });
        }
      }
    }

    // One sick shift with a replacement, a few days back.
    const sickDate = addDays(today(), -3);
    const sick = shiftRows.find((s) => s.date === sickDate && s.type !== "supervision");
    if (sick) {
      sick.status = "sick";
      const busy = new Set(shiftRows.filter((s) => s.date === sickDate).map((s) => s.userId));
      const replacement = workers.find((w) => !busy.has(w.id));
      if (replacement) {
        shiftRows.push({
          ...sick,
          id: randomUUID(),
          userId: replacement.id,
          status: "planned",
          replacesShiftId: sick.id,
          note: "Ersättare",
        });
      }
    }

    await tx.insert(schema.shifts).values(shiftRows);

    // Last month is approved so the payroll view has data.
    await tx.insert(schema.monthApprovals).values({
      month: firstDayOfMonth(lastMonth),
      status: "approved",
      approvedBy: planner.id,
      approvedAt: new Date(),
    });

    console.log(`Seeded ${users.length} users, ${shiftRows.length} shifts.`);
  });
  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  await pool.end();
  process.exit(1);
});
