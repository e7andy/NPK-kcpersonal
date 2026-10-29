import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq, inArray } from "drizzle-orm";
import { Flash } from "@/components/flash";
import { db } from "@/db";
import { monthApprovals, shifts, user } from "@/db/schema";
import { firstDayOfMonth, monthOf } from "@/lib/dates";
import { requireRole } from "@/lib/session";
import { deleteUser } from "../../../actions";

export default async function DeleteUserPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const admin = await requireRole("admin");
  const { id } = await params;
  const sp = await searchParams;
  const [target] = await db.select().from(user).where(eq(user.id, id));
  if (!target) notFound();

  const ownShifts = await db.select({ date: shifts.date }).from(shifts).where(eq(shifts.userId, id));
  const dates = ownShifts.map((s) => s.date).sort();
  const months = [...new Set(dates.map((d) => firstDayOfMonth(monthOf(d))))];
  const approved = months.length
    ? await db
        .select({ month: monthApprovals.month })
        .from(monthApprovals)
        .where(and(eq(monthApprovals.status, "approved"), inArray(monthApprovals.month, months)))
    : [];
  const approvedMonths = new Set(approved.map((a) => monthOf(a.month)));
  const shiftsInApproved = dates.filter((d) => approvedMonths.has(monthOf(d))).length;
  const stats = { total: dates.length, first: dates[0], last: dates[dates.length - 1] };

  const isSelf = target.id === admin.id;

  return (
    <div className="mx-auto grid max-w-2xl gap-5">
      <Link href={`/admin/users/${id}`} className="text-sm">
        Tillbaka till {target.name}
      </Link>
      <h1>Radera {target.name}</h1>
      <Flash error={sp.error} />

      {isSelf ? (
        <p className="notice-error">Du kan inte radera dig själv.</p>
      ) : (
        <form action={deleteUser} className="panel grid gap-4 p-5">
          <input type="hidden" name="id" value={target.id} />
          <div className="grid gap-2">
            <p>Det här tar bort permanent och går inte att ångra:</p>
            <ul className="list-disc pl-5">
              <li>personen och kontaktuppgifterna</li>
              <li>
                <strong>{stats.total} pass</strong>
                {stats.total > 0 && stats.first && stats.last && (
                  <>
                    {" "}
                    ({stats.first} – {stats.last})
                  </>
                )}
              </li>
              <li>ändringshistoriken för personen och passen</li>
              <li>inloggningar, så personen loggas ut direkt</li>
            </ul>
          </div>

          {shiftsInApproved > 0 && (
            <p className="notice-error">
              {shiftsInApproved} av passen ligger i godkända månader ({[...approvedMonths].sort().join(", ")}).
              Löneunderlaget för de månaderna ändras. Exportera underlaget först om det behöver sparas.
            </p>
          )}

          {target.active && (
            <p className="text-sm text-ink-soft">
              Ska personen kunna komma tillbaka? Då räcker det att inaktivera hen i stället.
            </p>
          )}

          <label className="field">
            <span>
              Skriv <span className="font-normal">”{target.name}”</span> för att bekräfta
            </span>
            <input name="confirmName" className="input" autoComplete="off" required />
          </label>
          <div className="flex flex-wrap gap-3">
            <button type="submit" className="btn btn-danger">
              Radera {target.name}
            </button>
            <Link href={`/admin/users/${id}`} className="btn btn-quiet">
              Avbryt
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
