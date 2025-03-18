// Check if API key is available
if (!process.env.OPENROUTER_API_KEY) {
  console.warn('OPENROUTER_API_KEY is not set in environment variables');
}

// Platform-specific analysis prompts
const INSTAGRAM_ANALYSIS_PROMPT = `
# IG final system prompt

The user will upload a JSON file. Do a deep dive analysis of the data using the below:

# Strategic Value of Instagram Data Analytics: Creative Applications

## Competitive Intelligence & Market Analysis

### Content Performance Benchmarking

- Compare your engagement rates against competitors to establish realistic KPIs
- Identify which content types generate highest engagement across your industry (Ugra's animated Ursa character videos consistently outperform)
- Analyze comment-to-view ratios to measure content resonance beyond vanity metrics

### Product Positioning Analysis

- Track how competitors position similar products (Ugra emphasizes cultural heritage and craftsmanship)
- Identify market gaps by analyzing which product features competitors highlight vs. ignore
- Map pricing signals through caption language and positioning terminology

### Audience Sentiment Mining

- Extract qualitative feedback from comments to inform product development
- Create sentiment tracking dashboards to monitor brand perception over time
- Compare comment themes across competitors to identify unmet audience needs

## Content Strategy Optimization

### Engagement Pattern Recognition

- Create a "golden ratio" formula for your caption length, hashtag count, and posting times based on top-performing posts
- Develop a music selection strategy by analyzing which soundtracks drive higher completion rates
- Build a data-driven content calendar that aligns with day-of-week engagement patterns (Ugra's Monday mascot posts)

### Visual Identity Refinement

- Document color palettes and visual styles that generate highest engagement
- Analyze video duration sweet spots (Ugra performs well with both very short 5-7 second clips and longer 30+ second storytelling)
- Chart your most successful camera angles, lighting styles, and presentation formats

### Storytelling Framework Development

- Map successful content narrative arcs (Ugra alternates between product showcases, brand storytelling, and cultural content)
- Create templated caption structures based on your highest-performing post formats
- Develop a brand character like Ugra's "Ursa" that becomes a recognizable mascot

## Growth & Partnership Strategy

### Influencer Ecosystem Mapping

- Identify micro-influencers who engage with competitors but not yet with you
- Build partnership prospect lists based on comment engagement patterns
- Analyze which influencer content types drive most engagement in your niche

### Targeted Hashtag Strategy

- Create a tiered hashtag library organized by engagement potential and audience size
- Develop niche-specific hashtag combinations that competitors miss
- Track hashtag performance to identify emerging trends before they mainstream

### Community Building Tactics

- Identify your most engaged followers to create ambassador programs
- Analyze timing between posting and comment responses to optimize community management
- Map relationship networks between commenters to identify potential community leaders

## Creative Implementation Ideas

1. **Trend Forecasting Dashboard**: Build a visualization that tracks emerging aesthetic trends, caption patterns, and engagement triggers in your industry
2. **Content DNA Analysis**: Create a "genetic" breakdown of your most successful posts, identifying the exact elements (time of day, caption length, visual style, product angle) that made them perform well
3. **Competitor Calendar Reverse-Engineering**: Map competitors' posting patterns to anticipate their content strategy and position yours strategically in contrast
4. **Engagement Fingerprinting**: Develop unique engagement profile "fingerprints" for different audience segments based on how they interact with your content
5. **Algorithmic Content Testing**: Design systematic A/B tests of different content elements (caption style, video length, music choice) to optimize your formula
6. **Sentiment Weather Map**: Create a visual "weather report" showing positive/negative sentiment clouds moving across your brand landscape over time
7. **Opportunity Gap Analysis**: Compare your content distribution against competitors to identify underserved content types or themes you could dominate
8. **Audience Journey Mapping**: Track how viewers move from casual observers to commenters to customers by analyzing engagement progression patterns

This level of data-driven strategy gives the user unprecedented ability to optimize their content approach, understand market positioning opportunities, and build a brand strategy based on empirical evidence rather than gut feeling.
`

const LINKEDIN_ANALYSIS_PROMPT = `
# LinkedIn final system prompt

The user will upload a JSON file. analyse the attached JSON and share in the format below:

# Comprehensive Intelligence from LinkedIn Data

## 1. Engagement Analytics

- **Engagement Rate Calculation**: Total engagement (likes + comments + shares) relative to follower count
- **Engagement Distribution**: Breakdown of reactions vs. comments vs. shares per post
- **Engagement Density**: Engagement per word/character of content
- **Engagement Growth Trend**: Changes in engagement rates over time
- **Engagement-to-Impression Ratio**: Percentage of viewers who take action (if impression data available)
- **Cross-Post Engagement Comparison**: Performance variations across different posts
- **Engagement Half-Life**: How quickly engagement tapers after posting

## 2. Audience Interaction Quality

- **Reaction Type Distribution**: Analysis of premium reactions (PRAISE, EMPATHY) vs. basic likes
- **Comment Depth Analysis**: Average length and complexity of comments
- **Commenter Professional Profile**: Seniority level and industry distribution of engaged users
- **Commenter Network Position**: Connection distance (1st, 2nd, OUT_OF_NETWORK) distribution
- **Response Rate Analysis**: How often and quickly the author responds to comments
- **Comment Sentiment Analysis**: Positive/negative/neutral sentiment in comments
- **Comment Topic Clustering**: Identifying common themes in audience responses
- **Commenter Loyalty Metrics**: Repeat engagement from the same profiles

## 3. Content Performance Metrics

- **Content Type Effectiveness**: Comparison of performance across media types (text, image, video, article)
- **Content Length Correlation**: Relationship between content length and engagement
- **Video Retention Analysis**: Video view metrics relative to video length
- **Content Velocity**: Time to reach engagement thresholds after posting
- **Hashtag Performance**: Engagement impact of different hashtags
- **Language Complexity Impact**: Reading level correlation with engagement metrics
- **Post Structure Analysis**: Performance of posts with different structural elements (lists, questions, CTAs)
- **Emotive Language Effect**: Impact of emotional language on engagement

## 4. Temporal Performance Patterns

- **Time-of-Day Optimization**: Engagement patterns based on posting time
- **Day-of-Week Performance**: Optimal days for maximum engagement
- **Posting Frequency Impact**: Effect of posting cadence on per-post performance
- **Seasonal Trend Analysis**: Cyclical patterns in content performance
- **Content Evergreen Factor**: Long-tail engagement for different content types
- **Peak Engagement Windows**: Identifying when content receives highest interaction rates
- **Time-to-First-Engagement**: How quickly posts receive initial interactions

## 5. Network Effect Metrics

- **Viral Coefficient**: Number of new engagers generated per share
- **Network Amplification**: Expansion beyond immediate connections
- **Influencer Engagement Impact**: Effect when influential profiles engage with content
- **Early Commenter Effect**: Impact of first commenters on subsequent engagement
- **Comment Thread Depth**: Analysis of conversation chains within comments
- **Cross-Pollination Rate**: Engagement overlap between different posts
- **Tag & Mention Effectiveness**: Impact of tagging other users/companies

## 6. Content Topic Analysis

- **Topic Performance Comparison**: Engagement rates for different subject matters
- **Keyword Engagement Correlation**: Identifying high-performing keywords
- **Industry-Specific Content Performance**: Which topics resonate with specific industries
- **Topical Trend Analysis**: Rising and falling interest in specific subjects
- **Competitor Topic Overlap**: Shared content themes with industry competitors
- **Content Series Performance**: Engagement patterns across multi-post series
- **Topic Sentiment Alignment**: How sentiment varies by subject matter

## 7. Visual Content Analytics

- **Image Performance Metrics**: Engagement lift from visual elements
- **Video Aspect Ratio Impact**: Performance difference between vertical/horizontal videos
- **Thumbnail Effectiveness**: Click rates based on video preview images
- **Visual Branding Consistency**: Performance impact of consistent visual elements
- **Color Scheme Analysis**: Engagement patterns based on dominant colors
- **Image-to-Text Ratio**: Optimal balance between visual and written content
- **Video Production Quality Correlation**: Professional vs. casual video performance

## 8. Audience Demographic Insights

- **Geographic Engagement Distribution**: Regional engagement patterns
- **Industry Vertical Response Rates**: Which sectors engage most actively
- **Professional Function Analysis**: Job roles most responsive to content
- **Seniority Level Breakdown**: Executive vs. manager vs. individual contributor engagement
- **Company Size Segmentation**: Response patterns by organizational scale
- **Education Level Correlation**: Academic background of most engaged audience
- **Cross-Language Engagement**: Performance across linguistic boundaries

## 9. Competitive Intelligence

- **Share-of-Voice Analysis**: Engagement relative to competitors
- **Competitive Response Patterns**: How quickly competitors address similar topics
- **Audience Overlap Assessment**: Shared audience segments with competitors
- **Competitive Content Gap Analysis**: Unique vs. common content themes
- **Engagement Benchmarking**: Performance relative to industry standards
- **Distinctive Reaction Patterns**: How audience sentiment differs from competitors
- **Positioning Effectiveness**: Clarity of differentiation in market positioning

## 10. Strategic Performance Indicators

- **Brand Message Consistency**: Alignment between stated positioning and content
- **Call-to-Action Effectiveness**: Response rates to different CTAs
- **Corporate Voice Consistency**: Linguistic style coherence across posts
- **Thought Leadership Measurement**: Expertise perception based on comment quality
- **Controversy Impact Assessment**: Effect of controversial topics on engagement
- **Crisis Response Effectiveness**: Engagement during challenging periods
- **Campaign Attribution Analysis**: Connecting LinkedIn activity to broader marketing initiatives

## 11. Content Optimization Opportunities

- **Optimal Post Length**: Identifying ideal character count ranges
- **Headline Effectiveness**: Performance of different title approaches
- **Question Formatting Impact**: Engagement when posts include direct questions
- **List Content Performance**: Engagement with numbered/bulleted content
- **URL Impact Analysis**: Effect of including external links
- **Emoji Usage Correlation**: Relationship between emoji use and engagement
- **First Paragraph Optimization**: Retention based on opening content
- **Content Gap Identification**: Underutilized high-potential topics

## 12. Advanced Predictive Analytics

- **Engagement Forecasting**: Predictive modeling of future post performance
- **Content Fatigue Detection**: Declining returns on similar content types
- **Audience Growth Projection**: Trend analysis for follower acquisition
- **Topic Lifecycle Analysis**: Identifying emerging vs. declining content themes
- **Optimal Posting Schedule Generation**: AI-driven content calendar recommendations
- **Audience Evolution Tracking**: Shifts in demographic engagement over time
- **Content Recommendation Engine**: Suggesting optimal next topics based on performance patterns

This comprehensive framework captures the full spectrum of insights potentially extractable from the LinkedIn JSON data.

Give this report in full detail, and back it up with examples and metrics.

Next ask the user if they want actionable advice on any of these insights.
`


export async function analyzeProfile(platform: string, profileData: string) {
  try {
    console.log(`Sending ${platform} profile request to OpenRouter API...`);
    
    // Select the appropriate analysis prompt based on platform
    const analysisPrompt = platform === 'instagram' ? INSTAGRAM_ANALYSIS_PROMPT : LINKEDIN_ANALYSIS_PROMPT

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

    
    // Convert to string with reasonable size limit
    const profileDataString = `
      ${JSON.stringify(profileData)}
    `;
      
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
