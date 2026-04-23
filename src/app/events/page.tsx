import { Suspense } from "react";
import { db } from "@/lib/db";
import { countries } from "@/lib/db/schema";
import { asc } from "drizzle-orm";
import { getFilteredEvents } from "@/lib/events";

export const dynamic = "force-dynamic";
import { EventFilters } from "@/components/events/event-filters";
import { EventSearch } from "@/components/events/event-search";
import { InfiniteEventGrid } from "@/components/events/infinite-event-grid";
import { buildMetadata } from "@/lib/metadata";
import { categoryToSlug } from "@/lib/categories";
import { findCountryByCode } from "@/lib/landing-data";
import { countrySlug } from "@/lib/geo";
import type { Metadata } from "next";
import type { eventCategoryEnum } from "@/lib/db/schema";

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

/**
 * Collapse a filtered /events?… URL onto its canonical landing page
 * when one exists. Any filters beyond category/country/city (search,
 * date, size, free, online) force the canonical back to /events to
 * prevent an unbounded set of canonical targets.
 */
async function canonicalPathForFilters(
  params: Record<string, string | undefined>,
): Promise<string> {
  const nonCanonicalKeys = [
    "q",
    "from",
    "to",
    "size",
    "type",
    "free",
    "online",
    "lat",
    "lng",
    "radius",
    "sort",
    "tzo",
  ];
  if (nonCanonicalKeys.some((k) => params[k])) return "/events";

  const catSlug = params.category
    ? categoryToSlug(params.category as (typeof eventCategoryEnum.enumValues)[number])
    : null;

  if (catSlug && params.city) {
    return `/events/c/${catSlug}/${params.city}`;
  }
  if (params.country && params.city) {
    const country = await findCountryByCode(params.country);
    if (country) return `/events/in/${countrySlug(country.name)}/${params.city}`;
  }
  if (catSlug) {
    return `/events/c/${catSlug}`;
  }
  if (params.country) {
    const country = await findCountryByCode(params.country);
    if (country) return `/events/in/${countrySlug(country.name)}`;
  }
  return "/events";
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = await searchParams;
  const path = await canonicalPathForFilters(params);
  return buildMetadata({
    title: "Browse Events",
    description: "Find and filter tech events across Europe",
    path,
  });
}

export default async function BrowseEventsPage({ searchParams }: PageProps) {
  const params = await searchParams;

  // Fetch filter options
  const allCountries = await db
    .select({ code: countries.code, name: countries.name })
    .from(countries)
    .orderBy(asc(countries.name));

  // Initial page of results (10 rows × 3 cols = 30)
  const initial = await getFilteredEvents({
    country: params.country,
    city: params.city,
    category: params.category,
    eventType: params.type,
    size: params.size,
    dateFrom: params.from,
    dateTo: params.to,
    tzOffsetMinutes: params.tzo ? parseInt(params.tzo, 10) : undefined,
    isFree: params.free === "1",
    isOnline: params.online === "1",
    search: params.q,
    latitude: params.lat ? parseFloat(params.lat) : undefined,
    longitude: params.lng ? parseFloat(params.lng) : undefined,
    radius: params.radius ? parseInt(params.radius) : undefined,
    sort: params.sort,
    limit: 30,
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tight">Browse Events</h1>
        <p className="mt-2 text-muted-foreground leading-relaxed">
          Every upcoming tech event across Europe, in one place. Filter by category,
          location, format (conference, meetup, hackathon, workshop, etc.), size, and
          date.
        </p>
      </div>

      {/* Search */}
      <div className="mb-4">
        <Suspense>
          <EventSearch />
        </Suspense>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <Suspense>
          <EventFilters countries={allCountries} />
        </Suspense>
      </div>

      {/* Results with infinite scroll */}
      <Suspense>
        <InfiniteEventGrid
          initial={{
            events: initial.events as never,
            nextCursor: initial.nextCursor,
          }}
        />
      </Suspense>
    </div>
  );
}
