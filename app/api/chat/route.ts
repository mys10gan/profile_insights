import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { analyzeProfile } from '@/lib/openrouter'

// Create a Supabase client with the anon key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, // Use anon key instead of service role key
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(request: Request) {
  try {
    const { message, conversationId, profileId } = await request.json()

    // Validate input
    if (!message || !conversationId || !profileId) {
      console.error('Missing required fields:', { message, conversationId, profileId })
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate required environment variables
    if (!process.env.OPENROUTER_API_KEY) {
      console.error('OPENROUTER_API_KEY is missing')
      return NextResponse.json(
        { error: 'Server configuration error: Missing API credentials' },
        { status: 500 }
      )
    }

    try {
      // Fetch profile data
      console.log("Fetching profile data for profileId:", profileId)
      const { data: profileData, error: profileError } = await supabase
        .from('profile_data')
        .select('platform_specific_data')
        .eq('profile_id', profileId)
        .single()
      
      if (profileError) {
        console.error('Error fetching profile data:', profileError)
        console.error('Profile ID that caused the error:', profileId)
        
        // Check if it's a not found error
        if (profileError.code === 'PGRST116') {
          return NextResponse.json(
            { error: `No profile data found for ID: ${profileId}. The profile may still be processing.` },
            { status: 404 }
          )
        }
        
        return NextResponse.json(
          { error: `Failed to fetch profile data for ID: ${profileId}` },
          { status: 500 }
        )
      }
      
      console.log("Profile data fetched successfully")

      // Fetch conversation history
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('role, content')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      if (messagesError) {
        console.error('Error fetching messages:', messagesError)
        return NextResponse.json(
          { error: 'Failed to fetch conversation history' },
          { status: 500 }
        )
      }

      // Prepare the profile data and chat context for analysis
      const chatContext = {
        profile: profileData.platform_specific_data,
        history: messages,
        userMessage: message
      }

      // convert chatContext to message string
      const messageStr = `
      Profile: ${JSON.stringify(chatContext.profile)}
      History: ${JSON.stringify(chatContext.history)}
      User Message: ${chatContext.userMessage}
      `

      try {
        // Call the analyzeProfile function from lib/openrouter.ts
        console.log("Calling OpenRouter API for analysis")
        const aiMessage = await analyzeProfile(
          profileData.platform_specific_data.platform,
          messageStr
        )
        console.log("Received response from OpenRouter API")
        
        return NextResponse.json({ message: aiMessage })
      } catch (apiError) {
        console.error('OpenRouter API error:', apiError)
        return NextResponse.json(
          { error: 'Failed to get AI response. Please try again later.' },
          { status: 503 }
        )
      }
    } catch (apiError) {
      console.error('API request error:', apiError)
      return NextResponse.json(
        { error: 'Failed to communicate with external API service' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Chat error:', error)
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    )
  }
} 