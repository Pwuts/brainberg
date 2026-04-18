import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized } from "@/lib/admin";
import { db } from "@/lib/db";
import { stagedEvents, scraperRuns } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { discardStaged } from "@/lib/scraper/staging";

type Params = { params: Promise<{ runId: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { runId } = await params;

  const [run] = await db
    .select()
    .from(scraperRuns)
    .where(eq(scraperRuns.id, runId))
    .limit(1);

  if (!run) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const staged = await db
    .select()
    .from(stagedEvents)
    .where(eq(stagedEvents.scraperRunId, runId));

  const summary = {
    new: staged.filter((e) => e.diffStatus === "new").length,
    updated: staged.filter((e) => e.diffStatus === "updated").length,
    removed: staged.filter((e) => e.diffStatus === "removed").length,
    unchanged: staged.filter((e) => e.diffStatus === "unchanged").length,
  };

  return NextResponse.json({ run, events: staged, summary });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { runId } = await params;
  await discardStaged(runId);
  return NextResponse.json({ success: true });
}
