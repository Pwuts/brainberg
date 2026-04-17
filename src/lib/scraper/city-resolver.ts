import { db } from "@/lib/db";
import { cities, countries } from "@/lib/db/schema";

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

/** Resolve city name + country code to IDs. Returns null IDs if not found. */
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
