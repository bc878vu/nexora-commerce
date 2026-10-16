/**
 * Tiny in-memory sliding-window rate limiter.
 * NOTE: per server instance only — on serverless it limits per warm
 * instance. Good enough as a first layer; pair with WAF for production.
 */
type Bucket = { hits: number[] };
const buckets = new Map<string, Bucket>();

export function rateLimit(
  key: string,
  maxHits: number,
  windowMs: number,
): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b) {
    b = { hits: [] };
    buckets.set(key, b);
  }
  b.hits = b.hits.filter((t) => now - t < windowMs);
  if (b.hits.length >= maxHits) {
    const retryAfterSec = Math.ceil((b.hits[0] + windowMs - now) / 1000);
    return { allowed: false, retryAfterSec: Math.max(1, retryAfterSec) };
  }
  b.hits.push(now);
  // Prevent unbounded growth of the map.
  if (buckets.size > 5000) {
    const oldest = [...buckets.entries()].sort(
      (a, z) => a[1].hits[0] - z[1].hits[0],
    )[0];
    buckets.delete(oldest[0]);
  }
  return { allowed: true, retryAfterSec: 0 };
}

/** Best-effort client IP for rate-limit keys. */
export function clientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}
