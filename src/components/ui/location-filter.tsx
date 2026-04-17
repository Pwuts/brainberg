"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { MapPin, Navigation, X } from "lucide-react";
import { Select } from "@/components/ui/select";

const RADIUS_OPTIONS = [
  { value: "25", label: "25 km" },
  { value: "50", label: "50 km" },
  { value: "100", label: "100 km" },
  { value: "200", label: "200 km" },
  { value: "500", label: "500 km" },
];

const DEFAULT_RADIUS = "100";

interface LocationFilterProps {
  locationName: string;
  latitude: string;
  longitude: string;
  radius: string;
  onChange: (location: {
    name: string;
    lat: string;
    lng: string;
    radius: string;
  }) => void;
  onClear: () => void;
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
  };
}

function shortName(result: NominatimResult): string {
  const a = result.address;
  if (!a) return result.display_name.split(",").slice(0, 2).join(",");
  const city = a.city ?? a.town ?? a.village;
  const parts = [city, a.country].filter(Boolean);
  return parts.join(", ") || result.display_name.split(",").slice(0, 2).join(",");
}

export function LocationFilter({
  locationName,
  latitude,
  longitude,
  radius,
  onChange,
  onClear,
}: LocationFilterProps) {
  const [input, setInput] = useState(locationName);
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [geolocating, setGeolocating] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const isActive = !!latitude && !!longitude;

  // Sync input with external changes (e.g. clear)
  useEffect(() => {
    setInput(locationName);
  }, [locationName]);

  // Geocode input via Nominatim
  const geocode = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
          new URLSearchParams({
            q: query,
            format: "json",
            addressdetails: "1",
            limit: "5",
            viewbox: "-25,72,45,34", // Europe bounding box
            bounded: "1",
          }),
        { headers: { "User-Agent": "Brainberg/1.0 (https://brainberg.eu)" } }
      );
      if (res.ok) {
        const data: NominatimResult[] = await res.json();
        setSuggestions(data);
        setShowSuggestions(data.length > 0);
      }
    } catch {
      // Silently fail
    }
  }, []);

  const handleInput = (value: string) => {
    setInput(value);
    clearTimeout(debounceRef.current);
    if (!value.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    debounceRef.current = setTimeout(() => geocode(value), 350);
  };

  const selectSuggestion = (result: NominatimResult) => {
    const name = shortName(result);
    setInput(name);
    setSuggestions([]);
    setShowSuggestions(false);
    onChange({
      name,
      lat: result.lat,
      lng: result.lon,
      radius: radius || DEFAULT_RADIUS,
    });
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    setGeolocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        // Reverse geocode for display name
        let name = `${lat.toFixed(2)}, ${lng.toFixed(2)}`;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?` +
              new URLSearchParams({
                lat: String(lat),
                lon: String(lng),
                format: "json",
                addressdetails: "1",
              }),
            { headers: { "User-Agent": "Brainberg/1.0 (https://brainberg.eu)" } }
          );
          if (res.ok) {
            const data: NominatimResult = await res.json();
            name = shortName(data);
          }
        } catch {
          // Use coords as fallback
        }
        setInput(name);
        setGeolocating(false);
        onChange({
          name,
          lat: String(lat),
          lng: String(lng),
          radius: radius || DEFAULT_RADIUS,
        });
      },
      () => setGeolocating(false),
      { enableHighAccuracy: false, timeout: 10000 }
    );
  };

  const handleClear = () => {
    setInput("");
    setSuggestions([]);
    setShowSuggestions(false);
    onClear();
  };

  // Close suggestions on outside click
  useEffect(() => {
    if (!showSuggestions) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showSuggestions]);

  return (
    <div className="flex items-center gap-2">
      <div ref={containerRef} className="relative">
        <div className="flex items-center">
          <div className="relative">
            <MapPin className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={input}
              onChange={(e) => handleInput(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              placeholder="City or address..."
              className="flex h-10 rounded-md border border-input bg-background pl-9 pr-8 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 w-[200px]"
            />
            {isActive && (
              <button
                onClick={handleClear}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <button
            onClick={useMyLocation}
            disabled={geolocating}
            title="Use my location"
            className="ml-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-input bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <Navigation className={`h-4 w-4 ${geolocating ? "animate-pulse" : ""}`} />
          </button>
        </div>

        {/* Suggestions dropdown */}
        {showSuggestions && (
          <div className="absolute left-0 top-full z-50 mt-1 w-72 rounded-lg border bg-background shadow-lg">
            {suggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => selectSuggestion(s)}
                className="w-full px-3 py-2 text-left text-sm hover:bg-accent first:rounded-t-lg last:rounded-b-lg"
              >
                {shortName(s)}
                <span className="ml-2 text-xs text-muted-foreground">
                  {s.type}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Radius selector — only show when location is set */}
      {isActive && (
        <Select
          value={radius || DEFAULT_RADIUS}
          onChange={(e) =>
            onChange({
              name: locationName,
              lat: latitude,
              lng: longitude,
              radius: e.target.value,
            })
          }
          className="w-[100px]"
        >
          {RADIUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      )}
    </div>
  );
}
