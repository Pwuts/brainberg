import { XMLParser } from "fast-xml-parser";
import { isEuropean } from "../european-countries";
import {
  DEVEVENTS_CATEGORY_MAP,
  DEVEVENTS_TYPE_MAP,
  resolveCategoryFromTags,
} from "../category-map";
import { stripHtml, truncate } from "../html-utils";
import type { NormalizedEvent, Scraper, ScraperOptions, EventType } from "../types";

const RSS_URL = "https://dev.events/rss.xml";

interface RssItem {
  title: string;
  link: string;
  description?: string;
  pubDate?: string;
  guid?: string;
  category?: string | string[];
}

interface JsonLdEvent {
  "@type"?: string;
  name?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  url?: string;
  image?: string | { url: string };
  isAccessibleForFree?: boolean;
  offers?: { price?: number | string; priceCurrency?: string };
  organizer?: { name?: string; url?: string };
  location?: {
    "@type"?: string;
    name?: string;
    address?: {
      addressLocality?: string;
      addressCountry?: string;
      streetAddress?: string;
    };
    geo?: { latitude?: number; longitude?: number };
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function getCategories(item: RssItem): string[] {
  if (!item.category) return [];
  return Array.isArray(item.category) ? item.category : [item.category];
}

function resolveEventType(categories: string[]): EventType {
  for (const cat of categories) {
    const lower = cat.toLowerCase();
    if (DEVEVENTS_TYPE_MAP[lower]) return DEVEVENTS_TYPE_MAP[lower];
  }
  return "conference";
}

/** Extract JSON-LD from an HTML page. */
function extractJsonLd(html: string): JsonLdEvent | null {
  const regex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1]);
      // Could be an array or single object
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (item["@type"] === "Event") return item;
      }
    } catch {
      continue;
    }
  }
  return null;
}

export const devEventsScraper: Scraper = {
  name: "dev_events",

  async *scrape(options?: ScraperOptions): AsyncGenerator<NormalizedEvent> {
    // Pass 1: Fetch RSS
    const res = await fetch(RSS_URL, {
      headers: { "User-Agent": "Brainberg/1.0 (https://brainberg.eu)" },
    });
    if (!res.ok) throw new Error(`Failed to fetch RSS: ${res.status}`);

    const xml = await res.text();
    const parser = new XMLParser({ ignoreAttributes: false });
    const feed = parser.parse(xml);

    const items: RssItem[] =
      feed?.rss?.channel?.item ?? feed?.channel?.item ?? [];

    if (!Array.isArray(items)) {
      console.warn("[dev.events] No items found in RSS feed");
      return;
    }

    // Pass 2: For each item, fetch detail page for JSON-LD
    for (const item of items) {
      const categories = getCategories(item);
      const title = typeof item.title === "string" ? item.title : String(item.title);
      const link = item.link;

      // Basic date filter from RSS pubDate
      if (item.pubDate && options?.dateFrom) {
        const pub = new Date(item.pubDate);
        if (pub < options.dateFrom) continue;
      }

      // Rate limit
      await sleep(800);

      // Fetch detail page for JSON-LD
      let jsonLd: JsonLdEvent | null = null;
      try {
        const detailRes = await fetch(link, {
          headers: { "User-Agent": "Brainberg/1.0 (https://brainberg.eu)" },
        });
        if (detailRes.ok) {
          const html = await detailRes.text();
          jsonLd = extractJsonLd(html);
        }
      } catch {
        // Continue without JSON-LD data
      }

      const startsAt = jsonLd?.startDate
        ? new Date(jsonLd.startDate)
        : item.pubDate
          ? new Date(item.pubDate)
          : null;

      if (!startsAt || isNaN(startsAt.getTime())) continue;

      // Apply date filters
      if (options?.dateFrom && startsAt < options.dateFrom) continue;
      if (options?.dateTo && startsAt > options.dateTo) continue;

      const endsAt = jsonLd?.endDate ? new Date(jsonLd.endDate) : undefined;

      const description = jsonLd?.description
        ?? (item.description ? stripHtml(item.description) : undefined);

      const category = resolveCategoryFromTags(categories, DEVEVENTS_CATEGORY_MAP, title);

      const isOnline = jsonLd?.location?.["@type"] === "VirtualLocation";
      const cityName = jsonLd?.location?.address?.addressLocality;
      const countryCode = jsonLd?.location?.address?.addressCountry;

      // Filter: European countries only (skip if we have a country and it's not European)
      if (countryCode && !isEuropean(countryCode)) continue;

      const imageUrl =
        typeof jsonLd?.image === "string"
          ? jsonLd.image
          : jsonLd?.image?.url ?? undefined;

      const price = jsonLd?.offers?.price;
      const isFree = jsonLd?.isAccessibleForFree ?? (price === 0 || price === "0");

      yield {
        title,
        description,
        shortDescription: description ? truncate(description, 500) : undefined,
        category,
        eventType: resolveEventType(categories),
        startsAt,
        endsAt: endsAt && !isNaN(endsAt.getTime()) ? endsAt : undefined,
        timezone: "UTC", // Will be resolved from city
        isMultiDay: !!(endsAt && endsAt.getTime() - startsAt.getTime() > 24 * 60 * 60 * 1000),
        cityName,
        countryCode,
        venueName: jsonLd?.location?.name,
        venueAddress: jsonLd?.location?.address?.streetAddress,
        latitude: jsonLd?.location?.geo?.latitude,
        longitude: jsonLd?.location?.geo?.longitude,
        isOnline,
        websiteUrl: jsonLd?.url ?? link,
        devEventsUrl: link,
        imageUrl,
        isFree: isFree || undefined,
        priceFrom: typeof price === "number" ? price : undefined,
        currency: jsonLd?.offers?.priceCurrency,
        organizerName: jsonLd?.organizer?.name,
        organizerUrl: jsonLd?.organizer?.url,
        source: "dev_events",
        sourceId: item.guid ?? link,
        sourceUrl: link,
        tags: categories,
        rawData: { rssItem: item, jsonLd },
      };
    }
  },
};
