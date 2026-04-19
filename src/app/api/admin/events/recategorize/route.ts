import { NextRequest, NextResponse } from "next/server";
import { eq, and, gte, lte, inArray } from "drizzle-orm";
import { isAdminAuthorized } from "@/lib/admin";
import { db } from "@/lib/db";
import { events, cities, countries } from "@/lib/db/schema";
import { resolveCategory, resolveEventType } from "@/lib/scraper/category-map";
import { moderateEvent } from "@/lib/scraper/ai-moderate";
import type { NormalizedEvent } from "@/lib/scraper/types";

export async function POST(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { dateFrom, dateTo, eventIds, bypassLock } = body as {
    dateFrom?: string;
    dateTo?: string;
    eventIds?: string[];
    bypassLock?: boolean;
  };

  const useAi = !!process.env.ANTHROPIC_API_KEY;
  console.log(`[recategorize] Starting (mode: ${useAi ? "AI" : "regex"}, scope: ${eventIds?.length ? `${eventIds.length} events` : dateFrom || dateTo ? `${dateFrom ?? "…"} to ${dateTo ?? "…"}` : "all"})`);

  try {
    const conditions = [];
    if (dateFrom) conditions.push(gte(events.startsAt, new Date(dateFrom)));
    if (dateTo) conditions.push(lte(events.startsAt, new Date(dateTo)));
    if (eventIds?.length) conditions.push(inArray(events.id, eventIds));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const allEvents = await db
      .select({
        id: events.id,
        title: events.title,
        description: events.description,
        category: events.category,
        eventType: events.eventType,
        status: events.status,
        rejectionReason: events.rejectionReason,
        categoryLocked: events.categoryLocked,
        source: events.source,
        tags: events.tags,
        isOnline: events.isOnline,
        venueName: events.venueName,
        venueAddress: events.venueAddress,
        organizerName: events.organizerName,
        cityName: cities.name,
        countryCode: countries.code,
      })
      .from(events)
      .leftJoin(cities, eq(events.cityId, cities.id))
      .leftJoin(countries, eq(events.countryId, countries.id))
      .where(where);

    console.log(`[recategorize] Processing ${allEvents.length} events`);

    let categoriesChanged = 0;
    let typesChanged = 0;
    let statusesChanged = 0;
    let skippedLocked = 0;
    let processed = 0;

    for (const event of allEvents) {
      processed++;
      if (processed % 50 === 0 || processed === allEvents.length) {
        console.log(`[recategorize] Progress: ${processed}/${allEvents.length} (${categoriesChanged} cat, ${typesChanged} type, ${statusesChanged} status changes so far)`);
      }

      if (event.categoryLocked && !bypassLock) {
        skippedLocked++;
        continue;
      }

      const updates: Record<string, unknown> = {};

      if (useAi) {
        // Build description with moderation context for the AI
        const descParts = [];
        if (event.description) descParts.push(event.description);
        if (event.status !== "approved") descParts.push(`[Current status: ${event.status}]`);
        if (event.rejectionReason) descParts.push(`[Human moderator note: ${event.rejectionReason}]`);

        const normalized: NormalizedEvent = {
          title: event.title,
          category: event.category,
          eventType: event.eventType,
          source: event.source,
          sourceId: event.id,
          tags: event.tags ?? undefined,
          description: descParts.length > 0 ? descParts.join("\n\n") : undefined,
          isOnline: event.isOnline,
          cityName: event.cityName ?? undefined,
          countryCode: event.countryCode ?? undefined,
          venueName: event.venueName ?? undefined,
          venueAddress: event.venueAddress ?? undefined,
          organizerName: event.organizerName ?? undefined,
          startsAt: new Date(),
          timezone: "UTC",
        };

        const result = await moderateEvent(normalized);
        if (result) {
          if (result.category && result.category !== event.category) {
            console.log(`[recategorize] Category: "${event.title}" ${event.category} → ${result.category}`);
            updates.category = result.category;
            categoriesChanged++;
          }
          if (result.eventType && result.eventType !== event.eventType) {
            console.log(`[recategorize] Type: "${event.title}" ${event.eventType} → ${result.eventType}`);
            updates.eventType = result.eventType;
            typesChanged++;
          }
          const newStatus =
            result.decision === "reject" ? "rejected" :
            result.decision === "pending" ? "pending" : "approved";
          if (newStatus !== event.status) {
            console.log(`[recategorize] Status: "${event.title}" ${event.status} → ${newStatus} (${result.reason})`);
            updates.status = newStatus;
            statusesChanged++;
          }
          updates.moderatedByAI = true;
          updates.aiModerationReason = result.reason;
        }
      } else {
        const newCategory = resolveCategory(undefined, {}, event.title);
        if (newCategory !== "software_dev" && newCategory !== event.category) {
          console.log(`[recategorize] Category: "${event.title}" ${event.category} → ${newCategory}`);
          updates.category = newCategory;
          categoriesChanged++;
        }

        const newType = resolveEventType(event.title);
        if (newType && newType !== event.eventType) {
          console.log(`[recategorize] Type: "${event.title}" ${event.eventType} → ${newType}`);
          updates.eventType = newType;
          typesChanged++;
        }
      }

      if (Object.keys(updates).length > 0) {
        updates.updatedAt = new Date();
        await db.update(events).set(updates).where(eq(events.id, event.id));
      }
    }

    const summary = `[recategorize] Done: ${allEvents.length} events, ${categoriesChanged} categories, ${typesChanged} types, ${statusesChanged} statuses changed, ${skippedLocked} locked`;
    console.log(summary);

    return NextResponse.json({
      success: true,
      mode: useAi ? "ai" : "regex",
      total: allEvents.length,
      categoriesChanged,
      typesChanged,
      statusesChanged,
      skippedLocked,
    });
  } catch (error) {
    console.error("[recategorize] Failed:", error);
    return NextResponse.json(
      { error: "Failed", message: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
