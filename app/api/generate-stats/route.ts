import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateProfileStats } from '@/lib/openrouter';

export const maxDuration = 60; // Set max execution time to 300 seconds (5 minutes)
export const dynamic = 'force-dynamic'; // Ensure the route is not statically optimized

export async function GET(request: NextRequest) {
  try {
    // Create a Supabase admin client to bypass auth issues in API routes
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing environment variables for Supabase connection');
      return new NextResponse(
        JSON.stringify({ error: 'Server configuration error', details: 'Missing environment variables' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!process.env.OPENROUTER_API_KEY) {
      console.error('Missing OPENROUTER_API_KEY environment variable');
      return new NextResponse(
        JSON.stringify({ error: 'Server configuration error', details: 'Missing OpenRouter API key' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Log the request to debug
    console.log('Generate-stats API called, parsing request params...');
    
    // Get profile ID from URL params
    const searchParams = request.nextUrl.searchParams;
    const profileId = searchParams.get('profileId');
    const userId = searchParams.get('userId');
    
    console.log('Request params:', { profileId, userId });
    
    if (!profileId) {
      return new NextResponse(
        JSON.stringify({ error: 'Profile ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    if (!userId) {
      return new NextResponse(
        JSON.stringify({ error: 'User ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Mark stats as generating
    await supabaseAdmin
      .from('profiles')
      .update({ is_stats_generating: true })
      .eq('id', profileId)
      .eq('user_id', userId);
    
    try {
      // Get profile data
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .single();
      
      if (profileError || !profile) {
        throw new Error('Profile not found');
      }
      
      // Verify the profile belongs to the specified user
      if (profile.user_id !== userId) {
        throw new Error('Unauthorized access to this profile');
      }
      
      // Validate platform
      if (!profile.platform || (profile.platform !== 'instagram' && profile.platform !== 'linkedin')) {
        throw new Error(`Unsupported platform: ${profile.platform}`);
      }
      
      // Get profile raw data
      const { data: profileData, error: profileDataError } = await supabaseAdmin
        .from('profile_data')
        .select('raw_data, platform_specific_data')
        .eq('profile_id', profileId)
        .single();
      
      if (profileDataError || !profileData) {
        throw new Error('Profile data not found');
      }
      
      // Combine data for analysis
      const dataForAnalysis = {
        platform: profile.platform,
        username: profile.username,
        ...profileData.raw_data,
        ...profileData.platform_specific_data
      };
      
      // Log platform-specific analysis
      console.log(`Generating stats for ${profile.username} (${profile.platform})...`);
      
      // This function now handles platform-specific analysis
      const stats = await generateProfileStats(
        profile.platform,
        profile.username,
        dataForAnalysis
      );
      
      console.log('Stats generated successfully');
      
      // Update profile with generated stats
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ 
          stats,
          is_stats_generating: false,
        })
        .eq('id', profileId);
      
      if (updateError) {
        throw new Error(`Database update failed: ${updateError.message}`);
      }
      
      console.log('Stats saved successfully');
      
      return new NextResponse(
        JSON.stringify({ 
          success: true, 
          message: 'Stats generated successfully',
          platform: profile.platform
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    } catch (error) {
      console.error('Error generating stats:', error);
      
      // Reset stats generation flag and don't save error stats
      await supabaseAdmin
        .from('profiles')
        .update({ is_stats_generating: false })
        .eq('id', profileId);
      
      // Return more detailed error based on type
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const platformSpecificMessage = errorMessage.includes('Unsupported platform') 
        ? 'This platform is not supported for analysis.'
        : 'Stats generation failed, please try again';
      
      return new NextResponse(
        JSON.stringify({ 
          error: 'Failed to generate stats', 
          message: platformSpecificMessage,
          details: errorMessage
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
  } catch (error) {
    console.error('Error in generate-stats API:', error);
    return new NextResponse(
      JSON.stringify({ 
        error: 'Failed to generate stats',
        message: 'Stats generation failed, please try again'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Also support POST for backward compatibility
export async function POST(request: NextRequest) {
  try {
    // Get profile ID from request
    let profileId, userId;
    try {
      const body = await request.json();
      profileId = body.profileId;
      userId = body.userId;
      
      if (!profileId || !userId) {
        return new NextResponse(
          JSON.stringify({ error: 'Profile ID and User ID are required' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      
      // Instead of trying to convert, just call GET function directly with query params
      const searchParams = new URLSearchParams();
      searchParams.set('profileId', profileId);
      searchParams.set('userId', userId);
      
      const url = `${request.nextUrl.origin}${request.nextUrl.pathname}?${searchParams.toString()}`;
      
      // Pass a new request to the GET handler
      const newRequest = new NextRequest(url, {
        headers: request.headers,
      });
      
      return GET(newRequest);
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return new NextResponse(
        JSON.stringify({ error: 'Invalid request body', details: 'Could not parse JSON body' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error in POST handler:', error);
    return new NextResponse(
      JSON.stringify({ 
        error: 'Failed to process request',
        message: 'Stats generation failed, please try again'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
} 