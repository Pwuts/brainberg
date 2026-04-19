import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { scraperSources } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { isAdminAuthorized } from "@/lib/admin";
import type { EventCategory } from "@/lib/scraper/types";
import type { MicrodataSourceConfig } from "@/lib/scraper/sources/microdata";

export async function POST(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    // Validate URL
    const rawUrl = String(body.url ?? "").trim();
    let url: URL;
    try {
      url = new URL(rawUrl);
    } catch {
      return NextResponse.json({ error: "Enter a valid http(s) URL" }, { status: 400 });
    }
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return NextResponse.json({ error: "URL must be http(s)" }, { status: 400 });
    }

    const name = String(body.name ?? "").trim();
    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const extraction = body.extraction === "jsonld" ? "jsonld" : "microdata";
    const itemtype = typeof body.itemtype === "string" && body.itemtype.trim()
      ? body.itemtype.trim()
      : undefined;

    const fallbacks: MicrodataSourceConfig["fallbacks"] = {};
    if (typeof body.cityName === "string" && body.cityName.trim()) {
      fallbacks.cityName = body.cityName.trim();
    }
    if (typeof body.countryCode === "string" && body.countryCode.trim()) {
      fallbacks.countryCode = body.countryCode.trim().toUpperCase();
    }
    if (typeof body.venueName === "string" && body.venueName.trim()) {
      fallbacks.venueName = body.venueName.trim();
    }
    if (typeof body.venueAddress === "string" && body.venueAddress.trim()) {
      fallbacks.venueAddress = body.venueAddress.trim();
    }
    if (typeof body.timezone === "string" && body.timezone.trim()) {
      fallbacks.timezone = body.timezone.trim();
    }

    const defaultCategory = typeof body.defaultCategory === "string" && body.defaultCategory
      ? (body.defaultCategory as EventCategory)
      : undefined;
    const defaultCityId = typeof body.defaultCityId === "number"
      ? body.defaultCityId
      : undefined;

    // Duplicate check
    const existing = await db
      .select({ id: scraperSources.id })
      .from(scraperSources)
      .where(eq(scraperSources.url, url.toString()))
      .limit(1);
    if (existing.length > 0) {
      return NextResponse.json(
        { error: `Already tracking ${url.toString()}` },
        { status: 409 },
      );
    }

    const config: MicrodataSourceConfig = {
      extraction,
      ...(itemtype ? { itemtype } : {}),
      ...(Object.keys(fallbacks).length > 0 ? { fallbacks } : {}),
    };

    const [source] = await db
      .insert(scraperSources)
      .values({
        name,
        sourceType: "microdata",
        url: url.toString(),
        isActive: true,
        defaultCategory,
        defaultCityId,
        config,
      })
      .returning();

    return NextResponse.json({ source }, { status: 201 });
  } catch (error) {
    console.error("Create microdata source error:", error);
    return NextResponse.json({ error: "Failed to create source" }, { status: 500 });
  }
}
