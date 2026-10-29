"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { clientIp } from "@/lib/client-ip";
import { consume } from "@/lib/rate-limit";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_EMAIL = 3;
const MAX_PER_IP = 10;

export async function requestSignInLink(formData: FormData) {
  const parsed = z.email().safeParse(String(formData.get("email") ?? "").trim().toLowerCase());
  if (!parsed.success) redirect("/login?error=email");

  // Better Auth's own rate limit only covers its HTTP endpoints, and this
  // action calls it directly. Limit requests per address and per client so
  // the form cannot be used to flood someone's inbox. The limit applies
  // whether or not the address exists, so it reveals nothing about accounts.
  const requestHeaders = await headers();
  const ipAllowed = consume(`login-ip:${clientIp(requestHeaders)}`, MAX_PER_IP, WINDOW_MS);
  const emailAllowed = ipAllowed && consume(`login-email:${parsed.data}`, MAX_PER_EMAIL, WINDOW_MS);
  if (!ipAllowed || !emailAllowed) redirect("/login?error=limit");

  try {
    await auth.api.signInMagicLink({
      body: { email: parsed.data, callbackURL: "/", errorCallbackURL: "/login?error=link" },
      headers: requestHeaders,
    });
  } catch (err) {
    console.error("Sign-in link request failed", err);
    redirect("/login?error=send");
  }
  redirect(`/login?sent=${encodeURIComponent(parsed.data)}`);
}

export async function signOut() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/login");
}
