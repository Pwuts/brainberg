import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { asc } from "drizzle-orm";
import { InfiniteEventGrid } from "@/components/events/infinite-event-grid";
import { EventFilters } from "@/components/events/event-filters";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { eventFiltersFromSearchParams, getFilteredEvents } from "@/lib/events";
import { buildMetadata, SITE_URL } from "@/lib/metadata";
import { cityLanding, MIN_LANDING_EVENTS } from "@/lib/geo";
import { findCityInCountry } from "@/lib/landing-data";
import { countryFlag } from "@/lib/utils";
import { db } from "@/lib/db";
import { countries } from "@/lib/db/schema";

// Pages read `searchParams` for filter forwarding, which makes them
// inherently dynamic. Skipping prerender keeps the build DB-free
// (see commit notes); skipping ISR avoids a DYNAMIC_SERVER_USAGE
// error when Next tries to cache a render that reads request state.
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ country: string; city: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { country: countrySlugParam, city: citySlugParam } = await params;
  const resolved = await findCityInCountry(countrySlugParam, citySlugParam);
  if (!resolved) return { title: "City Not Found" };

  const baseline = await getFilteredEvents({
    country: resolved.country.code,
    city: resolved.city.slug,
    limit: MIN_LANDING_EVENTS,
  });

  const meta = cityLanding(
    resolved.city.slug,
    resolved.city.name,
    resolved.country.name,
  );
  return {
    ...buildMetadata({
      title: meta.pageTitle,
      description: meta.metaDescription,
      path: `/events/in/${countrySlugParam}/${citySlugParam}`,
    }),
    // Thin-content guard: if the city has fewer than MIN_LANDING_EVENTS
    // upcoming events, keep the page reachable for users but tell Google
    // not to index it.
    robots: baseline.events.length < MIN_LANDING_EVENTS ? "noindex, follow" : undefined,
  };
}

export default async function CityLandingPage({ params, searchParams }: PageProps) {
  const { country: countrySlugParam, city: citySlugParam } = await params;
  const resolved = await findCityInCountry(countrySlugParam, citySlugParam);
  if (!resolved) notFound();

  const { city, country } = resolved;
  const meta = cityLanding(city.slug, city.name, country.name);
  const sp = await searchParams;

  // Thin-content handling is done in generateMetadata via `noindex`.
  // The page stays reachable for users regardless of event count.
  const [initial, allCountries] = await Promise.all([
    getFilteredEvents({
      ...eventFiltersFromSearchParams(sp),
      country: country.code,
      city: city.slug,
      limit: 30,
    }),
    db
      .select({ code: countries.code, name: countries.name })
      .from(countries)
      .orderBy(asc(countries.name)),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Events", href: "/events" },
          {
            label: `${countryFlag(country.code)} ${country.name}`,
            href: `/events/in/${countrySlugParam}`,
          },
          { label: city.name },
        ]}
      />

      <header className="mb-8 max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {meta.pageTitle}
        </h1>
        <div className="mt-4 space-y-3 text-muted-foreground leading-relaxed">
          {meta.intro.split("\n\n").map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>
      </header>

      <div className="mb-6">
        <Suspense>
          <EventFilters
            countries={allCountries}
            hideLocation
            autoApplyStoredDatePreset={false}
          />
        </Suspense>
      </div>

      <h2 className="mb-4 text-xl font-semibold">Upcoming events in {city.name}</h2>

      <InfiniteEventGrid
        initial={{
          events: initial.events as never,
          nextCursor: initial.nextCursor,
        }}
        baseFilters={{ country: country.code, city: city.slug }}
      />

      <ItemListJsonLD events={initial.events.slice(0, 20).map((r) => r.event.slug)} />
    </div>
  );
}

function ItemListJsonLD({ events }: { events: string[] }) {
  if (events.length === 0) return null;
  const jsonLD = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: events.map((slug, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE_URL}/events/${slug}`,
    })),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLD) }}
    />
  );
}
