import { EVENTBRITE_CATEGORY_MAP, resolveCategory } from "../category-map";
import { stripHtml, truncate } from "../html-utils";
import type { NormalizedEvent, Scraper, ScraperOptions } from "../types";

const API_BASE = "https://www.eventbriteapi.com/v3";

interface EventbriteEvent {
  id: string;
  name: { text: string; html?: string };
  description?: { text: string; html?: string };
  summary?: string;
  url: string;
  start: { utc: string; timezone: string };
  end: { utc: string; timezone: string };
  is_free: boolean;
  is_online_event: boolean;
  online_event?: boolean;
  category_id?: string;
  subcategory_id?: string;
  logo?: { url: string };
  venue?: {
    name?: string;
    address?: {
      city?: string;
      country?: string;
      localized_address_display?: string;
    };
    latitude?: string;
    longitude?: string;
  };
  organizer?: {
    name?: string;
    url?: string;
  };
  ticket_availability?: {
    minimum_ticket_price?: { major_value: string; currency: string };
    maximum_ticket_price?: { major_value: string; currency: string };
  };
}

interface SearchResponse {
  events: EventbriteEvent[];
  pagination: {
    has_more_items: boolean;
    continuation?: string;
  };
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

    let continuation: string | undefined;
    let page = 0;

    do {
      page++;
      const params = new URLSearchParams({
        categories: "101", // Science & Technology
        "location.address": "Europe",
        expand: "venue,organizer,ticket_availability",
      });

      if (options?.dateFrom) {
        params.set("start_date.range_start", options.dateFrom.toISOString().replace("Z", ""));
      }
      if (options?.dateTo) {
        params.set("start_date.range_end", options.dateTo.toISOString().replace("Z", ""));
      }
      if (continuation) {
        params.set("continuation", continuation);
      }

      const url = `${API_BASE}/events/search/?${params.toString()}`;

      let data: SearchResponse;
      try {
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.status === 429) {
          // Rate limited — back off and retry
          console.warn("[eventbrite] Rate limited, waiting 30s...");
          await sleep(30000);
          continue;
        }

        if (!res.ok) {
          console.error(`[eventbrite] API error: ${res.status}`);
          break;
        }

        data = (await res.json()) as SearchResponse;
      } catch (err) {
        console.error("[eventbrite] Fetch error:", err);
        break;
      }

      for (const ev of data.events) {
        const startsAt = new Date(ev.start.utc);
        if (isNaN(startsAt.getTime())) continue;

        if (options?.dateFrom && startsAt < options.dateFrom) continue;
        if (options?.dateTo && startsAt > options.dateTo) continue;

        const endsAt = ev.end?.utc ? new Date(ev.end.utc) : undefined;

        const description = ev.description?.html
          ? stripHtml(ev.description.html)
          : ev.description?.text ?? ev.summary;

        const category = resolveCategory(
          ev.category_id ?? undefined,
          EVENTBRITE_CATEGORY_MAP,
          ev.name.text,
        );

        const isOnline = ev.is_online_event || ev.online_event || false;
        const lat = ev.venue?.latitude ? parseFloat(ev.venue.latitude) : undefined;
        const lng = ev.venue?.longitude ? parseFloat(ev.venue.longitude) : undefined;

        const minPrice = ev.ticket_availability?.minimum_ticket_price;
        const maxPrice = ev.ticket_availability?.maximum_ticket_price;

        yield {
          title: ev.name.text,
          description,
          shortDescription: description ? truncate(description, 500) : undefined,
          category,
          eventType: "conference", // Eventbrite doesn't cleanly distinguish
          startsAt,
          endsAt: endsAt && !isNaN(endsAt.getTime()) ? endsAt : undefined,
          timezone: ev.start.timezone,
          isMultiDay: !!(endsAt && endsAt.getTime() - startsAt.getTime() > 24 * 60 * 60 * 1000),
          cityName: ev.venue?.address?.city,
          countryCode: ev.venue?.address?.country,
          venueName: ev.venue?.name,
          venueAddress: ev.venue?.address?.localized_address_display,
          latitude: lat && !isNaN(lat) ? lat : undefined,
          longitude: lng && !isNaN(lng) ? lng : undefined,
          isOnline,
          websiteUrl: ev.url,
          eventbriteUrl: ev.url,
          imageUrl: ev.logo?.url,
          isFree: ev.is_free,
          priceFrom: minPrice ? parseFloat(minPrice.major_value) : undefined,
          priceTo: maxPrice ? parseFloat(maxPrice.major_value) : undefined,
          currency: minPrice?.currency ?? maxPrice?.currency,
          organizerName: ev.organizer?.name,
          organizerUrl: ev.organizer?.url,
          source: "eventbrite",
          sourceId: ev.id,
          sourceUrl: ev.url,
          rawData: ev,
        };
      }

      continuation = data.pagination.has_more_items
        ? data.pagination.continuation
        : undefined;

      // Rate limit between pages
      await sleep(1000);
    } while (continuation && page < 20); // Safety cap
  },
};
