/**
 * Returns `path` if it is a safe path within this site, otherwise `fallback`.
 *
 * Rejects absolute URLs, protocol-relative paths ("//evil.example") and
 * backslashes, which browsers treat as slashes ("/\evil.example").
 */
export function safeReturnPath(path: string, fallback: string): string {
  if (!path.startsWith("/") || path.startsWith("//")) return fallback;
  if (path.includes("\\")) return fallback;
  // Control characters (including tab and newline) are stripped by browsers,
  // which can turn "/\t/evil.example" into "//evil.example".
  if (/[\u0000-\u001f\u007f]/.test(path)) return fallback;
  return path;
}
