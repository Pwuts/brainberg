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

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export const metadata = buildMetadata({
  title: "Browse Events",
  description: "Find and filter tech events across Europe",
  path: "/events",
});

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
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Browse Events</h1>
        <p className="mt-1 text-muted-foreground">
          Find tech events across Europe
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
