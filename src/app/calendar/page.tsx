import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "lucide-react";
import { buildMetadata } from "@/lib/metadata";

export const metadata = buildMetadata({
  title: "Calendar View",
  description:
    "Upcoming tech events across Europe in a month-at-a-glance calendar.",
  path: "/calendar",
});

export default function CalendarPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight">Calendar View</h1>
      <p className="mt-1 text-muted-foreground">
        See upcoming events on a calendar
      </p>
      <Card className="mt-8">
        <CardContent className="flex flex-col items-center justify-center py-24">
          <Calendar className="h-16 w-16 text-muted-foreground/40" />
          <p className="mt-4 text-lg font-medium text-muted-foreground">
            Calendar view coming soon
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Monthly and weekly calendar views are on the roadmap.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
