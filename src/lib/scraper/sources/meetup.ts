import { db } from "@/lib/db";
import { cities, countries, events } from "@/lib/db/schema";
import { eq, and, isNotNull, isNull } from "drizzle-orm";
import { MEETUP_TOPIC_MAP, resolveCategoryFromTags } from "../category-map";
import { stripHtml, truncate } from "../html-utils";
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
  const isOnline = ev.eventType === "ONLINE";
  const topicUrlkeys = ev.topics?.map((t) => t.urlkey).filter(Boolean) as string[] ?? [];
  const description = ev.description ? stripHtml(ev.description) : undefined;
  const category = resolveCategoryFromTags(topicUrlkeys, MEETUP_TOPIC_MAP, ev.title);

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
    cityName: ev.venue?.city,
    countryCode: ev.venue?.country,
    venueName: ev.venue?.name,
    venueAddress: ev.venue?.address,
    latitude: ev.venue?.lat,
    longitude: ev.venue?.lng,
    isOnline,
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

  const res = await fetch(parsed.toString(), {
    headers: {
      "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
    },
  });
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
        Math.round(((i) / totalCities) * 100),
        `Searching ${city.name} (${i + 1}/${totalCities})`,
      );

      // Rate limit between cities
      await sleep(2500);

      // Meetup requires {countrycode}--{city} format for correct geo-targeting
      const locationParam = `${city.countryCode}--${city.name}`;
      const searchUrl = `https://www.meetup.com/find/?location=${encodeURIComponent(locationParam)}&source=EVENTS&eventType=upcoming&categoryId=546`;

      let html: string;
      try {
        const res = await fetch(searchUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Accept: "text/html,application/xhtml+xml",
          },
        });
        if (!res.ok) {
          console.warn(`[meetup] Failed to fetch ${city.name}: ${res.status}`);
          continue;
        }
        html = await res.text();
      } catch (err) {
        console.warn(`[meetup] Error fetching ${city.name}:`, err);
        continue;
      }

      const events = extractEventsFromHtml(html);

      for (const ev of events) {
        const normalized = normalizeMeetupEvent(ev);
        if (!normalized) continue;

        // Apply date filters
        if (options?.dateFrom && normalized.startsAt < options.dateFrom) continue;
        if (options?.dateTo && normalized.startsAt > options.dateTo) continue;

        // Fall back to searched city name when venue city is missing
        if (!normalized.cityName) normalized.cityName = city.name;
        // Mark hybrid if URL hints at it
        normalized.isHybrid = !normalized.isOnline && !!ev.eventUrl?.includes("online");

        yield normalized;

        if (ev.eventUrl) seenEventUrls.add(ev.eventUrl);
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
