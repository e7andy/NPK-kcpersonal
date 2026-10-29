/**
 * Prints a one-time sign-in link for an active user, without sending email.
 * Useful when mail delivery is not working. Requires access to the server.
 *
 *   npm run login-link -- someone@example.com
 *
 * The link is created by Better Auth exactly like the one in the sign-in
 * email: valid for 15 minutes and usable once.
 */
import { auth } from "@/lib/auth";
import { captureSignInLinks } from "@/lib/mail";

async function main(): Promise<number> {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    console.error("Usage: npm run login-link -- <email>");
    return 1;
  }

  let link: string | null = null;
  captureSignInLinks((_to, url) => {
    link = url;
  });

  await auth.api.signInMagicLink({
    body: { email, callbackURL: "/", errorCallbackURL: "/login?error=link" },
    headers: new Headers(),
  });

  if (!link) {
    console.error(`No active user with the email ${email}.`);
    return 1;
  }

  console.log(`Sign-in link for ${email} (valid for 15 minutes, single use):\n\n${link}\n`);
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
