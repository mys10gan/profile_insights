'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabase } from '@/components/providers/supabase-provider'
import { useToast } from '@/components/ui/use-toast'
import { supabase } from '@/lib/supabase/client'
import { sanitizeUsername } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { 
  Instagram, 
  Linkedin, 
  Search, 
  Filter, 
  TrendingUp, 
  MessageSquare, 
  BarChart, 
  Trash2, 
  X,
  Loader2,
  CalendarClock,
  ArrowUpDown
} from 'lucide-react'

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from "@/components/ui/hover-card"

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

export default function ProfilesPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [platform, setPlatform] = useState<'all' | 'instagram' | 'linkedin'>('all')
  const [sortBy, setSortBy] = useState<'recent' | 'oldest' | 'platform'>('recent')
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [filteredProfiles, setFilteredProfiles] = useState<Profile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [profileStats, setProfileStats] = useState<ProfileStats>({})
  const [deleteProfileId, setDeleteProfileId] = useState<string | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeletingProfile, setIsDeletingProfile] = useState(false)
  const [deleteProgress, setDeleteProgress] = useState<string | null>(null)
  
  const { user } = useSupabase()
  const { toast } = useToast()
  const router = useRouter()

  // Fetch profiles
  useEffect(() => {
    if (!user) return
    
    const fetchProfiles = async () => {
      setIsLoading(true)
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .order('last_scraped', { ascending: false })
        
        if (error) throw error
        
        setProfiles(data || [])
        setFilteredProfiles(data || [])
      } catch (error) {
        console.error('Error fetching profiles:', error)
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load profiles. Please try again.",
        })
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchProfiles()
  }, [user, toast])

  // Apply filters when search query, platform, or sortBy change
  useEffect(() => {
    if (!profiles.length) return

    let filtered = [...profiles]
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(profile => 
        profile.username.toLowerCase().includes(query)
      )
    }
    
    // Filter by platform
    if (platform !== 'all') {
      filtered = filtered.filter(profile => profile.platform === platform)
    }
    
    // Apply sorting
    if (sortBy === 'recent') {
      filtered.sort((a, b) => new Date(b.last_scraped).getTime() - new Date(a.last_scraped).getTime())
    } else if (sortBy === 'oldest') {
      filtered.sort((a, b) => new Date(a.last_scraped).getTime() - new Date(b.last_scraped).getTime())
    } else if (sortBy === 'platform') {
      filtered.sort((a, b) => a.platform.localeCompare(b.platform))
    }
    
    setFilteredProfiles(filtered)
  }, [searchQuery, platform, sortBy, profiles])

  // Function to fetch profile stats for a specific profile
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
      const profile = profiles.find(p => p.id === profileId);
      
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

      // Update the profiles list
      setProfiles(prevProfiles => prevProfiles.filter(profile => profile.id !== id))
      
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

  return (
    <div className="container mx-auto max-w-6xl p-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Profiles</h1>
        <p className="text-gray-500">
          View and manage all your analyzed social media profiles
        </p>
      </div>
      
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-lg">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search profiles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 border-gray-200 focus:border-gray-300 bg-white"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 border-gray-200">
                <Filter className="h-4 w-4" />
                Platform
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="min-w-[180px]">
              <DropdownMenuRadioGroup value={platform} onValueChange={(value: any) => setPlatform(value)}>
                <DropdownMenuRadioItem value="all">All Platforms</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="instagram">Instagram</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="linkedin">LinkedIn</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 border-gray-200">
                <ArrowUpDown className="h-4 w-4" />
                Sort
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="min-w-[180px]">
              <DropdownMenuRadioGroup value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <DropdownMenuRadioItem value="recent">Most Recent</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="oldest">Oldest First</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="platform">By Platform</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-gray-100">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-[250px]" />
                    <Skeleton className="h-4 w-[200px]" />
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-9 w-20 rounded-md" />
                    <Skeleton className="h-9 w-20 rounded-md" />
                    <Skeleton className="h-9 w-9 rounded-md" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredProfiles.length === 0 ? (
        <Card className="border-gray-100">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            {searchQuery || platform !== 'all' ? (
              <>
                <div className="rounded-full bg-gray-100 p-4 mb-4">
                  <Search className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-medium mb-2">No matching profiles found</h3>
                <p className="text-gray-500 max-w-md">
                  Try adjusting your search terms or filters to find what you're looking for.
                </p>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setSearchQuery('')
                    setPlatform('all')
                  }}
                  className="mt-4 rounded-full"
                >
                  Clear Filters
                </Button>
              </>
            ) : (
              <>
                <div className="rounded-full bg-gray-100 p-4 mb-4">
                  <Instagram className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-medium mb-2">No profiles analyzed yet</h3>
                <p className="text-gray-500 max-w-md">
                  Start by analyzing a social media profile to gain insights and performance metrics.
                </p>
                <Button 
                  onClick={() => router.push('/dashboard')}
                  className="mt-4 bg-black hover:bg-black/90 rounded-full"
                >
                  Analyze a Profile
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredProfiles.map((profile) => (
            <Card key={profile.id} className="border-gray-100 hover:border-gray-200 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="h-12 w-12 shrink-0 flex items-center justify-center rounded-full bg-gray-100">
                      {profile.platform === 'instagram' ? (
                        <Instagram className="h-6 w-6 text-gray-700" />
                      ) : (
                        <Linkedin className="h-6 w-6 text-gray-700" />
                      )}
                    </div>
                    
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-semibold truncate">
                          {sanitizeUsername(profile.username, profile.platform)}
                        </h3>
                        <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 uppercase text-xs font-semibold tracking-wider">
                          {profile.platform === 'instagram' ? 'Instagram' : 'LinkedIn'}
                        </Badge>
                        
                        {profile.scrape_status === 'pending' && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 gap-1 text-xs">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Pending
                          </Badge>
                        )}
                        
                        {profile.scrape_status === 'fetching' && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 gap-1 text-xs">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Fetching
                          </Badge>
                        )}
                        
                        {profile.scrape_status === 'scraping' && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 gap-1 text-xs">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Processing
                          </Badge>
                        )}
                        
                        {profile.scrape_status === 'failed' && (
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 gap-1 text-xs">
                            <X className="h-3 w-3" />
                            Failed
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-1">
                        <CalendarClock className="h-4 w-4 flex-none" />
                        <span>
                          {profile.last_scraped 
                            ? `Updated ${formatDistanceToNow(new Date(profile.last_scraped), { addSuffix: true })}` 
                            : 'Never scraped'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-4 sm:mt-0 ml-auto">
                    <HoverCard>
                      <HoverCardContent className="w-64 p-4 bg-white shadow-md rounded-xl border-gray-100">
                        {profileStats[profile.id]?.loading ? (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                          </div>
                        ) : profile.platform === 'instagram' ? (
                          <div className="space-y-3">
                            <h4 className="font-medium">Instagram Stats</h4>
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
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <h4 className="font-medium">LinkedIn Stats</h4>
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
                          </div>
                        )}
                      </HoverCardContent>
                    </HoverCard>
                    
                    <Button 
                      variant="outline" 
                      onClick={() => router.push(`/analysis/${profile.id}`)}
                      className="gap-1.5 border-gray-200 text-gray-700 hover:bg-gray-50"
                    >
                      <TrendingUp className="h-4 w-4" />
                      Analysis
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => router.push(`/chat/${profile.id}`)}
                      className="gap-1.5 border-gray-200 text-gray-700 hover:bg-gray-50"
                    >
                      <MessageSquare className="h-4 w-4" />
                      Chat
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="text-gray-700 border-gray-200 hover:bg-gray-50 hover:text-red-600"
                      onClick={() => {
                        setDeleteProfileId(profile.id);
                        setIsDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
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
  )
} 