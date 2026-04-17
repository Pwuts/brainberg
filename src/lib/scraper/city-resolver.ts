import { db } from "@/lib/db";
import { cities, countries } from "@/lib/db/schema";
import slugify from "slugify";

interface CityRecord {
  id: number;
  name: string;
  slug: string;
  countryId: number;
  latitude: number;
  longitude: number;
  timezone: string;
}

interface CountryRecord {
  id: number;
  code: string;
  name: string;
  timezone: string;
}

// In-memory caches, loaded once per process
let cityCache: Map<string, CityRecord> | null = null;
let countryCache: Map<string, CountryRecord> | null = null;

// Common city name aliases
const CITY_ALIASES: Record<string, string> = {
  wien: "vienna",
  münchen: "munich",
  muenchen: "munich",
  köln: "cologne",
  koeln: "cologne",
  "den haag": "the hague",
  "s-gravenhage": "the hague",
  lissabon: "lisbon",
  lisboa: "lisbon",
  prag: "prague",
  praha: "prague",
  mailand: "milan",
  milano: "milan",
  rom: "rome",
  roma: "rome",
  kopenhagen: "copenhagen",
  københavn: "copenhagen",
  warschau: "warsaw",
  warszawa: "warsaw",
  brüssel: "brussels",
  bruxelles: "brussels",
  antwerpen: "antwerp",
  zürich: "zurich",
  genf: "geneva",
  genève: "geneva",
};

function normalize(name: string): string {
  return name.toLowerCase().trim();
}

async function ensureCaches() {
  if (cityCache && countryCache) return;

  const [allCities, allCountries] = await Promise.all([
    db.select().from(cities),
    db.select().from(countries),
  ]);

  countryCache = new Map();
  for (const c of allCountries) {
    countryCache.set(c.code.toLowerCase(), c);
    countryCache.set(normalize(c.name), c);
  }

  cityCache = new Map();
  for (const c of allCities) {
    cityCache.set(normalize(c.name), c);
    cityCache.set(c.slug, c);
  }
}

export interface ResolvedLocation {
  cityId: number | null;
  countryId: number | null;
  latitude: number | null;
  longitude: number | null;
  timezone: string;
}

// Nominatim rate limit: 1 req/sec
let lastGeocode = 0;

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

/** Geocode a city via OpenStreetMap Nominatim. Returns null if not found. */
async function geocodeCity(
  cityName: string,
  countryCode?: string,
): Promise<{ latitude: number; longitude: number } | null> {
  // Rate limit: 1 req/sec
  const now = Date.now();
  const wait = Math.max(0, 1100 - (now - lastGeocode));
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastGeocode = Date.now();

  const params = new URLSearchParams({
    q: cityName,
    format: "json",
    limit: "1",
    featuretype: "city",
  });
  if (countryCode) params.set("countrycodes", countryCode.toLowerCase());

  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: { "User-Agent": "Brainberg/1.0 (https://brainberg.eu)" },
    });
    if (!res.ok) return null;
    const results: NominatimResult[] = await res.json();
    if (results.length === 0) return null;
    return {
      latitude: parseFloat(results[0].lat),
      longitude: parseFloat(results[0].lon),
    };
  } catch {
    return null;
  }
}

/** Resolve city name + country code to IDs. Geocodes and inserts unknown cities. */
export async function resolveLocation(
  cityName?: string,
  countryCode?: string,
): Promise<ResolvedLocation> {
  await ensureCaches();

  let country: CountryRecord | undefined;
  if (countryCode) {
    country = countryCache!.get(countryCode.toLowerCase());
  }

  let city: CityRecord | undefined;
  if (cityName) {
    const key = normalize(cityName);
    city = cityCache!.get(key) ?? cityCache!.get(CITY_ALIASES[key] ?? "");
  }

  // If city not found, geocode and insert it
  if (!city && cityName) {
    const geo = await geocodeCity(cityName, countryCode);
    if (geo) {
      const countryId = country?.id ?? null;
      const timezone = country?.timezone ?? "Europe/London";
      const slug = slugify(cityName, { lower: true, strict: true });

      try {
        const [inserted] = await db
          .insert(cities)
          .values({
            name: cityName,
            slug,
            countryId: countryId!,
            latitude: geo.latitude,
            longitude: geo.longitude,
            timezone,
            isPopular: false,
            eventCount: 0,
          })
          .onConflictDoNothing()
          .returning();

        if (inserted) {
          city = {
            id: inserted.id,
            name: inserted.name,
            slug: inserted.slug,
            countryId: inserted.countryId,
            latitude: inserted.latitude,
            longitude: inserted.longitude,
            timezone: inserted.timezone,
          };
          // Add to cache
          cityCache!.set(normalize(cityName), city);
          cityCache!.set(slug, city);
          console.log(`[city-resolver] Geocoded and inserted: ${cityName} (${geo.latitude}, ${geo.longitude})`);
        }
      } catch (err) {
        console.warn(`[city-resolver] Failed to insert ${cityName}:`, err);
      }
    } else {
      console.warn(`[city-resolver] Could not geocode: ${cityName} (${countryCode ?? "no country"})`);
    }
  }

  // If we found a city, use its country if no country was provided
  if (city && !country) {
    for (const c of countryCache!.values()) {
      if (c.id === city.countryId) {
        country = c;
        break;
      }
    }
  }

  return {
    cityId: city?.id ?? null,
    countryId: country?.id ?? city?.countryId ?? null,
    latitude: city?.latitude ?? null,
    longitude: city?.longitude ?? null,
    timezone: city?.timezone ?? country?.timezone ?? "Europe/London",
  };
}

/** Clear the caches (useful in tests or after seeding). */
export function clearLocationCache() {
  cityCache = null;
  countryCache = null;
}
