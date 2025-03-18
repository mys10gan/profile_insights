# Profile Insights

Profile Insights is an AI-powered tool that lets you chat with and analyze social media profiles. Get insights about influencers' strategies, improve your content game, and learn from the best in the business.

## Features

- 🔒 Secure email-based authentication
- 📊 Instagram profile analysis
- 💼 LinkedIn profile analysis
- 🤖 AI-powered conversation interface
- 📝 Waitlist system for controlled access
- 🎨 Beautiful modern UI with shadcn components

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript
- **UI Components**: shadcn/ui, Tailwind CSS, Lucide icons
- **Backend**: 
  - Supabase (Authentication & Database)
  - OpenRouter (Claude AI integration)
  - Apify (Social media scraping)
- **Deployment**: Vercel (planned)

## Project Structure

```
profile_insights/
├── app/                # Next.js app directory
│   ├── api/           # API routes
│   │   ├── chat/     # AI chat endpoint
│   │   └── scrape/   # Profile scraping endpoint
│   ├── analysis/     # Profile analysis page
│   ├── chat/         # AI chat interface
│   └── dashboard/    # User dashboard
├── components/        # Reusable UI components
├── lib/              # Utility functions and shared logic
└── supabase/         # Database schema and migrations
```

## Project Progress

- [x] Initial project setup with Next.js and shadcn
- [x] Database schema design
- [x] Supabase integration
- [x] Authentication system
- [x] Profile scraping integration
- [x] AI conversation system
- [x] UI implementation
  - [x] Landing/Waitlist page
  - [x] Dashboard
  - [x] Analysis view
  - [x] Chat interface
- [ ] Testing & deployment

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env` and fill in your environment variables:
   ```bash
   cp .env.example .env
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

## Environment Variables

Create a `.env` file with the following variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Apify
APIFY_API_TOKEN=your_apify_token

# OpenRouter (for Claude AI)
OPENROUTER_API_KEY=your_openrouter_api_key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## Database Schema

The database schema is defined in `supabase/schema/database.md`. Key tables include:
- users (managed by Supabase Auth)
- profiles
- profile_data
- conversations
- messages
- waitlist

## Next Steps

1. Add comprehensive testing
   - Unit tests for utility functions
   - Integration tests for API endpoints
   - E2E tests for critical user flows
2. Set up CI/CD pipeline
3. Deploy to production
   - Set up Vercel project
   - Configure production environment variables
   - Set up monitoring and error tracking

## Contributing

This is a private project. Please do not share the code without permission.

## License

All rights reserved.

## Deploying the Supabase Edge Function

The application uses a Supabase Edge Function for scraping social media profiles. Follow these steps to deploy it:

1. Make sure you have Docker Desktop installed and running
2. Navigate to the project root directory
3. Run the following command:

```bash
supabase functions deploy profile-scraper
```

4. After deployment, add the APIFY_API_TOKEN to your Supabase project:

```bash
supabase secrets set APIFY_API_TOKEN=your_apify_token
```

5. Apply the database migration to add the needed columns:

```bash
supabase migration up
```

## Development

1. Clone this repository
2. Install dependencies: `npm install`
3. Start the development server: `npm run dev`
4. Access the application at `http://localhost:3000`

## Tech Stack

- Nextjs
- Shadcn
- Tailwind
- Lucid icon
- Supabase
- Openrouter using openai sdk
- Claude
- Apify

## Features

- Email and password based login
- Instagram and LinkedIn profile analysis
- AI-powered insights on social media profiles
- Background processing with Supabase Edge Functions
