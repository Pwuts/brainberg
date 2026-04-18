import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { scraperSources } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { isAdminAuthorized } from "@/lib/admin";

const LUMA_API = "https://api.lu.ma";
const LUMA_HOSTS = new Set(["lu.ma", "www.lu.ma", "luma.com", "www.luma.com"]);

/**
 * Extract Luma slug from various input formats. Returns null if the input
 * looks like a URL pointing somewhere other than lu.ma / luma.com, or if
 * the resulting slug contains path segments (e.g. "evil.com/foo") that
 * would otherwise be passed through to Luma's resolver verbatim.
 */
function extractLumaSlug(input: string): string | null {
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
      ? db.select().from(scraperSources).where(eq(scraperSources.sourceType, sourceType as "luma")).orderBy(desc(scraperSources.createdAt))
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
    const slug = extractLumaSlug(body.url ?? "");

    if (!slug) {
      return NextResponse.json(
        { error: "Enter a Luma calendar URL (lu.ma/…) or slug" },
        { status: 400 },
      );
    }

    // Validate by resolving the calendar on Luma
    const res = await fetch(`${LUMA_API}/url?url=${encodeURIComponent(slug)}`, {
      headers: { "User-Agent": "Brainberg/1.0 (https://brainberg.eu)" },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Could not find Luma calendar "${slug}"` },
        { status: 404 },
      );
    }

    const data = await res.json();
    const calendar = data?.data?.calendar;

    if (!calendar?.api_id) {
      return NextResponse.json(
        { error: `"${slug}" is not a Luma calendar` },
        { status: 404 },
      );
    }

    // Check for duplicate
    const existing = await db
      .select({ id: scraperSources.id })
      .from(scraperSources)
      .where(eq(scraperSources.url, slug))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: `Calendar "${slug}" is already added` },
        { status: 409 },
      );
    }

    // Insert
    const [source] = await db
      .insert(scraperSources)
      .values({
        name: calendar.name ?? slug,
        sourceType: "luma",
        url: slug,
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
