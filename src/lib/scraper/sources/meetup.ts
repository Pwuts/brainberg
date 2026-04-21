import { db } from "@/lib/db";
import { cities, countries, events } from "@/lib/db/schema";
import { eq, and, isNotNull, isNull } from "drizzle-orm";
import { MEETUP_TOPIC_MAP, resolveCategoryFromTags } from "../category-map";
import { truncate } from "../html-utils";
import { isEuropean } from "../european-countries";
import type { NormalizedEvent, Scraper, ScraperOptions, EventSize } from "../types";

/** Load all cities from the DB with their country codes for Meetup search. */
async function getSearchCities(): Promise<{ name: string; countryCode: string }[]> {
  const results = await db
    .select({ cityName: cities.name, countryCode: countries.code })
    .from(cities)
    .innerJoin(countries, eq(cities.countryId, countries.id));

  return results.map((r) => ({
    name: r.cityName,
    countryCode: r.countryCode.toLowerCase(),
  }));
}

interface MeetupEvent {
  id: string;
  title: string;
  description?: string;
  dateTime: string;
  endTime?: string;
  eventUrl: string;
  eventType?: string; // ONLINE, PHYSICAL
  going?: number;
  imageUrl?: string;
  venue?: {
    name?: string;
    address?: string;
    city?: string;
    country?: string;
    lat?: number;
    lng?: number;
  };
  group?: {
    name?: string;
    urlname?: string;
  };
  topics?: { name?: string; urlkey?: string }[];
  featuredEventPhoto?: { highResUrl?: string };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function normalizeMeetupEvent(ev: MeetupEvent): NormalizedEvent | null {
  if (!ev.title || !ev.dateTime) return null;
  const startsAt = new Date(ev.dateTime);
  if (isNaN(startsAt.getTime())) return null;

  const endsAt = ev.endTime ? new Date(ev.endTime) : undefined;
  // Meetup's eventType is ONLINE | PHYSICAL | HYBRID. In our model `isOnline`
  // means "(also) available online" — hybrid events get the Online badge too.
  // `isOnlineOnly` is what gates clearing the physical venue.
  const isOnlineOnly = ev.eventType === "ONLINE";
  const isHybrid    = ev.eventType === "HYBRID";
  const isOnline    = isOnlineOnly || isHybrid;

  // Meetup's city-search pages occasionally return events from neighbouring
  // groups outside Europe. Skip in-person events whose venue country is known
  // and non-European so they don't leak into the platform.
  if (!isOnlineOnly && ev.venue?.country && !isEuropean(ev.venue.country)) {
    return null;
  }
  const topicUrlkeys = ev.topics?.map((t) => t.urlkey).filter(Boolean) as string[] ?? [];
  // Meetup's description field is already markdown (e.g. `**bold**`, not
  // `<b>bold</b>`), so we pass it through as-is. Feeding it to Turndown
  // would escape the asterisks into `\*\*…\*\*` and break rendering.
  const description = ev.description?.trim() || undefined;
  const category = resolveCategoryFromTags(topicUrlkeys, MEETUP_TOPIC_MAP, ev.title);

  // Meetup's Apollo cache sometimes ships a venue with a placeholder lat
  // (e.g. the group's home city) but no lng — common for "Online event"
  // venue objects. A partial coordinate plots on null island in Leaflet.
  const hasBothCoords = typeof ev.venue?.lat === "number" && typeof ev.venue?.lng === "number";

  // For ONLINE-only events Meetup returns a placeholder venue like
  // `{city:"",name:"Online event",address:"",country:""}` — drop it entirely
  // so the event doesn't get stamped with a physical location. Hybrid events
  // keep their venue because they have a real physical location too.
  const venue = isOnlineOnly ? undefined : ev.venue;
  const cityName = isOnlineOnly ? undefined : venue?.city || undefined;

  return {
    title: ev.title,
    description,
    shortDescription: description ? truncate(description, 500) : undefined,
    category,
    eventType: "meetup",
    size: estimateSize(ev.going),
    tags: ev.topics?.map((t) => t.name).filter(Boolean) as string[],
    startsAt,
    endsAt: endsAt && !isNaN(endsAt.getTime()) ? endsAt : undefined,
    timezone: "UTC",
    cityName,
    countryCode: isOnlineOnly ? undefined : venue?.country || undefined,
    venueName: isOnlineOnly ? undefined : venue?.name || undefined,
    venueAddress: isOnlineOnly ? undefined : venue?.address || undefined,
    latitude: !isOnlineOnly && hasBothCoords ? venue!.lat : undefined,
    longitude: !isOnlineOnly && hasBothCoords ? venue!.lng : undefined,
    isOnline,
    isHybrid,
    websiteUrl: ev.eventUrl,
    meetupUrl: ev.eventUrl,
    imageUrl: ev.imageUrl ?? ev.featuredEventPhoto?.highResUrl,
    organizerName: ev.group?.name,
    organizerUrl: ev.group?.urlname
      ? `https://www.meetup.com/${ev.group.urlname}/`
      : undefined,
    source: "meetup",
    sourceId: ev.id,
    sourceUrl: ev.eventUrl,
    rawData: ev,
  };
}

const MEETUP_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml",
};

/**
 * Fetch and normalize Meetup events for a single (city, country) pair.
 * Exported so admin tooling (e.g. city preview) can invoke a single-city
 * query without triggering the full scraper loop or DB ingestion.
 */
export async function fetchMeetupCity(
  cityName: string,
  countryCode: string,
  options?: { dateFrom?: Date; dateTo?: Date },
): Promise<NormalizedEvent[]> {
  const locationParam = `${countryCode.toLowerCase()}--${cityName}`;
  const searchUrl = `https://www.meetup.com/find/?location=${encodeURIComponent(locationParam)}&source=EVENTS&eventType=upcoming&categoryId=546`;

  let html: string;
  try {
    const res = await fetch(searchUrl, { headers: MEETUP_HEADERS });
    if (!res.ok) {
      console.warn(`[meetup] Failed to fetch ${cityName}: ${res.status}`);
      return [];
    }
    html = await res.text();
  } catch (err) {
    console.warn(`[meetup] Error fetching ${cityName}:`, err);
    return [];
  }

  const out: NormalizedEvent[] = [];
  for (const ev of extractEventsFromHtml(html)) {
    const normalized = normalizeMeetupEvent(ev);
    if (!normalized) continue;
    if (options?.dateFrom && normalized.startsAt < options.dateFrom) continue;
    if (options?.dateTo && normalized.startsAt > options.dateTo) continue;
    // Historically we stamped the searched city when Meetup gave us no venue,
    // but that tagged online events and events-from-nearby-groups to the wrong
    // city (e.g. "AWS UG Nürnberg" surfaced under Erlangen's search). Without
    // a venue in the payload we genuinely don't know where the event is.
    out.push(normalized);
  }
  return out;
}

/** Fetch and normalize a single Meetup event page by URL. */
export async function scrapeMeetupEvent(url: string): Promise<NormalizedEvent | null> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:") return null;
  if (parsed.hostname !== "www.meetup.com" && parsed.hostname !== "meetup.com") return null;

  const res = await fetch(parsed.toString(), { headers: MEETUP_HEADERS });
  if (!res.ok) return null;
  const html = await res.text();
  const pageEvents = extractEventsFromHtml(html);
  for (const ev of pageEvents) {
    const normalized = normalizeMeetupEvent(ev);
    if (normalized) return normalized;
  }
  return null;
}

function estimateSize(going: number | undefined): EventSize | undefined {
  if (!going) return undefined;
  if (going < 50) return "small";
  if (going < 200) return "medium";
  if (going < 1000) return "large";
  return "major";
}

/** Resolve an Apollo cache reference ({__ref: "Type:id"}) to the stored object. */
function resolveRef(
  value: unknown,
  state: Record<string, unknown>,
): Record<string, unknown> | null {
  if (typeof value === "string") {
    return (state[value] as Record<string, unknown>) ?? null;
  }
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (typeof obj.__ref === "string") {
      return (state[obj.__ref] as Record<string, unknown>) ?? null;
    }
    return obj;
  }
  return null;
}

/** Extract events from Meetup's __NEXT_DATA__ in the search page HTML. */
function extractEventsFromHtml(html: string): MeetupEvent[] {
  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!match) return [];

  try {
    const data = JSON.parse(match[1]);
    // Navigate the Apollo cache to find Event objects
    const state = data?.props?.pageProps?.__APOLLO_STATE__ ?? {};
    const events: MeetupEvent[] = [];

    for (const [key, value] of Object.entries(state)) {
      if (key.startsWith("Event:") && typeof value === "object" && value !== null) {
        const ev = value as Record<string, unknown>;
        const venueRef = resolveRef(ev.venue, state);
        const groupRef = resolveRef(ev.group, state);
        events.push({
          id: (ev.id as string) ?? key.replace("Event:", ""),
          title: ev.title as string,
          description: ev.description as string | undefined,
          dateTime: ev.dateTime as string,
          endTime: ev.endTime as string | undefined,
          eventUrl: ev.eventUrl as string,
          eventType: ev.eventType as string | undefined,
          going: (ev.rsvps as { totalCount?: number })?.totalCount,
          imageUrl: (() => {
            const photoRef = resolveRef(ev.featuredEventPhoto ?? ev.displayPhoto, state);
            if (photoRef) return (photoRef.highResUrl as string) ?? undefined;
            return ev.imageUrl as string | undefined;
          })(),
          venue: venueRef
            ? {
                name: venueRef.name as string | undefined,
                address: venueRef.address as string | undefined,
                city: venueRef.city as string | undefined,
                country: venueRef.country as string | undefined,
                lat: venueRef.lat as number | undefined,
                lng: venueRef.lng as number | undefined,
              }
            : undefined,
          group: groupRef
            ? {
                name: groupRef.name as string | undefined,
                urlname: groupRef.urlname as string | undefined,
              }
            : undefined,
          topics: Array.isArray(ev.topics)
            ? (ev.topics
                .map((ref: unknown) => resolveRef(ref, state))
                .filter((t): t is Record<string, unknown> => t !== null)
                .map((t) => ({ name: t.name as string, urlkey: t.urlkey as string }))
                .filter((t) => t.name && t.urlkey))
            : undefined,
        });
      }
    }

    return events;
  } catch {
    return [];
  }
}

export const meetupScraper: Scraper = {
  name: "meetup",

  async *scrape(options?: ScraperOptions): AsyncGenerator<NormalizedEvent> {
    const searchCities = await getSearchCities();
    const totalCities = searchCities.length;
    const seenEventUrls = new Set<string>();
    console.log(`[meetup] Searching ${totalCities} cities`);

    for (let i = 0; i < totalCities; i++) {
      const city = searchCities[i];

      // Report progress
      options?.onProgress?.(
        Math.round((i / totalCities) * 100),
        `Searching ${city.name} (${i + 1}/${totalCities})`,
      );

      // Rate limit between cities
      await sleep(2500);

      const normalizedEvents = await fetchMeetupCity(city.name, city.countryCode, {
        dateFrom: options?.dateFrom,
        dateTo: options?.dateTo,
      });

      for (const normalized of normalizedEvents) {
        yield normalized;
        if (normalized.meetupUrl) seenEventUrls.add(normalized.meetupUrl);
      }
    }

    // Pass 2: Fetch Meetup events referenced by dev.events that we haven't scraped yet
    const unscrapedMeetupUrls = await db
      .select({ id: events.id, meetupUrl: events.meetupUrl })
      .from(events)
      .where(and(isNotNull(events.meetupUrl), isNull(events.latitude)));

    // Filter to only URLs we haven't already seen in this run
    const newMeetupUrls = unscrapedMeetupUrls.filter(
      (e) => e.meetupUrl && !seenEventUrls.has(e.meetupUrl),
    );

    if (newMeetupUrls.length > 0) {
      console.log(`[meetup] Pass 2: fetching ${newMeetupUrls.length} events from dev.events meetup URLs`);

      for (let i = 0; i < newMeetupUrls.length; i++) {
        const { meetupUrl: url } = newMeetupUrls[i];
        if (!url) continue;

        options?.onProgress?.(
          Math.round(((totalCities + i) / (totalCities + newMeetupUrls.length)) * 100),
          `Fetching linked event ${i + 1}/${newMeetupUrls.length}`,
        );

        await sleep(2500);

        try {
          const normalized = await scrapeMeetupEvent(url);
          if (normalized) yield normalized;
        } catch (err) {
          console.warn(`[meetup] Failed to fetch linked event ${url}:`, err);
        }
      }
    }
  },
};
