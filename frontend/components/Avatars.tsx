"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { Button } from "@/components/ui/button";
import { Share2 } from "lucide-react";
import { toast } from "sonner";

interface User {
  name: string;
  color: string;
}

interface AvatarsProps {
  users: User[];
}

export default function Avatars({ users }: AvatarsProps) {
  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard!");
    } catch (error) {
      toast.error("Failed to copy link");
      console.error("Share error:", error);
    }
  };

  return (
    <div className="fixed top-4 right-4 flex items-center gap-2 mr-16">
      <TooltipProvider>
        {users.map((user) => (
          <Tooltip key={user.name}>
            <TooltipTrigger asChild>
              <Avatar style={{ backgroundColor: user.color }}>
                <AvatarFallback className="text-white" style={{ backgroundColor: user.color }}>
                  {user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent>
              <p>{user.name}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button onClick={handleShare} variant="outline" size="icon" className="h-8 w-8">
            <Share2 className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Share project</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
