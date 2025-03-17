-- Migration: Add Stats Column
-- Description: Add a stats column to the profiles table for AI-generated profile statistics

-- Add stats column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS stats jsonb;

-- Add is_stats_generating column to track stats generation status
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_stats_generating boolean DEFAULT false;

-- Create an index on is_stats_generating for faster filtering
CREATE INDEX IF NOT EXISTS idx_profiles_is_stats_generating ON profiles(is_stats_generating);

-- Update RLS policies to allow service role to update stats
CREATE POLICY "Service role can update profile stats"
    ON profiles FOR UPDATE 
    TO service_role
    USING (true)
    WITH CHECK (true); 