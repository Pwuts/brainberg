import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized } from "@/lib/admin";
import { runScraperPreview } from "@/lib/scraper/staging";
import { getAvailableScrapers } from "@/lib/scraper/orchestrator";
import type { EventSource } from "@/lib/scraper/types";

export async function POST(request: NextRequest) {
  if (!isAdminAuthorized(request.headers.get("x-admin-secret"))) {
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
    const runId = await runScraperPreview(source as EventSource, {
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
    });
    return NextResponse.json({ success: true, runId });
  } catch (error) {
    return NextResponse.json(
      { error: "Preview failed", message: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
