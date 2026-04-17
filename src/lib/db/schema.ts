import {
  pgTable, pgEnum, text, integer, timestamp, boolean,
  varchar, uuid, jsonb, real, index, uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations, sql, type SQL } from "drizzle-orm";
import { tsvector, point } from "./types";

// ============================================================
// ENUMS
// ============================================================

export const eventStatusEnum = pgEnum("event_status", [
  "draft", "pending", "approved", "rejected", "cancelled", "past",
]);

export const eventCategoryEnum = pgEnum("event_category", [
  "ai_ml_research", "ai_powered_dev", "software_dev", "data_analytics",
  "cloud_devops", "security", "design_ux", "blockchain_web3",
  "entrepreneurship", "hardware_iot", "hacker_maker", "other",
]);

export const eventTypeEnum = pgEnum("event_type", [
  "conference", "meetup", "hackathon", "workshop", "webinar",
  "networking", "demo_day", "panel", "career_fair", "other",
]);

export const eventSizeEnum = pgEnum("event_size", [
  "small", "medium", "large", "major",
]);

export const eventSourceEnum = pgEnum("event_source", [
  "manual", "community", "luma", "eventbrite", "meetup",
  "confs_tech", "dev_events", "other",
]);

export const userRoleEnum = pgEnum("user_role", [
  "user", "moderator", "admin",
]);

// ============================================================
// TABLES
// ============================================================

export const countries = pgTable("countries", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  code: varchar("code", { length: 2 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  timezone: varchar("timezone", { length: 50 }).notNull(),
  isEu: boolean("is_eu").notNull().default(false),
  region: varchar("region", { length: 50 }),
}, (t) => [
  index("idx_countries_code").on(t.code),
]);

export const cities = pgTable("cities", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 200 }).notNull(),
  slug: varchar("slug", { length: 200 }).notNull().unique(),
  countryId: integer("country_id").notNull().references(() => countries.id),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  location: point("location"),
  timezone: varchar("timezone", { length: 50 }).notNull(),
  isPopular: boolean("is_popular").notNull().default(false),
  eventCount: integer("event_count").notNull().default(0),
}, (t) => [
  index("idx_cities_country").on(t.countryId),
  index("idx_cities_slug").on(t.slug),
  index("idx_cities_location").using("gist", t.location),
]);

export const events = pgTable("events", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: varchar("title", { length: 300 }).notNull(),
  slug: varchar("slug", { length: 350 }).notNull().unique(),
  description: text("description"),
  shortDescription: varchar("short_description", { length: 500 }),
  category: eventCategoryEnum("category").notNull(),
  eventType: eventTypeEnum("event_type").notNull(),
  size: eventSizeEnum("size"),
  tags: text("tags").array(),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  timezone: varchar("timezone", { length: 50 }).notNull(),
  isMultiDay: boolean("is_multi_day").notNull().default(false),
  cityId: integer("city_id").references(() => cities.id),
  countryId: integer("country_id").references(() => countries.id),
  venueName: varchar("venue_name", { length: 300 }),
  venueAddress: text("venue_address"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  location: point("location"),
  isOnline: boolean("is_online").notNull().default(false),
  isHybrid: boolean("is_hybrid").notNull().default(false),
  onlineUrl: text("online_url"),
  websiteUrl: text("website_url"),
  registrationUrl: text("registration_url"),
  lumaUrl: text("luma_url"),
  eventbriteUrl: text("eventbrite_url"),
  meetupUrl: text("meetup_url"),
  imageUrl: text("image_url"),
  thumbnailUrl: text("thumbnail_url"),
  isFree: boolean("is_free").notNull().default(true),
  priceFrom: real("price_from"),
  priceTo: real("price_to"),
  currency: varchar("currency", { length: 3 }).default("EUR"),
  status: eventStatusEnum("status").notNull().default("draft"),
  source: eventSourceEnum("source").notNull().default("manual"),
  sourceId: varchar("source_id", { length: 500 }),
  sourceUrl: text("source_url"),
  confsTechUrl: text("confs_tech_url"),
  devEventsUrl: text("dev_events_url"),
  organizerName: varchar("organizer_name", { length: 300 }),
  organizerUrl: text("organizer_url"),
  organizerEmail: varchar("organizer_email", { length: 300 }),
  viewCount: integer("view_count").notNull().default(0),
  submittedById: text("submitted_by_id").references(() => users.id),
  approvedById: text("approved_by_id").references(() => users.id),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  rejectionReason: text("rejection_reason"),
  searchVector: tsvector("search_vector").generatedAlwaysAs(
    (): SQL => sql`
      setweight(to_tsvector('english', coalesce(${events.title}, '')), 'A') ||
      setweight(to_tsvector('english', coalesce(${events.shortDescription}, '')), 'B') ||
      setweight(to_tsvector('english', coalesce(${events.description}, '')), 'C') ||
      setweight(to_tsvector('english', coalesce(${events.organizerName}, '')), 'D')
    `
  ),
  categoryLocked: boolean("category_locked").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_events_status").on(t.status),
  index("idx_events_category").on(t.category),
  index("idx_events_type").on(t.eventType),
  index("idx_events_starts_at").on(t.startsAt),
  index("idx_events_city").on(t.cityId),
  index("idx_events_country").on(t.countryId),
  index("idx_events_source").on(t.source, t.sourceId),
  index("idx_events_location").using("gist", t.location),
  index("idx_events_search").using("gin", t.searchVector),
  index("idx_events_listing").on(t.status, t.startsAt),
]);

export const tagDefinitions = pgTable("tag_definitions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  usageCount: integer("usage_count").notNull().default(0),
}, (t) => [
  index("idx_tags_slug").on(t.slug),
]);

export const eventTags = pgTable("event_tags", {
  eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  tagId: integer("tag_id").notNull().references(() => tagDefinitions.id, { onDelete: "cascade" }),
}, (t) => [
  uniqueIndex("idx_event_tags_unique").on(t.eventId, t.tagId),
]);

export const users = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  role: userRoleEnum("role").notNull().default("user"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("providerAccountId").notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: text("token_type"),
  scope: text("scope"),
  id_token: text("id_token"),
  session_state: text("session_state"),
}, (t) => [
  uniqueIndex("idx_accounts_provider").on(t.provider, t.providerAccountId),
]);

export const sessions = pgTable("sessions", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable("verificationTokens", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull(),
  expires: timestamp("expires", { mode: "date" }).notNull(),
}, (t) => [
  uniqueIndex("idx_verification_tokens").on(t.identifier, t.token),
]);

export const scraperSources = pgTable("scraper_sources", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 200 }).notNull(),
  sourceType: eventSourceEnum("source_type").notNull(),
  url: text("url").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  defaultCategory: eventCategoryEnum("default_category"),
  defaultCityId: integer("default_city_id").references(() => cities.id),
  lastScrapedAt: timestamp("last_scraped_at", { withTimezone: true }),
  eventsFound: integer("events_found").notNull().default(0),
  config: jsonb("config"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const consentLog = pgTable("consent_log", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  sessionId: varchar("session_id", { length: 100 }).notNull(),
  consentGiven: boolean("consent_given").notNull(),
  categories: jsonb("categories"),
  ipHash: varchar("ip_hash", { length: 64 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const scraperRunStatusEnum = pgEnum("scraper_run_status", [
  "running", "completed", "failed",
]);

export const diffStatusEnum = pgEnum("diff_status", [
  "new", "updated", "removed", "unchanged",
]);

export const eventSources = pgTable("event_sources", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  source: eventSourceEnum("source").notNull(),
  sourceId: text("source_id").notNull(),
  sourceUrl: text("source_url"),
  rawData: jsonb("raw_data"),
  firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("idx_event_sources_unique").on(t.eventId, t.source),
  index("idx_event_sources_source_id").on(t.source, t.sourceId),
]);

export const eventFingerprints = pgTable("event_fingerprints", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  fingerprintType: text("fingerprint_type").notNull(),
  fingerprintValue: text("fingerprint_value").notNull(),
}, (t) => [
  uniqueIndex("idx_fingerprints_unique").on(t.fingerprintType, t.fingerprintValue),
]);

export const scraperRuns = pgTable("scraper_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  source: eventSourceEnum("source").notNull(),
  status: scraperRunStatusEnum("status").notNull().default("running"),
  eventsFound: integer("events_found").notNull().default(0),
  eventsCreated: integer("events_created").notNull().default(0),
  eventsUpdated: integer("events_updated").notNull().default(0),
  eventsDeduplicated: integer("events_deduplicated").notNull().default(0),
  progress: integer("progress").notNull().default(0), // 0-100
  progressDetail: text("progress_detail"), // e.g. "Searching Berlin (5/60)"
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const stagedEvents = pgTable("staged_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  scraperRunId: uuid("scraper_run_id").notNull().references(() => scraperRuns.id, { onDelete: "cascade" }),
  // Core event fields (mirrored from events table)
  title: varchar("title", { length: 300 }).notNull(),
  slug: varchar("slug", { length: 350 }).notNull(),
  description: text("description"),
  shortDescription: varchar("short_description", { length: 500 }),
  category: eventCategoryEnum("category").notNull(),
  eventType: eventTypeEnum("event_type").notNull(),
  size: eventSizeEnum("size"),
  tags: text("tags").array(),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  timezone: varchar("timezone", { length: 50 }).notNull(),
  isMultiDay: boolean("is_multi_day").notNull().default(false),
  cityId: integer("city_id").references(() => cities.id),
  countryId: integer("country_id").references(() => countries.id),
  venueName: varchar("venue_name", { length: 300 }),
  venueAddress: text("venue_address"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  isOnline: boolean("is_online").notNull().default(false),
  isHybrid: boolean("is_hybrid").notNull().default(false),
  onlineUrl: text("online_url"),
  websiteUrl: text("website_url"),
  registrationUrl: text("registration_url"),
  lumaUrl: text("luma_url"),
  eventbriteUrl: text("eventbrite_url"),
  meetupUrl: text("meetup_url"),
  confsTechUrl: text("confs_tech_url"),
  devEventsUrl: text("dev_events_url"),
  imageUrl: text("image_url"),
  thumbnailUrl: text("thumbnail_url"),
  isFree: boolean("is_free").notNull().default(true),
  priceFrom: real("price_from"),
  priceTo: real("price_to"),
  currency: varchar("currency", { length: 3 }).default("EUR"),
  source: eventSourceEnum("source").notNull(),
  sourceId: varchar("source_id", { length: 500 }),
  sourceUrl: text("source_url"),
  organizerName: varchar("organizer_name", { length: 300 }),
  organizerUrl: text("organizer_url"),
  organizerEmail: varchar("organizer_email", { length: 300 }),
  // Staging-specific fields
  diffStatus: diffStatusEnum("diff_status").notNull().default("new"),
  matchedEventId: uuid("matched_event_id").references(() => events.id),
  fieldDiffs: jsonb("field_diffs"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================
// RELATIONS
// ============================================================

export const countriesRelations = relations(countries, ({ many }) => ({
  cities: many(cities),
  events: many(events),
}));

export const citiesRelations = relations(cities, ({ one, many }) => ({
  country: one(countries, { fields: [cities.countryId], references: [countries.id] }),
  events: many(events),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  city: one(cities, { fields: [events.cityId], references: [cities.id] }),
  country: one(countries, { fields: [events.countryId], references: [countries.id] }),
  submittedBy: one(users, { fields: [events.submittedById], references: [users.id] }),
  approvedBy: one(users, { fields: [events.approvedById], references: [users.id] }),
  eventTags: many(eventTags),
  sources: many(eventSources),
  fingerprints: many(eventFingerprints),
}));

export const eventTagsRelations = relations(eventTags, ({ one }) => ({
  event: one(events, { fields: [eventTags.eventId], references: [events.id] }),
  tag: one(tagDefinitions, { fields: [eventTags.tagId], references: [tagDefinitions.id] }),
}));

export const eventSourcesRelations = relations(eventSources, ({ one }) => ({
  event: one(events, { fields: [eventSources.eventId], references: [events.id] }),
}));

export const eventFingerprintsRelations = relations(eventFingerprints, ({ one }) => ({
  event: one(events, { fields: [eventFingerprints.eventId], references: [events.id] }),
}));

export const scraperRunsRelations = relations(scraperRuns, ({ many }) => ({
  stagedEvents: many(stagedEvents),
}));

export const stagedEventsRelations = relations(stagedEvents, ({ one }) => ({
  scraperRun: one(scraperRuns, { fields: [stagedEvents.scraperRunId], references: [scraperRuns.id] }),
  matchedEvent: one(events, { fields: [stagedEvents.matchedEventId], references: [events.id] }),
}));
