import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

const handler = toNextJsHandler(auth);

/**
 * Only the Better Auth endpoints the app needs are reachable over HTTP. Signing
 * in is done by a server action (with its own rate limit), and user data is
 * only changed through the admin pages, so endpoints such as /update-user stay
 * closed. Everything not listed here answers 404.
 */
const ALLOWED_PATHS = new Set([
  "/magic-link/verify", // the link in the sign-in email
  "/get-session",
  "/sign-out",
  "/ok",
  "/error",
]);

function isAllowed(request: Request): boolean {
  const path = new URL(request.url).pathname.replace(/^\/api\/auth/, "");
  return ALLOWED_PATHS.has(path);
}

const notFound = () => new Response("Not Found", { status: 404 });

export async function GET(request: Request) {
  return isAllowed(request) ? handler.GET(request) : notFound();
}

export async function POST(request: Request) {
  return isAllowed(request) ? handler.POST(request) : notFound();
}
