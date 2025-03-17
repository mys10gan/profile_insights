'use client'

import { useEffect, useState, useRef } from 'react'
import { useToast } from '@/components/ui/use-toast'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useSupabase } from '@/components/providers/supabase-provider'
import { 
  ChevronLeft, 
  SendHorizontal, 
  Loader2, 
  Instagram, 
  Linkedin, 
  User, 
  Bot, 
  DownloadCloud,
  RefreshCw,
  MessageSquare,
  Calendar,
  BarChart
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useParams } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import { motion, AnimatePresence } from 'framer-motion'

interface Message {
  id: string
  conversation_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

interface Profile {
  id: string
  platform: 'instagram' | 'linkedin'
  username: string
}

// Add this helper function before the Chat component
function getProxiedImageUrl(originalUrl: string) {
  if (!originalUrl) return '';
  // Encode the URL to make it safe for query parameters
  const encodedUrl = encodeURIComponent(originalUrl);
  return `/api/proxy?url=${encodedUrl}`;
}

export default function Chat() {
  const params = useParams()
  const id = params.id as string
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [isThinking, setIsThinking] = useState(false)
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([
    "What content performs best on this profile?",
    "How can I improve my engagement rate?",
    "What posting frequency would you recommend?",
    "What are the strengths of this profile?"
  ])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()
  const router = useRouter()
  const { user } = useSupabase()

  // Prevent page reloads by storing conversation state in sessionStorage
  useEffect(() => {
    if (!user) {
      router.push('/')
      return
    }

    // Check if we have cached data
    const cachedData = sessionStorage.getItem(`chat_${id}`)
    if (cachedData) {
      try {
        const { profile, conversationId, messages } = JSON.parse(cachedData)
        setProfile(profile)
        setConversationId(conversationId)
        setMessages(messages)
        setInitialLoading(false)
        return
      } catch (e) {
        console.error('Error parsing cached data:', e)
        // Continue with normal loading if cache parsing fails
      }
    }

    const fetchData = async () => {
      try {
        setInitialLoading(true)
        // Fetch profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, platform, username')
          .eq('id', id)
          .single()

        if (profileError) {
          console.error('Profile fetch error:', profileError)
          throw profileError
        }
        setProfile(profileData)

        // Create or fetch conversation
        const { data: conversationData, error: conversationError } = await supabase
          .from('conversations')
          .select('id')
          .eq('profile_id', id)
          .eq('user_id', user.id)
          .single()

        if (conversationError && conversationError.code !== 'PGRST116') {
          console.error('Conversation fetch error:', conversationError)
          throw conversationError
        }

        let conversationId
        if (!conversationData) {
          const { data: newConversation, error: createError } = await supabase
            .from('conversations')
            .insert([{
              user_id: user.id,
              profile_id: id
            }])
            .select()
            .single()

          if (createError) {
            console.error('Conversation creation error:', createError)
            throw createError
          }
          conversationId = newConversation.id
        } else {
          conversationId = conversationData.id
        }

        setConversationId(conversationId)

        // Fetch messages
        const { data: messagesData, error: messagesError } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true })

        if (messagesError) {
          console.error('Messages fetch error:', messagesError)
          throw messagesError
        }

        // If no messages, add a welcome message
        let finalMessages = messagesData || []
        if (!messagesData || messagesData.length === 0) {
          const welcomeMessage = {
            id: 'welcome',
            conversation_id: conversationId,
            role: 'assistant' as const,
            content: `👋 Hello! I'm your AI assistant specialized in analyzing social media profiles. I've analyzed ${profileData.platform === 'instagram' ? 'Instagram' : 'LinkedIn'} profile "${profileData.username}" and I'm ready to provide insights. What would you like to know about this profile?`,
            created_at: new Date().toISOString()
          }
          finalMessages = [welcomeMessage]
        }
        
        setMessages(finalMessages)
        
        // Cache the data to prevent unnecessary reloads
        sessionStorage.setItem(`chat_${id}`, JSON.stringify({
          profile: profileData,
          conversationId,
          messages: finalMessages
        }))
      } catch (error) {
        console.error('Data fetch error:', error)
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load chat data. Please try refreshing the page.",
        })
      } finally {
        setInitialLoading(false)
      }
    }

    fetchData()
  }, [id, user, router, toast])

  // Update cache when messages change
  useEffect(() => {
    if (profile && conversationId && messages.length > 0) {
      sessionStorage.setItem(`chat_${id}`, JSON.stringify({
        profile,
        conversationId,
        messages
      }))
    }
  }, [messages, profile, conversationId, id])

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isThinking])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || !conversationId || loading) return

    const userMessage = input.trim()
    setInput('')
    setLoading(true)
    setIsThinking(true)

    try {
      // Add user message to UI
      const { data: newMessage, error: messageError } = await supabase
        .from('messages')
        .insert([{
          conversation_id: conversationId,
          role: 'user',
          content: userMessage
        }])
        .select()
        .single()

      if (messageError) {
        console.error('User message insert error:', messageError)
        throw messageError
      }
      
      setMessages(prev => [...prev, newMessage])

      // Use streaming for AI response
      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: userMessage,
            conversationId,
            profileId: id
          }),
        })

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`)
        }

        const data = await response.json()
        const aiMessage = data.message || 'Sorry, I could not generate a response.'

        // Format the message for better readability
        const formattedMessage = formatAIResponse(aiMessage)

        // Save AI response to database
        const { data: aiMessageData, error: aiMessageError } = await supabase
          .from('messages')
          .insert([{
            conversation_id: conversationId,
            role: 'assistant',
            content: formattedMessage
          }])
          .select()
          .single()

        if (aiMessageError) {
          console.error('AI message insert error:', aiMessageError)
          throw aiMessageError
        }
        
        setMessages(prev => [...prev, aiMessageData])

        // Generate contextually relevant suggested questions
        generateSuggestedQuestions(userMessage, aiMessage)
      } catch (apiError) {
        console.error('API or database error:', apiError)
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to get AI response. Please try again.",
        })
      }
    } catch (error) {
      console.error('Message submission error:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send message.",
      })
    } finally {
      setLoading(false)
      setIsThinking(false)
    }
  }

  // Format AI response for better readability
  const formatAIResponse = (text: string) => {
    // Add markdown formatting if not already present
    let formattedText = text

    // Ensure proper markdown formatting for lists
    formattedText = formattedText.replace(/^- (.+)$/gm, '- $1')
    formattedText = formattedText.replace(/^(\d+)\. (.+)$/gm, '$1. $2')
    
    // Add bold to important metrics and numbers
    formattedText = formattedText.replace(/(\d[\d,\.]+%?)/g, '**$1**')
    
    // Format sections with headers
    const lines = formattedText.split('\n')
    let inCodeBlock = false
    
    for (let i = 0; i < lines.length; i++) {
      // Skip code blocks
      if (lines[i].startsWith('```')) {
        inCodeBlock = !inCodeBlock
        continue
      }
      
      if (!inCodeBlock) {
        // Format section headers that look like titles but aren't markdown
        if (
          lines[i].length > 0 && 
          lines[i].length < 60 && 
          !lines[i].startsWith('#') && 
          !lines[i].includes(':') &&
          (i === 0 || lines[i-1].trim() === '')
        ) {
          // Check if this looks like a header (all words capitalized or all caps)
          const words = lines[i].split(' ')
          const allWordsCapitalized = words.every(word => 
            word.length > 0 && (word[0] === word[0].toUpperCase() || word === word.toUpperCase())
          )
          
          if (allWordsCapitalized) {
            lines[i] = `## ${lines[i]}`
          }
        }
        
        // Format lines that look like section titles with colons
        if (
          lines[i].includes(':') && 
          !lines[i].startsWith('#') && 
          lines[i].split(':')[0].trim().length < 30 &&
          lines[i].split(':')[0].trim().toUpperCase() === lines[i].split(':')[0].trim()
        ) {
          const parts = lines[i].split(':')
          lines[i] = `**${parts[0].trim()}:** ${parts.slice(1).join(':').trim()}`
        }
      }
    }
    
    formattedText = lines.join('\n')
    
    // Ensure proper spacing between sections
    formattedText = formattedText.replace(/\n{3,}/g, '\n\n')
    
    // Add proper table formatting if it looks like a table
    formattedText = formattedText.replace(/(\|[^\n]+\|\n)(?!\|)/g, '$1\n')
    
    return formattedText
  }

  // Generate contextually relevant suggested questions
  const generateSuggestedQuestions = (userMessage: string, aiResponse: string) => {
    // Base questions that are always relevant
    const baseQuestions = [
      `How does this compare to other ${profile?.platform} profiles?`,
      "What content formats should I focus on?",
      "How can I increase my followers?",
      "What are the weaknesses I should address?"
    ]
    
    // Context-aware questions based on user's current question and AI's response
    const contextQuestions = []
    
    if (userMessage.toLowerCase().includes("engagement") || aiResponse.toLowerCase().includes("engagement")) {
      contextQuestions.push("What factors affect engagement on this profile?")
    }
    
    if (userMessage.toLowerCase().includes("content") || aiResponse.toLowerCase().includes("content")) {
      contextQuestions.push("What content themes resonate most with the audience?")
    }
    
    if (userMessage.toLowerCase().includes("post") || aiResponse.toLowerCase().includes("post")) {
      contextQuestions.push("When is the best time to post for maximum reach?")
    }
    
    if (userMessage.toLowerCase().includes("audience") || aiResponse.toLowerCase().includes("audience")) {
      contextQuestions.push("What demographics make up the core audience?")
    }
    
    // Combine and select questions
    const allQuestions = [...contextQuestions, ...baseQuestions]
    const selectedQuestions = allQuestions.slice(0, 4) // Limit to 4 questions
    
    setSuggestedQuestions(selectedQuestions)
  }

  const handleSuggestedQuestion = (question: string) => {
    setInput(question)
    // Auto-submit if the user clicks a suggested question
    setTimeout(() => {
      const form = document.querySelector('form')
      if (form) form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))
    }, 100)
  }

  const handleStartNewChat = async () => {
    if (!user || !id) return

    try {
      setInitialLoading(true)
      // Create a new conversation
      const { data: newConversation, error: createError } = await supabase
        .from('conversations')
        .insert([{
          user_id: user.id,
          profile_id: id
        }])
        .select()
        .single()

      if (createError) {
        console.error('New conversation creation error:', createError)
        throw createError
      }
      
      setConversationId(newConversation.id)

      // Add welcome message
      const welcomeMessage = {
        id: 'welcome-new',
        conversation_id: newConversation.id,
        role: 'assistant' as const,
        content: `👋 Hello! I'm your AI assistant specialized in analyzing social media profiles. I've analyzed ${profile?.platform === 'instagram' ? 'Instagram' : 'LinkedIn'} profile "${profile?.username}" and I'm ready to provide insights. What would you like to know about this profile?`,
        created_at: new Date().toISOString()
      }
      setMessages([welcomeMessage])

      // Reset suggested questions
      const defaultSuggestions = [
        "What content performs best on this profile?",
        "How can I improve my engagement rate?",
        "What posting frequency would you recommend?",
        "What are the strengths of this profile?"
      ]
      setSuggestedQuestions(defaultSuggestions)
      
      // Update cache
      sessionStorage.setItem(`chat_${id}`, JSON.stringify({
        profile,
        conversationId: newConversation.id,
        messages: [welcomeMessage]
      }))

    } catch (error) {
      console.error('New chat error:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to start new chat.",
      })
    } finally {
      setInitialLoading(false)
    }
  }

  const exportChat = () => {
    try {
      // Format messages for export
      const exportData = messages
        .filter(msg => msg.id !== 'welcome' && msg.id !== 'welcome-new')
        .map(msg => `${msg.role === 'user' ? 'You' : 'AI'}: ${msg.content}`)
        .join('\n\n');
      
      // Create file and download
      const blob = new Blob([exportData], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${profile?.platform}-${profile?.username}-chat-${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Success",
        description: "Chat exported successfully",
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to export chat",
      });
    }
  };

  // Add this function to handle image loading errors
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
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
  };

  if (initialLoading) {
    return (
      <div className="flex h-screen flex-col">
        <div className="border-b p-4 flex justify-between items-center bg-white">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => router.push('/dashboard')} className="border-gray-200">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <h1 className="text-xl font-semibold">Loading Chat...</h1>
          </div>
        </div>

        <div className="flex-1 p-6 flex flex-col items-center justify-center">
          <div className="space-y-4 w-full max-w-md">
            <Skeleton className="h-12 w-full rounded-md" />
            <Skeleton className="h-28 w-full rounded-md" />
            <Skeleton className="h-12 w-3/4 ml-auto rounded-md" />
            <Skeleton className="h-36 w-full rounded-md" />
          </div>
          <div className="mt-8 flex flex-col items-center">
            <Loader2 className="h-10 w-10 animate-spin text-black" />
            <p className="text-sm text-gray-500 mt-3">Loading profile insights...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
        <div className="text-xl font-medium mb-4">Profile not found</div>
        <p className="text-gray-500 mb-6">The profile you're looking for doesn't exist or is still processing</p>
        <Button onClick={() => router.push('/dashboard')} className="gap-2">
          <ChevronLeft className="h-4 w-4" />
          Return to Dashboard
        </Button>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col">
      <div className="border-b p-4 flex justify-between items-center bg-white">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push('/dashboard')} className="border-gray-200">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100">
            {profile?.platform === 'instagram' ? (
              <Instagram className="h-4 w-4 text-gray-700" />
            ) : (
              <Linkedin className="h-4 w-4 text-gray-700" />
            )}
          </div>
          <div>
            <h1 className="text-md font-semibold">
              {profile?.username}
            </h1>
            <Badge variant="outline" className="text-xs text-gray-600 bg-gray-50 border-gray-200">
              {profile?.platform === 'instagram' ? 'Instagram' : 'LinkedIn'}
            </Badge>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1 border-gray-200" onClick={handleStartNewChat}>
            <RefreshCw className="h-4 w-4" />
            New Chat
          </Button>
          <Button variant="outline" size="sm" className="gap-1 border-gray-200" onClick={exportChat}>
            <DownloadCloud className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4 bg-white">
        <div className="space-y-4 max-w-4xl mx-auto">
          <AnimatePresence>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div className="flex items-start gap-3 max-w-[80%]">
                  {message.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center mt-1 flex-shrink-0">
                      <Bot className="h-4 w-4 text-gray-700" />
                    </div>
                  )}
                  <div
                    className={`rounded-lg px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-black text-white'
                        : 'bg-gray-50 text-gray-900 border border-gray-100'
                    }`}
                  >
                    {message.content === '...' ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>AI is thinking...</span>
                      </div>
                    ) : (
                      <div className="prose prose-sm max-w-none prose-headings:font-semibold prose-headings:text-black prose-p:text-gray-700 prose-li:text-gray-700 prose-strong:text-black prose-strong:font-semibold prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-code:text-gray-800 prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-pre:bg-gray-100 prose-pre:text-gray-800 prose-pre:p-3 prose-pre:rounded-md prose-blockquote:border-l-2 prose-blockquote:border-gray-300 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-gray-700 prose-table:border-collapse prose-th:border prose-th:border-gray-300 prose-th:bg-gray-100 prose-th:p-2 prose-td:border prose-td:border-gray-300 prose-td:p-2">
                        <ReactMarkdown components={{
                          h1: ({children}) => <h1 className="text-xl font-bold mt-4 mb-2">{children}</h1>,
                          h2: ({children}) => <h2 className="text-lg font-semibold mt-3 mb-2">{children}</h2>,
                          h3: ({children}) => <h3 className="text-base font-semibold mt-2 mb-1">{children}</h3>,
                          p: ({children}) => <p className="my-2">{children}</p>,
                          ul: ({children}) => <ul className="list-disc pl-5 my-2">{children}</ul>,
                          ol: ({children}) => <ol className="list-decimal pl-5 my-2">{children}</ol>,
                          li: ({children}) => <li className="my-1">{children}</li>,
                          strong: ({children}) => <strong className="font-semibold">{children}</strong>,
                          table: ({children}) => <div className="overflow-x-auto my-2"><table className="min-w-full border-collapse">{children}</table></div>,
                          thead: ({children}) => <thead className="bg-gray-100">{children}</thead>,
                          th: ({children}) => <th className="border border-gray-300 px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">{children}</th>,
                          td: ({children}) => <td className="border border-gray-300 px-3 py-2 text-sm">{children}</td>,
                          blockquote: ({children}) => <blockquote className="border-l-2 border-gray-300 pl-4 italic text-gray-700 my-2">{children}</blockquote>,
                          code: ({className, children}) => {
                            // Check if this is an inline code block
                            const isInline = !className;
                            return isInline ? 
                              <code className="bg-gray-100 text-gray-800 px-1 py-0.5 rounded text-sm">{children}</code> : 
                              <pre className="bg-gray-100 text-gray-800 p-3 rounded-md overflow-x-auto text-sm whitespace-pre"><code>{children}</code></pre>;
                          },
                          img: ({src, alt}) => (
                            <img 
                              src={src} 
                              alt={alt || 'Image'} 
                              className="max-w-full rounded-md my-2"
                              onError={handleImageError}
                            />
                          ),
                        }}>
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    )}
                    {message.role !== 'user' && message.created_at && message.id !== 'welcome' && message.id !== 'welcome-new' && (
                      <div className="text-xs text-gray-400 mt-2 flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                      </div>
                    )}
                  </div>
                  {message.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center mt-1 flex-shrink-0">
                      <User className="h-4 w-4 text-white" />
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {/* AI Thinking animation */}
          <AnimatePresence>
            {isThinking && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex justify-start"
              >
                <div className="flex items-start gap-3 max-w-[80%]">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center mt-1 flex-shrink-0">
                    <Bot className="h-4 w-4 text-gray-700" />
                  </div>
                  <div className="rounded-lg px-4 py-3 bg-gray-50 text-gray-900 border border-gray-100 min-w-[250px]">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="absolute inset-0 rounded-full bg-gray-400 opacity-20 blur-md animate-pulse"></div>
                        <Loader2 className="h-4 w-4 animate-spin text-gray-700 relative z-10" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Analyzing profile data...</p>
                        <p className="text-xs text-gray-500 mt-1">Generating insights</p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Suggested questions */}
      {messages.length > 0 && messages.length < 5 && (
        <div className="px-4 py-3 border-t bg-white">
          <p className="text-sm text-gray-500 mb-2 flex items-center">
            <BarChart className="h-3.5 w-3.5 mr-1.5" />
            Suggested questions:
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.map((question, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                className="text-xs border-gray-200 hover:bg-gray-50 transition-colors"
                onClick={() => handleSuggestedQuestion(question)}
              >
                {question}
              </Button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="border-t p-4 bg-white">
        <div className="flex gap-3 max-w-4xl mx-auto">
          <Input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything about this profile..."
            disabled={loading}
            className="flex-1 border-gray-200 focus:border-gray-400 focus:ring-gray-300"
            autoComplete="off"
          />
          <Button 
            type="submit"
            disabled={loading || !input.trim()}
            className="flex-shrink-0 gap-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <SendHorizontal className="h-4 w-4" />
            )}
            Send
          </Button>
        </div>
      </form>
    </div>
  )
} 