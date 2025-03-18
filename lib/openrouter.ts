// Check if API key is available
if (!process.env.OPENROUTER_API_KEY) {
  console.warn('OPENROUTER_API_KEY is not set in environment variables');
}

// Platform-specific analysis prompts
const INSTAGRAM_ANALYSIS_PROMPT = `# System prompt

The user will upload a JSON file. analyse the attached JSON and share in the format below:

# Comprehensive Intelligence from LinkedIn Data

## 1. Engagement Analytics

- Engagement Rate Calculation: Total engagement (likes + comments + shares) relative to follower count
- Engagement Distribution: Breakdown of reactions vs. comments vs. shares per post
- Engagement Density: Engagement per word/character of content
- Engagement Growth Trend: Changes in engagement rates over time
- Engagement-to-Impression Ratio: Percentage of viewers who take action (if impression data available)
- Cross-Post Engagement Comparison: Performance variations across different posts
- Engagement Half-Life: How quickly engagement tapers after posting

## 2. Audience Interaction Quality

- Reaction Type Distribution: Analysis of premium reactions (PRAISE, EMPATHY) vs. basic likes
- Comment Depth Analysis: Average length and complexity of comments
- Commenter Professional Profile: Seniority level and industry distribution of engaged users
- Commenter Network Position: Connection distance (1st, 2nd, OUT_OF_NETWORK) distribution
- Response Rate Analysis: How often and quickly the author responds to comments
- Comment Sentiment Analysis: Positive/negative/neutral sentiment in comments
- Comment Topic Clustering: Identifying common themes in audience responses
- Commenter Loyalty Metrics: Repeat engagement from the same profiles

## 3. Content Performance Metrics

- Content Type Effectiveness: Comparison of performance across media types (text, image, video, article)
- Content Length Correlation: Relationship between content length and engagement
- Video Retention Analysis: Video view metrics relative to video length
- Content Velocity: Time to reach engagement thresholds after posting
- Hashtag Performance: Engagement impact of different hashtags
- Language Complexity Impact: Reading level correlation with engagement metrics
- Post Structure Analysis: Performance of posts with different structural elements (lists, questions, CTAs)
- Emotive Language Effect: Impact of emotional language on engagement

## 4. Temporal Performance Patterns

- Time-of-Day Optimization: Engagement patterns based on posting time
- Day-of-Week Performance: Optimal days for maximum engagement
- Posting Frequency Impact: Effect of posting cadence on per-post performance
- Seasonal Trend Analysis: Cyclical patterns in content performance
- Content Evergreen Factor: Long-tail engagement for different content types
- Peak Engagement Windows: Identifying when content receives highest interaction rates
- Time-to-First-Engagement: How quickly posts receive initial interactions

## 5. Network Effect Metrics

- Viral Coefficient: Number of new engagers generated per share
- Network Amplification: Expansion beyond immediate connections
- Influencer Engagement Impact: Effect when influential profiles engage with content
- Early Commenter Effect: Impact of first commenters on subsequent engagement
- Comment Thread Depth: Analysis of conversation chains within comments
- Cross-Pollination Rate: Engagement overlap between different posts
- Tag & Mention Effectiveness: Impact of tagging other users/companies

## 6. Content Topic Analysis

- Topic Performance Comparison: Engagement rates for different subject matters
- Keyword Engagement Correlation: Identifying high-performing keywords
- Industry-Specific Content Performance: Which topics resonate with specific industries
- Topical Trend Analysis: Rising and falling interest in specific subjects
- Competitor Topic Overlap: Shared content themes with industry competitors
- Content Series Performance: Engagement patterns across multi-post series
- Topic Sentiment Alignment: How sentiment varies by subject matter

## 7. Visual Content Analytics

- Image Performance Metrics: Engagement lift from visual elements
- Video Aspect Ratio Impact: Performance difference between vertical/horizontal videos
- Thumbnail Effectiveness: Click rates based on video preview images
- Visual Branding Consistency: Performance impact of consistent visual elements
- Color Scheme Analysis: Engagement patterns based on dominant colors
- Image-to-Text Ratio: Optimal balance between visual and written content
- Video Production Quality Correlation: Professional vs. casual video performance

## 8. Audience Demographic Insights

- Geographic Engagement Distribution: Regional engagement patterns
- Industry Vertical Response Rates: Which sectors engage most actively
- Professional Function Analysis: Job roles most responsive to content
- Seniority Level Breakdown: Executive vs. manager vs. individual contributor engagement
- Company Size Segmentation: Response patterns by organizational scale
- Education Level Correlation: Academic background of most engaged audience
- Cross-Language Engagement: Performance across linguistic boundaries

## 9. Competitive Intelligence

- Share-of-Voice Analysis: Engagement relative to competitors
- Competitive Response Patterns: How quickly competitors address similar topics
- Audience Overlap Assessment: Shared audience segments with competitors
- Competitive Content Gap Analysis: Unique vs. common content themes
- Engagement Benchmarking: Performance relative to industry standards
- Distinctive Reaction Patterns: How audience sentiment differs from competitors
- Positioning Effectiveness: Clarity of differentiation in market positioning

## 10. Strategic Performance Indicators

- Brand Message Consistency: Alignment between stated positioning and content
- Call-to-Action Effectiveness: Response rates to different CTAs
- Corporate Voice Consistency: Linguistic style coherence across posts
- Thought Leadership Measurement: Expertise perception based on comment quality
- Controversy Impact Assessment: Effect of controversial topics on engagement
- Crisis Response Effectiveness: Engagement during challenging periods
- Campaign Attribution Analysis: Connecting LinkedIn activity to broader marketing initiatives

## 11. Content Optimization Opportunities

- Optimal Post Length: Identifying ideal character count ranges
- Headline Effectiveness: Performance of different title approaches
- Question Formatting Impact: Engagement when posts include direct questions
- List Content Performance: Engagement with numbered/bulleted content
- URL Impact Analysis: Effect of including external links
- Emoji Usage Correlation: Relationship between emoji use and engagement
- First Paragraph Optimization: Retention based on opening content
- Content Gap Identification: Underutilized high-potential topics

## 12. Advanced Predictive Analytics

- Engagement Forecasting: Predictive modeling of future post performance
- Content Fatigue Detection: Declining returns on similar content types
- Audience Growth Projection: Trend analysis for follower acquisition
- Topic Lifecycle Analysis: Identifying emerging vs. declining content themes
- Optimal Posting Schedule Generation: AI-driven content calendar recommendations
- Audience Evolution Tracking: Shifts in demographic engagement over time
- Content Recommendation Engine: Suggesting optimal next topics based on performance patterns

This comprehensive framework captures the full spectrum of insights potentially extractable from the LinkedIn JSON data.

Give answers in detail, and back them up with examples and metrics.

- No greetings.
- Politely Reject queries that fall outside the scope of analysing LinkedIn, Instagram or twitter and providing answers in its context and scope.


- Just provide the answer to the question.
- Dont ask any follow up questions.
- Avoid overly casual language or unnecessary enthusiasm. No filler words or excessive politeness. Stay neutral and professional, get straight to the point.
- Always use action oriented language.`;

const LINKEDIN_ANALYSIS_PROMPT = `
# System prompt

You are an AI assistant that analyzes LinkedIn profiles.
The user will upload a JSON file. analyse the attached JSON and share in the format below:

# Comprehensive Intelligence from LinkedIn Data

## 1. Professional Network Quality
- Connection quantity and growth pattern
- Industry and sector distribution of connections
- Connection quality (decision makers, influencers, peers)
- Network reach and visibility metrics
- Connection engagement level assessment

## 2. Content Engagement Analysis
- Post engagement rate calculation and benchmarking
- Comment quality and professional relevance
- Content sharing and amplification metrics
- Engagement trends over time
- Engagement by connection type (1st/2nd/3rd degree)

## 3. Content Type Effectiveness
- Article vs. post vs. document performance comparison
- Native LinkedIn content vs. external link sharing
- Text-only vs. visual content performance
- Long-form vs. short-form content engagement
- Professional video content effectiveness

## 4. Thought Leadership Assessment
- Industry expertise demonstration effectiveness
- Original thought vs. curated content performance
- Citation and reference by other professionals
- Authority building content identification
- Knowledge sharing effectiveness metrics

## 5. Career Trajectory Visualization
- Professional progression pace and pattern
- Role transition strategy effectiveness
- Industry movement and pivoting strategy
- Skill acquisition and development timeline
- Job tenure patterns and optimization

## 6. Skills & Endorsement Analysis
- Core vs. peripheral skill identification
- Skill endorsement patterns and credibility
- Skill gap analysis vs. industry demand
- Certification and credential effectiveness
- Skill showcase optimization strategy

## 7. Professional Branding Consistency
- Personal brand message clarity
- Visual identity consistency (photo, banner, media)
- Voice and communication style consistency
- Professional positioning uniqueness
- Personal vs. corporate brand alignment

## 8. Recommendation Quality Assessment
- Recommendation depth and specificity
- Recommender credibility and relevance
- Skill verification through recommendations
- Recommendation reciprocity patterns
- Strategic recommendation acquisition

## 9. Professional Activity Patterns
- Platform engagement frequency and timing
- Comment and reaction behavior analysis
- Group participation and community involvement
- Content consumption vs. creation balance
- Professional event participation visibility

## 10. Industry Positioning Analysis
- Competitor and peer comparison
- Industry thought leadership positioning
- Niche specialization vs. generalist approach
- Industry trend alignment and anticipation
- Cross-industry influence potential

## 11. Business Development Potential
- Lead generation indicator assessment
- Client and partner relationship nurturing
- Sales signal identification and amplification
- Business opportunity visibility optimization
- Professional service showcase effectiveness

## 12. Professional Growth Opportunities
- Network expansion strategic recommendations
- Content strategy enhancement opportunities
- Skill development priority recommendations
- Professional credential acquisition opportunities
- Visibility and influence amplification tactics

## 13. Executive Presence Assessment
- Leadership content effectiveness
- Authority signaling optimization
- Executive communication pattern analysis
- Professional gravitas demonstration
- Strategic visibility to senior decision makers

Give answers in detail with specific examples from the data. Be direct, professional and action-oriented.
Avoid unnecessary greetings or follow-up questions. Focus on providing actionable insights to improve professional presence.
`;


export async function analyzeProfile(platform: string, profileData: string) {
  try {
    console.log(`Sending ${platform} profile request to OpenRouter API...`);

    console.debug('Profile data:', profileData);
    
    // Select the appropriate analysis prompt based on platform
    const analysisPrompt = platform === 'instagram' 
      ? INSTAGRAM_ANALYSIS_PROMPT 
      : LINKEDIN_ANALYSIS_PROMPT;

    const messages = [
      {
        "role": "system",
        "content": analysisPrompt
      },
      {
        "role": "user",
        "content": profileData
      }
    ];
    
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": "https://torqueai.com", 
        "X-Title": "Torque AI", 
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "model": "google/gemini-2.0-flash-001",
        "messages": messages,
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenRouter API error: ${errorData.error || response.statusText}`);
    }
    
    const data = await response.json();
    console.log('OpenRouter API response received');
    
    if (!data || !data.choices || data.choices.length === 0) {
      console.error('Unexpected API response format:', JSON.stringify(data));
      throw new Error('Invalid response format');
    }
    
    return data.choices[0]?.message?.content || '';
  } catch (error) {
    console.error('Error in analyzeProfile:', error);
    return JSON.stringify({
      error: "Analysis failed",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
}


export async function generateProfileStats(platform: string, username: string, profileData: any) {
  try {
    console.log(`Generating stats for ${username} (${platform})...`);
    
    // Create platform-specific prompts for stats generation
    let statsPrompt = '';
    if (platform === 'instagram') {
      statsPrompt = `
        You are an AI Instagram analytics expert analyzing a profile for ${username}.
        Generate profile stats in JSON format with these exact sections:
        - audienceMetrics: follower count, demographics, growth rate, follower-to-following ratio
        - contentPerformance: post frequency, engagement rates, top-performing content types (photos/videos/reels/stories)
        - engagementInsights: likes, comments, saves, shares patterns, hashtag effectiveness
        - growthOpportunities: content gaps, engagement tactics, optimal posting times
        - competitiveAnalysis: comparison with similar profiles, industry benchmarks
        - keyTakeaways: visual branding strengths, content strategy recommendations, community building tactics

        Format as {"profileAnalysis": { audienceMetrics: {}, contentPerformance: {}, etc }}
        Keep all keys as strings and avoid arrays where possible.
      `;
    } else if (platform === 'linkedin') {
      statsPrompt = `
        You are an AI LinkedIn analytics expert analyzing a profile for ${username}.
      Generate profile stats in JSON format with these exact sections:
        - audienceMetrics: connection quality, industry distribution, follower demographics, profile visibility score
        - contentPerformance: post engagement by type (articles/posts/documents), professional content themes, thought leadership indicators
        - engagementInsights: comment quality, professional network interaction patterns, endorsement distributions
        - growthOpportunities: professional network expansion tactics, skill highlighting recommendations, content gaps
        - competitiveAnalysis: industry positioning, professional credential comparison, career trajectory
        - keyTakeaways: professional branding strengths, business development opportunities, expertise demonstration recommendations

      Format as {"profileAnalysis": { audienceMetrics: {}, contentPerformance: {}, etc }}
      Keep all keys as strings and avoid arrays where possible.
    `;
    } else {
      throw new Error(`Unsupported platform: ${platform}`);
    }

    // Extract only the essential profile data to reduce payload size
    let essentialData: Record<string, any> = {};
    
    try {
      if (typeof profileData === 'object' && profileData !== null) {
        // Extract only what's needed based on platform
        if (platform === 'instagram') {
          essentialData = {
            username: username,
            followerCount: profileData.followerCount || 'Not Available',
            followingCount: profileData.followingCount || 'Not Available',
            postsCount: profileData.postsCount || 'Not Available',
            bio: profileData.bio || '',
            postSample: profileData.posts 
              ? profileData.posts.slice(0, 5).map((post: any) => ({
                  caption: post.caption,
                  likeCount: post.likeCount,
                  commentCount: post.commentCount,
                  timestamp: post.timestamp,
                  type: post.type || 'post',
                  mediaType: post.mediaType || 'unknown'
                }))
              : [],
            reelsSample: profileData.reels
              ? profileData.reels.slice(0, 5).map((reel: any) => ({
                  caption: reel.caption,
                  playCount: reel.playCount,
                  likeCount: reel.likeCount,
                  commentCount: reel.commentCount,
                  timestamp: reel.timestamp
                }))
              : []
          };
        } else if (platform === 'linkedin') {
          essentialData = {
            username: username,
            headline: profileData.headline || '',
            summary: profileData.summary || '',
            followerCount: profileData.followerCount || 'Not Available',
            connectionCount: profileData.connectionCount || 'Not Available',
            skills: profileData.skills || [],
            experience: profileData.experience 
              ? profileData.experience.slice(0, 3).map((exp: any) => ({
                  title: exp.title,
                  company: exp.company,
                  duration: exp.duration,
                  description: exp.description
                }))
              : [],
            education: profileData.education || [],
            postSample: profileData.posts 
              ? profileData.posts.slice(0, 5).map((post: any) => ({
                  text: post.text,
                  reactions: post.reactions,
                  comments: post.comments,
                  date: post.date,
                  contentType: post.contentType || 'post'
                }))
              : [],
            articles: profileData.articles || [],
            certifications: profileData.certifications || []
          };
        }
      }
    } catch (err) {
      console.warn('Error extracting essential data, using minimal version:', err);
      essentialData = { username, platform };
    }
    
    // Convert to string with reasonable size limit
    const profileDataString = JSON.stringify(essentialData).slice(0, 30000);
      
    console.log('Profile data prepared for analysis, calling OpenRouter API');

    // Direct fetch implementation instead of using OpenAI client
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": "https://torqueai.com", 
        "X-Title": "Torque AI", 
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "model": "google/gemini-2.0-flash-001",
        "messages": [
          {
            "role": "system",
            "content": statsPrompt
          },
          {
            "role": "user",
            "content": profileDataString
          }
        ],
        "temperature": 0.2,
        "max_tokens": 4000,
        "response_format": { "type": "json_object" }
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenRouter API error: ${errorData.error || response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Stats generated successfully');

    // Check error
    if (data.error) {
      throw new Error(data.error);
    }
    
    if (!data?.choices?.[0]?.message?.content) {
      throw new Error('Empty response from model');
    }
    
    // Parse the response to ensure it's valid JSON
    const content = data.choices[0].message.content;
    let parsedStats: Record<string, any> = {};
    
    try {
      parsedStats = JSON.parse(content);
      
      // If response doesn't have profileAnalysis structure, wrap it
      if (!parsedStats.profileAnalysis) {
        parsedStats = { profileAnalysis: parsedStats };
      }
    } catch (parseError) {
      console.error('Error parsing response as JSON:', parseError);
      throw new Error('Invalid JSON response from OpenRouter');
    }
    
    return parsedStats;
  } catch (error) {
    console.error('Failed to generate profile stats:', error);
    throw error; // Propagate error to caller
  }
}
