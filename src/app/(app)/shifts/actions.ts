"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { user } from "@/db/schema";
import { newCalendarToken } from "@/lib/calendar";
import { requireRole } from "@/lib/session";

/** Creates the calendar link, or replaces it so the old address stops working. */
export async function createCalendarLink() {
  const me = await requireRole("worker");
  await db.update(user).set({ calendarToken: newCalendarToken() }).where(eq(user.id, me.id));
  revalidatePath("/shifts");
  redirect("/shifts?calendar=1#calendar");
}

export async function removeCalendarLink() {
  const me = await requireRole("worker");
  await db.update(user).set({ calendarToken: null }).where(eq(user.id, me.id));
  revalidatePath("/shifts");
  redirect("/shifts#calendar");
}
