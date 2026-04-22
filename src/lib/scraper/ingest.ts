import { db } from "@/lib/db";
import { events, eventSources, eventFingerprints } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import slugify from "slugify";
import { resolveLocation, geocodeAddress } from "./city-resolver";
import { checkDuplicate } from "./dedup";
import { normalizeUrl } from "./url-utils";
import { exactFingerprint } from "./fingerprint";
import { NON_TECH_REGEX } from "./category-map";
import { moderateEvent } from "./ai-moderate";
import type { NormalizedEvent, IngestStats } from "./types";

function makeSlug(title: string, date: Date, suffix?: string): string {
  const dateStr = date.toISOString().slice(0, 10);
  const parts = [title, dateStr];
  if (suffix) parts.push(suffix);
  return slugify(parts.join(" "), { lower: true, strict: true }).slice(0, 350);
}

/** Ingest a stream of normalized events: resolve locations, dedup, insert/update. */
export async function ingestEvents(
  stream: AsyncGenerator<NormalizedEvent>,
): Promise<IngestStats> {
  const stats: IngestStats = {
    found: 0,
    created: 0,
    updated: 0,
    deduplicated: 0,
    rejected: 0,
    pending: 0,
    errors: 0,
  };

  for await (const event of stream) {
    stats.found++;
    try {
      await ingestOne(event, stats);
    } catch (err) {
      stats.errors++;
      console.error(`[ingest] Error processing "${event.title}":`, err);
    }
  }

  return stats;
}

async function ingestOne(event: NormalizedEvent, stats: IngestStats) {
  // Normalize whitespace: sources occasionally ship titles with a leading
  // space or non-breaking space, which sorts before all letters and pushes
  // such events to the top of title-sorted admin views.
  event.title = event.title.replace(/\s+/g, " ").trim();

  // Filter out non-tech events across all sources
  if (NON_TECH_REGEX.test(event.title)) return;

  // Skip in-person events obviously outside Europe based on supplied coords.
  // Box is lat 27°–72°, lng -32° to 45° — covers mainland Europe plus the
  // Azores (west), Canary Islands (south-west), Cyprus (south-east), and the
  // Caucasus (east). Intentionally loose so legitimate edge-of-Europe events
  // pass; per-scraper country filters are the primary defense, this is just
  // a last-resort catch for coordinates obviously far away.
  if (!event.isOnline && typeof event.latitude === "number" && typeof event.longitude === "number") {
    const lat = event.latitude;
    const lng = event.longitude;
    const inEurope = lat >= 27 && lat <= 72 && lng >= -32 && lng <= 45;
    if (!inEurope) {
      console.log(`[ingest] Rejecting non-European event "${event.title}" at (${lat}, ${lng}) from ${event.source}`);
      return;
    }
  }

  // 1. Resolve location
  const location = await resolveLocation(event.cityName, event.countryCode);

  // 1b. Geocode venue address for precise coordinates
  let eventLat = event.latitude ?? location.latitude;
  let eventLng = event.longitude ?? location.longitude;
  if (!event.latitude && event.venueAddress) {
    const precise = await geocodeAddress(event.venueAddress, event.cityName, event.countryCode);
    if (precise) {
      eventLat = precise.latitude;
      eventLng = precise.longitude;
    }
  }

  // 2. Check for duplicates
  const dedup = await checkDuplicate(event);

  if (dedup.existingEventId) {
    stats.deduplicated++;
    console.log(`[dedup] Layer ${dedup.matchLayer}: "${event.title}" (${event.source}) → existing ${dedup.existingEventId}`);

    // Always update the eventSources junction
    await upsertEventSource(dedup.existingEventId, event);

    // Always record fingerprints from this source so future scrapes can
    // dedup via URLs/titles this source knows about even if the priority
    // check below skips the field update.
    await createFingerprints(dedup.existingEventId, event);

    // Update existing event if new source has higher priority
    if (dedup.shouldUpdate) {
      await updateExistingEvent(dedup.existingEventId, event, location, eventLat, eventLng);
      stats.updated++;
    }

    return;
  }

  // 3. AI moderation (only for new events, skipped if no API key)
  let finalCategory = event.category;
  let finalEventType = event.eventType;
  let status: "approved" | "pending" | "rejected" = "approved";
  let moderatedByAI = false;
  let aiModerationReason: string | null = null;

  const moderation = await moderateEvent(event);
  if (moderation) {
    moderatedByAI = true;
    aiModerationReason = moderation.reason;

    if (moderation.category) finalCategory = moderation.category;
    if (moderation.eventType) finalEventType = moderation.eventType;

    if (moderation.decision === "reject") {
      status = "rejected";
      stats.rejected++;
      console.log(`[ai-moderate] Rejected: "${event.title}" — ${moderation.reason}`);
    } else if (moderation.decision === "pending") {
      status = "pending";
      stats.pending++;
      console.log(`[ai-moderate] Pending: "${event.title}" — ${moderation.reason}`);
    }
  }

  // Auto-reject any non-approved event that has already ended — no point
  // spending human moderation time on events that have already passed.
  if (status !== "approved") {
    const endTime = event.endsAt ?? event.startsAt;
    if (endTime < new Date()) {
      if (status === "pending") stats.pending--;
      status = "rejected";
      stats.rejected++;
      aiModerationReason = aiModerationReason
        ? `${aiModerationReason} (auto-rejected: event already passed)`
        : "Auto-rejected: event already passed";
      console.log(`[ingest] Auto-rejected (passed): "${event.title}"`);
    }
  }

  // 4. Insert new event
  const slug = makeSlug(event.title, event.startsAt, event.cityName);

  const values = {
    title: event.title,
    slug,
    description: event.description,
    shortDescription: event.shortDescription,
    category: finalCategory,
    eventType: finalEventType,
    size: event.size,
    tags: event.tags,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    timezone: event.timezone ?? location.timezone,
    isMultiDay: event.isMultiDay ?? false,
    cityId: location.cityId,
    countryId: location.countryId,
    venueName: event.venueName,
    venueAddress: event.venueAddress,
    latitude: eventLat,
    longitude: eventLng,
    isOnline: event.isOnline,
    isHybrid: event.isHybrid ?? false,
    onlineUrl: event.onlineUrl,
    websiteUrl: event.websiteUrl,
    registrationUrl: event.registrationUrl,
    lumaUrl: event.lumaUrl,
    eventbriteUrl: event.eventbriteUrl,
    meetupUrl: event.meetupUrl,
    confsTechUrl: event.confsTechUrl,
    devEventsUrl: event.devEventsUrl,
    imageUrl: event.imageUrl,
    thumbnailUrl: event.thumbnailUrl,
    isFree: event.isFree ?? true,
    priceFrom: event.priceFrom,
    priceTo: event.priceTo,
    currency: event.currency ?? "EUR",
    status,
    source: event.source,
    sourceId: event.sourceId,
    sourceUrl: event.sourceUrl,
    organizerName: event.organizerName,
    organizerUrl: event.organizerUrl,
    organizerEmail: event.organizerEmail,
    moderatedByAI,
    aiModerationReason,
  };

  let inserted: { id: string };
  try {
    [inserted] = await db.insert(events).values(values).returning({ id: events.id });
  } catch (err: unknown) {
    // Slug collision = same title + date + city → treat as duplicate
    if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "23505") {
      const existing = await db
        .select({ id: events.id })
        .from(events)
        .where(eq(events.slug, slug))
        .limit(1);

      if (existing.length > 0) {
        console.log(`[dedup] Layer slug: "${event.title}" (${event.source}) → existing ${existing[0].id} (slug: ${slug})`);
        await upsertEventSource(existing[0].id, event);
        stats.deduplicated++;
        return;
      }
      console.error(`[dedup] Unique constraint violation on non-slug column for "${event.title}":`, (err as { detail?: string }).detail);
      throw err;
    }
    throw err;
  }

  // 4. Create fingerprints
  await createFingerprints(inserted.id, event);

  // 5. Create event source record
  await upsertEventSource(inserted.id, event);

  stats.created++;
}

async function updateExistingEvent(
  eventId: string,
  event: NormalizedEvent,
  location: Awaited<ReturnType<typeof resolveLocation>>,
  eventLat?: number | null,
  eventLng?: number | null,
) {
  // Called only when dedup.shouldUpdate is true (new source has priority ≥
  // existing), so we can overwrite authoritative fields (dates, title,
  // event type, online flags) — not just fill blanks. This lets improved
  // scraper data heal existing rows on re-ingest.
  const [existing] = await db
    .select({
      status: events.status,
      categoryLocked: events.categoryLocked,
      title: events.title,
      description: events.description,
    })
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);

  // Re-moderate pending events when title or description materially changes —
  // enrichment from a higher-priority scraper (e.g. Meetup Pass 2 filling in a
  // real description that was previously a stub) gives the AI enough to
  // reclassify from pending to approved or reject.
  const titleChanged = existing && event.title !== existing.title;
  const descChanged =
    existing && (event.description ?? "") !== (existing.description ?? "");
  const shouldRemoderate =
    existing?.status === "pending" && (titleChanged || descChanged);

  const remoderation = shouldRemoderate ? await moderateEvent(event) : null;
  if (remoderation) {
    console.log(
      `[ai-moderate] Re-moderated "${event.title}" (${existing?.status} → ${remoderation.decision}): ${remoderation.reason}`,
    );
  }

  const newStatus = remoderation
    ? remoderation.decision === "reject"
      ? "rejected"
      : remoderation.decision === "pending"
        ? "pending"
        : "approved"
    : undefined;

  await db
    .update(events)
    .set({
      title: event.title,
      startsAt: event.startsAt,
      endsAt: event.endsAt ?? undefined,
      eventType: remoderation?.eventType ?? event.eventType,
      isOnline: event.isOnline,
      isHybrid: event.isHybrid ?? false,
      category: existing?.categoryLocked
        ? undefined
        : (remoderation?.category ?? event.category),
      description: event.description || undefined,
      shortDescription: event.shortDescription || undefined,
      // Venue/geo are authoritative from the new source — overwrite, including
      // with null. This lets improved scrapers (e.g. Meetup no longer stamping
      // search-city on city-less events) heal existing rows on re-ingest.
      cityId: location.cityId ?? null,
      countryId: location.countryId ?? null,
      venueName: event.venueName ?? null,
      venueAddress: event.venueAddress ?? null,
      latitude: eventLat ?? null,
      longitude: eventLng ?? null,
      size: event.size || undefined,
      imageUrl: event.imageUrl || undefined,
      thumbnailUrl: event.thumbnailUrl || undefined,
      organizerName: event.organizerName || undefined,
      organizerUrl: event.organizerUrl || undefined,
      isFree: event.isFree,
      priceFrom: event.priceFrom ?? undefined,
      priceTo: event.priceTo ?? undefined,
      // Always update source-specific URLs
      eventbriteUrl: event.eventbriteUrl || undefined,
      meetupUrl: event.meetupUrl || undefined,
      confsTechUrl: event.confsTechUrl || undefined,
      devEventsUrl: event.devEventsUrl || undefined,
      status: newStatus,
      moderatedByAI: remoderation ? true : undefined,
      aiModerationReason: remoderation?.reason,
      updatedAt: new Date(),
    })
    .where(eq(events.id, eventId));
}

async function createFingerprints(eventId: string, event: NormalizedEvent) {
  const fingerprints: { eventId: string; fingerprintType: string; fingerprintValue: string }[] = [];

  // URL fingerprints
  const urls = [event.websiteUrl, event.registrationUrl, event.sourceUrl].filter(Boolean);
  for (const url of urls) {
    fingerprints.push({
      eventId,
      fingerprintType: "url",
      fingerprintValue: normalizeUrl(url!),
    });
  }

  // Title+date+city fingerprint
  fingerprints.push({
    eventId,
    fingerprintType: "title_date_city",
    fingerprintValue: exactFingerprint(
      event.title,
      event.startsAt,
      event.cityName ?? null,
      event.isOnline,
    ),
  });

  for (const fp of fingerprints) {
    try {
      await db
        .insert(eventFingerprints)
        .values(fp)
        .onConflictDoNothing();
    } catch {
      // Ignore duplicate fingerprint errors
    }
  }
}

async function upsertEventSource(eventId: string, event: NormalizedEvent) {
  const existing = await db
    .select({ id: eventSources.id })
    .from(eventSources)
    .where(
      and(
        eq(eventSources.eventId, eventId),
        eq(eventSources.source, event.source),
      )
    )
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(eventSources)
      .set({
        lastSeenAt: new Date(),
        sourceUrl: event.sourceUrl,
        rawData: event.rawData as Record<string, unknown> ?? undefined,
      })
      .where(eq(eventSources.id, existing[0].id));
  } else {
    await db.insert(eventSources).values({
      eventId,
      source: event.source,
      sourceId: event.sourceId,
      sourceUrl: event.sourceUrl,
      rawData: event.rawData as Record<string, unknown>,
    });
  }
}
