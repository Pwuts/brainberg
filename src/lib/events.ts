import { db } from "./db";
import { events, cities, countries } from "./db/schema";
import { eq, and, gte, lte, asc, sql, type SQL } from "drizzle-orm";
import type { eventCategoryEnum, eventTypeEnum, eventSizeEnum } from "./db/schema";

export type EventWithRelations = typeof events.$inferSelect & {
  city: typeof cities.$inferSelect | null;
  country: typeof countries.$inferSelect | null;
};

interface EventFilters {
  country?: string;
  city?: string;
  category?: string;
  eventType?: string;
  size?: string;
  dateFrom?: string;
  dateTo?: string;
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
      event: events,
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
      event: events,
      city: cities,
      country: countries,
    })
    .from(events)
    .leftJoin(cities, eq(events.cityId, cities.id))
    .leftJoin(countries, eq(events.countryId, countries.id))
    .where(eq(events.slug, slug))
    .limit(1);

  return result[0] ?? null;
}

export async function getFilteredEvents(filters: EventFilters) {
  const conditions: SQL[] = [
    eq(events.status, "approved"),
    gte(events.startsAt, new Date()),
  ];

  if (filters.country) {
    conditions.push(
      eq(countries.code, filters.country.toUpperCase())
    );
  }
  if (filters.city) {
    conditions.push(eq(cities.slug, filters.city));
  }
  if (filters.category) {
    conditions.push(eq(events.category, filters.category as (typeof eventCategoryEnum.enumValues)[number]));
  }
  if (filters.eventType) {
    conditions.push(eq(events.eventType, filters.eventType as (typeof eventTypeEnum.enumValues)[number]));
  }
  if (filters.size) {
    conditions.push(eq(events.size, filters.size as (typeof eventSizeEnum.enumValues)[number]));
  }
  if (filters.dateFrom) {
    conditions.push(gte(events.startsAt, new Date(filters.dateFrom)));
  }
  if (filters.dateTo) {
    conditions.push(lte(events.startsAt, new Date(filters.dateTo)));
  }
  if (filters.isFree) {
    conditions.push(eq(events.isFree, true));
  }
  if (filters.isOnline) {
    conditions.push(eq(events.isOnline, true));
  }
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
      event: events,
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
  ];

  if (filters.country) {
    conditions.push(eq(countries.code, filters.country.toUpperCase()));
  }
  if (filters.city) {
    conditions.push(eq(cities.slug, filters.city));
  }
  if (filters.category) {
    conditions.push(eq(events.category, filters.category as (typeof eventCategoryEnum.enumValues)[number]));
  }
  if (filters.eventType) {
    conditions.push(eq(events.eventType, filters.eventType as (typeof eventTypeEnum.enumValues)[number]));
  }
  if (filters.size) {
    conditions.push(eq(events.size, filters.size as (typeof eventSizeEnum.enumValues)[number]));
  }
  if (filters.dateFrom) {
    conditions.push(gte(events.startsAt, new Date(filters.dateFrom)));
  }
  if (filters.dateTo) {
    conditions.push(lte(events.startsAt, new Date(filters.dateTo)));
  }
  if (filters.isFree) {
    conditions.push(eq(events.isFree, true));
  }
  if (filters.isOnline) {
    conditions.push(eq(events.isOnline, true));
  }
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

export async function searchEvents(query: string, autocomplete = false) {
  const limit = autocomplete ? 8 : 20;

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
          sql`${events.searchVector} @@ plainto_tsquery('english', ${query})`,
        )
      )
      .orderBy(sql`ts_rank(${events.searchVector}, plainto_tsquery('english', ${query})) DESC`)
      .limit(limit);

    return { suggestions: results };
  }

  const results = await db
    .select({
      event: events,
      city: cities,
      country: countries,
      rank: sql<number>`ts_rank(${events.searchVector}, plainto_tsquery('english', ${query}))`.as("rank"),
      headline: sql<string>`ts_headline('english', ${events.title}, plainto_tsquery('english', ${query}))`.as("headline"),
    })
    .from(events)
    .leftJoin(cities, eq(events.cityId, cities.id))
    .leftJoin(countries, eq(events.countryId, countries.id))
    .where(
      and(
        eq(events.status, "approved"),
        sql`${events.searchVector} @@ plainto_tsquery('english', ${query})`,
      )
    )
    .orderBy(sql`rank DESC`)
    .limit(limit);

  return { results };
}
