import { CONFSTECH_CATEGORY_MAP, resolveCategory } from "../category-map";
import { isEuropean, toCountryCode } from "../european-countries";
import type { NormalizedEvent, Scraper, ScraperOptions } from "../types";

const TOPICS = [
  "android", "css", "data", "devops", "dotnet", "elixir", "general",
  "golang", "graphql", "ios", "java", "javascript", "kotlin", "leadership",
  "networking", "php", "product", "python", "ruby", "rust", "scala",
  "security", "tech-comm", "typescript", "ux",
];

interface ConfsTechEntry {
  name: string;
  url: string;
  startDate: string;
  endDate?: string;
  city?: string;
  country?: string;
  online?: boolean;
  topics?: string[];
}

function currentYear(): number {
  return new Date().getFullYear();
}

export const confsTechScraper: Scraper = {
  name: "confs_tech",

  async *scrape(options?: ScraperOptions): AsyncGenerator<NormalizedEvent> {
    const years = [currentYear(), currentYear() + 1];
    const totalSteps = years.length * TOPICS.length;
    let step = 0;

    for (const year of years) {
      for (const topic of TOPICS) {
        step++;
        options?.onProgress?.(
          Math.round((step / totalSteps) * 100),
          `Fetching ${year}/${topic} (${step}/${totalSteps})`,
        );
        const url = `https://raw.githubusercontent.com/tech-conferences/conference-data/main/conferences/${year}/${topic}.json`;

        let entries: ConfsTechEntry[];
        try {
          const res = await fetch(url);
          if (!res.ok) continue; // File doesn't exist for this year/topic
          entries = await res.json() as ConfsTechEntry[];
        } catch {
          continue;
        }

        for (const entry of entries) {
          // Filter: European countries only
          if (!isEuropean(entry.country)) continue;
          const countryCode = toCountryCode(entry.country!);

          const startsAt = new Date(entry.startDate);
          const endsAt = entry.endDate ? new Date(entry.endDate) : undefined;

          // Apply date range filter if provided
          if (options?.dateFrom && startsAt < options.dateFrom) continue;
          if (options?.dateTo && startsAt > options.dateTo) continue;

          const category = resolveCategory(topic, CONFSTECH_CATEGORY_MAP, entry.name);

          yield {
            title: entry.name,
            category,
            eventType: "conference",
            tags: entry.topics ?? [topic],
            startsAt,
            endsAt,
            timezone: "UTC", // confs.tech doesn't provide timezone, city-resolver will fix
            isMultiDay: !!(endsAt && endsAt.getTime() - startsAt.getTime() > 24 * 60 * 60 * 1000),
            cityName: entry.city,
            countryCode,
            isOnline: entry.online ?? false,
            websiteUrl: entry.url,
            confsTechUrl: entry.url,
            isFree: undefined, // Not available
            source: "confs_tech",
            sourceId: `${entry.name}|${entry.startDate}`,
            sourceUrl: entry.url,
            rawData: entry,
          };
        }
      }
    }
  },
};
