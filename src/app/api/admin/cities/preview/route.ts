import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized } from "@/lib/admin";
import { fetchMeetupCity } from "@/lib/scraper/sources/meetup";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const cityName = (params.get("city") ?? "").trim();
  const countryCode = (params.get("country") ?? "").trim().toUpperCase();

  if (!cityName) {
    return NextResponse.json({ error: "city is required" }, { status: 400 });
  }
  if (!/^[A-Z]{2}$/.test(countryCode)) {
    return NextResponse.json(
      { error: "country must be a 2-letter ISO code" },
      { status: 400 },
    );
  }

  try {
    const now = new Date();
    const meetupEvents = await fetchMeetupCity(cityName, countryCode, {
      dateFrom: now,
    });

    const results = meetupEvents.map((e) => ({
      source: "meetup",
      title: e.title,
      startsAt: e.startsAt.toISOString(),
      endsAt: e.endsAt?.toISOString() ?? null,
      venueName: e.venueName ?? null,
      cityName: e.cityName ?? null,
      countryCode: e.countryCode ?? null,
      isOnline: e.isOnline ?? false,
      url: e.websiteUrl ?? e.meetupUrl ?? null,
      organizerName: e.organizerName ?? null,
      category: e.category,
      tags: e.tags ?? [],
    }));

    return NextResponse.json({
      city: cityName,
      countryCode,
      sources: ["meetup"],
      events: results,
    });
  } catch (error) {
    console.error("Preview city error:", error);
    return NextResponse.json({ error: "Preview failed" }, { status: 500 });
  }
}
