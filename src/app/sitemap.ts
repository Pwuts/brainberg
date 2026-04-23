import type { MetadataRoute } from "next";
import { unstable_cache } from "next/cache";
import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { cities, events } from "@/lib/db/schema";
import { SITE_URL } from "@/lib/metadata";
import { ALL_CATEGORY_LANDINGS, CATEGORY_LANDING } from "@/lib/categories";
import { MIN_LANDING_EVENTS } from "@/lib/geo";
import { getLandingCities, getLandingCountries } from "@/lib/landing-data";

// Skip build-time prerender — the build has no DB access, so a
// prerendered snapshot would be incomplete and cached for an hour
// before ISR regen. With `force-dynamic` the first crawler hit after
// deploy populates the data cache below against the live DB.
export const dynamic = "force-dynamic";

const SITEMAP_TTL_SECONDS = 3600;

const STATIC_ENTRIES: MetadataRoute.Sitemap = [
  { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1.0 },
  { url: `${SITE_URL}/events`, changeFrequency: "daily", priority: 0.9 },
  { url: `${SITE_URL}/map`, changeFrequency: "weekly", priority: 0.7 },
  { url: `${SITE_URL}/about`, changeFrequency: "monthly", priority: 0.5 },
  // { url: `${SITE_URL}/calendar`,      changeFrequency: "monthly", priority: 0.3 },
  // { url: `${SITE_URL}/events/submit`, changeFrequency: "monthly", priority: 0.3 },
];

const CATEGORY_ENTRIES: MetadataRoute.Sitemap = ALL_CATEGORY_LANDINGS.map(
  ([, meta]) => ({
    url: `${SITE_URL}/events/c/${meta.slug}`,
    changeFrequency: "daily",
    priority: 0.8,
  }),
);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const dynamicEntries = await getCachedDynamicEntries();
  return [...STATIC_ENTRIES, ...CATEGORY_ENTRIES, ...dynamicEntries];
}

async function buildDynamicEntries(): Promise<MetadataRoute.Sitemap> {
  const [eventRows, landingCountries, landingCities, comboRows] = await Promise.all([
    db
      .select({ slug: events.slug, updatedAt: events.updatedAt })
      .from(events)
      .where(
        and(
          eq(events.status, "approved"),
          // Keep recently-past events in the index — they still pull
          // traffic for "{Event Name} {year}" queries and carry
          // accumulated link value.
          gte(
            sql`COALESCE(${events.endsAt}, ${events.startsAt})`,
            sql`now() - interval '7 days'`,
          ),
        ),
      ),
    getLandingCountries(),
    getLandingCities(60),
    db
      .select({ category: events.category, citySlug: cities.slug })
      .from(events)
      .innerJoin(cities, eq(events.cityId, cities.id))
      .where(
        and(
          eq(events.status, "approved"),
          // Include currently running multi-day events.
          sql`COALESCE(${events.endsAt}, ${events.startsAt}) >= now()`,
        ),
      )
      .groupBy(events.category, cities.slug)
      .having(sql`count(*) >= ${MIN_LANDING_EVENTS}`),
  ]);

  const eventEntries: MetadataRoute.Sitemap = eventRows.map((row) => ({
    url: `${SITE_URL}/events/${row.slug}`,
    lastModified: row.updatedAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const countryEntries: MetadataRoute.Sitemap = landingCountries.map((c) => ({
    url: `${SITE_URL}/events/in/${c.slug}`,
    changeFrequency: "daily",
    priority: 0.7,
  }));

  const cityEntries: MetadataRoute.Sitemap = landingCities.map((c) => ({
    url: `${SITE_URL}/events/in/${c.countrySlug}/${c.citySlug}`,
    changeFrequency: "daily",
    priority: 0.7,
  }));

  const comboEntries: MetadataRoute.Sitemap = comboRows.flatMap((r) => {
    const catMeta = r.category !== "other" ? CATEGORY_LANDING[r.category] : null;
    if (!catMeta) return [];
    return [
      {
        url: `${SITE_URL}/events/c/${catMeta.slug}/${r.citySlug}`,
        changeFrequency: "daily" as const,
        priority: 0.7,
      },
    ];
  });

  return [...countryEntries, ...cityEntries, ...comboEntries, ...eventEntries];
}

const getCachedDynamicEntries = unstable_cache(
  buildDynamicEntries,
  ["sitemap-dynamic-entries"],
  { revalidate: SITEMAP_TTL_SECONDS },
);
