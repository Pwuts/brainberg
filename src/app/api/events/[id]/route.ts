import { NextRequest, NextResponse } from "next/server";
import { getEventBySlug } from "@/lib/events";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const result = await getEventBySlug(id);
    if (!result) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error("Event API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch event" },
      { status: 500 }
    );
  }
}
