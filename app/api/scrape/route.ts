import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Create a Supabase client with the service role key to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, // Use available anon key instead of service role key
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// New route for polling scrape status
export async function GET(request: Request) {
  const url = new URL(request.url);
  const profileId = url.searchParams.get('profileId');
  
  if (!profileId) {
    return NextResponse.json(
      { error: 'Profile ID is required' },
      { status: 400 }
    );
  }
  
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, scrape_status, scrape_error, last_scraped, is_stats_generating')
      .eq('id', profileId)
      .single();
      
    if (error) {
      console.error('Error fetching profile status:', error);
      return NextResponse.json(
        { error: 'Failed to fetch profile status' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      profile: data
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Failed to check profile status' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { platform, username, profileId } = await request.json()

    // Validate input
    if (!platform || !username || !profileId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate required environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.error('NEXT_PUBLIC_SUPABASE_URL is missing')
      return NextResponse.json(
        { error: 'Server configuration error: Missing Supabase URL' },
        { status: 500 }
      )
    }
    
    try {
      // Clean the username (remove @ and trim)
      const cleanUsername = username.replace('@', '').trim()
      
      // Set the profile to scraping status in the database
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          scrape_status: 'pending',
          scrape_error: null
        })
        .eq('id', profileId)

      if (updateError) {
        console.error('Failed to update profile status:', updateError)
        // Continue anyway
      }
      
      // Call Supabase Edge Function to handle the scraping
      const edgeFunctionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/scrape_profile_apify`
      
      console.log(`Calling Edge Function for ${platform} profile: ${username}`)
      
      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          platform,
          username: cleanUsername,
          profileId
        }),
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Edge Function error:', response.status, errorText)
        
        // Update the profile's status to failed
        await supabase
          .from('profiles')
          .update({ 
            scrape_status: 'failed',
            scrape_error: `Edge Function error: ${errorText}`
          })
          .eq('id', profileId)
          
        return NextResponse.json(
          { error: `Edge Function error: ${errorText}` },
          { status: response.status }
        )
      }
      
      // Return the response from the edge function
      const edgeFunctionResponse = await response.json()
      
      return NextResponse.json({
        success: true,
        profileId,
        username: cleanUsername,
        platform,
        status: "scraping",
        estimatedTimeMinutes: 3,
        ...edgeFunctionResponse
      })
    } catch (apiError) {
      console.error('API request error:', apiError)
      
      // Update the profile's status to failed
      await supabase
        .from('profiles')
        .update({ 
          scrape_status: 'failed',
          scrape_error: 'Failed to communicate with Edge Function'
        })
        .eq('id', profileId)
        
      return NextResponse.json(
        { error: 'Failed to communicate with Edge Function' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Scraping error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to scrape profile' },
      { status: 500 }
    )
  }
} 