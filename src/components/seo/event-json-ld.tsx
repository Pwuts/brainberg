import type { cities, countries } from "@/lib/db/schema";
import type { PublicEvent } from "@/lib/events";
import { SITE_URL } from "@/lib/metadata";

interface EventJsonLDProps {
  event: PublicEvent;
  city: typeof cities.$inferSelect | null;
  country: typeof countries.$inferSelect | null;
}

const MAX_DESCRIPTION_LENGTH = 1000;

export function EventJsonLD({ event, city, country }: EventJsonLDProps) {
  const jsonLD = buildEventJsonLD(event, city, country);
  return (
    <script
      type="application/ld+json"
      // JSON.stringify escapes </script> safely; the payload is
      // server-constructed from trusted DB fields.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLD) }}
    />
  );
}

function buildEventJsonLD(
  event: PublicEvent,
  city: typeof cities.$inferSelect | null,
  country: typeof countries.$inferSelect | null,
): Record<string, unknown> {
  const url = `${SITE_URL}/events/${event.slug}`;
  const image = event.imageUrl ?? `${url}/opengraph-image`;
  const description = plainTextSnippet(event.description ?? event.shortDescription);

  const virtualLocation = (event.isOnline || event.isHybrid)
    ? virtualLocationNode(event)
    : null;
  const physicalLocation = (!event.isOnline || event.isHybrid)
    ? physicalLocationNode(event, city, country)
    : null;
  const locationNodes = [physicalLocation, virtualLocation].filter(Boolean);
  const location = locationNodes.length === 1 ? locationNodes[0] : locationNodes;

  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    ...(description ? { description } : {}),
    startDate: event.startsAt.toISOString(),
    ...(event.endsAt ? { endDate: event.endsAt.toISOString() } : {}),
    eventAttendanceMode: attendanceMode(event),
    eventStatus: "https://schema.org/EventScheduled",
    location,
    image: [image],
    url,
    ...(event.organizerName
      ? {
          organizer: {
            "@type": "Organization",
            name: event.organizerName,
            ...(event.organizerUrl ? { url: event.organizerUrl } : {}),
          },
        }
      : {}),
    ...offersNode(event),
    isAccessibleForFree: event.isFree,
  };
}

function attendanceMode(event: PublicEvent): string {
  if (event.isHybrid) return "https://schema.org/MixedEventAttendanceMode";
  if (event.isOnline) return "https://schema.org/OnlineEventAttendanceMode";
  return "https://schema.org/OfflineEventAttendanceMode";
}

function virtualLocationNode(event: PublicEvent) {
  const virtualUrl = event.onlineUrl ?? event.websiteUrl ?? event.registrationUrl ?? event.sourceUrl;
  return {
    "@type": "VirtualLocation",
    ...(virtualUrl ? { url: virtualUrl } : {}),
  };
}

function physicalLocationNode(
  event: PublicEvent,
  city: typeof cities.$inferSelect | null,
  country: typeof countries.$inferSelect | null,
) {
  const address: Record<string, string> = { "@type": "PostalAddress" };
  if (event.venueAddress) address.streetAddress = event.venueAddress;
  if (city?.name) address.addressLocality = city.name;
  if (country?.code) address.addressCountry = country.code;

  return {
    "@type": "Place",
    name: event.venueName ?? city?.name ?? country?.name ?? "Europe",
    address,
  };
}

function offersNode(event: PublicEvent): Record<string, unknown> {
  const ticketUrl = event.registrationUrl ?? event.websiteUrl ?? event.sourceUrl;
  if (!ticketUrl) return {};

  // Only emit offers when we know the price. Google accepts "0" for free
  // events; unknown-price paid events are best left without an Offer node
  // than fabricated with a guess.
  let price: string | null = null;
  if (event.isFree) price = "0";
  else if (event.priceFrom != null) price = String(event.priceFrom);
  if (price === null) return {};

  return {
    offers: {
      "@type": "Offer",
      price,
      priceCurrency: event.currency ?? "EUR",
      availability: "https://schema.org/InStock",
      url: ticketUrl,
      validFrom: event.createdAt.toISOString(),
    },
  };
}

function plainTextSnippet(input: string | null | undefined): string | null {
  if (!input) return null;
  // Strip markdown/HTML minimally — Google's Event rich-result docs say
  // "Don't use HTML tags". Full markdown parsing is overkill for a snippet,
  // so we drop the most common syntax markers and collapse whitespace.
  const stripped = input
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")        // images
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")     // links → link text
    .replace(/<[^>]+>/g, "")                      // HTML tags
    .replace(/[*_`>#~]+/g, "")                    // markdown emphasis/headings
    .replace(/\s+/g, " ")
    .trim();
  if (!stripped) return null;
  return stripped.length > MAX_DESCRIPTION_LENGTH
    ? stripped.slice(0, MAX_DESCRIPTION_LENGTH - 1) + "\u2026"
    : stripped;
}
