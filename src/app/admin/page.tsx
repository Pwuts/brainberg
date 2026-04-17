"use client";

import { useEffect, useState } from "react";
import { useAdminAuth } from "@/components/admin/admin-auth-provider";
import { StatsCard } from "@/components/admin/stats-card";
import { SOURCE_LABELS } from "@/lib/utils";

interface Stats {
  byStatus: Record<string, number>;
  bySource: Record<string, number>;
  byCategory: Record<string, number>;
  recentRuns: {
    id: string;
    source: string;
    status: string;
    eventsFound: number;
    eventsCreated: number;
    eventsUpdated: number;
    eventsDeduplicated: number;
    startedAt: string;
    completedAt: string | null;
    errorMessage: string | null;
  }[];
  eventsThisWeek: number;
}

export default function AdminDashboard() {
  const { fetchAdmin } = useAdminAuth();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetchAdmin("/api/admin/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(console.error);
  }, [fetchAdmin]);

  if (!stats) {
    return <p className="text-muted-foreground">Loading...</p>;
  }

  const totalEvents = Object.values(stats.byStatus).reduce((a, b) => a + b, 0);
  const approved = stats.byStatus.approved ?? 0;
  const pending = stats.byStatus.pending ?? 0;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard label="Total Events" value={totalEvents} />
        <StatsCard label="Approved" value={approved} />
        <StatsCard label="Pending Review" value={pending} />
        <StatsCard label="Added This Week" value={stats.eventsThisWeek} />
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Events by Source</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(stats.bySource).map(([source, count]) => (
            <StatsCard
              key={source}
              label={SOURCE_LABELS[source] ?? source}
              value={count}
            />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Recent Scraper Runs</h2>
        {stats.recentRuns.length === 0 ? (
          <p className="text-sm text-muted-foreground">No runs yet.</p>
        ) : (
          <div className="overflow-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Source</th>
                  <th className="px-4 py-2 text-left font-medium">Status</th>
                  <th className="px-4 py-2 text-right font-medium">Found</th>
                  <th className="px-4 py-2 text-right font-medium">Created</th>
                  <th className="px-4 py-2 text-right font-medium">Updated</th>
                  <th className="px-4 py-2 text-right font-medium">Deduped</th>
                  <th className="px-4 py-2 text-left font-medium">Started</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentRuns.map((run) => (
                  <tr key={run.id} className="border-b last:border-0">
                    <td className="px-4 py-2">{SOURCE_LABELS[run.source] ?? run.source}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          run.status === "completed"
                            ? "bg-green-100 text-green-800"
                            : run.status === "failed"
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {run.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">{run.eventsFound}</td>
                    <td className="px-4 py-2 text-right">{run.eventsCreated}</td>
                    <td className="px-4 py-2 text-right">{run.eventsUpdated}</td>
                    <td className="px-4 py-2 text-right">{run.eventsDeduplicated}</td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {new Date(run.startedAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
