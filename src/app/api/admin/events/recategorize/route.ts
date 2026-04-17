import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { isAdminAuthorized } from "@/lib/admin";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { resolveCategory } from "@/lib/scraper/category-map";

export async function POST(request: NextRequest) {
  if (!isAdminAuthorized(request.headers.get("x-admin-secret"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Only re-categorize events that haven't been manually edited.
    // We detect manual edits by checking categoryLocked flag.
    const allEvents = await db
      .select({
        id: events.id,
        title: events.title,
        category: events.category,
        categoryLocked: events.categoryLocked,
      })
      .from(events);

    let changed = 0;
    let skippedLocked = 0;
    for (const event of allEvents) {
      if (event.categoryLocked) {
        skippedLocked++;
        continue;
      }
      const newCategory = resolveCategory(undefined, {}, event.title);
      // Only re-categorize if the title keywords produce a specific match
      // (not the default "software_dev" fallback)
      if (newCategory !== "software_dev" && newCategory !== event.category) {
        await db
          .update(events)
          .set({ category: newCategory, updatedAt: new Date() })
          .where(eq(events.id, event.id));
        changed++;
      }
    }

    return NextResponse.json({ success: true, total: allEvents.length, changed, skippedLocked });
  } catch (error) {
    console.error("Re-categorize error:", error);
    return NextResponse.json(
      { error: "Failed", message: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
