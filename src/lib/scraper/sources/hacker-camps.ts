import type { NormalizedEvent, Scraper, ScraperOptions } from "../types";

/**
 * Curated list of European hacker camps, maker events, and community congresses.
 * These events don't appear on mainstream platforms — they're community-organized
 * with their own websites and ticketing. The list is small (~15-20/year) and
 * well-known, so manual curation is more reliable than scraping.
 *
 * To maintain: update this list when dates are announced for each event.
 * Most events announce 6-12 months ahead on their websites and social media.
 *
 * NOTE: Some dates below are estimates based on past years' patterns.
 * Verify against official websites before relying on them.
 */

interface HackerCampEntry {
  title: string;
  description: string;
  startsAt: string; // ISO date
  endsAt: string;
  cityName: string;
  countryCode: string;
  venueName?: string;
  venueAddress?: string;
  websiteUrl: string;
  registrationUrl?: string;
  size?: "small" | "medium" | "large" | "major";
  isFree?: boolean;
  priceFrom?: number;
  priceTo?: number;
  currency?: string;
  tags?: string[];
}

// ============================================================
// 2025–2026 European hacker/maker events
// Update annually when dates are confirmed
// ============================================================

const EVENTS: HackerCampEntry[] = [
  // ── Multi-day hacker camps ──────────────────────────────────
  {
    title: "Electromagnetic Field (EMF) 2026",
    description: "A non-profit camping festival for those with an inquisitive mind or an interest in making things. Held in a field in the English countryside, with talks, workshops, and installations covering everything from security to art, hardware to software, and science to politics.",
    startsAt: "2026-07-16T10:00:00+01:00",
    endsAt: "2026-07-19T16:00:00+01:00",
    cityName: "Eastnor",
    countryCode: "GB",
    venueName: "Eastnor Castle Deer Park",
    websiteUrl: "https://www.emfcamp.org",
    size: "large",
    isFree: false,
    tags: ["hacker camp", "maker", "security", "hardware", "art"],
  },
  {
    title: "BornHack 2026",
    description: "A 7-day outdoor hacker camp taking place on the island of Funen, Denmark. The 11th BornHack — a participatory event where hackers, makers, and people with an interest in technology come together to share knowledge, have fun, and build things.",
    startsAt: "2026-07-15T12:00:00+02:00",
    endsAt: "2026-07-22T12:00:00+02:00",
    cityName: "Funen",
    countryCode: "DK",
    venueName: "Hylkedam",
    websiteUrl: "https://bornhack.dk",
    registrationUrl: "https://bornhack.dk/bornhack-2026/tickets/",
    size: "medium",
    isFree: false,
    tags: ["hacker camp", "open source", "security", "hardware"],
  },
  {
    title: "eth0 2026 autumn",
    description: "A small, friendly hacker camp in the Netherlands. Informal gathering of hackers, makers, and creative technologists in a relaxed outdoor setting.",
    startsAt: "2026-11-06T14:00:00+01:00",
    endsAt: "2026-11-08T14:00:00+01:00",
    cityName: "Someren",
    countryCode: "NL",
    venueName: "De Hoof",
    websiteUrl: "https://eth0.nl",
    registrationUrl: "https://tickets.eth0.nl",
    size: "small",
    isFree: false,
    priceFrom: 65,
    priceTo: 65,
    currency: "EUR",
    tags: ["hacker camp", "maker", "community"],
  },
  {
    title: "GPN24 - Gulaschprogrammiernacht",
    description: "Annual hacker event organized by the Entropia hackerspace (CCC Karlsruhe). Four days of talks, workshops, and hacking at HfG and ZKM Karlsruhe. Motto: 'Gulasch at the Scale of Chaos'.",
    startsAt: "2026-06-04T16:00:00+02:00",
    endsAt: "2026-06-07T16:00:00+02:00",
    cityName: "Karlsruhe",
    countryCode: "DE",
    venueName: "HfG and ZKM",
    venueAddress: "Lorenzstraße 15, 76135 Karlsruhe",
    websiteUrl: "https://entropia.de/GPN24",
    size: "medium",
    isFree: true,
    tags: ["CCC", "hacker", "community", "open source"],
  },

  // ── CCC-affiliated events (from events.ccc.de) ──────────────
  {
    title: "FSCK 2026 – Episode IV",
    description: "Hacking and networking event featuring talks, Hackcenter, and film screening. Organized by CCC affiliates.",
    startsAt: "2026-05-08T16:00:00+02:00",
    endsAt: "2026-05-10T16:00:00+02:00",
    cityName: "Backnang",
    countryCode: "DE",
    venueName: "Kino Universum",
    venueAddress: "Sulzbacher Straße 32, 71522 Backnang",
    websiteUrl: "https://events.ccc.de/en/",
    size: "small",
    isFree: false,
    priceFrom: 56,
    priceTo: 56,
    currency: "EUR",
    tags: ["CCC", "hacker", "community"],
  },
  {
    title: "5th Digital Freedom Days",
    description: "A free conference and hacking event with the motto 'Encrypting Free Spaces'. Talks, workshops, and community building around digital rights and privacy.",
    startsAt: "2026-05-15T10:00:00+02:00",
    endsAt: "2026-05-17T18:00:00+02:00",
    cityName: "Tübingen",
    countryCode: "DE",
    venueName: "Westspitze",
    venueAddress: "Eisenbahnstraße 1, Tübingen",
    websiteUrl: "https://tdf.cttue.de/",
    size: "small",
    isFree: true,
    tags: ["CCC", "digital freedom", "privacy", "encryption"],
  },
  {
    title: "Håck-ma's Castle",
    description: "A hacker camp in an Austrian castle. Multi-day event with talks, workshops, and hacking in a unique setting.",
    startsAt: "2026-08-27T14:00:00+02:00",
    endsAt: "2026-08-30T14:00:00+02:00",
    cityName: "Ottenschlag",
    countryCode: "AT",
    venueName: "Schloss Ottenschlag",
    websiteUrl: "https://hack-mas.at/",
    size: "small",
    tags: ["hacker camp", "castle", "community"],
  },
  {
    title: "InselChaos 2026",
    description: "A small hacker camp on an island in Mecklenburg-Western Pomerania. Informal gathering of the CCC community.",
    startsAt: "2026-09-04T14:00:00+02:00",
    endsAt: "2026-09-06T14:00:00+02:00",
    cityName: "Bergen auf Rügen",
    countryCode: "DE",
    venueName: "La Grange",
    websiteUrl: "https://inselchaos.de/",
    size: "small",
    tags: ["CCC", "hacker camp", "community"],
  },

  // ── Maker events ────────────────────────────────────────────
  {
    title: "Maker Faire Hannover 2026",
    description: "Germany's largest Maker Faire, held at the Hannover Congress Centrum. Hundreds of makers showcasing projects in electronics, 3D printing, robotics, and crafts.",
    startsAt: "2026-08-15T10:00:00+02:00",
    endsAt: "2026-08-16T18:00:00+02:00",
    cityName: "Hannover",
    countryCode: "DE",
    venueName: "Hannover Congress Centrum (HCC)",
    websiteUrl: "https://maker-faire.de/hannover/",
    size: "large",
    isFree: false,
    priceFrom: 15,
    priceTo: 25,
    currency: "EUR",
    tags: ["maker", "maker faire", "DIY", "hardware"],
  },
];

export const hackerCampsScraper: Scraper = {
  name: "manual",

  async *scrape(options?: ScraperOptions): AsyncGenerator<NormalizedEvent> {
    for (const entry of EVENTS) {
      const startsAt = new Date(entry.startsAt);
      const endsAt = new Date(entry.endsAt);

      if (options?.dateFrom && startsAt < options.dateFrom) continue;
      if (options?.dateTo && startsAt > options.dateTo) continue;

      yield {
        title: entry.title,
        description: entry.description,
        shortDescription: entry.description.slice(0, 200) + "…",
        category: "hacker_maker",
        eventType: "conference",
        size: entry.size,
        tags: entry.tags,
        startsAt,
        endsAt,
        timezone: "UTC",
        isMultiDay: true,
        cityName: entry.cityName,
        countryCode: entry.countryCode,
        venueName: entry.venueName,
        venueAddress: entry.venueAddress,
        isOnline: false,
        websiteUrl: entry.websiteUrl,
        registrationUrl: entry.registrationUrl,
        isFree: entry.isFree,
        priceFrom: entry.priceFrom,
        priceTo: entry.priceTo,
        currency: entry.currency,
        source: "manual",
        sourceId: `hacker-camp:${entry.title}`,
        sourceUrl: entry.websiteUrl,
      };
    }
  },
};
