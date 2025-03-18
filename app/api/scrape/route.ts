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
    if (!process.env.APIFY_API_TOKEN) {
      console.error('APIFY_API_TOKEN is missing')
      return NextResponse.json(
        { error: 'Server configuration error: Missing API credentials' },
        { status: 500 }
      )
    }

    // Clean the username (remove @ and trim)
    const cleanUsername = username.replace('@', '').trim()

    // Set up Apify Actor IDs and parameters
    const actorId = platform === 'instagram'
      ? 'nH2AHrwxeTRJoN5hX' // Instagram scraper Actor ID
      : '2SyF0bVxmgGr8IVCZ' // LinkedIn scraper Actor ID

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
        }

    // Call Apify API to run the Actor
    const apifyUrl = `https://api.apify.com/v2/acts/${actorId}/runs?waitForFinish=60`
    
    console.log(`Calling Apify API for ${platform} profile: ${username}`)
    console.log('Request body:', JSON.stringify(requestBody))
    
    try {
      const response = await fetch(apifyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.APIFY_API_TOKEN}`,
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Apify API error:', response.status, errorText)
        return NextResponse.json(
          { error: `Apify API error: ${response.status} ${errorText}` },
          { status: response.status }
        )
      }

      const runData = await response.json()
      console.log('Apify run created:', runData.data.id)

      // Get the dataset items from the run
      const datasetId = runData.data.defaultDatasetId
      const datasetUrl = `https://api.apify.com/v2/datasets/${datasetId}/items`
      
      const datasetResponse = await fetch(datasetUrl, {
        headers: {
          'Authorization': `Bearer ${process.env.APIFY_API_TOKEN}`,
        },
      })

      if (!datasetResponse.ok) {
        const errorText = await datasetResponse.text()
        console.error('Apify dataset error:', datasetResponse.status, errorText)
        return NextResponse.json(
          { error: `Failed to get dataset: ${datasetResponse.status} ${errorText}` },
          { status: datasetResponse.status }
        )
      }

      const data = await datasetResponse.json()
      if (!Array.isArray(data)) {
        console.error('Unexpected Apify dataset response format:', data)
        return NextResponse.json(
          { error: 'Unexpected dataset format from Apify' },
          { status: 500 }
        )
      }
      
      console.log(`Retrieved ${data.length} items from Apify dataset`)

      try {
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
            postTypes
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
            skills
          };
        }

        // Store the scraped data
        const { error: insertError } = await supabase
          .from('profile_data')
          .insert([{
            profile_id: profileId,
            raw_data: processedData,
            platform_specific_data: platformSpecificData,
          }])

        if (insertError) {
          console.error('Supabase insert error:', insertError)
          return NextResponse.json(
            { error: `Database error: ${insertError.message}` },
            { status: 500 }
          )
        }

        // Update the profile's last_scraped timestamp
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ last_scraped: new Date().toISOString() })
          .eq('id', profileId)

        if (updateError) {
          console.error('Supabase update error:', updateError)
          // Continue even if update fails
        }

        // Prepare a summary of the scraped data for the response
        const dataSummary = {
          dataCount: data.length,
          platform,
          username: cleanUsername,
          profileId,
          scrapedAt: new Date().toISOString(),
          metrics: platform === 'instagram' 
            ? {
                followers: platformSpecificData?.followersCount || 0,
                following: platformSpecificData?.followingCount || 0,
                posts: platformSpecificData?.postsCount || 0,
                engagementRate: platformSpecificData?.engagementRate?.toFixed(2) + '%' || '0%',
                avgLikes: Math.round(platformSpecificData?.averageLikes || 0),
                avgComments: Math.round(platformSpecificData?.averageComments || 0),
                topPostType: platformSpecificData?.topPostType || 'Unknown'
              }
            : {
                connections: platformSpecificData?.connectionsCount || 'N/A',
                posts: (platformSpecificData?.posts || []).length,
                engagementRate: platformSpecificData?.engagementRate?.toFixed(2) + '%' || '0%',
                skills: platformSpecificData?.skillsCount || 0,
                experience: platformSpecificData?.experienceCount || 0,
                education: platformSpecificData?.educationCount || 0
              }
        }

        return NextResponse.json({ 
          success: true, 
          ...dataSummary
        })
      } catch (dbError) {
        console.error('Database operation error:', dbError)
        return NextResponse.json(
          { error: 'Failed to save profile data to database' },
          { status: 500 }
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
    console.error('Scraping error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to scrape profile' },
      { status: 500 }
    )
  }
} 