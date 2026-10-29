"use server";

import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { shifts, shiftTemplates, user as userTable } from "@/db/schema";
import { writeAudit } from "@/lib/audit";
import { addDays, isDateString, monthOf, startOfWeek } from "@/lib/dates";
import { findOverlap, getLockedMonths, getShift, getShifts, isDateLocked } from "@/lib/schedule";
import { requireRole } from "@/lib/session";
import { overlaps, validateShiftTimes } from "@/lib/time";

const LOCKED_MESSAGE = "Månaden är godkänd och låst. Löneköraren kan låsa upp den.";

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

/** Only allow redirects back into the app. */
function safeReturn(path: string, fallback: string): string {
  return path.startsWith("/") && !path.startsWith("//") ? path : fallback;
}

function withParam(path: string, key: string, value: string): string {
  const url = new URL(path, "http://x");
  url.searchParams.set(key, value);
  return url.pathname + url.search;
}

function fail(path: string, message: string): never {
  redirect(withParam(path, "error", message));
}

async function assertWorker(userId: string, back: string) {
  const [row] = await db
    .select({ roles: userTable.roles, active: userTable.active })
    .from(userTable)
    .where(eq(userTable.id, userId));
  if (!row || !row.active || !row.roles.includes("worker")) fail(back, "Okänd person.");
}

function snapshot(s: Awaited<ReturnType<typeof getShift>>) {
  if (!s) return null;
  const { userName: _ignored, ...rest } = s;
  return rest;
}

function revalidateSchedule() {
  revalidatePath("/planning");
  revalidatePath("/reconcile");
  revalidatePath("/shifts");
  revalidatePath("/day", "layout");
}

// ---------------------------------------------------------------------------

export async function quickAddShift(formData: FormData) {
  const planner = await requireRole("planner");
  const userId = str(formData, "userId");
  const date = str(formData, "date");
  const templateId = str(formData, "templateId");
  const back = safeReturn(str(formData, "returnTo"), `/planning?week=${startOfWeek(date)}`);

  if (!isDateString(date)) fail(back, "Ogiltigt datum.");
  await assertWorker(userId, back);
  if (await isDateLocked(date)) fail(back, LOCKED_MESSAGE);

  const [template] = await db.select().from(shiftTemplates).where(eq(shiftTemplates.id, templateId));
  if (!template) fail(back, "Välj ett standardpass.");

  if (await findOverlap(userId, date, template)) fail(back, "Personen har redan ett pass som överlappar.");

  const values = {
    id: randomUUID(),
    userId,
    date,
    startTime: template.startTime,
    endTime: template.endTime,
    lunchMinutes: template.lunchMinutes,
    templateId: template.id,
    createdBy: planner.id,
    updatedBy: planner.id,
  };
  await db.transaction(async (tx) => {
    await tx.insert(shifts).values(values);
    await writeAudit(tx, { entity: "shift", entityId: values.id, action: "create", after: values, userId: planner.id });
  });
  revalidateSchedule();
  redirect(back);
}

/** Creates (no id) or updates (id) a shift from the edit form. */
export async function saveShift(formData: FormData) {
  const planner = await requireRole("planner");
  const id = str(formData, "id");
  const userId = str(formData, "userId");
  const date = str(formData, "date");
  const startTime = str(formData, "startTime");
  const endTime = str(formData, "endTime");
  const lunchMinutes = Number(str(formData, "lunchMinutes") || "0");
  const type = str(formData, "type") === "trust" ? "trust" : "regular";
  const note = str(formData, "note") || null;
  const templateId = str(formData, "templateId") || null;
  const formPath = id ? `/planning/shifts/${id}` : `/planning/shifts/new?userId=${userId}&date=${date}`;

  if (!isDateString(date)) fail(formPath, "Ogiltigt datum.");
  const timeError = validateShiftTimes({ startTime, endTime, lunchMinutes });
  if (timeError) fail(formPath, timeError);

  const existing = id ? await getShift(id) : null;
  if (id && !existing) fail("/planning", "Passet finns inte längre.");
  // A shift can only be given to an active worker, but an existing shift can
  // still be corrected after its person has become inactive (e.g. during the
  // month reconciliation).
  if (!existing || existing.userId !== userId) await assertWorker(userId, formPath);
  if (await isDateLocked(date)) fail(formPath, LOCKED_MESSAGE);
  if (existing && (await isDateLocked(existing.date))) fail(formPath, LOCKED_MESSAGE);

  if (await findOverlap(userId, date, { startTime, endTime, lunchMinutes }, id || undefined)) {
    fail(formPath, "Personen har redan ett pass som överlappar.");
  }

  const values = { userId, date, startTime, endTime, lunchMinutes, type, note, updatedBy: planner.id } as const;
  if (existing) {
    await db.transaction(async (tx) => {
      await tx.update(shifts).set({ ...values, updatedAt: new Date() }).where(eq(shifts.id, id));
      await writeAudit(tx, {
        entity: "shift",
        entityId: id,
        action: "update",
        before: snapshot(existing),
        after: values,
        userId: planner.id,
      });
    });
  } else {
    const newId = randomUUID();
    await db.transaction(async (tx) => {
      await tx.insert(shifts).values({ id: newId, templateId, createdBy: planner.id, ...values });
      await writeAudit(tx, { entity: "shift", entityId: newId, action: "create", after: values, userId: planner.id });
    });
  }
  revalidateSchedule();
  redirect(withParam(`/planning?week=${startOfWeek(date)}`, "ok", "Passet är sparat."));
}

export async function deleteShift(formData: FormData) {
  const planner = await requireRole("planner");
  const id = str(formData, "id");
  const existing = await getShift(id);
  if (!existing) redirect("/planning");
  if (await isDateLocked(existing.date)) fail(`/planning/shifts/${id}`, LOCKED_MESSAGE);

  await db.transaction(async (tx) => {
    // Replacement shifts keep existing but lose the link.
    await tx.update(shifts).set({ replacesShiftId: null }).where(eq(shifts.replacesShiftId, id));
    await tx.delete(shifts).where(eq(shifts.id, id));
    await writeAudit(tx, { entity: "shift", entityId: id, action: "delete", before: snapshot(existing), userId: planner.id });
  });
  revalidateSchedule();
  redirect(withParam(`/planning?week=${startOfWeek(existing.date)}`, "ok", "Passet är borttaget."));
}

export async function setSick(formData: FormData) {
  const planner = await requireRole("planner");
  const id = str(formData, "id");
  const sick = str(formData, "sick") === "true";
  const existing = await getShift(id);
  if (!existing) redirect("/planning");
  if (await isDateLocked(existing.date)) fail(`/planning/shifts/${id}`, LOCKED_MESSAGE);

  await db.transaction(async (tx) => {
    await tx
      .update(shifts)
      .set({ status: sick ? "sick" : "planned", updatedBy: planner.id, updatedAt: new Date() })
      .where(eq(shifts.id, id));
    await writeAudit(tx, {
      entity: "shift",
      entityId: id,
      action: sick ? "sick" : "unsick",
      before: { status: existing.status },
      after: { status: sick ? "sick" : "planned" },
      userId: planner.id,
    });
  });
  revalidateSchedule();
  redirect(`/planning/shifts/${id}`);
}

export async function assignReplacement(formData: FormData) {
  const planner = await requireRole("planner");
  const id = str(formData, "id");
  const replacementId = str(formData, "replacementUserId");
  const back = `/planning/shifts/${id}`;
  const sickShift = await getShift(id);
  if (!sickShift) redirect("/planning");
  if (sickShift.status !== "sick") fail(back, "Markera passet som sjuk först.");
  if (await isDateLocked(sickShift.date)) fail(back, LOCKED_MESSAGE);
  await assertWorker(replacementId, back);
  if (replacementId === sickShift.userId) fail(back, "Välj någon annan som ersättare.");
  if (await findOverlap(replacementId, sickShift.date, sickShift)) fail(back, "Ersättaren har redan ett pass som överlappar.");

  const values = {
    id: randomUUID(),
    userId: replacementId,
    date: sickShift.date,
    startTime: sickShift.startTime,
    endTime: sickShift.endTime,
    lunchMinutes: sickShift.lunchMinutes,
    type: sickShift.type,
    replacesShiftId: sickShift.id,
    createdBy: planner.id,
    updatedBy: planner.id,
  };
  await db.transaction(async (tx) => {
    await tx.insert(shifts).values(values);
    await writeAudit(tx, { entity: "shift", entityId: values.id, action: "replace", after: values, userId: planner.id });
  });
  revalidateSchedule();
  redirect(withParam(`/planning/shifts/${values.id}`, "ok", "Ersättaren är inlagd. Justera tiderna vid behov."));
}

/**
 * Copies all planned shifts in one week to another week. Days in locked
 * months and shifts that would overlap existing ones are skipped.
 */
export async function copyWeek(formData: FormData) {
  const planner = await requireRole("planner");
  const fromWeek = str(formData, "fromWeek");
  const toWeek = str(formData, "toWeek");
  const back = `/planning?week=${fromWeek}`;
  if (!isDateString(fromWeek) || !isDateString(toWeek)) fail(back, "Ogiltig vecka.");
  const fromMonday = startOfWeek(fromWeek);
  const toMonday = startOfWeek(toWeek);
  if (fromMonday === toMonday) fail(back, "Välj en annan vecka att kopiera till.");

  const offset = Math.round((Date.parse(toMonday) - Date.parse(fromMonday)) / 86_400_000);
  const source = (await getShifts({ from: fromMonday, to: addDays(fromMonday, 6) })).filter(
    (s) => s.status === "planned" && !s.replacesShiftId,
  );
  const target = await getShifts({ from: toMonday, to: addDays(toMonday, 6) });
  const locked = await getLockedMonths();

  const taken = target.map((t) => ({ userId: t.userId, date: t.date, startTime: t.startTime, endTime: t.endTime, lunchMinutes: 0 }));
  const inserts: (typeof shifts.$inferInsert)[] = [];
  let skipped = 0;
  for (const s of source) {
    const date = addDays(s.date, offset);
    const clash = taken.some((t) => t.userId === s.userId && t.date === date && overlaps(t, s));
    if (locked.has(monthOf(date)) || clash) {
      skipped++;
      continue;
    }
    taken.push({ userId: s.userId, date, startTime: s.startTime, endTime: s.endTime, lunchMinutes: 0 });
    inserts.push({
      id: randomUUID(),
      userId: s.userId,
      date,
      startTime: s.startTime,
      endTime: s.endTime,
      lunchMinutes: s.lunchMinutes,
      type: s.type,
      note: s.note,
      createdBy: planner.id,
      updatedBy: planner.id,
    });
  }

  if (inserts.length) {
    await db.transaction(async (tx) => {
      await tx.insert(shifts).values(inserts);
      for (const i of inserts) {
        await writeAudit(tx, { entity: "shift", entityId: i.id, action: "create", after: i, userId: planner.id });
      }
    });
  }
  revalidateSchedule();
  const message = `${inserts.length} pass kopierade${skipped ? `, ${skipped} hoppades över (överlapp eller låst månad)` : ""}.`;
  redirect(withParam(`/planning?week=${toMonday}`, "ok", message));
}
