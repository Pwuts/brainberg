import { db } from "@/lib/db";
import { events, eventFingerprints, eventSources, cities } from "@/lib/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { normalizeUrl } from "./url-utils";
import { exactFingerprint, fuzzyMatch, jaccardSimilarity } from "./fingerprint";
import type { NormalizedEvent } from "./types";

/** Source priority for merge decisions — higher wins. */
const SOURCE_PRIORITY: Record<string, number> = {
  eventbrite: 4,
  meetup: 3,
  dev_events: 2,
  confs_tech: 1,
  manual: 5,
  community: 3,
  luma: 2,
  other: 0,
};

export interface DedupResult {
  /** Existing event ID if duplicate found, null if new. */
  existingEventId: string | null;
  /** Which dedup layer matched. */
  matchLayer: "url" | "fingerprint" | "fuzzy" | null;
  /** Whether the new source has higher priority than existing. */
  shouldUpdate: boolean;
}

/** Run 3-layer dedup check for a normalized event. */
export async function checkDuplicate(event: NormalizedEvent): Promise<DedupResult> {
  // Layer 1: URL match
  const urls = [event.websiteUrl, event.registrationUrl, event.sourceUrl]
    .filter(Boolean)
    .map((u) => normalizeUrl(u!));

  if (urls.length > 0) {
    for (const url of urls) {
      const match = await db
        .select({ eventId: eventFingerprints.eventId })
        .from(eventFingerprints)
        .where(
          and(
            eq(eventFingerprints.fingerprintType, "url"),
            eq(eventFingerprints.fingerprintValue, url),
          )
        )
        .limit(1);

      if (match.length > 0) {
        return {
          existingEventId: match[0].eventId,
          matchLayer: "url",
          shouldUpdate: await shouldUpdateExisting(match[0].eventId, event.source),
        };
      }
    }
  }

  // Layer 2: Exact fingerprint (title + date + city)
  const fp = exactFingerprint(
    event.title,
    event.startsAt,
    event.cityName ?? null,
    event.isOnline,
  );

  const fpMatch = await db
    .select({ eventId: eventFingerprints.eventId })
    .from(eventFingerprints)
    .where(
      and(
        eq(eventFingerprints.fingerprintType, "title_date_city"),
        eq(eventFingerprints.fingerprintValue, fp),
      )
    )
    .limit(1);

  if (fpMatch.length > 0) {
    return {
      existingEventId: fpMatch[0].eventId,
      matchLayer: "fingerprint",
      shouldUpdate: await shouldUpdateExisting(fpMatch[0].eventId, event.source),
    };
  }

  // Layer 3: Fuzzy match — check events within ±1 day in same city
  const dayMs = 24 * 60 * 60 * 1000;
  const dateFrom = new Date(event.startsAt.getTime() - dayMs);
  const dateTo = new Date(event.startsAt.getTime() + dayMs);

  const candidates = await db
    .select({
      id: events.id,
      title: events.title,
      startsAt: events.startsAt,
      isOnline: events.isOnline,
      cityName: cities.name,
    })
    .from(events)
    .leftJoin(cities, eq(events.cityId, cities.id))
    .where(
      and(
        gte(events.startsAt, dateFrom),
        lte(events.startsAt, dateTo),
      )
    )
    .limit(50);

  for (const candidate of candidates) {
    if (
      fuzzyMatch(
        { title: event.title, startsAt: event.startsAt, city: event.cityName ?? null, isOnline: event.isOnline },
        { title: candidate.title, startsAt: candidate.startsAt, city: candidate.cityName ?? null, isOnline: candidate.isOnline },
      )
    ) {
      const similarity = jaccardSimilarity(event.title, candidate.title);
      console.log(`[dedup] Fuzzy match (${similarity.toFixed(2)}): "${event.title}" ≈ "${candidate.title}"`);
      return {
        existingEventId: candidate.id,
        matchLayer: "fuzzy",
        shouldUpdate: await shouldUpdateExisting(candidate.id, event.source),
      };
    }
  }

  return { existingEventId: null, matchLayer: null, shouldUpdate: false };
}

/** Check if the new source has higher priority than existing sources. */
async function shouldUpdateExisting(eventId: string, newSource: string): Promise<boolean> {
  const existing = await db
    .select({ source: eventSources.source })
    .from(eventSources)
    .where(eq(eventSources.eventId, eventId));

  const newPriority = SOURCE_PRIORITY[newSource] ?? 0;
  const maxExisting = Math.max(
    0,
    ...existing.map((e) => SOURCE_PRIORITY[e.source] ?? 0)
  );

  return newPriority >= maxExisting;
}
