import { Suspense } from "react";
import { MapFilters } from "@/components/map/map-filters";
import { MapShell } from "./map-shell";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Map View",
  description: "See tech events on a map of Europe",
};

export default function MapPage() {
  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div className="relative z-1000 shrink-0 border-b bg-background px-4 py-3 sm:px-6">
        <Suspense>
          <MapFilters />
        </Suspense>
      </div>
      <div className="relative flex-1">
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
