"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface DropdownOption {
  value: string;
  label: string;
  detail?: string;
}

interface DropdownProps {
  value: string;
  options: DropdownOption[];
  placeholder: string;
  onChange: (value: string) => void;
  className?: string;
  /** Min width of the dropdown panel (trigger can be narrower) */
  panelWidth?: string;
}

export function Dropdown({
  value,
  options,
  placeholder,
  onChange,
  className,
  panelWidth,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);
  const label = selected?.label ?? placeholder;

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
        className="flex h-9 w-full items-center justify-between gap-1 rounded-md border border-input bg-background px-2.5 text-sm hover:bg-accent transition-colors"
      >
        <span className="truncate">{label}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div
          className={cn(
            "absolute left-0 top-full z-50 mt-1 max-h-64 overflow-auto rounded-lg border bg-background py-1 shadow-lg",
            panelWidth ?? "min-w-full",
          )}
        >
          {/* Reset / placeholder option */}
          <button
            type="button"
            onClick={() => { onChange(""); setOpen(false); }}
            className={cn(
              "flex w-full items-center px-3 py-1.5 text-left text-sm transition-colors hover:bg-accent",
              !value && "font-medium text-primary",
            )}
          >
            {placeholder}
          </button>
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={cn(
                "flex w-full flex-col gap-0.5 px-3 py-1.5 text-left text-sm transition-colors hover:bg-accent",
                opt.value === value && "font-medium text-primary",
              )}
            >
              <span>{opt.label}</span>
              {opt.detail && (
                <span className="text-xs text-muted-foreground">{opt.detail}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
