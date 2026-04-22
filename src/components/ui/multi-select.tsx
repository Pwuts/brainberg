"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface MultiSelectOption {
  value: string;
  label: string;
  detail?: string;
}

interface MultiSelectProps {
  values: string[];
  options: MultiSelectOption[];
  placeholder: string;
  onChange: (values: string[]) => void;
  className?: string;
  /** Width of the dropdown panel (trigger can be narrower) */
  panelWidth?: string;
}

export function MultiSelect({
  values,
  options,
  placeholder,
  onChange,
  className,
  panelWidth,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.filter((o) => values.includes(o.value));
  const label =
    selected.length === 0
      ? placeholder
      : selected.length === 1
        ? selected[0].label
        : `${selected.length} selected`;

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

  const toggle = (v: string) => {
    onChange(values.includes(v) ? values.filter((x) => x !== v) : [...values, v]);
  };

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-9 w-full items-center justify-between gap-1 rounded-md border border-input bg-background px-2.5 text-sm hover:bg-accent transition-colors"
      >
        <span className="truncate">{label}</span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div
          className={cn(
            "absolute left-0 top-full z-50 mt-1 max-h-[70vh] overflow-auto rounded-lg border bg-background py-1 shadow-lg",
            panelWidth ?? "min-w-full",
          )}
        >
          {selected.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="flex w-full items-center px-3 py-1.5 text-left text-sm text-muted-foreground transition-colors hover:bg-accent"
            >
              Clear selection
            </button>
          )}
          {options.map((opt) => {
            const checked = values.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggle(opt.value)}
                className={cn(
                  "flex w-full items-start gap-2 px-3 py-1.5 text-left text-sm transition-colors hover:bg-accent",
                  checked && "font-medium",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                    checked
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input",
                  )}
                >
                  {checked && <Check className="h-3 w-3" />}
                </span>
                <span className="flex flex-col gap-0.5">
                  <span>{opt.label}</span>
                  {opt.detail && (
                    <span className="text-xs text-muted-foreground">{opt.detail}</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
