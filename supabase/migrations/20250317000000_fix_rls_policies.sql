-- Migration: Fix RLS Policies
-- Description: Adds a service role policy for profile_data table

-- First drop the policy if it exists to avoid errors
DROP POLICY IF EXISTS "Service role can insert profile data" ON profile_data;

-- Add a policy for service role to insert profile data
CREATE POLICY "Service role can insert profile data"
    ON profile_data FOR INSERT
    TO service_role
    WITH CHECK (true); 