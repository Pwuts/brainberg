import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized, getEvent, updateEvent, deleteEvent } from "@/lib/admin";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  if (!isAdminAuthorized(request.headers.get("x-admin-secret"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const event = await getEvent(id);
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(event);
}

export async function PATCH(request: NextRequest, { params }: Params) {
  if (!isAdminAuthorized(request.headers.get("x-admin-secret"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  await updateEvent(id, body);
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  if (!isAdminAuthorized(request.headers.get("x-admin-secret"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await deleteEvent(id);
  return NextResponse.json({ success: true });
}
