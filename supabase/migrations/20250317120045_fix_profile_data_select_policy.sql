-- Migration: Fix Profile Data Select Policy
-- Description: Adds a policy to allow anon and authenticated roles to select profile_data

-- Create policy for anon role to select profile data
CREATE POLICY "Anon role can select profile data"
    ON profile_data FOR SELECT
    TO anon
    USING (true);

-- Also ensure authenticated users can select any profile data
CREATE POLICY "Authenticated role can select any profile data"
    ON profile_data FOR SELECT
    TO authenticated
    USING (true); 