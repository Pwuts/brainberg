import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { isAdminAuthorized } from "@/lib/admin";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { resolveCategory, resolveEventType } from "@/lib/scraper/category-map";

export async function POST(request: NextRequest) {
  if (!isAdminAuthorized(request.headers.get("x-admin-secret"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const allEvents = await db
      .select({
        id: events.id,
        title: events.title,
        category: events.category,
        eventType: events.eventType,
        categoryLocked: events.categoryLocked,
      })
      .from(events);

    let categoriesChanged = 0;
    let typesChanged = 0;
    let skippedLocked = 0;

    for (const event of allEvents) {
      const updates: Record<string, unknown> = {};

      // Re-categorize (skip locked)
      if (!event.categoryLocked) {
        const newCategory = resolveCategory(undefined, {}, event.title);
        if (newCategory !== "software_dev" && newCategory !== event.category) {
          updates.category = newCategory;
          categoriesChanged++;
        }
      } else {
        skippedLocked++;
      }

      // Re-type (always — event type isn't manually locked)
      const newType = resolveEventType(event.title);
      if (newType && newType !== event.eventType) {
        updates.eventType = newType;
        typesChanged++;
      }

      if (Object.keys(updates).length > 0) {
        updates.updatedAt = new Date();
        await db.update(events).set(updates).where(eq(events.id, event.id));
      }
    }

    return NextResponse.json({
      success: true,
      total: allEvents.length,
      categoriesChanged,
      typesChanged,
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
