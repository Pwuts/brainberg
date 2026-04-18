"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "@/components/admin/admin-auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Trash2, Sparkles, Clock } from "lucide-react";
import { LocationPicker } from "@/components/admin/location-picker";
import {
  CATEGORY_LABELS, CATEGORY_COLORS, CATEGORY_DESCRIPTIONS, SOURCE_LABELS, EVENT_TYPE_LABELS,
  countryFlag, formatEventDate,
} from "@/lib/utils";

interface EventDetail {
  event: Record<string, unknown>;
  city: { name: string } | null;
  country: { code: string; name: string } | null;
  sources: { source: string; sourceId: string; sourceUrl: string | null; firstSeenAt: string; lastSeenAt: string }[];
}


export default function AdminEventDetailPage({
  params: paramsPromise,
}: {
  params: Promise<{ id: string }>;
}) {
  const { fetchAdmin } = useAdminAuth();
  const router = useRouter();
  const [data, setData] = useState<EventDetail | null>(null);
  const [id, setId] = useState<string | null>(null);

  useEffect(() => {
    paramsPromise.then((p) => setId(p.id));
  }, [paramsPromise]);

  const [pendingCount, setPendingCount] = useState<number | null>(null);

  useEffect(() => {
    if (!id) return;
    fetchAdmin(`/api/admin/events/${id}`)
      .then((r) => r.json())
      .then(setData)
      .catch(console.error);
    fetchAdmin(`/api/admin/events/next-pending?exclude=${id}`)
      .then((r) => r.json())
      .then((d) => setPendingCount(d.remaining ?? null))
      .catch(() => {});
  }, [fetchAdmin, id]);

  const [saving, setSaving] = useState<string | null>(null);
  const [remoderating, setRemoderating] = useState(false);
  const [enriching, setEnriching] = useState(false);

  const patchField = async (field: string, value: unknown) => {
    if (!id) return;
    setSaving(field);
    const body: Record<string, unknown> = { [field]: value };
    // Lock category when manually changed so re-categorize won't overwrite it
    if (field === "category") body.categoryLocked = true;
    await fetchAdmin(`/api/admin/events/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    setTimeout(() => setSaving(null), 800);
    setData((prev) =>
      prev ? { ...prev, event: { ...prev.event, [field]: value } } : prev,
    );
  };

  if (!data) return <p className="text-muted-foreground">Loading...</p>;

  const ev = data.event;
  const status = ev.status as string;
  const category = ev.category as string;
  const eventType = ev.eventType as string;

  const goToNextPending = async () => {
    const res = await fetchAdmin(`/api/admin/events/next-pending?exclude=${id}`);
    const data = await res.json();
    if (data.id) {
      router.push(`/admin/events/${data.id}`);
    } else {
      router.push("/admin/events?status=pending");
    }
  };

  const refreshEvent = async () => {
    if (!id) return;
    const refreshed = await fetchAdmin(`/api/admin/events/${id}`).then((r) => r.json());
    setData(refreshed);
  };

  const handleApprove = async () => {
    await fetchAdmin(`/api/admin/events/${id}/approve`, { method: "POST" });
    await refreshEvent();
  };

  const handleApproveNext = async () => {
    await fetchAdmin(`/api/admin/events/${id}/approve`, { method: "POST" });
    await goToNextPending();
  };

  const handleReject = async () => {
    const reason = prompt("Rejection reason (optional):");
    await fetchAdmin(`/api/admin/events/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
    await refreshEvent();
  };

  const handleRejectNext = async () => {
    await fetchAdmin(`/api/admin/events/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason: (ev.aiModerationReason as string) ?? "Rejected during review" }),
    });
    await goToNextPending();
  };

  const handleEnrichMeetup = async () => {
    if (!id) return;
    setEnriching(true);
    try {
      const res = await fetchAdmin(`/api/admin/events/${id}/enrich-meetup`, {
        method: "POST",
      });
      const result = await res.json();
      if (!res.ok) {
        alert(`Failed: ${result.message ?? result.error ?? "Unknown error"}`);
        return;
      }
      const refreshed = await fetchAdmin(`/api/admin/events/${id}`).then((r) => r.json());
      setData(refreshed);
    } finally {
      setEnriching(false);
    }
  };

  const handleRemoderate = async () => {
    if (!id) return;
    setRemoderating(true);
    try {
      const res = await fetchAdmin(`/api/admin/events/recategorize`, {
        method: "POST",
        body: JSON.stringify({ eventIds: [id], bypassLock: true }),
      });
      const result = await res.json();
      if (!res.ok) {
        alert(`Failed: ${result.message ?? result.error ?? "Unknown error"}`);
        return;
      }
      const refreshed = await fetchAdmin(`/api/admin/events/${id}`).then((r) => r.json());
      setData(refreshed);
    } finally {
      setRemoderating(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this event? This cannot be undone.")) return;
    await fetchAdmin(`/api/admin/events/${id}`, { method: "DELETE" });
    router.back();
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {saving && (
        <div className="fixed right-6 top-20 z-50 animate-in fade-in rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white shadow-lg">
          Saved
        </div>
      )}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{ev.title as string}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
              status === "approved" ? "bg-green-100 text-green-800"
              : status === "pending" ? "bg-yellow-100 text-yellow-800"
              : status === "rejected" ? "bg-red-100 text-red-800"
              : "bg-gray-100 text-gray-800"
            }`}>
              {status}{status === "pending" && pendingCount != null && pendingCount > 0 ? ` (+${pendingCount - 1})` : ""}
            </span>
            <Select
              value={category}
              onChange={(e) => patchField("category", e.target.value)}
              className={`h-auto! w-auto rounded-full py-1! px-3 text-xs font-medium ${CATEGORY_COLORS[category] ?? "bg-gray-100 text-gray-800"}`}
              title={CATEGORY_DESCRIPTIONS[category]}
            >
              {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </Select>
            <Select
              value={eventType}
              onChange={(e) => patchField("eventType", e.target.value)}
              className="h-auto! w-auto rounded-full border py-1! px-3 text-xs font-medium"
            >
              {Object.entries(EVENT_TYPE_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </Select>
            <span className="text-sm text-muted-foreground">
              via {SOURCE_LABELS[ev.source as string] ?? ev.source}
            </span>
          </div>
        </div>
        <button
          onClick={handleDelete}
          className="shrink-0 rounded-md p-2 text-muted-foreground hover:bg-red-50 hover:text-red-600"
          title="Delete event"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Details grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3">
          <h2 className="font-semibold">Details</h2>
          <dl className="flex flex-col gap-8 text-sm">
            <div className="flex flex-col gap-3">
              <Row label="Starts">
                <Input
                  type="datetime-local"
                  defaultValue={toLocalInputValue(ev.startsAt as string)}
                  onBlur={(e) => e.target.value && patchField("startsAt", new Date(e.target.value).toISOString())}
                  className="h-8 w-auto text-sm"
                />
              </Row>
              <Row label="Ends">
                <Input
                  type="datetime-local"
                  defaultValue={ev.endsAt ? toLocalInputValue(ev.endsAt as string) : ""}
                  onBlur={(e) => e.target.value ? patchField("endsAt", new Date(e.target.value).toISOString()) : undefined}
                  className="h-8 w-auto text-sm"
                />
              </Row>
              {(!!ev.startsAt || !!ev.endsAt) && (
                <Row label="" className="-my-2">
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {Intl.DateTimeFormat().resolvedOptions().timeZone}
                  </span>
                </Row>
              )}
            </div>
            <div className="flex flex-col gap-3">
              <Row label="Location">
                <LocationPicker
                  currentCity={data.city?.name ?? null}
                  currentCountry={data.country}
                  currentAddress={(ev.venueAddress as string) ?? null}
                  onPick={async (result) => {
                    setSaving("location");
                    const res = await fetchAdmin(`/api/admin/events/${id}/set-location`, {
                      method: "POST",
                      body: JSON.stringify(result),
                    });
                    if (res.ok) {
                      const refreshed = await fetchAdmin(`/api/admin/events/${id}`).then((r) => r.json());
                      setData(refreshed);
                    }
                    setTimeout(() => setSaving(null), 800);
                  }}
                />
              </Row>
              <Row label="Venue">
                <Input
                  defaultValue={String(ev.venueName ?? "")}
                  onBlur={(e) => patchField("venueName", e.target.value)}
                  placeholder="Venue name"
                  className="h-8 w-auto text-sm"
                />
              </Row>
              <Row label="Online">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!ev.isOnline}
                    onChange={(e) => {
                      patchField("isOnline", e.target.checked as unknown as string);
                      setData((prev) => prev ? { ...prev, event: { ...prev.event, isOnline: e.target.checked } } : prev);
                    }}
                  />
                  <span className="text-muted-foreground">This event is (also) online</span>
                </label>
              </Row>
            </div>
            {(!!ev.organizerName || !!ev.websiteUrl) && (
              <div className="flex flex-col gap-4">
                {ev.organizerName ? <Row label="Organizer">{String(ev.organizerName)}</Row> : null}
                {ev.websiteUrl ? (
                  <Row label="Website">
                    <a href={String(ev.websiteUrl)} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      {String(ev.websiteUrl)}
                    </a>
                  </Row>
                ) : null}
              </div>
            )}
          </dl>
        </section>

        <section className="space-y-3">
          {ev.imageUrl ? (
            <a
              href={String(ev.imageUrl)}
              target="_blank"
              rel="noopener noreferrer"
              className="block overflow-hidden rounded-lg border"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- external event images from arbitrary domains */}
              <img
                src={String(ev.imageUrl)}
                alt={ev.title as string}
                className="max-h-64 w-full object-cover"
              />
            </a>
          ) : null}
          <h2 className="font-semibold">Description</h2>
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">
            {(ev.description as string) || "No description."}
          </p>
        </section>
      </div>

      {/* Sources */}
      {data.sources.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Data Sources</h2>
            {ev.source === "dev_events"
              && !!ev.meetupUrl
              && !data.sources.some((s) => s.source === "meetup") && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleEnrichMeetup}
                disabled={enriching}
                title="Fetch additional data from the linked Meetup event"
              >
                {enriching ? "Enriching..." : "Enrich from Meetup"}
              </Button>
            )}
          </div>
          <div className="overflow-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Source</th>
                  <th className="px-4 py-2 text-left font-medium">Source ID</th>
                  <th className="px-4 py-2 text-left font-medium">URL</th>
                  <th className="px-4 py-2 text-left font-medium">First Seen</th>
                  <th className="px-4 py-2 text-left font-medium">Last Seen</th>
                </tr>
              </thead>
              <tbody>
                {data.sources.map((s) => (
                  <tr key={s.source} className="border-b last:border-0">
                    <td className="px-4 py-2">{SOURCE_LABELS[s.source] ?? s.source}</td>
                    <td className="px-4 py-2 font-mono text-xs">{s.sourceId}</td>
                    <td className="px-4 py-2">
                      {s.sourceUrl && (
                        <a href={s.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          Link
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{new Date(s.firstSeenAt).toLocaleDateString()}</td>
                    <td className="px-4 py-2 text-muted-foreground">{new Date(s.lastSeenAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Moderation card — always visible */}
      <div className={`rounded-lg border p-5 ${
          status === "approved"
            ? "border-border bg-muted/30"
            : "border-yellow-300 bg-yellow-50/60"
        }`}>
          {ev.aiModerationReason ? (
            <p className="mb-4 text-base">
              <span className={`font-semibold ${status === "approved" ? "" : "text-yellow-900"}`}>AI says: </span>
              <span className={status === "approved" ? "text-muted-foreground" : "text-yellow-800"}>{String(ev.aiModerationReason)}</span>
            </p>
          ) : null}
          {ev.rejectionReason ? (
            <p className="mb-4 text-base">
              <span className="font-semibold text-red-800">Rejection note: </span>
              <span className="text-red-700">{String(ev.rejectionReason)}</span>
            </p>
          ) : null}
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {status !== "approved" && (
                <>
                  <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white" onClick={handleApproveNext}>Approve & Next</Button>
                  <Button size="lg" className="border-green-300 text-green-700 hover:bg-green-50" variant="outline" onClick={handleApprove}>Approve</Button>
                </>
              )}
              <Button
                size="lg"
                variant="outline"
                onClick={handleRemoderate}
                disabled={remoderating}
                title="Re-run AI moderation on this event"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                {remoderating ? "Moderating..." : "Re-moderate"}
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {status !== "approved" && status !== "rejected" && (
                <>
                  <Button size="lg" className="border-red-300 text-red-700 hover:bg-red-50" variant="outline" onClick={handleReject}>Reject</Button>
                  <Button size="lg" className="bg-red-600 hover:bg-red-700 text-white" onClick={handleRejectNext}>Reject & Next</Button>
                </>
              )}
              {status === "approved" && (
                <Button size="lg" className="border-red-300 text-red-700 hover:bg-red-50" variant="outline" onClick={handleReject}>Reject</Button>
              )}
            </div>
          </div>
        </div>
      </div>
  );
}

function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function Row({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex items-center gap-3${className ? ` ${className}` : ""}`}>
      <dt className="w-20 shrink-0 text-right text-muted-foreground">{label}</dt>
      <dd className="min-w-0 flex-1">{children}</dd>
    </div>
  );
}
