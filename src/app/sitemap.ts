import type { MetadataRoute } from "next";
import { unstable_cache } from "next/cache";
import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { cities, events } from "@/lib/db/schema";
import { SITE_URL } from "@/lib/metadata";
import { ALL_CATEGORY_LANDINGS, CATEGORY_LANDING } from "@/lib/categories";
import { MIN_LANDING_EVENTS } from "@/lib/geo";
import { getLandingCities, getLandingCountries } from "@/lib/landing-data";

// Serve the sitemap from the ISR full-route cache instead of rendering it
// per request. `force-dynamic` made every crawler hit stream a freshly
// serialized ~470 KB body with `Transfer-Encoding: chunked` and no
// `Content-Length`; if generation stalled or the connection reset
// mid-stream, the client received a truncated 200 it couldn't detect as
// incomplete (Search Console: "something went wrong", access log: 200).
// With `revalidate` the body is materialized once, cached, and served with
// a real `Content-Length`, so a short read can't slip through silently.
//
// The build has no DB access — the `db` host only resolves on the compose
// network at runtime, not during `docker build` — so prerendering the full
// sitemap at build would fail. We prerender the static + category entries
// only (see the build-phase guard in `sitemap()`); the first runtime
// revalidation after deploy fills in the DB-backed URLs against the live DB.
export const revalidate = 3600;

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
  const base = [...STATIC_ENTRIES, ...CATEGORY_ENTRIES];

  // No DB during `next build` — return the static base so the build
  // prerenders a valid (if reduced) sitemap; the first runtime
  // revalidation fills in the DB-backed URLs.
  if (process.env.NEXT_PHASE === "phase-production-build") return base;

  const dynamicEntries = await getCachedDynamicEntries();
  return [...base, ...dynamicEntries].map((entry) => ({
    ...entry,
    url: xmlSafeURL(entry.url),
  }));
}

// Defense-in-depth: guarantee every <loc> is valid XML 1.0 text so a
// malformed slug can never produce a body external fetchers reject as
// non-text. `toWellFormed()` rewrites any lone surrogate (the residue of
// invalid UTF-8 in a scraped field) to U+FFFD; `\p{Cc}` strips control
// characters, which are legal UTF-8 but illegal in XML 1.0 and never
// legitimately appear in a URL. Event, city, and country slugs are already
// `[a-z0-9-]` (slugify `strict`), so today this guards future free-text URL
// sources rather than an observed leak. XML escaping of `&`, `<`, etc. is
// handled by Next's sitemap serializer, not here.
function xmlSafeURL(url: string): string {
  return url.toWellFormed().replace(/\p{Cc}/gu, "");
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

// `tags` lets the scrape cron bust this data cache the moment new events
// land (`revalidateTag("sitemap")` in api/cron/scrape), so the sitemap
// reflects fresh ingests immediately instead of on the hourly TTL — and the
// reduced snapshot the DB-less build prerenders is replaced on the first
// scrape after deploy rather than up to an hour later.
const getCachedDynamicEntries = unstable_cache(
  buildDynamicEntries,
  ["sitemap-dynamic-entries"],
  { revalidate: SITEMAP_TTL_SECONDS, tags: ["sitemap"] },
);
