import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { scraperSources } from "@/lib/db/schema";
import { eq, desc, or, sql } from "drizzle-orm";
import { isAdminAuthorized } from "@/lib/admin";
import {
  LUMA_CALENDAR_ID_PATH_REGEX,
  resolveCalendar,
} from "@/lib/scraper/sources/luma";

const LUMA_HOSTS = new Set(["lu.ma", "www.lu.ma", "luma.com", "www.luma.com"]);

/**
 * Extract a Luma calendar reference from various input formats: a vanity
 * slug, or a "calendar/cal-xxx" ID path for calendars without one. Returns
 * null if the input looks like a URL pointing somewhere other than lu.ma /
 * luma.com, or if the result contains other path segments (e.g.
 * "evil.com/foo") that would otherwise be passed through to Luma's resolver
 * verbatim.
 */
function extractLumaRef(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  let slug: string;
  if (/^https?:\/\//i.test(trimmed)) {
    let parsed: URL;
    try {
      parsed = new URL(trimmed);
    } catch {
      return null;
    }
    if (!LUMA_HOSTS.has(parsed.hostname.toLowerCase())) return null;
    slug = parsed.pathname.replace(/^\/+/, "").replace(/\/+$/, "");
  } else {
    slug = trimmed.replace(/^(www\.)?(lu\.ma|luma\.com)\//i, "");
    slug = slug.split("?")[0].replace(/\/+$/, "");
  }

  if (LUMA_CALENDAR_ID_PATH_REGEX.test(slug)) return slug;

  // A Luma calendar slug is a single path segment — reject anything with
  // a slash, whitespace, or other host-like characters.
  if (!/^[A-Za-z0-9_-]+$/.test(slug)) return null;
  return slug;
}

export async function GET(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sourceType = request.nextUrl.searchParams.get("type");

  try {
    const query = sourceType
      ? db
          .select()
          .from(scraperSources)
          .where(eq(scraperSources.sourceType, sourceType as "luma"))
          .orderBy(desc(scraperSources.createdAt))
      : db.select().from(scraperSources).orderBy(desc(scraperSources.createdAt));

    const sources = await query;
    return NextResponse.json({ sources });
  } catch (error) {
    console.error("List sources error:", error);
    return NextResponse.json({ error: "Failed to list sources" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const ref = extractLumaRef(body.url ?? "");

    if (!ref) {
      return NextResponse.json(
        { error: "Enter a Luma calendar URL (lu.ma/…) or slug" },
        { status: 400 },
      );
    }

    // Validate by resolving the calendar on Luma
    const calendar = await resolveCalendar(ref);

    if (!calendar?.api_id) {
      return NextResponse.json(
        { error: `Could not find a Luma calendar at "${ref}"` },
        { status: 404 },
      );
    }

    // Check for duplicate. A calendar with a vanity slug is also reachable
    // via its ID path, so match on the resolved API ID as well.
    const existing = await db
      .select({ id: scraperSources.id })
      .from(scraperSources)
      .where(
        or(
          eq(scraperSources.url, ref),
          sql`${scraperSources.config}->>'calendarApiId' = ${calendar.api_id}`,
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: `Calendar "${ref}" is already added` },
        { status: 409 },
      );
    }

    // Insert
    const [source] = await db
      .insert(scraperSources)
      .values({
        name: calendar.name ?? ref,
        sourceType: "luma",
        url: ref,
        isActive: true,
        config: { calendarApiId: calendar.api_id },
      })
      .returning();

    return NextResponse.json({ source }, { status: 201 });
  } catch (error) {
    console.error("Create source error:", error);
    return NextResponse.json({ error: "Failed to create source" }, { status: 500 });
  }
}
