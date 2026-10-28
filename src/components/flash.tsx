/** Shows ?error= and ?ok= messages set by server actions. */
export function Flash({ error, ok }: { error?: string; ok?: string }) {
  if (error) return <p className="notice-error" role="alert">{error}</p>;
  if (ok) return <p className="notice-ok" role="status">{ok}</p>;
  return null;
}
