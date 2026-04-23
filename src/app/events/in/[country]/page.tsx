import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { asc } from "drizzle-orm";
import { InfiniteEventGrid } from "@/components/events/infinite-event-grid";
import { EventFilters } from "@/components/events/event-filters";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { eventFiltersFromSearchParams, getFilteredEvents } from "@/lib/events";
import { buildMetadata, SITE_URL } from "@/lib/metadata";
import { buildCountryLanding } from "@/lib/geo";
import { findCountryBySlug, getCitiesInCountry } from "@/lib/landing-data";
import { countryFlag } from "@/lib/utils";
import { db } from "@/lib/db";
import { countries } from "@/lib/db/schema";

export const revalidate = 600;

// No prebuild — pages are ISR-generated on first request. The build
// step doesn't need DB access this way, and sitemap + internal
// linking still guide Google to every valid landing URL.
export function generateStaticParams() {
  return [];
}

interface PageProps {
  params: Promise<{ country: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { country: slug } = await params;
  const country = await findCountryBySlug(slug);
  if (!country) return { title: "Country Not Found" };

  const cityRows = await getCitiesInCountry(country.code, 8);
  const topCities = cityRows.map((c) => c.cityName);
  const meta = buildCountryLanding(country, topCities);

  return buildMetadata({
    title: meta.pageTitle,
    description: meta.metaDescription,
    path: `/events/in/${slug}`,
  });
}

export default async function CountryLandingPage({ params, searchParams }: PageProps) {
  const { country: slug } = await params;
  const country = await findCountryBySlug(slug);
  if (!country) notFound();

  const sp = await searchParams;

  const [cityRows, initial, allCountries] = await Promise.all([
    getCitiesInCountry(country.code, 30),
    getFilteredEvents({
      ...eventFiltersFromSearchParams(sp),
      country: country.code, // path-based country always wins
      limit: 30,
    }),
    db
      .select({ code: countries.code, name: countries.name })
      .from(countries)
      .orderBy(asc(countries.name)),
  ]);

  if (cityRows.length === 0) notFound(); // no upcoming events → no landing page

  const topCityNames = cityRows.slice(0, 8).map((c) => c.cityName);
  const meta = buildCountryLanding(country, topCityNames);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Events", href: "/events" },
          { label: `${countryFlag(country.code)} ${country.name}` },
        ]}
      />

      <header className="mb-8 max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {countryFlag(country.code)} {meta.pageTitle}
        </h1>
        <p className="mt-4 text-muted-foreground leading-relaxed">{meta.intro}</p>
      </header>

      {cityRows.length > 1 && (
        <section className="mb-10">
          <h2 className="mb-3 text-xl font-semibold">Cities with upcoming events</h2>
          <div className="flex flex-wrap gap-2">
            {cityRows.map((c) => (
              <Link
                key={c.citySlug}
                href={`/events/in/${slug}/${c.citySlug}`}
                className="rounded-full border border-border bg-card px-3 py-1.5 text-sm hover:bg-accent"
              >
                {c.cityName}{" "}
                <span className="text-muted-foreground">({c.eventCount})</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="mb-6">
        <Suspense>
          <EventFilters
            countries={allCountries}
            hideLocation
            autoApplyStoredDatePreset={false}
          />
        </Suspense>
      </div>

      <h2 className="mb-4 text-xl font-semibold">Upcoming events in {country.name}</h2>

      <InfiniteEventGrid
        initial={{
          events: initial.events as never,
          nextCursor: initial.nextCursor,
        }}
        baseFilters={{ country: country.code }}
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
