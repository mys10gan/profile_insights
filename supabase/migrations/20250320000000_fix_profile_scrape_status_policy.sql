-- Migration: Fix Profile Scrape Status Policy
-- Description: Add RLS policy to allow anon role to update profile scrape status

-- First drop the existing policy if it exists (to avoid duplicates)
DROP POLICY IF EXISTS "Anon role can update profile scrape status" ON profiles;

-- Create policy for anon role to update profile scrape status
CREATE POLICY "Anon role can update profile scrape status"
    ON profiles 
    FOR UPDATE
    TO anon
    USING (true)
    WITH CHECK (true);

-- Add explanatory comment
COMMENT ON POLICY "Anon role can update profile scrape status" ON profiles IS 
'Allows Supabase Edge Functions running with anon key to update profile scrape status'; 