interface Entry {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Entry>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: boolean; retryAfter?: number } {
  const now = Date.now();

  if (buckets.size > 10_000) {
    for (const [k, e] of buckets) {
      if (e.resetAt < now) buckets.delete(k);
    }
  }

  const entry = buckets.get(key);
  if (!entry || entry.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  if (entry.count >= limit) {
    return { ok: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }
  entry.count++;
  return { ok: true };
}

/**
 * Get client IP from proxy headers. Prefers X-Real-IP (set by our nginx-proxy
 * from the TCP peer, can't be spoofed). Falls back to the LAST entry in
 * X-Forwarded-For — that's the IP our proxy appended, so it's trustworthy
 * even if the client prefixed the header with spoofed values.
 */
export function getClientIp(headers: Headers): string {
  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const parts = xff.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1];
  }

  return "unknown";
}
