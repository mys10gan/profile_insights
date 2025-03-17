'use client'

import { useEffect, useState } from 'react'
import { useToast } from '@/components/ui/use-toast'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useSupabase } from '@/components/providers/supabase-provider'
import { Skeleton } from '@/components/ui/skeleton'
import { Loader2, ChevronLeft, BarChart3, ListFilter, Table, MessageSquare, Instagram, Linkedin, Share, Download, CalendarClock, Users, Heart, MessageCircle, TrendingUp } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table as UITable,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatDistanceToNow, format } from 'date-fns'
import { useParams } from 'next/navigation'

interface ProfileData {
  id: string
  profile_id: string
  raw_data: any
  platform_specific_data: any
  scraped_at: string
}

interface Profile {
  id: string
  user_id: string
  platform: 'instagram' | 'linkedin'
  username: string
  last_scraped: string
}

// Add this helper function before the Analysis component
function getProxiedImageUrl(originalUrl: string) {
  if (!originalUrl) return '';
  // Encode the URL to make it safe for query parameters
  const encodedUrl = encodeURIComponent(originalUrl);
  return `/api/proxy?url=${encodedUrl}`;
}

// Add this function to handle image loading errors
function handleImageError(e: React.SyntheticEvent<HTMLImageElement, Event>) {
  const target = e.target as HTMLImageElement;
  
  // If the image is already using the proxy, show a fallback
  if (target.src.startsWith('/api/proxy')) {
    target.src = '/placeholder-image.svg'; // Fallback image
    target.alt = 'Image unavailable';
    target.classList.add('opacity-50');
  } else {
    // Try loading through our proxy
    const originalSrc = target.src;
    target.src = getProxiedImageUrl(originalSrc);
  }
}

export default function Analysis() {
  const params = useParams()
  const id = params.id as string
  const [profile, setProfile] = useState<Profile | null>(null)
  const [profileData, setProfileData] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingStage, setLoadingStage] = useState<string>('Loading profile...')
  const [activeTab, setActiveTab] = useState('overview')
  const { toast } = useToast()
  const router = useRouter()
  const { user } = useSupabase()

  useEffect(() => {
    if (!user) {
      router.push('/');
      return
    }

    const fetchData = async () => {
      try {
        // Fetch profile
        setLoadingStage('Loading profile information...')
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', id)
          .single()

        if (profileError) {
          console.error('Error fetching profile:', profileError)
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to load profile information.",
          })
          return
        }
        setProfile(profileData)

        // Fetch profile data
        setLoadingStage('Loading analysis data...')
        const { data: analysisData, error: analysisError } = await supabase
          .from('profile_data')
          .select('*')
          .eq('profile_id', id)
          .single()

        if (analysisError) {
          // If no analysis data yet, show a message
          if (analysisError.code === 'PGRST116') { // Not found error
            setLoadingStage('Waiting for analysis to complete...')
            
            // Poll for data every 3 seconds
            const interval = setInterval(async () => {
              const { data, error } = await supabase
                .from('profile_data')
                .select('*')
                .eq('profile_id', id)
                .single()
              
              if (data) {
                clearInterval(interval)
                setProfileData(data)
                setLoading(false)
              }
            }, 3000)
            
            // Clear interval after 2 minutes (40 attempts)
            setTimeout(() => {
              clearInterval(interval)
              if (!profileData) {
                toast({
                  variant: "destructive",
                  title: "Timeout",
                  description: "Analysis is taking longer than expected. Please try again later.",
                })
                setLoading(false)
              }
            }, 120000)
            
            return
          }
          
          console.error('Error fetching analysis data:', analysisError)
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to load analysis data.",
          })
          return
        }
        
        setProfileData(analysisData)
      } catch (error) {
        console.error('Error loading data:', error)
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load profile data.",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id, user, router, toast, profileData])

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
        
        <div className="mt-8">
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
      </div>
    )
  }

  if (!profile || !profileData) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Profile not found or analysis not yet complete</div>
      </div>
    )
  }

  const data = profileData.platform_specific_data
  const rawData = profileData.raw_data

  // Format data for Instagram
  const instagramStats = profile.platform === 'instagram' ? {
    followers: data.followersCount || 'N/A',
    following: data.followingCount || 'N/A',
    posts: data.postsCount || 'N/A',
    engagementRate: data.followersCount && data.postsCount
      ? ((data.postsCount / data.followersCount) * 100).toFixed(2) + '%'
      : 'N/A',
    avgLikes: data.averageLikes || 'N/A',
    avgComments: data.averageComments || 'N/A',
    topPostType: data.topPostType || 'N/A',
    bio: data.biography || 'N/A',
    verified: data.isVerified ? 'Yes' : 'No',
    recentPosts: (Array.isArray(rawData) ? rawData : []).slice(0, 10) || []
  } : null

  // Format data for LinkedIn
  const linkedinStats = profile.platform === 'linkedin' ? {
    connections: data.connectionsCount || 'N/A',
    industry: data.industry || 'N/A',
    experience: data.experienceCount || 'N/A',
    postFrequency: data.postFrequency || 'N/A',
    engagementRate: data.engagementRate || 'N/A',
    topContentType: data.topContentType || 'N/A',
    headline: data.headline || 'N/A',
    location: data.location || 'N/A',
    recentPosts: (Array.isArray(rawData) ? rawData : []).slice(0, 10) || []
  } : null

  return (
    <div className="container mx-auto max-w-6xl p-4 py-8">
      <div className="mb-4 flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => router.push('/dashboard')} className="border-gray-200">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Dashboard
        </Button>
      </div>

      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100">
              {profile.platform === 'instagram' ? (
                <Instagram className="h-5 w-5 text-gray-700" />
              ) : (
                <Linkedin className="h-5 w-5 text-gray-700" />
              )}
            </div>
            <h1 className="text-3xl font-bold">
              {profile.username}
            </h1>
            <Badge variant="outline" className="ml-2 bg-gray-50 text-gray-700 border-gray-200">
              {profile.platform === 'instagram' ? 'Instagram' : 'LinkedIn'}
            </Badge>
          </div>
          <p className="text-gray-500 mt-2 flex items-center gap-1">
            <CalendarClock className="h-4 w-4" />
            Last updated {profile.last_scraped ? format(new Date(profile.last_scraped), 'PPpp') : 'Never'}
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2 border-gray-200">
            <Share className="h-4 w-4" />
            Share
          </Button>
          <Button variant="outline" size="sm" className="gap-2 border-gray-200">
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button className="gap-2" onClick={() => router.push(`/chat/${id}`)}>
            <MessageSquare className="h-4 w-4" />
            Chat About Profile
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="mb-6 grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="content">Content Analysis</TabsTrigger>
          <TabsTrigger value="audience">Audience Insights</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview">
          <div className="grid gap-6 md:grid-cols-3">
            {/* Profile Summary */}
            <Card className="border border-gray-100 shadow-sm">
              <CardHeader>
                <CardTitle>Profile Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {profile.platform === 'instagram' ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Followers</span>
                        <span className="font-medium">{instagramStats?.followers?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Following</span>
                        <span className="font-medium">{instagramStats?.following?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Posts</span>
                        <span className="font-medium">{instagramStats?.posts?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Verified</span>
                        <span className="font-medium">{instagramStats?.verified}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Connections</span>
                        <span className="font-medium">{linkedinStats?.connections}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Industry</span>
                        <span className="font-medium">{linkedinStats?.industry}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Experience</span>
                        <span className="font-medium">{linkedinStats?.experience}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Location</span>
                        <span className="font-medium">{linkedinStats?.location}</span>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Engagement Metrics */}
            <Card className="border border-gray-100 shadow-sm">
              <CardHeader>
                <CardTitle>Engagement Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {profile.platform === 'instagram' ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Engagement Rate</span>
                        <span className="font-medium">{instagramStats?.engagementRate}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Avg. Likes</span>
                        <span className="font-medium">{instagramStats?.avgLikes?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Avg. Comments</span>
                        <span className="font-medium">{instagramStats?.avgComments?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Top Post Type</span>
                        <span className="font-medium">{instagramStats?.topPostType}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Engagement Rate</span>
                        <span className="font-medium">{linkedinStats?.engagementRate}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Post Frequency</span>
                        <span className="font-medium">{linkedinStats?.postFrequency}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Top Content Type</span>
                        <span className="font-medium">{linkedinStats?.topContentType}</span>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Bio/Headline */}
            <Card className="border border-gray-100 shadow-sm">
              <CardHeader>
                <CardTitle>{profile.platform === 'instagram' ? 'Bio' : 'Headline'}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700">
                  {profile.platform === 'instagram' ? instagramStats?.bio : linkedinStats?.headline}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Posts */}
          <div className="mt-8">
            <Card className="border border-gray-100 shadow-sm">
              <CardHeader>
                <CardTitle>Recent Posts</CardTitle>
                <CardDescription>
                  The most recent content from this profile
                </CardDescription>
              </CardHeader>
              <CardContent>
                {profile.platform === 'instagram' ? (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {instagramStats?.recentPosts?.map((post: any, index: number) => (
                      <div key={index} className="rounded-lg border border-gray-100 overflow-hidden">
                        {post.displayUrl && (
                          <div className="aspect-square bg-gray-100 relative">
                            <img 
                              src={getProxiedImageUrl(post.displayUrl)} 
                              alt={`Post ${index + 1}`}
                              className="object-cover w-full h-full"
                              onError={handleImageError}
                            />
                          </div>
                        )}
                        <div className="p-3">
                          <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
                            <div className="flex items-center gap-1">
                              <CalendarClock className="h-3 w-3" />
                              {post.takenAt ? format(new Date(post.takenAt * 1000), 'PP') : 'Unknown date'}
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1">
                                <Heart className="h-3 w-3" />
                                {post.likesCount?.toLocaleString() || 0}
                              </div>
                              <div className="flex items-center gap-1">
                                <MessageCircle className="h-3 w-3" />
                                {post.commentsCount?.toLocaleString() || 0}
                              </div>
                            </div>
                          </div>
                          <p className="text-xs text-gray-700 line-clamp-3">
                            {post.caption || 'No caption'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {linkedinStats?.recentPosts?.map((post: any, index: number) => (
                      <div key={index} className="rounded-lg border border-gray-100 p-4">
                        <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
                          <div className="flex items-center gap-1">
                            <CalendarClock className="h-3 w-3" />
                            {post.date ? format(new Date(post.date), 'PP') : 'Unknown date'}
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1">
                              <TrendingUp className="h-3 w-3" />
                              {post.reactions?.toLocaleString() || 0} reactions
                            </div>
                            <div className="flex items-center gap-1">
                              <MessageCircle className="h-3 w-3" />
                              {post.comments?.toLocaleString() || 0} comments
                            </div>
                          </div>
                        </div>
                        <p className="text-sm text-gray-700">
                          {post.text || 'No text content'}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="content">
          <Card className="border border-gray-100 shadow-sm">
            <CardHeader>
              <CardTitle>Content Analysis</CardTitle>
              <CardDescription>
                Detailed analysis of the profile's content strategy
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Content analysis would go here */}
              <div className="py-8 text-center text-gray-500">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Content analysis is being generated</p>
                <p className="text-sm mt-2">Check back soon or chat with the AI for insights</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="audience">
          <Card className="border border-gray-100 shadow-sm">
            <CardHeader>
              <CardTitle>Audience Insights</CardTitle>
              <CardDescription>
                Demographics and behavior of the profile's audience
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Audience insights would go here */}
              <div className="py-8 text-center text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Audience insights are being generated</p>
                <p className="text-sm mt-2">Check back soon or chat with the AI for insights</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 