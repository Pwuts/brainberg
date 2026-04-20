import { Suspense } from "react";
import { MapFilters } from "@/components/map/map-filters";
import { MapShell } from "./map-shell";
import { buildMetadata } from "@/lib/metadata";

export const dynamic = "force-dynamic";

export const metadata = buildMetadata({
  title: "Map View",
  description: "See tech events on a map of Europe",
  path: "/map",
});

export default function MapPage() {
  return (
    <div className="flex h-[calc(100vh-4rem-1px)] flex-col overflow-hidden">
      <div className="relative z-1000 shrink-0 border-b bg-background">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <Suspense>
            <MapFilters />
          </Suspense>
        </div>
      </div>
      <div className="relative min-h-0 flex-1">
        <Suspense
          fallback={
            <div className="flex h-full items-center justify-center text-muted-foreground">
              Loading map...
            </div>
          }
        >
          <MapShell />
        </Suspense>
      </div>
    </div>
  );
}
