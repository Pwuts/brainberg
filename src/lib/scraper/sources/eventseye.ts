import { parse, HTMLElement } from "node-html-parser";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { eventSources } from "@/lib/db/schema";
import { EVENTSEYE_CATEGORY_MAP, resolveCategory } from "../category-map";
import { toCountryCode } from "../european-countries";
import { htmlToMarkdown, stripHtml, truncate } from "../html-utils";
import type { NormalizedEvent, Scraper, ScraperOptions } from "../types";

const BASE = "https://www.eventseye.com/fairs/";

/**
 * EventsEye industry slugs to crawl, most specific first. The all-Europe
 * listing is ~6,000 trade shows of which only a few percent are tech, so we
 * crawl the per-industry Europe listings instead. See EVENTSEYE_CATEGORY_MAP.
 */
const INDUSTRIES = Object.keys(EVENTSEYE_CATEGORY_MAP);

/** Safety ceiling per industry listing. The largest currently run ~5 pages of 50. */
const MAX_LIST_PAGES = 30;

const LIST_PAGE_DELAY_MS = 1000;
const DETAIL_PAGE_DELAY_MS = 1500;

const DAY_MS = 24 * 60 * 60 * 1000;

const REQUEST_HEADERS = {
  "User-Agent": "Brainberg/1.0 (https://brainberg.eu)",
  "Accept-Language": "en",
};

const MONTH_NAMES: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

interface ParsedRow {
  name: string;
  description: string;
  cycle: string;
  cityName?: string;
  countryName?: string;
  venueName?: string;
  startsAt: Date;
  endsAt?: Date;
  durationDays: number;
  detailHref: string;
  sourceId: string;
  rawDateCell: string;
  rawVenueCell: string;
}

interface DetailInfo {
  description?: string;
  venueAddress?: string;
  organizerName?: string;
}

export const eventseyeScraper: Scraper = {
  name: "eventseye",

  async *scrape(options?: ScraperOptions): AsyncGenerator<NormalizedEvent> {
    // EventsEye keeps finished shows at the head of each listing for months;
    // without a floor we'd ingest (and AI-moderate) hundreds of past events.
    const dateFrom = options?.dateFrom ?? startOfTodayUTC();
    const dateTo = options?.dateTo;

    // Known EventsEye source IDs — gate the per-event detail fetch so we only
    // pay it for events we haven't seen before. Same pattern as eventbrite.ts.
    const knownSourceIds = await loadKnownSourceIds();
    console.log(`[eventseye] Known source IDs: ${knownSourceIds.size}`);

    // Most shows are listed under several industries; yield each once.
    const yielded = new Set<string>();

    for (const [industryIndex, industry] of INDUSTRIES.entries()) {
      options?.onProgress?.(
        Math.round((industryIndex / INDUSTRIES.length) * 100),
        `${industry} (${industryIndex + 1}/${INDUSTRIES.length})`,
      );

      for (let pageIndex = 0; pageIndex < MAX_LIST_PAGES; pageIndex++) {
        const html = await fetchPage(listingUrl(industry, pageIndex));
        if (!html) break;

        const rows = parseListingPage(html);

        for (const row of rows) {
          if (yielded.has(row.sourceId)) continue;
          // Compare the last day, so shows already underway are kept.
          if ((row.endsAt ?? row.startsAt) < dateFrom) continue;
          if (dateTo && row.startsAt > dateTo) continue;

          // EventsEye's "Europe" includes countries outside our countries
          // table (Russia, Belarus, ...); toCountryCode returns undefined.
          const countryCode = row.countryName
            ? toCountryCode(normalizeCountryName(row.countryName))
            : undefined;
          if (row.countryName && !countryCode) continue;

          yielded.add(row.sourceId);

          let detail: DetailInfo = {};
          if (!knownSourceIds.has(row.sourceId)) {
            await sleep(DETAIL_PAGE_DELAY_MS);
            const detailHtml = await fetchPage(detailUrl(row.detailHref));
            if (detailHtml) detail = parseDetailPage(detailHtml);
          }

          yield toNormalizedEvent(row, industry, countryCode, detail);
        }

        // Listings are sorted by start date, so once a page ends past
        // `dateTo` every later page will too.
        const lastRow = rows.at(-1);
        if (dateTo && lastRow && lastRow.startsAt > dateTo) break;
        if (!hasNextPage(html, industry, pageIndex)) break;

        await sleep(LIST_PAGE_DELAY_MS);
      }
    }
  },
};

function toNormalizedEvent(
  row: ParsedRow,
  industry: string,
  countryCode: string | undefined,
  detail: DetailInfo,
): NormalizedEvent {
  const sourceUrl = detailUrl(row.detailHref);
  return {
    title: row.name,
    description: detail.description ?? (row.description || undefined),
    // Listing-page <i> excerpt is a sensible short description even if we
    // didn't enrich from the detail page.
    shortDescription: row.description ? truncate(row.description, 500) : undefined,
    category: resolveCategory(industry, EVENTSEYE_CATEGORY_MAP, row.name),
    eventType: "conference",
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    timezone: "Europe/Brussels",
    isMultiDay: row.durationDays > 1,
    cityName: row.cityName,
    countryCode,
    venueName: row.venueName,
    venueAddress: detail.venueAddress,
    isOnline: false,
    websiteUrl: sourceUrl,
    source: "eventseye",
    sourceId: row.sourceId,
    sourceUrl,
    organizerName: detail.organizerName,
    rawData: {
      name: row.name,
      industry,
      cycle: row.cycle,
      venueCell: row.rawVenueCell,
      dateCell: row.rawDateCell,
      detailHref: row.detailHref,
    },
  };
}

/** Parse all event rows on a listing page. Returns [] if no rows found. */
export function parseListingPage(html: string): ParsedRow[] {
  const root = parse(html);
  const out: ParsedRow[] = [];
  for (const tr of root.querySelectorAll("tbody tr")) {
    const row = parseRow(tr);
    if (row) out.push(row);
  }
  return out;
}

/** Extract one row's worth of data, or null if the row doesn't look like an event. */
function parseRow(tr: HTMLElement): ParsedRow | null {
  const tds = tr.querySelectorAll(":scope > td");
  if (tds.length < 4) return null;

  const [nameTd, cycleTd, venueTd, dateTd] = tds;

  // ── Name + description + detail link
  const nameLink = nameTd.querySelector("a");
  if (!nameLink) return null;
  const detailHref = nameLink.getAttribute("href") ?? "";
  const sourceId = extractIdFromHref(detailHref);
  if (!sourceId) return null;

  const name = decodeNumericEntities(
    nameLink.querySelector("b")?.textContent ?? "",
  ).trim();
  if (!name) return null;
  const description = decodeNumericEntities(
    nameLink.querySelector("i")?.textContent ?? "",
  ).trim();

  // ── Cycle
  const cycle = (cycleTd.textContent ?? "").trim();

  // ── Venue cell: a city page link ("City (Country)") and optionally a venue
  // page link. Matched by href because only the all-Europe listing marks the
  // city link with class="city"; the industry listings don't. Shows whose
  // venue isn't announced yet have no city link, just "? (France)"; skip
  // them until it is, since a trade show without a location isn't useful.
  const cityAnchor = venueTd.querySelector('a[href^="cy1_"]');
  if (!cityAnchor) return null;
  const cityRaw = cityAnchor.textContent.trim();
  const cityMatch = cityRaw.match(/^(.+?)\s*\(([^()]+)\)\s*$/);
  // Drop region qualifiers: "Palma de Mallorca (Balearic Islands) (Spain)".
  const cityName =
    (cityMatch ? cityMatch[1] : cityRaw).replace(/\s*\([^()]*\)$/, "").trim() ||
    undefined;
  const countryName = cityMatch ? cityMatch[2].trim() : undefined;
  const venueName =
    (venueTd.querySelector('a[href^="pl1_"]')?.textContent ?? "").trim() || undefined;

  // ── Date cell: "MM/DD/YYYY<br><i>N day[s]</i>" (most rows) or "Month YYYY"
  // when the day isn't fixed yet.
  const rawDateCell = dateTd.textContent ?? "";
  const startsAt = parseDate(rawDateCell);
  if (!startsAt) return null;

  const durationMatch = rawDateCell.match(/(\d+)\s*day/i);
  const durationDays = durationMatch ? Math.max(1, parseInt(durationMatch[1], 10)) : 1;

  // endsAt is midnight UTC of the last day, the same date-only convention as
  // confs.tech. For a 1-day event we leave it undefined — `isMultiDay` is the
  // meaningful signal there.
  const endsAt =
    durationDays > 1
      ? new Date(startsAt.getTime() + (durationDays - 1) * DAY_MS)
      : undefined;

  return {
    name,
    description,
    cycle,
    cityName,
    countryName,
    venueName,
    startsAt,
    endsAt,
    durationDays,
    detailHref,
    sourceId,
    rawDateCell: rawDateCell.trim(),
    rawVenueCell: (venueTd.textContent ?? "").trim(),
  };
}

/** Parse the per-event detail page. All fields optional — best-effort. */
export function parseDetailPage(html: string): DetailInfo {
  const root = parse(html);
  const info: DetailInfo = {};

  // Description sits in <div class="description"> with an <h2>Description</h2>
  // header — strip the header, keep the rest as markdown.
  const descBlock = root.querySelector("div.description");
  if (descBlock) {
    descBlock.querySelector("h2")?.remove();
    const md = htmlToMarkdown(descBlock.innerHTML).trim();
    if (md) info.description = md;
  }

  // Venue address: <div class="venue"> > <div class="text"> contains lines
  // separated by <br>: name, street, postcode/city, country-link, phone, ...
  const venueText = root.querySelector("div.venue div.text");
  if (venueText) {
    // Drop nested phone/fax/email/web blocks before extracting text.
    venueText
      .querySelectorAll("div.ev-phone, div.ev-fax, a.ev-mail, a.ev-web")
      .forEach((el) => el.remove());
    const lines = stripHtml(venueText.innerHTML)
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    // Skip the first line (venue name, also on the listing page) — keep the
    // rest as the multi-line address.
    if (lines.length > 1) {
      info.venueAddress = lines.slice(1).join(", ");
    }
  }

  // Organizer name: first <a class="orglink"> inside <div class="orgs">.
  const orgLink = root.querySelector("div.orgs a.orglink");
  if (orgLink) {
    const name = orgLink.textContent.trim();
    if (name) info.organizerName = name;
  }

  return info;
}

/** Parse an EventsEye date cell. Handles `MM/DD/YYYY` (precise) and the
 *  vaguer `Month YYYY` form some events use when the day isn't fixed yet. */
function parseDate(s: string): Date | undefined {
  const trimmed = s.trim();
  const numeric = trimmed.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (numeric) {
    const [, mm, dd, yyyy] = numeric;
    const d = new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd)));
    return isNaN(d.getTime()) ? undefined : d;
  }
  const monthYear = trimmed.match(/([A-Za-z]+)\s+(\d{4})/);
  if (monthYear) {
    const month = MONTH_NAMES[monthYear[1].toLowerCase()];
    if (month !== undefined) {
      return new Date(Date.UTC(Number(monthYear[2]), month, 1));
    }
  }
  return undefined;
}

/** Pull a numeric ID out of an EventsEye detail href like `f-foo-12345-1.html`. */
function extractIdFromHref(href: string): string | undefined {
  const m = href.match(/-(\d+)-\d+\.html$/);
  return m ? m[1] : undefined;
}

/** Some titles are double-encoded at the source (`&amp;#268;`), leaving
 *  numeric entities behind after the parser's own decoding pass. */
function decodeNumericEntities(s: string): string {
  return s.replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)));
}

/** EventsEye sometimes prefixes the country with a short code ("UK - United
 *  Kingdom", "USA - United States"); strip it before the country lookup. */
function normalizeCountryName(name: string): string {
  return name.replace(/^[A-Z]{2,4}\s*-\s*/, "").trim();
}

async function loadKnownSourceIds(): Promise<Set<string>> {
  const rows = await db
    .select({ sourceId: eventSources.sourceId })
    .from(eventSources)
    .where(eq(eventSources.source, "eventseye"));
  return new Set(rows.map((r) => r.sourceId));
}

function listingUrl(industry: string, pageIndex: number): string {
  const suffix = pageIndex === 0 ? "" : `_${pageIndex}`;
  return `${BASE}zst1_trade-shows_europe_${industry}${suffix}.html`;
}

/** Listing pages link to the next page; the last page doesn't. */
function hasNextPage(html: string, industry: string, pageIndex: number): boolean {
  return html.includes(`zst1_trade-shows_europe_${industry}_${pageIndex + 1}.html`);
}

function detailUrl(href: string): string {
  return new URL(href, BASE).toString();
}

function startOfTodayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/** Fetch a page and decode the windows-1252 body as a UTF-8 string. */
async function fetchPage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: REQUEST_HEADERS });
    if (!res.ok) {
      console.error(`[eventseye] ${url} → HTTP ${res.status}`);
      return null;
    }
    const buf = await res.arrayBuffer();
    return new TextDecoder("windows-1252").decode(buf);
  } catch (err) {
    console.error(`[eventseye] Fetch error for ${url}:`, err);
    return null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
