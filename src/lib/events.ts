import { db } from "./db";
import { events, cities, countries } from "./db/schema";
import { eq, and, gte, lte, asc, inArray, sql, type SQL } from "drizzle-orm";
import type { eventCategoryEnum, eventTypeEnum, eventSizeEnum } from "./db/schema";

// Fields exposed to unauthenticated visitors. Deliberately excludes
// organizerEmail, moderation fields (aiModerationReason, moderatedByAI,
// rejectionReason, approvedById, approvedAt, categoryLocked, submittedById),
// sourceId, and searchVector.
const publicEventColumns = {
  id: events.id,
  title: events.title,
  slug: events.slug,
  description: events.description,
  shortDescription: events.shortDescription,
  category: events.category,
  eventType: events.eventType,
  size: events.size,
  tags: events.tags,
  status: events.status,
  startsAt: events.startsAt,
  endsAt: events.endsAt,
  timezone: events.timezone,
  isMultiDay: events.isMultiDay,
  cityId: events.cityId,
  countryId: events.countryId,
  venueName: events.venueName,
  venueAddress: events.venueAddress,
  latitude: events.latitude,
  longitude: events.longitude,
  isOnline: events.isOnline,
  isHybrid: events.isHybrid,
  onlineUrl: events.onlineUrl,
  websiteUrl: events.websiteUrl,
  registrationUrl: events.registrationUrl,
  lumaUrl: events.lumaUrl,
  eventbriteUrl: events.eventbriteUrl,
  meetupUrl: events.meetupUrl,
  confsTechUrl: events.confsTechUrl,
  devEventsUrl: events.devEventsUrl,
  imageUrl: events.imageUrl,
  thumbnailUrl: events.thumbnailUrl,
  isFree: events.isFree,
  priceFrom: events.priceFrom,
  priceTo: events.priceTo,
  currency: events.currency,
  source: events.source,
  sourceUrl: events.sourceUrl,
  organizerName: events.organizerName,
  organizerUrl: events.organizerUrl,
  createdAt: events.createdAt,
  updatedAt: events.updatedAt,
} as const;

export type PublicEvent = {
  [K in keyof typeof publicEventColumns]: (typeof events.$inferSelect)[K];
};

export interface EventWithRelations {
  event: PublicEvent;
  city: typeof cities.$inferSelect | null;
  country: typeof countries.$inferSelect | null;
}

interface EventFilters {
  country?: string;
  city?: string;
  category?: string;
  eventType?: string;
  size?: string;
  dateFrom?: string; // YYYY-MM-DD; interpreted in tzOffsetMinutes (default UTC)
  dateTo?: string;
  /**
   * Caller's local timezone offset from UTC in minutes (positive = ahead of UTC,
   * matching the standard convention; negate `Date#getTimezoneOffset()` on the
   * client). When omitted, dateFrom/dateTo are treated as UTC day boundaries.
   */
  tzOffsetMinutes?: number;
  isFree?: boolean;
  isOnline?: boolean;
  search?: string;
  latitude?: number;
  longitude?: number;
  radius?: number; // km
  sort?: string; // "date" (default), "size", "distance"
  limit?: number;
  cursor?: string;
}

/**
 * Convert a YYYY-MM-DD date string to the UTC instant of the start or end of
 * that local day in the given timezone offset. Anything that's not a bare
 * YYYY-MM-DD is parsed by `new Date()` directly (lets ISO strings with offsets
 * pass through untouched).
 */
export function parseDateBound(s: string, tzOffsetMinutes: number, end: boolean): Date {
  const ymdMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!ymdMatch) return new Date(s);
  const [, y, m, d] = ymdMatch;
  const utc = Date.UTC(
    Number(y),
    Number(m) - 1,
    Number(d),
    end ? 23 : 0,
    end ? 59 : 0,
    end ? 59 : 0,
    end ? 999 : 0,
  );
  return new Date(utc - tzOffsetMinutes * 60_000);
}

export interface CommonEventFilters {
  country?: string;
  city?: string;
  category?: string;
  eventType?: string;
  size?: string;
  dateFrom?: string;
  dateTo?: string;
  tzOffsetMinutes?: number;
  isFree?: boolean;
  isOnline?: boolean;
}

/**
 * Where-clause predicates shared between the public event listing, the map
 * endpoint, and the admin listing. Caller-specific predicates (status,
 * full-text vs ILIKE search, distance, cursor, etc.) stay with each caller.
 */
export function buildCommonEventConditions(filters: CommonEventFilters): SQL[] {
  const conditions: SQL[] = [];
  if (filters.country) {
    conditions.push(eq(countries.code, filters.country.toUpperCase()));
  }
  if (filters.city) {
    conditions.push(eq(cities.slug, filters.city));
  }
  if (filters.category) {
    const categories = filters.category
      .split(",")
      .filter(Boolean) as (typeof eventCategoryEnum.enumValues)[number][];
    if (categories.length === 1) {
      conditions.push(eq(events.category, categories[0]));
    } else if (categories.length > 1) {
      conditions.push(inArray(events.category, categories));
    }
  }
  if (filters.eventType) {
    conditions.push(eq(events.eventType, filters.eventType as (typeof eventTypeEnum.enumValues)[number]));
  }
  if (filters.size) {
    conditions.push(eq(events.size, filters.size as (typeof eventSizeEnum.enumValues)[number]));
  }
  if (filters.dateFrom) {
    conditions.push(gte(events.startsAt, parseDateBound(filters.dateFrom, filters.tzOffsetMinutes ?? 0, false)));
  }
  if (filters.dateTo) {
    conditions.push(lte(events.startsAt, parseDateBound(filters.dateTo, filters.tzOffsetMinutes ?? 0, true)));
  }
  if (filters.isFree) {
    conditions.push(eq(events.isFree, true));
  }
  if (filters.isOnline) {
    conditions.push(eq(events.isOnline, true));
  }
  return conditions;
}

export async function getEventsByTimeGroup() {
  const now = new Date();
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const weekEnd = new Date(now);
  const daysUntilSunday = 7 - now.getDay();
  weekEnd.setDate(now.getDate() + daysUntilSunday);
  weekEnd.setHours(23, 59, 59, 999);

  const allEvents = await db
    .select({
      event: publicEventColumns,
      city: cities,
      country: countries,
    })
    .from(events)
    .leftJoin(cities, eq(events.cityId, cities.id))
    .leftJoin(countries, eq(events.countryId, countries.id))
    .where(
      and(
        eq(events.status, "approved"),
        gte(events.startsAt, now),
      )
    )
    .orderBy(asc(events.startsAt))
    .limit(100);

  const today: typeof allEvents = [];
  const thisWeek: typeof allEvents = [];
  const upcoming: typeof allEvents = [];

  for (const row of allEvents) {
    const eventDate = new Date(row.event.startsAt);
    if (eventDate <= todayEnd) {
      today.push(row);
    } else if (eventDate <= weekEnd) {
      thisWeek.push(row);
    } else {
      upcoming.push(row);
    }
  }

  return { today, thisWeek, upcoming };
}

export async function getEventBySlug(slug: string) {
  const result = await db
    .select({
      event: publicEventColumns,
      city: cities,
      country: countries,
    })
    .from(events)
    .leftJoin(cities, eq(events.cityId, cities.id))
    .leftJoin(countries, eq(events.countryId, countries.id))
    .where(and(eq(events.slug, slug), eq(events.status, "approved")))
    .limit(1);

  return result[0] ?? null;
}

export async function getFilteredEvents(filters: EventFilters) {
  const conditions: SQL[] = [
    eq(events.status, "approved"),
    gte(events.startsAt, new Date()),
    ...buildCommonEventConditions(filters),
  ];

  if (filters.search) {
    conditions.push(
      sql`${events.searchVector} @@ plainto_tsquery('english', ${filters.search})`
    );
  }
  if (filters.latitude != null && filters.longitude != null && filters.radius) {
    const radiusMeters = filters.radius * 1000;
    conditions.push(
      sql`ST_DWithin(
        ST_SetSRID(ST_MakePoint(
          COALESCE(${events.longitude}, ${cities.longitude}),
          COALESCE(${events.latitude}, ${cities.latitude})
        ), 4326)::geography,
        ST_SetSRID(ST_MakePoint(${filters.longitude}, ${filters.latitude}), 4326)::geography,
        ${radiusMeters}
      )`
    );
  }

  const limit = Math.min(filters.limit || 20, 100);

  if (filters.cursor) {
    conditions.push(
      sql`(${events.startsAt}, ${events.id}) > (
        SELECT starts_at, id FROM events WHERE id = ${filters.cursor}
      )`
    );
  }

  // Sorting — supports "-field" prefix for descending
  const sortRaw = filters.sort ?? "date";
  const sortDesc = sortRaw.startsWith("-");
  const sortField = sortDesc ? sortRaw.slice(1) : sortRaw;
  const dir = sortDesc ? "DESC" : "ASC";

  let orderExpr: SQL;
  if (sortField === "size") {
    // Map size enum to numeric order; flip for desc
    const sizeOrder = sortDesc
      ? sql`CASE ${events.size}
          WHEN 'small' THEN 1 WHEN 'medium' THEN 2
          WHEN 'large' THEN 3 WHEN 'major' THEN 4 ELSE 0
        END DESC, ${events.startsAt} ASC`
      : sql`CASE ${events.size}
          WHEN 'major' THEN 1 WHEN 'large' THEN 2
          WHEN 'medium' THEN 3 WHEN 'small' THEN 4 ELSE 5
        END ASC, ${events.startsAt} ASC`;
    orderExpr = sizeOrder;
  } else if (sortField === "distance" && filters.latitude != null && filters.longitude != null) {
    orderExpr = sql`ST_Distance(
      ST_SetSRID(ST_MakePoint(
        COALESCE(${events.longitude}, ${cities.longitude}),
        COALESCE(${events.latitude}, ${cities.latitude})
      ), 4326)::geography,
      ST_SetSRID(ST_MakePoint(${filters.longitude}, ${filters.latitude}), 4326)::geography
    ) ASC NULLS LAST`;
  } else {
    // date (default)
    orderExpr = dir === "DESC"
      ? sql`${events.startsAt} DESC`
      : sql`${events.startsAt} ASC`;
  }

  const results = await db
    .select({
      event: publicEventColumns,
      city: cities,
      country: countries,
    })
    .from(events)
    .leftJoin(cities, eq(events.cityId, cities.id))
    .leftJoin(countries, eq(events.countryId, countries.id))
    .where(and(...conditions))
    .orderBy(orderExpr)
    .limit(limit + 1);

  const hasMore = results.length > limit;
  const data = hasMore ? results.slice(0, limit) : results;

  return {
    events: data,
    nextCursor: hasMore ? data[data.length - 1].event.id : null,
  };
}

export interface MapEvent {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  category: string;
  eventType: string;
  size: string | null;
  startsAt: Date;
  endsAt: Date | null;
  timezone: string;
  isFree: boolean;
  isOnline: boolean;
  latitude: number;
  longitude: number;
  cityName: string | null;
  countryCode: string | null;
  countryName: string | null;
}

export async function getMapEvents(filters: Omit<EventFilters, "limit" | "cursor">): Promise<MapEvent[]> {
  const conditions: SQL[] = [
    eq(events.status, "approved"),
    gte(events.startsAt, new Date()),
    sql`COALESCE(${events.latitude}, ${cities.latitude}) IS NOT NULL`,
    sql`COALESCE(${events.longitude}, ${cities.longitude}) IS NOT NULL`,
    ...buildCommonEventConditions(filters),
  ];

  if (filters.search) {
    conditions.push(
      sql`${events.searchVector} @@ plainto_tsquery('english', ${filters.search})`
    );
  }

  const results = await db
    .select({
      id: events.id,
      title: events.title,
      slug: events.slug,
      description: events.shortDescription,
      category: events.category,
      eventType: events.eventType,
      size: events.size,
      startsAt: events.startsAt,
      endsAt: events.endsAt,
      timezone: events.timezone,
      isFree: events.isFree,
      isOnline: events.isOnline,
      latitude: sql<number>`COALESCE(${events.latitude}, ${cities.latitude})`.as("latitude"),
      longitude: sql<number>`COALESCE(${events.longitude}, ${cities.longitude})`.as("longitude"),
      cityName: cities.name,
      countryCode: countries.code,
      countryName: countries.name,
    })
    .from(events)
    .leftJoin(cities, eq(events.cityId, cities.id))
    .leftJoin(countries, eq(events.countryId, countries.id))
    .where(and(...conditions))
    .orderBy(asc(events.startsAt))
    .limit(1337);

  return results as MapEvent[];
}

/**
 * Turn user input into a prefix-matching `to_tsquery` expression —
 * `"ds rott"` becomes `"ds:* & rott:*"` so partial words match
 * (e.g. "rott" hits "Rotterdam"). Strips `to_tsquery`'s operator
 * characters so arbitrary input can't break the query.
 */
function toPrefixTsQuery(query: string): string {
  return query
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .map((token) => `${token}:*`)
    .join(" & ");
}

export async function searchEvents(query: string, autocomplete = false) {
  const limit = autocomplete ? 8 : 20;
  const tsQuery = toPrefixTsQuery(query);
  if (!tsQuery) return autocomplete ? { suggestions: [] } : { results: [] };

  if (autocomplete) {
    const results = await db
      .select({
        id: events.id,
        title: events.title,
        slug: events.slug,
        category: events.category,
        startsAt: events.startsAt,
        cityName: cities.name,
        countryCode: countries.code,
      })
      .from(events)
      .leftJoin(cities, eq(events.cityId, cities.id))
      .leftJoin(countries, eq(events.countryId, countries.id))
      .where(
        and(
          eq(events.status, "approved"),
          gte(events.startsAt, new Date()),
          sql`${events.searchVector} @@ to_tsquery('english', ${tsQuery})`,
        )
      )
      .orderBy(sql`ts_rank(${events.searchVector}, to_tsquery('english', ${tsQuery})) DESC`)
      .limit(limit);

    return { suggestions: results };
  }

  const results = await db
    .select({
      event: publicEventColumns,
      city: cities,
      country: countries,
      rank: sql<number>`ts_rank(${events.searchVector}, to_tsquery('english', ${tsQuery}))`.as("rank"),
      headline: sql<string>`ts_headline('english', ${events.title}, to_tsquery('english', ${tsQuery}))`.as("headline"),
    })
    .from(events)
    .leftJoin(cities, eq(events.cityId, cities.id))
    .leftJoin(countries, eq(events.countryId, countries.id))
    .where(
      and(
        eq(events.status, "approved"),
        sql`${events.searchVector} @@ to_tsquery('english', ${tsQuery})`,
      )
    )
    .orderBy(sql`rank DESC`)
    .limit(limit);

  return { results };
}
