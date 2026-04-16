import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { countries } from "@/lib/db/schema";
import { asc } from "drizzle-orm";

export async function GET() {
  try {
    const data = await db
      .select({ code: countries.code, name: countries.name })
      .from(countries)
      .orderBy(asc(countries.name));
    return NextResponse.json(data);
  } catch (error) {
    console.error("Countries API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch countries" },
      { status: 500 }
    );
  }
}
