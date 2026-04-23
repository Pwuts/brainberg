"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";
import { DateRangeFilter } from "@/components/ui/date-range-filter";
import { LocationFilter } from "@/components/ui/location-filter";
import { Dropdown } from "@/components/ui/dropdown";
import { MultiSelect } from "@/components/ui/multi-select";
import { MoreFilters } from "@/components/ui/more-filters";
import { ArrowUp, ArrowDown, X } from "lucide-react";
import {
  CATEGORY_LABELS,
  CATEGORY_DESCRIPTIONS,
  EVENT_TYPE_LABELS,
  SIZE_LABELS,
  cn,
} from "@/lib/utils";

const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABELS).map(([value, label]) => ({
  value,
  label,
  detail: CATEGORY_DESCRIPTIONS[value],
}));

const TYPE_OPTIONS = Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

const SIZE_OPTIONS = Object.entries(SIZE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

interface FilterProps {
  countries: { code: string; name: string }[];
  /** Hide the category multi-select (e.g. on a category landing page). */
  hideCategory?: boolean;
  /** Hide the location filter (country/city/radius/online) on a
   *  country or city landing page where location is fixed by the path. */
  hideLocation?: boolean;
  /**
   * Forwarded to DateRangeFilter. Defaults to true (auto-apply
   * last-used preset). Landing pages pass false so they open with
   * "Future events" regardless of what was stored in localStorage.
   */
  autoApplyStoredDatePreset?: boolean;
}

export function EventFilters({
  countries,
  hideCategory,
  hideLocation,
  autoApplyStoredDatePreset = true,
}: FilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const update = useCallback(
    (changes: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(changes)) {
        if (value) params.set(key, value);
        else params.delete(key);
      }
      params.delete("cursor");
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams],
  );

  const setFilter = useCallback(
    (key: string, value: string) => update({ [key]: value || null }),
    [update],
  );

  const setDateRange = useCallback(
    (from: string, to: string) =>
      update({
        from: from || null,
        to: to || null,
        // Tag the range with the user's local TZ offset so the server can
        // interpret YYYY-MM-DD as start/end of that *local* day.
        tzo: from || to ? String(-new Date().getTimezoneOffset()) : null,
      }),
    [update],
  );

  const clearAll = useCallback(() => router.push(pathname), [router, pathname]);

  // Ignore date range filter because it is persisted in local storage and won't be cleared anyway
  const hasFilters = searchParams
    .keys()
    .some((k) => !["from", "to", "tzo"].includes(k));
  const hasLocation = !!searchParams.get("lat");

  // Secondary controls (collapsed into "Filters" popover on mobile)
  const categoryValues = (searchParams.get("category") ?? "")
    .split(",")
    .filter(Boolean);
  const categoryEl = (
    <MultiSelect
      values={categoryValues}
      options={CATEGORY_OPTIONS}
      placeholder="Category"
      onChange={(vs) => setFilter("category", vs.join(","))}
      className="w-48"
      panelWidth="w-full md:w-80"
    />
  );
  const typeEl = (
    <Dropdown
      value={searchParams.get("type") ?? ""}
      options={TYPE_OPTIONS}
      placeholder="Type"
      onChange={(v) => setFilter("type", v)}
      className="w-24"
      panelWidth="w-40"
    />
  );
  const sizeEl = (
    <Dropdown
      value={searchParams.get("size") ?? ""}
      options={SIZE_OPTIONS}
      placeholder="Size"
      onChange={(v) => setFilter("size", v)}
      className="w-24"
      panelWidth="w-36"
    />
  );
  const freeEl = (
    <button
      onClick={() => setFilter("free", searchParams.get("free") === "1" ? "" : "1")}
      className={`h-9 shrink-0 rounded-md border px-3 text-sm transition-colors ${
        searchParams.get("free") === "1"
          ? "border-primary bg-primary text-primary-foreground"
          : "border-input bg-background hover:bg-accent"
      }`}
      title="Filter by events that are free to attend"
    >
      Free
    </button>
  );

  const secondaryActiveCount =
    (!hideCategory && searchParams.get("category") ? 1 : 0) +
    (searchParams.get("type") ? 1 : 0) +
    (searchParams.get("size") ? 1 : 0) +
    (searchParams.get("free") === "1" ? 1 : 0);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* 1. Location / Online */}
      {!hideLocation && (
        <LocationFilter
          countries={countries}
          country={searchParams.get("country") ?? ""}
          locationName={searchParams.get("loc") ?? ""}
          latitude={searchParams.get("lat") ?? ""}
          longitude={searchParams.get("lng") ?? ""}
          radius={searchParams.get("radius") ?? ""}
          isOnline={searchParams.get("online") === "1"}
          onCountry={(code) =>
            update({
              country: code,
              loc: null,
              lat: null,
              lng: null,
              radius: null,
              online: null,
            })
          }
          onLocation={(loc) =>
            update({
              loc: loc.name,
              lat: loc.lat,
              lng: loc.lng,
              radius: loc.radius,
              country: null,
              online: null,
            })
          }
          onOnline={(on) =>
            update({
              online: on ? "1" : null,
              loc: null,
              lat: null,
              lng: null,
              radius: null,
              country: null,
            })
          }
          onClear={() =>
            update({
              country: null,
              loc: null,
              lat: null,
              lng: null,
              radius: null,
              online: null,
            })
          }
        />
      )}

      {/* 2. Timespan */}
      <DateRangeFilter
        from={searchParams.get("from") ?? ""}
        to={searchParams.get("to") ?? ""}
        onChange={setDateRange}
        autoApplyStoredPreset={autoApplyStoredDatePreset}
      />

      {/* Secondary filters — inline on desktop */}
      <div className="hidden md:contents">
        {!hideCategory && categoryEl}
        {typeEl}
        {sizeEl}
        {freeEl}
      </div>

      {/* Secondary filters — collapsed popover on mobile */}
      <MoreFilters className="md:hidden" activeCount={secondaryActiveCount}>
        {!hideCategory && categoryEl}
        {typeEl}
        {sizeEl}
        {freeEl}
      </MoreFilters>

      {/* Clear */}
      {hasFilters && (
        <button
          onClick={clearAll}
          className="flex items-center h-9 shrink-0 rounded-md px-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <X className="h-3.5 w-3.5 mr-1" /> Clear
        </button>
      )}

      {/* Spacer (desktop only — pushes Sort right) */}
      <div className="hidden flex-1 md:block" />

      {/* Sort */}
      <SortControl
        value={searchParams.get("sort") ?? "date"}
        hasLocation={hasLocation}
        onChange={(v) => setFilter("sort", v === "date" ? "" : v)}
      />
    </div>
  );
}

// ============================================================

const SORT_OPTIONS = [
  { value: "date", label: "Date" },
  { value: "size", label: "Size" },
];

function parseSortParam(raw: string): { field: string; desc: boolean } {
  if (raw.startsWith("-")) return { field: raw.slice(1), desc: true };
  return { field: raw, desc: false };
}

function SortControl({
  value,
  hasLocation,
  onChange,
  className,
}: {
  value: string;
  hasLocation: boolean;
  onChange: (v: string) => void;
  className?: string;
}) {
  const { field, desc: isDesc } = parseSortParam(value);
  const isDistance = field === "distance";

  const options = hasLocation
    ? [...SORT_OPTIONS, { value: "distance", label: "Nearest" }]
    : SORT_OPTIONS;

  const setField = (f: string) => {
    onChange(f === "distance" ? f : isDesc ? `-${f}` : f);
  };

  const toggleDirection = () => {
    if (isDistance) return;
    onChange(isDesc ? field : `-${field}`);
  };

  return (
    <div className={cn("flex items-center", className)}>
      <div className="w-24">
        <Dropdown
          value={field}
          options={options}
          placeholder="Sort"
          onChange={setField}
          className="w-full [&>button]:rounded-r-none [&>button]:border-r-0"
        />
      </div>
      {!isDistance && (
        <button
          onClick={toggleDirection}
          title={isDesc ? "Descending" : "Ascending"}
          className="h-9 rounded-r-md border border-input bg-background px-1.5 hover:bg-accent transition-colors"
        >
          {isDesc ? (
            <ArrowDown className="h-3.5 w-3.5" />
          ) : (
            <ArrowUp className="h-3.5 w-3.5" />
          )}
        </button>
      )}
    </div>
  );
}
