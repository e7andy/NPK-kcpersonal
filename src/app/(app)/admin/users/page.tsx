import Link from "next/link";
import { asc } from "drizzle-orm";
import { Flash } from "@/components/flash";
import { db } from "@/db";
import { user } from "@/db/schema";
import { requireRole } from "@/lib/session";
import { createUser } from "../actions";
import { roleLabel, UserFields } from "./user-fields";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string; show?: string }>;
}) {
  await requireRole("admin");
  const sp = await searchParams;
  const showInactive = sp.show === "inactive";
  const all = await db.select().from(user).orderBy(asc(user.name));
  const inactiveCount = all.filter((u) => !u.active).length;
  const users = all.filter((u) => u.active !== showInactive);

  return (
    <div className="mx-auto grid max-w-4xl gap-6">
      <div className="flex flex-wrap items-baseline gap-3">
        <h1 className="mr-auto">{showInactive ? "Inaktiv personal" : "Personal"}</h1>
        {showInactive ? (
          <Link href="/admin/users">Visa aktiva</Link>
        ) : (
          inactiveCount > 0 && <Link href="/admin/users?show=inactive">Visa inaktiva ({inactiveCount})</Link>
        )}
      </div>
      <Flash error={sp.error} ok={sp.ok} />
      {showInactive && (
        <p className="text-ink-soft">
          Inaktiva kan inte logga in och visas inte i schemat. Öppna en person för att aktivera eller radera.
        </p>
      )}

      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[40rem] text-sm">
          <thead>
            <tr className="border-b border-line text-left">
              <th scope="col" className="px-4 py-2">Namn</th>
              <th scope="col" className="px-4 py-2">E-post</th>
              <th scope="col" className="px-4 py-2">Roller</th>
              <th scope="col" className="px-4 py-2">Anst.nr</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-3 text-ink-soft">
                  {showInactive ? "Ingen inaktiv personal." : "Ingen aktiv personal. Lägg till nedan."}
                </td>
              </tr>
            )}
            {users.map((u) => (
              <tr key={u.id} className="border-b border-line/60">
                <td className="px-4 py-2 font-bold">
                  <Link href={`/admin/users/${u.id}`}>{u.name}</Link>
                </td>
                <td className="px-4 py-2">{u.email}</td>
                <td className="px-4 py-2">{u.roles.map(roleLabel).join(", ")}</td>
                <td className="px-4 py-2">{u.fortnoxEmployeeId ?? "–"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!showInactive && (
      <form action={createUser} className="panel grid gap-4 p-5 sm:grid-cols-2">
        <h2 className="sm:col-span-2">Lägg till person</h2>
        <UserFields />
        <p className="text-sm text-ink-soft sm:col-span-2">
          Personen loggar in med en länk som skickas till e-postadressen. Personnummer, bankuppgifter och liknande
          hanteras inte här.
        </p>
        <div>
          <button type="submit" className="btn">Lägg till</button>
        </div>
      </form>
      )}
    </div>
  );
}
