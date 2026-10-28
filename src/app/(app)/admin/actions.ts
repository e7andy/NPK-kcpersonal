"use server";

import { randomUUID } from "node:crypto";
import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { holidays, ROLES, session, shiftTemplates, user, type Role } from "@/db/schema";
import { writeAudit } from "@/lib/audit";
import { isDateString } from "@/lib/dates";
import { defaultHolidays } from "@/lib/holidays";
import { requireRole } from "@/lib/session";
import { validateShiftTimes } from "@/lib/time";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const back = (path: string, key: "error" | "ok", msg: string): never =>
  redirect(`${path}${path.includes("?") ? "&" : "?"}${key}=${encodeURIComponent(msg)}`);

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

function readUser(formData: FormData) {
  const roles = formData.getAll("roles").map(String).filter((r): r is Role => (ROLES as readonly string[]).includes(r));
  return {
    name: str(formData, "name"),
    email: str(formData, "email").toLowerCase(),
    phone: str(formData, "phone") || null,
    fortnoxEmployeeId: str(formData, "fortnoxEmployeeId") || null,
    roles,
  };
}

function validateUser(u: ReturnType<typeof readUser>): string | null {
  if (!u.name) return "Ange namn.";
  if (!z.email().safeParse(u.email).success) return "Ange en giltig e-postadress.";
  if (u.roles.length === 0) return "Välj minst en roll.";
  return null;
}

export async function createUser(formData: FormData) {
  const admin = await requireRole("admin");
  const u = readUser(formData);
  const error = validateUser(u);
  if (error) back("/admin/users", "error", error);

  const [taken] = await db.select({ id: user.id }).from(user).where(eq(user.email, u.email));
  if (taken) back("/admin/users", "error", "Det finns redan en person med den e-postadressen.");

  const id = randomUUID();
  await db.transaction(async (tx) => {
    await tx.insert(user).values({ id, ...u, emailVerified: false, active: true });
    await writeAudit(tx, { entity: "user", entityId: id, action: "create", after: u, userId: admin.id });
  });
  revalidatePath("/admin/users");
  back("/admin/users", "ok", `${u.name} är tillagd och kan logga in med ${u.email}.`);
}

export async function updateUser(formData: FormData) {
  const admin = await requireRole("admin");
  const id = str(formData, "id");
  const path = `/admin/users/${id}`;
  const u = readUser(formData);
  const active = formData.get("active") === "on";
  const error = validateUser(u);
  if (error) back(path, "error", error);

  const [taken] = await db
    .select({ id: user.id })
    .from(user)
    .where(and(eq(user.email, u.email), ne(user.id, id)));
  if (taken) back(path, "error", "Det finns redan en person med den e-postadressen.");
  if (id === admin.id && (!u.roles.includes("admin") || !active)) {
    back(path, "error", "Du kan inte ta bort din egen admin-roll eller inaktivera dig själv.");
  }

  const [before] = await db.select().from(user).where(eq(user.id, id));
  if (!before) redirect("/admin/users");

  await db.transaction(async (tx) => {
    await tx.update(user).set({ ...u, active, updatedAt: new Date() }).where(eq(user.id, id));
    // Changed email, roles or deactivation signs the person out everywhere.
    if (!active || before.email !== u.email || before.roles.join() !== u.roles.join()) {
      await tx.delete(session).where(eq(session.userId, id));
    }
    await writeAudit(tx, {
      entity: "user",
      entityId: id,
      action: "update",
      before: { name: before.name, email: before.email, roles: before.roles, active: before.active },
      after: { ...u, active },
      userId: admin.id,
    });
  });
  revalidatePath("/admin/users");
  back("/admin/users", "ok", "Ändringarna är sparade.");
}

// ---------------------------------------------------------------------------
// Shift templates
// ---------------------------------------------------------------------------

export async function saveTemplate(formData: FormData) {
  const admin = await requireRole("admin");
  const id = str(formData, "id");
  const values = {
    name: str(formData, "name"),
    startTime: str(formData, "startTime"),
    endTime: str(formData, "endTime"),
    lunchMinutes: Number(str(formData, "lunchMinutes") || "0"),
    sortOrder: Number(str(formData, "sortOrder") || "0"),
    active: id ? formData.get("active") === "on" : true,
  };
  if (!values.name) back("/admin/templates", "error", "Ange ett namn.");
  const timeError = validateShiftTimes(values);
  if (timeError) back("/admin/templates", "error", `${values.name}: ${timeError}`);

  const templateId = id || randomUUID();
  await db.transaction(async (tx) => {
    if (id) await tx.update(shiftTemplates).set(values).where(eq(shiftTemplates.id, id));
    else await tx.insert(shiftTemplates).values({ id: templateId, ...values });
    await writeAudit(tx, {
      entity: "template",
      entityId: templateId,
      action: id ? "update" : "create",
      after: values,
      userId: admin.id,
    });
  });
  revalidatePath("/admin/templates");
  back("/admin/templates", "ok", `${values.name} är sparat.`);
}

// ---------------------------------------------------------------------------
// Holidays
// ---------------------------------------------------------------------------

export async function addHoliday(formData: FormData) {
  const admin = await requireRole("admin");
  const date = str(formData, "date");
  const name = str(formData, "name");
  if (!isDateString(date) || !name) back("/admin/holidays", "error", "Ange datum och namn.");
  await db.transaction(async (tx) => {
    await tx.insert(holidays).values({ date, name }).onConflictDoUpdate({ target: holidays.date, set: { name } });
    await writeAudit(tx, { entity: "holiday", entityId: date, action: "create", after: { name }, userId: admin.id });
  });
  revalidatePath("/admin/holidays");
  back(`/admin/holidays?year=${date.slice(0, 4)}`, "ok", `${name} är tillagd.`);
}

export async function addPublicHolidays(formData: FormData) {
  const admin = await requireRole("admin");
  const year = Number(str(formData, "year"));
  if (!Number.isInteger(year) || year < 2020 || year > 2100) back("/admin/holidays", "error", "Ogiltigt år.");
  const list = defaultHolidays(year);
  await db.transaction(async (tx) => {
    await tx.insert(holidays).values(list).onConflictDoNothing();
    await writeAudit(tx, { entity: "holiday", entityId: String(year), action: "create", after: list, userId: admin.id });
  });
  revalidatePath("/admin/holidays");
  back(`/admin/holidays?year=${year}`, "ok", `Helgdagar för ${year} är tillagda.`);
}

export async function deleteHoliday(formData: FormData) {
  const admin = await requireRole("admin");
  const date = str(formData, "date");
  await db.transaction(async (tx) => {
    await tx.delete(holidays).where(eq(holidays.date, date));
    await writeAudit(tx, { entity: "holiday", entityId: date, action: "delete", userId: admin.id });
  });
  revalidatePath("/admin/holidays");
  back(`/admin/holidays?year=${date.slice(0, 4)}`, "ok", "Dagen är borttagen.");
}
