import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { magicLink } from "better-auth/plugins/magic-link";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { sendSignInLink } from "./mail";

const DAY = 60 * 60 * 24;

export const auth = betterAuth({
  appName: "kcpersonal",
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  // Long sessions so summer workers rarely need to sign in again. Planner,
  // payroll and admin get a shorter limit enforced in lib/session.ts.
  session: { expiresIn: 120 * DAY, updateAge: DAY },
  advanced: {
    // Behind Apache the client address is the rightmost X-Forwarded-For entry.
    // Trusting only the local hop keeps clients from spoofing it.
    ipAddress: { trustedProxies: ["127.0.0.1", "::1"] },
  },
  plugins: [
    magicLink({
      disableSignUp: true,
      expiresIn: 15 * 60,
      storeToken: "hashed",
      sendMagicLink: async ({ email, url }) => {
        // Only known, active users get a link. The response to the browser
        // is the same either way so emails cannot be probed.
        const [existing] = await db
          .select({ id: schema.user.id })
          .from(schema.user)
          .where(and(eq(schema.user.email, email.toLowerCase()), eq(schema.user.active, true)));
        if (!existing) return;
        await sendSignInLink(email, url);
      },
    }),
    nextCookies(),
  ],
});
