"use client";

import { useState, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { PanelLeftClose, PanelLeftOpen, GripVertical, ChevronUp } from "lucide-react";
import { EventCard } from "@/components/events/event-card";
import { cn } from "@/lib/utils";
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

export function MapShell() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_WIDTH);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [visibleEvents, setVisibleEvents] = useState<MapEvent[]>([]);
  const dragging = useRef(false);

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
      <div className="relative flex-1">
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

        {/* Mobile bottom drawer (peek bar always visible; tap to expand) */}
        <div
          className={cn(
            "absolute inset-x-0 bottom-0 z-1000 flex h-[65vh] flex-col rounded-t-2xl border-t bg-background shadow-2xl transition-transform duration-300 md:hidden",
            mobileDrawerOpen ? "translate-y-0" : "translate-y-[calc(65vh-3rem)]",
          )}
        >
          <button
            onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
            className="flex h-12 shrink-0 touch-none items-center justify-between border-b px-4 text-left"
          >
            <span className="text-sm font-medium">{headerLabel}</span>
            <ChevronUp
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                mobileDrawerOpen && "rotate-180",
              )}
            />
          </button>
          <div className="flex-1 overflow-y-auto overscroll-contain">{eventList}</div>
        </div>
      </div>
    </div>
  );
}
