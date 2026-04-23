/**
 * Database helpers for country/city landing pages and the sitemap.
 * Kept thin — each query is a single JOIN + GROUP BY, returning only
 * the projection the caller needs.
 */

import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { cities, countries, events } from "@/lib/db/schema";
import { countrySlug, MIN_LANDING_EVENTS } from "@/lib/geo";

export interface CountryEventCount {
  code: string;
  name: string;
  slug: string;
  eventCount: number;
}

export interface CityEventCount {
  citySlug: string;
  cityName: string;
  countryCode: string;
  countryName: string;
  countrySlug: string;
  eventCount: number;
}

const approvedUpcoming = and(
  eq(events.status, "approved"),
  // Include currently running multi-day events.
  sql`COALESCE(${events.endsAt}, ${events.startsAt}) >= now()`,
);

/** All countries with at least MIN_LANDING_EVENTS upcoming events. */
export async function getLandingCountries(): Promise<CountryEventCount[]> {
  const rows = await db
    .select({
      code: countries.code,
      name: countries.name,
      count: sql<number>`count(*)::int`.as("count"),
    })
    .from(events)
    .innerJoin(countries, eq(events.countryId, countries.id))
    .where(approvedUpcoming)
    .groupBy(countries.code, countries.name)
    .having(sql`count(*) >= ${MIN_LANDING_EVENTS}`);

  return rows.map((r) => ({
    code: r.code,
    name: r.name,
    slug: countrySlug(r.name),
    eventCount: r.count,
  }));
}

/** Top cities (by upcoming event count) with at least MIN_LANDING_EVENTS. */
export async function getLandingCities(limit = 30): Promise<CityEventCount[]> {
  const rows = await db
    .select({
      citySlug: cities.slug,
      cityName: cities.name,
      countryCode: countries.code,
      countryName: countries.name,
      count: sql<number>`count(*)::int`.as("count"),
    })
    .from(events)
    .innerJoin(cities, eq(events.cityId, cities.id))
    .innerJoin(countries, eq(cities.countryId, countries.id))
    .where(approvedUpcoming)
    .groupBy(cities.slug, cities.name, countries.code, countries.name)
    .having(sql`count(*) >= ${MIN_LANDING_EVENTS}`)
    .orderBy(sql`count(*) desc`)
    .limit(limit);

  return rows.map((r) => ({
    citySlug: r.citySlug,
    cityName: r.cityName,
    countryCode: r.countryCode,
    countryName: r.countryName,
    countrySlug: countrySlug(r.countryName),
    eventCount: r.count,
  }));
}

/** Top cities within a single country, ordered by event count. */
export async function getCitiesInCountry(
  countryCode: string,
  limit = 30,
): Promise<CityEventCount[]> {
  const rows = await db
    .select({
      citySlug: cities.slug,
      cityName: cities.name,
      countryCode: countries.code,
      countryName: countries.name,
      count: sql<number>`count(*)::int`.as("count"),
    })
    .from(events)
    .innerJoin(cities, eq(events.cityId, cities.id))
    .innerJoin(countries, eq(cities.countryId, countries.id))
    .where(and(approvedUpcoming, eq(countries.code, countryCode)))
    .groupBy(cities.slug, cities.name, countries.code, countries.name)
    .orderBy(sql`count(*) desc`)
    .limit(limit);

  return rows.map((r) => ({
    citySlug: r.citySlug,
    cityName: r.cityName,
    countryCode: r.countryCode,
    countryName: r.countryName,
    countrySlug: countrySlug(r.countryName),
    eventCount: r.count,
  }));
}

/** Resolve a country slug back to {code, name}, or null if unknown. */
export async function findCountryBySlug(
  slug: string,
): Promise<{ code: string; name: string } | null> {
  const rows = await db
    .select({ code: countries.code, name: countries.name })
    .from(countries);
  for (const r of rows) {
    if (countrySlug(r.name) === slug) return r;
  }
  return null;
}

/** Resolve an ISO-2 country code to {code, name}, or null if unknown. */
export async function findCountryByCode(
  code: string,
): Promise<{ code: string; name: string } | null> {
  const rows = await db
    .select({ code: countries.code, name: countries.name })
    .from(countries)
    .where(eq(countries.code, code.toUpperCase()))
    .limit(1);
  return rows[0] ?? null;
}

/** Resolve a city slug within a country; also returns the country. */
export async function findCityInCountry(
  countrySlugParam: string,
  citySlugParam: string,
): Promise<{
  city: { slug: string; name: string };
  country: { code: string; name: string };
} | null> {
  const country = await findCountryBySlug(countrySlugParam);
  if (!country) return null;

  const rows = await db
    .select({ slug: cities.slug, name: cities.name })
    .from(cities)
    .innerJoin(countries, eq(cities.countryId, countries.id))
    .where(and(eq(countries.code, country.code), eq(cities.slug, citySlugParam)))
    .limit(1);

  const city = rows[0];
  if (!city) return null;
  return { city, country };
}
