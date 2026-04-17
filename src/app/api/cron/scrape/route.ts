import { NextRequest, NextResponse } from "next/server";
import { runAllScrapers } from "@/lib/scraper/orchestrator";

export async function POST(request: NextRequest) {
  const secret = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const results = await runAllScrapers();
    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error("Scrape all failed:", error);
    return NextResponse.json(
      { error: "Scrape failed", message: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
