CREATE TYPE "public"."diff_status" AS ENUM('new', 'updated', 'removed', 'unchanged');--> statement-breakpoint
CREATE TYPE "public"."scraper_run_status" AS ENUM('running', 'completed', 'failed');--> statement-breakpoint
ALTER TYPE "public"."event_category" ADD VALUE 'hacker_maker_community' BEFORE 'general_tech';--> statement-breakpoint
ALTER TYPE "public"."event_source" ADD VALUE 'confs_tech' BEFORE 'other';--> statement-breakpoint
ALTER TYPE "public"."event_source" ADD VALUE 'dev_events' BEFORE 'other';--> statement-breakpoint
CREATE TABLE "event_fingerprints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"fingerprint_type" text NOT NULL,
	"fingerprint_value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"source" "event_source" NOT NULL,
	"source_id" text NOT NULL,
	"source_url" text,
	"raw_data" jsonb,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scraper_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" "event_source" NOT NULL,
	"status" "scraper_run_status" DEFAULT 'running' NOT NULL,
	"events_found" integer DEFAULT 0 NOT NULL,
	"events_created" integer DEFAULT 0 NOT NULL,
	"events_updated" integer DEFAULT 0 NOT NULL,
	"events_deduplicated" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "staged_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scraper_run_id" uuid NOT NULL,
	"title" varchar(300) NOT NULL,
	"slug" varchar(350) NOT NULL,
	"description" text,
	"short_description" varchar(500),
	"category" "event_category" NOT NULL,
	"event_type" "event_type" NOT NULL,
	"size" "event_size",
	"tags" text[],
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone,
	"timezone" varchar(50) NOT NULL,
	"is_multi_day" boolean DEFAULT false NOT NULL,
	"city_id" integer,
	"country_id" integer,
	"venue_name" varchar(300),
	"venue_address" text,
	"latitude" real,
	"longitude" real,
	"is_online" boolean DEFAULT false NOT NULL,
	"is_hybrid" boolean DEFAULT false NOT NULL,
	"online_url" text,
	"website_url" text,
	"registration_url" text,
	"luma_url" text,
	"eventbrite_url" text,
	"meetup_url" text,
	"confs_tech_url" text,
	"dev_events_url" text,
	"image_url" text,
	"thumbnail_url" text,
	"is_free" boolean DEFAULT true NOT NULL,
	"price_from" real,
	"price_to" real,
	"currency" varchar(3) DEFAULT 'EUR',
	"source" "event_source" NOT NULL,
	"source_id" varchar(500),
	"source_url" text,
	"organizer_name" varchar(300),
	"organizer_url" text,
	"organizer_email" varchar(300),
	"diff_status" "diff_status" DEFAULT 'new' NOT NULL,
	"matched_event_id" uuid,
	"field_diffs" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "confs_tech_url" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "dev_events_url" text;--> statement-breakpoint
ALTER TABLE "event_fingerprints" ADD CONSTRAINT "event_fingerprints_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_sources" ADD CONSTRAINT "event_sources_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staged_events" ADD CONSTRAINT "staged_events_scraper_run_id_scraper_runs_id_fk" FOREIGN KEY ("scraper_run_id") REFERENCES "public"."scraper_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staged_events" ADD CONSTRAINT "staged_events_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staged_events" ADD CONSTRAINT "staged_events_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staged_events" ADD CONSTRAINT "staged_events_matched_event_id_events_id_fk" FOREIGN KEY ("matched_event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_fingerprints_unique" ON "event_fingerprints" USING btree ("fingerprint_type","fingerprint_value");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_event_sources_unique" ON "event_sources" USING btree ("event_id","source");--> statement-breakpoint
CREATE INDEX "idx_event_sources_source_id" ON "event_sources" USING btree ("source","source_id");