"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { monthApprovals } from "@/db/schema";
import { writeAudit } from "@/lib/audit";
import { firstDayOfMonth, isMonthString, monthOf, today } from "@/lib/dates";
import { requireRole } from "@/lib/session";

export async function approveMonth(formData: FormData) {
  const planner = await requireRole("planner");
  const month = String(formData.get("month") ?? "");
  if (!isMonthString(month)) redirect("/reconcile");
  if (month > monthOf(today())) {
    redirect(`/reconcile?month=${month}&error=${encodeURIComponent("En kommande månad kan inte godkännas.")}`);
  }

  const values = {
    month: firstDayOfMonth(month),
    status: "approved" as const,
    approvedBy: planner.id,
    approvedAt: new Date(),
    unlockedBy: null,
    unlockedAt: null,
    unlockComment: null,
  };
  await db.transaction(async (tx) => {
    await tx
      .insert(monthApprovals)
      .values(values)
      .onConflictDoUpdate({ target: monthApprovals.month, set: values });
    await writeAudit(tx, { entity: "month", entityId: month, action: "approve", userId: planner.id });
  });
  revalidatePath("/reconcile");
  revalidatePath("/payroll", "layout");
  revalidatePath("/planning");
  redirect(`/reconcile?month=${month}&ok=${encodeURIComponent("Månaden är godkänd och skickad till lön.")}`);
}
