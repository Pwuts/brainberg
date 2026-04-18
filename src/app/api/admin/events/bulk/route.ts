import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized, bulkAction } from "@/lib/admin";

export async function POST(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { ids, action, reason } = body;

  if (!Array.isArray(ids) || !["approve", "reject", "pending", "delete"].includes(action)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  await bulkAction(ids, action, reason);
  return NextResponse.json({ success: true, affected: ids.length });
}
