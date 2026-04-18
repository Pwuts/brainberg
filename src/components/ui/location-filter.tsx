"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { MapPin, Navigation, X } from "lucide-react";
import { Dropdown } from "./dropdown";

const RADIUS_OPTIONS = [
  { value: "25", label: "25 km" },
  { value: "50", label: "50 km" },
  { value: "100", label: "100 km" },
  { value: "200", label: "200 km" },
  { value: "500", label: "500 km" },
];

const DEFAULT_RADIUS = "100";

interface Country {
  code: string;
  name: string;
}

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country?: string;
    country_code?: string;
  };
}

type SuggestionItem =
  | { kind: "country"; code: string; name: string }
  | { kind: "place"; name: string; lat: string; lng: string; detail: string };

function placeLabel(result: NominatimResult): string {
  const a = result.address;
  if (!a) return result.display_name.split(",").slice(0, 2).join(", ");
  const city = a.city ?? a.town ?? a.village;
  return [city, a.country].filter(Boolean).join(", ")
    || result.display_name.split(",").slice(0, 2).join(", ");
}

interface LocationFilterProps {
  countries: Country[];
  // Current state from URL params
  country: string;
  locationName: string;
  latitude: string;
  longitude: string;
  radius: string;
  isOnline: boolean;
  onCountry: (code: string) => void;
  onLocation: (loc: { name: string; lat: string; lng: string; radius: string }) => void;
  onOnline: (online: boolean) => void;
  onClear: () => void;
}

export function LocationFilter({
  countries,
  country,
  locationName,
  latitude,
  longitude,
  radius,
  isOnline,
  onCountry,
  onLocation,
  onOnline,
  onClear,
}: LocationFilterProps) {
  const displayValue = isOnline
    ? "Online"
    : locationName || (country ? countries.find((c) => c.code === country)?.name ?? country : "");

  const [input, setInput] = useState(displayValue);
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [geolocating, setGeolocating] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasLocation = !!latitude && !!longitude;
  const hasValue = hasLocation || !!country || isOnline;

  // Sync input when external value changes (e.g. clear button)
  const [prevDisplay, setPrevDisplay] = useState(displayValue);
  if (prevDisplay !== displayValue) {
    setPrevDisplay(displayValue);
    if (input !== displayValue) setInput(displayValue);
  }

  // Build suggestions: matching countries first, then geocoded places
  const search = useCallback(
    async (query: string) => {
      if (query.length < 2) {
        setSuggestions([]);
        setShowDropdown(false);
        return;
      }

      const q = query.toLowerCase();
      const items: SuggestionItem[] = [];

      // Match countries
      const matchedCountries = countries
        .filter((c) => c.name.toLowerCase().includes(q))
        .slice(0, 3);
      for (const c of matchedCountries) {
        items.push({ kind: "country", code: c.code, name: c.name });
      }

      // Geocode for places
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?` +
            new URLSearchParams({
              q: query,
              format: "json",
              addressdetails: "1",
              limit: String(5 - matchedCountries.length),
              viewbox: "-25,72,45,34",
              bounded: "1",
            }),
          { headers: { "User-Agent": "Brainberg/1.0 (https://brainberg.eu)", "Accept-Language": "en" } }
        );
        if (res.ok) {
          const data: NominatimResult[] = await res.json();
          for (const r of data) {
            // Skip if it's a country we already listed
            const cc = r.address?.country_code?.toUpperCase();
            if (r.type === "country" && cc && matchedCountries.some((c) => c.code === cc)) continue;

            items.push({
              kind: "place",
              name: placeLabel(r),
              lat: r.lat,
              lng: r.lon,
              detail: r.type,
            });
          }
        }
      } catch {
        // ignore
      }

      setSuggestions(items);
      setShowDropdown(items.length > 0);
    },
    [countries]
  );

  const handleInput = (value: string) => {
    setInput(value);
    clearTimeout(debounceRef.current);
    if (!value.trim()) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }
    debounceRef.current = setTimeout(() => search(value), 300);
  };

  const selectItem = (item: SuggestionItem) => {
    setShowDropdown(false);
    setSuggestions([]);
    if (item.kind === "country") {
      setInput(item.name);
      onCountry(item.code);
    } else {
      setInput(item.name);
      onLocation({ name: item.name, lat: item.lat, lng: item.lng, radius: radius || DEFAULT_RADIUS });
    }
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    setGeolocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        let name = `${lat.toFixed(2)}, ${lng.toFixed(2)}`;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?` +
              new URLSearchParams({ lat: String(lat), lon: String(lng), format: "json", addressdetails: "1" }),
            { headers: { "User-Agent": "Brainberg/1.0 (https://brainberg.eu)", "Accept-Language": "en" } }
          );
          if (res.ok) {
            const data: NominatimResult = await res.json();
            name = placeLabel(data);
          }
        } catch { /* fallback to coords */ }
        setInput(name);
        setGeolocating(false);
        onLocation({ name, lat: String(lat), lng: String(lng), radius: radius || DEFAULT_RADIUS });
      },
      () => setGeolocating(false),
      { enableHighAccuracy: false, timeout: 10000 }
    );
  };

  const handleClear = () => {
    setInput("");
    setSuggestions([]);
    setShowDropdown(false);
    onClear();
  };

  const toggleOnline = () => {
    if (isOnline) {
      onOnline(false);
    } else {
      onOnline(true);
    }
  };

  // Close on outside click
  useEffect(() => {
    if (!showDropdown) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showDropdown]);

  return (
    <div className="flex items-center gap-1.5">
      <div ref={containerRef} className="relative">
        <div className="flex">
          <div className="relative">
            <MapPin className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={input}
              onChange={(e) => handleInput(e.target.value)}
              onFocus={(e) => {
                if (suggestions.length > 0) setShowDropdown(true);
                // Select all text so user can type over it
                if (hasValue) e.target.select();
              }}
              placeholder="Country, city, or address..."
              className="h-9 w-[220px] rounded-l-md border border-input bg-background pl-8 pr-7 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
            />
            {hasValue && (
              <button
                onClick={handleClear}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          <button
            onClick={useMyLocation}
            disabled={geolocating}
            title="Use my location"
            className="h-9 w-9 shrink-0 border border-l-0 border-input bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground inline-flex items-center justify-center rounded-r-md"
          >
            <Navigation className={`h-3.5 w-3.5 ${geolocating ? "animate-pulse" : ""}`} />
          </button>
        </div>

        {/* Suggestions */}
        {showDropdown && (
          <div className="absolute left-0 top-full z-50 mt-1 w-80 rounded-lg border bg-background shadow-lg">
            {suggestions.map((item, i) => (
              <button
                key={i}
                type="button"
                onClick={() => selectItem(item)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent first:rounded-t-lg last:rounded-b-lg"
              >
                {item.kind === "country" ? (
                  <>
                    <span className="shrink-0 text-xs text-muted-foreground">🏳️</span>
                    <span className="font-medium">{item.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground">country</span>
                  </>
                ) : (
                  <>
                    <MapPin className="h-3 w-3 shrink-0 text-muted-foreground" />
                    <span>{item.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{item.detail}</span>
                  </>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Radius — only when place is selected */}
      {hasLocation && (
        <Dropdown
          value={radius || DEFAULT_RADIUS}
          options={RADIUS_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          placeholder="Radius"
          onChange={(v) =>
            onLocation({ name: locationName, lat: latitude, lng: longitude, radius: v || DEFAULT_RADIUS })
          }
          className="w-22"
        />
      )}

      {/* Online toggle — mutually exclusive with location */}
      <button
        onClick={toggleOnline}
        className={`h-9 shrink-0 rounded-md border px-3 text-sm transition-colors ${
          isOnline
            ? "border-primary bg-primary text-primary-foreground"
            : "border-input bg-background hover:bg-accent"
        }`}
      >
        Online
      </button>
    </div>
  );
}
