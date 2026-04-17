import { EventCard } from "./event-card";
import type { events, cities, countries } from "@/lib/db/schema";

interface EventRow {
  event: typeof events.$inferSelect;
  city: typeof cities.$inferSelect | null;
  country: typeof countries.$inferSelect | null;
}

interface EventListProps {
  title: string;
  events: EventRow[];
}

export function EventList({
  title,
  events,
}: EventListProps) {
  if (events.length === 0) {
    return null;
  }

  return (
    <section>
      <h2 className="mb-4 text-xl font-semibold tracking-tight">{title}</h2>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {events.map((row) => (
          <EventCard
            key={row.event.id}
            event={row.event}
            city={row.city}
            country={row.country}
          />
        ))}
      </div>
    </section>
  );
}
