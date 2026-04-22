ALTER TYPE "public"."event_category" ADD VALUE 'game_dev' BEFORE 'other';--> statement-breakpoint
ALTER TYPE "public"."event_category" ADD VALUE 'policy_ethics' BEFORE 'other';--> statement-breakpoint
ALTER TYPE "public"."event_category" ADD VALUE 'leadership_product' BEFORE 'other';--> statement-breakpoint
ALTER TYPE "public"."event_category" ADD VALUE 'bio_health' BEFORE 'other';--> statement-breakpoint
ALTER TYPE "public"."event_type" ADD VALUE 'training' BEFORE 'other';--> statement-breakpoint
ALTER TYPE "public"."event_type" ADD VALUE 'coworking' BEFORE 'other';--> statement-breakpoint
ALTER TYPE "public"."event_type" RENAME VALUE 'career_fair' TO 'career';
