"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { monthApprovals } from "@/db/schema";
import { writeAudit } from "@/lib/audit";
import { firstDayOfMonth, isMonthString } from "@/lib/dates";
import { requireRole } from "@/lib/session";

/** Sends an approved month back to the planner. */
export async function unlockMonth(formData: FormData) {
  const payroll = await requireRole("payroll");
  const month = String(formData.get("month") ?? "");
  const comment = String(formData.get("comment") ?? "").trim();
  if (!isMonthString(month)) redirect("/payroll");
  if (!comment) {
    redirect(`/payroll/${month}?error=${encodeURIComponent("Skriv en kommentar om vad som behöver rättas.")}`);
  }

  await db.transaction(async (tx) => {
    await tx
      .update(monthApprovals)
      .set({ status: "unlocked", unlockedBy: payroll.id, unlockedAt: new Date(), unlockComment: comment })
      .where(eq(monthApprovals.month, firstDayOfMonth(month)));
    await writeAudit(tx, { entity: "month", entityId: month, action: "unlock", after: { comment }, userId: payroll.id });
  });
  revalidatePath("/payroll", "layout");
  revalidatePath("/reconcile");
  revalidatePath("/planning");
  redirect(`/payroll?ok=${encodeURIComponent("Månaden är upplåst och tillbaka hos planeraren.")}`);
}
