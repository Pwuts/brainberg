import { NextResponse } from "next/server";
import { CATEGORY_LABELS } from "@/lib/utils";

export async function GET() {
  const categories = Object.entries(CATEGORY_LABELS).map(([value, label]) => ({
    value,
    label,
  }));
  return NextResponse.json(categories);
}
