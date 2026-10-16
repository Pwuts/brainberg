import { parse, HTMLElement } from "node-html-parser";
import { toCountryCode } from "../european-countries";
import { htmlToMarkdown, truncate } from "../html-utils";
import type { EventType, NormalizedEvent, Scraper, ScraperOptions } from "../types";

const BASE = "https://www.pocketgamer.biz";
/** All upcoming events (worldwide, ~110) are on this single page. */
const LISTING_URL = `${BASE}/events/`;

const DETAIL_PAGE_DELAY_MS = 1000;

const REQUEST_HEADERS = {
  "User-Agent": "Brainberg/1.0 (https://brainberg.eu)",
  "Accept-Language": "en",
};

const MONTHS: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

/** PocketGamer's event types that aren't plain conferences. Everything else
 *  (conference, summit, expo, tradeshow, festival, showcase, ...) maps to
 *  "conference"; the AI moderator refines it. */
const EVENT_TYPE_MAP: Record<string, EventType> = {
  "job fair": "career",
  networking: "networking",
};

const ONLINE_TYPES = new Set(["online", "hybrid"]);

/** Address parts between city and country to step over: "London, England, United Kingdom". */
const SUBNATIONAL_REGIONS = new Set([
  "england",
  "scotland",
  "wales",
  "northern ireland",
]);

interface ListingCard {
  slug: string;
  title: string;
  dateText: string;
  /** "City, Country", sometimes just "Country"; empty for online events
   *  and for some in-person events whose detail page has the address. */
  location: string;
  eventType: string;
  imageUrl?: string;
}

interface DetailInfo {
  title?: string;
  address?: string;
  region?: string;
  websiteUrl?: string;
  description?: string;
}

export const pocketgamerScraper: Scraper = {
  name: "pocketgamer",

  async *scrape(options?: ScraperOptions): AsyncGenerator<NormalizedEvent> {
    // The listing includes events already underway; compare their last day.
    const dateFrom = options?.dateFrom ?? startOfTodayUTC();
    const dateTo = options?.dateTo;

    const listingHtml = await fetchPage(LISTING_URL);
    if (!listingHtml) return;
    const cards = parseListingPage(listingHtml);
    console.log(`[pocketgamer] ${cards.length} events on the listing`);

    for (const [i, card] of cards.entries()) {
      options?.onProgress?.(
        Math.round((i / cards.length) * 100),
        `${card.title} (${i + 1}/${cards.length})`,
      );

      const dates = parseDateRange(card.dateText);
      if (!dates) {
        console.warn(
          `[pocketgamer] Unparseable date "${card.dateText}" for ${card.slug}`,
        );
        continue;
      }
      if ((dates.endsAt ?? dates.startsAt) < dateFrom) continue;
      if (dateTo && dates.startsAt > dateTo) continue;

      // Skip events the listing already places outside Europe, before paying
      // for the detail fetch. Cards without a location need the detail page.
      const isOnline = ONLINE_TYPES.has(card.eventType);
      const listingPlace = card.location ? parsePlace(card.location) : undefined;
      if (card.location && !listingPlace?.countryCode && !isOnline) continue;

      await sleep(DETAIL_PAGE_DELAY_MS);
      const detailHtml = await fetchPage(eventUrl(card.slug));
      if (!detailHtml) continue;
      const detail = parseDetailPage(detailHtml);

      // In-person events need a European country we can place them in.
      // Online events are in scope when they're open to Europeans; the AI
      // moderator rejects the ones that aren't (or aren't events at all).
      const place = (detail.address && parsePlace(detail.address)) || listingPlace;
      if (!isOnline && !place?.countryCode) continue;

      yield toNormalizedEvent(card, detail, dates, place, isOnline);
    }
  },
};

function toNormalizedEvent(
  card: ListingCard,
  detail: DetailInfo,
  dates: { startsAt: Date; endsAt?: Date },
  place: Place | undefined,
  isOnline: boolean,
): NormalizedEvent {
  const sourceUrl = eventUrl(card.slug);
  const websiteUrl = detail.websiteUrl ?? sourceUrl;
  return {
    title: detail.title ?? card.title,
    description: detail.description,
    shortDescription: detail.description
      ? truncate(detail.description, 500)
      : undefined,
    category: "game_dev",
    eventType: EVENT_TYPE_MAP[card.eventType] ?? "conference",
    startsAt: dates.startsAt,
    endsAt: dates.endsAt,
    timezone: "UTC", // date-only source, same convention as confs.tech
    isMultiDay: !!dates.endsAt,
    cityName: place?.cityName,
    countryCode: place?.countryCode,
    venueAddress: detail.address,
    isOnline,
    isHybrid: card.eventType === "hybrid",
    websiteUrl,
    registrationUrl: websiteUrl,
    imageUrl: card.imageUrl,
    source: "pocketgamer",
    sourceId: card.slug,
    sourceUrl,
    rawData: { card, region: detail.region },
  };
}

/** Parse the event cards on the listing page. */
export function parseListingPage(html: string): ListingCard[] {
  const root = parse(html);
  const cards: ListingCard[] = [];
  for (const article of root.querySelectorAll("article[data-eventtype]")) {
    const card = parseCard(article);
    if (card) cards.push(card);
  }
  return cards;
}

function parseCard(article: HTMLElement): ListingCard | null {
  const link = article.querySelector('a[href^="/events/"]');
  const slug = link?.getAttribute("href")?.match(/^\/events\/([^/]+)\/?$/)?.[1];
  const title = article.querySelector("h1")?.textContent.trim();
  const dateText = article.querySelector("div.cat")?.textContent.trim();
  if (!slug || !title || !dateText) return null;

  return {
    slug,
    title,
    dateText,
    location: (article.querySelector("div.strap")?.textContent ?? "").trim(),
    eventType: (article.getAttribute("data-eventtype") ?? "").trim().toLowerCase(),
    imageUrl: article.querySelector("img")?.getAttribute("src") || undefined,
  };
}

/** Parse an event detail page. All fields optional — best-effort. */
export function parseDetailPage(html: string): DetailInfo {
  const root = parse(html);
  const info: DetailInfo = {};

  const title = root.querySelector("h1")?.textContent.trim();
  if (title) info.title = title;

  // "World Trade Center Rotterdam, Beursplein 37, Rotterdam, Netherlands, 3011 AM"
  const address = root.querySelector("div.info-piece.address")?.textContent.trim();
  if (address) info.address = address.replace(/\s*,\s*/g, ", ");

  const website = root.querySelector("a.info-piece.more-link")?.getAttribute("href");
  if (website && /^https?:\/\//.test(website)) info.websiteUrl = website;

  // <ul class="deets-top"><li><span>Region:</span> Europe</li>...
  for (const li of root.querySelectorAll("ul.deets-top li")) {
    const label = li.querySelector("span")?.textContent.trim();
    if (label === "Region:") {
      info.region = li.textContent.replace(label, "").trim();
    }
  }

  const body = root.querySelector("div.deets-main");
  if (body) {
    const md = htmlToMarkdown(body.innerHTML).trim();
    if (md) info.description = md;
  }

  return info;
}

/**
 * Parse the listing's date formats: "Oct 8, 2026", "Oct 4-11, 2026" and
 * "Oct 29-Nov 1, 2026". The year belongs to the end date, so a range like
 * "Dec 30-Jan 2, 2027" starts the year before. Dates are midnight UTC.
 */
export function parseDateRange(
  text: string,
): { startsAt: Date; endsAt?: Date } | undefined {
  const m = text.match(
    /^([A-Za-z]{3})[a-z]*\s+(\d{1,2})(?:\s*-\s*(?:([A-Za-z]{3})[a-z]*\s+)?(\d{1,2}))?,\s*(\d{4})$/,
  );
  if (!m) return undefined;
  const [, startMonthName, startDay, endMonthName, endDay, yearText] = m;

  const startMonth = MONTHS[startMonthName.toLowerCase()];
  const endMonth = endMonthName ? MONTHS[endMonthName.toLowerCase()] : startMonth;
  if (startMonth === undefined || endMonth === undefined) return undefined;

  const endYear = Number(yearText);
  const startYear = startMonth > endMonth ? endYear - 1 : endYear;
  const startsAt = new Date(Date.UTC(startYear, startMonth, Number(startDay)));
  const endsAt = endDay
    ? new Date(Date.UTC(endYear, endMonth, Number(endDay)))
    : undefined;

  return { startsAt, endsAt: endsAt && endsAt > startsAt ? endsAt : undefined };
}

interface Place {
  cityName?: string;
  countryCode?: string;
}

/**
 * Find the country and city in a comma-separated address or location:
 * the last part that names a European country, and the part before it
 * with any postcode stripped ("60-734 Poznań, Poland" → Poznań, PL).
 */
function parsePlace(text: string): Place | undefined {
  const parts = text
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  for (let i = parts.length - 1; i >= 0; i--) {
    // Skip postcodes ("3011 AM") so they aren't read as country codes.
    if (/\d/.test(parts[i])) continue;
    const countryCode = toCountryCode(parts[i]);
    if (!countryCode) continue;
    let cityIndex = i - 1;
    while (cityIndex >= 0 && SUBNATIONAL_REGIONS.has(parts[cityIndex].toLowerCase()))
      cityIndex--;
    const city = cityIndex >= 0 ? stripPostcode(parts[cityIndex]) : undefined;
    return { countryCode, cityName: city || undefined };
  }
  return undefined;
}

function stripPostcode(part: string): string {
  // Drop tokens containing digits ("60-734", "4814", "W1") but keep names.
  return part
    .split(/\s+/)
    .filter((token) => !/\d/.test(token))
    .join(" ")
    .trim();
}

function eventUrl(slug: string): string {
  return `${BASE}/events/${slug}/`;
}

function startOfTodayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

async function fetchPage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: REQUEST_HEADERS });
    if (!res.ok) {
      console.error(`[pocketgamer] ${url} → HTTP ${res.status}`);
      return null;
    }
    return await res.text();
  } catch (err) {
    console.error(`[pocketgamer] Fetch error for ${url}:`, err);
    return null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
