"use client";

import dynamic from "next/dynamic";

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

export function MapShell() {
  return <EventMap />;
}
