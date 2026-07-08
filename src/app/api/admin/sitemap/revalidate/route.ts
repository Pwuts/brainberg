import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized } from "@/lib/admin";
import { revalidateSitemap } from "@/lib/revalidate";

// Manual sitemap refresh for the admin UI. Scraper runs already call
// `revalidateSitemap()` automatically; this covers the case where an admin
// changed the approved set another way (single-event edits, DB fixes) and
// wants /sitemap.xml to reflect it without waiting for the hourly TTL.
export async function POST(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  revalidateSitemap();
  return NextResponse.json({ success: true });
}
