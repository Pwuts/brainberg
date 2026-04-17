import { db } from "@/lib/db";
import { scraperSources } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { isEuropean } from "../european-countries";
import { resolveCategory } from "../category-map";
import { truncate } from "../html-utils";
import type { NormalizedEvent, Scraper, ScraperOptions, EventType } from "../types";

const LUMA_API = "https://api.lu.ma";
const USER_AGENT = "Brainberg/1.0 (https://brainberg.eu)";

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ============================================================
// ProseMirror / Tiptap JSON → Markdown
// ============================================================

interface PmNode {
  type: string;
  content?: PmNode[];
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
}

function pmToMarkdown(node: PmNode): string {
  if (node.type === "text") {
    let text = node.text ?? "";
    if (node.marks) {
      for (const mark of node.marks) {
        switch (mark.type) {
          case "bold":
            text = `**${text}**`;
            break;
          case "italic":
            text = `*${text}*`;
            break;
          case "code":
            text = `\`${text}\``;
            break;
          case "link":
            text = `[${text}](${mark.attrs?.href ?? ""})`;
            break;
        }
      }
    }
    return text;
  }

  const children = (node.content ?? []).map(pmToMarkdown).join("");

  switch (node.type) {
    case "doc":
      return children;
    case "paragraph":
      return children + "\n\n";
    case "heading": {
      const level = (node.attrs?.level as number) ?? 2;
      return "#".repeat(level) + " " + children + "\n\n";
    }
    case "bulletList":
    case "bullet_list":
      return children + "\n";
    case "orderedList":
    case "ordered_list":
      return children + "\n";
    case "listItem":
    case "list_item":
      return "- " + children.trim() + "\n";
    case "blockquote":
      return children
        .split("\n")
        .map((l) => "> " + l)
        .join("\n") + "\n\n";
    case "hardBreak":
    case "hard_break":
      return "\n";
    default:
      return children;
  }
}

// ============================================================
// Luma API types
// ============================================================

interface LumaCalendar {
  api_id: string;
  name: string;
  slug: string;
  geo_city?: string;
  geo_country?: string;
  timezone?: string;
}

interface LumaEvent {
  api_id: string;
  name: string;
  start_at: string;
  end_at: string | null;
  timezone: string;
  url: string; // event slug
  location_type: string;
  cover_url?: string;
  geo_address_info?: { mode?: string; address?: string; city?: string; [key: string]: unknown };
  coordinate?: { latitude: number; longitude: number } | null;
  visibility?: string;
}

interface LumaEntry {
  event: LumaEvent;
  hosts?: { name?: string; username?: string }[];
  ticket_info?: {
    is_free?: boolean;
    price?: { cents?: number; currency?: string };
  };
  tags?: { name?: string }[];
}

interface LumaEventDetail {
  event: LumaEvent & {
    description_mirror?: PmNode;
  };
  ticket_types?: {
    type?: string;
    cents?: number;
    currency?: string;
  }[];
  hosts?: { name?: string; username?: string; bio_short?: string }[];
}

// ============================================================
// API helpers
// ============================================================

async function lumaFetch<T>(path: string): Promise<T | null> {
  const res = await fetch(`${LUMA_API}${path}`, {
    headers: { "User-Agent": USER_AGENT },
  });
  if (!res.ok) {
    console.warn(`[luma] ${path} returned ${res.status}`);
    return null;
  }
  return res.json() as Promise<T>;
}

async function resolveCalendar(slug: string): Promise<LumaCalendar | null> {
  const data = await lumaFetch<{ data?: { calendar?: LumaCalendar } }>(`/url?url=${encodeURIComponent(slug)}`);
  return data?.data?.calendar ?? null;
}

async function listEvents(calendarApiId: string): Promise<LumaEntry[]> {
  const all: LumaEntry[] = [];
  let cursor: string | undefined;

  while (true) {
    const params = new URLSearchParams({
      calendar_api_id: calendarApiId,
      period: "future",
      pagination_limit: "50",
    });
    if (cursor) params.set("pagination_cursor", cursor);

    const data = await lumaFetch<{ entries?: LumaEntry[]; has_more?: boolean; next_cursor?: string }>(
      `/calendar/get-items?${params}`
    );
    if (!data?.entries) break;

    all.push(...data.entries);

    if (!data.has_more) break;
    cursor = data.next_cursor;
    await sleep(500);
  }

  return all;
}

async function getEventDetail(eventApiId: string): Promise<LumaEventDetail | null> {
  return lumaFetch<LumaEventDetail>(`/event/get?event_api_id=${eventApiId}`);
}

// ============================================================
// Location parsing
// ============================================================

/** Map common European timezones to country codes */
const TIMEZONE_TO_COUNTRY: Record<string, string> = {
  "Europe/London": "GB", "Europe/Dublin": "IE",
  "Europe/Berlin": "DE", "Europe/Munich": "DE",
  "Europe/Paris": "FR", "Europe/Amsterdam": "NL",
  "Europe/Brussels": "BE", "Europe/Luxembourg": "LU",
  "Europe/Zurich": "CH", "Europe/Vienna": "AT",
  "Europe/Rome": "IT", "Europe/Madrid": "ES",
  "Europe/Lisbon": "PT", "Europe/Stockholm": "SE",
  "Europe/Oslo": "NO", "Europe/Copenhagen": "DK",
  "Europe/Helsinki": "FI", "Europe/Tallinn": "EE",
  "Europe/Riga": "LV", "Europe/Vilnius": "LT",
  "Europe/Warsaw": "PL", "Europe/Prague": "CZ",
  "Europe/Bratislava": "SK", "Europe/Budapest": "HU",
  "Europe/Bucharest": "RO", "Europe/Sofia": "BG",
  "Europe/Athens": "GR", "Europe/Istanbul": "TR",
  "Europe/Zagreb": "HR", "Europe/Ljubljana": "SI",
  "Europe/Belgrade": "RS", "Europe/Sarajevo": "BA",
  "Europe/Podgorica": "ME", "Europe/Skopje": "MK",
  "Europe/Tirana": "AL", "Europe/Kyiv": "UA",
  "Europe/Chisinau": "MD", "Europe/Reykjavik": "IS",
  "Atlantic/Reykjavik": "IS",
};

function isEuropeanTimezone(tz: string): boolean {
  return tz.startsWith("Europe/") || tz === "Atlantic/Reykjavik";
}

function parseGeoAddress(
  event: LumaEvent,
): { cityName?: string; countryCode?: string } {
  // Try geo_address_info fields
  const gai = event.geo_address_info;
  if (gai) {
    // Some events have a city field directly
    if (typeof gai.city === "string" && gai.city) {
      return { cityName: gai.city };
    }
    // Some have an address string like "London, England"
    if (typeof gai.address === "string" && gai.address) {
      const parts = gai.address.split(",").map((s) => s.trim());
      if (parts.length >= 1) {
        return { cityName: parts[0] };
      }
    }
  }

  // Fallback: derive country from timezone
  const cc = TIMEZONE_TO_COUNTRY[event.timezone];
  if (cc) return { countryCode: cc };

  return {};
}

function resolveEventType(name: string): EventType {
  const lower = name.toLowerCase();
  if (/\bmeetup\b/.test(lower)) return "meetup";
  if (/\bhackathon\b/.test(lower)) return "hackathon";
  if (/\bworkshop\b/.test(lower)) return "workshop";
  if (/\bwebinar\b/.test(lower)) return "webinar";
  if (/\bnetwork(ing)?\b/.test(lower)) return "networking";
  if (/\bdemo.day\b/.test(lower)) return "demo_day";
  if (/\bpanel\b/.test(lower)) return "panel";
  if (/\bconference\b|\bsummit\b|\bforum\b/.test(lower)) return "conference";
  return "meetup"; // Luma events are typically meetup-scale
}

// ============================================================
// Scraper
// ============================================================

export const lumaScraper: Scraper = {
  name: "luma",

  async *scrape(options?: ScraperOptions): AsyncGenerator<NormalizedEvent> {
    // Load configured Luma calendar sources
    const sources = await db
      .select()
      .from(scraperSources)
      .where(eq(scraperSources.sourceType, "luma"));

    const activeSources = sources.filter((s) => s.isActive);

    if (activeSources.length === 0) {
      console.log("[luma] No active Luma sources configured");
      return;
    }

    for (const source of activeSources) {
      console.log(`[luma] Scraping calendar: ${source.name} (${source.url})`);

      try {
        let eventsFound = 0;

        // Resolve calendar API ID (use cached config or fetch)
        const config = source.config as { calendarApiId?: string } | null;
        let calendarApiId = config?.calendarApiId;

        if (!calendarApiId) {
          const calendar = await resolveCalendar(source.url);
          if (!calendar) {
            console.warn(`[luma] Could not resolve calendar: ${source.url}`);
            continue;
          }
          calendarApiId = calendar.api_id;
          // Cache the API ID
          await db
            .update(scraperSources)
            .set({ config: { ...config, calendarApiId } })
            .where(eq(scraperSources.id, source.id));
        }

        await sleep(500);

        // List future events
        const entries = await listEvents(calendarApiId);

        for (const entry of entries) {
          const event = entry.event;

          const startsAt = new Date(event.start_at);
          if (isNaN(startsAt.getTime())) continue;

          // Date filters
          if (options?.dateFrom && startsAt < options.dateFrom) continue;
          if (options?.dateTo && startsAt > options.dateTo) continue;

          // European filter: check timezone first (cheap), then resolved country
          if (!isEuropeanTimezone(event.timezone)) {
            const { countryCode } = parseGeoAddress(event);
            if (!countryCode || !isEuropean(countryCode)) continue;
          }

          await sleep(500);

          // Fetch event detail for description + tickets
          const detail = await getEventDetail(event.api_id);

          const endsAt = event.end_at ? new Date(event.end_at) : undefined;
          const { cityName, countryCode } = parseGeoAddress(event);

          // Description from ProseMirror JSON
          let description: string | undefined;
          if (detail?.event?.description_mirror) {
            description = pmToMarkdown(detail.event.description_mirror).trim();
          }

          // Pricing from ticket types
          let isFree = entry.ticket_info?.is_free;
          let priceFrom: number | undefined;
          let priceTo: number | undefined;
          let currency: string | undefined;
          if (detail?.ticket_types?.length) {
            const prices = detail.ticket_types
              .filter((t) => t.type !== "free" && typeof t.cents === "number" && t.cents > 0)
              .map((t) => t.cents! / 100);
            if (prices.length === 0) {
              isFree = true;
            } else {
              priceFrom = Math.min(...prices);
              priceTo = Math.max(...prices);
              currency = detail.ticket_types.find((t) => t.currency)?.currency ?? "USD";
            }
          }

          // Organizer from hosts
          const host = detail?.hosts?.[0] ?? entry.hosts?.[0];
          const organizerName = host?.name ?? source.name;

          const lumaUrl = `https://lu.ma/${event.url}`;
          const title = event.name;

          const category = resolveCategory(undefined, {}, title);

          eventsFound++;

          yield {
            title,
            description,
            shortDescription: description ? truncate(description, 500) : undefined,
            category,
            eventType: resolveEventType(title),
            tags: entry.tags?.map((t) => t.name).filter(Boolean) as string[] | undefined,
            startsAt,
            endsAt: endsAt && !isNaN(endsAt.getTime()) ? endsAt : undefined,
            timezone: event.timezone,
            isMultiDay: !!(endsAt && endsAt.getTime() - startsAt.getTime() > 24 * 60 * 60 * 1000),
            cityName,
            countryCode: countryCode ?? TIMEZONE_TO_COUNTRY[event.timezone],
            latitude: event.coordinate?.latitude,
            longitude: event.coordinate?.longitude,
            isOnline: event.location_type === "online",
            isHybrid: event.location_type === "hybrid",
            websiteUrl: lumaUrl,
            registrationUrl: lumaUrl,
            lumaUrl,
            imageUrl: event.cover_url,
            isFree,
            priceFrom,
            priceTo,
            currency,
            organizerName,
            organizerUrl: `https://lu.ma/${source.url}`,
            source: "luma",
            sourceId: event.api_id,
            sourceUrl: lumaUrl,
            rawData: { entry, detail },
          };
        }

        // Update source stats
        await db
          .update(scraperSources)
          .set({ lastScrapedAt: new Date(), eventsFound })
          .where(eq(scraperSources.id, source.id));

      } catch (err) {
        console.error(`[luma] Error scraping ${source.url}:`, err);
      }
    }
  },
};
