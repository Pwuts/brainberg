import { Card, CardContent } from "@/components/ui/card";
import { Globe } from "lucide-react";

export const metadata = { title: "Map View" };

export default function MapPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight">Map View</h1>
      <p className="mt-1 text-muted-foreground">
        See tech events on a map of Europe
      </p>
      <Card className="mt-8">
        <CardContent className="flex flex-col items-center justify-center py-24">
          <Globe className="h-16 w-16 text-muted-foreground/40" />
          <p className="mt-4 text-lg font-medium text-muted-foreground">
            Map view coming soon
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Interactive Leaflet + OpenStreetMap integration is on the roadmap.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
