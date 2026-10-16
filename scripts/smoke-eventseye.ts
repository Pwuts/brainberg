/**
 * Smoke-test the EventsEye scraper.
 *
 *   pnpm tsx scripts/smoke-eventseye.ts
 *
 * Runs the scraper over the next 90 days and asserts:
 *   - at least 10 events yielded
 *   - events span at least 3 distinct European countries
 *   - at least one event has a non-empty description (validates that the
 *     detail-page enrichment path is working, not just the listing parse)
 *   - no title is left in all caps unless it's a lone acronym ("ICC",
 *     "IT-SA"), since EventsEye publishes names in all caps
 *
 * An earlier version asserted on specific recurring shows ("CIRED",
 * "Energy Storage Europe", later broadened to EUROSHOP / ALIMENTARIA /
 * INTERTRAFFIC / etc.). All of those run in spring; the rolling 90-day
 * window goes quiet in summer, so the assertion became calendar-fragile
 * rather than a real signal. Data-shape checks cover the same intent —
 * "is the parser actually surfacing structured data?" — without the
 * dependency on which shows happen to be near today's date.
 *
 * Doesn't touch the database. Slow-ish (~1.5 s/event for the detail-page
 * fetch); the test early-exits once the assertions are satisfied to keep
 * that bounded.
 */

import { eventseyeScraper } from "../src/lib/scraper/sources/eventseye";

const MIN_EVENTS = 10;
const MIN_COUNTRIES = 3;
const MIN_WITH_DESCRIPTION = 1;

interface YieldedEvent {
  title: string;
  cityName?: string;
  countryCode?: string;
  startsAt: Date;
  hasDescription: boolean;
}

async function main() {
  const dateFrom = new Date();
  const dateTo = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

  const events: YieldedEvent[] = [];
  const countries = new Set<string>();
  let withDescription = 0;

  console.log(
    `Scraping EventsEye from ${dateFrom.toISOString().slice(0, 10)} to ${dateTo.toISOString().slice(0, 10)}...`,
  );

  for await (const ev of eventseyeScraper.scrape({ dateFrom, dateTo })) {
    const hasDescription = !!ev.description && ev.description.length > 0;
    events.push({
      title: ev.title,
      cityName: ev.cityName,
      countryCode: ev.countryCode,
      startsAt: ev.startsAt,
      hasDescription,
    });
    if (ev.countryCode) countries.add(ev.countryCode);
    if (hasDescription) withDescription++;

    if (events.length % 10 === 0) {
      process.stderr.write(
        `  ...${events.length} (countries=${countries.size}, w/desc=${withDescription})\n`,
      );
    }

    // Bail as soon as the assertions are satisfied — every extra event costs
    // a ~1.5 s detail fetch on first run.
    if (
      events.length >= MIN_EVENTS &&
      countries.size >= MIN_COUNTRIES &&
      withDescription >= MIN_WITH_DESCRIPTION
    ) {
      console.log(`  ...${events.length} (early exit — assertions satisfied)`);
      break;
    }
  }

  console.log(
    `\nYielded ${events.length} events across ${countries.size} countries: ${[...countries].sort().join(", ")}`,
  );
  console.log(`Events with non-empty description: ${withDescription}`);

  console.log("\nFirst 5 events:");
  for (const e of events.slice(0, 5)) {
    console.log(
      `  ${e.startsAt.toISOString().slice(0, 10)}  ${e.cityName ?? "?"} (${e.countryCode ?? "?"})  ${e.title}`,
    );
  }

  let ok = true;
  if (events.length < MIN_EVENTS) {
    console.error(`FAIL: expected ≥${MIN_EVENTS} events, got ${events.length}`);
    ok = false;
  }
  if (countries.size < MIN_COUNTRIES) {
    console.error(
      `FAIL: expected ≥${MIN_COUNTRIES} distinct countries, got ${countries.size}`,
    );
    ok = false;
  }
  if (withDescription < MIN_WITH_DESCRIPTION) {
    console.error(
      `FAIL: expected ≥${MIN_WITH_DESCRIPTION} event with a non-empty description, got ${withDescription}`,
    );
    ok = false;
  }
  // A lone acronym ("ICC", "IT-SA") may legitimately stay all caps.
  const shouting = events.filter(
    (e) => !/\p{Ll}/u.test(e.title) && /\p{L}{4,}.*\s/u.test(e.title),
  );
  if (shouting.length > 0) {
    console.error(
      `FAIL: ${shouting.length} title(s) still in all caps: ${shouting.map((e) => e.title).join(", ")}`,
    );
    ok = false;
  }

  if (!ok) process.exit(1);
  console.log("\nOK");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
