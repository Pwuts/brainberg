import { db } from "@/lib/db";
import { stagedEvents, events, scraperRuns } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import slugify from "slugify";
import { resolveLocation } from "./city-resolver";
import { checkDuplicate } from "./dedup";
import type { NormalizedEvent, EventSource, ScraperOptions } from "./types";

const SCRAPERS_MAP: Record<string, () => Promise<{ scrape(opts?: ScraperOptions): AsyncGenerator<NormalizedEvent> }>> = {
  confs_tech: () => import("./sources/confstech").then((m) => m.confsTechScraper),
  dev_events: () => import("./sources/devevents").then((m) => m.devEventsScraper),
  meetup: () => import("./sources/meetup").then((m) => m.meetupScraper),
  eventbrite: () => import("./sources/eventbrite").then((m) => m.eventbriteScraper),
};

function makeSlug(title: string, date: Date): string {
  const dateStr = date.toISOString().slice(0, 10);
  return slugify(`${title} ${dateStr}`, { lower: true, strict: true }).slice(0, 350);
}

/** Run a scraper in preview mode — results go to stagedEvents instead of events. */
export async function runScraperPreview(
  source: EventSource,
  options?: ScraperOptions,
): Promise<string> {
  const scraperLoader = SCRAPERS_MAP[source];
  if (!scraperLoader) throw new Error(`Unknown scraper: ${source}`);

  // Create run record
  const [run] = await db
    .insert(scraperRuns)
    .values({ source, status: "running" })
    .returning({ id: scraperRuns.id });

  try {
    const scraper = await scraperLoader();
    const stream = scraper.scrape(options);
    let found = 0;

    for await (const event of stream) {
      found++;
      await stageOneEvent(run.id, event);
    }

    // Generate diffs
    await generateDiffs(run.id);

    await db
      .update(scraperRuns)
      .set({ status: "completed", eventsFound: found, completedAt: new Date() })
      .where(eq(scraperRuns.id, run.id));

    return run.id;
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

async function stageOneEvent(scraperRunId: string, event: NormalizedEvent) {
  const location = await resolveLocation(event.cityName, event.countryCode);

  await db.insert(stagedEvents).values({
    scraperRunId,
    title: event.title,
    slug: makeSlug(event.title, event.startsAt),
    description: event.description,
    shortDescription: event.shortDescription,
    category: event.category,
    eventType: event.eventType,
    size: event.size,
    tags: event.tags,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    timezone: event.timezone ?? location.timezone,
    isMultiDay: event.isMultiDay ?? false,
    cityId: location.cityId,
    countryId: location.countryId,
    venueName: event.venueName,
    venueAddress: event.venueAddress,
    latitude: event.latitude ?? location.latitude,
    longitude: event.longitude ?? location.longitude,
    isOnline: event.isOnline,
    isHybrid: event.isHybrid ?? false,
    onlineUrl: event.onlineUrl,
    websiteUrl: event.websiteUrl,
    registrationUrl: event.registrationUrl,
    lumaUrl: event.lumaUrl,
    eventbriteUrl: event.eventbriteUrl,
    meetupUrl: event.meetupUrl,
    confsTechUrl: event.confsTechUrl,
    devEventsUrl: event.devEventsUrl,
    imageUrl: event.imageUrl,
    thumbnailUrl: event.thumbnailUrl,
    isFree: event.isFree ?? true,
    priceFrom: event.priceFrom,
    priceTo: event.priceTo,
    currency: event.currency ?? "EUR",
    source: event.source,
    sourceId: event.sourceId,
    sourceUrl: event.sourceUrl,
    organizerName: event.organizerName,
    organizerUrl: event.organizerUrl,
    organizerEmail: event.organizerEmail,
    diffStatus: "new", // Will be updated by generateDiffs
  });
}

/** Compare staged events against existing events and populate diffStatus + fieldDiffs. */
async function generateDiffs(scraperRunId: string) {
  const staged = await db
    .select()
    .from(stagedEvents)
    .where(eq(stagedEvents.scraperRunId, scraperRunId));

  for (const se of staged) {
    const dedup = await checkDuplicate({
      title: se.title,
      startsAt: se.startsAt,
      cityName: undefined,
      countryCode: undefined,
      isOnline: se.isOnline,
      source: se.source,
      sourceId: se.sourceId ?? "",
      category: se.category,
      eventType: se.eventType,
      timezone: se.timezone,
      websiteUrl: se.websiteUrl ?? undefined,
      sourceUrl: se.sourceUrl ?? undefined,
    });

    if (!dedup.existingEventId) {
      // New event — already marked as "new"
      continue;
    }

    // Get existing event to compute field diffs
    const [existing] = await db
      .select()
      .from(events)
      .where(eq(events.id, dedup.existingEventId))
      .limit(1);

    if (!existing) continue;

    const diffs: Record<string, { old: unknown; new: unknown }> = {};
    const fields = [
      "title", "description", "shortDescription", "category", "eventType",
      "startsAt", "endsAt", "venueName", "venueAddress", "organizerName",
      "imageUrl", "isFree", "priceFrom", "priceTo",
    ] as const;

    for (const field of fields) {
      const oldVal = existing[field];
      const newVal = se[field];
      if (String(oldVal ?? "") !== String(newVal ?? "") && newVal != null) {
        diffs[field] = { old: oldVal, new: newVal };
      }
    }

    const diffStatus = Object.keys(diffs).length > 0 ? "updated" : "unchanged";

    await db
      .update(stagedEvents)
      .set({
        diffStatus: diffStatus as "updated" | "unchanged",
        matchedEventId: dedup.existingEventId,
        fieldDiffs: Object.keys(diffs).length > 0 ? diffs : null,
      })
      .where(eq(stagedEvents.id, se.id));
  }
}

/** Commit staged events to the events table. */
export async function commitStaged(
  scraperRunId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  eventIds?: string[],
) {
  // TODO: implement actual commit logic — for now, rely on a re-run without preview mode
  // When implemented, use eventIds to filter:
  //   eventIds
  //     ? and(eq(stagedEvents.scraperRunId, scraperRunId), inArray(stagedEvents.id, eventIds))
  //     : eq(stagedEvents.scraperRunId, scraperRunId)
  // The staged events with diffStatus "new" should be inserted,
  // "updated" should patch the matched event

  await db.delete(stagedEvents).where(eq(stagedEvents.scraperRunId, scraperRunId));
}

/** Discard all staged events for a run. */
export async function discardStaged(scraperRunId: string) {
  await db.delete(stagedEvents).where(eq(stagedEvents.scraperRunId, scraperRunId));
}
