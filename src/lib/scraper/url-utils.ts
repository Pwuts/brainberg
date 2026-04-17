const TRACKING_PARAMS = new Set([
  "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
  "ref", "fbclid", "gclid", "mc_cid", "mc_eid",
]);

/** Normalize a URL for dedup comparison: strip www, trailing slash, tracking params, lowercase. */
export function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    const path = u.pathname.replace(/\/$/, "");

    for (const param of TRACKING_PARAMS) {
      u.searchParams.delete(param);
    }

    const query = u.searchParams.toString();
    return `${host}${path}${query ? `?${query}` : ""}`.toLowerCase();
  } catch {
    return url.toLowerCase().trim();
  }
}
