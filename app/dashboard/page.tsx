'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useToast } from '@/components/ui/use-toast'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useSupabase } from '@/components/providers/supabase-provider'
import { Skeleton } from '@/components/ui/skeleton'
import { Loader2, Instagram, Linkedin, User, Calendar, Clock, TrendingUp, Edit, Trash2, BarChart, MessageSquare, Search, PlusCircle, ChevronRight, LayoutDashboard, LogOut, ChevronDown, CalendarClock, X } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
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
import { VisuallyHidden } from "@/components/ui/visually-hidden"
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
import Link from 'next/link'
import { sanitizeUsername } from '@/lib/utils'

interface Profile {
  id: string
  platform: 'instagram' | 'linkedin'
  username: string
  last_scraped: string
  scrape_status: string
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

// ShimmerCard component for profile loading
const ShimmerCard = () => (
  <div className="relative flex flex-col sm:flex-row sm:items-center sm:space-y-0 rounded-xl border border-gray-100 p-4 sm:p-5 overflow-hidden">
    <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
      <div className="h-10 w-10 sm:h-14 sm:w-14 shrink-0 rounded-full shimmer"></div>
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-5 w-40 sm:w-60 shimmer rounded"></div>
        <div className="h-4 w-28 sm:w-36 shimmer rounded"></div>
      </div>
    </div>
    <div className="flex items-center gap-2 mt-3 sm:mt-0">
      <div className="h-8 w-20 shimmer rounded-full"></div>
      <div className="h-8 w-16 shimmer rounded-full"></div>
      <div className="h-8 w-8 shimmer rounded-full"></div>
    </div>
  </div>
);

// Add a specialized loading component for profile stats
const ShimmerStats = () => (
  <div className="absolute top-0 left-0 right-0 bottom-0 flex items-center justify-center bg-white bg-opacity-80 z-10 rounded-xl">
    <div className="h-6 w-6 border-2 border-gray-300 border-t-transparent rounded-full animate-spin"></div>
  </div>
);

export default function Dashboard() {
  const [platform, setPlatform] = useState<'instagram' | 'linkedin'>('instagram')
  const [username, setUsername] = useState('')
  const [isLoading, setIsLoading] = useState(false)
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
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null)
  const pollingRef = useRef<boolean>(false)
  const [uiReady, setUiReady] = useState(false)

  // Clear and reset input when platform changes
  useEffect(() => {
    setUsername('');
  }, [platform]);

  useEffect(() => {
    if (!user) return
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
        // Delay UI reveal for a small amount of time to ensure smooth transitions
        setTimeout(() => {
          setUiReady(true);
        }, 100);
      }
    }

    fetchRecentProfiles()
  }, [user, router, toast])

  // Format username on input change based on platform
  const handleUsernameChange = (value: string) => {
    if (platform === 'instagram') {
      // For Instagram: trim whitespace, optionally strip @ at beginning
      let formattedValue = value.trim()
      setUsername(formattedValue)
    } else {
      // For LinkedIn: just set the value as is
      setUsername(value)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate input based on platform
    if (platform === 'instagram') {
      // Instagram usernames shouldn't contain URLs or linkedin.com
      if (username.includes('http') || username.includes('linkedin.com')) {
        toast({
          variant: "destructive",
          title: "Invalid Instagram Username",
          description: "Please enter a valid Instagram username without URLs or website links.",
        })
        return
      }
      
      // Instagram usernames should be alphanumeric with optional underscores and periods
      // Remove @ if present
      const cleanUsername = username.startsWith('@') ? username.substring(1) : username
      if (!/^[a-zA-Z0-9._]{1,30}$/.test(cleanUsername)) {
        toast({
          variant: "destructive",
          title: "Invalid Instagram Username",
          description: "Instagram usernames should only contain letters, numbers, periods, and underscores.",
        })
        return
      }
    } else if (platform === 'linkedin') {
      // LinkedIn should be a URL with the proper format
      if (!username.includes('linkedin.com/in/')) {
        toast({
          variant: "destructive",
          title: "Invalid LinkedIn URL",
          description: "Please enter a valid LinkedIn profile URL in the format: https://linkedin.com/in/username",
        })
        return
      }
      
      // Basic URL validation
      try {
        new URL(username.startsWith('http') ? username : 'https://' + username);
      } catch (e) {
        toast({
          variant: "destructive",
          title: "Invalid URL Format",
          description: "Please enter a valid URL for the LinkedIn profile.",
        })
        return
      }
    }
    
    setIsLoading(true)
    setScrapingStage('Initializing profile...')
    setScrapingProgress(10)

    try {
      // Clean username for consistent format
      let cleanedUsername = username
      if (platform === 'instagram') {
        // Remove @ if present for Instagram
        cleanedUsername = username.startsWith('@') ? username.substring(1) : username
      } else if (platform === 'linkedin') {
        // Ensure LinkedIn URL is consistent
        if (!cleanedUsername.startsWith('http')) {
          cleanedUsername = 'https://' + cleanedUsername
        }
      }

      // First, check if the profile already exists
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id || '')
        .eq('platform', platform)
        .eq('username', cleanedUsername)
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
            username: cleanedUsername
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
              .eq('username', cleanedUsername)
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

      // Call API to fetch the profile
      setScrapingStage('Starting profile data fetch...')
      setScrapingProgress(10)
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          platform,
          username: cleanedUsername,
          profileId
        }),
      })

      const responseData = await response.json();
      
      if (!response.ok) {
        console.error('API error response:', responseData);
        toast({
          variant: "destructive",
          title: "Error",
          description: responseData.error || 'Failed to start profile data fetch',
        })
        setIsLoading(false);
        return
      }

      setScrapingProgress(30)
      setScrapingStage('Fetching profile data... This will take about 3 minutes.')
      
      // Start polling for status updates
      pollingRef.current = true;
      const interval = setInterval(() => {
        checkProfileStatus(profileId);
      }, 10000); // Check every 10 seconds
      
      setPollingInterval(interval);
      
      toast({
        title: "Data fetch started",
        description: "Please wait while we collect data from the profile. This will take approximately 3 minutes.",
      })

      // Refresh the profile stats to show the new data
      await fetchProfileStats(profileId);
      setIsLoading(false);
      
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
      setIsLoading(false)
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

  // Add function to check profile status
  const checkProfileStatus = useCallback(async (profileId: string) => {
    if (!profileId || !pollingRef.current) return;
    
    try {
      // Use the API endpoint to check status instead of direct Supabase query
      const response = await fetch(`/api/scrape?profileId=${profileId}`);
      if (!response.ok) {
        console.error('Error checking profile status:', response.statusText);
        return;
      }
      
      const data = await response.json();
      
      if (data.success && data.profile) {
        const profile = data.profile;
        
        if (profile.scrape_status === 'completed') {
          // Fetching completed successfully
          pollingRef.current = false;
          if (pollingInterval) {
            clearInterval(pollingInterval);
            setPollingInterval(null);
          }
          
          setScrapingProgress(100);
          setScrapingStage('Data fetching completed successfully!');
          
          toast({
            title: "Success!",
            description: `Profile analysis complete.`,
          });
          
          // Refresh the profile stats to show the new data
          await fetchProfileStats(profileId);
          setIsLoading(false);
          
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
        } 
        else if (profile.scrape_status === 'failed') {
          // Fetching failed
          pollingRef.current = false;
          if (pollingInterval) {
            clearInterval(pollingInterval);
            setPollingInterval(null);
          }
          
          setScrapingProgress(0);
          setScrapingStage('Data fetching failed');
          
          toast({
            variant: "destructive",
            title: "Error",
            description: profile.scrape_error || 'Failed to fetch profile data',
          });
          
          setIsLoading(false);
        }
        else if (profile.scrape_status === 'scraping') {
          // Processing scraped data
          setScrapingProgress(70);
          setScrapingStage(`Processing scraped data... (${new Date().toLocaleTimeString()})`);
        }
        else if (profile.scrape_status === 'fetching') {
          // Still fetching - update progress
          setScrapingProgress(40);
          setScrapingStage(`Fetching profile data... (${new Date().toLocaleTimeString()})`);
        }
        else if (profile.scrape_status === 'pending') {
          // Still initializing
          setScrapingProgress(20);
          setScrapingStage(`Starting data collection... (${new Date().toLocaleTimeString()})`);
        }
        else {
          // Unknown status
          setScrapingStage(`Checking status... (${profile.scrape_status})`);
        }
      }
    } catch (error) {
      console.error('Error in status check:', error);
    }
  }, [pollingInterval, toast, fetchProfileStats, router, supabase, user?.id]);
  
  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      pollingRef.current = false;
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  // Modify the renderProfileCard function to handle the staggered animations
  const renderProfileCard = (profile: Profile, index: number) => (
    <div 
      key={profile.id}
      className="relative flex flex-col sm:flex-row sm:items-center sm:space-y-0 rounded-xl border border-gray-100 p-4 sm:p-5 transition-all hover:bg-gray-50/70 hover:shadow-sm group animated-fade-in"
      style={{ animationDelay: `${index * 100}ms` }}
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
              {sanitizeUsername(profile.username, profile.platform)}
            </h3>
            <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 uppercase text-xs font-semibold tracking-wider">
              {profile.platform === 'instagram' ? 'Instagram' : 'LinkedIn'}
            </Badge>
            
            {profile.scrape_status === 'pending' && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 gap-1 text-[10px] sm:text-xs">
                <Loader2 className="h-2.5 w-2.5 animate-spin" />
                Pending
              </Badge>
            )}
            
            {profile.scrape_status === 'fetching' && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 gap-1 text-[10px] sm:text-xs">
                <Loader2 className="h-2.5 w-2.5 animate-spin" />
                Fetching
              </Badge>
            )}
            
            {profile.scrape_status === 'scraping' && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 gap-1 text-[10px] sm:text-xs">
                <Loader2 className="h-2.5 w-2.5 animate-spin" />
                Processing
              </Badge>
            )}
            
            {profile.scrape_status === 'failed' && (
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 gap-1 text-[10px] sm:text-xs">
                <X className="h-2.5 w-2.5" />
                Failed
              </Badge>
            )}
          </div>
          <div className="mt-1 flex items-center gap-x-1.5 text-xs sm:text-sm text-gray-500">
            <CalendarClock className="h-3 w-3 sm:h-4 sm:w-4 flex-none" />
            <span>
              {profile.last_scraped 
                ? `Updated ${formatDistanceToNow(new Date(profile.last_scraped), { addSuffix: true })}` 
                : 'Never scraped'}
            </span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-2 mt-3 sm:mt-0">
        <HoverCard>
          <HoverCardTrigger>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 gap-1.5 border-gray-200 text-gray-700 hover:bg-gray-50 rounded-full text-xs"
              onMouseEnter={() => fetchProfileStats(profile.id)}
            >
              <BarChart className="h-3.5 w-3.5" />
              <span className="sm:inline">Stats</span>
            </Button>
          </HoverCardTrigger>
          <HoverCardContent className="w-60 p-3 bg-white shadow-md rounded-xl border-gray-100">
            {profileStats[profile.id]?.loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              </div>
            ) : profile.platform === 'instagram' ? (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Followers</span>
                  <span className="font-medium">{profileStats[profile.id]?.followers || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Posts</span>
                  <span className="font-medium">{profileStats[profile.id]?.posts || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Engagement</span>
                  <span className="font-medium">{profileStats[profile.id]?.engagement || 'N/A'}</span>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Connections</span>
                  <span className="font-medium">{profileStats[profile.id]?.connections || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Skills</span>
                  <span className="font-medium">{profileStats[profile.id]?.skills || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Experience</span>
                  <span className="font-medium">{profileStats[profile.id]?.experience || 'N/A'}</span>
                </div>
              </div>
            )}
          </HoverCardContent>
        </HoverCard>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => router.push(`/analysis/${profile.id}`)}
          className="h-8 gap-1.5 border-gray-200 text-gray-700 hover:bg-gray-50 rounded-full text-xs"
        >
          <TrendingUp className="h-3.5 w-3.5" />
          <span className="sm:inline">Analysis</span>
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => router.push(`/chat/${profile.id}`)}
          className="h-8 gap-1.5 border-gray-200 text-gray-700 hover:bg-gray-50 rounded-full text-xs"
        >
          <MessageSquare className="h-3.5 w-3.5" />
          <span className="sm:inline">Chat</span>
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          className="h-8 text-gray-700 border-gray-200 hover:bg-gray-50 hover:text-red-600 rounded-full"
          onClick={() => {
            setDeleteProfileId(profile.id);
            setIsDeleteDialogOpen(true);
          }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto max-w-6xl p-4 py-8 animated-fade-in">
        <div className="mb-10">
          <header className="text-center">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Welcome to Torque AI</h1>
            <p className="text-gray-500 max-w-2xl mx-auto mt-2">Analyze social media profiles to gain insights, understand engagement patterns, and discover growth opportunities.</p>
          </header>
        </div>

        <div className="space-y-8 md:space-y-12">
          <Card className="bg-white border-none shadow-sm overflow-hidden max-w-full md:max-w-2xl mx-auto animated-slide-up">
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
                      onChange={(e) => handleUsernameChange(e.target.value)}
                      placeholder={platform === 'instagram' ? '@username' : 'linkedin.com/in/profilename'}
                      required
                      disabled={isLoading}
                      className="border-gray-200 pl-10 pr-28 bg-gray-50/50 h-12"
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex space-x-2">
                      <Button
                        type="button"
                        variant={platform === 'instagram' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPlatform('instagram')}
                        disabled={isLoading}
                        className={`h-8 w-8 p-0 flex items-center justify-center rounded-full ${platform === 'instagram' ? 'bg-gray-200 text-gray-700 hover:bg-gray-300 border-gray-300' : 'border-gray-200'}`}
                      >
                        <Instagram className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant={platform === 'linkedin' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPlatform('linkedin')}
                        disabled={isLoading}
                        className={`h-8 w-8 p-0 flex items-center justify-center rounded-full ${platform === 'linkedin' ? 'bg-gray-200 text-gray-700 hover:bg-gray-300 border-gray-300' : 'border-gray-200'}`}
                      >
                        <Linkedin className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="pt-1">
                    <p className="text-xs text-gray-600">
                      {platform === 'instagram' 
                        ? "Enter a valid Instagram username (e.g., @username or username)" 
                        : "Enter a complete LinkedIn profile URL (must include linkedin.com/in/)"}
                    </p>
                  </div>
                </div>

                <Button 
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-10 sm:h-12 bg-black hover:bg-black/90 text-white rounded-full"
                >
                  {isLoading ? (
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

          {isLoading && (
            <Card className="bg-white border-none shadow-sm overflow-hidden max-w-2xl mx-auto animated-fade-in">
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

          {!isLoading && recentProfiles.length > 0 && (
            <div className="space-y-4 sm:space-y-6 animated-slide-up" style={{ animationDelay: '100ms' }}>
              <div className="flex justify-between items-center">
                <h2 className="text-xl sm:text-2xl font-bold">Your Profiles</h2>
                <Button 
                  variant="outline"
                  onClick={() => {
                    router.push('/profiles')
                  }}
                  className="rounded-full border-gray-200 text-gray-700 px-4 sm:px-6 h-9 sm:h-10 text-sm"
                >
                  {showAllProfiles ? (
                    <span className="flex items-center">
                      <ChevronDown className="h-4 w-4 mr-2" />
                      Show Less
                    </span>
                  ) : (
                    <span className="flex items-center">
                      <Clock className="h-4 w-4 mr-2" />
                      See All
                    </span>
                  )}
                </Button>
              </div>
              <div className="space-y-3 sm:space-y-5 max-w-full sm:max-w-5xl mx-auto px-1 sm:px-0">
                {loadingProfiles ? (
                  <div className="space-y-4 sm:space-y-6">
                    {[1, 2, 3].map((i) => (
                      <ShimmerCard key={i} />
                    ))}
                  </div>
                ) : !uiReady ? (
                  <div className="space-y-4 sm:space-y-6">
                    {[1, 2, 3].map((i) => (
                      <ShimmerCard key={i} />
                    ))}
                  </div>
                ) : (
                  (showAllProfiles ? recentProfiles : recentProfiles.slice(0, 3)).map((profile, index) => 
                    renderProfileCard(profile, index)
                  )
                )}
                
                {!showAllProfiles && recentProfiles.length > 3 && (
                  <div className="flex justify-center mt-4">
                    <Button 
                      variant="outline"
                      onClick={() => setShowAllProfiles(true)}
                      className="rounded-full border-gray-200 text-gray-700 px-4 sm:px-6 h-9 sm:h-10 text-sm animated-fade-in"
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      Show All ({recentProfiles.length})
                    </Button>
                  </div>
                )}
                
                {recentProfiles.length === 0 && !loadingProfiles && (
                  <div className="flex flex-col items-center justify-center py-10 sm:py-16 text-center animated-fade-in">
                    <div className="rounded-full bg-gray-100 p-4 sm:p-6 mb-4">
                      <User className="h-8 w-8 sm:h-12 sm:w-12 text-gray-400" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-medium mb-2">No profiles analyzed yet</h3>
                    <p className="text-gray-500 max-w-md text-sm sm:text-base">
                      Start by analyzing a profile to see insights and performance metrics.
                    </p>
                  </div>
                )}
              </div>
            </div>
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
                  className="flex-1 bg-red-500 hover:bg-red-700 rounded-full h-9 sm:h-10 text-sm text-white"
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