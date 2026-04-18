import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized, listScraperRuns } from "@/lib/admin";
import { getAvailableScrapers } from "@/lib/scraper/orchestrator";

export async function GET(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [runs, scrapers] = await Promise.all([
      listScraperRuns(),
      Promise.resolve(getAvailableScrapers()),
    ]);
    return NextResponse.json({ scrapers, runs });
  } catch (error) {
    console.error("Admin scrapers error:", error);
    return NextResponse.json({ error: "Failed to list scrapers" }, { status: 500 });
  }
}
