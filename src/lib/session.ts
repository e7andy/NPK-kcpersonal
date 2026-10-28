import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/db";
import { user as userTable, type Role, type User } from "@/db/schema";
import { auth } from "./auth";

/** Max session age for roles that can see or change more than their own shifts. */
const PRIVILEGED_SESSION_MAX_DAYS = 14;

export type CurrentUser = Pick<User, "id" | "name" | "email" | "roles">;

/** Returns the signed-in, active user or null. Cached per request. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const result = await auth.api.getSession({ headers: await headers() });
  if (!result) return null;

  const [row] = await db
    .select({
      id: userTable.id,
      name: userTable.name,
      email: userTable.email,
      roles: userTable.roles,
      active: userTable.active,
    })
    .from(userTable)
    .where(eq(userTable.id, result.user.id));
  if (!row || !row.active) return null;

  const privileged = row.roles.some((r) => r !== "worker");
  const ageDays = (Date.now() - new Date(result.session.createdAt).getTime()) / 86_400_000;
  if (privileged && ageDays > PRIVILEGED_SESSION_MAX_DAYS) return null;

  return { id: row.id, name: row.name, email: row.email, roles: row.roles };
});

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export function hasRole(user: CurrentUser, role: Role): boolean {
  return user.roles.includes(role);
}

/** Requires the signed-in user to have the role. Use in pages and server actions. */
export async function requireRole(role: Role): Promise<CurrentUser> {
  const user = await requireUser();
  if (!hasRole(user, role)) redirect("/");
  return user;
}

/** The page a user lands on after sign-in. */
export function homePathFor(user: CurrentUser): string {
  if (hasRole(user, "planner")) return "/planning";
  if (hasRole(user, "payroll")) return "/payroll";
  if (hasRole(user, "worker")) return "/shifts";
  if (hasRole(user, "admin")) return "/admin/users";
  return "/day";
}
