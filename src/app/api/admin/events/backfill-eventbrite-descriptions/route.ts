import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNotNull, isNull, or, sql } from "drizzle-orm";
import { isAdminAuthorized } from "@/lib/admin";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { htmlToMarkdown } from "@/lib/scraper/html-utils";

const API_BASE = "https://www.eventbriteapi.com/v3";

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchFullDescription(
  eventId: string,
  token: string,
): Promise<string | undefined> {
  try {
    const res = await fetch(`${API_BASE}/events/${eventId}/description/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return undefined;
    const data = (await res.json()) as { description?: unknown };
    if (typeof data.description !== "string" || !data.description.trim()) {
      return undefined;
    }
    return htmlToMarkdown(data.description);
  } catch {
    return undefined;
  }
}

export async function POST(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = process.env.EVENTBRITE_API_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "EVENTBRITE_API_TOKEN not set" },
      { status: 500 },
    );
  }

  const candidates = await db
    .select({
      id: events.id,
      sourceId: events.sourceId,
      description: events.description,
    })
    .from(events)
    .where(
      and(
        eq(events.source, "eventbrite"),
        isNotNull(events.sourceId),
        or(
          isNull(events.description),
          sql`length(${events.description}) < 500`,
        ),
      ),
    );

  console.log(`[backfill-eventbrite] ${candidates.length} candidates`);

  let updated = 0;
  let unchanged = 0;
  let failed = 0;
  let processed = 0;

  for (const row of candidates) {
    if (!row.sourceId) continue;
    const full = await fetchFullDescription(row.sourceId, token);
    const currentLen = row.description?.length ?? 0;
    if (full && full.length > currentLen) {
      await db
        .update(events)
        .set({ description: full, updatedAt: new Date() })
        .where(eq(events.id, row.id));
      updated++;
    } else if (full) {
      unchanged++;
    } else {
      failed++;
    }
    processed++;
    if (processed % 25 === 0 || processed === candidates.length) {
      console.log(
        `[backfill-eventbrite] Progress: ${processed}/${candidates.length} (${updated} updated, ${unchanged} unchanged, ${failed} failed)`,
      );
    }
    await sleep(1000);
  }

  console.log(
    `[backfill-eventbrite] Done: ${updated} updated, ${unchanged} unchanged, ${failed} failed`,
  );

  return NextResponse.json({
    total: candidates.length,
    updated,
    unchanged,
    failed,
  });
}
