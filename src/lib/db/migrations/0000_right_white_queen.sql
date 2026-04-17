CREATE TYPE "public"."event_category" AS ENUM('ai_ml', 'blockchain_web3', 'devtools', 'cloud_infra', 'cybersecurity', 'data_science', 'design_ux', 'fintech', 'healthtech', 'robotics', 'startup', 'general_tech', 'other');--> statement-breakpoint
CREATE TYPE "public"."event_size" AS ENUM('small', 'medium', 'large', 'major');--> statement-breakpoint
CREATE TYPE "public"."event_source" AS ENUM('manual', 'community', 'luma', 'eventbrite', 'meetup', 'other');--> statement-breakpoint
CREATE TYPE "public"."event_status" AS ENUM('draft', 'pending', 'approved', 'rejected', 'cancelled', 'past');--> statement-breakpoint
CREATE TYPE "public"."event_type" AS ENUM('conference', 'meetup', 'hackathon', 'workshop', 'webinar', 'networking', 'demo_day', 'panel', 'career_fair', 'other');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'moderator', 'admin');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"providerAccountId" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text
);
--> statement-breakpoint
CREATE TABLE "cities" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "cities_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(200) NOT NULL,
	"slug" varchar(200) NOT NULL,
	"country_id" integer NOT NULL,
	"latitude" real NOT NULL,
	"longitude" real NOT NULL,
	"location" geometry(Point, 4326),
	"timezone" varchar(50) NOT NULL,
	"is_popular" boolean DEFAULT false NOT NULL,
	"event_count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "cities_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "consent_log" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "consent_log_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"session_id" varchar(100) NOT NULL,
	"consent_given" boolean NOT NULL,
	"categories" jsonb,
	"ip_hash" varchar(64),
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "countries" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "countries_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"code" varchar(2) NOT NULL,
	"name" varchar(100) NOT NULL,
	"timezone" varchar(50) NOT NULL,
	"is_eu" boolean DEFAULT false NOT NULL,
	"region" varchar(50),
	CONSTRAINT "countries_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "event_tags" (
	"event_id" uuid NOT NULL,
	"tag_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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
	"location" geometry(Point, 4326),
	"is_online" boolean DEFAULT false NOT NULL,
	"is_hybrid" boolean DEFAULT false NOT NULL,
	"online_url" text,
	"website_url" text,
	"registration_url" text,
	"luma_url" text,
	"eventbrite_url" text,
	"meetup_url" text,
	"image_url" text,
	"thumbnail_url" text,
	"is_free" boolean DEFAULT true NOT NULL,
	"price_from" real,
	"price_to" real,
	"currency" varchar(3) DEFAULT 'EUR',
	"status" "event_status" DEFAULT 'draft' NOT NULL,
	"source" "event_source" DEFAULT 'manual' NOT NULL,
	"source_id" varchar(500),
	"source_url" text,
	"organizer_name" varchar(300),
	"organizer_url" text,
	"organizer_email" varchar(300),
	"view_count" integer DEFAULT 0 NOT NULL,
	"submitted_by_id" text,
	"approved_by_id" text,
	"approved_at" timestamp with time zone,
	"rejection_reason" text,
	"search_vector" "tsvector" GENERATED ALWAYS AS (
      setweight(to_tsvector('english', coalesce("events"."title", '')), 'A') ||
      setweight(to_tsvector('english', coalesce("events"."short_description", '')), 'B') ||
      setweight(to_tsvector('english', coalesce("events"."description", '')), 'C') ||
      setweight(to_tsvector('english', coalesce("events"."organizer_name", '')), 'D')
    ) STORED,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "events_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "scraper_sources" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "scraper_sources_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(200) NOT NULL,
	"source_type" "event_source" NOT NULL,
	"url" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"default_category" "event_category",
	"default_city_id" integer,
	"last_scraped_at" timestamp with time zone,
	"events_found" integer DEFAULT 0 NOT NULL,
	"config" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sessionToken" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tag_definitions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "tag_definitions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(100) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"usage_count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "tag_definitions_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"emailVerified" timestamp,
	"image" text,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verificationTokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cities" ADD CONSTRAINT "cities_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_tags" ADD CONSTRAINT "event_tags_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_tags" ADD CONSTRAINT "event_tags_tag_id_tag_definitions_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tag_definitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_submitted_by_id_users_id_fk" FOREIGN KEY ("submitted_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_approved_by_id_users_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scraper_sources" ADD CONSTRAINT "scraper_sources_default_city_id_cities_id_fk" FOREIGN KEY ("default_city_id") REFERENCES "public"."cities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_accounts_provider" ON "accounts" USING btree ("provider","providerAccountId");--> statement-breakpoint
CREATE INDEX "idx_cities_country" ON "cities" USING btree ("country_id");--> statement-breakpoint
CREATE INDEX "idx_cities_slug" ON "cities" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_cities_location" ON "cities" USING gist ("location");--> statement-breakpoint
CREATE INDEX "idx_countries_code" ON "countries" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_event_tags_unique" ON "event_tags" USING btree ("event_id","tag_id");--> statement-breakpoint
CREATE INDEX "idx_events_status" ON "events" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_events_category" ON "events" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_events_type" ON "events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "idx_events_starts_at" ON "events" USING btree ("starts_at");--> statement-breakpoint
CREATE INDEX "idx_events_city" ON "events" USING btree ("city_id");--> statement-breakpoint
CREATE INDEX "idx_events_country" ON "events" USING btree ("country_id");--> statement-breakpoint
CREATE INDEX "idx_events_source" ON "events" USING btree ("source","source_id");--> statement-breakpoint
CREATE INDEX "idx_events_location" ON "events" USING gist ("location");--> statement-breakpoint
CREATE INDEX "idx_events_search" ON "events" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "idx_events_listing" ON "events" USING btree ("status","starts_at");--> statement-breakpoint
CREATE INDEX "idx_tags_slug" ON "tag_definitions" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_verification_tokens" ON "verificationTokens" USING btree ("identifier","token");