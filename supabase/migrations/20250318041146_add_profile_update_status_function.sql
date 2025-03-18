-- Migration: Add stored procedure for updating profile status
-- Purpose: Create a function that can be used to update profile status from edge functions
-- Created: 2024-03-18

-- Create update_profile_status function for reliable profile updates
create or replace function update_profile_status(
  p_profile_id uuid,
  p_status text,
  p_error_message text default null,
  p_last_scraped timestamptz default null
)
returns void
security definer -- Run as the function owner (superuser)
language plpgsql
as $$
begin
  -- Update the profile's status information
  update profiles
  set 
    scrape_status = p_status,
    scrape_error = p_error_message,
    last_scraped = coalesce(p_last_scraped, 
      case when p_status = 'completed' then now() else last_scraped end)
  where id = p_profile_id;
end;
$$;

-- Grant execute permission to authenticated users and the service role
grant execute on function update_profile_status to authenticated, service_role;

-- Add comment to function explaining its purpose
comment on function update_profile_status is 
  'Updates a profile status reliably from edge functions. Uses security definer to bypass RLS.'; 