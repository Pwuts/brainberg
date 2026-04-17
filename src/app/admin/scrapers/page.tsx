"use client";

import { useEffect, useState, useCallback } from "react";
import { useAdminAuth } from "@/components/admin/admin-auth-provider";
import { Button } from "@/components/ui/button";
import { SOURCE_LABELS } from "@/lib/utils";

interface ScraperRun {
  id: string;
  source: string;
  status: string;
  eventsFound: number;
  eventsCreated: number;
  eventsUpdated: number;
  eventsDeduplicated: number;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
}

export default function AdminScrapersPage() {
  const { fetchAdmin } = useAdminAuth();
  const [scrapers, setScrapers] = useState<string[]>([]);
  const [runs, setRuns] = useState<ScraperRun[]>([]);
  const [running, setRunning] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetchAdmin("/api/admin/scrapers");
    const data = await res.json();
    setScrapers(data.scrapers ?? []);
    setRuns(data.runs ?? []);
  }, [fetchAdmin]);

  useEffect(() => { load(); }, [load]);

  const runAll = async () => {
    setRunning("all");
    try {
      await fetchAdmin("/api/admin/scrapers/run-all", { method: "POST" });
      await load();
    } catch (err) {
      console.error(err);
    } finally {
      setRunning(null);
    }
  };

  const runNow = async (source: string) => {
    setRunning(source);
    try {
      await fetchAdmin("/api/admin/scrapers/run", {
        method: "POST",
        body: JSON.stringify({ source }),
      });
      await load();
    } catch (err) {
      console.error(err);
    } finally {
      setRunning(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Scrapers</h1>
        <Button onClick={runAll} disabled={running !== null}>
          {running === "all" ? "Running All..." : "Run All Scrapers"}
        </Button>
      </div>

      {/* Scraper cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {scrapers.map((s) => {
          const lastRun = runs.find((r) => r.source === s);
          return (
            <div key={s} className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{SOURCE_LABELS[s] ?? s}</h3>
                {lastRun && (
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    lastRun.status === "completed" ? "bg-green-100 text-green-800"
                    : lastRun.status === "failed" ? "bg-red-100 text-red-800"
                    : "bg-yellow-100 text-yellow-800"
                  }`}>
                    {lastRun.status}
                  </span>
                )}
              </div>
              {lastRun && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Last: {new Date(lastRun.startedAt).toLocaleString()}
                  {lastRun.status === "completed" && (
                    <> — {lastRun.eventsCreated} new, {lastRun.eventsUpdated} updated</>
                  )}
                </p>
              )}
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  onClick={() => runNow(s)}
                  disabled={running === s}
                >
                  {running === s ? "Running..." : "Run Now"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Run history */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Run History</h2>
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
                <th className="px-4 py-2 text-left font-medium">Error</th>
                <th className="px-4 py-2 text-left font-medium">Started</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.id} className="border-b last:border-0">
                  <td className="px-4 py-2">{SOURCE_LABELS[run.source] ?? run.source}</td>
                  <td className="px-4 py-2">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      run.status === "completed" ? "bg-green-100 text-green-800"
                      : run.status === "failed" ? "bg-red-100 text-red-800"
                      : "bg-yellow-100 text-yellow-800"
                    }`}>
                      {run.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">{run.eventsFound}</td>
                  <td className="px-4 py-2 text-right">{run.eventsCreated}</td>
                  <td className="px-4 py-2 text-right">{run.eventsUpdated}</td>
                  <td className="px-4 py-2 text-right">{run.eventsDeduplicated}</td>
                  <td className="max-w-[200px] truncate px-4 py-2 text-red-600">
                    {run.errorMessage ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {new Date(run.startedAt).toLocaleString()}
                  </td>
                </tr>
              ))}
              {runs.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                    No runs yet. Click "Run Now" on a scraper to start.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
