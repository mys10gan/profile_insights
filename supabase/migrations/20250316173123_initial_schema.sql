-- Migration: Initial Schema Setup
-- Description: Creates the initial tables and security policies for the Profile Insights application
-- Tables: profiles, profile_data, conversations, messages, waitlist

-- Enable required extensions
create extension if not exists "uuid-ossp";

-- Create profiles table
create table if not exists profiles (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references auth.users(id) not null,
    platform text not null check (platform in ('instagram', 'linkedin')),
    username text not null,
    last_scraped timestamp with time zone,
    created_at timestamp with time zone default now(),
    unique(user_id, platform, username)
);

-- Create profile_data table
create table if not exists profile_data (
    id uuid primary key default uuid_generate_v4(),
    profile_id uuid references profiles(id) not null,
    raw_data jsonb not null,
    platform_specific_data jsonb,
    scraped_at timestamp with time zone default now()
);

-- Create conversations table
create table if not exists conversations (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references auth.users(id) not null,
    profile_id uuid references profiles(id) not null,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

-- Create messages table
create table if not exists messages (
    id uuid primary key default uuid_generate_v4(),
    conversation_id uuid references conversations(id) not null,
    role text check (role in ('user', 'assistant')) not null,
    content text not null,
    created_at timestamp with time zone default now()
);

-- Create waitlist table
create table if not exists waitlist (
    id uuid primary key default uuid_generate_v4(),
    email text unique not null,
    created_at timestamp with time zone default now(),
    status text check (status in ('pending', 'approved', 'rejected')) default 'pending'
);

-- Create indexes
create index if not exists idx_profiles_user_id on profiles(user_id);
create index if not exists idx_profile_data_profile_id on profile_data(profile_id);
create index if not exists idx_conversations_user_id on conversations(user_id);
create index if not exists idx_messages_conversation_id on messages(conversation_id);
create index if not exists idx_waitlist_status on waitlist(status);

-- Enable Row Level Security
alter table profiles enable row level security;
alter table profile_data enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table waitlist enable row level security;

-- RLS Policies for profiles table
create policy "Users can view their own profiles"
    on profiles for select
    to authenticated
    using (auth.uid() = user_id);

create policy "Users can create their own profiles"
    on profiles for insert
    to authenticated
    with check (auth.uid() = user_id);

create policy "Users can update their own profiles"
    on profiles for update
    to authenticated
    using (auth.uid() = user_id);

create policy "Users can delete their own profiles"
    on profiles for delete
    to authenticated
    using (auth.uid() = user_id);

-- RLS Policies for profile_data table
create policy "Users can view profile data they've created"
    on profile_data for select
    to authenticated
    using (
        exists (
            select 1 from profiles
            where profiles.id = profile_data.profile_id
            and profiles.user_id = auth.uid()
        )
    );

create policy "Users can create profile data for their profiles"
    on profile_data for insert
    to authenticated
    with check (
        exists (
            select 1 from profiles
            where profiles.id = profile_data.profile_id
            and profiles.user_id = auth.uid()
        )
    );

-- Add a policy for service role to insert profile data
create policy "Service role can insert profile data"
    on profile_data for insert
    to service_role
    with check (true);

-- RLS Policies for conversations table
create policy "Users can view their own conversations"
    on conversations for select
    to authenticated
    using (auth.uid() = user_id);

create policy "Users can create their own conversations"
    on conversations for insert
    to authenticated
    with check (auth.uid() = user_id);

create policy "Users can update their own conversations"
    on conversations for update
    to authenticated
    using (auth.uid() = user_id);

-- RLS Policies for messages table
create policy "Users can view messages in their conversations"
    on messages for select
    to authenticated
    using (
        exists (
            select 1 from conversations
            where conversations.id = messages.conversation_id
            and conversations.user_id = auth.uid()
        )
    );

create policy "Users can create messages in their conversations"
    on messages for insert
    to authenticated
    with check (
        exists (
            select 1 from conversations
            where conversations.id = messages.conversation_id
            and conversations.user_id = auth.uid()
        )
    );

-- RLS Policies for waitlist table
create policy "Anyone can join waitlist"
    on waitlist for insert
    to anon, authenticated
    with check (true);

create policy "Users can view their own waitlist status"
    on waitlist for select
    to authenticated
    using (email in (
        select email from auth.users where id = auth.uid()
    )); 