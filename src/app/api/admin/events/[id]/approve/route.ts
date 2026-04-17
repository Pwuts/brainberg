import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized, approveEvent } from "@/lib/admin";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAdminAuthorized(request.headers.get("x-admin-secret"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await approveEvent(id);
  return NextResponse.json({ success: true });
}
