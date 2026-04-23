import type { MetadataRoute } from "next";
import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { cities, events } from "@/lib/db/schema";
import { SITE_URL } from "@/lib/metadata";
import { ALL_CATEGORY_LANDINGS, CATEGORY_LANDING } from "@/lib/categories";
import { MIN_LANDING_EVENTS } from "@/lib/geo";
import { getLandingCities, getLandingCountries } from "@/lib/landing-data";

// Re-query at most hourly — crawlers don't hit sitemaps faster than
// that, and new events only need to appear within an hour of approval.
export const revalidate = 3600;

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
  // Build-time calls may not have DB access (and that's fine — the
  // ISR regen after deploy will fill in the dynamic entries on the
  // first crawler hit). On any DB error, return just the static +
  // category entries so the build keeps succeeding.
  try {
    return await buildFullSitemap();
  } catch (err) {
    console.warn(
      "[sitemap] DB unavailable, returning static entries only:",
      err instanceof Error ? err.message : err,
    );
    return [...STATIC_ENTRIES, ...CATEGORY_ENTRIES];
  }
}

async function buildFullSitemap(): Promise<MetadataRoute.Sitemap> {
  const eventRows = await db
    .select({
      slug: events.slug,
      updatedAt: events.updatedAt,
    })
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
    );

  const eventEntries: MetadataRoute.Sitemap = eventRows.map((row) => ({
    url: `${SITE_URL}/events/${row.slug}`,
    lastModified: row.updatedAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const [landingCountries, landingCities] = await Promise.all([
    getLandingCountries(),
    getLandingCities(60),
  ]);

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

  const comboRows = await db
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
    .having(sql`count(*) >= ${MIN_LANDING_EVENTS}`);

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

  return [
    ...STATIC_ENTRIES,
    ...CATEGORY_ENTRIES,
    ...countryEntries,
    ...cityEntries,
    ...comboEntries,
    ...eventEntries,
  ];
}
