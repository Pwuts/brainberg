import { db } from "@/lib/db";
import { scraperRuns } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { confsTechScraper } from "./sources/confstech";
import { devEventsScraper } from "./sources/devevents";
import { meetupScraper } from "./sources/meetup";
import { eventbriteScraper } from "./sources/eventbrite";
import { hackerCampsScraper } from "./sources/hacker-camps";
import { lumaScraper } from "./sources/luma";
import { microdataScraper } from "./sources/microdata";
import { ingestEvents } from "./ingest";
import type { Scraper, ScraperOptions, IngestStats, EventSource } from "./types";

const SCRAPERS: Record<string, Scraper> = {
  confs_tech: confsTechScraper,
  dev_events: devEventsScraper,
  meetup: meetupScraper,
  eventbrite: eventbriteScraper,
  luma: lumaScraper,
  microdata: microdataScraper,
  manual: hackerCampsScraper,
};

/** Run a single scraper through the ingest pipeline, recording a scraperRun. */
export async function runScraper(
  source: EventSource,
  options?: ScraperOptions,
): Promise<{ runId: string; stats: IngestStats }> {
  const scraper = SCRAPERS[source];
  if (!scraper) throw new Error(`Unknown scraper: ${source}`);

  // Create run record
  const [run] = await db
    .insert(scraperRuns)
    .values({ source, status: "running" })
    .returning({ id: scraperRuns.id });

  try {
    // Wire up progress callback to update the run record
    const onProgress = async (percent: number, detail: string) => {
      await db
        .update(scraperRuns)
        .set({ progress: Math.round(percent), progressDetail: detail })
        .where(eq(scraperRuns.id, run.id));
    };

    const stream = scraper.scrape({ ...options, onProgress });
    const stats = await ingestEvents(stream);

    // Update run record
    await db
      .update(scraperRuns)
      .set({
        status: "completed",
        eventsFound: stats.found,
        eventsCreated: stats.created,
        eventsUpdated: stats.updated,
        eventsDeduplicated: stats.deduplicated,
        eventsRejected: stats.rejected,
        eventsPending: stats.pending,
        progress: 100,
        progressDetail: null,
        completedAt: new Date(),
      })
      .where(eq(scraperRuns.id, run.id));

    return { runId: run.id, stats };
  } catch (err) {
    await db
      .update(scraperRuns)
      .set({
        status: "failed",
        errorMessage: err instanceof Error ? err.message : String(err),
        completedAt: new Date(),
      })
      .where(eq(scraperRuns.id, run.id));

    throw err;
  }
}

/** Run all scrapers sequentially. */
export async function runAllScrapers(
  options?: ScraperOptions,
): Promise<Record<string, IngestStats>> {
  const results: Record<string, IngestStats> = {};
  const order: EventSource[] = ["confs_tech", "dev_events", "meetup", "eventbrite", "luma", "microdata", "manual"];

  for (const source of order) {
    try {
      console.log(`[orchestrator] Starting ${source}...`);
      const { stats } = await runScraper(source, options);
      results[source] = stats;
      console.log(`[orchestrator] ${source} done:`, stats);
    } catch (err) {
      console.error(`[orchestrator] ${source} failed:`, err);
      results[source] = { found: 0, created: 0, updated: 0, deduplicated: 0, rejected: 0, pending: 0, errors: 1 };
    }
  }

  return results;
}

export function getAvailableScrapers(): string[] {
  return Object.keys(SCRAPERS);
}
