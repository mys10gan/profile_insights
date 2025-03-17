'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/use-toast'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useSupabase } from '@/components/providers/supabase-provider'
import { Skeleton } from '@/components/ui/skeleton'
import { Loader2, Instagram, Linkedin, User, Calendar, Clock, TrendingUp, Edit, Trash2, BarChart, MessageSquare } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"

interface Profile {
  id: string
  platform: 'instagram' | 'linkedin'
  username: string
  last_scraped: string
}

interface ProfileStats {
  [key: string]: {
    followers?: number;
    posts?: number;
    engagement?: string;
    connections?: string;
    skills?: number;
    experience?: number;
    loading: boolean;
  }
}

export default function Dashboard() {
  const [platform, setPlatform] = useState<'instagram' | 'linkedin'>('instagram')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [scrapingStage, setScrapingStage] = useState<string | null>(null)
  const [scrapingProgress, setScrapingProgress] = useState(0)
  const [recentProfiles, setRecentProfiles] = useState<Profile[]>([])
  const [loadingProfiles, setLoadingProfiles] = useState(true)
  const [deleteProfileId, setDeleteProfileId] = useState<string | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [profileStats, setProfileStats] = useState<ProfileStats>({})
  const [dashboardStats, setDashboardStats] = useState({
    totalProfiles: 0,
    instagramProfiles: 0,
    linkedinProfiles: 0,
    lastAnalyzed: null as string | null
  })
  const { toast } = useToast()
  const router = useRouter()
  const { user } = useSupabase()

  useEffect(() => {
    if (!user) {
      router.push('/')
      return
    }

    const fetchRecentProfiles = async () => {
      setLoadingProfiles(true)
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .order('last_scraped', { ascending: false })
          .limit(10)

        if (error) {
          console.error('Error fetching profiles:', error)
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to load recent profiles.",
          })
          return
        }
        setRecentProfiles(data || [])
        
        if (data) {
          const stats = {
            totalProfiles: data.length,
            instagramProfiles: data.filter(p => p.platform === 'instagram').length,
            linkedinProfiles: data.filter(p => p.platform === 'linkedin').length,
            lastAnalyzed: data.length > 0 ? data[0].last_scraped : null
          }
          setDashboardStats(stats)
        }
      } catch (error) {
        console.error('Error fetching profiles:', error)
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load recent profiles.",
        })
      } finally {
        setLoadingProfiles(false)
      }
    }

    fetchRecentProfiles()
  }, [user, router, toast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setScrapingStage('Initializing profile...')
    setScrapingProgress(10)

    try {
      // First, check if the profile already exists
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id || '')
        .eq('platform', platform)
        .eq('username', username)
        .single()

      let profileId;

      if (existingProfile) {
        // Profile already exists, use it
        profileId = existingProfile.id;
        console.log('Using existing profile:', profileId);
        setScrapingProgress(20);
      } else if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "not found" error
        // An actual error occurred
        console.error('Error fetching profile:', fetchError)
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to check if profile exists.",
        })
        return
      } else {
        // Profile doesn't exist, create a new one
        setScrapingStage('Creating profile...')
        setScrapingProgress(15);
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert([{
            user_id: user?.id,
            platform,
            username
          }])
          .select()
          .single()

        if (insertError) {
          // If it's a unique constraint violation, try to fetch the existing profile
          if (insertError.code === '23505') {
            const { data: conflictProfile, error: conflictError } = await supabase
              .from('profiles')
              .select('id')
              .eq('user_id', user?.id || '')
              .eq('platform', platform)
              .eq('username', username)
              .single()
            
            if (conflictProfile) {
              profileId = conflictProfile.id;
              console.log('Using existing profile after conflict:', profileId);
              setScrapingProgress(20);
            } else {
              console.error('Error with conflict resolution:', conflictError || insertError)
              toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to create profile.",
              })
              return
            }
          } else {
            console.error('Error inserting profile:', insertError)
            toast({
              variant: "destructive",
              title: "Error",
              description: "Failed to create profile.",
            })
            return
          }
        } else if (newProfile) {
          profileId = newProfile.id;
          console.log('Created new profile:', profileId);
          setScrapingProgress(20);
        } else {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to create profile: No profile data returned.",
          })
          return
        }
      }

      // Call Apify to scrape the profile
      setScrapingStage('Scraping profile data...')
      setScrapingProgress(30)
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          platform,
          username,
          profileId
        }),
      })

      setScrapingStage('Processing results...')
      setScrapingProgress(70)
      const responseData = await response.json();
      
      if (!response.ok) {
        console.error('API error response:', responseData);
        toast({
          variant: "destructive",
          title: "Error",
          description: responseData.error || 'Failed to scrape profile',
        })
        return
      }

      setScrapingProgress(90)
      setScrapingStage('Finalizing analysis...')

      toast({
        title: "Success!",
        description: `Profile analysis complete. Retrieved ${responseData.dataCount || 0} items.`,
      })

      // Show a more detailed success toast with metrics
      if (responseData.metrics) {
        const metrics = responseData.metrics;
        const metricsList = platform === 'instagram'
          ? `Followers: ${metrics.followers} | Posts: ${metrics.posts} | Engagement: ${metrics.engagementRate}`
          : `Connections: ${metrics.connections} | Posts: ${metrics.posts} | Skills: ${metrics.skills}`;
        
        toast({
          title: "Analysis Details",
          description: metricsList,
          variant: "default"
        });
      }

      // Refresh the profile list
      const { data: updatedProfiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id || '')
        .order('last_scraped', { ascending: false })
        .limit(10)

      if (profilesError) {
        console.error('Error refreshing profiles:', profilesError)
      } else {
        setRecentProfiles(updatedProfiles || [])
      }

      router.push(`/analysis/${profileId}`)
    } catch (error) {
      console.error('Error:', error);
      
      // Extract the most useful error message
      let errorMessage = "Something went wrong. Please try again.";
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Try to extract more detailed error from Apify error format
        if (error.message.includes('Apify API error')) {
          try {
            // Find the JSON part of the error message
            const startIndex = error.message.indexOf('{');
            const endIndex = error.message.lastIndexOf('}') + 1;
            
            if (startIndex !== -1 && endIndex !== -1) {
              const jsonStr = error.message.substring(startIndex, endIndex);
              const errorJson = JSON.parse(jsonStr);
              
              if (errorJson.error && errorJson.error.message) {
                errorMessage = `Apify error: ${errorJson.error.message}`;
              }
            }
          } catch (e) {
            console.error('Error parsing API error:', e);
          }
        }
      }
      
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      })
    } finally {
      setLoading(false)
      setScrapingStage(null)
      setScrapingProgress(0)
    }
  }

  const handleDeleteProfile = async (id: string) => {
    try {
      // Delete profile data first (foreign key constraint)
      const { error: dataError } = await supabase
        .from('profile_data')
        .delete()
        .eq('profile_id', id)

      if (dataError) {
        console.error('Error deleting profile data:', dataError)
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to delete profile data.",
        })
        return
      }

      // Delete any conversations related to this profile
      const { data: conversations, error: convError } = await supabase
        .from('conversations')
        .select('id')
        .eq('profile_id', id)
      
      if (convError) {
        console.error('Error fetching conversations:', convError)
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to fetch conversations associated with this profile.",
        })
        return
      }

      if (conversations && conversations.length > 0) {
        // Delete messages in those conversations
        for (const conv of conversations) {
          const { error: messagesError } = await supabase
            .from('messages')
            .delete()
            .eq('conversation_id', conv.id)
          
          if (messagesError) {
            console.error('Error deleting messages:', messagesError)
            toast({
              variant: "destructive",
              title: "Error",
              description: "Failed to delete some messages.",
            })
            // Continue with deletion attempt
          }
        }

        // Delete the conversations
        const { error: deleteConvError } = await supabase
          .from('conversations')
          .delete()
          .eq('profile_id', id)
        
        if (deleteConvError) {
          console.error('Error deleting conversations:', deleteConvError)
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to delete conversations.",
          })
          return
        }
      }

      // Delete the profile
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id)
        .eq('user_id', user?.id || '') // Safety check to ensure users can only delete their own profiles

      if (profileError) {
        console.error('Error deleting profile:', profileError)
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to delete the profile.",
        })
        return
      }

      // Update the profile list
      setRecentProfiles(prevProfiles => prevProfiles.filter(profile => profile.id !== id))

      toast({
        title: "Profile deleted",
        description: "The profile and all associated data have been removed."
      })
    } catch (error) {
      console.error('Error deleting profile:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete profile."
      })
    } finally {
      setIsDeleteDialogOpen(false)
      setDeleteProfileId(null)
    }
  }

  // Function to fetch profile stats for hover card
  const fetchProfileStats = async (profileId: string) => {
    if (profileStats[profileId] && !profileStats[profileId].loading) {
      return; // Already loaded
    }
    
    // Initialize or mark as loading
    setProfileStats(prev => ({
      ...prev,
      [profileId]: { ...prev[profileId], loading: true }
    }));
    
    try {
      const { data, error } = await supabase
        .from('profile_data')
        .select('platform_specific_data')
        .eq('profile_id', profileId)
        .single();
      
      if (error) {
        console.error('Error fetching profile stats:', error);
        return;
      }
      
      const platformData = data?.platform_specific_data;
      const profile = recentProfiles.find(p => p.id === profileId);
      
      if (platformData && profile) {
        if (profile.platform === 'instagram') {
          setProfileStats(prev => ({
            ...prev,
            [profileId]: {
              loading: false,
              followers: platformData.followersCount || 0,
              posts: platformData.postsCount || 0,
              engagement: platformData.engagementRate ? 
                `${platformData.engagementRate.toFixed(2)}%` : '0%'
            }
          }));
        } else {
          setProfileStats(prev => ({
            ...prev,
            [profileId]: {
              loading: false,
              connections: platformData.connectionsCount || 'N/A',
              posts: platformData.posts?.length || 0,
              skills: platformData.skills?.length || 0,
              experience: platformData.experience?.length || 0
            }
          }));
        }
      }
    } catch (error) {
      console.error('Error processing profile stats:', error);
    }
  };

  return (
    <div className="container mx-auto max-w-6xl p-4 py-8">
      <h1 className="text-3xl font-bold">Profile Insights</h1>

      {!loadingProfiles && recentProfiles.length > 0 && (
        <div className="mt-8 mb-8 grid grid-cols-1 gap-4 md:grid-cols-4">
          <Card className="border border-gray-100 shadow-sm">
            <CardContent className="flex flex-col items-center justify-center p-6">
              <div className="mb-4 text-3xl font-bold">{dashboardStats.totalProfiles}</div>
              <p className="text-sm text-gray-500">Total Profiles</p>
            </CardContent>
          </Card>
          
          <Card className="border border-gray-100 shadow-sm">
            <CardContent className="flex flex-col items-center justify-center p-6">
              <div className="mb-4 text-3xl font-bold">{dashboardStats.instagramProfiles}</div>
              <p className="text-sm text-gray-500">Instagram Profiles</p>
            </CardContent>
          </Card>
          
          <Card className="border border-gray-100 shadow-sm">
            <CardContent className="flex flex-col items-center justify-center p-6">
              <div className="mb-4 text-3xl font-bold">{dashboardStats.linkedinProfiles}</div>
              <p className="text-sm text-gray-500">LinkedIn Profiles</p>
            </CardContent>
          </Card>
          
          <Card className="border border-gray-100 shadow-sm">
            <CardContent className="flex flex-col items-center justify-center p-6">
              <div className="text-sm text-gray-500">
                {dashboardStats.lastAnalyzed 
                  ? `No recent analysis` 
                  : 'Recent Activity'}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="mt-8">
        <Tabs defaultValue="new" className="w-full">
          <TabsList className="mb-6 grid w-full grid-cols-2">
            <TabsTrigger value="new">Create New Analysis</TabsTrigger>
            <TabsTrigger value="recent">Recent Profiles</TabsTrigger>
          </TabsList>
          
          <TabsContent value="new" className="space-y-6">
            <Card className="border border-gray-100 shadow-sm">
              <CardHeader>
                <CardTitle>Analyze a Social Media Profile</CardTitle>
                <CardDescription>
                  Enter the details of the profile you want to analyze for insights
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-8 flex gap-4">
                  <Button
                    onClick={() => setPlatform('instagram')}
                    disabled={loading}
                    variant={platform === 'instagram' ? 'default' : 'outline'}
                    className="flex-1 gap-2"
                  >
                    <Instagram className="h-4 w-4" />
                    Instagram
                  </Button>
                  <Button
                    onClick={() => setPlatform('linkedin')}
                    disabled={loading}
                    variant={platform === 'linkedin' ? 'default' : 'outline'}
                    className="flex-1 gap-2"
                  >
                    <Linkedin className="h-4 w-4" />
                    LinkedIn
                  </Button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">
                      {platform === 'instagram' ? 'Instagram Username' : 'LinkedIn Profile URL'}
                    </Label>
                    <Input
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder={platform === 'instagram' ? '@username' : 'https://linkedin.com/in/username'}
                      required
                      disabled={loading}
                      className="border-gray-200"
                    />
                  </div>

                  <Button 
                    type="submit"
                    disabled={loading}
                    className="w-full"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {scrapingStage || 'Processing...'}
                      </span>
                    ) : (
                      'Start Analysis'
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {loading && (
              <Card className="border border-gray-100 shadow-sm">
                <CardHeader>
                  <CardTitle>Analysis in Progress</CardTitle>
                  <CardDescription>
                    Please wait while we analyze the profile
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-[250px]" />
                      <Skeleton className="h-4 w-[200px]" />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{scrapingStage || 'Processing...'}</span>
                      <span>{scrapingProgress}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                      <div 
                        className="h-full bg-black transition-all duration-500 ease-in-out" 
                        style={{ width: `${scrapingProgress}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <div className="grid grid-cols-2 gap-4">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="recent">
            <Card className="border border-gray-100 shadow-sm">
              <CardHeader>
                <CardTitle>Recent Analyses</CardTitle>
                <CardDescription>
                  View and manage your previously analyzed profiles
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingProfiles ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center space-x-4">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-[250px]" />
                          <Skeleton className="h-4 w-[200px]" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : recentProfiles.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <User className="h-12 w-12 text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium">No profiles analyzed yet</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Start by analyzing a profile in the "Create New Analysis" tab
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentProfiles.map((profile) => (
                      <div 
                        key={profile.id}
                        className="relative flex flex-col md:flex-row md:items-start space-y-3 md:space-y-0 md:space-x-4 rounded-lg border border-gray-100 p-4 transition-colors hover:bg-gray-50"
                      >
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-100">
                          {profile.platform === 'instagram' ? (
                            <Instagram className="h-6 w-6 text-gray-700" />
                          ) : (
                            <Linkedin className="h-6 w-6 text-gray-700" />
                          )}
                        </div>
                        
                        <div className="min-w-0 flex-1">
                          <div className="text-lg font-medium">
                            {profile.username}
                          </div>
                          <div className="mt-1 flex items-center gap-x-1.5 text-sm text-gray-500">
                            <Calendar className="h-4 w-4 flex-none" />
                            <span>
                              {profile.last_scraped 
                                ? `Last updated ${formatDistanceToNow(new Date(profile.last_scraped), { addSuffix: true })}` 
                                : 'Not yet analyzed'}
                            </span>
                          </div>
                          
                          <div className="mt-2">
                            <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                              {profile.platform === 'instagram' ? 'Instagram' : 'LinkedIn'}
                            </Badge>
                            
                            <HoverCard>
                              <HoverCardTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="ml-2 h-6 px-2 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                                  onClick={() => fetchProfileStats(profile.id)}
                                >
                                  Preview Stats
                                </Button>
                              </HoverCardTrigger>
                              <HoverCardContent className="w-80 border border-gray-100 shadow-sm">
                                <div className="space-y-2">
                                  <h4 className="text-sm font-semibold">{profile.username}</h4>
                                  <div className="grid grid-cols-2 gap-2 text-xs">
                                    {profile.platform === 'instagram' ? (
                                      <>
                                        <div className="flex items-center gap-1">
                                          <User className="h-3 w-3 text-gray-600" />
                                          <span className="font-medium text-gray-700">Followers:</span> 
                                          <span className="text-gray-600">
                                            {profileStats[profile.id]?.loading ? 
                                              'Loading...' : 
                                              profileStats[profile.id]?.followers?.toLocaleString() || 'N/A'}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <BarChart className="h-3 w-3 text-gray-600" />
                                          <span className="font-medium text-gray-700">Posts:</span> 
                                          <span className="text-gray-600">
                                            {profileStats[profile.id]?.loading ? 
                                              'Loading...' : 
                                              profileStats[profile.id]?.posts?.toLocaleString() || 'N/A'}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <TrendingUp className="h-3 w-3 text-gray-600" />
                                          <span className="font-medium text-gray-700">Engagement:</span> 
                                          <span className="text-gray-600">
                                            {profileStats[profile.id]?.loading ? 
                                              'Loading...' : 
                                              profileStats[profile.id]?.engagement || 'N/A'}
                                          </span>
                                        </div>
                                      </>
                                    ) : (
                                      <>
                                        <div className="flex items-center gap-1">
                                          <User className="h-3 w-3 text-gray-600" />
                                          <span className="font-medium text-gray-700">Connections:</span> 
                                          <span className="text-gray-600">
                                            {profileStats[profile.id]?.loading ? 
                                              'Loading...' : 
                                              profileStats[profile.id]?.connections || 'N/A'}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <BarChart className="h-3 w-3 text-gray-600" />
                                          <span className="font-medium text-gray-700">Posts:</span> 
                                          <span className="text-gray-600">
                                            {profileStats[profile.id]?.loading ? 
                                              'Loading...' : 
                                              profileStats[profile.id]?.posts?.toLocaleString() || 'N/A'}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <TrendingUp className="h-3 w-3 text-gray-600" />
                                          <span className="font-medium text-gray-700">Skills:</span> 
                                          <span className="text-gray-600">
                                            {profileStats[profile.id]?.loading ? 
                                              'Loading...' : 
                                              profileStats[profile.id]?.skills?.toLocaleString() || 'N/A'}
                                          </span>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => router.push(`/analysis/${profile.id}`)}
                                    className="w-full mt-2 border-gray-200 text-gray-700 hover:bg-gray-50"
                                  >
                                    View Full Analysis
                                  </Button>
                                </div>
                              </HoverCardContent>
                            </HoverCard>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 md:justify-end">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => router.push(`/analysis/${profile.id}`)}
                            className="gap-1.5 border-gray-200 text-gray-700 hover:bg-gray-50"
                          >
                            <TrendingUp className="h-4 w-4" />
                            View Analysis
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => router.push(`/chat/${profile.id}`)}
                            className="gap-1.5 border-gray-200 text-gray-700 hover:bg-gray-50"
                          >
                            <MessageSquare className="h-4 w-4" />
                            Chat
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-gray-700 border-gray-200 hover:bg-gray-50"
                            onClick={() => {
                              setDeleteProfileId(profile.id);
                              setIsDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-1.5" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="border border-gray-100 shadow-sm">
          <DialogHeader>
            <DialogTitle>Delete Profile</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this profile? This will remove all analysis data and chat history associated with this profile.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} className="border-gray-200 text-gray-700 hover:bg-gray-50">
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => deleteProfileId && handleDeleteProfile(deleteProfileId)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 