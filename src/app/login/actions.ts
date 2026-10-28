"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/lib/auth";

export async function requestSignInLink(formData: FormData) {
  const parsed = z.email().safeParse(String(formData.get("email") ?? "").trim().toLowerCase());
  if (!parsed.success) redirect("/login?error=email");

  try {
    await auth.api.signInMagicLink({
      body: { email: parsed.data, callbackURL: "/", errorCallbackURL: "/login?error=link" },
      headers: await headers(),
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
