-- Migration: Add apify_run_id to profiles
-- Description: Add a column to store the Apify run ID for tracking and debugging

-- Add apify_run_id column to profiles table
ALTER TABLE "public"."profiles" 
ADD COLUMN "apify_run_id" TEXT DEFAULT NULL;

-- Add comment to column for better documentation
COMMENT ON COLUMN "public"."profiles"."apify_run_id" IS 'ID of the Apify actor run for tracking and debugging';

-- Create an index for efficient lookups by run ID
CREATE INDEX "profiles_apify_run_id_idx" ON "public"."profiles" ("apify_run_id"); 