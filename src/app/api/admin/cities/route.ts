import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cities, countries, events } from "@/lib/db/schema";
import { and, asc, eq, sql } from "drizzle-orm";
import slugify from "slugify";
import { isAdminAuthorized } from "@/lib/admin";
import { clearLocationCache } from "@/lib/scraper/city-resolver";

export async function GET(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const eventCountSql = sql<number>`(
      SELECT COUNT(*)::int FROM ${events}
      WHERE ${events.cityId} = ${cities.id}
        AND ${events.status} = 'approved'
    )`;
    const totalCountSql = sql<number>`(
      SELECT COUNT(*)::int FROM ${events}
      WHERE ${events.cityId} = ${cities.id}
    )`;

    const [cityRows, countryRows] = await Promise.all([
      db
        .select({
          id: cities.id,
          name: cities.name,
          slug: cities.slug,
          countryId: cities.countryId,
          countryCode: countries.code,
          countryName: countries.name,
          latitude: cities.latitude,
          longitude: cities.longitude,
          timezone: cities.timezone,
          isPopular: cities.isPopular,
          approvedEventCount: eventCountSql,
          totalEventCount: totalCountSql,
        })
        .from(cities)
        .innerJoin(countries, eq(cities.countryId, countries.id))
        .orderBy(asc(countries.name), asc(cities.name)),
      db
        .select({
          id: countries.id,
          code: countries.code,
          name: countries.name,
        })
        .from(countries)
        .orderBy(asc(countries.name)),
    ]);

    return NextResponse.json({ cities: cityRows, countries: countryRows });
  } catch (error) {
    console.error("List cities error:", error);
    return NextResponse.json({ error: "Failed to list cities" }, { status: 500 });
  }
}

interface NominatimResult {
  lat: string;
  lon: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
  };
}

let lastGeocode = 0;

async function geocodeCity(
  name: string,
  countryCode: string,
): Promise<{ latitude: number; longitude: number; canonicalName: string } | null> {
  const wait = Math.max(0, 1100 - (Date.now() - lastGeocode));
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastGeocode = Date.now();

  const params = new URLSearchParams({
    q: name,
    format: "json",
    limit: "1",
    featuretype: "city",
    addressdetails: "1",
    countrycodes: countryCode.toLowerCase(),
  });

  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: {
      "User-Agent": "Brainberg/1.0 (https://brainberg.eu)",
      "Accept-Language": "en",
    },
  });
  if (!res.ok) return null;
  const results: NominatimResult[] = await res.json();
  if (results.length === 0) return null;
  const r = results[0];
  const canonicalName =
    r.address?.city ?? r.address?.town ?? r.address?.village ?? r.address?.municipality ?? name;
  return {
    latitude: parseFloat(r.lat),
    longitude: parseFloat(r.lon),
    canonicalName,
  };
}

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export async function POST(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const rawName = typeof body.name === "string" ? body.name.trim() : "";
    const rawCountryCode =
      typeof body.countryCode === "string" ? body.countryCode.trim().toUpperCase() : "";

    if (!rawName) {
      return NextResponse.json({ error: "City name is required" }, { status: 400 });
    }
    if (!/^[A-Z]{2}$/.test(rawCountryCode)) {
      return NextResponse.json(
        { error: "Country code must be a 2-letter ISO code" },
        { status: 400 },
      );
    }

    const [country] = await db
      .select()
      .from(countries)
      .where(eq(countries.code, rawCountryCode))
      .limit(1);

    if (!country) {
      return NextResponse.json(
        { error: `Country ${rawCountryCode} is not in the database (non-European?)` },
        { status: 400 },
      );
    }

    // Check for existing city with the same name in this country
    const [existingByName] = await db
      .select({ id: cities.id, name: cities.name })
      .from(cities)
      .where(
        and(
          eq(cities.countryId, country.id),
          sql`lower(${cities.name}) = lower(${rawName})`,
        ),
      )
      .limit(1);

    if (existingByName) {
      return NextResponse.json(
        { error: `"${existingByName.name}" is already tracked in ${country.name}` },
        { status: 409 },
      );
    }

    const geo = await geocodeCity(rawName, rawCountryCode);
    if (!geo) {
      return NextResponse.json(
        { error: `Could not geocode "${rawName}" in ${country.name}` },
        { status: 404 },
      );
    }

    // Canonical-name dedup (e.g. user typed "Köln", geocoder says "Cologne")
    const [existingByCanonical] = await db
      .select({ id: cities.id, name: cities.name })
      .from(cities)
      .where(
        and(
          eq(cities.countryId, country.id),
          sql`lower(${cities.name}) = lower(${geo.canonicalName})`,
        ),
      )
      .limit(1);

    if (existingByCanonical) {
      return NextResponse.json(
        {
          error: `"${rawName}" resolves to "${existingByCanonical.name}", which is already tracked`,
        },
        { status: 409 },
      );
    }

    // Proximity dedup (within 3 km of an existing city in the same country)
    const sameCountryCities = await db
      .select({
        id: cities.id,
        name: cities.name,
        latitude: cities.latitude,
        longitude: cities.longitude,
      })
      .from(cities)
      .where(eq(cities.countryId, country.id));

    const nearby = sameCountryCities.find(
      (c) => distanceKm(c.latitude, c.longitude, geo.latitude, geo.longitude) <= 3,
    );
    if (nearby) {
      return NextResponse.json(
        {
          error: `"${geo.canonicalName}" is within 3 km of existing city "${nearby.name}"`,
        },
        { status: 409 },
      );
    }

    const slug = slugify(geo.canonicalName, { lower: true, strict: true });

    const [inserted] = await db
      .insert(cities)
      .values({
        name: geo.canonicalName,
        slug,
        countryId: country.id,
        latitude: geo.latitude,
        longitude: geo.longitude,
        timezone: country.timezone,
        isPopular: false,
        eventCount: 0,
      })
      .returning();

    clearLocationCache();

    return NextResponse.json({ city: inserted }, { status: 201 });
  } catch (error) {
    console.error("Create city error:", error);
    return NextResponse.json({ error: "Failed to create city" }, { status: 500 });
  }
}
