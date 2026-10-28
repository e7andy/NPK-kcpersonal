import Link from "next/link";
import { desc } from "drizzle-orm";
import { Flash } from "@/components/flash";
import { db } from "@/db";
import { monthApprovals } from "@/db/schema";
import { monthLabel, monthOf, upperFirst } from "@/lib/dates";
import { requireRole } from "@/lib/session";

export default async function PayrollIndex({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string }>;
}) {
  await requireRole("payroll");
  const sp = await searchParams;
  const rows = await db.select().from(monthApprovals).orderBy(desc(monthApprovals.month));

  return (
    <div className="mx-auto grid max-w-2xl gap-5">
      <h1>Löneunderlag</h1>
      <Flash ok={sp.ok} />
      {rows.length === 0 ? (
        <p className="panel p-5 text-ink-soft">Ingen månad är godkänd än. Planeraren godkänner månaden när tiden stämmer.</p>
      ) : (
        <ul className="panel divide-y divide-line">
          {rows.map((r) => {
            const month = monthOf(r.month);
            const approved = r.status === "approved";
            return (
              <li key={r.month} className="flex items-center gap-3 px-4 py-3">
                <span className="mr-auto font-bold">{upperFirst(monthLabel(month))}</span>
                {approved ? (
                  <>
                    <span className="rounded bg-reed-wash px-2 py-0.5 text-sm font-bold text-reed">Godkänd</span>
                    <Link href={`/payroll/${month}`} className="btn btn-quiet">
                      Öppna
                    </Link>
                  </>
                ) : (
                  <span className="rounded bg-sun-wash px-2 py-0.5 text-sm font-bold">Tillbaka hos planeraren</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
