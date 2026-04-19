import { NextRequest, NextResponse } from "next/server";
import { getFilteredEvents } from "@/lib/events";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  try {
    const data = await getFilteredEvents({
      country: params.get("country") ?? undefined,
      city: params.get("city") ?? undefined,
      category: params.get("category") ?? undefined,
      eventType: params.get("type") ?? undefined,
      size: params.get("size") ?? undefined,
      dateFrom: params.get("from") ?? undefined,
      dateTo: params.get("to") ?? undefined,
      tzOffsetMinutes: params.get("tzo") ? parseInt(params.get("tzo")!, 10) : undefined,
      isFree: params.get("free") === "1",
      isOnline: params.get("online") === "1",
      search: params.get("q") ?? undefined,
      latitude: params.get("lat") ? parseFloat(params.get("lat")!) : undefined,
      longitude: params.get("lng") ? parseFloat(params.get("lng")!) : undefined,
      radius: params.get("radius") ? parseInt(params.get("radius")!) : undefined,
      sort: params.get("sort") ?? undefined,
      cursor: params.get("cursor") ?? undefined,
      limit: Math.min(parseInt(params.get("limit") ?? "20"), 100),
    });
    return NextResponse.json(data);
  } catch (error) {
    console.error("Events API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }
}
