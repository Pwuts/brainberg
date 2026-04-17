ALTER TABLE "scraper_runs" ADD COLUMN "progress" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "scraper_runs" ADD COLUMN "progress_detail" text;