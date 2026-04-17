/** Generate a deterministic fingerprint from title + date + city.
 *  Strips years, event-type words, and non-alphanumeric characters. */
export function exactFingerprint(
  title: string,
  startsAt: Date,
  city: string | null,
  isOnline: boolean,
): string {
  const normalizedTitle = title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\b(20\d{2})\b/g, "")
    .replace(/\b(conference|conf|summit|meetup|workshop|webinar|hackathon)\b/g, "")
    .replace(/\s+/g, "")
    .trim();

  const dateKey = startsAt.toISOString().slice(0, 10);

  const locationKey = isOnline
    ? "online"
    : (city || "unknown").toLowerCase().replace(/[^a-z]/g, "");

  return `${normalizedTitle}|${dateKey}|${locationKey}`;
}

/** Jaccard word similarity between two strings (0–1). */
export function jaccardSimilarity(a: string, b: string): number {
  const wordsA = new Set(
    a.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(Boolean)
  );
  const wordsB = new Set(
    b.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(Boolean)
  );

  if (wordsA.size === 0 && wordsB.size === 0) return 1;
  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let intersection = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) intersection++;
  }

  const union = wordsA.size + wordsB.size - intersection;
  return intersection / union;
}

/** Check if two events are a fuzzy match:
 *  - Jaccard similarity > 0.6
 *  - Start dates within 1 day
 *  - Same city or both online */
export function fuzzyMatch(
  a: { title: string; startsAt: Date; city: string | null; isOnline: boolean },
  b: { title: string; startsAt: Date; city: string | null; isOnline: boolean },
): boolean {
  // Check date proximity (within 1 day)
  const dayMs = 24 * 60 * 60 * 1000;
  if (Math.abs(a.startsAt.getTime() - b.startsAt.getTime()) > dayMs) return false;

  // Check location match
  const aLoc = a.isOnline ? "online" : (a.city || "").toLowerCase();
  const bLoc = b.isOnline ? "online" : (b.city || "").toLowerCase();
  if (aLoc !== bLoc) return false;

  // Check title similarity
  return jaccardSimilarity(a.title, b.title) > 0.6;
}
