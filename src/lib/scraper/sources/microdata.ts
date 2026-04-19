import { db } from "@/lib/db";
import { scraperSources, cities } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { isEuropean } from "../european-countries";
import { htmlToMarkdown, truncate } from "../html-utils";
import { extractJsonLdEvents, extractMicrodataEvents, type ExtractedEvent } from "../structured-data";
import { resolveCategory, resolveEventType } from "../category-map";
import type { NormalizedEvent, Scraper, ScraperOptions, EventCategory } from "../types";

const USER_AGENT = "Brainberg/1.0 (https://brainberg.eu)";

/** Per-source config stored in scraper_sources.config jsonb. */
export interface MicrodataSourceConfig {
  /** Which extractor to use on the fetched page. */
  extraction: "microdata" | "jsonld";
  /**
   * Substring to match against each block's itemtype (microdata) or @type
   * (jsonld). Defaults to "Event", which catches Schema.org Event plus all
   * subtypes (EducationEvent, BusinessEvent, etc).
   */
  itemtype?: string;
  /** Values to use when the extracted data doesn't carry them. */
  fallbacks?: {
    cityName?: string;
    countryCode?: string;
    venueName?: string;
    venueAddress?: string;
    timezone?: string;
  };
}

export const microdataScraper: Scraper = {
  name: "microdata",

  async *scrape(options?: ScraperOptions): AsyncGenerator<NormalizedEvent> {
    const sources = await db
      .select()
      .from(scraperSources)
      .where(eq(scraperSources.sourceType, "microdata"));

    const active = sources.filter((s) => s.isActive);
    if (active.length === 0) {
      console.log("[microdata] No active sources configured");
      return;
    }

    for (let i = 0; i < active.length; i++) {
      const source = active[i];
      options?.onProgress?.(
        Math.round((i / active.length) * 100),
        `Scraping ${source.name} (${i + 1}/${active.length})`,
      );

      const config = (source.config ?? {}) as Partial<MicrodataSourceConfig>;
      const extraction = config.extraction ?? "microdata";
      const itemtype = config.itemtype ?? "Event";
      const fallbacks = config.fallbacks ?? {};

      console.log(`[microdata] Scraping "${source.name}" (${source.url}) via ${extraction}`);

      let html: string;
      try {
        const res = await fetch(source.url, {
          headers: { "User-Agent": USER_AGENT, "Accept-Language": "en" },
        });
        if (!res.ok) {
          console.warn(`[microdata] ${source.url} returned ${res.status}`);
          continue;
        }
        html = await res.text();
      } catch (err) {
        console.warn(`[microdata] Failed to fetch ${source.url}:`, err);
        continue;
      }

      const extracted = extraction === "jsonld"
        ? extractJsonLdEvents(html, (t) => t.includes(itemtype))
        : extractMicrodataEvents(html, itemtype);

      let yielded = 0;
      let defaultCity: { name: string; countryCode: string } | null = null;
      if (source.defaultCityId && !fallbacks.cityName) {
        const [row] = await db
          .select({ name: cities.name, countryId: cities.countryId })
          .from(cities)
          .where(eq(cities.id, source.defaultCityId))
          .limit(1);
        if (row) {
          // countryCode is resolved via resolveLocation in ingest; just
          // pass the name and let it derive.
          defaultCity = { name: row.name, countryCode: "" };
        }
      }

      for (const item of extracted) {
        const normalized = toNormalizedEvent(item, source, {
          extraction,
          defaultCategory: source.defaultCategory ?? null,
          defaultCityName: fallbacks.cityName ?? defaultCity?.name,
          defaultCountryCode: fallbacks.countryCode,
          defaultVenueName: fallbacks.venueName,
          defaultVenueAddress: fallbacks.venueAddress,
          defaultTimezone: fallbacks.timezone,
        });
        if (!normalized) continue;
        if (options?.dateFrom && normalized.startsAt < options.dateFrom) continue;
        if (options?.dateTo && normalized.startsAt > options.dateTo) continue;
        yield normalized;
        yielded++;
      }

      await db
        .update(scraperSources)
        .set({ lastScrapedAt: new Date(), eventsFound: yielded })
        .where(eq(scraperSources.id, source.id));
    }
  },
};

interface ToNormalizedOptions {
  extraction: "microdata" | "jsonld";
  defaultCategory: EventCategory | null;
  defaultCityName?: string;
  defaultCountryCode?: string;
  defaultVenueName?: string;
  defaultVenueAddress?: string;
  defaultTimezone?: string;
}

function toNormalizedEvent(
  item: ExtractedEvent,
  source: typeof scraperSources.$inferSelect,
  opts: ToNormalizedOptions,
): NormalizedEvent | null {
  if (!item.name || !item.startDate) return null;

  const startsAt = new Date(item.startDate);
  if (isNaN(startsAt.getTime())) return null;

  const endsAt = item.endDate ? new Date(item.endDate) : undefined;

  const isOnline =
    !!item.eventAttendanceMode &&
    item.eventAttendanceMode.includes("OnlineEventAttendanceMode");

  // Location resolution: extracted > fallback
  const cityName = item.cityName || opts.defaultCityName;
  const countryCode = item.countryCode || opts.defaultCountryCode;
  const venueName = item.venueName || opts.defaultVenueName;
  const venueAddress = item.venueAddress || opts.defaultVenueAddress;

  // Skip in-person events clearly outside Europe
  if (!isOnline && countryCode && !isEuropean(countryCode)) return null;

  // Coordinate pair — only keep both-or-neither
  const hasBothCoords =
    typeof item.latitude === "number" && typeof item.longitude === "number";

  // Resolve image URL against source URL base if relative
  const imageUrl = resolveUrl(item.image, source.url);
  const detailUrl = resolveUrl(item.url, source.url) ?? source.url;

  // Description — may be HTML-ish or plain; htmlToMarkdown handles both
  const description = item.description ? htmlToMarkdown(item.description) : undefined;

  // Category: default (from source) first, otherwise infer from title
  const category =
    opts.defaultCategory ??
    resolveCategory(undefined, {}, item.name);

  const eventType = resolveEventType(item.name) ?? "meetup";

  // Stable sourceId: prefer the UUID identifier, fall back to the URL
  const sourceId = item.identifier ?? detailUrl;

  return {
    title: item.name,
    description,
    shortDescription: description ? truncate(description, 500) : undefined,
    category,
    eventType,
    startsAt,
    endsAt: endsAt && !isNaN(endsAt.getTime()) ? endsAt : undefined,
    timezone: opts.defaultTimezone ?? "UTC",
    cityName,
    countryCode,
    venueName,
    venueAddress,
    latitude: hasBothCoords ? item.latitude : undefined,
    longitude: hasBothCoords ? item.longitude : undefined,
    isOnline,
    websiteUrl: detailUrl,
    imageUrl,
    isFree: typeof item.price === "number" ? item.price === 0 : undefined,
    priceFrom: typeof item.price === "number" ? item.price : undefined,
    currency: item.currency,
    organizerName: item.organizerName ?? source.name,
    organizerUrl: item.organizerUrl,
    source: "microdata",
    sourceId,
    sourceUrl: detailUrl,
    rawData: item.raw,
  };
}

/** Resolve a possibly-relative URL against a base. Returns undefined on bad input. */
function resolveUrl(value: string | undefined, base: string): string | undefined {
  if (!value) return undefined;
  try {
    return new URL(value, base).toString();
  } catch {
    return undefined;
  }
}
