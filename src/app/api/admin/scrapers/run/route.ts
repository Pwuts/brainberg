import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized } from "@/lib/admin";
import { runScraper, getAvailableScrapers } from "@/lib/scraper/orchestrator";
import type { EventSource } from "@/lib/scraper/types";

export async function POST(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { source, dateFrom, dateTo } = body;

  if (!source || !getAvailableScrapers().includes(source)) {
    return NextResponse.json(
      { error: `Invalid source. Available: ${getAvailableScrapers().join(", ")}` },
      { status: 400 },
    );
  }

  try {
    const { runId, stats } = await runScraper(source as EventSource, {
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
    });
    return NextResponse.json({ success: true, runId, stats });
  } catch (error) {
    return NextResponse.json(
      { error: "Scrape failed", message: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
