import { db } from "./db";
import {
  events, cities, countries, eventSources, scraperRuns, scraperSources,
} from "./db/schema";
import { eq, and, desc, asc, sql, count, type SQL } from "drizzle-orm";
import type { eventCategoryEnum, eventStatusEnum, eventSourceEnum } from "./db/schema";

// ============================================================
// Auth
// ============================================================

export function isAdminAuthorized(secret: string | null): boolean {
  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) return false;
  return secret === adminSecret;
}

// ============================================================
// Events
// ============================================================

interface ListEventsParams {
  status?: string;
  source?: string;
  category?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export async function listEvents(params: ListEventsParams) {
  const conditions: SQL[] = [];

  if (params.status) {
    conditions.push(eq(events.status, params.status as (typeof eventStatusEnum.enumValues)[number]));
  }
  if (params.source) {
    conditions.push(eq(events.source, params.source as (typeof eventSourceEnum.enumValues)[number]));
  }
  if (params.category) {
    conditions.push(eq(events.category, params.category as (typeof eventCategoryEnum.enumValues)[number]));
  }
  if (params.search) {
    conditions.push(
      sql`${events.searchVector} @@ plainto_tsquery('english', ${params.search})`
    );
  }

  const limit = Math.min(params.limit ?? 50, 200);
  const offset = params.offset ?? 0;

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [results, totalResult] = await Promise.all([
    db
      .select({ event: events, city: cities, country: countries })
      .from(events)
      .leftJoin(cities, eq(events.cityId, cities.id))
      .leftJoin(countries, eq(events.countryId, countries.id))
      .where(where)
      .orderBy(desc(events.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: count() })
      .from(events)
      .where(where),
  ]);

  return {
    events: results,
    total: totalResult[0]?.count ?? 0,
    limit,
    offset,
  };
}

export async function getEvent(id: string) {
  const result = await db
    .select({ event: events, city: cities, country: countries })
    .from(events)
    .leftJoin(cities, eq(events.cityId, cities.id))
    .leftJoin(countries, eq(events.countryId, countries.id))
    .where(eq(events.id, id))
    .limit(1);

  if (!result[0]) return null;

  const sources = await db
    .select()
    .from(eventSources)
    .where(eq(eventSources.eventId, id));

  return { ...result[0], sources };
}

export async function updateEvent(id: string, data: Partial<typeof events.$inferInsert>) {
  await db
    .update(events)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(events.id, id));
}

export async function deleteEvent(id: string) {
  await db.delete(events).where(eq(events.id, id));
}

export async function approveEvent(id: string, approvedById?: string) {
  await db
    .update(events)
    .set({
      status: "approved",
      approvedById,
      approvedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(events.id, id));
}

export async function rejectEvent(id: string, reason?: string) {
  await db
    .update(events)
    .set({
      status: "rejected",
      rejectionReason: reason,
      updatedAt: new Date(),
    })
    .where(eq(events.id, id));
}

export async function bulkAction(
  ids: string[],
  action: "approve" | "reject" | "delete",
  reason?: string,
) {
  for (const id of ids) {
    switch (action) {
      case "approve":
        await approveEvent(id);
        break;
      case "reject":
        await rejectEvent(id, reason);
        break;
      case "delete":
        await deleteEvent(id);
        break;
    }
  }
}

// ============================================================
// Scrapers
// ============================================================

export async function listScraperRuns(limit = 20) {
  return db
    .select()
    .from(scraperRuns)
    .orderBy(desc(scraperRuns.startedAt))
    .limit(limit);
}

// ============================================================
// Dashboard Stats
// ============================================================

export async function getDashboardStats() {
  const [
    statusCounts,
    sourceCounts,
    categoryCounts,
    recentRuns,
    weekCount,
  ] = await Promise.all([
    db
      .select({ status: events.status, count: count() })
      .from(events)
      .groupBy(events.status),
    db
      .select({ source: events.source, count: count() })
      .from(events)
      .groupBy(events.source),
    db
      .select({ category: events.category, count: count() })
      .from(events)
      .groupBy(events.category),
    db
      .select()
      .from(scraperRuns)
      .orderBy(desc(scraperRuns.startedAt))
      .limit(10),
    db
      .select({ count: count() })
      .from(events)
      .where(sql`${events.createdAt} > now() - interval '7 days'`),
  ]);

  return {
    byStatus: Object.fromEntries(statusCounts.map((r) => [r.status, r.count])),
    bySource: Object.fromEntries(sourceCounts.map((r) => [r.source, r.count])),
    byCategory: Object.fromEntries(categoryCounts.map((r) => [r.category, r.count])),
    recentRuns,
    eventsThisWeek: weekCount[0]?.count ?? 0,
  };
}
