// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2.38.4"

// Create a Supabase client with the anon key
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// CORS headers for browser compatibility
const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

Deno.serve(async (req: Request) => {
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

    // Validate API token
    const apifyToken = Deno.env.get('APIFY_API_TOKEN');
    if (!apifyToken) {
      return new Response(
        JSON.stringify({ error: "Server configuration error: Missing API credentials" }),
        { status: 500, headers }
      );
    }

    // Set status to "fetching" immediately using the more reliable method
    await updateStatusDirect(profileId, 'fetching');
    
    // Start background fetching process
    const scrapeProfileTask = async () => {
      try {
        // Set initial status directly
        await updateStatusDirect(profileId, 'fetching');
        
        // 1. Get data from Apify
        const scrapedData = await callApifyService(platform, username, apifyToken);
        if (!scrapedData || (Array.isArray(scrapedData) && scrapedData.length === 0)) {
          throw new Error('No data returned from fetching service');
        }
        
        // 2. Process and save data (this now handles status update to completed as well)
        await saveProfileData(profileId, scrapedData);
        
        console.log(`Successfully completed fetching for profile ${profileId}`);
      } catch (error) {
        console.error('Fetching error:', error);
        
        // Direct status update that won't throw
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        await updateStatusDirect(profileId, 'failed', errorMsg);
        
        // Final fallback attempt - should rarely be needed with updateStatusDirect
        if ((error instanceof Error) && error.message.includes('Database error')) {
          try {
            console.log('Attempting emergency minimal status update...');
            const { error: finalError } = await supabase
              .from('profiles')
              .update({ 
                scrape_status: 'failed',
                scrape_error: errorMsg
              })
              .eq('id', profileId);
              
            if (finalError) {
              console.error('Emergency status update failed:', finalError);
            }
          } catch (e) {
            console.error('Final emergency status update exception:', e);
          }
        }
      }
    };

    // Run in background
    //@ts-ignore
    if (typeof EdgeRuntime !== 'undefined') {
      //@ts-ignore
      EdgeRuntime.waitUntil(
        scrapeProfileTask()
          .catch(error => {
            console.error('Unhandled background task error:', error);
            // Last-ditch effort to update status if task crashes
            return updateStatus(profileId, 'failed', 'Background task crashed')
              .catch(e => console.error('Failed to set error status after crash:', e));
          })
      );
    } else {
      // Fallback for local development
      setTimeout(() => {
        scrapeProfileTask()
          .catch(error => {
            console.error('Unhandled background task error:', error);
            // Last-ditch effort to update status if task crashes
            updateStatus(profileId, 'failed', 'Background task crashed')
              .catch(e => console.error('Failed to set error status after crash:', e));
          });
      }, 0);
    }

    // Return immediate response
    return new Response(
      JSON.stringify({
        success: true,
        message: "Profile data fetching started",
        profileId,
        status: "fetching"
      }),
      { headers }
    );
  } catch (error) {
    console.error('Request error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers }
    );
  }
});

// Helper functions

async function updateStatus(profileId: string, status: 'fetching' | 'scraping' | 'completed' | 'failed', errorMessage?: string) {
  try {
    const updateData: Record<string, any> = { scrape_status: status };
    
    if (status === 'completed') {
      updateData.last_scraped = new Date().toISOString();
    }
    
    if (errorMessage) {
      updateData.scrape_error = errorMessage;
    }
    
    console.log(`Updating profile ${profileId} status to ${status}...`);
    
    const { error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', profileId);
      
    if (error) {
      console.error(`Failed to update profile ${profileId} status to ${status}:`, error);
      throw error;
    }
    
    console.log(`Successfully updated profile ${profileId} status to ${status}`);
    return true;
  } catch (error) {
    console.error(`Exception updating profile ${profileId} status:`, error);
    throw error; // Rethrow so caller can retry
  }
}

async function callApifyService(platform: string, username: string, apifyToken: string) {
  // Configure Actor ID based on platform
  const actorId = platform === 'instagram'
    ? 'nH2AHrwxeTRJoN5hX' // Instagram scraper
    : '2SyF0bVxmgGr8IVCZ'; // LinkedIn scraper

  // Clean username
  const cleanUsername = username.replace('@', '').trim();
  
  // Configure request body based on platform
  const requestBody = platform === 'instagram'
    ? {
        username: [cleanUsername],
        resultsLimit: 75,
        resultsType: ['posts', 'reels', 'stories', 'highlights'],
        scrapeFollowers: true,
        scrapeFollowing: true,
        expandOwners: true,
        scrapeLikes: true,
        scrapeComments: true,
        commentsLimit: 50
      }
    : {
        profileUrls: [username],
        includePostsData: true,
        postsLimit: 75,
        includeActivityData: true,
        includeEducationData: true,
        includeExperienceData: true,
        includeSkillsData: true,
        includeRecommendationsData: true,
        proxy: { useApifyProxy: true }
      };

  // Call Apify API
  const apifyUrl = `https://api.apify.com/v2/acts/${actorId}/runs?waitForFinish=300`;
  const response = await fetch(apifyUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apifyToken}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    throw new Error(`Apify API error: ${response.status}`);
  }

  const runData = await response.json();
  
  // Get dataset items
  const datasetId = runData.data.defaultDatasetId;
  const datasetUrl = `https://api.apify.com/v2/datasets/${datasetId}/items`;
  const datasetResponse = await fetch(datasetUrl, {
    headers: { 'Authorization': `Bearer ${apifyToken}` },
  });

  if (!datasetResponse.ok) {
    throw new Error(`Apify dataset error: ${datasetResponse.status}`);
  }

  return await datasetResponse.json();
}

async function saveProfileData(profileId: string, rawData: any) {
  try {
    // Process data
    const processedData = Array.isArray(rawData) ? rawData : [rawData];
    const platformSpecificData = processedData[0] || null;
    
    // First update status to processing/scraping to indicate progress
    await updateStatusDirect(profileId, 'scraping');
    
    // Delete any existing data
    await supabase
      .from('profile_data')
      .delete()
      .eq('profile_id', profileId);

    // Insert new data
    const { error } = await supabase
      .from('profile_data')
      .insert([{
        profile_id: profileId,
        raw_data: processedData,
        platform_specific_data: platformSpecificData,
      }]);

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }
    
    // After successful data save, update the status to completed
    return await updateStatusDirect(profileId, 'completed');
  } catch (error) {
    console.error(`Error saving profile data for ${profileId}:`, error);
    // Mark as failed if data saving fails
    await updateStatusDirect(profileId, 'failed', error instanceof Error ? error.message : 'Unknown error saving data');
    throw error;
  }
}

// A more direct status update function that doesn't throw to improve reliability
async function updateStatusDirect(profileId: string, status: 'fetching' | 'scraping' | 'completed' | 'failed', errorMessage?: string) {
  try {
    if (!profileId) {
      console.error(`[Direct] Invalid profile ID: ${profileId}`);
      return false;
    }

    const updateData: Record<string, any> = { scrape_status: status };
    
    if (status === 'completed') {
      updateData.last_scraped = new Date().toISOString();
    }
    
    if (errorMessage) {
      updateData.scrape_error = errorMessage;
    }
    
    console.log(`[Direct] Updating profile ${profileId} status to ${status}...`);
    console.log(`[Direct] Update data: ${JSON.stringify(updateData)}`);
    
    // First check if the profile exists
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, scrape_status')
      .eq('id', profileId)
      .single();
      
    if (profileError) {
      console.error(`[Direct] Failed to fetch profile ${profileId}:`, profileError);
      return false;
    }
    
    console.log(`[Direct] Current profile status: ${profileData?.scrape_status || 'unknown'}`);
    
    // Now update the profile
    const { error, data } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', profileId)
      .select();
      
    if (error) {
      console.error(`[Direct] Failed to update profile ${profileId} status to ${status}:`, error);
      console.error(`[Direct] Error code: ${error.code}, Error message: ${error.message}`);
      
      // Try using a prepared statement approach as fallback
      try {
        console.log(`[Direct] Attempting fallback update method for profile ${profileId}`);
        const { error: rpcError } = await supabase
          .rpc('update_profile_status', { 
            p_profile_id: profileId,
            p_status: status,
            p_error_message: errorMessage || null,
            p_last_scraped: status === 'completed' ? new Date().toISOString() : null
          });
          
        if (rpcError) {
          console.error(`[Direct] Fallback update failed:`, rpcError);
          return false;
        } else {
          console.log(`[Direct] Fallback update succeeded for profile ${profileId}`);
          return true;
        }
      } catch (rpcErr) {
        console.error(`[Direct] Exception in fallback update:`, rpcErr);
        return false;
      }
    }
    
    console.log(`[Direct] Successfully updated profile ${profileId} status to ${status}. Response:`, data);
    return true;
  } catch (error) {
    console.error(`[Direct] Exception updating profile ${profileId} status:`, error);
    return false;
  }
} 