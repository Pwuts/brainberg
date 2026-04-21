/**
 * Cross-check every city's stored (latitude, longitude) against Nominatim.
 * Flags cities more than WARN_KM / FAIL_KM away from OSM's city node, plus
 * cities that Nominatim can't find at all. Read-only — prints UPDATE SQL
 * hints for fixes you choose to apply.
 *
 * Usage: DATABASE_URL="..." pnpm tsx scripts/check-city-coords.ts
 */

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { asc, eq } from "drizzle-orm";
import { cities, countries } from "../src/lib/db/schema";

const WARN_KM = 3;
const FAIL_KM = 10;
const NOMINATIM_RATE_LIMIT_MS = 1100;

const CITY_ADDRESS_TYPES = new Set([
  "city",
  "town",
  "village",
  "municipality",
  "hamlet",
]);

interface NominatimMatch {
  latitude: number;
  longitude: number;
  canonicalName: string;
  addresstype: string;
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

let lastFetch = 0;

async function nominatimLookup(
  city: string,
  countryCode: string,
): Promise<NominatimMatch | null> {
  const wait = Math.max(0, NOMINATIM_RATE_LIMIT_MS - (Date.now() - lastFetch));
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastFetch = Date.now();

  const params = new URLSearchParams({
    q: city,
    format: "json",
    addressdetails: "1",
    limit: "5",
    countrycodes: countryCode.toLowerCase(),
  });

  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: {
      "User-Agent": "Brainberg/1.0 (https://brainberg.eu)",
      "Accept-Language": "en",
    },
  });
  if (!res.ok) return null;

  const data: Array<{
    lat: string;
    lon: string;
    name?: string;
    addresstype?: string;
    address?: {
      city?: string;
      town?: string;
      village?: string;
      municipality?: string;
    };
  }> = await res.json();

  const match = data.find(
    (r) => r.addresstype && CITY_ADDRESS_TYPES.has(r.addresstype),
  );
  if (!match) return null;

  const canonicalName =
    match.address?.city ??
    match.address?.town ??
    match.address?.village ??
    match.address?.municipality ??
    match.name ??
    city;

  return {
    latitude: parseFloat(match.lat),
    longitude: parseFloat(match.lon),
    canonicalName,
    addresstype: match.addresstype!,
  };
}

interface Issue {
  id: number;
  name: string;
  countryName: string;
  countryCode: string;
  stored: { lat: number; lon: number };
  nominatim: { lat: number; lon: number };
  distanceKm: number;
  canonicalName: string;
  addresstype: string;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }
  const client = postgres(process.env.DATABASE_URL);
  const db = drizzle(client);

  const rows = await db
    .select({
      id: cities.id,
      name: cities.name,
      latitude: cities.latitude,
      longitude: cities.longitude,
      countryCode: countries.code,
      countryName: countries.name,
    })
    .from(cities)
    .innerJoin(countries, eq(cities.countryId, countries.id))
    .orderBy(asc(countries.name), asc(cities.name));

  console.log(
    `Checking ${rows.length} cities against Nominatim (${NOMINATIM_RATE_LIMIT_MS}ms/req, ~${Math.ceil((rows.length * NOMINATIM_RATE_LIMIT_MS) / 1000 / 60)}min)\n`,
  );

  const issues: Issue[] = [];
  const missing: { id: number; name: string; countryCode: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const idx = `[${i + 1}/${rows.length}]`.padEnd(10);
    const result = await nominatimLookup(r.name, r.countryCode);

    if (!result) {
      missing.push({ id: r.id, name: r.name, countryCode: r.countryCode });
      console.log(`${idx} ${r.name}, ${r.countryCode} — NOT FOUND`);
      continue;
    }

    const km = distanceKm(r.latitude, r.longitude, result.latitude, result.longitude);
    const flag = km >= FAIL_KM ? " ✗✗" : km >= WARN_KM ? " ✗" : "";
    const canonNote =
      result.canonicalName.toLowerCase() !== r.name.toLowerCase()
        ? ` (OSM: "${result.canonicalName}")`
        : "";
    console.log(
      `${idx} ${r.name}, ${r.countryCode}: ${km.toFixed(2)} km${flag}${canonNote}`,
    );

    if (km >= FAIL_KM) {
      issues.push({
        id: r.id,
        name: r.name,
        countryName: r.countryName,
        countryCode: r.countryCode,
        stored: { lat: r.latitude, lon: r.longitude },
        nominatim: { lat: result.latitude, lon: result.longitude },
        distanceKm: km,
        canonicalName: result.canonicalName,
        addresstype: result.addresstype,
      });
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log(`Summary`);
  console.log("=".repeat(60));
  console.log(`Total cities checked:     ${rows.length}`);
  console.log(`More than ${FAIL_KM} km off:        ${issues.length}`);
  console.log(`Not found on Nominatim:   ${missing.length}`);

  if (issues.length > 0) {
    issues.sort((a, b) => b.distanceKm - a.distanceKm);
    console.log(`\nFar-off cities (sorted by distance):\n`);
    for (const iss of issues) {
      console.log(
        `  #${iss.id} ${iss.name}, ${iss.countryName} — ${iss.distanceKm.toFixed(1)} km off`,
      );
      console.log(
        `    stored:    (${iss.stored.lat.toFixed(4)}, ${iss.stored.lon.toFixed(4)})`,
      );
      console.log(
        `    OSM (${iss.addresstype}): (${iss.nominatim.lat.toFixed(4)}, ${iss.nominatim.lon.toFixed(4)}) "${iss.canonicalName}"`,
      );
    }

    console.log(`\nUPDATE SQL (review before applying):\n`);
    for (const iss of issues) {
      console.log(
        `UPDATE cities SET latitude = ${iss.nominatim.lat}, longitude = ${iss.nominatim.lon} WHERE id = ${iss.id}; -- ${iss.name} (${iss.distanceKm.toFixed(1)} km)`,
      );
    }
  }

  if (missing.length > 0) {
    console.log(`\nNot found on Nominatim:\n`);
    for (const m of missing) {
      console.log(`  #${m.id} ${m.name}, ${m.countryCode}`);
    }
  }

  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
