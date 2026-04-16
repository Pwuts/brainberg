import { NextRequest, NextResponse } from "next/server";
import { searchEvents } from "@/lib/events";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q");
  const autocomplete = request.nextUrl.searchParams.get("autocomplete") === "1";

  if (!q || q.length < 2) {
    return NextResponse.json({ suggestions: [], results: [] });
  }

  try {
    const data = await searchEvents(q, autocomplete);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
}
