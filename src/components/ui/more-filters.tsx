"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import { SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface MoreFiltersProps {
  children: ReactNode;
  activeCount?: number;
  className?: string;
}

// Popover width in px — must match the `w-[...]` class below.
const MAX_POPOVER_WIDTH = 320; // 20rem
// Matches the page content's `px-4` padding so the popover doesn't
// get closer to the viewport edge than the content itself.
const VIEWPORT_MARGIN = 16;

function computePosition(buttonRect: DOMRect): { top: number; left: number } {
  const vw = window.innerWidth;
  const w = Math.min(vw - 2 * VIEWPORT_MARGIN, MAX_POPOVER_WIDTH);
  // Start centered on the button
  const ideal = (buttonRect.left + buttonRect.right) / 2 - w / 2;
  // Clamp so popover fully contains the button horizontally:
  //   popover.left  ≤ button.left   → left ≤ button.left
  //   popover.right ≥ button.right  → left ≥ button.right - w
  // and stays within the viewport margins.
  const minLeft = Math.max(VIEWPORT_MARGIN, buttonRect.right - w);
  const maxLeft = Math.min(vw - w - VIEWPORT_MARGIN, buttonRect.left);
  const left = Math.max(minLeft, Math.min(maxLeft, ideal));
  return { top: buttonRect.bottom + 4, left };
}

export function MoreFilters({ children, activeCount = 0, className }: MoreFiltersProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleToggle = () => {
    if (!open && buttonRef.current) {
      setPos(computePosition(buttonRef.current.getBoundingClientRect()));
    }
    setOpen(!open);
  };

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleReposition() {
      if (buttonRef.current) {
        setPos(computePosition(buttonRef.current.getBoundingClientRect()));
      }
    }
    document.addEventListener("mousedown", handleClick);
    window.addEventListener("scroll", handleReposition, true);
    window.addEventListener("resize", handleReposition);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      window.removeEventListener("scroll", handleReposition, true);
      window.removeEventListener("resize", handleReposition);
    };
  }, [open]);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
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
        <div
          style={{ top: pos.top, left: pos.left }}
          className="fixed z-50 flex w-[min(calc(100vw-2rem),20rem)] flex-col gap-2 rounded-lg border bg-background p-3 shadow-lg [&>*]:w-full [&_button]:w-full"
        >
          {children}
        </div>
      )}
    </div>
  );
}
