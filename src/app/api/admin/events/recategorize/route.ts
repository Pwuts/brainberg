import { NextRequest, NextResponse } from "next/server";
import { eq, and, gte, lte, inArray } from "drizzle-orm";
import { isAdminAuthorized } from "@/lib/admin";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { resolveCategory, resolveEventType } from "@/lib/scraper/category-map";
import { moderateEvent } from "@/lib/scraper/ai-moderate";
import type { NormalizedEvent } from "@/lib/scraper/types";

export async function POST(request: NextRequest) {
  if (!isAdminAuthorized(request.headers.get("x-admin-secret"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { dateFrom, dateTo, eventIds } = body as {
    dateFrom?: string;
    dateTo?: string;
    eventIds?: string[];
  };

  const useAi = !!process.env.ANTHROPIC_API_KEY;

  try {
    // Build query conditions for scoping
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
        categoryLocked: events.categoryLocked,
        source: events.source,
        tags: events.tags,
        isOnline: events.isOnline,
        cityName: events.venueName, // rough proxy
      })
      .from(events)
      .where(where);

    let categoriesChanged = 0;
    let typesChanged = 0;
    let statusesChanged = 0;
    let skippedLocked = 0;

    for (const event of allEvents) {
      if (event.categoryLocked) {
        skippedLocked++;
        continue;
      }

      const updates: Record<string, unknown> = {};

      if (useAi) {
        // AI-powered re-categorization
        const normalized: NormalizedEvent = {
          title: event.title,
          category: event.category,
          eventType: event.eventType,
          source: event.source,
          sourceId: event.id,
          tags: event.tags ?? undefined,
          description: event.description ?? undefined,
          isOnline: event.isOnline,
          startsAt: new Date(),
          timezone: "UTC",
        };

        const result = await moderateEvent(normalized);
        if (result) {
          if (result.category && result.category !== event.category) {
            updates.category = result.category;
            categoriesChanged++;
          }
          if (result.eventType && result.eventType !== event.eventType) {
            updates.eventType = result.eventType;
            typesChanged++;
          }
          if (result.decision !== "approve") {
            updates.status = result.decision === "reject" ? "rejected" : "pending";
            statusesChanged++;
          }
          updates.moderatedByAI = true;
          updates.aiModerationReason = result.reason;
        }
      } else {
        // Regex-only re-categorization
        const newCategory = resolveCategory(undefined, {}, event.title);
        if (newCategory !== "software_dev" && newCategory !== event.category) {
          updates.category = newCategory;
          categoriesChanged++;
        }

        const newType = resolveEventType(event.title);
        if (newType && newType !== event.eventType) {
          updates.eventType = newType;
          typesChanged++;
        }
      }

      if (Object.keys(updates).length > 0) {
        updates.updatedAt = new Date();
        await db.update(events).set(updates).where(eq(events.id, event.id));
      }
    }

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
    console.error("Re-categorize error:", error);
    return NextResponse.json(
      { error: "Failed", message: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
