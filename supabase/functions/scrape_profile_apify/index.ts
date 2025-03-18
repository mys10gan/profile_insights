// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2.38.4"

// Create a Supabase client with the anon key
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

Deno.serve(async (req: Request) => {
  // CORS headers for browser compatibility
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  // Handle preflight request
  if (req.method === "OPTIONS") {
    return new Response(null, { headers });
  }

  // Only allow POST requests
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers }
    );
  }

  try {
    const { platform, username, profileId } = await req.json();

    // Validate input
    if (!platform || !username || !profileId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers }
      );
    }

    // Validate required environment variables
    const apifyToken = Deno.env.get('APIFY_API_TOKEN');
    if (!apifyToken) {
      console.error('APIFY_API_TOKEN is missing');
      return new Response(
        JSON.stringify({ error: "Server configuration error: Missing API credentials" }),
        { status: 500, headers }
      );
    }

    // Clean the username (remove @ and trim)
    const cleanUsername = username.replace('@', '').trim();

    // Set up Apify Actor IDs and parameters
    const actorId = platform === 'instagram'
      ? 'nH2AHrwxeTRJoN5hX' // Instagram scraper Actor ID
      : '2SyF0bVxmgGr8IVCZ'; // LinkedIn scraper Actor ID

    // Prepare the request body based on the platform
    const requestBody = platform === 'instagram'
      ? {
          username: [cleanUsername], // Username must be in an array
          resultsLimit: 200, // Increased from 100 to 200
          resultsType: ['posts', 'reels', 'stories', 'highlights'], // Added stories and highlights
          scrapeFollowers: true, // Added to get follower data
          scrapeFollowing: true, // Added to get following data
          expandOwners: true, // Get more details about the profile owner
          scrapeLikes: true, // Get likes data
          scrapeComments: true, // Get comments data
          commentsLimit: 50 // Get more comments per post
        }
      : {
          profileUrls: [username],
          includePostsData: true,
          postsLimit: 100, // Increased post limit
          includeActivityData: true, // Added to get activity data
          includeEducationData: true, // Added to get education data
          includeExperienceData: true, // Added to get experience data
          includeSkillsData: true, // Added to get skills data
          includeRecommendationsData: true, // Added to get recommendations
          proxy: {
            useApifyProxy: true
          }
        };

    console.log(`Calling Apify API for ${platform} profile: ${username}`);
    
    // Use EdgeRuntime.waitUntil for the long-running scraping operation
    // This allows the function to return a response immediately while continuing processing
    const scrapePromise = async () => {
      try {
        // Call Apify API to run the Actor
        const apifyUrl = `https://api.apify.com/v2/acts/${actorId}/runs?waitForFinish=300`; // 5 minute timeout
        
        const response = await fetch(apifyUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apifyToken}`,
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Apify API error:', response.status, errorText);
          await updateStatusInDatabase(profileId, 'failed', `Apify API error: ${response.status}`);
          return;
        }

        const runData = await response.json();
        console.log('Apify run created:', runData.data.id);

        // Get the dataset items from the run
        const datasetId = runData.data.defaultDatasetId;
        const datasetUrl = `https://api.apify.com/v2/datasets/${datasetId}/items`;
        
        const datasetResponse = await fetch(datasetUrl, {
          headers: {
            'Authorization': `Bearer ${apifyToken}`,
          },
        });

        if (!datasetResponse.ok) {
          const errorText = await datasetResponse.text();
          console.error('Apify dataset error:', datasetResponse.status, errorText);
          await updateStatusInDatabase(profileId, 'failed', `Failed to get dataset: ${datasetResponse.status}`);
          return;
        }

        const data = await datasetResponse.json();
        if (!Array.isArray(data)) {
          console.error('Unexpected Apify dataset response format:', data);
          await updateStatusInDatabase(profileId, 'failed', 'Unexpected dataset format from Apify');
          return;
        }
        
        console.log(`Retrieved ${data.length} items from Apify dataset`);

        // Process and organize the scraped data
        let processedData = data;
        let platformSpecificData = data[0] || null;
        
        // For Instagram, extract and organize key metrics
        if (platform === 'instagram' && Array.isArray(data) && data.length > 0) {
          const profile = data.find((item: any) => item.hasOwnProperty('username')) || data[0];
          
          // Calculate engagement metrics
          const posts = data.filter((item: any) => item.type === 'Post' || item.type === 'Reel');
          const totalLikes = posts.reduce((sum: number, post: any) => sum + (post.likesCount || 0), 0);
          const totalComments = posts.reduce((sum: number, post: any) => sum + (post.commentsCount || 0), 0);
          const avgLikes = posts.length > 0 ? totalLikes / posts.length : 0;
          const avgComments = posts.length > 0 ? totalComments / posts.length : 0;
          
          // Determine top post types
          const postTypes = posts.reduce((acc: Record<string, number>, post: any) => {
            const type = post.type || 'Unknown';
            acc[type] = (acc[type] || 0) + 1;
            return acc;
          }, {});
          
          const topPostType = Object.entries(postTypes)
            .sort((a, b) => b[1] - a[1])
            .map(([type]) => type)[0] || 'Unknown';
          
          // Create structured data
          platformSpecificData = {
            ...profile,
            followersCount: profile.followersCount || 0,
            followingCount: profile.followingCount || 0,
            postsCount: profile.postsCount || 0,
            biography: profile.biography || '',
            isVerified: profile.isVerified || false,
            fullName: profile.fullName || '',
            profilePicUrl: profile.profilePicUrl || '',
            averageLikes: avgLikes,
            averageComments: avgComments,
            engagementRate: profile.followersCount ? ((avgLikes + avgComments) / profile.followersCount) * 100 : 0,
            topPostType,
            postFrequency: posts.length > 1 ? 'Regular' : 'Infrequent',
            contentCategories: [],
            postTypes,
            platform: 'instagram'
          };
        }
        
        // For LinkedIn, extract and organize key metrics
        if (platform === 'linkedin' && Array.isArray(data) && data.length > 0) {
          const profile = data.find((item: any) => item.hasOwnProperty('profileUrl')) || data[0];
          
          // Extract education and experience
          const education = profile.education || [];
          const experience = profile.experience || [];
          
          // Extract skills
          const skills = profile.skills || [];
          
          // Process posts if available
          const posts = profile.posts || [];
          const totalReactions = posts.reduce((sum: number, post: any) => sum + (post.totalReactions || 0), 0);
          const totalComments = posts.reduce((sum: number, post: any) => sum + (post.totalComments || 0), 0);
          const avgReactions = posts.length > 0 ? totalReactions / posts.length : 0;
          const avgComments = posts.length > 0 ? totalComments / posts.length : 0;
          
          // Create structured data
          platformSpecificData = {
            ...profile,
            connectionsCount: profile.connectionsCount || 'N/A',
            headline: profile.headline || '',
            location: profile.location || '',
            industry: profile.industry || '',
            experienceCount: experience.length,
            educationCount: education.length,
            skillsCount: skills.length,
            averageReactions: avgReactions,
            averageComments: avgComments,
            engagementRate: avgReactions > 0 ? ((avgReactions + avgComments) / (profile.connectionsCount || 100)) * 100 : 0,
            postFrequency: posts.length > 3 ? 'Regular' : 'Infrequent',
            topContentType: 'Article', // Default, would need more processing to determine accurately
            education,
            experience,
            skills,
            platform: 'linkedin'
          };
        }

        // Store the scraped data in Supabase
        try {
          // First check if there's existing data and delete it
          const { error: deleteError } = await supabase
            .from('profile_data')
            .delete()
            .eq('profile_id', profileId);
            
          if (deleteError) {
            console.error('Error deleting existing profile data:', deleteError);
            // Continue anyway - might be a new profile with no existing data
          }

          // Insert the new data
          const { error: insertError } = await supabase
            .from('profile_data')
            .insert([{
              profile_id: profileId,
              raw_data: processedData,
              platform_specific_data: platformSpecificData,
            }]);

          if (insertError) {
            console.error('Supabase insert error:', insertError);
            await updateStatusInDatabase(profileId, 'failed', `Database error: ${insertError.message}`);
            return;
          }

          // Update the profile's last_scraped timestamp and status
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ 
              last_scraped: new Date().toISOString(),
              scrape_status: 'completed'
            })
            .eq('id', profileId);

          if (updateError) {
            console.error('Supabase update error:', updateError);
            // Continue even if update fails
          }

          console.log(`Successfully completed scraping for profile ${profileId}`);
          updateStatusInDatabase(profileId, 'completed', null);
        } catch (dbError) {
          console.error('Database operation error:', dbError);
          await updateStatusInDatabase(profileId, 'failed', 'Failed to save profile data to database');
        }
      } catch (apiError) {
        console.error('API request error:', apiError);
        await updateStatusInDatabase(profileId, 'failed', 'Failed to communicate with external API service');
      }
    };

    // Set the profile status to 'scraping' immediately
    await updateStatusInDatabase(profileId, 'scraping', null);
    
    // Use Deno's waitUntil API for background processing
    //@ts-ignore - EdgeRuntime might not be recognized by TypeScript
    if (typeof EdgeRuntime !== 'undefined') {
      //@ts-ignore
      EdgeRuntime.waitUntil(scrapePromise());
    } else {
      // Fallback for local development
      setTimeout(scrapePromise, 0);
    }

    // Return immediate response that scraping has started
    return new Response(
      JSON.stringify({
        success: true,
        message: "Profile scraping started",
        profileId,
        username: cleanUsername,
        platform,
        status: "scraping",
        estimatedTimeMinutes: 3
      }),
      { headers }
    );
  } catch (error) {
    console.error('Scraping request error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to process scraping request'
      }),
      { status: 500, headers }
    );
  }
});

// Helper function to update profile status in database
async function updateStatusInDatabase(profileId: string, status: 'scraping' | 'completed' | 'failed', errorMessage: string | null) {
  const updateData: Record<string, any> = { 
    scrape_status: status
  };
  
  if (status === 'completed') {
    updateData.last_scraped = new Date().toISOString();
  }
  
  if (errorMessage) {
    updateData.scrape_error = errorMessage;
  }
  
  const { error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', profileId);
    
  if (error) {
    console.error(`Failed to update profile ${profileId} status to ${status}:`, error);
  }
} 