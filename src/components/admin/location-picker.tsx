"use client";

import { useState, useRef, useEffect } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { countryFlag } from "@/lib/utils";

export interface PickedLocation {
  venueName?: string;
  venueAddress: string;
  latitude: number;
  longitude: number;
  cityName: string;
  countryCode: string;
}

interface NominatimResult {
  display_name: string;
  name?: string;
  lat: string;
  lon: string;
  type: string;
  address?: {
    amenity?: string;
    tourism?: string;
    shop?: string;
    leisure?: string;
    building?: string;
    house_number?: string;
    road?: string;
    pedestrian?: string;
    neighbourhood?: string;
    suburb?: string;
    postcode?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    state?: string;
    county?: string;
    region?: string;
    country?: string;
    country_code?: string;
  };
}

function extractVenueName(r: NominatimResult): string | undefined {
  const a = r.address;
  return (
    r.name
    ?? a?.amenity
    ?? a?.tourism
    ?? a?.shop
    ?? a?.leisure
    ?? a?.building
  ) || undefined;
}

function extractCity(r: NominatimResult): string | undefined {
  const a = r.address;
  return a?.city ?? a?.town ?? a?.village ?? a?.municipality;
}

/**
 * Build a concise address: "{street} {number}, {city}, {country}".
 * Drops empty components so a city-only result collapses to "{city}, {country}".
 */
function formatAddress(r: NominatimResult): string {
  const a = r.address;
  if (!a) return r.display_name;

  const street = a.road ?? a.pedestrian;
  const streetLine = [street, a.house_number].filter(Boolean).join(" ");
  const city = extractCity(r);

  const parts = [streetLine, city, a.country].filter(Boolean);
  if (parts.length > 0) return parts.join(", ");
  return r.display_name.split(",").slice(0, 2).join(", ").trim();
}

interface Props {
  currentCity: string | null;
  currentCountry: { code: string; name: string } | null;
  currentAddress: string | null;
  onPick: (location: PickedLocation) => void | Promise<void>;
}

export function LocationPicker({ currentCity, currentCountry, currentAddress, onPick }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const search = async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
          new URLSearchParams({
            q,
            format: "json",
            addressdetails: "1",
            limit: "6",
            viewbox: "-25,72,45,34",
            bounded: "1",
          }),
        {
          headers: {
            "User-Agent": "Brainberg/1.0 (https://brainberg.eu)",
            "Accept-Language": "en",
          },
        },
      );
      if (res.ok) {
        const data: NominatimResult[] = await res.json();
        setResults(data.filter((r) => extractCity(r) && r.address?.country_code));
        setOpen(true);
      }
    } finally {
      setSearching(false);
    }
  };

  const handleInput = (v: string) => {
    setQuery(v);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(v), 300);
  };

  const handlePick = async (r: NominatimResult) => {
    setOpen(false);
    const city = extractCity(r);
    const countryCode = r.address?.country_code?.toUpperCase();
    if (!city || !countryCode) return;

    setSaving(true);
    try {
      await onPick({
        venueName: extractVenueName(r),
        venueAddress: formatAddress(r),
        latitude: parseFloat(r.lat),
        longitude: parseFloat(r.lon),
        cityName: city,
        countryCode,
      });
      setQuery("");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div ref={containerRef} className="relative space-y-1">
      <div className="relative">
        <MapPin className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search address, venue, or city..."
          disabled={saving}
          className="h-8 w-[420px] rounded-md border border-input bg-background pl-8 pr-7 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:opacity-60"
        />
        {(searching || saving) && (
          <Loader2 className="absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>
      {currentCity || currentCountry || currentAddress ? (
        <div className="text-xs text-muted-foreground">
          <span className="font-medium">
            {currentCity ?? "—"}
            {currentCountry ? ` ${countryFlag(currentCountry.code)} ${currentCountry.name}` : ""}
          </span>
          <br/>
          {currentAddress ? <span className="mt-20">{currentAddress}</span> : null}
        </div>
      ) : (
        <div className="text-xs text-red-400">No location set</div>
      )}
      {open && results.length > 0 && (
        <div className="absolute left-0 top-full z-50 mt-1 w-[420px] rounded-lg border bg-background shadow-lg">
          {results.map((r, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handlePick(r)}
              className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-accent first:rounded-t-lg last:rounded-b-lg"
            >
              <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
              <div className="flex-1">
                <div className="font-medium">{formatAddress(r)}</div>
                <div className="text-xs text-muted-foreground">{extractCity(r)}, {r.address?.country}</div>
              </div>
              <span className="mt-0.5 text-xs text-muted-foreground">{r.type}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
