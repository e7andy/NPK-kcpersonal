/**
 * Small in-memory fixed-window rate limiter. The app runs as a single process,
 * so memory is enough; counts reset when the service restarts.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
const MAX_KEYS = 10_000;

function sweep(now: number) {
  for (const [key, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(key);
}

/**
 * Counts one attempt for `key`. Returns true if the attempt is allowed, false
 * if the key has used up its `max` attempts in the current window.
 */
export function consume(key: string, max: number, windowMs: number, now: number = Date.now()): boolean {
  if (buckets.size > MAX_KEYS) sweep(now);
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= max) return false;
  bucket.count++;
  return true;
}

/** Only for tests. */
export function resetRateLimits() {
  buckets.clear();
}
