"use client";

import { useEffect, useState, useCallback, FormEvent } from "react";
import { useAdminAuth } from "@/components/admin/admin-auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import { SOURCE_LABELS, CATEGORY_LABELS } from "@/lib/utils";

interface LumaSource {
  id: number;
  name: string;
  url: string;
  isActive: boolean;
  lastScrapedAt: string | null;
  eventsFound: number;
}

interface MicrodataSource {
  id: number;
  name: string;
  url: string;
  isActive: boolean;
  lastScrapedAt: string | null;
  eventsFound: number;
  defaultCategory: string | null;
  config: {
    extraction?: "microdata" | "jsonld";
    itemtype?: string;
    fallbacks?: {
      cityName?: string;
      countryCode?: string;
      venueName?: string;
      venueAddress?: string;
      timezone?: string;
    };
  } | null;
}

interface MicrodataForm {
  name: string;
  url: string;
  extraction: "microdata" | "jsonld";
  itemtype: string;
  cityName: string;
  countryCode: string;
  venueName: string;
  venueAddress: string;
  defaultCategory: string;
}

const EMPTY_MICRODATA_FORM: MicrodataForm = {
  name: "",
  url: "",
  extraction: "microdata",
  itemtype: "https://schema.org/Event",
  cityName: "",
  countryCode: "",
  venueName: "",
  venueAddress: "",
  defaultCategory: "",
};

interface ScraperRun {
  id: string;
  source: string;
  status: string;
  eventsFound: number;
  eventsCreated: number;
  eventsUpdated: number;
  eventsDeduplicated: number;
  progress: number;
  progressDetail: string | null;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
}

export default function AdminScrapersPage() {
  const { fetchAdmin } = useAdminAuth();
  const [scrapers, setScrapers] = useState<string[]>([]);
  const [runs, setRuns] = useState<ScraperRun[]>([]);
  const [running, setRunning] = useState<string | null>(null);
  const [lumaSources, setLumaSources] = useState<LumaSource[]>([]);
  const [lumaInput, setLumaInput] = useState("");
  const [lumaAdding, setLumaAdding] = useState(false);
  const [lumaError, setLumaError] = useState<string | null>(null);
  const [microdataSources, setMicrodataSources] = useState<MicrodataSource[]>([]);
  const [microdataForm, setMicrodataForm] = useState<MicrodataForm>(EMPTY_MICRODATA_FORM);
  const [microdataAdding, setMicrodataAdding] = useState(false);
  const [microdataError, setMicrodataError] = useState<string | null>(null);
  const [backfilling, setBackfilling] = useState(false);

  const load = useCallback(async () => {
    const [scrapersRes, lumaRes, microdataRes] = await Promise.all([
      fetchAdmin("/api/admin/scrapers"),
      fetchAdmin("/api/admin/scrapers/sources?type=luma"),
      fetchAdmin("/api/admin/scrapers/sources?type=microdata"),
    ]);
    const scrapersData = await scrapersRes.json();
    const lumaData = await lumaRes.json();
    const microdataData = await microdataRes.json();
    setScrapers(scrapersData.scrapers ?? []);
    setRuns(scrapersData.runs ?? []);
    setLumaSources(lumaData.sources ?? []);
    setMicrodataSources(microdataData.sources ?? []);
  }, [fetchAdmin]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  // Poll for progress while any scraper is running (works across page reloads)
  const hasRunning = running !== null || runs.some((r) => r.status === "running");
  useEffect(() => {
    if (!hasRunning) return;
    const interval = setInterval(async () => {
      const res = await fetchAdmin("/api/admin/scrapers");
      const data = await res.json();
      setRuns(data.runs ?? []);
    }, 2000);
    return () => clearInterval(interval);
  }, [hasRunning, fetchAdmin]);

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
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={backfilling}
            onClick={async () => {
              setBackfilling(true);
              try {
                const res = await fetchAdmin("/api/admin/events/backfill-eventbrite-descriptions", {
                  method: "POST",
                });
                const data = await res.json();
                if (!res.ok) {
                  alert(`Failed: ${data.error ?? "Unknown"}`);
                  return;
                }
                alert(`Processed ${data.total}: ${data.updated} updated, ${data.unchanged} unchanged, ${data.failed} failed`);
              } catch {
                alert("Request dropped (likely proxy timeout). Backfill continues in the background — re-click later to see 0 remaining.");
              } finally {
                setBackfilling(false);
              }
            }}
          >
            {backfilling ? "Backfilling..." : "Backfill Eventbrite Descriptions"}
          </Button>
          <Button
            variant="outline"
            onClick={async () => {
              const res = await fetchAdmin("/api/admin/events/recategorize", {
                method: "POST",
                body: JSON.stringify({}),
              });
              const data = await res.json();
              const mode = data.mode === "ai" ? "AI" : "regex";
              const parts = [`${data.categoriesChanged} categories`, `${data.typesChanged} types`];
              if (data.statusesChanged) parts.push(`${data.statusesChanged} statuses`);
              alert(`[${mode}] ${parts.join(", ")} updated (${data.total} events, ${data.skippedLocked} locked)`);
            }}
          >
            Re-categorize All
          </Button>
          <Button onClick={runAll} disabled={running !== null}>
            {running === "all" ? "Running All..." : "Run All Scrapers"}
          </Button>
        </div>
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
              {lastRun && lastRun.status === "running" && (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{lastRun.progressDetail ?? "Starting..."}</span>
                    <span>{lastRun.progress}%</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full rounded-full bg-muted">
                    <div
                      className="h-1.5 rounded-full bg-primary transition-all"
                      style={{ width: `${lastRun.progress}%` }}
                    />
                  </div>
                </div>
              )}
              {lastRun && lastRun.status !== "running" && (
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
                  disabled={running !== null}
                >
                  {running === s ? "Running..." : "Run Now"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Luma Subscriptions */}
      <LumaSubscriptions
        sources={lumaSources}
        input={lumaInput}
        setInput={setLumaInput}
        adding={lumaAdding}
        error={lumaError}
        onAdd={async (e: FormEvent) => {
          e.preventDefault();
          if (!lumaInput.trim()) return;
          setLumaAdding(true);
          setLumaError(null);
          try {
            const res = await fetchAdmin("/api/admin/scrapers/sources", {
              method: "POST",
              body: JSON.stringify({ url: lumaInput }),
            });
            const data = await res.json();
            if (!res.ok) {
              setLumaError(data.error ?? "Failed to add");
            } else {
              setLumaInput("");
              await load();
            }
          } catch {
            setLumaError("Network error");
          } finally {
            setLumaAdding(false);
          }
        }}
        onDelete={async (id: number) => {
          await fetchAdmin(`/api/admin/scrapers/sources/${id}`, { method: "DELETE" });
          await load();
        }}
        onToggle={async (id: number, isActive: boolean) => {
          await fetchAdmin(`/api/admin/scrapers/sources/${id}`, {
            method: "PATCH",
            body: JSON.stringify({ isActive }),
          });
          await load();
        }}
      />

      {/* Microdata Sources */}
      <MicrodataSources
        sources={microdataSources}
        form={microdataForm}
        setForm={setMicrodataForm}
        adding={microdataAdding}
        error={microdataError}
        onAdd={async (e: FormEvent) => {
          e.preventDefault();
          if (!microdataForm.url.trim() || !microdataForm.name.trim()) return;
          setMicrodataAdding(true);
          setMicrodataError(null);
          try {
            const res = await fetchAdmin("/api/admin/scrapers/sources/microdata", {
              method: "POST",
              body: JSON.stringify({
                ...microdataForm,
                defaultCategory: microdataForm.defaultCategory || undefined,
              }),
            });
            const data = await res.json();
            if (!res.ok) {
              setMicrodataError(data.error ?? "Failed to add");
            } else {
              setMicrodataForm(EMPTY_MICRODATA_FORM);
              await load();
            }
          } catch {
            setMicrodataError("Network error");
          } finally {
            setMicrodataAdding(false);
          }
        }}
        onDelete={async (id: number) => {
          await fetchAdmin(`/api/admin/scrapers/sources/${id}`, { method: "DELETE" });
          await load();
        }}
        onToggle={async (id: number, isActive: boolean) => {
          await fetchAdmin(`/api/admin/scrapers/sources/${id}`, {
            method: "PATCH",
            body: JSON.stringify({ isActive }),
          });
          await load();
        }}
      />

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
                      {run.status === "running" ? `${run.progress}%` : run.status}
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
                    No runs yet. Click {'"'}Run Now{'"'} on a scraper to start.
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

// ============================================================
// Luma Subscriptions sub-component
// ============================================================

function LumaSubscriptions({
  sources,
  input,
  setInput,
  adding,
  error,
  onAdd,
  onDelete,
  onToggle,
}: {
  sources: LumaSource[];
  input: string;
  setInput: (v: string) => void;
  adding: boolean;
  error: string | null;
  onAdd: (e: FormEvent) => void;
  onDelete: (id: number) => void;
  onToggle: (id: number, isActive: boolean) => void;
}) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">Luma Subscriptions</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Add Luma organizer calendars to automatically import their events.
      </p>

      {/* Add form */}
      <form onSubmit={onAdd} className="mb-4 flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="luma.com/organizer-slug"
          className="max-w-sm"
          disabled={adding}
        />
        <Button type="submit" disabled={adding || !input.trim()}>
          {adding ? "Adding..." : "Add Calendar"}
        </Button>
      </form>
      {error && (
        <p className="mb-4 text-sm text-red-600">{error}</p>
      )}

      {/* Sources list */}
      {sources.length > 0 ? (
        <div className="overflow-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Name</th>
                <th className="px-4 py-2 text-left font-medium">Slug</th>
                <th className="px-4 py-2 text-right font-medium">Events</th>
                <th className="px-4 py-2 text-left font-medium">Last Scraped</th>
                <th className="px-4 py-2 text-center font-medium">Active</th>
                <th className="px-4 py-2 text-center font-medium" />
              </tr>
            </thead>
            <tbody>
              {sources.map((s) => (
                <tr key={s.id} className="border-b last:border-0">
                  <td className="px-4 py-2 font-medium">{s.name}</td>
                  <td className="px-4 py-2">
                    <a
                      href={`https://lu.ma/${s.url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {s.url}
                    </a>
                  </td>
                  <td className="px-4 py-2 text-right">{s.eventsFound}</td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {s.lastScrapedAt
                      ? new Date(s.lastScrapedAt).toLocaleString()
                      : "Never"}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <button
                      onClick={() => onToggle(s.id, !s.isActive)}
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        s.isActive
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {s.isActive ? "Active" : "Paused"}
                    </button>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <button
                      onClick={() => onDelete(s.id)}
                      className="rounded p-1 text-muted-foreground hover:bg-red-50 hover:text-red-600"
                      title="Remove"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
          No Luma calendars added yet. Paste an organizer URL above to get started.
        </div>
      )}
    </section>
  );
}

// ============================================================
// Microdata Sources sub-component
// ============================================================

function MicrodataSources({
  sources,
  form,
  setForm,
  adding,
  error,
  onAdd,
  onDelete,
  onToggle,
}: {
  sources: MicrodataSource[];
  form: MicrodataForm;
  setForm: (v: MicrodataForm) => void;
  adding: boolean;
  error: string | null;
  onAdd: (e: FormEvent) => void;
  onDelete: (id: number) => void;
  onToggle: (id: number, isActive: boolean) => void;
}) {
  const update = (patch: Partial<MicrodataForm>) => setForm({ ...form, ...patch });
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">Microdata &amp; JSON-LD Sources</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Add any page that publishes Schema.org Event data — microdata
        (<code className="rounded bg-muted px-1 text-xs">itemprop</code>) or JSON-LD
        (<code className="rounded bg-muted px-1 text-xs">&lt;script type=&quot;application/ld+json&quot;&gt;</code>).
        Fallback fields are used when the source doesn&apos;t carry that data (e.g. all Waag events are at the same venue).
      </p>

      {/* Add form */}
      <form onSubmit={onAdd} className="mb-4 grid gap-2 rounded-lg border p-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs font-medium sm:col-span-2">
          URL
          <Input
            value={form.url}
            onChange={(e) => update({ url: e.target.value })}
            placeholder="https://example.org/events/"
            disabled={adding}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium">
          Display name
          <Input
            value={form.name}
            onChange={(e) => update({ name: e.target.value })}
            placeholder="Waag Future Lab"
            disabled={adding}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium">
          Extraction
          <Select
            value={form.extraction}
            onChange={(e) => update({ extraction: e.target.value as "microdata" | "jsonld" })}
            disabled={adding}
          >
            <option value="microdata">Microdata (itemprop)</option>
            <option value="jsonld">JSON-LD (script tag)</option>
          </Select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium sm:col-span-2">
          Itemtype / @type substring
          <Input
            value={form.itemtype}
            onChange={(e) => update({ itemtype: e.target.value })}
            placeholder="https://schema.org/Event"
            disabled={adding}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium">
          Fallback city
          <Input
            value={form.cityName}
            onChange={(e) => update({ cityName: e.target.value })}
            placeholder="Amsterdam"
            disabled={adding}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium">
          Fallback country (ISO-2)
          <Input
            value={form.countryCode}
            onChange={(e) => update({ countryCode: e.target.value.toUpperCase().slice(0, 2) })}
            placeholder="NL"
            disabled={adding}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium">
          Fallback venue name
          <Input
            value={form.venueName}
            onChange={(e) => update({ venueName: e.target.value })}
            placeholder="Waag Futurelab"
            disabled={adding}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium">
          Fallback venue address
          <Input
            value={form.venueAddress}
            onChange={(e) => update({ venueAddress: e.target.value })}
            placeholder="Nieuwmarkt 4, 1012 CR Amsterdam"
            disabled={adding}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium sm:col-span-2">
          Default category
          <Select
            value={form.defaultCategory}
            onChange={(e) => update({ defaultCategory: e.target.value })}
            disabled={adding}
          >
            <option value="">— infer from title —</option>
            {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </Select>
        </label>
        <div className="sm:col-span-2">
          <Button type="submit" disabled={adding || !form.url.trim() || !form.name.trim()}>
            {adding ? "Adding..." : "Add source"}
          </Button>
        </div>
      </form>
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {/* Sources list */}
      {sources.length > 0 ? (
        <div className="overflow-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Name</th>
                <th className="px-4 py-2 text-left font-medium">URL</th>
                <th className="px-4 py-2 text-left font-medium">Extraction</th>
                <th className="px-4 py-2 text-right font-medium">Events</th>
                <th className="px-4 py-2 text-left font-medium">Last Scraped</th>
                <th className="px-4 py-2 text-center font-medium">Active</th>
                <th className="px-4 py-2 text-center font-medium" />
              </tr>
            </thead>
            <tbody>
              {sources.map((s) => (
                <tr key={s.id} className="border-b last:border-0">
                  <td className="px-4 py-2 font-medium">{s.name}</td>
                  <td className="max-w-[280px] truncate px-4 py-2">
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {s.url}
                    </a>
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">
                    {s.config?.extraction ?? "microdata"}
                  </td>
                  <td className="px-4 py-2 text-right">{s.eventsFound}</td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {s.lastScrapedAt ? new Date(s.lastScrapedAt).toLocaleString() : "Never"}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <button
                      onClick={() => onToggle(s.id, !s.isActive)}
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        s.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {s.isActive ? "Active" : "Paused"}
                    </button>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <button
                      onClick={() => onDelete(s.id)}
                      className="rounded p-1 text-muted-foreground hover:bg-red-50 hover:text-red-600"
                      title="Remove"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
          No microdata sources added yet. Add one above to start scraping.
        </div>
      )}
    </section>
  );
}
