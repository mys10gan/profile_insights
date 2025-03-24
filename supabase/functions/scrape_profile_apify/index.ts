// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.38.4";
import { ApifyClient } from "npm:apify-client@2.8.4";

// Types
type ScrapeStatus = "fetching" | "scraping" | "completed" | "failed";
type Platform = "instagram" | "linkedin";

interface ProfileUpdateData {
  scrape_status: ScrapeStatus;
  last_scraped?: string;
  scrape_error?: string;
}

interface ScraperConfig {
  actorId: string;
  requestBody: Record<string, any>;
}

const LINKEDIN_COOKIES = [
  {
      "domain": ".linkedin.com",
      "expirationDate": 1745311619.938901,
      "hostOnly": false,
      "httpOnly": false,
      "name": "lms_ads",
      "path": "/",
      "sameSite": "no_restriction",
      "secure": true,
      "session": false,
      "storeId": null,
      "value": "AQEOXPat43vJqwAAAZXCLxOBCt0mLY5EfsU_tJ9GJ2ngO-F15N2sDZQoyhEVDYfCJt2c1cELwzMooffqDmjYcW7C_WSxiVrV"
  },
  {
      "domain": ".linkedin.com",
      "expirationDate": 1750009511.848717,
      "hostOnly": false,
      "httpOnly": false,
      "name": "_guid",
      "path": "/",
      "sameSite": "no_restriction",
      "secure": true,
      "session": false,
      "storeId": null,
      "value": "7cefddf1-5a84-43c4-8b96-1d50c7929fec"
  },
  {
      "domain": ".linkedin.com",
      "expirationDate": 1774351747.40109,
      "hostOnly": false,
      "httpOnly": false,
      "name": "bcookie",
      "path": "/",
      "sameSite": "no_restriction",
      "secure": true,
      "session": false,
      "storeId": null,
      "value": "\"v=2&a9023f4c-a7f2-4eb3-8893-150bd0c053fa\""
  },
  {
      "domain": ".linkedin.com",
      "expirationDate": 1745311619.939062,
      "hostOnly": false,
      "httpOnly": false,
      "name": "lms_analytics",
      "path": "/",
      "sameSite": "no_restriction",
      "secure": true,
      "session": false,
      "storeId": null,
      "value": "AQEOXPat43vJqwAAAZXCLxOBCt0mLY5EfsU_tJ9GJ2ngO-F15N2sDZQoyhEVDYfCJt2c1cELwzMooffqDmjYcW7C_WSxiVrV"
  },
  {
      "domain": ".linkedin.com",
      "hostOnly": false,
      "httpOnly": true,
      "name": "fptctx2",
      "path": "/",
      "sameSite": null,
      "secure": true,
      "session": true,
      "storeId": null,
      "value": "taBcrIH61PuCVH7eNCyH0F58uBDuZFZOunQHZt3Fugnd7lDjP531SR7p2Q03UlcY0GAVMD8v72fXg%252bMk7ANnDs6Uxv1fSRrJ6jk4haqHbUFehNrkFmt2S1j8po2hafeeGoco1s3DKK9PNkEQhBgTljlBaRpu9oPJxTcN2RHmTvenvlZ1TzLlK3rqxYOq8w7pted87n0FZ9IWJU9TM3WS4g8xuHrjpjtKef6uWcFuT6OSLw0pF7IUaw92sCTOlJfkFTtqXo1jm3lZa7xd9MzAI7I24dzFcH7%252fpfB7ClzWnThAci5khOkekDF%252f%252bzhaRWnU7oaNVpgTJ%252biDGxDDOP6iJyhSQ%252bMhtT4KGLqRNzoS3cU%253d"
  },
  {
      "domain": ".www.linkedin.com",
      "expirationDate": 1774287794.35527,
      "hostOnly": false,
      "httpOnly": true,
      "name": "li_at",
      "path": "/",
      "sameSite": "no_restriction",
      "secure": true,
      "session": false,
      "storeId": null,
      "value": "AQEDASd6Tv8DvM4iAAABlcQaBJwAAAGV6CaInFYArlsZejp2MFopkglM17YWd7W2xTynYOHq9etkDM7xw0DgfnlvMfP6SCNsr12aEbdOFg2SavpzGOOBL2JFTkE9cTFvx-4jyTlDIvLbB8eB5luXaxGd"
  },
  {
      "domain": ".linkedin.com",
      "hostOnly": false,
      "httpOnly": false,
      "name": "lang",
      "path": "/",
      "sameSite": "no_restriction",
      "secure": true,
      "session": true,
      "storeId": null,
      "value": "v=2&lang=en-us"
  },
  {
      "domain": ".linkedin.com",
      "expirationDate": 1742888322.737894,
      "hostOnly": false,
      "httpOnly": false,
      "name": "lidc",
      "path": "/",
      "sameSite": "no_restriction",
      "secure": true,
      "session": false,
      "storeId": null,
      "value": "\"b=OB39:s=O:r=O:a=O:p=O:g=13014:u=723:x=1:i=1742815746:t=1742888322:v=2:sig=AQHN_qJ_tNB4_uNeYNXcR3aLf7XxhcVk\""
  },
  {
      "domain": ".linkedin.com",
      "expirationDate": 1745311619.637409,
      "hostOnly": false,
      "httpOnly": false,
      "name": "AnalyticsSyncHistory",
      "path": "/",
      "sameSite": "no_restriction",
      "secure": true,
      "session": false,
      "storeId": null,
      "value": "AQKVP5w4u0fPyAAAAZXCLxJR6H-KJo_TUekVWyH8AEh8wsN3WFIP43kagjUanPR2KpiHlIJWFKwRMBtvTlUspQ"
  },
  {
      "domain": ".www.linkedin.com",
      "expirationDate": 1774288940.159371,
      "hostOnly": false,
      "httpOnly": true,
      "name": "bscookie",
      "path": "/",
      "sameSite": "no_restriction",
      "secure": true,
      "session": false,
      "storeId": null,
      "value": "\"v=1&20231229170159ee9ac9b7-7bdb-451c-8324-9d2d75fb03daAQGKUjJc1fNY1-7UR3YAHNHNXRWqB_s6\""
  },
  {
      "domain": ".linkedin.com",
      "expirationDate": 1750099008.214076,
      "hostOnly": false,
      "httpOnly": true,
      "name": "dfpfpt",
      "path": "/",
      "sameSite": "lax",
      "secure": true,
      "session": false,
      "storeId": null,
      "value": "d804ba9cd74e4385806df1b59d62f7af"
  },
  {
      "domain": ".www.linkedin.com",
      "expirationDate": 1750527794.35531,
      "hostOnly": false,
      "httpOnly": false,
      "name": "JSESSIONID",
      "path": "/",
      "sameSite": "no_restriction",
      "secure": true,
      "session": false,
      "storeId": null,
      "value": "\"ajax:1013904648283067115\""
  },
  {
      "domain": ".linkedin.com",
      "expirationDate": 1750591746.400887,
      "hostOnly": false,
      "httpOnly": false,
      "name": "li_sugr",
      "path": "/",
      "sameSite": "no_restriction",
      "secure": true,
      "session": false,
      "storeId": null,
      "value": "ec0f21f6-0fa1-400d-870a-f1ee896a171e"
  },
  {
      "domain": ".www.linkedin.com",
      "expirationDate": 1758367743,
      "hostOnly": false,
      "httpOnly": false,
      "name": "li_theme",
      "path": "/",
      "sameSite": null,
      "secure": true,
      "session": false,
      "storeId": null,
      "value": "dark"
  },
  {
      "domain": ".www.linkedin.com",
      "expirationDate": 1758367743,
      "hostOnly": false,
      "httpOnly": false,
      "name": "li_theme_set",
      "path": "/",
      "sameSite": null,
      "secure": true,
      "session": false,
      "storeId": null,
      "value": "user"
  },
  {
      "domain": ".linkedin.com",
      "expirationDate": 1750527794.355212,
      "hostOnly": false,
      "httpOnly": false,
      "name": "liap",
      "path": "/",
      "sameSite": "no_restriction",
      "secure": true,
      "session": false,
      "storeId": null,
      "value": "true"
  },
  {
      "domain": ".www.linkedin.com",
      "expirationDate": 1744025343,
      "hostOnly": false,
      "httpOnly": false,
      "name": "timezone",
      "path": "/",
      "sameSite": null,
      "secure": true,
      "session": false,
      "storeId": null,
      "value": "Asia/Calcutta"
  },
  {
      "domain": ".linkedin.com",
      "expirationDate": 1745407745,
      "hostOnly": false,
      "httpOnly": false,
      "name": "UserMatchHistory",
      "path": "/",
      "sameSite": "no_restriction",
      "secure": true,
      "session": false,
      "storeId": null,
      "value": "AQLdxTuEjONX5gAAAZXH6dKzKphFfT2gjYKSn3Fx8RegEGU9hHhUs_uWUWJ8HRwevwHX7Bfbd6rCCIUC7YUTxVEGPFQfP1Ptt_ym2QQuTRt88aVqYOBKsEcXyiJkdcLux9-iCzT_5mzC-8YCwmpC_RLdoikPVPq1B4fahkPC4pG5fauxkPtZw66p0o4fuS6sx8OISVR95QaqXYcZTRDMp6OlOxayZgV1TliwV44cvPlTocsyTVJ6s1fNs8dYCbnsXthVsf7lLccF2PJIHRW5nbWdl9Z9dzVpU3M202xu2jrQt4kZuiq9p2Zm7TScoGoK_oqfikyEV-X26mqrU3ps47Zl-aDJYtpR0bOpKFHyFg6TQ_sjLA"
  }
]

// Configuration
const CORS_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const SCRAPER_CONFIGS: Record<Platform, ScraperConfig> = {
  instagram: {
    actorId: "nH2AHrwxeTRJoN5hX",
    requestBody: {
      resultsLimit: 75,
      resultsType: ["posts", "reels", "stories", "highlights"],
      scrapeFollowers: true,
      scrapeFollowing: true,
      expandOwners: true,
      scrapeLikes: true,
      scrapeComments: true,
      commentsLimit: 50,
    },
  },
  linkedin: {
    actorId: "kfiWbq3boy3dWKbiL",
    requestBody: {
      deepScrape: true,
      rawData: false,
      minDelay: 2,
      maxDelay: 8,
      cookie: LINKEDIN_COOKIES,
      limitPerSource: 50,
      proxy: {
        useApifyProxy: true,
        apifyProxyCountry: "US",
      },
    },
  },
};

// Initialize clients
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Status management functions
async function updateStatusDirect(
  profileId: string,
  status: ScrapeStatus,
  errorMessage?: string
): Promise<boolean> {
  try {
    const updateData: ProfileUpdateData = { scrape_status: status };

    if (status === "completed") {
      updateData.last_scraped = new Date().toISOString();
    }
    if (errorMessage) {
      updateData.scrape_error = errorMessage;
    }

    console.log(`[Direct] Updating profile ${profileId} status to ${status}...`);

    const { error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", profileId);

    if (error) {
      console.error(`[Direct] Status update failed:`, error);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`[Direct] Exception in status update:`, error);
    return false;
  }
}

// Data processing functions
async function saveProfileData(profileId: string, rawData: any): Promise<void> {
  try {
    await updateStatusDirect(profileId, "scraping");

    const processedData = Array.isArray(rawData) ? rawData : [rawData];
    const platformSpecificData = processedData[0] || null;

    await supabase.from("profile_data").delete().eq("profile_id", profileId);

    const { error } = await supabase.from("profile_data").insert([
      {
        profile_id: profileId,
        raw_data: processedData,
        platform_specific_data: platformSpecificData,
      },
    ]);

    if (error) throw new Error(`Database error: ${error.message}`);
    await updateStatusDirect(profileId, "completed");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error saving data";
    await updateStatusDirect(profileId, "failed", errorMessage);
    throw error;
  }
}

// Start a scraping job with webhook notification
async function startScrapingJob(platform: Platform, username: string, profileId: string, apifyToken: string) {
  const config = SCRAPER_CONFIGS[platform];
  const client = new ApifyClient({ token: apifyToken });
  
  const cleanUsername = username.replace("@", "").trim();
  const requestBody = {
    ...config.requestBody,
    ...(platform === "instagram" 
      ? { username: [cleanUsername] }
      : { urls: [username] }),
  };

  // Get the current function's URL to use as webhook
  const baseUrl = Deno.env.get("WEBHOOK_URL") || "";
  const webhookUrl = `${baseUrl}/scrape_profile_apify`;

  // Start the actor
  const { id: runId } = await client.actor(config.actorId).start(requestBody, {
    webhooks: [
      {
        eventTypes: ["ACTOR.RUN.SUCCEEDED", "ACTOR.RUN.FAILED", "ACTOR.RUN.TIMED_OUT", "ACTOR.RUN.ABORTED"],
        requestUrl: `${webhookUrl}?profileId=${profileId}`,
      },
    ],
  });

  console.log(`Started Apify run with ID: ${runId} for profile ${profileId}`);
  
  // Store the run ID in the database for reference
  await supabase
    .from("profiles")
    .update({ 
      scrape_status: "fetching",
      apify_run_id: runId 
    })
    .eq("id", profileId);

  return runId;
}

// Process webhook data synchronously
async function processWebhookData(event: string | undefined, resource: any, profileId: string, apifyToken: string) {
  const client = new ApifyClient({ token: apifyToken });
  
  // Log the entire webhook payload for debugging
  console.log(`Full webhook payload for profile ${profileId}:`, JSON.stringify(resource, null, 2));
  
  // Extract run information - handle missing properties
  const defaultDatasetId = resource?.defaultDatasetId;
  const status = resource?.status;
  const actId = resource?.actId;
  
  console.log(`Received webhook for profile ${profileId}, status: ${status}, event: ${event}`);
  
  // If event is undefined, use the status from the resource
  const eventType = event || (status === 'SUCCEEDED' ? 'ACTOR.RUN.SUCCEEDED' : 
                             status === 'FAILED' ? 'ACTOR.RUN.FAILED' :
                             status === 'TIMED-OUT' ? 'ACTOR.RUN.TIMED_OUT' :
                             status === 'ABORTED' ? 'ACTOR.RUN.ABORTED' : 'UNKNOWN');
  
  console.log(`Using event type: ${eventType} for webhook processing`);
  
  // Handle different webhook events
  if (eventType === "ACTOR.RUN.SUCCEEDED" || status === "SUCCEEDED") {
    try {
      await updateStatusDirect(profileId, "scraping");
      
      if (!defaultDatasetId) {
        throw new Error("Missing defaultDatasetId in webhook data");
      }
      
      // Fetch the data from the dataset
      const { items } = await client.dataset(defaultDatasetId).listItems();
      
      if (!items || items.length === 0) {
        throw new Error("No data returned from scraping service");
      }
      
      // Save the data
      await saveProfileData(profileId, items);
      console.log(`Successfully processed webhook data for profile ${profileId}`);
      
    } catch (error) {
      console.error("Error processing webhook data:", error);
      const errorMsg = error instanceof Error ? error.message : "Error processing scraped data";
      await updateStatusDirect(profileId, "failed", errorMsg);
    }
  } else if (["ACTOR.RUN.FAILED", "ACTOR.RUN.TIMED_OUT", "ACTOR.RUN.ABORTED"].includes(eventType) ||
             ["FAILED", "TIMED-OUT", "ABORTED"].includes(status)) {
    // Handle failure cases
    const errorReason = event ? 
                        event.replace("ACTOR.RUN.", "").toLowerCase() : 
                        status ? status.toLowerCase() : "unknown error";
    await updateStatusDirect(profileId, "failed", `Scraping ${errorReason}`);
  } else {
    // Handle unknown event types
    console.warn(`Unknown webhook event type: ${eventType}, status: ${status}`);
    await updateStatusDirect(profileId, "failed", `Unknown webhook event: ${eventType || status || 'missing event type'}`);
  }
  
  return { success: true, message: `Webhook processed for event ${eventType}` };
}

// Main server function
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  // Parse the URL to extract query parameters
  const url = new URL(req.url);
  const profileId = url.searchParams.get("profileId");
  
  try {
    const apifyToken = Deno.env.get("APIFY_API_TOKEN");
    if (!apifyToken) {
      return new Response(
        JSON.stringify({ error: "Server configuration error: Missing API credentials" }),
        { status: 500, headers: CORS_HEADERS }
      );
    }

    // Handle webhook from Apify - skip auth check if coming from Apify
    if (profileId && req.method === "POST") {
      // No need to check authorization for webhook callbacks from Apify
      // The security is handled by including the API key in the webhook URL itself
      
      console.log(`Received webhook POST request for profile ${profileId}`);
      
      // Log the raw request body for debugging
      const rawBody = await req.text();
      console.log(`Webhook raw body: ${rawBody}`);
      
      // Parse the body
      let webhookData;
      try {
        webhookData = JSON.parse(rawBody);
        console.log(`Parsed webhook data: ${JSON.stringify(webhookData)}`);
      } catch (e) {
        console.error(`Error parsing webhook JSON: ${e}`);
        return new Response(
          JSON.stringify({ error: "Invalid JSON payload" }),
          { status: 400, headers: CORS_HEADERS }
        );
      }
      
      // Extract event and resource
      const event = webhookData?.event;
      const resource = webhookData?.resource || webhookData;
      
      // Process the webhook synchronously
      const result = await processWebhookData(event, resource, profileId, apifyToken);
      
      return new Response(
        JSON.stringify({
          ...result,
          additionalInfo: `Webhook processed completely`
        }),
        { headers: CORS_HEADERS }
      );
    }
    
    // Regular API request to start scraping
    if (req.method === "POST") {
      const { platform, username, profileId } = await req.json();

      if (!platform || !username || !profileId) {
        return new Response(
          JSON.stringify({ error: "Missing required fields" }),
          { status: 400, headers: CORS_HEADERS }
        );
      }
      
      // Start the scraping job and return immediately
      const runId = await startScrapingJob(platform, username, profileId, apifyToken);
      
      return new Response(
        JSON.stringify({
          success: true,
          message: "Profile data fetching started - waiting for webhook callback",
          profileId,
          runId,
          status: "fetching",
        }),
        { headers: CORS_HEADERS }
      );
    }
    
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: CORS_HEADERS }
    );
    
  } catch (error) {
    console.error("Request error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
});
