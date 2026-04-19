"use client";

import { Fragment, useState, useEffect, useRef } from "react";
import { Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";

type DatePreset =
  | "today" | "this-week" | "this-month" | "this-year"
  | "next-7" | "next-14" | "next-30" | "next-6-months"
  | "custom";

// Left column: calendar-anchored ranges. Right column: rolling windows.
const PRESET_ROWS: [
  { value: DatePreset; label: string },
  { value: DatePreset; label: string },
][] = [
  [{ value: "today", label: "Today" },           { value: "next-14", label: "Next 2 Weeks" }],
  [{ value: "this-week", label: "This Week" },    { value: "next-7", label: "Next 7 Days" }],
  [{ value: "this-month", label: "This Month" },  { value: "next-30", label: "Next 30 Days" }],
  [{ value: "this-year", label: "This Year" },    { value: "next-6-months", label: "Next 6 Months" }],
];

const ALL_PRESETS = PRESET_ROWS.flat();

function getPresetRange(preset: DatePreset): { from: string; to: string } {
  const now = new Date();
  // Local-time YYYY-MM-DD — paired with `tzo` in the URL so the server
  // resolves the bounds in the caller's timezone.
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const addDays = (n: number) => { const d = new Date(now); d.setDate(d.getDate() + n); return d; };

  switch (preset) {
    case "today":
      return { from: fmt(now), to: fmt(now) };
    case "this-week": {
      const day = now.getDay();
      const monday = new Date(now);
      monday.setDate(now.getDate() - ((day + 6) % 7));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return { from: fmt(monday), to: fmt(sunday) };
    }
    case "this-month": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { from: fmt(start), to: fmt(end) };
    }
    case "this-year": {
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear(), 11, 31);
      return { from: fmt(start), to: fmt(end) };
    }
    case "next-7":
      return { from: fmt(now), to: fmt(addDays(7)) };
    case "next-14":
      return { from: fmt(now), to: fmt(addDays(14)) };
    case "next-30":
      return { from: fmt(now), to: fmt(addDays(30)) };
    case "next-6-months": {
      const end = new Date(now);
      end.setMonth(end.getMonth() + 6);
      return { from: fmt(now), to: fmt(end) };
    }
    case "custom":
      return { from: "", to: "" };
  }
}

const DEFAULT_PRESET: DatePreset = "next-14";
const STORAGE_KEY = "brainberg-date-preset";

function loadPreset(): DatePreset {
  if (typeof window === "undefined") return DEFAULT_PRESET;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && ALL_PRESETS.some((p) => p.value === stored)) return stored as DatePreset;
  return DEFAULT_PRESET;
}

function savePreset(preset: DatePreset) {
  if (typeof window === "undefined") return;
  if (preset === "custom") {
    localStorage.removeItem(STORAGE_KEY);
  } else {
    localStorage.setItem(STORAGE_KEY, preset);
  }
}

function detectPreset(from: string, to: string): DatePreset | null {
  for (const p of ALL_PRESETS) {
    const range = getPresetRange(p.value);
    if (range.from === from && range.to === to) return p.value;
  }
  if (from || to) return "custom";
  return null; // no date params — caller should apply default
}

function formatLabel(preset: DatePreset, from: string, to: string): string {
  const match = ALL_PRESETS.find((p) => p.value === preset);
  if (match) return match.label;
  if (from && to) return `${from} – ${to}`;
  if (from) return `From ${from}`;
  if (to) return `Until ${to}`;
  return "Custom Range";
}

interface DateRangeFilterProps {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}

export function DateRangeFilter({ from, to, onChange }: DateRangeFilterProps) {
  const [open, setOpen] = useState(false);
  const [preset, setPreset] = useState<DatePreset>(DEFAULT_PRESET);
  const ref = useRef<HTMLDivElement>(null);
  const appliedDefault = useRef(false);

  // Derive preset from current URL params (replaces sync effects)
  const derivedPreset = (() => {
    const detected = detectPreset(from, to);
    if (detected) return detected;
    return loadPreset();
  })();
  if (derivedPreset !== preset) {
    setPreset(derivedPreset);
  }

  // On mount: if no date params in URL, apply the stored/default preset
  useEffect(() => {
    if (appliedDefault.current) return;
    appliedDefault.current = true;
    const detected = detectPreset(from, to);
    if (!detected) {
      const saved = loadPreset();
      const range = getPresetRange(saved);
      onChange(range.from, range.to);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function selectPreset(p: DatePreset) {
    setPreset(p);
    savePreset(p);
    const range = getPresetRange(p);
    onChange(range.from, range.to);
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-9 items-center gap-2 rounded-md border border-input bg-background px-2.5 text-sm hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span>{formatLabel(preset, from, to)}</span>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-80 rounded-lg border bg-background p-1 shadow-lg">
          {/* Presets — two columns */}
          <div className="grid grid-cols-2 gap-0.5">
            {PRESET_ROWS.map(([left, right]) => (
              <Fragment key={left.value}>
                <button
                  type="button"
                  onClick={() => selectPreset(left.value)}
                  className={`rounded-md px-3 py-2 text-left text-sm transition-colors ${
                    preset === left.value
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent"
                  }`}
                >
                  {left.label}
                </button>
                <button
                  type="button"
                  onClick={() => selectPreset(right.value)}
                  className={`rounded-md px-3 py-2 text-left text-sm transition-colors ${
                    preset === right.value
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent"
                  }`}
                >
                  {right.label}
                </button>
              </Fragment>
            ))}
          </div>

          {/* Divider */}
          <div className="my-1 border-t" />

          {/* Custom range */}
          <div className="px-3 py-2">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Custom Range
            </p>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm">
                <span className="w-10 shrink-0 text-muted-foreground">From</span>
                <Input
                  type="date"
                  value={from}
                  onChange={(e) => {
                    setPreset("custom");
                    onChange(e.target.value, to);
                  }}
                  className="h-9"
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <span className="w-10 shrink-0 text-muted-foreground">To</span>
                <Input
                  type="date"
                  value={to}
                  onChange={(e) => {
                    setPreset("custom");
                    onChange(from, e.target.value);
                  }}
                  className="h-9"
                />
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
