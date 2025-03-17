-- Migration: Update RLS for Anon Key
-- Description: Modifies RLS policies to allow the anon role to insert profile data
-- This is needed because we're using the anon key instead of the service role key

-- First drop the existing policy if it exists
DROP POLICY IF EXISTS "Service role can insert profile data" ON profile_data;

-- Add a policy for anon role to insert profile data
CREATE POLICY "Anon role can insert profile data"
    ON profile_data FOR INSERT
    TO anon
    WITH CHECK (true);

-- Add a policy for authenticated role to insert profile data (for completeness)
CREATE POLICY "Authenticated role can insert profile data"
    ON profile_data FOR INSERT
    TO authenticated
    WITH CHECK (true); 