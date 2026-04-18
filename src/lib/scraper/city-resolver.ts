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
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    country_code?: string;
  };
}

interface GeocodeResult {
  latitude: number;
  longitude: number;
  /** Canonical English city name as returned by Nominatim (Accept-Language: en). */
  canonicalCity?: string;
}

async function nominatimSearch(
  query: string,
  options?: { countryCode?: string; featuretype?: string; addressDetails?: boolean },
): Promise<GeocodeResult | null> {
  // Rate limit: 1 req/sec
  const now = Date.now();
  const wait = Math.max(0, 1100 - (now - lastGeocode));
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastGeocode = Date.now();

  const params = new URLSearchParams({
    q: query,
    format: "json",
    limit: "1",
  });
  if (options?.featuretype) params.set("featuretype", options.featuretype);
  if (options?.countryCode) params.set("countrycodes", options.countryCode.toLowerCase());
  if (options?.addressDetails) params.set("addressdetails", "1");

  try {
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
    const addr = r.address;
    return {
      latitude: parseFloat(r.lat),
      longitude: parseFloat(r.lon),
      canonicalCity: addr?.city ?? addr?.town ?? addr?.village ?? addr?.municipality,
    };
  } catch {
    return null;
  }
}

/** Haversine distance in km. */
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

/** Find an existing cached city within `maxKm` of the given coordinates. */
function findCityNearby(
  latitude: number,
  longitude: number,
  countryId: number,
  maxKm = 3,
): CityRecord | undefined {
  if (!cityCache) return undefined;
  let best: { city: CityRecord; km: number } | null = null;
  for (const c of cityCache.values()) {
    if (c.countryId !== countryId) continue;
    const km = distanceKm(latitude, longitude, c.latitude, c.longitude);
    if (km <= maxKm && (!best || km < best.km)) {
      best = { city: c, km };
    }
  }
  return best?.city;
}

/** Geocode a specific address. Returns null if not found. */
export async function geocodeAddress(
  address: string,
  cityName?: string,
  countryCode?: string,
): Promise<{ latitude: number; longitude: number } | null> {
  const query = [address, cityName].filter(Boolean).join(", ");
  return nominatimSearch(query, { countryCode });
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

  // If city not found, geocode and resolve to a canonical English name
  if (!city && cityName) {
    if (!country) {
      // Country not in our DB — likely non-European, skip
      return { cityId: null, countryId: null, latitude: null, longitude: null, timezone: "UTC" };
    }
    const geo = await nominatimSearch(cityName, {
      countryCode,
      featuretype: "city",
      addressDetails: true,
    });
    if (geo) {
      // Prefer the canonical English name from Nominatim over the
      // source-supplied name (e.g. "Keulen"/"Köln" → "Cologne").
      const canonicalName = geo.canonicalCity ?? cityName;
      const canonicalKey = normalize(canonicalName);

      // Retry cache lookup with the canonical name
      city = cityCache!.get(canonicalKey) ?? cityCache!.get(CITY_ALIASES[canonicalKey] ?? "");

      // Fall back to coordinate-based match to catch subtle name variations
      // (postal-code prefixes, sub-districts, alternative spellings)
      if (!city) {
        city = findCityNearby(geo.latitude, geo.longitude, country.id);
        if (city) {
          console.log(
            `[city-resolver] Matched "${cityName}" → existing "${city.name}" by proximity (${geo.latitude.toFixed(3)}, ${geo.longitude.toFixed(3)})`,
          );
          // Cache the alias so future lookups with the source spelling hit directly
          cityCache!.set(normalize(cityName), city);
          if (canonicalName !== cityName) cityCache!.set(canonicalKey, city);
        }
      }

      // Insert new city under its canonical name if still no match
      if (!city) {
        const countryId = country.id;
        const timezone = country.timezone;
        const slug = slugify(canonicalName, { lower: true, strict: true });

        try {
          const [inserted] = await db
            .insert(cities)
            .values({
              name: canonicalName,
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
            cityCache!.set(canonicalKey, city);
            cityCache!.set(normalize(cityName), city);
            cityCache!.set(slug, city);
            console.log(`[city-resolver] Geocoded and inserted: ${canonicalName} (${geo.latitude}, ${geo.longitude})`);
          }
        } catch (err) {
          console.warn(`[city-resolver] Failed to insert ${canonicalName}:`, err);
        }
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
