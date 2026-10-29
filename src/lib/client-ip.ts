/**
 * The client's IP address behind Apache.
 *
 * Apache (mod_proxy) appends the address it received the request from to
 * X-Forwarded-For, so the rightmost entry is the real client. Entries to the
 * left come from the client itself and cannot be trusted.
 */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const last = forwarded.split(",").map((part) => part.trim()).filter(Boolean).pop();
    if (last) return last;
  }
  return "unknown";
}
