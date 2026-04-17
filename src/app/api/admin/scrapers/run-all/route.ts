import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized } from "@/lib/admin";
import { runAllScrapers } from "@/lib/scraper/orchestrator";

export async function POST(request: NextRequest) {
  if (!isAdminAuthorized(request.headers.get("x-admin-secret"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const results = await runAllScrapers();
    return NextResponse.json({ success: true, results });
  } catch (error) {
    return NextResponse.json(
      { error: "Scrape failed", message: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
