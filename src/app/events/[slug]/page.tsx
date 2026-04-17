import { notFound } from "next/navigation";
import { Metadata } from "next";
import Link from "next/link";
import {
  Calendar,
  MapPin,
  Users,
  ExternalLink,
  ArrowLeft,
  Globe,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getEventBySlug } from "@/lib/events";
import Markdown from "react-markdown";
import {
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  EVENT_TYPE_LABELS,
  SIZE_LABELS,
  countryFlag,
  formatEventDate,
} from "@/lib/utils";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getEventBySlug(slug);
  if (!result) return { title: "Event Not Found" };

  const { event, city, country } = result;
  const location = [city?.name, country?.name].filter(Boolean).join(", ");

  return {
    title: event.title,
    description:
      event.description?.slice(0, 160) ??
      `${event.title} — ${location}`,
    openGraph: {
      title: event.title,
      description: event.description?.slice(0, 160) ?? undefined,
      ...(event.imageUrl && { images: [event.imageUrl] }),
    },
  };
}

export default async function EventPage({ params }: PageProps) {
  const { slug } = await params;
  const result = await getEventBySlug(slug);
  if (!result) notFound();

  const { event, city, country } = result;
  const categoryColor =
    CATEGORY_COLORS[event.category] ?? "bg-gray-100 text-gray-800";
  const categoryLabel =
    CATEGORY_LABELS[event.category] ?? event.category;
  const typeLabel = EVENT_TYPE_LABELS[event.eventType] ?? event.eventType;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Back link */}
      <Link
        href="/events"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to events
      </Link>

      {/* Header image */}
      {event.imageUrl && (
        <div className="mb-6 overflow-hidden rounded-xl">
          <img
            src={event.imageUrl}
            alt={event.title}
            className="h-64 w-full object-cover sm:h-80"
          />
        </div>
      )}

      {/* Badges */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
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
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        {event.title}
      </h1>

      {/* Meta info */}
      <div className="mt-4 grid gap-3 text-muted-foreground sm:grid-cols-2">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 shrink-0" />
          <span>{formatEventDate(event.startsAt, event.endsAt, event.timezone)}</span>
        </div>
        {(city || country) && (
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0" />
            <span>
              {city?.name}
              {city && country && ", "}
              {country && `${countryFlag(country.code)} ${country.name}`}
            </span>
          </div>
        )}
        {event.size && (
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 shrink-0" />
            <span>{SIZE_LABELS[event.size] ?? event.size} attendees</span>
          </div>
        )}
        {event.venueName && (
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 shrink-0" />
            <span>{event.venueName}{event.venueAddress ? ` · ${event.venueAddress}` : ""}</span>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="mt-6 flex flex-wrap gap-3">
        {event.websiteUrl && (
          <a href={event.websiteUrl} target="_blank" rel="noopener noreferrer">
            <Button>
              <ExternalLink className="mr-2 h-4 w-4" />
              Event Website
            </Button>
          </a>
        )}
        {event.registrationUrl && (
          <a
            href={event.registrationUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline">Register</Button>
          </a>
        )}
      </div>

      {/* Description */}
      {event.description && (
        <Card className="mt-8">
          <CardContent className="p-6">
            <h2 className="mb-3 text-lg font-semibold">About this event</h2>
            <div className="prose prose-sm max-w-none text-muted-foreground">
              <Markdown>{event.description}</Markdown>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Source info */}
      {event.sourceUrl && (
        <p className="mt-6 text-xs text-muted-foreground">
          Source:{" "}
          <a
            href={event.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            {event.source ?? "External"}
          </a>
        </p>
      )}
    </div>
  );
}
