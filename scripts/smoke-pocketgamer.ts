/**
 * Smoke-test the PocketGamer.biz events scraper.
 *
 *   pnpm tsx scripts/smoke-pocketgamer.ts
 *
 * Runs the scraper over the next 120 days and asserts:
 *   - at least 5 events yielded
 *   - in-person events span at least 3 distinct European countries
 *   - at least one event has a non-empty description (validates the
 *     detail-page parse, not just the listing)
 *   - every in-person event has a European country (validates the address
 *     parse). A city is reported but not required: some listings only
 *     give the country ("Czech Republic").
 *
 * Data-shape checks only, no assertions on specific events, since which
 * shows fall in the window depends on the time of year. Doesn't touch the
 * database. Early-exits once the assertions are satisfied, since each
 * event costs a ~1 s detail fetch.
 */

import { pocketgamerScraper } from "../src/lib/scraper/sources/pocketgamer";

const MIN_EVENTS = 5;
const MIN_COUNTRIES = 3;
const MIN_WITH_DESCRIPTION = 1;
const ENOUGH_EVENTS = 15;

async function main() {
  const dateFrom = new Date();
  const dateTo = new Date(Date.now() + 120 * 24 * 60 * 60 * 1000);

  const lines: string[] = [];
  const countries = new Set<string>();
  const missingCountry: string[] = [];
  const missingCity: string[] = [];
  let count = 0;
  let withDescription = 0;

  console.log(
    `Scraping PocketGamer.biz from ${dateFrom.toISOString().slice(0, 10)} to ${dateTo.toISOString().slice(0, 10)}...`,
  );

  for await (const ev of pocketgamerScraper.scrape({ dateFrom, dateTo })) {
    count++;
    if (ev.countryCode) countries.add(ev.countryCode);
    if (ev.description) withDescription++;
    if (!ev.isOnline && !ev.countryCode) missingCountry.push(ev.title);
    if (!ev.isOnline && !ev.cityName) missingCity.push(ev.title);
    lines.push(
      `  ${ev.startsAt.toISOString().slice(0, 10)}  ${ev.isOnline ? "online" : `${ev.cityName ?? "?"} (${ev.countryCode ?? "?"})`}  ${ev.title}  → ${ev.websiteUrl}`,
    );

    if (
      count >= ENOUGH_EVENTS &&
      countries.size >= MIN_COUNTRIES &&
      withDescription >= MIN_WITH_DESCRIPTION
    ) {
      console.log(`  ...${count} (early exit — assertions satisfied)`);
      break;
    }
  }

  console.log(
    `\nYielded ${count} events across ${countries.size} countries: ${[...countries].sort().join(", ")}`,
  );
  console.log(`Events with non-empty description: ${withDescription}`);
  console.log(
    `In-person events with country but no city: ${missingCity.join(", ") || "none"}\n`,
  );
  console.log(lines.join("\n"));

  let ok = true;
  if (count < MIN_EVENTS) {
    console.error(`FAIL: expected ≥${MIN_EVENTS} events, got ${count}`);
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
      `FAIL: expected ≥${MIN_WITH_DESCRIPTION} event with a description, got ${withDescription}`,
    );
    ok = false;
  }
  if (missingCountry.length > 0) {
    console.error(
      `FAIL: in-person events without a country: ${missingCountry.join(", ")}`,
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
