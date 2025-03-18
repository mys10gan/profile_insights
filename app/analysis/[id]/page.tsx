"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useSupabase } from "@/components/providers/supabase-provider";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Loader2,
  ChevronLeft,
  BarChart3,
  MessageSquare,
  Instagram,
  Linkedin, 
  CalendarClock,
  Code, 
  Copy,
  Check, 
  RefreshCw,
  Users,
  Heart,
  LineChart,
  TrendingUp,
  Lightbulb,
  AlertCircle
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription, CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useParams } from "next/navigation";
import { formatTimeAgo, sanitizeUsername } from "@/lib/utils"

interface ProfileData {
  id: string;
  profile_id: string;
  raw_data: any;
  platform_specific_data: any;
  scraped_at: string;
}

interface Profile {
  id: string;
  user_id: string;
  platform: "instagram" | "linkedin";
  username: string;
  last_scraped: string;
  stats?: any;
  is_stats_generating?: boolean;
  scrape_status?: 'pending' | 'scraping' | 'completed' | 'failed';
  scrape_error?: string;
}

export default function Analysis() {
  const params = useParams();
  const id = params.id as string;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingStage, setLoadingStage] =
    useState<string>("Loading profile...");
  const [activeTab, setActiveTab] = useState("overview");
  const [showRawJson, setShowRawJson] = useState(false);
  const [copied, setCopied] = useState(false);
  const [generatingStats, setGeneratingStats] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const { user } = useSupabase();
  const [scraping, setScraping] = useState(false);
  const [scrapeError, setScrapeError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      if (!user) return

      // Fetch profile
      setLoading(true);
      setLoadingStage("Loading profile information...");
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .single();

      if (profileError) {
        console.error("Error fetching profile:", profileError);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load profile information.",
        });
        setLoading(false);
        return;
      }

      // Set profile data
      setProfile(profileData);
      
      // Update UI based on profile status
      updateProfileStatusUI(profileData);

      // Fetch raw profile data
      const { data: profileRawData, error: rawDataError } = await supabase
        .from("profile_data")
        .select("*")
        .eq("profile_id", id)
        .single();

      if (rawDataError) {
        console.error("Error fetching raw profile data:", rawDataError);
      } else {
        setProfileData(profileRawData);
      }

      setLoading(false);
      
      // Update generatingStats state based on profile status
      if (profileData.is_stats_generating) {
        setGeneratingStats(true);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load profile data.",
      });
      setLoading(false);
      setGeneratingStats(false);
    }
  }, [id, user, toast]);

  // Helper function to update UI based on profile status
  const updateProfileStatusUI = useCallback((profile: Profile) => {
    if (profile.scrape_status === 'scraping' || profile.scrape_status === 'pending') {
      setScraping(true);
      setScrapeError(null);
      setLoadingStage(`Fetching profile data... (${new Date().toLocaleTimeString()})`);
    } 
    else if (profile.scrape_status === 'failed') {
      setScraping(false);
      setScrapeError(profile.scrape_error || 'Failed to fetch profile data');
    }
    else if (profile.scrape_status === 'completed') {
      setScraping(false);
      setScrapeError(null);
      
      // Update generatingStats based on profile data
      setGeneratingStats(!!profile.is_stats_generating);
    }
  }, [setScraping, setScrapeError, setLoadingStage, setGeneratingStats]);

  useEffect(() => {
    if (!id) return;
    
    fetchData();

    // Set up Supabase real-time subscription to profile changes
    const profilesSubscription = supabase
      .channel('profile-updates-' + id)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${id}`
        },
        (payload) => {
          // Update profile data with latest changes
          const updatedProfile = payload.new as Profile;
          setProfile((prev: Profile | null) => prev ? { ...prev, ...updatedProfile } : updatedProfile);
          
          // Update UI based on profile status changes
          updateProfileStatusUI(updatedProfile);
          
          // If fetching completed, refresh the full data
          if (updatedProfile.scrape_status === 'completed' && !updatedProfile.is_stats_generating) {
            fetchData();
          }
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      profilesSubscription.unsubscribe();
    };
  }, [id, fetchData, updateProfileStatusUI, setProfile, supabase]);

  // Map profileAnalysis format to expected format if needed
  const formattedStats = useMemo(() => {
    if (!profile?.stats) return null;
    
    // If stats has profileAnalysis structure, transform it to the expected format
    if (profile.stats.profileAnalysis) {
      return {
        audienceMetrics: profile.stats.profileAnalysis.audienceMetrics || {},
        contentPerformance: profile.stats.profileAnalysis.contentPerformance || {},
        engagementInsights: profile.stats.profileAnalysis.engagementInsights || {},
        growthOpportunities: profile.stats.profileAnalysis.growthOpportunities || {},
        competitiveAnalysis: profile.stats.profileAnalysis.competitiveAnalysis || {},
        keyTakeaways: profile.stats.profileAnalysis.keyTakeaways || {}
      };
    }
    
    // Return the original stats if already in expected format
    return profile.stats;
  }, [profile?.stats]);

  // Get platform-specific tab and metric section names
  const getPlatformSpecificUI = useMemo(() => {
    if (!profile) return null;
    
    // Default tabs for both platforms
    const baseTabs = {
      overview: "Overview",
      performance: "Performance",
      recommendations: "Recommendations"
    };
    
    if (profile.platform === 'instagram') {
      return {
        tabs: {
          ...baseTabs,
          performance: "Content & Engagement"
        },
        metrics: {
          audience: {
            title: "Audience & Reach",
            icon: Users,
            description: "Follower demographics and reach metrics"
          },
          content: {
            title: "Content Performance",
            icon: BarChart3,
            description: "Posts, reels, and stories performance"
          },
          engagement: {
            title: "Engagement Analysis",
            icon: Heart,
            description: "Likes, comments, and interaction patterns"
          },
          hashtags: {
            title: "Hashtag Strategy",
            icon: LineChart,
            description: "Hashtag effectiveness and reach"
          },
          growth: {
            title: "Growth Strategy",
            icon: TrendingUp,
            description: "Follower growth and engagement tactics"
          }
        }
      };
    } else {
      // LinkedIn-specific UI elements
      return {
        tabs: {
          ...baseTabs,
          performance: "Professional Content"
        },
        metrics: {
          audience: {
            title: "Network Analysis",
            icon: Users,
            description: "Connection quality and professional reach"
          },
          content: {
            title: "Thought Leadership",
            icon: BarChart3,
            description: "Professional content effectiveness"
          },
          visual: {
            title: "Career & Skills",
            icon: LineChart,
            description: "Professional trajectory and expertise"
          },
          growth: {
            title: "Business Development",
            icon: TrendingUp,
            description: "Professional growth opportunities"
          }
        }
      };
    }
  }, [profile]);

  // Ensure loading state is properly managed
  useEffect(() => {
    if (profile && !profile.is_stats_generating) {
      setGeneratingStats(false);
    }
  }, [profile]);

  // New helper function to generate stats
  const generateStats = async () => {
    try {
      setGeneratingStats(true);
      setLoadingStage("Initiating profile analysis...");

      // Call API to generate stats
      const response = await fetch(
        `/api/generate-stats?profileId=${id}&userId=${user!.id}`
      );
      
      if (!response.ok) {
        throw new Error("Failed to generate stats. Please try again.");
      }
      
      // Refetch data to get the updated stats
      await fetchData();
      
      toast({
        title: "Stats generated",
        description: "Profile insights have been generated successfully.",
        variant: "success",
      });
    } catch (error) {
      console.error("Error generating stats:", error);
      
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to generate profile stats. Please try again.",
      });
    } finally {
      setGeneratingStats(false);
    }
  };

  const copyToClipboard = () => {
    if (profileData) {
      navigator.clipboard.writeText(
        JSON.stringify(profileData.raw_data, null, 2)
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Copied to clipboard",
        description: "Raw JSON data has been copied to your clipboard",
      });
    }
  };

  // Format numbers with K/M suffix
  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  // Format engagement rate as percentage
  const formatEngagementRate = (rate: number) => {
    return (rate * 100).toFixed(2) + '%';
  };

  // Update to use the shared sanitizeUsername utility
  const displayUsername = useMemo(() => {
    if (!profile?.username) return '';
    return sanitizeUsername(profile.username, profile.platform);
  }, [profile?.username, profile?.platform]);

  // Helper function to render Instagram stats card
  const renderInstagramStatsCard = (title: string, stats: Record<string, number | string>) => {
    if (!stats) return null;

    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4">
        {Object.entries(stats).map(([key, value]) => (
          <div key={key} className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-2xl sm:text-3xl font-bold text-gray-900">
              {typeof value === 'number' ? 
                (key.toLowerCase().includes('rate') ? formatEngagementRate(value) : formatNumber(value))
                : value}
            </p>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              {key.replace(/([A-Z])/g, ' $1').trim()}
            </p>
          </div>
        ))}
      </div>
    );
  };

  // Modify the TabsContent for Instagram-specific view
  const renderInstagramContent = () => {
    if (!profile || profile.platform !== 'instagram' || !formattedStats) return null;

    return (
      <div className="grid gap-4 sm:gap-6 grid-cols-1">
        {/* Quick Stats Overview */}
        <Card className="border border-gray-100 shadow-sm">
          <CardHeader className="bg-gray-50/50 p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Quick Stats</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Key performance indicators</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {renderInstagramStatsCard("Overview", {
              Followers: formattedStats.audienceMetrics?.totalFollowers || 0,
              Posts: formattedStats.contentPerformance?.totalPosts || 0,
              EngagementRate: formattedStats.engagementInsights?.averageEngagementRate || 0,
              ReachRate: formattedStats.audienceMetrics?.reachRate || 0,
              AvgLikes: formattedStats.engagementInsights?.averageLikes || 0,
              AvgComments: formattedStats.engagementInsights?.averageComments || 0
            })}
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2">
          {/* Content Performance */}
          <Card className="border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="bg-gray-50/50 p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
                Content Performance
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Analysis of posts, reels, and stories
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 sm:pt-6 p-4 sm:p-6">
              {formattedStats.contentPerformance && (
                <div className="space-y-4">
                  {Object.entries(formattedStats.contentPerformance).map(
                    ([key, value]) => {
                      if (Array.isArray(value)) {
                        return (
                          <div key={key} className="space-y-2">
                            <h4 className="font-medium text-gray-900 flex items-center gap-2">
                              {key === 'topPerformingPosts' && <TrendingUp className="h-4 w-4 text-green-500" />}
                              {key === 'contentTypes' && <BarChart3 className="h-4 w-4 text-blue-500" />}
                              {key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())}
                            </h4>
                            <ul className="list-disc pl-5 space-y-1">
                              {value.map((item, i) => (
                                <li key={i} className="text-gray-600 text-sm">{item}</li>
                              ))}
                            </ul>
                          </div>
                        );
                      }
                      return null;
                    }
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Engagement Analysis */}
          <Card className="border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="bg-gray-50/50 p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Heart className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
                Engagement Analysis
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                How your audience interacts with content
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 sm:pt-6 p-4 sm:p-6">
              {formattedStats.engagementInsights && (
                <div className="space-y-4">
                  {Object.entries(formattedStats.engagementInsights).map(
                    ([key, value]) => {
                      if (Array.isArray(value)) {
                        return (
                          <div key={key} className="space-y-2">
                            <h4 className="font-medium text-gray-900 flex items-center gap-2">
                              {key === 'bestTimeToPost' && <CalendarClock className="h-4 w-4 text-purple-500" />}
                              {key === 'engagementTrends' && <LineChart className="h-4 w-4 text-orange-500" />}
                              {key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())}
                            </h4>
                            <ul className="list-disc pl-5 space-y-1">
                              {value.map((item, i) => (
                                <li key={i} className="text-gray-600 text-sm">{item}</li>
                              ))}
                            </ul>
                          </div>
                        );
                      }
                      return null;
                    }
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  // Helper function to check if platform is Instagram
  const isInstagramProfile = (platform?: string): boolean => {
    return platform === 'instagram';
  };

  if (loading) {
    return (
      <div className="container mx-auto max-w-6xl p-4 py-8">
        <div className="mb-8">
          <Skeleton className="h-10 w-3/4 mb-2" />
          <Skeleton className="h-6 w-1/2" />
        </div>

        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center gap-2 text-lg text-gray-600">
            <Loader2 className="h-5 w-5 animate-spin" />
            {loadingStage}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-lg border p-6">
            <Skeleton className="h-8 w-1/2 mb-4" />
            <div className="space-y-4">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
            </div>
          </div>

          <div className="rounded-lg border p-6">
            <Skeleton className="h-8 w-1/2 mb-4" />
            <div className="space-y-4">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
            </div>
          </div>

          <div className="rounded-lg border p-6">
            <Skeleton className="h-8 w-1/2 mb-4" />
            <div className="space-y-4">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (scraping) {
    return (
      <div className="container mx-auto max-w-6xl p-4 py-8">
        <div className="mb-8">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/dashboard")}
            className="border-gray-200 mb-4 sm:mb-6 text-xs sm:text-sm h-8 sm:h-9"
          >
            <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
            Back to Dashboard
          </Button>
        </div>

        <div className="min-h-[300px] flex flex-col items-center justify-center gap-3 my-8 text-gray-500 dark:text-gray-400">
          <Loader2 className="h-10 w-10 animate-spin" />
          <h3 className="text-xl font-medium">Fetching profile data...</h3>
          <p className="text-sm text-center max-w-md">
            This could take up to 3 minutes. The page will update automatically when ready.
          </p>
        </div>
      </div>
    );
  }

  if (scrapeError) {
    return (
      <div className="container mx-auto max-w-6xl p-4 py-8">
        <div className="mb-8">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/dashboard")}
            className="border-gray-200 mb-4 sm:mb-6 text-xs sm:text-sm h-8 sm:h-9"
          >
            <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
            Back to Dashboard
          </Button>
        </div>

        <div className="flex flex-col items-center justify-center gap-4 py-6 sm:py-10 mb-4 sm:mb-6 bg-white border border-dashed border-red-100 rounded-lg shadow-sm">
          <div className="rounded-full bg-red-50 p-4 sm:p-6">
            <AlertCircle className="h-8 w-8 sm:h-10 sm:w-10 text-red-500" />
          </div>
          <h2 className="text-lg sm:text-xl font-semibold text-red-600">Profile Data Fetch Failed</h2>
          <p className="text-gray-700 max-w-md text-center text-sm sm:text-base px-4 sm:px-0">
            {scrapeError}
          </p>
          <Button 
            variant="outline"
            onClick={() => router.push("/dashboard")}
          >
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">
          Profile not found or analysis not yet complete
        </div>
      </div>
    );
  }

  console.log(profileData?.scraped_at);

  return (
    <div className="container mx-auto max-w-6xl p-4 py-6 sm:py-8">
      <div className="mb-4 sm:mb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/dashboard")}
          className="border-gray-200 mb-4 sm:mb-6 text-xs sm:text-sm h-8 sm:h-9"
        >
          <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
          Back to Dashboard
        </Button>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 sm:gap-6 bg-white rounded-lg border border-gray-100 shadow-sm p-4 sm:p-6">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="flex h-10 w-10 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-full bg-gray-100">
              {profile.platform === "instagram" ? (
                <Instagram className="h-5 w-5 sm:h-7 sm:w-7 text-gray-700" />
              ) : (
                <Linkedin className="h-5 w-5 sm:h-7 sm:w-7 text-gray-700" />
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">{displayUsername}</h1>
                <Badge
                  variant="outline"
                  className="bg-gray-50 text-gray-700 border-gray-200 text-xs"
                >
                  {profile.platform === "instagram" ? "Instagram" : "LinkedIn"}
                </Badge>
              </div>
              <p className="text-gray-500 mt-1 flex items-center gap-1 text-xs sm:text-sm">
                <CalendarClock className="h-3 w-3 sm:h-4 sm:w-4" />
                Last updated{" "}
                {profileData?.scraped_at
                  ? formatTimeAgo(profileData.scraped_at)
                  : "Never"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-2 md:mt-0">
            <Button
              variant="outline"
              size="sm"
              className="gap-1 sm:gap-2 border-gray-200 text-xs sm:text-sm h-8 sm:h-9"
              onClick={generateStats}
              disabled={generatingStats}
            >
              {generatingStats ? (
                <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4" />
              )}
              Refresh Analysis
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1 sm:gap-2 border-gray-200 text-xs sm:text-sm h-8 sm:h-9"
              onClick={() => setShowRawJson(!showRawJson)}
            >
              <Code className="h-3 w-3 sm:h-4 sm:w-4" />
              {showRawJson ? "Hide" : "Show"} Raw Data
            </Button>
            <Button 
              className="gap-1 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9" 
              onClick={() => router.push(`/chat/${id}`)}
            >
              <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4" />
              Chat About Profile
            </Button>
          </div>
        </div>
      </div>

      {generatingStats && (
        <div className="flex flex-col items-center justify-center gap-4 py-6 sm:py-10 mb-4 sm:mb-6 bg-white border border-dashed border-gray-100 rounded-lg shadow-sm">
          <div className="rounded-full bg-gray-50 p-4 sm:p-6">
            <Loader2 className="h-8 w-8 sm:h-10 sm:w-10 animate-spin text-gray-500" />
          </div>
          <h2 className="text-lg sm:text-xl font-semibold">Generating Profile Insights</h2>
          <p className="text-gray-500 max-w-md text-center text-sm sm:text-base px-4 sm:px-0">
            We're analyzing this profile data to generate comprehensive
            insights. This usually takes 30-60 seconds to complete.
          </p>
          <p className="text-gray-400 text-xs sm:text-sm max-w-md text-center">
            Please don't leave this page while the analysis is running.
          </p>
        </div>
      )}

      {showRawJson && (
        <Card className="mb-6 sm:mb-8 border border-gray-100 shadow-sm">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 sm:p-6">
            <div>
              <CardTitle className="text-base sm:text-lg">Raw JSON Data</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Complete scraped data for analysis
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={copyToClipboard} className="mt-2 sm:mt-0 self-end sm:self-auto">
              {copied ? (
                <Check className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              ) : (
                <Copy className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              )}
              {copied ? "Copied" : "Copy"}
            </Button>
          </CardHeader>
          <CardContent className="p-0 sm:p-4">
            <div className="bg-gray-50 p-3 sm:p-4 rounded-none sm:rounded-md overflow-auto max-h-60 sm:max-h-96 text-[10px] sm:text-xs">
              <pre className="text-gray-800">
                {JSON.stringify(profileData?.raw_data || {}, null, 2)}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}

      {formattedStats && (
        <Tabs defaultValue="overview" className="w-full">
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <TabsList className="mb-4 sm:mb-6 flex w-max min-w-full p-1 bg-gray-50 rounded-md">
              <TabsTrigger value="overview" className="rounded-sm text-xs sm:text-sm py-1.5 sm:py-2 flex-1 whitespace-nowrap">Overview</TabsTrigger>
              <TabsTrigger value="performance" className="rounded-sm text-xs sm:text-sm py-1.5 sm:py-2 flex-1 whitespace-nowrap">
                {isInstagramProfile(profile?.platform) ? 'Content & Engagement' : getPlatformSpecificUI?.tabs.performance || 'Professional Content'}
              </TabsTrigger>
              <TabsTrigger value="recommendations" className="rounded-sm text-xs sm:text-sm py-1.5 sm:py-2 flex-1 whitespace-nowrap">Recommendations</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview">
            {isInstagramProfile(profile?.platform) ? (
              renderInstagramContent()
            ) : (
              <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2">
                {/* Audience Metrics */}
                <Card className="border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader className="bg-gray-50/50 p-4 sm:p-6">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <Users className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
                      {getPlatformSpecificUI?.metrics.audience.title || "Audience Metrics"}
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      {getPlatformSpecificUI?.metrics.audience.description || "Follower demographics and audience insights"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4 sm:pt-6 p-4 sm:p-6">
                    {formattedStats.audienceMetrics ? (
                      <div className="space-y-3 sm:space-y-4">
                        {Object.entries(formattedStats.audienceMetrics).map(
                          ([key, value]) => {
                            if (Array.isArray(value)) {
                              return (
                                <div key={key} className="space-y-1 sm:space-y-2">
                                  <h4 className="font-medium text-gray-900 text-sm sm:text-base">
                                    {key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())}
                                  </h4>
                                  <ul className="list-disc pl-5 space-y-0.5 sm:space-y-1">
                                    {value.map((item, i) => (
                                      <li key={i} className="text-gray-600 text-xs sm:text-sm">{item}</li>
                                    ))}
                                  </ul>
                                </div>
                              );
                            }
                            
                            return (
                              <div key={key} className="border-b border-gray-100 pb-2 sm:pb-3 last:border-0 last:pb-0">
                                <h4 className="font-medium text-gray-900 mb-0.5 sm:mb-1 text-sm sm:text-base">
                                  {key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())}
                                </h4>
                                <p className="text-gray-600 text-xs sm:text-sm">{value as string}</p>
                              </div>
                            );
                          }
                        )}
                      </div>
                    ) : (
                      <div className="py-6 sm:py-8 text-center text-gray-500">
                        <BarChart3 className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-2 sm:mb-4 text-gray-300" />
                        <p className="text-sm sm:text-base">No audience metrics available</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Engagement Insights */}
                <Card className="border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader className="bg-gray-50/50 p-4 sm:p-6">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <Heart className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
                      {profile?.platform === 'instagram' ? "Engagement Insights" : "Professional Engagement"}
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      {profile?.platform === 'instagram' 
                        ? "How audiences interact with content" 
                        : "How professionals interact with your content"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4 sm:pt-6 p-4 sm:p-6">
                    {formattedStats.engagementInsights ? (
                      <div className="space-y-4">
                        {Object.entries(formattedStats.engagementInsights).map(
                          ([key, value]) => {
                            if (Array.isArray(value)) {
                              return (
                                <div key={key} className="space-y-2">
                                  <h4 className="font-medium text-gray-900">
                                    {key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())}
                                  </h4>
                                  <ul className="list-disc pl-5 space-y-1">
                                    {value.map((item, i) => (
                                      <li key={i} className="text-gray-600 text-sm">{item}</li>
                                    ))}
                                  </ul>
                                </div>
                              );
                            }
                            
                            return (
                              <div key={key} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                                <h4 className="font-medium text-gray-900 mb-1">
                                  {key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())}
                                </h4>
                                <p className="text-gray-600 text-sm">{value as string}</p>
                              </div>
                            );
                          }
                        )}
                      </div>
                    ) : (
                      <div className="py-8 text-center text-gray-500">
                        <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>No engagement insights available</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="performance">
            <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2">
              {/* Content Performance */}
              <Card className="border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="bg-gray-50/50 p-4 sm:p-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
                    {getPlatformSpecificUI?.metrics.content.title || "Content Performance"}
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    {getPlatformSpecificUI?.metrics.content.description || "Analysis of post effectiveness"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4 sm:pt-6 p-4 sm:p-6">
                  {formattedStats.contentPerformance ? (
                    <div className="space-y-4">
                      {Object.entries(formattedStats.contentPerformance).map(
                        ([key, value]) => {
                          if (Array.isArray(value)) {
                            return (
                              <div key={key} className="space-y-2">
                                <h4 className="font-medium text-gray-900">
                                  {key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())}
                                </h4>
                                <ul className="list-disc pl-5 space-y-1">
                                  {value.map((item, i) => (
                                    <li key={i} className="text-gray-600 text-sm">{item}</li>
                                  ))}
                                </ul>
                              </div>
                            );
                          }
                          
                          return (
                            <div key={key} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                              <h4 className="font-medium text-gray-900 mb-1">
                                {key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())}
                              </h4>
                              <p className="text-gray-600 text-sm">{value as string}</p>
                            </div>
                          );
                        }
                      )}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-gray-500">
                      <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>No content performance data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Visual Analysis / Career & Skills */}
              <Card className="border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="bg-gray-50/50 p-4 sm:p-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <LineChart className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
                    {isInstagramProfile(profile?.platform) ? 'Visual Analysis' : getPlatformSpecificUI?.metrics?.visual?.title || 'Career & Skills'}
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    {isInstagramProfile(profile?.platform) ? 'Visual themes and aesthetic consistency' : getPlatformSpecificUI?.metrics?.visual?.description || 'Professional trajectory and expertise'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4 sm:pt-6 p-4 sm:p-6">
                  {(formattedStats.competitiveAnalysis || 
                    (profile?.platform === 'linkedin' && formattedStats.careerAndSkills)) ? (
                    <div className="space-y-4">
                      {Object.entries(profile?.platform === 'linkedin' 
                        ? (formattedStats.careerAndSkills || formattedStats.competitiveAnalysis || {})
                        : (formattedStats.competitiveAnalysis || {})
                      ).map(
                        ([key, value]) => {
                          if (Array.isArray(value)) {
                            return (
                              <div key={key} className="space-y-2">
                                <h4 className="font-medium text-gray-900">
                                  {key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())}
                                </h4>
                                <ul className="list-disc pl-5 space-y-1">
                                  {value.map((item, i) => (
                                    <li key={i} className="text-gray-600 text-sm">{item}</li>
                                  ))}
                                </ul>
                              </div>
                            );
                          }
                          
                          return (
                            <div key={key} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                              <h4 className="font-medium text-gray-900 mb-1">
                                {key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())}
                              </h4>
                              <p className="text-gray-600 text-sm">{value as string}</p>
                            </div>
                          );
                        }
                      )}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-gray-500">
                      <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>No {profile?.platform === 'linkedin' ? 'career and skills' : 'competitive analysis'} available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="recommendations">
            <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2">
              {/* Growth Opportunities */}
              <Card className="border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="bg-gray-50/50 p-4 sm:p-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
                    {getPlatformSpecificUI?.metrics.growth.title || "Growth Opportunities"}
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    {getPlatformSpecificUI?.metrics.growth.description || "Areas to improve performance"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4 sm:pt-6 p-4 sm:p-6">
                  {formattedStats.growthOpportunities ? (
                    <div className="space-y-4">
                      {Object.entries(formattedStats.growthOpportunities).map(
                        ([key, value]) => {
                          if (Array.isArray(value)) {
                            return (
                              <div key={key} className="space-y-2">
                                <h4 className="font-medium text-gray-900">
                                  {key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())}
                                </h4>
                                <ul className="list-disc pl-5 space-y-1">
                                  {value.map((item, i) => (
                                    <li key={i} className="text-gray-600 text-sm">{item}</li>
                                  ))}
                                </ul>
                              </div>
                            );
                          }
                          
                          return (
                            <div key={key} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                              <h4 className="font-medium text-gray-900 mb-1">
                                {key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())}
                              </h4>
                              <p className="text-gray-600 text-sm">{value as string}</p>
                            </div>
                          );
                        }
                      )}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-gray-500">
                      <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>No growth opportunities available</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Key Takeaways */}
              <Card className="border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="bg-gray-50/50 p-4 sm:p-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Lightbulb className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
                    Key Takeaways
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    {profile?.platform === 'instagram' 
                      ? "Most important content and engagement insights" 
                      : "Most valuable professional development insights"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4 sm:pt-6 p-4 sm:p-6">
                  {formattedStats.keyTakeaways ? (
                    <div className="space-y-4">
                      {Array.isArray(formattedStats.keyTakeaways) ? (
                        <ul className="list-disc pl-5 space-y-2">
                          {formattedStats.keyTakeaways.map((takeaway: string, i: number) => (
                            <li key={i} className="text-gray-600">{takeaway}</li>
                          ))}
                        </ul>
                      ) : (
                        Object.entries(formattedStats.keyTakeaways).map(
                          ([key, value]) => {
                            if (Array.isArray(value)) {
                              return (
                                <div key={key} className="space-y-2">
                                  <h4 className="font-medium text-gray-900">
                                    {key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())}
                                  </h4>
                                  <ul className="list-disc pl-5 space-y-1">
                                    {value.map((item, i) => (
                                      <li key={i} className="text-gray-600 text-sm">{item}</li>
                                    ))}
                                  </ul>
                                </div>
                              );
                            }
                            
                            return (
                              <div key={key} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                                <h4 className="font-medium text-gray-900 mb-1">
                                  {key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())}
                                </h4>
                                <p className="text-gray-600 text-sm">{value as string}</p>
                              </div>
                            );
                          }
                        )
                      )}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-gray-500">
                      <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>No key takeaways available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      )}

      {!formattedStats && !generatingStats && (
        <div className="flex flex-col items-center justify-center gap-4 sm:gap-6 py-10 sm:py-16 bg-white border border-dashed border-gray-100 rounded-lg shadow-sm">
          <div className="rounded-full bg-gray-50 p-4 sm:p-6">
            <BarChart3 className="h-8 w-8 sm:h-10 sm:w-10 text-gray-500" />
          </div>
          <div className="text-center px-4 sm:px-0">
            <h2 className="text-xl sm:text-2xl font-semibold mb-2">No Profile Analysis Available</h2>
            <p className="text-gray-500 max-w-md mx-auto text-sm sm:text-base">
              Generate AI insights for this profile to see detailed audience metrics, 
              engagement analysis, and performance data.
            </p>
          </div>
          <Button 
            className="mt-1 sm:mt-2" 
            size="lg"
            onClick={generateStats}
          >
            <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
            Generate Profile Insights
          </Button>
        </div>
      )}
    </div>
  );
}
