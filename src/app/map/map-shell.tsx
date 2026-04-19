"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { PanelLeftClose, PanelLeftOpen, GripVertical } from "lucide-react";
import { EventCard } from "@/components/events/event-card";
import type { MapEvent } from "@/lib/events";

const EventMap = dynamic(
  () => import("@/components/map/event-map").then((m) => m.EventMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Loading map...
      </div>
    ),
  }
);

const MIN_WIDTH = 280;
const MAX_WIDTH_RATIO = 0.5;
const DEFAULT_WIDTH = 420;

// Mobile drawer
const PEEK_PX = 64;
const HEADER_PX = 64; // sticky header height — keep handle below it
const SNAP_TO_CLOSE_THRESHOLD_PX = 100;
const TAP_THRESHOLD_PX = 6;
const SNAP_TRANSITION = "transform 250ms cubic-bezier(0.32, 0.72, 0, 1)";

export function MapShell() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_WIDTH);
  const [visibleEvents, setVisibleEvents] = useState<MapEvent[]>([]);
  const dragging = useRef(false);

  // Drawer state lives in refs to avoid re-rendering during drag (which would
  // re-render the entire event-card list and cause stutter).
  const drawerRef = useRef<HTMLDivElement>(null);
  const drawerYRef = useRef<number | null>(null);
  const drawerDragRef = useRef<{
    startPointerY: number;
    startDrawerY: number;
    moved: boolean;
  } | null>(null);

  const onDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;

    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
      const maxW = window.innerWidth * MAX_WIDTH_RATIO;
      setSidebarWidth(Math.min(maxW, Math.max(MIN_WIDTH, ev.clientX)));
    };
    const onUp = () => {
      dragging.current = false;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, []);

  // Initialize drawer at peek and keep it valid across viewport changes.
  useEffect(() => {
    const setPeek = () => {
      const el = drawerRef.current;
      if (!el) return;
      const peekY = window.innerHeight - PEEK_PX;
      // If never set, or was at peek, stay at peek. Otherwise clamp to new bounds.
      const current = drawerYRef.current;
      const target =
        current === null || current >= peekY - 1
          ? peekY
          : Math.max(HEADER_PX, Math.min(peekY, current));
      drawerYRef.current = target;
      el.style.transition = "none";
      el.style.transform = `translateY(${target}px)`;
      // Re-enable transition next frame so subsequent snaps animate.
      requestAnimationFrame(() => {
        if (el) el.style.transition = SNAP_TRANSITION;
      });
    };
    setPeek();
    window.addEventListener("resize", setPeek);
    window.addEventListener("orientationchange", setPeek);
    return () => {
      window.removeEventListener("resize", setPeek);
      window.removeEventListener("orientationchange", setPeek);
    };
  }, []);

  const onDrawerPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse") return; // mobile-only
    const el = drawerRef.current;
    if (!el || drawerYRef.current === null) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawerDragRef.current = {
      startPointerY: e.clientY,
      startDrawerY: drawerYRef.current,
      moved: false,
    };
    el.style.transition = "none";
  };

  const onDrawerPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = drawerDragRef.current;
    const el = drawerRef.current;
    if (!drag || !el) return;
    const delta = e.clientY - drag.startPointerY;
    if (Math.abs(delta) > TAP_THRESHOLD_PX) drag.moved = true;
    const peekY = window.innerHeight - PEEK_PX;
    const newY = Math.max(HEADER_PX, Math.min(peekY, drag.startDrawerY + delta));
    drawerYRef.current = newY;
    el.style.transform = `translateY(${newY}px)`;
  };

  const onDrawerPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = drawerDragRef.current;
    const el = drawerRef.current;
    if (!drag || !el) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    const peekY = window.innerHeight - PEEK_PX;
    const currentY = drawerYRef.current ?? peekY;

    el.style.transition = SNAP_TRANSITION;

    if (!drag.moved) {
      // Tap on handle — open to ~half if currently at peek; otherwise snap closed.
      const isAtPeek = currentY >= peekY - 1;
      const targetY = isAtPeek ? Math.round(window.innerHeight * 0.35) : peekY;
      drawerYRef.current = targetY;
      el.style.transform = `translateY(${targetY}px)`;
    } else if (peekY - currentY < SNAP_TO_CLOSE_THRESHOLD_PX) {
      // Released near closed — snap to peek.
      drawerYRef.current = peekY;
      el.style.transform = `translateY(${peekY}px)`;
    }
    // Otherwise stay exactly where released — no further movement.

    drawerDragRef.current = null;
  };

  const eventList =
    visibleEvents.length === 0 ? (
      <p className="px-4 py-8 text-center text-sm text-muted-foreground">
        No events in the current view. Try zooming out or panning.
      </p>
    ) : (
      <div className="space-y-3 p-3">
        {visibleEvents.map((event) => (
          <EventCard
            key={event.id}
            event={{
              id: event.id,
              title: event.title,
              slug: event.slug,
              description: event.description,
              startsAt: new Date(event.startsAt),
              endsAt: event.endsAt ? new Date(event.endsAt) : null,
              timezone: event.timezone,
              category: event.category,
              eventType: event.eventType,
              size: event.size,
              isFree: event.isFree,
              isOnline: event.isOnline,
              websiteUrl: null,
              imageUrl: null,
            }}
            city={event.cityName ? { name: event.cityName, slug: "" } : null}
            country={event.countryCode ? { name: event.countryName ?? "", code: event.countryCode } : null}
          />
        ))}
      </div>
    );

  const headerLabel = `${visibleEvents.length} event${visibleEvents.length !== 1 ? "s" : ""} in view`;

  return (
    <div className="flex h-full">
      {/* Desktop sidebar */}
      {sidebarOpen && (
        <>
          <div
            className="hidden h-full shrink-0 flex-col overflow-hidden bg-background md:flex"
            style={{ width: sidebarWidth }}
          >
            <div className="flex items-center justify-between border-b px-4 py-2">
              <span className="text-sm font-medium">{headerLabel}</span>
              <button
                onClick={() => setSidebarOpen(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                title="Close sidebar"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">{eventList}</div>
          </div>

          {/* Drag handle (desktop only) */}
          <div
            onMouseDown={onDragStart}
            className="hidden w-2 shrink-0 cursor-col-resize items-center justify-center border-r bg-background hover:bg-accent transition-colors md:flex"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
        </>
      )}

      {/* Map */}
      <div className="relative flex-1 overflow-hidden">
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="absolute left-3 top-3 z-1000 hidden rounded-md border bg-background p-1.5 shadow-md hover:bg-accent md:block"
            title="Open sidebar"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        )}
        <EventMap onVisibleEventsChange={setVisibleEvents} />
      </div>

      {/* Mobile bottom drawer — drag freely; snap to peek only when nearly closed */}
      <div
        ref={drawerRef}
        className="fixed inset-x-0 top-0 z-1000 flex h-screen flex-col rounded-t-2xl border-t bg-background shadow-2xl will-change-transform md:hidden"
        style={{ transform: `translateY(calc(100vh - ${PEEK_PX}px))` }}
      >
        <div
          onPointerDown={onDrawerPointerDown}
          onPointerMove={onDrawerPointerMove}
          onPointerUp={onDrawerPointerUp}
          onPointerCancel={onDrawerPointerUp}
          className="shrink-0 touch-none cursor-grab active:cursor-grabbing"
        >
          <div className="mx-auto my-2 h-1.5 w-12 rounded-full bg-muted-foreground/30" />
          <div className="flex h-10 items-center border-b px-4">
            <span className="text-sm font-medium">{headerLabel}</span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain">{eventList}</div>
      </div>
    </div>
  );
}
