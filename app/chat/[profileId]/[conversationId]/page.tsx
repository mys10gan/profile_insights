"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useSupabase } from "@/components/providers/supabase-provider";
import { sanitizeUsername } from "@/lib/utils";
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
  BarChart,
  Copy,
  Send,
  BarChart2,
  Download,
  Trash,
  MoreVertical,
  X,
  History,
  CalendarClock,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

interface Profile {
  id: string;
  platform: "instagram" | "linkedin";
  username: string;
  created_at?: string;
}

// Helper function for proxied images
function getProxiedImageUrl(originalUrl: string) {
  if (!originalUrl) return "";
  const encodedUrl = encodeURIComponent(originalUrl);
  return `/api/proxy?url=${encodedUrl}`;
}

const BotIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width="100%"
    height="100%"
    fill="currentColor"
    className="w-full h-full"
  >
    <path d="M12 2C8.6 2 6 4.6 6 8v1h12V8c0-3.4-2.6-6-6-6zm8 9H4v6c0 3.4 2.6 6 6 6h4c3.4 0 6-2.6 6-6v-6zm-9 7H9v-2h2v2zm6 0h-2v-2h2v2z" />
  </svg>
);

const ShimmerMessage = () => (
  <div className="flex flex-col gap-2">
    <div className="flex items-center gap-2">
      <div className="h-6 w-6 rounded-full bg-gradient-to-r from-gray-100 to-gray-200 animate-shimmer" />
      <div className="h-4 w-24 bg-gradient-to-r from-gray-100 to-gray-200 animate-shimmer rounded" />
    </div>
    <div className="space-y-2">
      <div className="h-4 w-3/4 bg-gradient-to-r from-gray-100 to-gray-200 animate-shimmer rounded" />
      <div className="h-4 w-1/2 bg-gradient-to-r from-gray-100 to-gray-200 animate-shimmer rounded" />
    </div>
  </div>
);

const ThinkingTimer = () => {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds(s => s + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="text-[10px] sm:text-xs text-gray-400 mt-1">
      thinking... {seconds}s
    </div>
  );
};

export default function Chat() {
  const params = useParams();
  const profileId = params.profileId as string;
  const conversationId = params.conversationId as string;
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const router = useRouter();
  const { user } = useSupabase();
  const [messageToDelete, setMessageToDelete] = useState<Message | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteType, setDeleteType] = useState<"message" | "conversation">("message");
  const [deleteInProgress, setDeleteInProgress] = useState(false);

  // Platform-specific welcome messages
  const getWelcomeMessage = (
    platform: "instagram" | "linkedin",
    username: string
  ) => {
    const sanitizedUsername = sanitizeUsername(username, platform);

    if (platform === "instagram") {
      return `👋 Hello! I'm your AI assistant specialized in analyzing Instagram profiles. I've analyzed the Instagram account "${sanitizedUsername}" and I'm ready to provide insights about their content strategy, engagement patterns, audience demographics, and growth opportunities. What would you like to know about this profile?`;
    } else {
      return `👋 Hello! I'm your AI assistant specialized in analyzing LinkedIn profiles. I've analyzed the LinkedIn profile for "${sanitizedUsername}" and I'm ready to provide insights about their professional network, content effectiveness, career trajectory, and business development opportunities. What would you like to know about this profile?`;
    }
  };

  // Fetch data on component mount
  useEffect(() => {
    if (!user) {
      router.push("/");
      return;
    }

    // Check if we have cached data
    const cachedData = sessionStorage.getItem(
      `chat_${profileId}_${conversationId}`
    );
    if (cachedData) {
      try {
        const { profile, messages } = JSON.parse(cachedData);
        setProfile(profile);
        setMessages(messages);
        setInitialLoading(false);
        return;
      } catch (e) {
        console.error("Error parsing cached data:", e);
        // Continue with normal loading if cache parsing fails
      }
    }

    const fetchData = async () => {
      try {
        setInitialLoading(true);

        // Fetch profile
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("id, platform, username, created_at")
          .eq("id", profileId)
          .single();

        if (profileError) {
          console.error("Profile fetch error:", profileError);
          throw profileError;
        }

        setProfile(profileData);

        // Fetch messages
        const { data: messagesData, error: messagesError } = await supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true });

        if (messagesError) {
          console.error("Messages fetch error:", messagesError);
          throw messagesError;
        }

        // If no messages, add a welcome message
        let finalMessages = messagesData || [];
        if (!messagesData || messagesData.length === 0) {
          const welcomeMessage = {
            id: "welcome",
            conversation_id: conversationId,
            role: "assistant" as const,
            content: getWelcomeMessage(
              profileData.platform,
              profileData.username
            ),
            created_at: new Date().toISOString(),
          };
          finalMessages = [welcomeMessage];

          // Save the welcome message to the database
          const { error: saveError } = await supabase.from("messages").insert([
            {
              conversation_id: conversationId,
              role: "assistant",
              content: welcomeMessage.content,
            },
          ]);

          if (saveError) {
            console.error("Error saving welcome message:", saveError);
          }
        }

        setMessages(finalMessages);

        // Cache the data to prevent unnecessary reloads
        sessionStorage.setItem(
          `chat_${profileId}_${conversationId}`,
          JSON.stringify({
            profile: profileData,
            messages: finalMessages,
          })
        );
      } catch (error) {
        console.error("Data fetch error:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description:
            "Failed to load chat data. Please try refreshing the page.",
        });
      } finally {
        setInitialLoading(false);
      }
    };

    fetchData();
  }, [profileId, conversationId, user, router, toast]);

  // Update cache when messages change
  useEffect(() => {
    if (profile && conversationId && messages.length > 0) {
      sessionStorage.setItem(
        `chat_${profileId}_${conversationId}`,
        JSON.stringify({
          profile,
          messages,
        })
      );
    }
  }, [messages, profile, profileId, conversationId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isThinking]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading || !user) return;

    const userMessage = input.trim();
    setInput("");

    // Add user message to the state
    const newUserMessage = {
      id: `temp-${Date.now()}`,
      conversation_id: conversationId,
      role: "user" as const,
      content: userMessage,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, newUserMessage]);
    setIsThinking(true);

    try {
      // Save user message to the database
      const { data: savedMessage, error: saveError } = await supabase
        .from("messages")
        .insert([
          {
            conversation_id: conversationId,
            role: "user",
            content: userMessage,
          },
        ])
        .select()
        .single();

      if (saveError) {
        console.error("Error saving user message:", saveError);
        throw saveError;
      }

      // Replace the temporary message with the saved one
      setMessages((prev) =>
        prev.map((msg) => (msg.id === newUserMessage.id ? savedMessage : msg))
      );

      // Call API to get AI response
      setLoading(true);
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage,
          conversationId,
          profileId,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = await response.json();

      console.log("Received response from AI API", data);

      // Add AI response to the messages
      const aiMessage = {
        id: `ai-${Date.now()}`,
        conversation_id: conversationId,
        role: "assistant" as const,
        content: data.message,
        created_at: new Date().toISOString(),
      };

      // Save AI message to the database
      const { data: savedAiMessage, error: aiSaveError } = await supabase
        .from("messages")
        .insert([
          {
            conversation_id: conversationId,
            role: "assistant",
            content: data.message,
          },
        ])
        .select()
        .single();

      if (aiSaveError) {
        console.error("Error saving AI message:", aiSaveError);
        throw aiSaveError;
      }

      // Update messages with the saved AI message
      setMessages((prev) => [...prev, savedAiMessage]);
    } catch (error) {
      console.error("Error in chat submission:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send message. Please try again.",
      });
    } finally {
      setLoading(false);
      setIsThinking(false);
    }
  };

  const formatAIResponse = (text: string) => {

    console.log("Recieved response from AI", text);
    // Format links with markdown
    return (
      <div className="prose prose-sm max-w-none">
        <ReactMarkdown
          components={{
            a: ({ node, ...props }) => (
              <a
                {...props}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              />
            ),
            p: ({ node, ...props }) => (
              <p {...props} className="mb-4 last:mb-0 leading-relaxed" />
            ),
            ul: ({ node, ...props }) => (
              <ul {...props} className="list-disc pl-5 mb-4 space-y-2" />
            ),
            ol: ({ node, ...props }) => (
              <ol {...props} className="list-decimal pl-5 mb-4 space-y-2" />
            ),
            li: ({ node, ...props }) => (
              <li {...props} className="mb-1 leading-relaxed" />
            ),
            h1: ({ node, ...props }) => (
              <h1
                {...props}
                className="text-xl font-bold mb-3 mt-6 first:mt-0"
              />
            ),
            h2: ({ node, ...props }) => (
              <h2
                {...props}
                className="text-lg font-bold mb-3 mt-5 first:mt-0"
              />
            ),
            h3: ({ node, ...props }) => (
              <h3 {...props} className="text-base font-bold mb-2 mt-4" />
            ),
            strong: ({ node, ...props }) => (
              <strong {...props} className="font-bold" />
            ),
            em: ({ node, ...props }) => <em {...props} className="italic" />,
            code: ({ node, inline, className, ...props }: any) =>
              inline ? (
                <code
                  {...props}
                  className="bg-gray-100 text-[13px] px-1 py-0.5 rounded font-mono"
                />
              ) : (
                <code
                  {...props}
                  className="block bg-gray-100 text-[13px] p-3 sm:p-4 rounded-md my-3 font-mono overflow-x-auto whitespace-pre"
                />
              ),
            pre: ({ node, ...props }) => (
              <pre
                {...props}
                className="bg-gray-100 p-3 rounded overflow-x-auto mb-4"
              />
            ),
            blockquote: ({ node, ...props }) => (
              <blockquote
                {...props}
                className="border-l-4 border-gray-200 pl-4 italic text-gray-700 mb-4"
              />
            ),
            table: ({ node, ...props }) => (
              <div className="overflow-x-auto mb-4">
                <table
                  {...props}
                  className="min-w-full divide-y divide-gray-200"
                />
              </div>
            ),
            th: ({ node, ...props }) => (
              <th
                {...props}
                className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              />
            ),
            td: ({ node, ...props }) => (
              <td
                {...props}
                className="px-3 py-2 whitespace-nowrap text-sm text-gray-500"
              />
            ),
            img: ({ node, ...props }) => (
              <img
                {...props}
                onError={(e) => handleImageError(e)}
                className="max-w-full h-auto rounded my-4 max-h-64"
              />
            ),
          }}
        >
          {text}
        </ReactMarkdown>
      </div>
    );
  };

  // Add this function to handle image loading errors
  const handleImageError = (
    e: React.SyntheticEvent<HTMLImageElement, Event>
  ) => {
    const target = e.target as HTMLImageElement;

    // If the image is already using the proxy, show a fallback
    if (target.src.startsWith("/api/proxy")) {
      target.src = "/placeholder-image.svg"; // Fallback image
      target.alt = "Image unavailable";
      target.classList.add("opacity-50");
    } else {
      // Try loading through our proxy
      const originalSrc = target.src;
      target.src = getProxiedImageUrl(originalSrc);
    }
  };

  const handleStartNewChat = async () => {
    if (!user || !profile) return;

    try {
      // Navigate to the profile page to create a new conversation
      router.push(`/chat/${profileId}`);
    } catch (error) {
      console.error("Error starting new chat:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to start a new conversation. Please try again.",
      });
    }
  };

  const exportChat = () => {
    try {
      // Format messages for export
      const exportData = messages
        .filter((msg) => msg.id !== "welcome")
        .map((msg) => `${msg.role === "user" ? "You" : "AI"}: ${msg.content}`)
        .join("\n\n");

      // Create file and download
      const blob = new Blob([exportData], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${profile?.platform}-${profile?.username}-chat-${
        new Date().toISOString().split("T")[0]
      }.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Chat exported successfully",
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to export chat",
      });
    }
  };

  // Handle message deletion
  const handleDeleteMessage = async () => {
    if (!messageToDelete) return;
    
    try {
      setDeleteInProgress(true);
      
      // Delete message from database
      const { error } = await supabase
        .from("messages")
        .delete()
        .eq("id", messageToDelete.id);
        
      if (error) {
        throw error;
      }
      
      // Update UI
      setMessages(messages.filter(msg => msg.id !== messageToDelete.id));
      toast({
        title: "Message deleted",
        description: "The message has been deleted successfully",
      });
      
      // Update cache
      if (profile) {
        sessionStorage.setItem(
          `chat_${profileId}_${conversationId}`,
          JSON.stringify({
            profile,
            messages: messages.filter(msg => msg.id !== messageToDelete.id),
          })
        );
      }
    } catch (error) {
      console.error("Error deleting message:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete message. Please try again.",
      });
    } finally {
      setDeleteInProgress(false);
      setDeleteDialogOpen(false);
      setMessageToDelete(null);
    }
  };
  
  // Handle conversation deletion
  const handleDeleteConversation = async () => {
    try {
      setDeleteInProgress(true);
      
      // Delete all messages first (due to foreign key constraint)
      const { error: messagesError } = await supabase
        .from("messages")
        .delete()
        .eq("conversation_id", conversationId);
        
      if (messagesError) {
        throw messagesError;
      }
      
      // Then delete the conversation
      const { error: conversationError } = await supabase
        .from("conversations")
        .delete()
        .eq("id", conversationId);
        
      if (conversationError) {
        throw conversationError;
      }
      
      toast({
        title: "Conversation deleted",
        description: "The conversation has been deleted successfully",
      });
      
      // Clear cache
      sessionStorage.removeItem(`chat_${profileId}_${conversationId}`);
      
      // Redirect to chats page
      router.push("/chats");
    } catch (error) {
      console.error("Error deleting conversation:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete conversation. Please try again.",
      });
    } finally {
      setDeleteInProgress(false);
      setDeleteDialogOpen(false);
    }
  };
  
  // Function to open delete dialog
  const openDeleteDialog = (type: "message" | "conversation", message?: Message) => {
    setDeleteType(type);
    if (type === "message" && message) {
      setMessageToDelete(message);
    }
    setDeleteDialogOpen(true);
  };

  // Loading state UI
  if (initialLoading) {
    return (
      <div className="flex h-screen flex-col bg-white">
        <div className="border-b p-3 sm:p-4 flex justify-between items-center bg-white">
          <div className="flex items-center gap-2">
            <div className="h-8 w-20 bg-gradient-to-r from-gray-100 to-gray-200 animate-shimmer rounded-full" />
            <div className="h-8 w-8 bg-gradient-to-r from-gray-100 to-gray-200 animate-shimmer rounded-full" />
            <div className="space-y-2">
              <div className="h-4 w-24 bg-gradient-to-r from-gray-100 to-gray-200 animate-shimmer rounded" />
              <div className="h-4 w-16 bg-gradient-to-r from-gray-100 to-gray-200 animate-shimmer rounded" />
            </div>
          </div>
        </div>

        <div className="flex-1 p-4 sm:p-6">
          <div className="max-w-3xl mx-auto space-y-6">
            <ShimmerMessage />
            <div className="flex justify-end">
              <div className="w-2/3">
                <div className="space-y-2">
                  <div className="h-4 w-full bg-gradient-to-r from-gray-100 to-gray-200 animate-shimmer rounded" />
                  <div className="h-4 w-3/4 bg-gradient-to-r from-gray-100 to-gray-200 animate-shimmer rounded" />
                </div>
              </div>
            </div>
            <ShimmerMessage />
          </div>
        </div>

        <div className="border-t p-4 flex justify-center items-center bg-white">
          <div className="flex flex-col items-center gap-2">
            <div className="relative flex items-center">
              <div className="h-10 w-64 sm:w-96 bg-gradient-to-r from-gray-100 to-gray-200 animate-shimmer rounded-full" />
            </div>
            <p className="text-xs sm:text-sm text-gray-500">
              Loading conversation...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Profile not found UI
  if (!profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
        <div className="text-lg sm:text-xl font-medium mb-3 sm:mb-4 text-center">
          Profile not found
        </div>
        <p className="text-gray-500 mb-5 sm:mb-6 text-center text-sm sm:text-base">
          The profile you're looking for doesn't exist or is still processing
        </p>
        <Button
          onClick={() => router.push("/chats")}
          className="gap-2 text-sm rounded-full"
        >
          <ChevronLeft className="h-4 w-4" />
          Return to Chats
        </Button>
      </div>
    );
  }

  const displayUsername = sanitizeUsername(profile.username, profile.platform);

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Fixed Header */}
      <div className="sticky top-0 z-10 border-b border-gray-100 p-3 sm:p-4 flex justify-between items-center bg-white/95 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/chats")}
            className="h-8 sm:h-9 text-sm hover:bg-gray-100 rounded-full px-3 sm:px-4"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full bg-gray-100">
              {profile?.platform === "instagram" ? (
                <Instagram className="h-4 w-4 sm:h-5 sm:w-5 text-gray-700" />
              ) : (
                <Linkedin className="h-4 w-4 sm:h-5 sm:w-5 text-gray-700" />
              )}
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-medium">{displayUsername}</h1>
              <p className="text-gray-500 mt-0.5 flex items-center gap-1 text-[10px] sm:text-xs">
                <CalendarClock className="h-3 w-3" />
                Last updated{" "}
                {profile.created_at
                  ? formatDistanceToNow(new Date(profile.created_at), { addSuffix: true })
                  : 'Unknown'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleStartNewChat}
            className="h-8 sm:h-9 text-sm hover:bg-gray-100 rounded-full px-3 sm:px-4 gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            New Chat
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-gray-100 rounded-full"
              >
                <MoreVertical className="h-4 w-4 text-gray-600" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem 
                className="text-sm cursor-pointer flex items-center gap-2"
                onClick={exportChat}
              >
                <Download className="h-4 w-4" />
                Export Chat
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="text-sm cursor-pointer flex items-center gap-2"
                onClick={() => router.push(`/analysis/${profileId}`)}
              >
                <BarChart2 className="h-4 w-4" />
                View Analysis
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="text-red-600 cursor-pointer flex items-center gap-2 text-sm"
                onClick={() => openDeleteDialog("conversation")}
              >
                <Trash className="h-4 w-4" />
                Delete Conversation
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Scrollable Messages Area */}
      <div className="flex-1 overflow-y-auto bg-gray-50/50">
        <div className="px-4 sm:px-8 py-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((message) => (
              <div key={message.id} className={`${message.role === "user" ? "flex justify-end" : ""}`}>
                {message.role === "assistant" && (
                  <div className="flex items-center mb-1.5 text-[10px] sm:text-xs text-gray-500">
                    <div className="bg-white p-1 rounded-full mr-1.5">
                      <div className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-gray-600">
                        <BotIcon />
                      </div>
                    </div>
                    AI Assistant
                  </div>
                )}

                <div
                  className={`
                    ${
                      message.role === "user"
                        ? "bg-white border border-gray-200 text-gray-800 ml-12 sm:ml-24"
                        : "bg-white border border-gray-200 text-gray-800 mr-12 sm:mr-24"
                    } rounded-2xl p-3.5 sm:p-4 max-w-[85%] sm:max-w-[75%] shadow-sm relative group
                  `}
                >
                  {message.role === "user" ? (
                    <>
                      <div className="text-sm leading-relaxed">{message.content}</div>
                      <button 
                        onClick={() => openDeleteDialog("message", message)}
                        className="absolute -right-1.5 -top-1.5 h-6 w-6 bg-white rounded-full border border-gray-200 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-gray-50"
                      >
                        <X className="h-3 w-3 text-gray-600" />
                      </button>
                    </>
                  ) : (
                    <div className="text-sm leading-relaxed">
                      {formatAIResponse(message.content)}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isThinking && (
              <div>
                <div className="flex items-center mb-1.5 text-[10px] sm:text-xs text-gray-500">
                  <div className="bg-white p-1 rounded-full mr-1.5">
                    <div className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-gray-600">
                      <BotIcon />
                    </div>
                  </div>
                  AI Assistant
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl p-3.5 sm:p-4 max-w-[85%] sm:max-w-[75%] mr-12 sm:mr-24 shadow-sm">
                  <div className="flex flex-col">
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        <div
                          className="h-2 w-2 bg-gray-400/50 rounded-full animate-pulse"
                          style={{ animationDelay: "0s" }}
                        />
                        <div
                          className="h-2 w-2 bg-gray-400/50 rounded-full animate-pulse"
                          style={{ animationDelay: "0.2s" }}
                        />
                        <div
                          className="h-2 w-2 bg-gray-400/50 rounded-full animate-pulse"
                          style={{ animationDelay: "0.4s" }}
                        />
                      </div>
                    </div>
                    <ThinkingTimer />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} className="h-6 sm:h-10" />
          </div>
        </div>
      </div>

      {/* Fixed Footer */}
      <div className="sticky bottom-0 border-t border-gray-100 py-3 sm:py-4 px-4 sm:px-8 bg-white/95 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleSubmit} className="relative">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask something about this profile..."
              className="w-full text-sm pl-4 pr-12 border border-gray-200 h-11 sm:h-12 py-2 sm:py-3 rounded-full focus-visible:ring-1 focus-visible:ring-gray-200 focus:border-gray-300 shadow-none bg-gray-50/50 hover:bg-gray-100/50 transition-colors"
              disabled={loading}
            />
            <Button
              type="submit"
              size="icon"
              disabled={loading || !input.trim()}
              className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-gray-900 hover:bg-gray-800 text-white flex items-center justify-center shadow-none transition-colors disabled:bg-gray-200"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <SendHorizontal className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteType === "message" ? "Delete message?" : "Delete entire conversation?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteType === "message" 
                ? "This action cannot be undone. The message will be permanently deleted."
                : "This action cannot be undone. All messages in this conversation will be permanently deleted."
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteInProgress}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteType === "message" ? handleDeleteMessage : handleDeleteConversation}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={deleteInProgress}
            >
              {deleteInProgress ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
