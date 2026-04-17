import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized, getDashboardStats } from "@/lib/admin";

export async function GET(request: NextRequest) {
  if (!isAdminAuthorized(request.headers.get("x-admin-secret"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const stats = await getDashboardStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json({ error: "Failed to get stats" }, { status: 500 });
  }
}
