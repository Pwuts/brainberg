import { revalidatePath, revalidateTag } from "next/cache";

/**
 * Refresh the sitemap after an ingest changes the set of approved events.
 *
 * `revalidateTag` busts the DB-data cache tagged in
 * [`sitemap.ts`](../app/sitemap.ts) (`getCachedDynamicEntries`), so the next
 * render reads fresh event/city/country rows instead of the hour-old cached
 * ones; `revalidatePath` re-renders the route body. Together they make new
 * events appear in the sitemap immediately, and replace the reduced snapshot
 * the DB-less build prerenders on the first scrape after deploy.
 *
 * The `"max"` profile is Next 16's sanctioned replacement for the old
 * single-argument `revalidateTag(tag)` (which now warns as deprecated); it
 * marks the tag revalidated-now so existing entries go stale on next access.
 *
 * Must be called from a request context (route handler / server action) —
 * not from the scraper library, which also runs from CLI scripts with no
 * request scope. Hence it lives here and is invoked by the scraper routes,
 * not by `ingestEvents`.
 */
export function revalidateSitemap(): void {
  revalidateTag("sitemap", "max");
  revalidatePath("/sitemap.xml");
}
