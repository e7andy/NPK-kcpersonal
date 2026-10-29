import { redirect } from "next/navigation";
import { getCurrentUser, homePathFor } from "@/lib/session";
import { requestSignInLink } from "./actions";

const ERRORS: Record<string, string> = {
  email: "Skriv en giltig e-postadress.",
  send: "Länken kunde inte skickas. Försök igen om en stund.",
  limit: "För många försök. Vänta en kvart och försök igen.",
  link: "Länken har gått ut eller redan använts. Be om en ny.",
  INVALID_TOKEN: "Länken har gått ut eller redan använts. Be om en ny.",
  EXPIRED_TOKEN: "Länken har gått ut. Be om en ny.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect(homePathFor(user));
  const { sent, error } = await searchParams;

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-8 px-5 py-10">
      <div className="flex items-center gap-3">
        <img src="/icon.svg" alt="" width={48} height={48} />
        <div>
          <h1>kcpersonal</h1>
          <p className="text-ink-soft">Arbetspass på kanotcentralen</p>
        </div>
      </div>

      {sent ? (
        <div className="panel grid gap-3 p-5">
          <h2>Kolla din e-post</h2>
          <p>
            Om <strong>{sent}</strong> finns registrerad har vi skickat en inloggningslänk dit.
            Länken gäller i 15 minuter.
          </p>
          <a href="/login" className="text-sm">
            Använd en annan adress
          </a>
        </div>
      ) : (
        <form action={requestSignInLink} className="panel grid gap-4 p-5">
          {error && <p className="notice-error">{ERRORS[error] ?? ERRORS.link}</p>}
          <label className="field">
            E-post
            <input
              className="input"
              type="email"
              name="email"
              autoComplete="email"
              inputMode="email"
              required
              autoFocus
            />
          </label>
          <button className="btn" type="submit">
            Skicka inloggningslänk
          </button>
          <p className="text-sm text-ink-soft">
            Du får en länk via mejl. Inget lösenord behövs.
          </p>
        </form>
      )}
    </main>
  );
}
