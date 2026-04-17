import Link from "next/link";
import Markdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import { Calendar, MapPin, Users, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  CATEGORY_DESCRIPTIONS,
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
    <Card className="group relative flex flex-col overflow-hidden transition-all hover:shadow-md hover:border-primary/20">
      <Link href={`/events/${event.slug}`} className="block flex-1 p-5">
        {/* Badges */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge className={categoryColor} title={CATEGORY_DESCRIPTIONS[event.category]}>{categoryLabel}</Badge>
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

        {/* Location — directly below title */}
        {(city || country) && (
          <p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            {city?.name}
            {city && country && ", "}
            {country && (
              <span>{countryFlag(country.code)} {country.name}</span>
            )}
          </p>
        )}

        {/* Description excerpt */}
        {event.description && (
          <div className="mt-3 text-sm text-muted-foreground line-clamp-2 prose prose-sm prose-p:m-0 prose-p:leading-snug max-w-none">
            <Markdown remarkPlugins={[remarkBreaks]}>{event.description}</Markdown>
          </div>
        )}

        {/* Date + size row */}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            {formatEventDate(event.startsAt, event.endsAt, event.timezone)}
          </span>
          {event.size && (
            <span className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              {SIZE_LABELS[event.size] ?? event.size}
            </span>
          )}
        </div>
      </Link>

      {/* External link — outside <Link> to avoid nested <a> */}
      {event.websiteUrl && (
        <a
          href={event.websiteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute right-5 top-5 z-10 shrink-0 rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      )}
    </Card>
  );
}
