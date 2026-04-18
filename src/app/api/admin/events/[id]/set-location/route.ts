import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { isAdminAuthorized } from "@/lib/admin";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { resolveLocation } from "@/lib/scraper/city-resolver";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAdminAuthorized(request.headers.get("x-admin-secret"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const { venueName, venueAddress, latitude, longitude, cityName, countryCode } = body as {
    venueName?: string;
    venueAddress?: string;
    latitude?: number;
    longitude?: number;
    cityName?: string;
    countryCode?: string;
  };

  if (typeof latitude !== "number" || typeof longitude !== "number" || !cityName || !countryCode) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const location = await resolveLocation(cityName, countryCode);
  if (!location.cityId || !location.countryId) {
    return NextResponse.json(
      { error: "Could not resolve city/country. Country may not be in our DB." },
      { status: 422 },
    );
  }

  // Only fill in venueName if the event didn't already have one (don't
  // clobber manual edits like "Cinedom — 2nd floor" with a bare "Cinedom").
  const [existing] = await db
    .select({ venueName: events.venueName })
    .from(events)
    .where(eq(events.id, id))
    .limit(1);

  await db
    .update(events)
    .set({
      cityId: location.cityId,
      countryId: location.countryId,
      latitude,
      longitude,
      venueAddress: venueAddress || undefined,
      venueName: !existing?.venueName && venueName ? venueName : undefined,
      updatedAt: new Date(),
    })
    .where(eq(events.id, id));

  return NextResponse.json({ success: true });
}
