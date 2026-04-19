"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";
import { DateRangeFilter } from "@/components/ui/date-range-filter";
import { Dropdown } from "@/components/ui/dropdown";
import { MoreFilters } from "@/components/ui/more-filters";
import { X } from "lucide-react";
import { CATEGORY_LABELS, CATEGORY_DESCRIPTIONS, EVENT_TYPE_LABELS, SIZE_LABELS } from "@/lib/utils";

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

export function MapFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  const setDateRange = useCallback(
    (from: string, to: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (from) params.set("from", from); else params.delete("from");
      if (to) params.set("to", to); else params.delete("to");
      // Tag with the user's local TZ offset so the server interprets the
      // YYYY-MM-DD bounds as start/end of that local day.
      if (from || to) {
        params.set("tzo", String(-new Date().getTimezoneOffset()));
      } else {
        params.delete("tzo");
      }
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  const clearAll = useCallback(() => {
    router.push(pathname);
  }, [router, pathname]);

  const hasFilters = searchParams.toString().length > 0;

  // Secondary controls (collapsed into "Filters" popover on mobile)
  const categoryEl = (
    <Dropdown
      value={searchParams.get("category") ?? ""}
      options={CATEGORY_OPTIONS}
      placeholder="Category"
      onChange={(v) => setFilter("category", v)}
      className="w-28"
      panelWidth="w-80"
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
      onClick={() =>
        setFilter("free", searchParams.get("free") === "1" ? "" : "1")
      }
      className={`h-9 shrink-0 rounded-md border px-3 text-sm transition-colors ${
        searchParams.get("free") === "1"
          ? "border-primary bg-primary text-primary-foreground"
          : "border-input bg-background hover:bg-accent"
      }`}
    >
      Free
    </button>
  );
  const onlineEl = (
    <button
      onClick={() =>
        setFilter("online", searchParams.get("online") === "1" ? "" : "1")
      }
      className={`h-9 shrink-0 rounded-md border px-3 text-sm transition-colors ${
        searchParams.get("online") === "1"
          ? "border-primary bg-primary text-primary-foreground"
          : "border-input bg-background hover:bg-accent"
      }`}
    >
      Online
    </button>
  );

  const secondaryActiveCount =
    (searchParams.get("category") ? 1 : 0) +
    (searchParams.get("type") ? 1 : 0) +
    (searchParams.get("size") ? 1 : 0) +
    (searchParams.get("free") === "1" ? 1 : 0) +
    (searchParams.get("online") === "1" ? 1 : 0);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Timespan */}
      <DateRangeFilter
        from={searchParams.get("from") ?? ""}
        to={searchParams.get("to") ?? ""}
        onChange={setDateRange}
      />

      {/* Secondary filters — inline on desktop */}
      <div className="hidden md:contents">
        {categoryEl}
        {typeEl}
        {sizeEl}
        {freeEl}
        {onlineEl}
      </div>

      {/* Secondary filters — collapsed popover on mobile */}
      <MoreFilters className="md:hidden" activeCount={secondaryActiveCount}>
        {categoryEl}
        {typeEl}
        {sizeEl}
        {freeEl}
        {onlineEl}
      </MoreFilters>

      {/* Clear */}
      {hasFilters && (
        <button
          onClick={clearAll}
          className="h-9 shrink-0 rounded-md px-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
