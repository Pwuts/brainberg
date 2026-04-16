import { EventCard } from "./event-card";

interface EventRow {
  event: any;
  city: any;
  country: any;
}

interface EventListProps {
  title: string;
  events: EventRow[];
  emptyMessage?: string;
}

export function EventList({
  title,
  events,
  emptyMessage = "No events found",
}: EventListProps) {
  if (events.length === 0) {
    return null;
  }

  return (
    <section>
      <h2 className="mb-4 text-xl font-semibold tracking-tight">{title}</h2>
      <div className="space-y-3">
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
