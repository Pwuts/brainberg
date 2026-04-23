import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { asc } from "drizzle-orm";
import { InfiniteEventGrid } from "@/components/events/infinite-event-grid";
import { EventFilters } from "@/components/events/event-filters";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { eventFiltersFromSearchParams, getFilteredEvents } from "@/lib/events";
import { categoryFromSlug, CATEGORY_LANDING } from "@/lib/categories";
import { buildMetadata, SITE_URL } from "@/lib/metadata";
import { db } from "@/lib/db";
import { countries } from "@/lib/db/schema";

// Pages read `searchParams` for filter forwarding, which makes them
// inherently dynamic. Skipping prerender keeps the build DB-free
// (see commit notes); skipping ISR avoids a DYNAMIC_SERVER_USAGE
// error when Next tries to cache a render that reads request state.
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ category: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { category: slug } = await params;
  const category = categoryFromSlug(slug);
  if (!category) return { title: "Category Not Found" };

  const meta = CATEGORY_LANDING[category];
  return buildMetadata({
    title: meta.pageTitle,
    description: meta.metaDescription,
    path: `/events/c/${meta.slug}`,
  });
}

export default async function CategoryLandingPage({ params, searchParams }: PageProps) {
  const { category: slug } = await params;
  const category = categoryFromSlug(slug);
  if (!category) notFound();

  const meta = CATEGORY_LANDING[category];
  const sp = await searchParams;

  const [initial, allCountries] = await Promise.all([
    getFilteredEvents({
      ...eventFiltersFromSearchParams(sp),
      category, // path-based category always wins over URL param
      limit: 30,
    }),
    db
      .select({ code: countries.code, name: countries.name })
      .from(countries)
      .orderBy(asc(countries.name)),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <ItemListJsonLD events={initial.events.slice(0, 20).map((r) => r.event.slug)} />

      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Events", href: "/events" },
          { label: meta.pageTitle },
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
            hideCategory
            autoApplyStoredDatePreset={false}
          />
        </Suspense>
      </div>

      <h2 className="mb-4 text-xl font-semibold">Upcoming events</h2>

      <InfiniteEventGrid
        initial={{
          events: initial.events as never,
          nextCursor: initial.nextCursor,
        }}
        baseFilters={{ category }}
      />
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
