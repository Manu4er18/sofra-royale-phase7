import "server-only";

/**
 * In-memory sliding-window rate limiter.
 *
 * Suitable for a single server instance (development and small deploys).
 * For serverless/multi-instance production, swap the Map for Upstash
 * Redis — the call-site API stays identical, which is why this lives
 * behind one function. (UPSTASH_* env vars are already scaffolded.)
 */
type Bucket = { timestamps: number[] };

const buckets = new Map<string, Bucket>();

// Periodic cleanup so long-running dev servers don't leak memory.
const CLEANUP_INTERVAL = 10 * 60_000;
let lastCleanup = Date.now();

function cleanup(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, bucket] of buckets) {
    bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs);
    if (bucket.timestamps.length === 0) buckets.delete(key);
  }
}

/**
 * @returns true when the action is allowed, false when rate-limited.
 */
export function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number,
): boolean {
  cleanup(windowMs);
  const now = Date.now();
  const bucket = buckets.get(key) ?? { timestamps: [] };
  bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs);

  if (bucket.timestamps.length >= maxAttempts) {
    buckets.set(key, bucket);
    return false;
  }

  bucket.timestamps.push(now);
  buckets.set(key, bucket);
  return true;
}
