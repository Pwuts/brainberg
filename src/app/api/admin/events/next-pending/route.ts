import { NextRequest, NextResponse } from "next/server";
import { eq, asc, count } from "drizzle-orm";
import { isAdminAuthorized } from "@/lib/admin";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";

export async function GET(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const excludeId = request.nextUrl.searchParams.get("exclude");

  const [pending, countResult] = await Promise.all([
    db
      .select({ id: events.id })
      .from(events)
      .where(eq(events.status, "pending"))
      .orderBy(asc(events.startsAt))
      .limit(2),
    db
      .select({ count: count() })
      .from(events)
      .where(eq(events.status, "pending")),
  ]);

  const remaining = countResult[0]?.count ?? 0;
  const next = excludeId
    ? pending.find((r) => r.id !== excludeId)
    : pending[0];

  return NextResponse.json({ id: next?.id ?? null, remaining });
}
