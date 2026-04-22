"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useAdminAuth } from "@/components/admin/admin-auth-provider";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  SortableTable,
  type SortState,
  type TableColumn,
} from "@/components/ui/sortable-table";
import { X } from "lucide-react";
import {
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  CATEGORY_DESCRIPTIONS,
  EVENT_TYPE_LABELS,
  SIZE_LABELS,
  SOURCE_LABELS,
  countryFlag,
} from "@/lib/utils";

interface EventRow {
  event: {
    id: string;
    title: string;
    slug: string;
    status: string;
    source: string;
    category: string;
    eventType: string;
    startsAt: string;
    createdAt: string;
    updatedAt: string;
  };
  city: { name: string } | null;
  country: { code: string; name: string } | null;
}

export default function AdminEventsPage() {
  const { fetchAdmin } = useAdminAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [events, setEvents] = useState<EventRow[]>([]);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [countries, setCountries] = useState<{ code: string; name: string }[]>([]);

  // Read filters from URL
  const filters = {
    status: searchParams.get("status") ?? "",
    source: searchParams.get("source") ?? "",
    category: searchParams.get("category") ?? "",
    type: searchParams.get("type") ?? "",
    size: searchParams.get("size") ?? "",
    country: searchParams.get("country") ?? "",
    noLocation: searchParams.get("noLocation") === "1",
    moderated: searchParams.get("moderated") ?? "",
    dateFrom: searchParams.get("dateFrom") ?? "",
    dateTo: searchParams.get("dateTo") ?? "",
    q: searchParams.get("q") ?? "",
    sort: searchParams.get("sort") ?? "-created",
  };
  const offset = parseInt(searchParams.get("offset") ?? "0");
  const limit = parseInt(searchParams.get("limit") ?? "50");
  const PAGE_SIZE_OPTIONS = [25, 50, 100, 200, 500];

  // Always read live query string from window.location to avoid stale closures
  // (React Compiler memoizes callbacks across renders, so captured searchParams
  // can diverge from the actual URL after navigations).
  const currentParams = () => new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");

  // Depend on a primitive (the search string) so the effect reliably fires
  // after every navigation — a `searchParams` object dep can be over-memoized
  // by React Compiler and miss URL changes.
  const searchString = searchParams.toString();
  const [reloadKey, setReloadKey] = useState(0);
  const load = () => setReloadKey((k) => k + 1);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const params = currentParams();
      if (!params.has("sort")) params.set("sort", "-created");
      if (!params.has("limit")) params.set("limit", "50");

      const res = await fetchAdmin(`/api/admin/events?${params.toString()}`);
      const data = await res.json();
      if (cancelled) return;
      setEvents(data.events ?? []);
      setTotal(data.total ?? 0);

      // Populate the country filter dropdown once, from the first non-empty
      // result set. Functional setState avoids a dep on `countries.length`.
      setCountries((prev) => {
        if (prev.length > 0) return prev;
        const unique = new Map<string, string>();
        for (const row of data.events ?? []) {
          if (row.country) unique.set(row.country.code, row.country.name);
        }
        if (unique.size === 0) return prev;
        return [...unique.entries()]
          .map(([code, name]) => ({ code, name }))
          .sort((a, b) => a.name.localeCompare(b.name));
      });
    })();
    return () => { cancelled = true; };
  }, [searchString, fetchAdmin, reloadKey]);

  const setFilter = (key: string, value: string | boolean) => {
    const params = currentParams();
    if (value) {
      params.set(key, typeof value === "boolean" ? "1" : value);
    } else {
      params.delete(key);
    }
    params.delete("offset"); // reset pagination on filter change
    // Keep tzo in sync with date-filter presence so the server interprets
    // dateFrom/dateTo as start/end of the local day.
    if (key === "dateFrom" || key === "dateTo") {
      if (params.get("dateFrom") || params.get("dateTo")) {
        params.set("tzo", String(-new Date().getTimezoneOffset()));
      } else {
        params.delete("tzo");
      }
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const clearFilters = () => {
    router.push(pathname);
  };

  const setOffset = (newOffset: number) => {
    const params = currentParams();
    if (newOffset > 0) params.set("offset", String(newOffset));
    else params.delete("offset");
    router.push(`${pathname}?${params.toString()}`);
  };

  // Debounced search
  const [searchInput, setSearchInput] = useState(filters.q);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const handleSearch = (val: string) => {
    setSearchInput(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setFilter("q", val), 300);
  };

  const hasFilters = filters.status || filters.source || filters.category || filters.type || filters.size || filters.country || filters.noLocation || filters.moderated || filters.dateFrom || filters.dateTo || filters.q;

  const sortState: SortState = filters.sort.startsWith("-")
    ? { key: filters.sort.slice(1), dir: "desc" }
    : { key: filters.sort, dir: "asc" };

  const onSortChange = (next: SortState) => {
    const params = currentParams();
    params.set("sort", next.dir === "desc" ? `-${next.key}` : next.key);
    params.delete("offset");
    router.push(`${pathname}?${params.toString()}`);
  };

  const [busy, setBusy] = useState<string | null>(null);

  const bulkAction = async (action: "approve" | "reject" | "pending" | "delete") => {
    if (selected.size === 0) return;
    if (action === "delete" && !confirm(`Delete ${selected.size} event(s)? This cannot be undone.`)) return;
    setBusy(action);
    try {
      await fetchAdmin("/api/admin/events/bulk", {
        method: "POST",
        body: JSON.stringify({ ids: [...selected], action }),
      });
      setSelected(new Set());
      load();
    } finally {
      setBusy(null);
    }
  };

  const bulkRemoderate = async () => {
    if (selected.size === 0) return;
    setBusy("remoderate");
    try {
      await fetchAdmin("/api/admin/events/recategorize", {
        method: "POST",
        body: JSON.stringify({ eventIds: [...selected], bypassLock: true }),
      });
      setSelected(new Set());
      load();
    } finally {
      setBusy(null);
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === events.length) setSelected(new Set());
    else setSelected(new Set(events.map((e) => e.event.id)));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Events</h1>
        <span className="text-sm text-muted-foreground">{total} total</span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={searchInput}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search title, city, organizer..."
          className="w-[220px]"
        />
        <Select value={filters.status} onChange={(e) => setFilter("status", e.target.value)} className="w-[130px]">
          <option value="">All Statuses</option>
          <option value="approved">Approved</option>
          <option value="pending">Pending</option>
          <option value="rejected">Rejected</option>
          <option value="draft">Draft</option>
        </Select>
        <Select value={filters.source} onChange={(e) => setFilter("source", e.target.value)} className="w-[140px]">
          <option value="">All Sources</option>
          {Object.entries(SOURCE_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </Select>
        <Select value={filters.category} onChange={(e) => setFilter("category", e.target.value)} className="w-[160px]">
          <option value="">All Categories</option>
          {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
            <option key={val} value={val} title={CATEGORY_DESCRIPTIONS[val]}>{label}</option>
          ))}
        </Select>
        <Select value={filters.type} onChange={(e) => setFilter("type", e.target.value)} className="w-[140px]">
          <option value="">All Types</option>
          {Object.entries(EVENT_TYPE_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </Select>
        <Select value={filters.size} onChange={(e) => setFilter("size", e.target.value)} className="w-[130px]">
          <option value="">Any Size</option>
          {Object.entries(SIZE_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </Select>
        {countries.length > 0 && (
          <Select value={filters.country} onChange={(e) => setFilter("country", e.target.value)} className="w-[150px]">
            <option value="">All Countries</option>
            {countries.map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </Select>
        )}
        <Button
          variant={filters.noLocation ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("noLocation", !filters.noLocation)}
        >
          No Location
        </Button>
        <Select value={filters.moderated} onChange={(e) => setFilter("moderated", e.target.value)} className="w-[150px]">
          <option value="">Any AI state</option>
          <option value="ai">AI-moderated</option>
          <option value="not_ai">Not AI-moderated</option>
        </Select>
        <label className="flex items-center gap-1 text-sm text-muted-foreground">
          From
          <Input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => setFilter("dateFrom", e.target.value)}
            className="h-9 w-[150px]"
          />
        </label>
        <label className="flex items-center gap-1 text-sm text-muted-foreground">
          To
          <Input
            type="date"
            value={filters.dateTo}
            onChange={(e) => setFilter("dateTo", e.target.value)}
            className="h-9 w-[150px]"
          />
        </label>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="mr-1 h-3.5 w-3.5" />
            Clear
          </Button>
        )}
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">{selected.size} selected</span>
          <Button size="sm" disabled={busy !== null} onClick={() => bulkAction("approve")}>
            {busy === "approve" ? "Approving..." : "Approve"}
          </Button>
          <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => bulkAction("pending")}>
            {busy === "pending" ? "Setting..." : "Set Pending"}
          </Button>
          <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => bulkAction("reject")}>
            {busy === "reject" ? "Rejecting..." : "Reject"}
          </Button>
          <Button size="sm" variant="outline" disabled={busy !== null} onClick={bulkRemoderate}>
            {busy === "remoderate" ? "Re-moderating..." : "Re-moderate"}
          </Button>
          <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => bulkAction("delete")} className="border-red-300 text-red-700 hover:bg-red-50">
            {busy === "delete" ? "Deleting..." : "Delete"}
          </Button>
        </div>
      )}

      {/* Table */}
      <SortableTable
        columns={[
          {
            key: "select",
            label: (
              <input
                type="checkbox"
                checked={selected.size === events.length && events.length > 0}
                onChange={toggleAll}
                onClick={(e) => e.stopPropagation()}
              />
            ),
            cell: (row) => (
              <span onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={selected.has(row.event.id)}
                  onChange={() => toggleSelect(row.event.id)}
                />
              </span>
            ),
          },
          {
            key: "title",
            label: "Title",
            sortable: true,
            className: "max-w-75 truncate font-medium",
            cell: (row) => row.event.title,
          },
          {
            key: "status",
            label: "Status",
            cell: (row) => (
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                row.event.status === "approved" ? "bg-green-100 text-green-800"
                : row.event.status === "pending" ? "bg-yellow-100 text-yellow-800"
                : row.event.status === "rejected" ? "bg-red-100 text-red-800"
                : "bg-gray-100 text-gray-800"
              }`}>
                {row.event.status}
              </span>
            ),
          },
          {
            key: "source",
            label: "Source",
            className: "text-muted-foreground",
            cell: (row) => SOURCE_LABELS[row.event.source] ?? row.event.source,
          },
          {
            key: "category",
            label: "Category",
            cell: (row) => (
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_COLORS[row.event.category] ?? "bg-gray-100 text-gray-800"}`}
                title={CATEGORY_DESCRIPTIONS[row.event.category]}
              >
                {CATEGORY_LABELS[row.event.category] ?? row.event.category}
              </span>
            ),
          },
          {
            key: "location",
            label: "Location",
            className: "text-muted-foreground",
            cell: (row) => (
              <>
                {row.city?.name}
                {row.country ? ` ${countryFlag(row.country.code)}` : ""}
                {!row.city && !row.country && (
                  <span className="text-red-400">—</span>
                )}
              </>
            ),
          },
          {
            key: "date",
            label: "Date",
            sortable: true,
            defaultDir: "desc",
            className: "text-muted-foreground",
            cell: (row) => new Date(row.event.startsAt).toLocaleDateString(),
          },
          {
            key: "created",
            label: "Created",
            sortable: true,
            defaultDir: "desc",
            className: "text-xs text-muted-foreground",
            cell: (row) => new Date(row.event.createdAt).toLocaleDateString(),
          },
          {
            key: "updated",
            label: "Updated",
            sortable: true,
            defaultDir: "desc",
            className: "text-xs text-muted-foreground",
            cell: (row) => new Date(row.event.updatedAt).toLocaleDateString(),
          },
        ]}
        rows={events}
        rowKey={(row) => row.event.id}
        sort={sortState}
        onSortChange={onSortChange}
        onRowClick={(row) => router.push(`/admin/events/${row.event.id}`)}
        emptyMessage="No events found."
      />

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {total > 0
            ? `Showing ${offset + 1}–${Math.min(offset + limit, total)} of ${total}`
            : "No results"}
        </span>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            Per page
            <Select
              value={String(limit)}
              onChange={(e) => setFilter("limit", e.target.value === "50" ? "" : e.target.value)}
              className="w-[80px]"
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={String(n)}>{n}</option>
              ))}
            </Select>
          </label>
          {total > limit && (
            <>
              <Button size="sm" variant="outline" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - limit))}>
                Previous
              </Button>
              <Button size="sm" variant="outline" disabled={offset + limit >= total} onClick={() => setOffset(offset + limit)}>
                Next
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
