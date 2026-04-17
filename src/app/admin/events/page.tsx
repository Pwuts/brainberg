"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "@/components/admin/admin-auth-provider";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CATEGORY_LABELS,
  CATEGORY_COLORS,
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
  const [status, setStatus] = useState("");
  const [source, setSource] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const limit = 50;

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (source) params.set("source", source);
    if (search) params.set("q", search);
    params.set("limit", String(limit));
    params.set("offset", String(offset));

    const res = await fetchAdmin(`/api/admin/events?${params.toString()}`);
    const data = await res.json();
    setEvents(data.events ?? []);
    setTotal(data.total ?? 0);
  }, [fetchAdmin, status, source, search, offset]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  const bulkAction = async (action: "approve" | "reject" | "delete") => {
    if (selected.size === 0) return;
    const ids = [...selected];
    await fetchAdmin("/api/admin/events/bulk", {
      method: "POST",
      body: JSON.stringify({ ids, action }),
    });
    setSelected(new Set());
    load();
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === events.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(events.map((e) => e.event.id)));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Events</h1>
        <span className="text-sm text-muted-foreground">{total} total</span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={status} onChange={(e) => { setStatus(e.target.value); setOffset(0); }} className="w-[140px]">
          <option value="">All Statuses</option>
          <option value="approved">Approved</option>
          <option value="pending">Pending</option>
          <option value="rejected">Rejected</option>
          <option value="draft">Draft</option>
        </Select>
        <Select value={source} onChange={(e) => { setSource(e.target.value); setOffset(0); }} className="w-[160px]">
          <option value="">All Sources</option>
          {Object.entries(SOURCE_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </Select>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search..."
          className="w-[200px]"
          onKeyDown={(e) => { if (e.key === "Enter") { setOffset(0); load(); } }}
        />

        {selected.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{selected.size} selected</span>
            <Button size="sm" onClick={() => bulkAction("approve")}>Approve</Button>
            <Button size="sm" variant="outline" onClick={() => bulkAction("reject")}>Reject</Button>
            <Button size="sm" variant="outline" onClick={() => bulkAction("delete")}>Delete</Button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-3 py-2 text-left">
                <input type="checkbox" checked={selected.size === events.length && events.length > 0} onChange={toggleAll} />
              </th>
              <th className="px-3 py-2 text-left font-medium">Title</th>
              <th className="px-3 py-2 text-left font-medium">Status</th>
              <th className="px-3 py-2 text-left font-medium">Source</th>
              <th className="px-3 py-2 text-left font-medium">Category</th>
              <th className="px-3 py-2 text-left font-medium">Location</th>
              <th className="px-3 py-2 text-left font-medium">Date</th>
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
