import "server-only";
import { randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/schema";
import { addDays, today } from "./dates";
import { buildCalendar } from "./ical";
import { getShifts } from "./schedule";

/** How far back and ahead the feed reaches. */
const DAYS_BACK = 60;
const DAYS_AHEAD = 365;

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

/** 256 random bits, URL safe. */
export function newCalendarToken(): string {
  return randomBytes(32).toString("base64url");
}

export function appUrl(): string {
  return (process.env.BETTER_AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

/** https://…/calendar/<token>.ics */
export function calendarUrl(token: string): string {
  return `${appUrl()}/calendar/${token}.ics`;
}

/** The same address with webcal://, which opens the subscribe dialog on phones. */
export function webcalUrl(token: string): string {
  return calendarUrl(token).replace(/^https?:/, "webcal:");
}

/** Google Calendar cannot subscribe from its phone app; this opens the web version. */
export function googleCalendarUrl(token: string): string {
  return `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcalUrl(token))}`;
}

export async function getCalendarToken(userId: string): Promise<string | null> {
  const [row] = await db.select({ token: user.calendarToken }).from(user).where(eq(user.id, userId));
  return row?.token ?? null;
}

/**
 * The feed for a token, or null if the token is unknown or belongs to someone
 * who is inactive or no longer a summer worker.
 */
export async function calendarFeed(token: string): Promise<string | null> {
  if (!TOKEN_PATTERN.test(token)) return null;
  const [owner] = await db
    .select({ id: user.id, roles: user.roles })
    .from(user)
    .where(and(eq(user.calendarToken, token), eq(user.active, true)))
    .limit(1);
  if (!owner || !owner.roles.includes("worker")) return null;

  const now = today();
  const shifts = await getShifts({ userId: owner.id, from: addDays(now, -DAYS_BACK), to: addDays(now, DAYS_AHEAD) });
  return buildCalendar({ shifts, host: new URL(appUrl()).host, appUrl: appUrl() });
}
