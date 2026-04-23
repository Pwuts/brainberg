import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { eq, lte, and, count, sql } from "drizzle-orm";
import { CATEGORY_LABELS } from "@/lib/utils";
import { AnimatedBubbles } from "./animated-bubbles";

const BUBBLE_COLORS: Record<string, string> = {
  ai_ml_research: "#9333ea",
  ai_applied: "#7c3aed",
  software_dev: "#475569",
  data_analytics: "#16a34a",
  cloud_devops: "#0891b2",
  security: "#dc2626",
  design_ux: "#ec4899",
  blockchain_web3: "#ea580c",
  entrepreneurship: "#4f46e5",
  hardware_iot: "#d97706",
  hacker_maker: "#65a30d",
  game_dev: "#c026d3",
  policy_ethics: "#78716c",
  leadership_product: "#2563eb",
  bio_health: "#0d9488",
  other: "#6b7280",
};

export async function CategoryBubbles() {
  const horizon = new Date();
  horizon.setMonth(horizon.getMonth() + 3);

  const categoryCounts = await db
    .select({ category: events.category, count: count() })
    .from(events)
    .where(
      and(
        eq(events.status, "approved"),
        // Include currently running multi-day events.
        sql`COALESCE(${events.endsAt}, ${events.startsAt}) >= now()`,
        lte(events.startsAt, horizon),
      ),
    )
    .groupBy(events.category);

  const items = categoryCounts
    .filter((c) => c.count > 0 && c.category in CATEGORY_LABELS)
    .map((c) => ({
      category: c.category,
      label: CATEGORY_LABELS[c.category] ?? c.category,
      count: c.count,
      color: BUBBLE_COLORS[c.category] ?? "#6b7280",
    }));

  if (items.length === 0) return null;

  return <AnimatedBubbles items={items} />;
}
