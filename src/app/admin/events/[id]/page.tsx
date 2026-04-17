"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "@/components/admin/admin-auth-provider";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import {
  CATEGORY_LABELS, CATEGORY_COLORS, SOURCE_LABELS, EVENT_TYPE_LABELS,
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

  useEffect(() => {
    if (!id) return;
    fetchAdmin(`/api/admin/events/${id}`)
      .then((r) => r.json())
      .then(setData)
      .catch(console.error);
  }, [fetchAdmin, id]);

  const patchField = async (field: string, value: string) => {
    if (!id) return;
    await fetchAdmin(`/api/admin/events/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ [field]: value }),
    });
    setData((prev) =>
      prev ? { ...prev, event: { ...prev.event, [field]: value } } : prev,
    );
  };

  if (!data) return <p className="text-muted-foreground">Loading...</p>;

  const ev = data.event;
  const status = ev.status as string;
  const category = ev.category as string;
  const eventType = ev.eventType as string;

  const handleApprove = async () => {
    await fetchAdmin(`/api/admin/events/${id}/approve`, { method: "POST" });
    router.push("/admin/events");
  };

  const handleReject = async () => {
    const reason = prompt("Rejection reason (optional):");
    await fetchAdmin(`/api/admin/events/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
    router.push("/admin/events");
  };

  const handleDelete = async () => {
    if (!confirm("Delete this event? This cannot be undone.")) return;
    await fetchAdmin(`/api/admin/events/${id}`, { method: "DELETE" });
    router.push("/admin/events");
  };

  return (
    <div className="space-y-6">
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
              {status}
            </span>
            <Select
              value={category}
              onChange={(e) => patchField("category", e.target.value)}
              className={`!h-auto w-auto rounded-full !py-1 px-3 text-xs font-medium ${CATEGORY_COLORS[category] ?? "bg-gray-100 text-gray-800"}`}
            >
              {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </Select>
            <Select
              value={eventType}
              onChange={(e) => patchField("eventType", e.target.value)}
              className="!h-auto w-auto rounded-full border !py-1 px-3 text-xs font-medium"
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
        <div className="flex gap-2">
          {status !== "approved" && (
            <Button onClick={handleApprove}>Approve</Button>
          )}
          {status !== "rejected" && (
            <Button variant="outline" onClick={handleReject}>Reject</Button>
          )}
          <Button variant="outline" onClick={handleDelete}>Delete</Button>
        </div>
      </div>

      {/* Details grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3">
          <h2 className="font-semibold">Details</h2>
          <dl className="space-y-2 text-sm">
            <Row label="Date">
              {formatEventDate(
                new Date(ev.startsAt as string),
                ev.endsAt ? new Date(ev.endsAt as string) : null,
                ev.timezone as string,
              )}
            </Row>
            <Row label="Location">
              {data.city?.name}
              {data.country ? ` ${countryFlag(data.country.code)} ${data.country.name}` : ""}
              {ev.isOnline ? " (Online)" : ""}
            </Row>
            {ev.venueName ? <Row label="Venue">{String(ev.venueName)}</Row> : null}
            {ev.organizerName ? <Row label="Organizer">{String(ev.organizerName)}</Row> : null}
            {ev.websiteUrl ? (
              <Row label="Website">
                <a href={String(ev.websiteUrl)} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  {String(ev.websiteUrl)}
                </a>
              </Row>
            ) : null}
          </dl>
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold">Description</h2>
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">
            {(ev.description as string) || "No description."}
          </p>
        </section>
      </div>

      {/* Sources */}
      {data.sources.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold">Data Sources</h2>
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
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <dt className="w-24 shrink-0 text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
