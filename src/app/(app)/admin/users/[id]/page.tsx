import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { Flash } from "@/components/flash";
import { db } from "@/db";
import { user } from "@/db/schema";
import { today } from "@/lib/dates";
import { getUpcomingShiftsOfInactive } from "@/lib/schedule";
import { requireRole } from "@/lib/session";
import { updateUser } from "../../actions";
import { UserFields } from "../user-fields";

export default async function EditUserPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireRole("admin");
  const { id } = await params;
  const sp = await searchParams;
  const [row] = await db.select().from(user).where(eq(user.id, id));
  if (!row) notFound();
  const upcoming = row.active
    ? undefined
    : (await getUpcomingShiftsOfInactive(today())).find((r) => r.userId === row.id);

  return (
    <div className="mx-auto grid max-w-2xl gap-5">
      <Link href={row.active ? "/admin/users" : "/admin/users?show=inactive"} className="text-sm">
        Tillbaka till {row.active ? "personal" : "inaktiv personal"}
      </Link>
      <h1>{row.name}</h1>
      <Flash error={sp.error} />
      {upcoming && (
        <p className="notice-warn">
          {row.name} är inaktiv men har {upcoming.count} kommande pass från {upcoming.first}. Inaktiva syns inte i
          schemat, men passen räknas i löneunderlaget. Be planeraren ta bort eller flytta dem, eller aktivera personen
          igen.
        </p>
      )}
      <form action={updateUser} className="panel grid gap-4 p-5 sm:grid-cols-2">
        <input type="hidden" name="id" value={row.id} />
        <UserFields user={row} />
        <label className="flex items-center gap-2 sm:col-span-2">
          <input type="checkbox" name="active" defaultChecked={row.active} />
          <span>
            <span className="font-bold">Aktiv</span>
            <span className="block text-sm text-ink-soft">
              Inaktiva kan inte logga in och visas inte i schemat. Tidigare pass finns kvar.
            </span>
          </span>
        </label>
        <div>
          <button type="submit" className="btn">Spara ändringar</button>
        </div>
      </form>

      <section className="grid gap-2 border-t border-line pt-5">
        <h2>Radera person</h2>
        <p className="text-sm text-ink-soft">
          Tar bort personen och alla pass permanent, även i godkända månader. Ska personen kunna komma tillbaka räcker
          det att inaktivera hen.
        </p>
        <div>
          <Link href={`/admin/users/${row.id}/delete`} className="btn btn-quiet text-lingon">
            Radera {row.name}
          </Link>
        </div>
      </section>
    </div>
  );
}
