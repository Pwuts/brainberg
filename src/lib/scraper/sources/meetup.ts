import { MEETUP_TOPIC_MAP, resolveCategoryFromTags } from "../category-map";
import { stripHtml, truncate } from "../html-utils";
import type { NormalizedEvent, Scraper, ScraperOptions, EventSize } from "../types";

// Major European tech hubs to search
const SEARCH_CITIES: { name: string; lat: number; lng: number }[] = [
  { name: "London", lat: 51.5074, lng: -0.1278 },
  { name: "Berlin", lat: 52.52, lng: 13.405 },
  { name: "Amsterdam", lat: 52.3676, lng: 4.9041 },
  { name: "Paris", lat: 48.8566, lng: 2.3522 },
  { name: "Barcelona", lat: 41.3874, lng: 2.1686 },
  { name: "Munich", lat: 48.1351, lng: 11.582 },
  { name: "Stockholm", lat: 59.3293, lng: 18.0686 },
  { name: "Dublin", lat: 53.3498, lng: -6.2603 },
  { name: "Lisbon", lat: 38.7223, lng: -9.1393 },
  { name: "Zurich", lat: 47.3769, lng: 8.5417 },
  { name: "Copenhagen", lat: 55.6761, lng: 12.5683 },
  { name: "Vienna", lat: 48.2082, lng: 16.3738 },
  { name: "Prague", lat: 50.0755, lng: 14.4378 },
  { name: "Warsaw", lat: 52.2297, lng: 21.0122 },
  { name: "Helsinki", lat: 60.1699, lng: 24.9384 },
  { name: "Brussels", lat: 50.8503, lng: 4.3517 },
  { name: "Milan", lat: 45.4642, lng: 9.19 },
];

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

function estimateSize(going: number | undefined): EventSize | undefined {
  if (!going) return undefined;
  if (going < 50) return "small";
  if (going < 200) return "medium";
  if (going < 1000) return "large";
  return "major";
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
        events.push({
          id: (ev.id as string) ?? key.replace("Event:", ""),
          title: ev.title as string,
          description: ev.description as string | undefined,
          dateTime: ev.dateTime as string,
          endTime: ev.endTime as string | undefined,
          eventUrl: ev.eventUrl as string,
          eventType: ev.eventType as string | undefined,
          going: (ev.going as { totalCount?: number })?.totalCount,
          imageUrl: ev.imageUrl as string | undefined,
          venue: ev.venue as MeetupEvent["venue"],
          group: ev.group
            ? { name: (state[ev.group as string] as Record<string, unknown>)?.name as string, urlname: (state[ev.group as string] as Record<string, unknown>)?.urlname as string }
            : undefined,
          topics: Array.isArray(ev.topics)
            ? (ev.topics.map((ref: unknown) => {
                const t = state[ref as string] as Record<string, unknown> | undefined;
                return t ? { name: t.name as string, urlkey: t.urlkey as string } : undefined;
              }).filter((t): t is { name: string; urlkey: string } => t !== undefined))
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
    for (const city of SEARCH_CITIES) {
      // Rate limit between cities
      await sleep(2500);

      const searchUrl = `https://www.meetup.com/find/?location=${encodeURIComponent(city.name)}&source=EVENTS&eventType=upcoming&categoryId=546`; // 546 = Technology

      let html: string;
      try {
        const res = await fetch(searchUrl, {
          headers: {
            "User-Agent": "Brainberg/1.0 (https://brainberg.eu)",
            Accept: "text/html",
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
        if (!ev.title || !ev.dateTime) continue;

        const startsAt = new Date(ev.dateTime);
        if (isNaN(startsAt.getTime())) continue;

        // Apply date filters
        if (options?.dateFrom && startsAt < options.dateFrom) continue;
        if (options?.dateTo && startsAt > options.dateTo) continue;

        const endsAt = ev.endTime ? new Date(ev.endTime) : undefined;
        const isOnline = ev.eventType === "ONLINE";
        const topicUrlkeys = ev.topics?.map((t) => t.urlkey).filter(Boolean) as string[] ?? [];

        const description = ev.description ? stripHtml(ev.description) : undefined;
        const category = resolveCategoryFromTags(topicUrlkeys, MEETUP_TOPIC_MAP, ev.title);

        yield {
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
          cityName: ev.venue?.city ?? city.name,
          countryCode: ev.venue?.country,
          venueName: ev.venue?.name,
          venueAddress: ev.venue?.address,
          latitude: ev.venue?.lat,
          longitude: ev.venue?.lng,
          isOnline,
          isHybrid: !isOnline && !!ev.eventUrl?.includes("online"),
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
    }
  },
};
