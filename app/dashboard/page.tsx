'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/use-toast'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useSupabase } from '@/components/providers/supabase-provider'
import { Skeleton } from '@/components/ui/skeleton'
import { Loader2, Instagram, Linkedin, User, Calendar, Clock, TrendingUp, Edit, Trash2, BarChart, MessageSquare, Search, PlusCircle, ChevronRight, LayoutDashboard, LogOut, ChevronDown } from 'lucide-react'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

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

// CSS for progress animation
const progressAnimation = `
@keyframes progress {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}
`;

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
  const [isDeletingProfile, setIsDeletingProfile] = useState(false)
  const [deleteProgress, setDeleteProgress] = useState<string | null>(null)
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
  const [showAllProfiles, setShowAllProfiles] = useState(false)

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
    setIsDeletingProfile(true)
    setDeleteProgress('Preparing to delete profile data...')
    
    try {
      // Delete profile data first (foreign key constraint)
      setDeleteProgress('Deleting profile data...')
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
      setDeleteProgress('Finding related conversations...')
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
        setDeleteProgress(`Deleting ${conversations.length} conversation(s) and messages...`)
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
      setDeleteProgress('Removing profile...')
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
      
      // Update dashboard stats
      const updatedProfiles = recentProfiles.filter(profile => profile.id !== id)
      setDashboardStats({
        totalProfiles: updatedProfiles.length,
        instagramProfiles: updatedProfiles.filter(p => p.platform === 'instagram').length,
        linkedinProfiles: updatedProfiles.filter(p => p.platform === 'linkedin').length,
        lastAnalyzed: updatedProfiles.length > 0 ? updatedProfiles[0].last_scraped : null
      })

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
      setIsDeletingProfile(false)
      setDeleteProgress(null)
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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto max-w-6xl p-4 py-8">
        <div className="flex justify-between items-center mb-10 flex-col sm:flex-row gap-4 sm:gap-0">
          <header className="text-left w-full sm:w-auto">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2 text-center sm:text-left">Profile Insights</h1>
            <p className="text-gray-500 max-w-2xl text-center sm:text-left">Analyze social media profiles to gain insights, understand engagement patterns, and discover growth opportunities.</p>
          </header>
          {user && (
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="rounded-full h-10 px-3 flex items-center gap-2 border-gray-200">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={`https://api.dicebear.com/6.x/initials/svg?seed=${user.email}`} alt={user.email || ""} />
                      <AvatarFallback className="text-xs">{user.email?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-sm hidden sm:inline max-w-[150px] truncate">{user.email}</span>
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-xl p-2">
                  <DropdownMenuLabel className="font-normal text-xs text-gray-500">
                    Logged in as
                  </DropdownMenuLabel>
                  <DropdownMenuItem className="rounded-lg">
                    <span className="font-medium truncate">{user.email}</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="my-1" />
                  <DropdownMenuItem 
                    className="text-red-600 cursor-pointer rounded-lg flex items-center gap-2"
                    onClick={async () => {
                      await supabase.auth.signOut();
                      router.push('/');
                    }}
                  >
                    <LogOut className="h-4 w-4" />
                    Log Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        <div className="space-y-8 md:space-y-12">
          <Card className="bg-white border-none shadow-sm overflow-hidden max-w-full md:max-w-2xl mx-auto">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-white text-center p-4 sm:p-6">
              <CardTitle className="text-xl sm:text-2xl">Analyze a Profile</CardTitle>
              <CardDescription className="text-sm sm:text-base">
                Enter the details of the profile you want to analyze
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-sm font-medium">
                    {platform === 'instagram' ? 'Instagram Username' : 'LinkedIn Profile URL'}
                  </Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder={platform === 'instagram' ? '@username' : 'https://linkedin.com/in/username'}
                      required
                      disabled={loading}
                      className="border-gray-200 pl-10 pr-20 bg-gray-50/50 h-12"
                    />
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-1">
                      <Button
                        type="button"
                        variant={platform === 'instagram' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPlatform('instagram')}
                        disabled={loading}
                        className={`h-8 px-2 rounded-full ${platform === 'instagram' ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' : 'border-gray-200'}`}
                      >
                        <Instagram className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant={platform === 'linkedin' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPlatform('linkedin')}
                        disabled={loading}
                        className={`h-8 px-2 rounded-full ${platform === 'linkedin' ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' : 'border-gray-200'}`}
                      >
                        <Linkedin className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <Button 
                  type="submit"
                  disabled={loading}
                  className="w-full h-10 sm:h-12 bg-black hover:bg-black/90 text-white rounded-full"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {scrapingStage || 'Processing...'}
                    </span>
                  ) : (
                    <span className="flex items-center justify-center">
                      Start Analysis
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </span>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {loading && (
            <Card className="bg-white border-none shadow-sm overflow-hidden max-w-2xl mx-auto">
              <CardHeader className="text-center">
                <CardTitle>Analysis in Progress</CardTitle>
                <CardDescription>
                  Please wait while we analyze the profile
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 p-6">
                <div className="flex flex-col items-center gap-4">
                  <div className="relative h-16 w-16">
                    <div className="absolute inset-0 rounded-full animate-pulse bg-gray-200"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-t-transparent border-gray-300 animate-spin"></div>
                  </div>
                  <div className="space-y-2 w-full">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{scrapingStage || 'Processing...'}</span>
                      <span className="text-black font-bold">{scrapingProgress}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                      <div 
                        className="h-full bg-black transition-all duration-500 ease-in-out" 
                        style={{ width: `${scrapingProgress}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {!loading && !showAllProfiles && recentProfiles.length > 0 && (
            <div className="space-y-4 sm:space-y-6">
              <h2 className="text-xl sm:text-2xl font-bold text-center">Recent Profiles</h2>
              <div className="space-y-3 sm:space-y-5 max-w-full sm:max-w-4xl mx-auto px-1 sm:px-0">
                {recentProfiles.slice(0, 3).map((profile) => (
                  <div 
                    key={profile.id}
                    className="relative flex flex-col md:flex-row md:items-center md:space-y-0 rounded-xl border border-gray-100 p-4 sm:p-5 transition-all hover:bg-gray-50/70 hover:shadow-sm group"
                  >
                    <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                      <div className="h-10 w-10 sm:h-14 sm:w-14 shrink-0 flex items-center justify-center rounded-full bg-gray-100 group-hover:bg-white transition-colors">
                        {profile.platform === 'instagram' ? (
                          <Instagram className="h-5 w-5 sm:h-6 sm:w-6 text-gray-700" />
                        ) : (
                          <Linkedin className="h-5 w-5 sm:h-6 sm:w-6 text-gray-700" />
                        )}
                      </div>
                      
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base sm:text-lg font-semibold truncate">
                            {profile.username}
                          </h3>
                          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 uppercase text-xs font-semibold tracking-wider">
                            {profile.platform === 'instagram' ? 'Instagram' : 'LinkedIn'}
                          </Badge>
                        </div>
                        <div className="mt-1 flex items-center gap-x-1.5 text-xs sm:text-sm text-gray-500">
                          <Calendar className="h-3 w-3 sm:h-4 sm:w-4 flex-none" />
                          <span>
                            {profile.last_scraped 
                              ? `Last updated ${formatDistanceToNow(new Date(profile.last_scraped), { addSuffix: true })}` 
                              : 'Not yet analyzed'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2 mt-3 md:mt-0">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => router.push(`/analysis/${profile.id}`)}
                        className="h-8 gap-1.5 border-gray-200 text-gray-700 hover:bg-gray-50 rounded-full text-xs flex-1 md:flex-auto"
                      >
                        <TrendingUp className="h-3.5 w-3.5" />
                        <span className="sm:inline">Analysis</span>
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => router.push(`/chat/${profile.id}`)}
                        className="h-8 gap-1.5 border-gray-200 text-gray-700 hover:bg-gray-50 rounded-full text-xs flex-1 md:flex-auto"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span className="sm:inline">Chat</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-center">
                <Button 
                  variant="outline"
                  onClick={() => setShowAllProfiles(true)}
                  className="rounded-full border-gray-200 text-gray-700 px-4 sm:px-6 h-9 sm:h-10 text-sm"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  See All Profiles
                </Button>
              </div>
            </div>
          )}

          {!loading && showAllProfiles && (
            <Card className="bg-white border-none shadow-sm overflow-hidden max-w-full md:max-w-5xl mx-auto">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 sm:p-6">
                <div>
                  <CardTitle className="text-xl sm:text-2xl">All Profiles</CardTitle>
                  <CardDescription className="text-sm sm:text-base">
                    View and manage your previously analyzed profiles
                  </CardDescription>
                </div>
                <Button 
                  variant="outline"
                  onClick={() => setShowAllProfiles(false)}
                  className="rounded-full border-gray-200 text-gray-700 self-end sm:self-auto"
                  size="sm"
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  New Analysis
                </Button>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                {loadingProfiles ? (
                  <div className="space-y-4 sm:space-y-6">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center space-x-4 p-3 sm:p-4 rounded-xl bg-gray-50/50">
                        <Skeleton className="h-10 w-10 sm:h-14 sm:w-14 rounded-full" />
                        <div className="space-y-2 flex-1">
                          <Skeleton className="h-4 sm:h-5 w-[200px] sm:w-[250px]" />
                          <Skeleton className="h-3 sm:h-4 w-[150px] sm:w-[200px]" />
                        </div>
                        <Skeleton className="h-8 w-20 sm:w-24 rounded-md" />
                      </div>
                    ))}
                  </div>
                ) : recentProfiles.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 sm:py-16 text-center">
                    <div className="rounded-full bg-gray-100 p-4 sm:p-6 mb-4">
                      <User className="h-8 w-8 sm:h-12 sm:w-12 text-gray-400" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-medium mb-2">No profiles analyzed yet</h3>
                    <p className="text-gray-500 max-w-md text-sm sm:text-base">
                      Start by analyzing a profile to see insights and performance metrics.
                    </p>
                    <Button 
                      onClick={() => setShowAllProfiles(false)}
                      className="mt-4 sm:mt-6 bg-black hover:bg-black/90 text-white rounded-full"
                    >
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Create Your First Analysis
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                    {recentProfiles.map((profile) => (
                      <div 
                        key={profile.id}
                        className="relative flex flex-col rounded-xl border border-gray-100 p-3 sm:p-4 transition-all hover:bg-gray-50/70 hover:shadow-sm group"
                      >
                        <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                          <div className="h-8 w-8 sm:h-10 sm:w-10 shrink-0 flex items-center justify-center rounded-full bg-gray-100 group-hover:bg-white transition-colors">
                            {profile.platform === 'instagram' ? (
                              <Instagram className="h-4 w-4 sm:h-5 sm:w-5 text-gray-700" />
                            ) : (
                              <Linkedin className="h-4 w-4 sm:h-5 sm:w-5 text-gray-700" />
                            )}
                          </div>
                          
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-sm sm:text-base font-semibold truncate">
                                {profile.username}
                              </h3>
                              <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 uppercase text-[10px] sm:text-xs font-semibold tracking-wider">
                                {profile.platform === 'instagram' ? 'Instagram' : 'LinkedIn'}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-x-1.5 text-[10px] sm:text-xs text-gray-500">
                              <Calendar className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-none" />
                              <span>
                                {profile.last_scraped 
                                  ? `Updated ${formatDistanceToNow(new Date(profile.last_scraped), { addSuffix: true })}` 
                                  : 'Not yet analyzed'}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-1.5 sm:gap-2 mt-auto pt-2 sm:pt-3 border-t border-gray-100">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-7 sm:h-8 gap-1 sm:gap-1.5 border-gray-200 text-gray-700 hover:bg-gray-50 rounded-full text-[10px] sm:text-xs sm:flex-1"
                            onClick={() => fetchProfileStats(profile.id)}
                          >
                            <BarChart className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                            Stats
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => router.push(`/analysis/${profile.id}`)}
                            className="h-7 sm:h-8 gap-1 sm:gap-1.5 border-gray-200 text-gray-700 hover:bg-gray-50 rounded-full text-[10px] sm:text-xs sm:flex-1"
                          >
                            <TrendingUp className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                            Analysis
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => router.push(`/chat/${profile.id}`)}
                            className="h-7 sm:h-8 gap-1 sm:gap-1.5 border-gray-200 text-gray-700 hover:bg-gray-50 rounded-full text-[10px] sm:text-xs sm:flex-1"
                          >
                            <MessageSquare className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                            Chat
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="h-7 sm:h-8 text-gray-700 border-gray-200 hover:bg-gray-50 hover:text-red-600 rounded-full"
                            onClick={() => {
                              setDeleteProfileId(profile.id);
                              setIsDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <Dialog open={isDeleteDialogOpen} onOpenChange={(open) => {
          if (!isDeletingProfile) {
            setIsDeleteDialogOpen(open)
          }
        }}>
          <DialogContent className="bg-white border-none shadow-md rounded-xl overflow-hidden max-w-[90%] sm:max-w-md mx-auto">
            <DialogHeader className="bg-gradient-to-r from-gray-50 to-white p-4 sm:p-6">
              <DialogTitle className="text-lg sm:text-xl">Delete Profile</DialogTitle>
              <DialogDescription className="text-sm">
                Are you sure you want to delete this profile? This will remove all analysis data and chat history.
              </DialogDescription>
            </DialogHeader>
            {isDeletingProfile ? (
              <div className="py-3 sm:py-4 space-y-3 sm:space-y-4 px-4 sm:px-6">
                <div className="flex items-center gap-3">
                  <div className="h-5 w-5 sm:h-6 sm:w-6 relative">
                    <div className="absolute inset-0 rounded-full border-2 border-t-transparent border-red-500 animate-spin"></div>
                  </div>
                  <span className="text-gray-700 text-sm sm:text-base">{deleteProgress || 'Deleting profile...'}</span>
                </div>
                <div className="h-1.5 sm:h-2 w-full overflow-hidden rounded-full bg-gray-100">
                  <div 
                    className="h-full bg-red-500 transition-all duration-500 ease-in-out" 
                    style={{ width: '100%', animation: 'progress 1.5s ease-in-out infinite' }}
                  ></div>
                </div>
              </div>
            ) : (
              <DialogFooter className="flex gap-2 sm:space-x-0 mt-4 sm:mt-6 px-4 sm:px-6 pb-4 sm:pb-6">
                <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} className="border-gray-200 text-gray-700 hover:bg-gray-50 flex-1 rounded-full h-9 sm:h-10 text-sm">
                  Cancel
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={() => deleteProfileId && handleDeleteProfile(deleteProfileId)}
                  className="flex-1 bg-red-600 hover:bg-red-700 rounded-full h-9 sm:h-10 text-sm"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>
      </div>
      <style jsx global>{`
        ${progressAnimation}
      `}</style>
    </div>
  )
} 