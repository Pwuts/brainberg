import { NextRequest, NextResponse } from "next/server";
import { runScraper, getAvailableScrapers } from "@/lib/scraper/orchestrator";
import type { EventSource } from "@/lib/scraper/types";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ source: string }> },
) {
  const secret = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { source } = await params;

  if (!getAvailableScrapers().includes(source)) {
    return NextResponse.json(
      { error: `Unknown scraper: ${source}`, available: getAvailableScrapers() },
      { status: 400 },
    );
  }

  try {
    const { runId, stats } = await runScraper(source as EventSource);
    return NextResponse.json({ success: true, runId, stats });
  } catch (error) {
    console.error(`Scrape ${source} failed:`, error);
    return NextResponse.json(
      { error: "Scrape failed", message: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
