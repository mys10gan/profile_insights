# Database Schema for Profile Insights

## Tables

### users
  use supabase auth for users

### profiles
- `id` uuid PRIMARY KEY
- `user_id` uuid REFERENCES users(id)
- `platform` text NOT NULL CHECK (platform IN ('instagram', 'linkedin'))
- `username` text NOT NULL
- `last_scraped` timestamp with time zone
- `created_at` timestamp with time zone DEFAULT now()
- UNIQUE(user_id, platform, username)

### profile_data
- `id` uuid PRIMARY KEY
- `profile_id` uuid REFERENCES profiles(id)
- `raw_data` jsonb NOT NULL -- Stores the raw scraped data
- `scraped_at` timestamp with time zone DEFAULT now()
- `platform_specific_data` jsonb -- Platform specific processed data

### conversations
- `id` uuid PRIMARY KEY
- `user_id` uuid REFERENCES users(id)
- `profile_id` uuid REFERENCES profiles(id)
- `created_at` timestamp with time zone DEFAULT now()
- `updated_at` timestamp with time zone DEFAULT now()

### messages
- `id` uuid PRIMARY KEY
- `conversation_id` uuid REFERENCES conversations(id)
- `role` text CHECK (role IN ('user', 'assistant'))
- `content` text NOT NULL
- `created_at` timestamp with time zone DEFAULT now()

### waitlist
- `id` uuid PRIMARY KEY
- `email` text UNIQUE NOT NULL
- `created_at` timestamp with time zone DEFAULT now()
- `status` text CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending'

## Indexes
```sql
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_profile_data_profile_id ON profile_data(profile_id);
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_waitlist_status ON waitlist(status);
```

## Row Level Security (RLS) Policies

### users
- Users can only read and update their own data
- Admin can read all users

### profiles
- Users can only CRUD their own profiles
- Admin can read all profiles

### profile_data
- Users can only read profile data they've created
- Admin can read all profile data

### conversations
- Users can only CRUD their own conversations
- Admin can read all conversations

### messages
- Users can only read and create messages in their own conversations
- Admin can read all messages

### waitlist
- Public can create waitlist entries
- Only admin can read and update waitlist entries

## Notes
1. All tables include RLS policies to ensure data security
2. Profile data is stored in JSON format for flexibility
3. Platform-specific data is separated to allow for different data structures between Instagram and LinkedIn
4. Conversations and messages are separated to allow for easy retrieval and pagination
5. Waitlist system is implemented for controlled user access
