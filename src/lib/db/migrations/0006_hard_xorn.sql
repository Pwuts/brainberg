ALTER TABLE "events" ADD COLUMN "moderated_by_ai" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "ai_moderation_reason" text;--> statement-breakpoint
ALTER TABLE "scraper_runs" ADD COLUMN "events_rejected" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "scraper_runs" ADD COLUMN "events_pending" integer DEFAULT 0 NOT NULL;