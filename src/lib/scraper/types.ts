import type { eventCategoryEnum, eventTypeEnum, eventSizeEnum, eventSourceEnum } from "@/lib/db/schema";

export type EventCategory = (typeof eventCategoryEnum.enumValues)[number];
export type EventType = (typeof eventTypeEnum.enumValues)[number];
export type EventSize = (typeof eventSizeEnum.enumValues)[number];
export type EventSource = (typeof eventSourceEnum.enumValues)[number];

/** Normalized event shape yielded by all scrapers. Uses raw strings for
 *  city/country — the ingest pipeline resolves these to IDs. */
export interface NormalizedEvent {
  title: string;
  description?: string;
  shortDescription?: string;
  category: EventCategory;
  eventType: EventType;
  size?: EventSize;
  tags?: string[];

  startsAt: Date;
  endsAt?: Date;
  timezone: string;
  isMultiDay?: boolean;

  // Location — raw strings, resolved by city-resolver
  cityName?: string;
  countryCode?: string; // ISO 2-letter
  venueName?: string;
  venueAddress?: string;
  latitude?: number;
  longitude?: number;
  isOnline: boolean;
  isHybrid?: boolean;
  onlineUrl?: string;

  // URLs
  websiteUrl?: string;
  registrationUrl?: string;
  lumaUrl?: string;
  eventbriteUrl?: string;
  meetupUrl?: string;
  confsTechUrl?: string;
  devEventsUrl?: string;
  imageUrl?: string;
  thumbnailUrl?: string;

  // Pricing
  isFree?: boolean;
  priceFrom?: number;
  priceTo?: number;
  currency?: string;

  // Source tracking
  source: EventSource;
  sourceId: string;
  sourceUrl?: string;

  // Organizer
  organizerName?: string;
  organizerUrl?: string;
  organizerEmail?: string;

  // Raw payload for debugging (stored in eventSources.rawData)
  rawData?: unknown;
}

export interface ScraperOptions {
  dateFrom?: Date;
  dateTo?: Date;
}

export interface Scraper {
  name: EventSource;
  scrape(options?: ScraperOptions): AsyncGenerator<NormalizedEvent>;
}

export interface IngestStats {
  found: number;
  created: number;
  updated: number;
  deduplicated: number;
  errors: number;
}
