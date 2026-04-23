import Link from "next/link";
import { MapIcon } from "lucide-react";
import { ALL_CATEGORY_LANDINGS } from "@/lib/categories";
import type { CityEventCount } from "@/lib/landing-data";
import { countryFlag } from "@/lib/utils";
import { NearMeSearch } from "./near-me-search";

interface SeoSectionsProps {
  topCities: CityEventCount[];
  countries: { code: string; name: string }[];
}

export function SeoSections({ topCities, countries }: SeoSectionsProps) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 border-t border-border">
      <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr]">
        <WhyBrainberg />
        <div className="space-y-8">
          <NearYou countries={countries} />
          <PopularCategories />
          <TopCities cities={topCities} />
        </div>
      </div>
    </section>
  );
}

function NearYou({ countries }: { countries: { code: string; name: string }[] }) {
  return (
    <div>
      <h2 className="text-2xl font-bold tracking-tight">Events near you</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Enter a city or address, use your current location, or pick a country.
      </p>
      <div className="mt-3">
        <NearMeSearch countries={countries} />
      </div>
    </div>
  );
}

function WhyBrainberg() {
  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold tracking-tight">Why Brainberg</h2>
      <div className="mt-4 space-y-4 text-muted-foreground leading-relaxed">
        <p>
          Finding a meetup or conference worth going to in Europe shouldn&apos;t mean
          checking six different platforms. The European tech-event calendar is
          scattered across mainstream listing sites, community calendars, conference
          indexes, and a long tail of city-specific platforms. None of them gives you a
          single chronological view of what&apos;s actually happening this week, in your
          field, near you.
        </p>
        <p>
          Brainberg aggregates those sources into one European feed. You can browse by{" "}
          <strong>category</strong> (e.g. applying AI, software engineering, data,
          design, entrepreneurship, etc.), by <strong>location</strong> (near you, or in
          a major tech city on the continent), or by a combination of the two. Events
          are re-ingested daily and fingerprint-deduplicated across sources, so the same
          hackathon doesn&apos;t appear three times under slightly different names.
        </p>
        <p>
          The focus is specifically <strong>European events</strong>: meetups,
          conferences, hackathons, workshops, maker events, and hacker camps, across
          every discipline tech people care about, from hands-on engineering through
          product, founder, and leadership tracks. If you organize events, you can
          publish them once on any of our source platforms and they&apos;ll flow into
          Brainberg automatically, or{" "}
          <Link href="/events/submit" className="underline hover:text-foreground">
            submit directly
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

function PopularCategories() {
  return (
    <div>
      <h2 className="text-2xl font-bold tracking-tight">Browse by category</h2>
      <div className="mt-4 flex flex-wrap gap-2">
        {ALL_CATEGORY_LANDINGS.map(([, meta]) => (
          <Link
            key={meta.slug}
            href={`/events/c/${meta.slug}`}
            className="rounded-full border border-border bg-card px-3 py-1.5 text-sm hover:bg-accent"
          >
            {meta.comboLabel}
          </Link>
        ))}
      </div>
    </div>
  );
}

function TopCities({ cities }: { cities: CityEventCount[] }) {
  if (cities.length === 0) return null;
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-2xl font-bold tracking-tight">Browse by city</h2>
        <Link
          href="/map"
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
        >
          <MapIcon className="h-4 w-4" />
          See all on the map
        </Link>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {cities.map((c) => (
          <Link
            key={`${c.countrySlug}-${c.citySlug}`}
            href={`/events/in/${c.countrySlug}/${c.citySlug}`}
            className="rounded-full border border-border bg-card px-3 py-1.5 text-sm hover:bg-accent"
          >
            {countryFlag(c.countryCode)} {c.cityName}{" "}
            <span className="text-muted-foreground">({c.eventCount})</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
