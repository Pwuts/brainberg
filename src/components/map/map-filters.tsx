"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { DateRangeFilter } from "@/components/ui/date-range-filter";
import { X } from "lucide-react";
import { CATEGORY_LABELS, EVENT_TYPE_LABELS, SIZE_LABELS } from "@/lib/utils";

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
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  const clearAll = useCallback(() => {
    router.push(pathname);
  }, [router, pathname]);

  const hasFilters = searchParams.toString().length > 0;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select
        value={searchParams.get("category") ?? ""}
        onChange={(e) => setFilter("category", e.target.value)}
        className="w-[160px]"
      >
        <option value="">All Categories</option>
        {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </Select>

      <Select
        value={searchParams.get("type") ?? ""}
        onChange={(e) => setFilter("type", e.target.value)}
        className="w-[160px]"
      >
        <option value="">All Types</option>
        {Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </Select>

      <Select
        value={searchParams.get("size") ?? ""}
        onChange={(e) => setFilter("size", e.target.value)}
        className="w-[140px]"
      >
        <option value="">Any Size</option>
        {Object.entries(SIZE_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label} attendees
          </option>
        ))}
      </Select>

      <DateRangeFilter
        from={searchParams.get("from") ?? ""}
        to={searchParams.get("to") ?? ""}
        onChange={setDateRange}
      />

      <Button
        variant={searchParams.get("free") === "1" ? "default" : "outline"}
        size="sm"
        onClick={() =>
          setFilter("free", searchParams.get("free") === "1" ? "" : "1")
        }
      >
        Free Only
      </Button>

      <Button
        variant={searchParams.get("online") === "1" ? "default" : "outline"}
        size="sm"
        onClick={() =>
          setFilter("online", searchParams.get("online") === "1" ? "" : "1")
        }
      >
        Online
      </Button>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearAll}>
          <X className="mr-1 h-3.5 w-3.5" />
          Clear
        </Button>
      )}
    </div>
  );
}
