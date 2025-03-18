-- Add scrape_status and scrape_error columns to profiles table
ALTER TABLE "public"."profiles" 
ADD COLUMN "scrape_status" TEXT DEFAULT 'pending',
ADD COLUMN "scrape_error" TEXT DEFAULT NULL;

-- Create an index on scrape_status for efficient querying
CREATE INDEX "profiles_scrape_status_idx" ON "public"."profiles" ("scrape_status");

-- Update the existing profiles to have a completed status if they have been scraped
UPDATE "public"."profiles"
SET "scrape_status" = 'completed'
WHERE "last_scraped" IS NOT NULL;

-- Add comment to columns for better documentation
COMMENT ON COLUMN "public"."profiles"."scrape_status" IS 'Current status of profile scraping: pending, scraping, completed, failed';
COMMENT ON COLUMN "public"."profiles"."scrape_error" IS 'Error message if scraping failed';
