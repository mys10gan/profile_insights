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
  MessageSquare, 
  PlusCircle,
  ArrowRightCircle,
  Loader2,
  User
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
  DialogTrigger,
} from "@/components/ui/dialog"

interface Profile {
  id: string
  platform: 'instagram' | 'linkedin'
  username: string
  last_scraped: string
}

interface Conversation {
  id: string
  created_at: string
  profile_id: string
  title: string
  profile?: Profile
  last_message?: {
    content: string
    role: string
    created_at: string
  }
}

export default function ChatsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isNewChatDialogOpen, setIsNewChatDialogOpen] = useState(false)
  
  const { user } = useSupabase()
  const { toast } = useToast()
  const router = useRouter()

  // Fetch conversations and profiles
  useEffect(() => {
    if (!user) return
    
    const fetchConversationsAndProfiles = async () => {
      setIsLoading(true)
      try {
        // Fetch profiles first
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, platform, username, last_scraped')
          .eq('user_id', user.id)
          .order('last_scraped', { ascending: false })
        
        if (profilesError) {
          console.error('Error fetching profiles:', profilesError)
          throw profilesError
        }
        
        setProfiles(profilesData || [])
        
        // If no profiles exist yet, we can stop here
        if (!profilesData || profilesData.length === 0) {
          setConversations([])
          setFilteredConversations([])
          setIsLoading(false)
          return
        }
        
        // Fetch conversations
        const { data: conversationsData, error: conversationsError } = await supabase
          .from('conversations')
          .select(`
            id, 
            created_at, 
            profile_id
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
        
        if (conversationsError) {
          console.error('Error fetching conversations:', conversationsError)
          throw conversationsError
        }
        
        // If no conversations exist yet
        if (!conversationsData || conversationsData.length === 0) {
          setConversations([])
          setFilteredConversations([])
          setIsLoading(false)
          return
        }
        
        // Get the last message for each conversation
        const conversationsWithDetails = await Promise.all((conversationsData || []).map(async (conversation) => {
          try {
            // Find corresponding profile
            const profile = profilesData?.find(p => p.id === conversation.profile_id)
            
            // Generate title from profile data rather than using stored title
            const title = profile 
              ? `Chat with ${sanitizeUsername(profile.username, profile.platform)}`
              : `Conversation ${conversation.id.substring(0, 8)}`;
            
            // Get last message
            const { data: messagesData, error: messagesError } = await supabase
              .from('messages')
              .select('content, role, created_at')
              .eq('conversation_id', conversation.id)
              .order('created_at', { ascending: false })
              .limit(1)
            
            if (messagesError) {
              console.error('Error fetching last message for conversation', conversation.id, ':', messagesError)
            }
            
            return {
              ...conversation,
              profile,
              title, // Add generated title
              last_message: messagesData && messagesData.length > 0 ? messagesData[0] : undefined
            }
          } catch (err) {
            console.error('Error processing conversation details:', err)
            // Return conversation without additional details rather than failing completely
            return {
              ...conversation,
              title: `Conversation ${conversation.id.substring(0, 8)}` // Fallback title
            }
          }
        }))
        
        setConversations(conversationsWithDetails)
        setFilteredConversations(conversationsWithDetails)
      } catch (error) {
        // Handle the empty error object case
        if (error && Object.keys(error).length === 0) {
          console.error('Empty error object received');
          toast({
            variant: "destructive",
            title: "Error",
            description: "Unable to load conversations. Please try refreshing the page.",
          })
        } else {
          console.error('Error fetching data:', error)
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to load conversations. Please try again.",
          })
        }
        
        // Set empty arrays to avoid undefined errors
        setConversations([])
        setFilteredConversations([])
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchConversationsAndProfiles()
  }, [user, toast])

  // Apply search filter
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredConversations(conversations)
      return
    }
    
    const query = searchQuery.toLowerCase()
    const filtered = conversations.filter(conversation => {
      const titleMatch = conversation.title?.toLowerCase().includes(query)
      const usernameMatch = conversation.profile?.username.toLowerCase().includes(query)
      const lastMessageMatch = conversation.last_message?.content.toLowerCase().includes(query)
      
      return titleMatch || usernameMatch || lastMessageMatch
    })
    
    setFilteredConversations(filtered)
  }, [searchQuery, conversations])

  // Create a new conversation
  const createNewConversation = async (profileId: string) => {
    if (!user) return
    
    try {
      const profile = profiles.find(p => p.id === profileId)
      if (!profile) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Profile not found.",
        })
        return
      }
      
      // Check first if a conversation already exists for this profile
      const { data: existingConversations, error: existingError } = await supabase
        .from('conversations')
        .select('id')
        .eq('user_id', user.id)
        .eq('profile_id', profileId)
        .limit(1)
      
      if (existingError) {
        console.error('Error checking existing conversations:', existingError)
      } else if (existingConversations && existingConversations.length > 0) {
        // If a conversation already exists, use it
        router.push(`/chat/${profileId}/${existingConversations[0].id}`)
        return
      }
      
      // Create new conversation without title field
      const { data, error } = await supabase
        .from('conversations')
        .insert([{
          user_id: user.id,
          profile_id: profileId,
          created_at: new Date().toISOString() // Explicitly set created_at
        }])
        .select()
      
      if (error) {
        console.error('Error creating conversation:', error)
        throw error
      }
      
      if (data && data.length > 0) {
        // Wait a moment for the database to ensure the record is fully committed
        setTimeout(() => {
          router.push(`/chat/${profileId}/${data[0].id}`)
        }, 300)
      } else {
        throw new Error('No data returned from conversation creation')
      }
    } catch (error) {
      console.error('Error creating conversation:', error)
      
      // Provide more specific error message based on error type
      let errorMessage = "Failed to create a new conversation. Please try again."
      
      if (error instanceof Error) {
        // Check for specific error types
        if (error.message.includes('foreign key constraint')) {
          errorMessage = "Unable to link conversation to profile. The profile may have been deleted."
        } else if (error.message.includes('duplicate key')) {
          errorMessage = "A conversation for this profile already exists."
        } else if (error.message.includes('does not exist')) {
          errorMessage = "Table schema mismatch. Please contact support."
        }
      }
      
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage
      })
    }
  }

  return (
    <div className="container mx-auto max-w-6xl p-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Conversations</h1>
        <p className="text-gray-500">
          Chat with AI about your analyzed profiles to get insights and recommendations
        </p>
      </div>
      
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-lg">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 border-gray-200 focus:border-gray-300 bg-white"
          />
        </div>
        
        <Button 
          onClick={() => setIsNewChatDialogOpen(true)} 
          className="bg-black hover:bg-black/90 text-white gap-2 rounded-full"
        >
          <MessageSquare className="h-4 w-4" />
          New Conversation
        </Button>
      </div>
      
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-gray-100">
              <CardContent className="p-6">
                <div className="flex gap-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-[250px]" />
                    <Skeleton className="h-4 w-full max-w-[400px]" />
                    <Skeleton className="h-4 w-[120px]" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredConversations.length === 0 ? (
        <Card className="border-gray-100">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            {searchQuery ? (
              <>
                <div className="rounded-full bg-gray-100 p-4 mb-4">
                  <Search className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-medium mb-2">No matching conversations</h3>
                <p className="text-gray-500 max-w-md">
                  We couldn't find any conversations matching your search.
                </p>
                <Button 
                  variant="outline"
                  onClick={() => setSearchQuery('')}
                  className="mt-4 rounded-full"
                >
                  Clear Search
                </Button>
              </>
            ) : (
              <>
                <div className="rounded-full bg-gray-100 p-4 mb-4">
                  <MessageSquare className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-medium mb-2">No conversations yet</h3>
                <p className="text-gray-500 max-w-md">
                  Start a conversation with one of your analyzed profiles to get personalized insights.
                </p>
                <Button 
                  onClick={() => setIsNewChatDialogOpen(true)}
                  className="mt-4 bg-black hover:bg-black/90 rounded-full gap-2"
                >
                  <PlusCircle className="h-4 w-4" />
                  Start a Conversation
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredConversations.map((conversation) => (
            <Card 
              key={conversation.id} 
              className="border-gray-100 hover:border-gray-200 transition-colors cursor-pointer"
              onClick={() => router.push(`/chat/${conversation.profile_id}/${conversation.id}`)}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 shrink-0 flex items-center justify-center rounded-full bg-gray-100">
                    {conversation.profile?.platform === 'instagram' ? (
                      <Instagram className="h-6 w-6 text-gray-700" />
                    ) : conversation.profile?.platform === 'linkedin' ? (
                      <Linkedin className="h-6 w-6 text-gray-700" />
                    ) : (
                      <User className="h-6 w-6 text-gray-700" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold truncate">
                        {conversation.title || (conversation.profile ? 
                          `Chat with ${sanitizeUsername(conversation.profile.username, conversation.profile.platform)}` :
                          `Conversation ${conversation.id.substring(0, 8)}`
                        )}
                      </h3>
                      {conversation.profile && (
                        <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 uppercase text-xs font-semibold tracking-wider">
                          {conversation.profile.platform}
                        </Badge>
                      )}
                    </div>
                    
                    {conversation.last_message ? (
                      <p className="text-gray-600 line-clamp-2 text-sm">
                        <span className="font-medium">
                          {conversation.last_message.role === 'user' ? 'You: ' : 'AI: '}
                        </span>
                        {conversation.last_message.content}
                      </p>
                    ) : (
                      <p className="text-gray-500 italic text-sm">No messages yet</p>
                    )}
                    
                    <div className="flex items-center mt-2 text-xs text-gray-500">
                      <span>
                        {formatDistanceToNow(new Date(conversation.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  
                  <Button size="icon" variant="ghost" className="ml-2 mt-1 text-gray-400">
                    <ArrowRightCircle className="h-5 w-5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      <Dialog open={isNewChatDialogOpen} onOpenChange={setIsNewChatDialogOpen}>
        <DialogContent className="bg-white border-none shadow-md rounded-xl overflow-hidden max-w-[90%] sm:max-w-md mx-auto">
          <DialogHeader className="p-4 sm:p-6">
            <DialogTitle className="text-lg sm:text-xl">Start New Conversation</DialogTitle>
            <DialogDescription className="text-sm">
              Choose a profile to chat with for personalized insights
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-2 px-4 sm:px-6 max-h-[50vh] overflow-y-auto">
            {profiles.length === 0 ? (
              <div className="text-center py-6">
                <div className="rounded-full bg-gray-100 p-4 mb-4 mx-auto w-16 h-16 flex items-center justify-center">
                  <User className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium mb-2">No profiles analyzed yet</h3>
                <p className="text-gray-500 text-sm mb-4">
                  Analyze a profile first to start a conversation
                </p>
                <Button 
                  onClick={() => {
                    setIsNewChatDialogOpen(false)
                    router.push('/dashboard')
                  }}
                  className="bg-black hover:bg-black/90 rounded-full"
                >
                  Analyze a Profile
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {profiles.map((profile) => (
                  <div
                    key={profile.id}
                    className="flex items-center p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => {
                      setIsNewChatDialogOpen(false)
                      createNewConversation(profile.id)
                    }}
                  >
                    <div className="h-10 w-10 flex items-center justify-center rounded-full bg-gray-100 mr-3">
                      {profile.platform === 'instagram' ? (
                        <Instagram className="h-5 w-5 text-gray-700" />
                      ) : (
                        <Linkedin className="h-5 w-5 text-gray-700" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 truncate">
                        {sanitizeUsername(profile.username, profile.platform)}
                      </h4>
                      <p className="text-xs text-gray-500">
                        {profile.platform === 'instagram' ? 'Instagram' : 'LinkedIn'} profile
                      </p>
                    </div>
                    <ArrowRightCircle className="h-5 w-5 ml-2 text-gray-400" />
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <DialogFooter className="flex justify-end p-4 sm:p-6 pt-2 sm:pt-2">
            <Button variant="outline" onClick={() => setIsNewChatDialogOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 