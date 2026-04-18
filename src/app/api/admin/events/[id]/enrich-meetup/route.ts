import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { isAdminAuthorized } from "@/lib/admin";
import { db } from "@/lib/db";
import { events, eventSources } from "@/lib/db/schema";
import { scrapeMeetupEvent } from "@/lib/scraper/sources/meetup";
import { ingestEvents } from "@/lib/scraper/ingest";
import type { NormalizedEvent } from "@/lib/scraper/types";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAdminAuthorized(request.headers.get("x-admin-secret"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const [event] = await db
    .select({ id: events.id, source: events.source, meetupUrl: events.meetupUrl })
    .from(events)
    .where(eq(events.id, id))
    .limit(1);

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }
  if (event.source !== "dev_events") {
    return NextResponse.json({ error: "Event is not dev.events sourced" }, { status: 400 });
  }
  if (!event.meetupUrl) {
    return NextResponse.json({ error: "Event has no meetup URL" }, { status: 400 });
  }

  const existingMeetupSource = await db
    .select({ id: eventSources.id })
    .from(eventSources)
    .where(and(eq(eventSources.eventId, id), eq(eventSources.source, "meetup")))
    .limit(1);
  if (existingMeetupSource.length > 0) {
    return NextResponse.json({ error: "Event already has a meetup source" }, { status: 400 });
  }

  try {
    const normalized = await scrapeMeetupEvent(event.meetupUrl);
    if (!normalized) {
      return NextResponse.json({ error: "Failed to fetch or parse Meetup event" }, { status: 502 });
    }

    async function* oneEvent(): AsyncGenerator<NormalizedEvent> {
      yield normalized!;
    }
    const stats = await ingestEvents(oneEvent());

    return NextResponse.json({ success: true, stats });
  } catch (err) {
    console.error("[enrich-meetup] Failed:", err);
    return NextResponse.json(
      { error: "Enrichment failed", message: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
