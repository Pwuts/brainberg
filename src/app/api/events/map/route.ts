import { NextRequest, NextResponse } from "next/server";
import { getMapEvents } from "@/lib/events";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  try {
    const events = await getMapEvents({
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
    });
    return NextResponse.json({ events });
  } catch (error) {
    console.error("Map events API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch map events" },
      { status: 500 }
    );
  }
}
