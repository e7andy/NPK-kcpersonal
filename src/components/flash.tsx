/** Shows ?error=, ?warn= and ?ok= messages set by server actions. */
export function Flash({ error, warn, ok }: { error?: string; warn?: string; ok?: string }) {
  return (
    <>
      {error && (
        <p className="notice-error" role="alert">
          {error}
        </p>
      )}
      {ok && (
        <p className="notice-ok" role="status">
          {ok}
        </p>
      )}
      {warn && (
        <p className="notice-warn" role="alert">
          {warn}
        </p>
      )}
    </>
  );
}
