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
      
      // Navigate to the profile page which will create a new conversation
      router.push(`/chat/${profileId}`)
    } catch (error) {
      console.error('Error creating conversation:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create conversation. Please try again.",
      })
    }
  }

  return (
    <div className="container mx-auto max-w-6xl p-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">Conversation History</h1>
        <Button 
          variant="outline" 
          className="border-gray-200 h-9 sm:h-10 rounded-full gap-2 text-sm"
          onClick={() => setIsNewChatDialogOpen(true)}
        >
          <PlusCircle className="h-4 w-4" />
          New Chat
        </Button>
      </div>
      
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="pl-9 border-gray-200 h-10 sm:h-11 bg-gray-50/50 rounded-full focus-visible:ring-0 focus:border-gray-300"
          />
        </div>
      </div>
      
      <div className="mt-6">
        <h2 className="text-lg font-semibold mb-3">Recent Conversations</h2>
        <div className="space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          ) : filteredConversations.length > 0 ? (
            filteredConversations.map(conversation => (
              <div 
                key={conversation.id}
                className="p-4 border border-gray-100 rounded-xl hover:bg-gray-50/70 transition-all cursor-pointer relative group"
                onClick={() => router.push(`/chat/${conversation.profile_id}/${conversation.id}`)}
              >
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                    {conversation.profile?.platform === 'instagram' ? (
                      <Instagram className="h-5 w-5 text-gray-600" />
                    ) : conversation.profile?.platform === 'linkedin' ? (
                      <Linkedin className="h-5 w-5 text-gray-600" />
                    ) : (
                      <MessageSquare className="h-5 w-5 text-gray-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium text-sm sm:text-base">{conversation.title || "Unnamed conversation"}</h3>
                      {conversation.profile && (
                        <Badge variant="outline" className="bg-gray-50 border-gray-200 text-gray-600 text-xs uppercase tracking-wide">
                          {conversation.profile.platform}
                        </Badge>
                      )}
                    </div>
                    <p className="text-gray-500 text-sm mt-1 line-clamp-1">
                      {conversation.last_message ? (
                        conversation.last_message.role === 'assistant' 
                          ? <span><span className="font-medium">AI:</span> {conversation.last_message.content}</span>
                          : <span><span className="font-medium">You:</span> {conversation.last_message.content}</span>
                      ) : (
                        <span className="text-gray-400 italic">No messages yet</span>
                      )}
                    </p>
                    <div className="flex items-center mt-2 text-xs text-gray-400">
                      <time dateTime={conversation.created_at}>
                        {formatDistanceToNow(new Date(conversation.created_at), { addSuffix: true })}
                      </time>
                    </div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-8 w-8 p-0 rounded-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        router.push(`/chat/${conversation.profile_id}`)
                      }}
                    >
                      <PlusCircle className="h-4 w-4" />
                      <span className="sr-only">Start new conversation</span>
                    </Button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-gray-100 p-4 mb-4">
                <MessageSquare className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium mb-2">No conversations found</h3>
              <p className="text-gray-500 mb-6 max-w-md">
                {searchQuery ? 
                  "No conversations match your search criteria. Try a different search term." : 
                  "You don't have any conversations yet. Start by analyzing a profile."}
              </p>
              {!searchQuery && (
                <Button onClick={() => router.push('/dashboard')}>
                  Go to Dashboard
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
      
      <Dialog open={isNewChatDialogOpen} onOpenChange={setIsNewChatDialogOpen}>
        <DialogContent className="bg-white border-none shadow-md sm:max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Start a New Conversation</DialogTitle>
            <DialogDescription className="text-gray-500">
              Choose a profile to start a new conversation. This will create a fresh chat with the profile.
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4 mb-2 max-h-[320px] overflow-y-auto">
            {profiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="rounded-full bg-gray-100 p-3 mb-3">
                  <User className="h-6 w-6 text-gray-400" />
                </div>
                <h3 className="text-base font-medium mb-2">No profiles found</h3>
                <p className="text-gray-500 text-sm mb-4">
                  You need to analyze a profile before you can chat about it.
                </p>
                <Button 
                  size="sm"
                  onClick={() => {
                    setIsNewChatDialogOpen(false)
                    router.push('/dashboard')
                  }}
                >
                  Analyze a Profile
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {profiles.map(profile => (
                  <button
                    key={profile.id}
                    className="w-full flex items-center gap-3 p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors text-left"
                    onClick={() => {
                      setIsNewChatDialogOpen(false)
                      createNewConversation(profile.id)
                    }}
                  >
                    <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                      {profile.platform === 'instagram' ? (
                        <Instagram className="h-5 w-5 text-gray-600" />
                      ) : (
                        <Linkedin className="h-5 w-5 text-gray-600" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium text-sm">
                        {sanitizeUsername(profile.username, profile.platform)}
                      </h3>
                      <p className="text-xs text-gray-500">{profile.platform}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <DialogFooter className="mt-4">
            <Button 
              variant="outline" 
              onClick={() => setIsNewChatDialogOpen(false)}
              className="border-gray-200 text-gray-700 rounded-full"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 