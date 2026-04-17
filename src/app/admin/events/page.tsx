"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "@/components/admin/admin-auth-provider";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import {
  CATEGORY_LABELS,
  CATEGORY_COLORS,
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
  };
  city: { name: string } | null;
  country: { code: string; name: string } | null;
}

export default function AdminEventsPage() {
  const { fetchAdmin } = useAdminAuth();
  const router = useRouter();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [filters, setFilters] = useState({
    status: "",
    source: "",
    category: "",
    type: "",
    size: "",
    country: "",
    noLocation: false,
    q: "",
    sort: "-date",
  });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [countries, setCountries] = useState<{ code: string; name: string }[]>([]);

  const limit = 50;

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (filters.status) params.set("status", filters.status);
    if (filters.source) params.set("source", filters.source);
    if (filters.category) params.set("category", filters.category);
    if (filters.type) params.set("type", filters.type);
    if (filters.size) params.set("size", filters.size);
    if (filters.country) params.set("country", filters.country);
    if (filters.noLocation) params.set("noLocation", "1");
    if (filters.q) params.set("q", filters.q);
    if (filters.sort) params.set("sort", filters.sort);
    params.set("limit", String(limit));
    params.set("offset", String(offset));

    const res = await fetchAdmin(`/api/admin/events?${params.toString()}`);
    const data = await res.json();
    setEvents(data.events ?? []);
    setTotal(data.total ?? 0);

    // Extract unique countries from results for the country filter dropdown
    if (countries.length === 0) {
      const unique = new Map<string, string>();
      for (const row of data.events ?? []) {
        if (row.country) unique.set(row.country.code, row.country.name);
      }
      if (unique.size > 0) {
        setCountries([...unique.entries()].map(([code, name]) => ({ code, name })).sort((a, b) => a.name.localeCompare(b.name)));
      }
    }
  }, [fetchAdmin, filters, offset, countries.length]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  const setFilter = (key: string, value: string | boolean) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setOffset(0);
  };

  const clearFilters = () => {
    setFilters({ status: "", source: "", category: "", type: "", size: "", country: "", noLocation: false, q: "", sort: "-date" });
    setOffset(0);
  };

  const hasFilters = filters.status || filters.source || filters.category || filters.type || filters.size || filters.country || filters.noLocation || filters.q;

  const toggleSort = (field: string) => {
    setFilters((prev) => ({
      ...prev,
      sort: prev.sort === field ? `-${field}` : field,
    }));
    setOffset(0);
  };

  const sortIcon = (field: string) => {
    if (filters.sort === field) return " ↑";
    if (filters.sort === `-${field}`) return " ↓";
    return "";
  };

  const bulkAction = async (action: "approve" | "reject" | "delete") => {
    if (selected.size === 0) return;
    await fetchAdmin("/api/admin/events/bulk", {
      method: "POST",
      body: JSON.stringify({ ids: [...selected], action }),
    });
    setSelected(new Set());
    load();
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
          value={filters.q}
          onChange={(e) => setFilter("q", e.target.value)}
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
            <option key={val} value={val}>{label}</option>
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
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="mr-1 h-3.5 w-3.5" />
            Clear
          </Button>
        )}
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{selected.size} selected</span>
          <Button size="sm" onClick={() => bulkAction("approve")}>Approve</Button>
          <Button size="sm" variant="outline" onClick={() => bulkAction("reject")}>Reject</Button>
          <Button size="sm" variant="outline" onClick={() => bulkAction("delete")}>Delete</Button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-3 py-2 text-left">
                <input type="checkbox" checked={selected.size === events.length && events.length > 0} onChange={toggleAll} />
              </th>
              <th className="cursor-pointer px-3 py-2 text-left font-medium" onClick={() => toggleSort("title")}>
                Title{sortIcon("title")}
              </th>
              <th className="px-3 py-2 text-left font-medium">Status</th>
              <th className="px-3 py-2 text-left font-medium">Source</th>
              <th className="px-3 py-2 text-left font-medium">Category</th>
              <th className="px-3 py-2 text-left font-medium">Location</th>
              <th className="cursor-pointer px-3 py-2 text-left font-medium" onClick={() => toggleSort("date")}>
                Date{sortIcon("date")}
              </th>
            </tr>
          </thead>
          <tbody>
            {events.map((row) => (
              <tr
                key={row.event.id}
                className="cursor-pointer border-b hover:bg-accent/50 last:border-0"
                onClick={() => router.push(`/admin/events/${row.event.id}`)}
              >
                <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selected.has(row.event.id)}
                    onChange={() => toggleSelect(row.event.id)}
                  />
                </td>
                <td className="max-w-[300px] truncate px-3 py-2 font-medium">{row.event.title}</td>
                <td className="px-3 py-2">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    row.event.status === "approved" ? "bg-green-100 text-green-800"
                    : row.event.status === "pending" ? "bg-yellow-100 text-yellow-800"
                    : row.event.status === "rejected" ? "bg-red-100 text-red-800"
                    : "bg-gray-100 text-gray-800"
                  }`}>
                    {row.event.status}
                  </span>
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {SOURCE_LABELS[row.event.source] ?? row.event.source}
                </td>
                <td className="px-3 py-2">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_COLORS[row.event.category] ?? "bg-gray-100 text-gray-800"}`}>
                    {CATEGORY_LABELS[row.event.category] ?? row.event.category}
                  </span>
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {row.city?.name}
                  {row.country ? ` ${countryFlag(row.country.code)}` : ""}
                  {!row.city && !row.country && <span className="text-red-400">—</span>}
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {new Date(row.event.startsAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {events.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                  No events found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > limit && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Showing {offset + 1}–{Math.min(offset + limit, total)} of {total}
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - limit))}>
              Previous
            </Button>
            <Button size="sm" variant="outline" disabled={offset + limit >= total} onClick={() => setOffset(offset + limit)}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
