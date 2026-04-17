-- Step 1: Convert category columns to text (remove enum constraint)
ALTER TABLE "public"."events" ALTER COLUMN "category" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "public"."scraper_sources" ALTER COLUMN "default_category" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "public"."staged_events" ALTER COLUMN "category" SET DATA TYPE text;--> statement-breakpoint

-- Step 2: Remap old category values to new ones
UPDATE "public"."events" SET "category" = CASE "category"
  WHEN 'ai_ml' THEN 'ai_powered_dev'
  WHEN 'data_science' THEN 'data_analytics'
  WHEN 'cloud_infra' THEN 'cloud_devops'
  WHEN 'cybersecurity' THEN 'security'
  WHEN 'devtools' THEN 'software_dev'
  WHEN 'fintech' THEN 'other'
  WHEN 'healthtech' THEN 'other'
  WHEN 'robotics' THEN 'software_dev'
  WHEN 'startup' THEN 'entrepreneurship'
  WHEN 'hacker_maker_community' THEN 'hacker_maker'
  WHEN 'general_tech' THEN 'software_dev'
  ELSE "category"
END WHERE "category" NOT IN ('ai_ml_research', 'ai_powered_dev', 'software_dev', 'data_analytics', 'cloud_devops', 'security', 'design_ux', 'blockchain_web3', 'entrepreneurship', 'hacker_maker', 'other');--> statement-breakpoint

UPDATE "public"."staged_events" SET "category" = CASE "category"
  WHEN 'ai_ml' THEN 'ai_powered_dev'
  WHEN 'data_science' THEN 'data_analytics'
  WHEN 'cloud_infra' THEN 'cloud_devops'
  WHEN 'cybersecurity' THEN 'security'
  WHEN 'devtools' THEN 'software_dev'
  WHEN 'fintech' THEN 'other'
  WHEN 'healthtech' THEN 'other'
  WHEN 'robotics' THEN 'software_dev'
  WHEN 'startup' THEN 'entrepreneurship'
  WHEN 'hacker_maker_community' THEN 'hacker_maker'
  WHEN 'general_tech' THEN 'software_dev'
  ELSE "category"
END WHERE "category" NOT IN ('ai_ml_research', 'ai_powered_dev', 'software_dev', 'data_analytics', 'cloud_devops', 'security', 'design_ux', 'blockchain_web3', 'entrepreneurship', 'hacker_maker', 'other');--> statement-breakpoint

-- Step 3: Drop old enum and create new one
DROP TYPE "public"."event_category";--> statement-breakpoint
CREATE TYPE "public"."event_category" AS ENUM('ai_ml_research', 'ai_powered_dev', 'software_dev', 'data_analytics', 'cloud_devops', 'security', 'design_ux', 'blockchain_web3', 'entrepreneurship', 'hacker_maker', 'other');--> statement-breakpoint

-- Step 4: Cast text columns back to the new enum
ALTER TABLE "public"."events" ALTER COLUMN "category" SET DATA TYPE "public"."event_category" USING "category"::"public"."event_category";--> statement-breakpoint
ALTER TABLE "public"."scraper_sources" ALTER COLUMN "default_category" SET DATA TYPE "public"."event_category" USING "default_category"::"public"."event_category";--> statement-breakpoint
ALTER TABLE "public"."staged_events" ALTER COLUMN "category" SET DATA TYPE "public"."event_category" USING "category"::"public"."event_category";
