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
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  await requireRole("admin");
  const sp = await searchParams;
  const users = await db.select().from(user).orderBy(asc(user.name));

  return (
    <div className="mx-auto grid max-w-4xl gap-6">
      <h1>Personal</h1>
      <Flash error={sp.error} ok={sp.ok} />

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
            {users.map((u) => (
              <tr key={u.id} className={`border-b border-line/60 ${u.active ? "" : "text-ink-soft"}`}>
                <td className="px-4 py-2 font-bold">
                  <Link href={`/admin/users/${u.id}`}>{u.name}</Link>
                  {!u.active && <span className="ml-2 font-normal">(inaktiv)</span>}
                </td>
                <td className="px-4 py-2">{u.email}</td>
                <td className="px-4 py-2">{u.roles.map(roleLabel).join(", ")}</td>
                <td className="px-4 py-2">{u.fortnoxEmployeeId ?? "–"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
    </div>
  );
}
