import { Card, CardContent } from "@/components/ui/card";
import { Send } from "lucide-react";
import { buildMetadata } from "@/lib/metadata";

export const metadata = buildMetadata({
  title: "Submit an Event",
  description:
    "Know a tech event in Europe we don't have yet? Submit it to Brainberg.",
  path: "/events/submit",
});

export default function SubmitEventPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight">Submit an Event</h1>
      <p className="mt-1 text-muted-foreground">
        Know about a tech event in Europe? Let us know!
      </p>
      <Card className="mt-8">
        <CardContent className="flex flex-col items-center justify-center py-24">
          <Send className="h-16 w-16 text-muted-foreground/40" />
          <p className="mt-4 text-lg font-medium text-muted-foreground">
            Event submission coming soon
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Magic-link authentication and event submission form are on the roadmap.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
