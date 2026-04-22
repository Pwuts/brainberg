import type { MetadataRoute } from "next";
import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { SITE_URL } from "@/lib/metadata";

// Re-query at most hourly — crawlers don't hit sitemaps faster than that,
// and new events only need to appear within an hour of approval.
export const revalidate = 3600;

const STATIC_ENTRIES: MetadataRoute.Sitemap = [
  { url: `${SITE_URL}/`,              changeFrequency: "daily",   priority: 1.0 },
  { url: `${SITE_URL}/events`,        changeFrequency: "daily",   priority: 0.9 },
  { url: `${SITE_URL}/map`,           changeFrequency: "weekly",  priority: 0.7 },
  { url: `${SITE_URL}/about`,         changeFrequency: "monthly", priority: 0.5 },
  // { url: `${SITE_URL}/calendar`,      changeFrequency: "monthly", priority: 0.3 },
  // { url: `${SITE_URL}/events/submit`, changeFrequency: "monthly", priority: 0.3 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const eventRows = await db
    .select({
      slug: events.slug,
      updatedAt: events.updatedAt,
    })
    .from(events)
    .where(
      and(
        eq(events.status, "approved"),
        // Keep recently-past events in the index — they still pull traffic
        // for "{Event Name} {year}" queries and carry accumulated link value.
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

  return [...STATIC_ENTRIES, ...eventEntries];
}
