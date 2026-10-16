import { NextRequest, NextResponse } from "next/server";
import { isScrapeRunning, runAllScrapers } from "@/lib/scraper/orchestrator";
import { revalidateSitemap } from "@/lib/revalidate";

export async function POST(request: NextRequest) {
  const secret = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Don't stack a second full run on one in progress, e.g. the scheduled
  // run (docker/scheduler.sh) firing during a manual one.
  if (await isScrapeRunning()) {
    return NextResponse.json({ error: "A scrape is already running" }, { status: 409 });
  }

  try {
    const results = await runAllScrapers();
    revalidateSitemap();
    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error("Scrape all failed:", error);
    return NextResponse.json(
      {
        error: "Scrape failed",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
