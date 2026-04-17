import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import slugify from "slugify";
import { SEED_COUNTRIES, SEED_CITIES } from "./seed-data";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const client = postgres(connectionString, { max: 1 });
const db = drizzle(client);

async function seedIfEmpty() {
  const [{ count }] = await client`SELECT COUNT(*)::int AS count FROM countries`;
  if (count > 0) return;

  console.log("Seeding countries and cities...");

  // Insert countries
  for (const c of SEED_COUNTRIES) {
    await client`
      INSERT INTO countries (code, name, timezone, is_eu, region)
      VALUES (${c.code}, ${c.name}, ${c.timezone}, ${c.isEu}, ${c.region})
      ON CONFLICT (code) DO NOTHING
    `;
  }

  // Build country code → id map
  const countryRows = await client`SELECT id, code FROM countries`;
  const countryMap = new Map(countryRows.map((r) => [r.code, r.id as number]));

  // Insert cities
  for (const c of SEED_CITIES) {
    const countryId = countryMap.get(c.countryCode);
    if (!countryId) continue;
    const slug = slugify(c.name, { lower: true, strict: true });
    await client`
      INSERT INTO cities (name, slug, country_id, latitude, longitude, timezone, is_popular, event_count)
      VALUES (${c.name}, ${slug}, ${countryId}, ${c.lat}, ${c.lng}, ${c.tz}, ${c.popular}, 0)
      ON CONFLICT (slug) DO NOTHING
    `;
  }

  console.log(`Seeded ${SEED_COUNTRIES.length} countries and ${SEED_CITIES.length} cities.`);
}

async function cleanupStaleRuns() {
  const result = await client`
    UPDATE scraper_runs
    SET status = 'failed', error_message = 'Interrupted by app restart', completed_at = now()
    WHERE status = 'running'
  `;
  if (result.count > 0) {
    console.log(`Cleaned up ${result.count} stale scraper run(s).`);
  }
}

async function main() {
  console.log("Running migrations...");
  await migrate(db, { migrationsFolder: "./migrations" });
  console.log("Migrations complete.");

  await seedIfEmpty();
  await cleanupStaleRuns();

  await client.end();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
