"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import { SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface MoreFiltersProps {
  children: ReactNode;
  activeCount?: number;
  className?: string;
}

export function MoreFilters({ children, activeCount = 0, className }: MoreFiltersProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border px-2.5 text-sm transition-colors",
          activeCount > 0
            ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
            : "border-input bg-background hover:bg-accent",
        )}
      >
        <SlidersHorizontal className="h-3.5 w-3.5" />
        <span>Filters</span>
        {activeCount > 0 && (
          <span className="ml-0.5 rounded-full bg-background/25 px-1.5 text-xs leading-5">
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 flex w-64 flex-col gap-2 rounded-lg border bg-background p-3 shadow-lg [&>*]:w-full [&_button]:w-full">
          {children}
        </div>
      )}
    </div>
  );
}
