import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized, listEvents } from "@/lib/admin";

export async function GET(request: NextRequest) {
  if (!isAdminAuthorized(request.headers.get("x-admin-secret"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;

  try {
    const data = await listEvents({
      status: params.get("status") ?? undefined,
      source: params.get("source") ?? undefined,
      category: params.get("category") ?? undefined,
      search: params.get("q") ?? undefined,
      limit: parseInt(params.get("limit") ?? "50"),
      offset: parseInt(params.get("offset") ?? "0"),
    });
    return NextResponse.json(data);
  } catch (error) {
    console.error("Admin events list error:", error);
    return NextResponse.json({ error: "Failed to list events" }, { status: 500 });
  }
}
