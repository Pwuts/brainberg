import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { and, asc, eq, gte, sql } from "drizzle-orm";
import { InfiniteEventGrid } from "@/components/events/infinite-event-grid";
import { EventFilters } from "@/components/events/event-filters";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { eventFiltersFromSearchParams, getFilteredEvents } from "@/lib/events";
import { buildMetadata, SITE_URL } from "@/lib/metadata";
import {
  ALL_CATEGORY_LANDINGS,
  CATEGORY_LANDING,
  categoryFromSlug,
} from "@/lib/categories";
import { cityLanding, MIN_LANDING_EVENTS, countrySlug } from "@/lib/geo";
import { db } from "@/lib/db";
import { cities, countries, events } from "@/lib/db/schema";
import { countryFlag } from "@/lib/utils";

export const revalidate = 600;

/**
 * Return every (category, city) pair that has at least
 * MIN_LANDING_EVENTS upcoming events, so we only prebuild combos that
 * aren't thin-content. Routes not enumerated here will 404.
 */
export async function generateStaticParams() {
  const rows = await db
    .select({
      category: events.category,
      citySlug: cities.slug,
    })
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

  const knownCategorySlugs = new Set(
    ALL_CATEGORY_LANDINGS.map(([, meta]) => meta.slug),
  );

  return rows
    .map((r) => {
      const catMeta = r.category !== "other" ? CATEGORY_LANDING[r.category] : null;
      if (!catMeta) return null;
      if (!knownCategorySlugs.has(catMeta.slug)) return null;
      return { category: catMeta.slug, city: r.citySlug };
    })
    .filter((x): x is { category: string; city: string } => x !== null);
}

interface PageProps {
  params: Promise<{ category: string; city: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}

async function resolveCombo(
  categoryParam: string,
  cityParam: string,
): Promise<{
  category: Exclude<(typeof events.category.enumValues)[number], "other">;
  categoryMeta: (typeof CATEGORY_LANDING)[keyof typeof CATEGORY_LANDING];
  city: { slug: string; name: string };
  country: { code: string; name: string };
} | null> {
  const category = categoryFromSlug(categoryParam);
  if (!category) return null;

  const rows = await db
    .select({
      citySlug: cities.slug,
      cityName: cities.name,
      countryCode: countries.code,
      countryName: countries.name,
    })
    .from(cities)
    .innerJoin(countries, eq(cities.countryId, countries.id))
    .where(eq(cities.slug, cityParam))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  return {
    category,
    categoryMeta: CATEGORY_LANDING[category],
    city: { slug: row.citySlug, name: row.cityName },
    country: { code: row.countryCode, name: row.countryName },
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { category: categoryParam, city: cityParam } = await params;
  const resolved = await resolveCombo(categoryParam, cityParam);
  if (!resolved) return { title: "Page Not Found" };

  const { category, categoryMeta, city, country } = resolved;
  const title = `${categoryMeta.comboLabel} Events in ${city.name}`;
  const description = `Upcoming ${categoryMeta.comboLabel} events in ${city.name}, ${country.name}. Meetups, conferences, and workshops aggregated in one place.`;

  const baseline = await getFilteredEvents({
    category,
    city: city.slug,
    limit: MIN_LANDING_EVENTS,
  });

  return {
    ...buildMetadata({
      title,
      description,
      path: `/events/c/${categoryParam}/${cityParam}`,
    }),
    robots: baseline.events.length < MIN_LANDING_EVENTS ? "noindex, follow" : undefined,
  };
}

export default async function CategoryCityLandingPage({
  params,
  searchParams,
}: PageProps) {
  const { category: categoryParam, city: cityParam } = await params;
  const resolved = await resolveCombo(categoryParam, cityParam);
  if (!resolved) notFound();

  const { category, categoryMeta, city, country } = resolved;
  const sp = await searchParams;

  // Thin-content handling is done in generateMetadata via `noindex`.
  // The page stays reachable for users regardless of event count.
  const [initial, allCountries] = await Promise.all([
    getFilteredEvents({
      ...eventFiltersFromSearchParams(sp),
      category,
      city: city.slug,
      limit: 30,
    }),
    db
      .select({ code: countries.code, name: countries.name })
      .from(countries)
      .orderBy(asc(countries.name)),
  ]);

  const categoryShort = categoryMeta.comboLabel;
  const pageTitle = `${categoryShort} Events in ${city.name}`;
  const cityIntro = cityLanding(city.slug, city.name, country.name);

  // Compose the intro from two independent hand-written sources:
  // - the first paragraph of the category intro (what this category is)
  // - the first paragraph of the city intro (what this city is)
  // Joined with a combo-specific sentence. Google sees enough unique
  // variation across the two axes that each combo page is distinct
  // without us hand-writing N*M intros.
  const categoryParagraph = categoryMeta.intro.split("\n\n")[0];
  const cityParagraph = cityIntro.intro.split("\n\n")[0];
  const comboSentence = `This page narrows the ${city.name} calendar to ${categoryShort} events. It's a subset of ${country.name}'s wider tech-event schedule, useful when you want something specific to go to in the city this month.`;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Events", href: "/events" },
          { label: categoryShort, href: `/events/c/${categoryParam}` },
          {
            label: `${countryFlag(country.code)} ${country.name}`,
            href: `/events/in/${countrySlug(country.name)}`,
          },
          { label: city.name },
        ]}
      />

      <header className="mb-8 max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{pageTitle}</h1>
        <div className="mt-4 space-y-3 text-muted-foreground leading-relaxed">
          <p>{categoryParagraph}</p>
          <p>{comboSentence}</p>
          <p>{cityParagraph}</p>
        </div>
      </header>

      <div className="mb-6">
        <Suspense>
          <EventFilters
            countries={allCountries}
            hideCategory
            hideLocation
            autoApplyStoredDatePreset={false}
          />
        </Suspense>
      </div>

      <h2 className="mb-4 text-xl font-semibold">
        Upcoming {categoryShort} events in {city.name}
      </h2>

      <InfiniteEventGrid
        initial={{
          events: initial.events as never,
          nextCursor: initial.nextCursor,
        }}
        baseFilters={{ category, city: city.slug }}
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
