"use client";

import { Fragment, useState, useEffect, useRef } from "react";
import { Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";

type DatePreset =
  | "anytime"
  | "today"
  | "this-week"
  | "next-7"
  | "next-14"
  | "next-30"
  | "next-3-months"
  | "next-6-months"
  | "next-12-months"
  | "custom";

// Top row is calendar-anchored; the rest are rolling forward windows.
// "Future events" spans the top and serves as the no-filter default.
type PresetCell = { value: DatePreset; label: string } | null;
const PRESET_ROWS: [PresetCell, PresetCell][] = [
  [
    { value: "today", label: "Today" },
    { value: "this-week", label: "This week" },
  ],
  [
    { value: "next-7", label: "Next 7 days" },
    { value: "next-14", label: "Next 2 weeks" },
  ],
  [
    { value: "next-30", label: "Next 30 days" },
    { value: "next-3-months", label: "Next 3 months" },
  ],
  [
    { value: "next-6-months", label: "Next 6 months" },
    { value: "next-12-months", label: "Next 12 months" },
  ],
];

const ANYTIME_PRESET = { value: "anytime" as const, label: "Future events" };
const ALL_PRESETS = [
  ANYTIME_PRESET,
  ...PRESET_ROWS.flat().filter((p): p is NonNullable<PresetCell> => p !== null),
];

function getPresetRange(preset: DatePreset): { from: string; to: string } {
  const now = new Date();
  // Local-time YYYY-MM-DD — paired with `tzo` in the URL so the server
  // resolves the bounds in the caller's timezone.
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const addDays = (n: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() + n);
    return d;
  };

  const addMonths = (n: number) => {
    const d = new Date(now);
    d.setMonth(d.getMonth() + n);
    return d;
  };

  switch (preset) {
    case "anytime":
    case "custom":
      return { from: "", to: "" };
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
    case "next-7":
      return { from: fmt(now), to: fmt(addDays(7)) };
    case "next-14":
      return { from: fmt(now), to: fmt(addDays(14)) };
    case "next-30":
      return { from: fmt(now), to: fmt(addDays(30)) };
    case "next-3-months":
      return { from: fmt(now), to: fmt(addMonths(3)) };
    case "next-6-months":
      return { from: fmt(now), to: fmt(addMonths(6)) };
    case "next-12-months":
      return { from: fmt(now), to: fmt(addMonths(12)) };
  }
}

const DEFAULT_PRESET: DatePreset = "next-14";
const STORAGE_KEY = "brainberg-date-preset";

function loadPreset(): DatePreset {
  if (typeof window === "undefined") return DEFAULT_PRESET;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && ALL_PRESETS.some((p) => p.value === stored))
    return stored as DatePreset;
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
  // Both empty = "anytime" (no date filter). We detect it rather than
  // returning null, so the UI shows "Future events" instead of falling
  // through to whatever's in localStorage.
  return "anytime";
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
  /**
   * When true (default), on first mount with no URL params the filter
   * auto-applies the last-used preset from localStorage (or
   * DEFAULT_PRESET). When false, the filter leaves the URL alone and
   * renders as "Future events" — used on topical landing pages where a
   * remembered 2-week window would unexpectedly hide most events.
   */
  autoApplyStoredPreset?: boolean;
}

export function DateRangeFilter({
  from,
  to,
  onChange,
  autoApplyStoredPreset = true,
}: DateRangeFilterProps) {
  const [open, setOpen] = useState(false);
  const [preset, setPreset] = useState<DatePreset>(DEFAULT_PRESET);
  const ref = useRef<HTMLDivElement>(null);
  const appliedDefault = useRef(false);

  // Derive preset from current URL params. detectPreset now covers the
  // (empty, empty) case as "anytime", so no localStorage fallback is
  // needed for display.
  const derivedPreset = detectPreset(from, to) ?? "anytime";
  if (derivedPreset !== preset) {
    setPreset(derivedPreset);
  }

  // On mount: if no date params in URL, apply the stored/default preset
  // unless the caller opted out.
  useEffect(() => {
    if (appliedDefault.current) return;
    appliedDefault.current = true;
    if (!autoApplyStoredPreset) return;
    if (from || to) return;
    const saved = loadPreset();
    const range = getPresetRange(saved);
    onChange(range.from, range.to);
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
          {/* "Future events" — full-width, acts as "clear date filter" */}
          <button
            type="button"
            onClick={() => selectPreset("anytime")}
            className={`mb-0.5 w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
              preset === "anytime"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-accent"
            }`}
          >
            Future events
          </button>

          {/* Presets — two columns. Rows may have one null cell (the
              last row with an odd preset count), which renders as a
              placeholder to keep the grid balanced. */}
          <div className="grid grid-cols-2 gap-0.5">
            {PRESET_ROWS.map(([left, right], i) => (
              <Fragment key={i}>
                {left ? (
                  <PresetButton
                    cell={left}
                    selected={preset === left.value}
                    onSelect={selectPreset}
                  />
                ) : (
                  <span />
                )}
                {right ? (
                  <PresetButton
                    cell={right}
                    selected={preset === right.value}
                    onSelect={selectPreset}
                  />
                ) : (
                  <span />
                )}
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

function PresetButton({
  cell,
  selected,
  onSelect,
}: {
  cell: NonNullable<PresetCell>;
  selected: boolean;
  onSelect: (p: DatePreset) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(cell.value)}
      className={`rounded-md px-3 py-2 text-left text-sm transition-colors ${
        selected ? "bg-primary text-primary-foreground" : "hover:bg-accent"
      }`}
    >
      {cell.label}
    </button>
  );
}
