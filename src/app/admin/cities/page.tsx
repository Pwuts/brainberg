"use client";

import { useCallback, useEffect, useMemo, useState, FormEvent } from "react";
import nextDynamic from "next/dynamic";
import { useAdminAuth } from "@/components/admin/admin-auth-provider";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ExternalLink, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { cn, CATEGORY_LABELS, formatEventDate } from "@/lib/utils";
import { LocationPicker } from "@/components/admin/location-picker";
import type { MapCity } from "./cities-map";

interface PreviewEvent {
  source: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  venueName: string | null;
  cityName: string | null;
  countryCode: string | null;
  isOnline: boolean;
  url: string | null;
  organizerName: string | null;
  category: keyof typeof CATEGORY_LABELS;
  tags: string[];
}

const CitiesMap = nextDynamic(() => import("./cities-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-120 items-center justify-center rounded-lg border text-sm text-muted-foreground">
      Loading map...
    </div>
  ),
});

interface CityRow {
  id: number;
  name: string;
  slug: string;
  countryId: number;
  countryCode: string;
  countryName: string;
  latitude: number;
  longitude: number;
  timezone: string;
  isPopular: boolean;
  approvedEventCount: number;
  totalEventCount: number;
}

interface CountryRow {
  id: number;
  code: string;
  name: string;
}

type View = "list" | "map";

export default function AdminCitiesPage() {
  const { fetchAdmin } = useAdminAuth();
  const [cities, setCities] = useState<CityRow[]>([]);
  const [countriesList, setCountriesList] = useState<CountryRow[]>([]);
  const [search, setSearch] = useState("");
  const [countryFilter, setCountryFilter] = useState("");
  const [view, setView] = useState<View>("list");
  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addCountry, setAddCountry] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewResults, setPreviewResults] = useState<PreviewEvent[] | null>(null);
  const [previewKey, setPreviewKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetchAdmin("/api/admin/cities");
    const data = await res.json();
    setCities(data.cities ?? []);
    setCountriesList(data.countries ?? []);
  }, [fetchAdmin]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return cities.filter((c) => {
      if (countryFilter && c.countryCode !== countryFilter) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.countryName.toLowerCase().includes(q) ||
        c.countryCode.toLowerCase().includes(q)
      );
    });
  }, [cities, search, countryFilter]);

  const mapCities: MapCity[] = useMemo(
    () =>
      filtered.map((c) => ({
        id: c.id,
        name: c.name,
        countryCode: c.countryCode,
        countryName: c.countryName,
        latitude: c.latitude,
        longitude: c.longitude,
        approvedEventCount: c.approvedEventCount,
        totalEventCount: c.totalEventCount,
      })),
    [filtered],
  );

  // Only show countries that actually have a city
  const countriesWithCities = useMemo(() => {
    const codes = new Set(cities.map((c) => c.countryCode));
    return countriesList.filter((c) => codes.has(c.code));
  }, [cities, countriesList]);

  const openAdd = () => {
    setAddName("");
    setAddCountry("");
    setAddError(null);
    setPreviewError(null);
    setPreviewResults(null);
    setPreviewKey(null);
    setAddOpen(true);
  };

  const pickedCountry = useMemo(() => {
    if (!addCountry) return null;
    const c = countriesList.find((x) => x.code === addCountry);
    return c ? { code: c.code, name: c.name } : null;
  }, [addCountry, countriesList]);

  const runPreview = async () => {
    if (!addName.trim() || !addCountry) return;
    setPreviewing(true);
    setPreviewError(null);
    setPreviewResults(null);
    const key = `${addName.trim().toLowerCase()}|${addCountry}`;
    try {
      const res = await fetchAdmin(
        `/api/admin/cities/preview?city=${encodeURIComponent(addName.trim())}&country=${encodeURIComponent(addCountry)}`,
      );
      const data = await res.json();
      if (!res.ok) {
        setPreviewError(data.error ?? "Preview failed");
      } else {
        setPreviewResults(data.events ?? []);
        setPreviewKey(key);
      }
    } catch {
      setPreviewError("Network error");
    } finally {
      setPreviewing(false);
    }
  };

  const currentPreviewKey = `${addName.trim().toLowerCase()}|${addCountry}`;
  const previewIsStale = previewKey !== null && previewKey !== currentPreviewKey;

  const submitAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!addName.trim() || !addCountry) return;
    setAdding(true);
    setAddError(null);
    try {
      const res = await fetchAdmin("/api/admin/cities", {
        method: "POST",
        body: JSON.stringify({ name: addName, countryCode: addCountry }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAddError(data.error ?? "Failed to add city");
      } else {
        const added = data.city?.name ?? addName;
        const country = pickedCountry?.name ?? addCountry;
        toast.success(`Added ${added}, ${country}`);
        setAddOpen(false);
        await load();
      }
    } catch {
      setAddError("Network error");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Cities</h1>
          <p className="text-sm text-muted-foreground">
            {cities.length} tracked. New cities are also auto-discovered by
            scrapers when they geocode successfully.
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="mr-1 h-4 w-4" />
          Add City
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-55 flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by city or country..."
            className="pl-9"
          />
        </div>
        <Select
          value={countryFilter}
          onChange={(e) => setCountryFilter(e.target.value)}
          className="w-auto min-w-45"
        >
          <option value="">All countries ({cities.length})</option>
          {countriesWithCities.map((c) => {
            const count = cities.filter((x) => x.countryCode === c.code).length;
            return (
              <option key={c.id} value={c.code}>
                {c.name} ({count})
              </option>
            );
          })}
        </Select>
        <div className="ml-auto inline-flex overflow-hidden rounded-md border">
          {(["list", "map"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                "px-3 py-1.5 text-sm font-medium capitalize transition-colors",
                view === v
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:bg-accent",
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {view === "map" ? (
        <CitiesMap cities={mapCities} />
      ) : (
        <div className="overflow-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-2 text-left font-medium">City</th>
                <th className="px-4 py-2 text-left font-medium">Country</th>
                <th className="px-4 py-2 text-left font-medium">Timezone</th>
                <th className="px-4 py-2 text-right font-medium">Approved</th>
                <th className="px-4 py-2 text-right font-medium">Total</th>
                <th className="px-4 py-2 text-left font-medium">Coordinates</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b last:border-0">
                  <td className="px-4 py-2 font-medium">
                    {c.name}
                    {c.isPopular && (
                      <span className="ml-2 inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        popular
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <span className="text-muted-foreground">{c.countryCode}</span>{" "}
                    {c.countryName}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">{c.timezone}</td>
                  <td className="px-4 py-2 text-right">{c.approvedEventCount}</td>
                  <td className="px-4 py-2 text-right text-muted-foreground">
                    {c.totalEventCount}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-muted-foreground">
                    <a
                      href={`https://www.openstreetmap.org/?mlat=${c.latitude}&mlon=${c.longitude}&zoom=11`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-primary hover:underline"
                    >
                      {c.latitude.toFixed(3)}, {c.longitude.toFixed(3)}
                    </a>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    {cities.length === 0
                      ? "No cities yet."
                      : "No cities match the filter."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Dialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add City"
        description="Search OpenStreetMap for the city; the canonical English name is used. Preview shows upcoming Meetup tech events for this (city, country) before you commit."
        className="max-w-3xl"
      >
        <form onSubmit={submitAdd} className="space-y-4">
          <LocationPicker
            cityOnly
            currentCity={addName || null}
            currentCountry={pickedCountry}
            currentAddress={null}
            onPick={(loc) => {
              setAddName(loc.cityName);
              setAddCountry(loc.countryCode);
              setAddError(null);
              setPreviewError(null);
              setPreviewResults(null);
              setPreviewKey(null);
            }}
          />

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={runPreview}
              disabled={previewing || adding || !addName.trim() || !addCountry}
            >
              {previewing ? "Previewing..." : "Preview Meetup"}
            </Button>
            {previewIsStale && (
              <span className="text-xs text-muted-foreground">
                Preview is for different inputs — re-run to refresh.
              </span>
            )}
            {previewError && (
              <span className="text-sm text-red-600">{previewError}</span>
            )}
          </div>

          {previewResults && (
            <PreviewResults events={previewResults} stale={previewIsStale} />
          )}

          {addError && <p className="text-sm text-red-600">{addError}</p>}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setAddOpen(false)}
              disabled={adding || previewing}
            >
              Close
            </Button>
            <Button
              type="submit"
              disabled={adding || previewing || !addName.trim() || !addCountry}
            >
              {adding ? "Adding..." : "Add city"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}

function PreviewResults({
  events,
  stale,
}: {
  events: PreviewEvent[];
  stale: boolean;
}) {
  if (events.length === 0) {
    return (
      <div className="rounded-md border border-dashed py-6 text-center text-sm text-muted-foreground">
        No upcoming Meetup events found for this city. Either Meetup has no tech
        meetups here, or the (city, country) combination doesn&apos;t match its
        search format.
      </div>
    );
  }

  return (
    <div
      className={cn(
        "max-h-80 overflow-auto rounded-lg border",
        stale && "opacity-60",
      )}
    >
      <div className="flex items-center justify-between border-b bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground">
        <span>
          {events.length} upcoming Meetup event{events.length === 1 ? "" : "s"}
        </span>
        <span>Not ingested — preview only.</span>
      </div>
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/30 text-xs">
          <tr>
            <th className="px-3 py-1.5 text-left font-medium">Event</th>
            <th className="px-3 py-1.5 text-left font-medium">When</th>
            <th className="px-3 py-1.5 text-left font-medium">Venue</th>
            <th className="px-3 py-1.5 text-left font-medium">Category</th>
          </tr>
        </thead>
        <tbody>
          {events.map((e, i) => (
            <tr key={i} className="border-b last:border-0">
              <td className="max-w-xs px-3 py-2">
                {e.url ? (
                  <a
                    href={e.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-start gap-1 font-medium text-primary hover:underline"
                  >
                    <span className="line-clamp-2">{e.title}</span>
                    <ExternalLink className="mt-0.5 h-3 w-3 shrink-0" />
                  </a>
                ) : (
                  <span className="font-medium">{e.title}</span>
                )}
                {e.organizerName && (
                  <div className="text-xs text-muted-foreground">
                    by {e.organizerName}
                  </div>
                )}
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">
                {formatEventDate(
                  new Date(e.startsAt),
                  e.endsAt ? new Date(e.endsAt) : null,
                  "UTC",
                )}
              </td>
              <td className="px-3 py-2 text-xs text-muted-foreground">
                {e.isOnline ? (
                  <span className="italic">Online</span>
                ) : (
                  <>
                    {e.venueName ?? "—"}
                    {e.cityName && e.cityName !== e.venueName && (
                      <div>{e.cityName}</div>
                    )}
                  </>
                )}
              </td>
              <td className="px-3 py-2 text-xs">
                {CATEGORY_LABELS[e.category] ?? e.category}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
