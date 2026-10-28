import { auditLog } from "@/db/schema";
import type { db } from "@/db";

type Executor = Pick<typeof db, "insert">;

export async function writeAudit(
  tx: Executor,
  entry: {
    entity: "shift" | "month" | "user" | "template" | "holiday";
    entityId: string;
    action: "create" | "update" | "delete" | "sick" | "unsick" | "replace" | "approve" | "unlock";
    before?: unknown;
    after?: unknown;
    userId: string;
  },
): Promise<void> {
  await tx.insert(auditLog).values({
    entity: entry.entity,
    entityId: entry.entityId,
    action: entry.action,
    before: entry.before ?? null,
    after: entry.after ?? null,
    userId: entry.userId,
  });
}
