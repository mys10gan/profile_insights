"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useSupabase } from "@/components/providers/supabase-provider";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";
import { use } from "react";

interface PageParams {
  profileId: string;
}

export default function ProfileChatRedirect({ params }: { params: Promise<PageParams> }) {
  const router = useRouter();
  const { user } = useSupabase();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const unwrappedParams = use(params);
  const profileId = unwrappedParams.profileId;

  useEffect(() => {
    if (!user || !profileId) {
      router.push("/");
      return;
    }

    const createNewConversation = async () => {
      try {
        setIsLoading(true);
        
        // Check if the profile exists and belongs to the user
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", profileId)
          .eq("user_id", user.id)
          .single();
        
        if (profileError || !profileData) {
          console.error("Profile not found or doesn't belong to user:", profileError);
          toast({
            variant: "destructive",
            title: "Error",
            description: "Profile not found or you don't have access to it.",
          });
          router.push("/chats");
          return;
        }
        
        // Create a new conversation
        const { data: newConversation, error: conversationError } = await supabase
          .from("conversations")
          .insert([
            {
              user_id: user.id,
              profile_id: profileId,
            },
          ])
          .select();
        
        if (conversationError || !newConversation || newConversation.length === 0) {
          console.error("Error creating new conversation:", conversationError);
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to create a new conversation. Please try again.",
          });
          router.push("/chats");
          return;
        }
        
        // Redirect to the new conversation
        router.push(`/chat/${profileId}/${newConversation[0].id}`);
      } catch (error) {
        console.error("Error in createNewConversation:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Something went wrong. Please try again.",
        });
        router.push("/chats");
      } finally {
        setIsLoading(false);
      }
    };

    createNewConversation();
  }, [profileId, router, user, toast]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="flex flex-col items-center gap-4 p-8 bg-white rounded-xl shadow-sm max-w-md w-full">
        <Loader2 className="h-10 w-10 animate-spin text-gray-400" />
        <h1 className="text-xl font-medium text-center">Creating a new conversation...</h1>
        <p className="text-gray-500 text-center text-sm">
          Please wait while we set up your conversation for this profile.
        </p>
      </div>
    </div>
  );
} 