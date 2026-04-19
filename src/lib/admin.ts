import { db } from "./db";
import {
  events, cities, countries, eventSources, scraperRuns,
} from "./db/schema";
import { eq, and, asc, desc, sql, count, isNull, ilike, or, type SQL } from "drizzle-orm";
import { buildCommonEventConditions } from "./events";
import type { eventStatusEnum, eventSourceEnum } from "./db/schema";
import type { NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";

// ============================================================
// Auth
// ============================================================

export const ADMIN_COOKIE_NAME = "admin-session";

function verifyAdminSecret(candidate: string | undefined): boolean {
  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret || !candidate) return false;
  const a = Buffer.from(adminSecret);
  const b = Buffer.from(candidate);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Verify the admin session cookie on an incoming request. */
export function isAdminAuthorized(request: NextRequest): boolean {
  return verifyAdminSecret(request.cookies.get(ADMIN_COOKIE_NAME)?.value);
}

/** Verify a raw secret (used by the login handler). */
export function isValidAdminSecret(secret: string | undefined): boolean {
  return verifyAdminSecret(secret);
}

// ============================================================
// Events
// ============================================================

interface ListEventsParams {
  status?: string;
  source?: string;
  category?: string;
  eventType?: string;
  size?: string;
  country?: string;
  search?: string;
  noLocation?: boolean;
  moderated?: string; // "ai", "not_ai"
  dateFrom?: string; // YYYY-MM-DD, start-of-day in tzOffsetMinutes (default UTC)
  dateTo?: string;   // YYYY-MM-DD, end-of-day in tzOffsetMinutes (default UTC)
  tzOffsetMinutes?: number; // see EventFilters in lib/events.ts for semantics
  sort?: string; // "date", "-date", "title", "-title", "created", "-created"
  limit?: number;
  offset?: number;
}

export async function listEvents(params: ListEventsParams) {
  const conditions: SQL[] = [...buildCommonEventConditions(params)];

  if (params.status) {
    conditions.push(eq(events.status, params.status as (typeof eventStatusEnum.enumValues)[number]));
  }
  if (params.source) {
    conditions.push(eq(events.source, params.source as (typeof eventSourceEnum.enumValues)[number]));
  }
  if (params.noLocation) {
    conditions.push(and(isNull(events.cityId), isNull(events.latitude))!);
  }
  if (params.moderated === "ai") {
    conditions.push(eq(events.moderatedByAI, true));
  } else if (params.moderated === "not_ai") {
    conditions.push(eq(events.moderatedByAI, false));
  }
  if (params.search) {
    // Use ILIKE for partial matching (admin search), not full-text search
    const pattern = `%${params.search}%`;
    conditions.push(
      or(
        ilike(events.title, pattern),
        ilike(cities.name, pattern),
        ilike(events.organizerName, pattern),
      )!
    );
  }

  const limit = Math.min(params.limit ?? 50, 500);
  const offset = params.offset ?? 0;

  // Sorting
  let orderBy;
  switch (params.sort) {
    case "date": orderBy = asc(events.startsAt); break;
    case "-date": orderBy = desc(events.startsAt); break;
    case "title": orderBy = asc(events.title); break;
    case "-title": orderBy = desc(events.title); break;
    case "created": orderBy = asc(events.createdAt); break;
    case "-created": orderBy = desc(events.createdAt); break;
    case "updated": orderBy = asc(events.updatedAt); break;
    case "-updated": orderBy = desc(events.updatedAt); break;
    default: orderBy = desc(events.createdAt);
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [results, totalResult] = await Promise.all([
    db
      .select({ event: events, city: cities, country: countries })
      .from(events)
      .leftJoin(cities, eq(events.cityId, cities.id))
      .leftJoin(countries, eq(events.countryId, countries.id))
      .where(where)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset),
    db
      .select({ count: count() })
      .from(events)
      .leftJoin(cities, eq(events.cityId, cities.id))
      .leftJoin(countries, eq(events.countryId, countries.id))
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

// Columns an admin is permitted to PATCH. Excludes identity (id, slug),
// status (handled via approve/reject/pending endpoints), provenance
// (source*, approvedBy*, submittedById, createdAt), moderation state
// (moderatedByAI, aiModerationReason, rejectionReason), and generated
// columns (searchVector, viewCount, updatedAt).
const PATCHABLE_EVENT_FIELDS = new Set<keyof typeof events.$inferInsert>([
  "title",
  "description",
  "shortDescription",
  "category",
  "categoryLocked",
  "eventType",
  "size",
  "tags",
  "startsAt",
  "endsAt",
  "timezone",
  "isMultiDay",
  "cityId",
  "countryId",
  "venueName",
  "venueAddress",
  "latitude",
  "longitude",
  "isOnline",
  "isHybrid",
  "onlineUrl",
  "websiteUrl",
  "registrationUrl",
  "lumaUrl",
  "eventbriteUrl",
  "meetupUrl",
  "confsTechUrl",
  "devEventsUrl",
  "imageUrl",
  "thumbnailUrl",
  "isFree",
  "priceFrom",
  "priceTo",
  "currency",
  "organizerName",
  "organizerUrl",
  "organizerEmail",
  "sourceUrl",
]);

export async function updateEvent(id: string, data: Partial<typeof events.$inferInsert>) {
  const processed: Partial<typeof events.$inferInsert> = {};
  for (const [key, value] of Object.entries(data)) {
    if (PATCHABLE_EVENT_FIELDS.has(key as keyof typeof events.$inferInsert)) {
      (processed as Record<string, unknown>)[key] = value;
    }
  }

  // Convert date strings to Date objects for timestamp columns
  if (typeof processed.startsAt === "string") processed.startsAt = new Date(processed.startsAt);
  if (typeof processed.endsAt === "string") processed.endsAt = new Date(processed.endsAt as string);

  // If cityId changes, auto-populate countryId from the city's country
  if (processed.cityId != null && processed.countryId == null) {
    const [city] = await db
      .select({ countryId: cities.countryId })
      .from(cities)
      .where(eq(cities.id, processed.cityId as number))
      .limit(1);
    if (city) processed.countryId = city.countryId;
  }

  if (Object.keys(processed).length === 0) return;

  await db
    .update(events)
    .set({ ...processed, updatedAt: new Date() })
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

export async function setEventPending(id: string) {
  await db
    .update(events)
    .set({
      status: "pending",
      updatedAt: new Date(),
    })
    .where(eq(events.id, id));
}

export async function bulkAction(
  ids: string[],
  action: "approve" | "reject" | "pending" | "delete",
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
      case "pending":
        await setEventPending(id);
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
