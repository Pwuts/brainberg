import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized, rejectEvent } from "@/lib/admin";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  await rejectEvent(id, body.reason);
  return NextResponse.json({ success: true });
}
