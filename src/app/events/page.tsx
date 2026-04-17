import { Suspense } from "react";
import { db } from "@/lib/db";
import { countries } from "@/lib/db/schema";
import { asc } from "drizzle-orm";
import { getFilteredEvents } from "@/lib/events";

export const dynamic = "force-dynamic";
import { EventCard } from "@/components/events/event-card";
import { EventFilters } from "@/components/events/event-filters";
import { EventSearch } from "@/components/events/event-search";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export const metadata = {
  title: "Browse Events",
  description: "Find and filter tech events across Europe",
};

export default async function BrowseEventsPage({ searchParams }: PageProps) {
  const params = await searchParams;

  // Fetch filter options
  const allCountries = await db
    .select({ code: countries.code, name: countries.name })
    .from(countries)
    .orderBy(asc(countries.name));

  // Apply filters
  const { events: results, nextCursor } = await getFilteredEvents({
    country: params.country,
    city: params.city,
    category: params.category,
    eventType: params.type,
    size: params.size,
    dateFrom: params.from,
    dateTo: params.to,
    isFree: params.free === "1",
    isOnline: params.online === "1",
    search: params.q,
    latitude: params.lat ? parseFloat(params.lat) : undefined,
    longitude: params.lng ? parseFloat(params.lng) : undefined,
    radius: params.radius ? parseInt(params.radius) : undefined,
    cursor: params.cursor,
    limit: 20,
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
      <div className="mb-4 max-w-xl">
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

      {/* Results */}
      <div className="space-y-3">
        {results.map((row) => (
          <EventCard
            key={row.event.id}
            event={row.event}
            city={row.city}
            country={row.country}
          />
        ))}

        {results.length === 0 && (
          <div className="rounded-lg border border-dashed border-border py-16 text-center">
            <p className="text-lg text-muted-foreground">
              No events match your filters.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Try adjusting your filters or{" "}
              <Link
                href="/events"
                className="text-primary hover:underline"
              >
                clear all
              </Link>
              .
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {nextCursor && (
        <div className="mt-8 text-center">
          <Link
            href={`/events?${new URLSearchParams({
              ...Object.fromEntries(
                Object.entries(params).filter(
                  ([, v]) => v !== undefined
                ) as [string, string][]
              ),
              cursor: nextCursor,
            }).toString()}`}
          >
            <Button variant="outline">Load More</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
