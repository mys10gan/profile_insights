-- Migration: Add Delete Policies
-- Description: Adds RLS policies to allow users to delete their own conversations, messages, and profile data
-- Tables: conversations, messages, profile_data

-- Add delete policy for conversations table
create policy "Users can delete their own conversations"
    on conversations for delete
    to authenticated
    using (auth.uid() = user_id);

-- Add delete policy for messages table
create policy "Users can delete messages in their conversations"
    on messages for delete
    to authenticated
    using (
        exists (
            select 1 from conversations
            where conversations.id = messages.conversation_id
            and conversations.user_id = auth.uid()
        )
    );

-- Add delete policy for profile_data table
create policy "Users can delete profile data they've created"
    on profile_data for delete
    to authenticated
    using (
        exists (
            select 1 from profiles
            where profiles.id = profile_data.profile_id
            and profiles.user_id = auth.uid()
        )
    ); 