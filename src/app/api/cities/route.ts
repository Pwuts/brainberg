import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cities, countries } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const countryCode = request.nextUrl.searchParams.get("country");

  try {
    let query = db
      .select({
        slug: cities.slug,
        name: cities.name,
        countryCode: countries.code,
      })
      .from(cities)
      .leftJoin(countries, eq(cities.countryId, countries.id))
      .orderBy(asc(cities.name));

    if (countryCode) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      query = query.where(eq(countries.code, countryCode.toUpperCase())) as any;
    }

    const data = await query;
    return NextResponse.json(data);
  } catch (error) {
    console.error("Cities API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch cities" },
      { status: 500 }
    );
  }
}
