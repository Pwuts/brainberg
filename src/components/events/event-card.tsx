import Link from "next/link";
import { Calendar, MapPin, Users, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  EVENT_TYPE_LABELS,
  SIZE_LABELS,
  countryFlag,
  formatEventDate,
} from "@/lib/utils";

interface EventCardProps {
  event: {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    startsAt: Date;
    endsAt: Date | null;
    timezone: string;
    category: string;
    eventType: string;
    size: string | null;
    isFree: boolean;
    isOnline: boolean;
    websiteUrl: string | null;
    imageUrl: string | null;
  };
  city: { name: string; slug: string } | null;
  country: { name: string; code: string } | null;
}

export function EventCard({ event, city, country }: EventCardProps) {
  const categoryColor =
    CATEGORY_COLORS[event.category] ?? "bg-gray-100 text-gray-800";
  const categoryLabel =
    CATEGORY_LABELS[event.category] ?? event.category;
  const typeLabel = EVENT_TYPE_LABELS[event.eventType] ?? event.eventType;

  return (
    <Card className="group relative overflow-hidden transition-all hover:shadow-md hover:border-primary/20">
      <Link href={`/events/${event.slug}`} className="block p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {/* Category + Type badges */}
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge className={categoryColor}>{categoryLabel}</Badge>
              <Badge variant="outline">{typeLabel}</Badge>
              {event.isFree && (
                <Badge className="bg-green-100 text-green-800">Free</Badge>
              )}
              {event.isOnline && (
                <Badge className="bg-sky-100 text-sky-800">Online</Badge>
              )}
            </div>

            {/* Title */}
            <h3 className="text-lg font-semibold leading-tight group-hover:text-primary transition-colors">
              {event.title}
            </h3>

            {/* Description excerpt */}
            {event.description && (
              <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">
                {event.description}
              </p>
            )}

            {/* Meta row */}
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                {formatEventDate(event.startsAt, event.endsAt, event.timezone)}
              </span>
              {(city || country) && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  {city?.name}
                  {city && country && ", "}
                  {country && (
                    <span>
                      {countryFlag(country.code)} {country.name}
                    </span>
                  )}
                </span>
              )}
              {event.size && (
                <span className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  {SIZE_LABELS[event.size] ?? event.size}
                </span>
              )}
            </div>
          </div>

          {/* External link icon */}
          {event.websiteUrl && (
            <a
              href={event.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>
      </Link>
    </Card>
  );
}
