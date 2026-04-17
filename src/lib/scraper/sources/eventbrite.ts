import { EVENTBRITE_CATEGORY_MAP, resolveCategory } from "../category-map";
import { stripHtml, truncate } from "../html-utils";
import type { NormalizedEvent, Scraper, ScraperOptions } from "../types";

const API_BASE = "https://www.eventbriteapi.com/v3";

// Who's On First place IDs for European countries
const EUROPEAN_PLACE_IDS: { code: string; wofId: string }[] = [
  { code: "DE", wofId: "85633111" },  // Germany
  { code: "GB", wofId: "85633159" },  // United Kingdom
  { code: "FR", wofId: "85633147" },  // France
  { code: "NL", wofId: "85633685" },  // Netherlands
  { code: "ES", wofId: "85633129" },  // Spain
  { code: "IT", wofId: "85633253" },  // Italy
  { code: "SE", wofId: "85633789" },  // Sweden
  { code: "AT", wofId: "85632785" },  // Austria
  { code: "CH", wofId: "85633051" },  // Switzerland
  { code: "BE", wofId: "85632997" },  // Belgium
  { code: "IE", wofId: "85633241" },  // Ireland
  { code: "PT", wofId: "85633735" },  // Portugal
  { code: "DK", wofId: "85633121" },  // Denmark
  { code: "FI", wofId: "85633143" },  // Finland
  { code: "NO", wofId: "85633341" },  // Norway
  { code: "PL", wofId: "85633723" },  // Poland
  { code: "CZ", wofId: "85633105" },  // Czechia
];

interface EventbriteResult {
  id: string;
  name: string;
  url: string;
  start_date: string;   // "2026-05-10"
  start_time: string;   // "09:00"
  end_date: string;
  end_time: string;
  timezone: string;
  is_free: boolean;
  is_online_event: boolean;
  summary?: string;
  image?: { url: string };
  primary_venue?: {
    name?: string;
    address?: {
      city?: string;
      country?: string;
      localized_address_display?: string;
      latitude?: string;
      longitude?: string;
    };
  };
  ticket_availability?: {
    minimum_ticket_price?: { major_value: string; currency: string };
    maximum_ticket_price?: { major_value: string; currency: string };
  };
  tags?: { display_name: string; prefix?: string }[];
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export const eventbriteScraper: Scraper = {
  name: "eventbrite",

  async *scrape(options?: ScraperOptions): AsyncGenerator<NormalizedEvent> {
    const token = process.env.EVENTBRITE_API_TOKEN;
    if (!token) {
      console.warn("[eventbrite] EVENTBRITE_API_TOKEN not set, skipping");
      return;
    }

    const totalCountries = EUROPEAN_PLACE_IDS.length;

    for (let ci = 0; ci < totalCountries; ci++) {
      const { code, wofId } = EUROPEAN_PLACE_IDS[ci];

      options?.onProgress?.(
        Math.round((ci / totalCountries) * 100),
        `Searching ${code} (${ci + 1}/${totalCountries})`,
      );

      let continuation: string | undefined;
      let page = 0;

      do {
        page++;

        const body: Record<string, unknown> = {
          event_search: {
            q: "tech",
            places: [wofId],
          },
          "expand.destination_event": [
            "primary_venue", "image", "ticket_availability",
          ],
        };

        if (continuation) {
          (body.event_search as Record<string, unknown>).continuation = continuation;
        }

        let data: { events?: { results?: EventbriteResult[]; pagination?: { continuation?: string; object_count?: number } } };
        try {
          const res = await fetch(`${API_BASE}/destination/search/`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
          });

          if (res.status === 429) {
            console.warn("[eventbrite] Rate limited, waiting 30s...");
            await sleep(30000);
            continue;
          }

          if (!res.ok) {
            console.error(`[eventbrite] API error for ${code}: ${res.status}`);
            break;
          }

          data = await res.json();
        } catch (err) {
          console.error(`[eventbrite] Fetch error for ${code}:`, err);
          break;
        }

        const results = data.events?.results ?? [];

        for (const ev of results) {
          const startsAt = new Date(`${ev.start_date}T${ev.start_time || "00:00"}`);
          if (isNaN(startsAt.getTime())) continue;

          if (options?.dateFrom && startsAt < options.dateFrom) continue;
          if (options?.dateTo && startsAt > options.dateTo) continue;

          const endsAt = ev.end_date
            ? new Date(`${ev.end_date}T${ev.end_time || "23:59"}`)
            : undefined;

          const category = resolveCategory(undefined, EVENTBRITE_CATEGORY_MAP, ev.name);

          const venue = ev.primary_venue;
          const addr = venue?.address;
          const lat = addr?.latitude ? parseFloat(addr.latitude) : undefined;
          const lng = addr?.longitude ? parseFloat(addr.longitude) : undefined;

          const minPrice = ev.ticket_availability?.minimum_ticket_price;
          const maxPrice = ev.ticket_availability?.maximum_ticket_price;

          yield {
            title: ev.name,
            description: ev.summary,
            shortDescription: ev.summary ? truncate(ev.summary, 500) : undefined,
            category,
            eventType: "conference",
            startsAt,
            endsAt: endsAt && !isNaN(endsAt.getTime()) ? endsAt : undefined,
            timezone: ev.timezone || "UTC",
            isMultiDay: !!(endsAt && endsAt.getTime() - startsAt.getTime() > 24 * 60 * 60 * 1000),
            cityName: addr?.city,
            countryCode: addr?.country || code,
            venueName: venue?.name,
            venueAddress: addr?.localized_address_display,
            latitude: lat && !isNaN(lat) ? lat : undefined,
            longitude: lng && !isNaN(lng) ? lng : undefined,
            isOnline: ev.is_online_event || false,
            websiteUrl: ev.url,
            eventbriteUrl: ev.url,
            imageUrl: ev.image?.url,
            isFree: ev.is_free,
            priceFrom: minPrice ? parseFloat(minPrice.major_value) : undefined,
            priceTo: maxPrice ? parseFloat(maxPrice.major_value) : undefined,
            currency: minPrice?.currency ?? maxPrice?.currency,
            source: "eventbrite",
            sourceId: ev.id,
            sourceUrl: ev.url,
            rawData: ev,
          };
        }

        continuation = data.events?.pagination?.continuation ?? undefined;

        // Rate limit between pages
        await sleep(1000);
      } while (continuation && page < 10); // Max 10 pages per country

      // Rate limit between countries
      await sleep(1000);
    }
  },
};
