'use client';

import { cn } from "@/lib/utils";
import type { Message } from "@/lib/communityService";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User as UserIcon } from "lucide-react";
import Link from 'next/link';

interface ChatMessageProps {
  message: Message;
  profile: any;
  isCurrentUser: boolean;
}

export function ChatMessage({ message, profile, isCurrentUser }: ChatMessageProps) {
  const alignClass = isCurrentUser ? 'items-end' : 'items-start';
  const bubbleClass = isCurrentUser
    ? 'bg-blue-600 text-white rounded-br-none'
    : 'bg-slate-700 text-slate-200 rounded-bl-none';

  const senderName = message.isAnonymous ? "Anonymous User" : profile?.displayName || '...';
  const avatarUrl = message.isAnonymous ? '' : profile?.photoURL;
  const fallbackInitial = message.isAnonymous ? 'A' : senderName.charAt(0).toUpperCase();
  const username = profile?.username;

  const userLink = !isCurrentUser && !message.isAnonymous && username
    ? `/users/${username}`
    : '#';
  const isLink = userLink !== '#';

  return (
    <div className={cn("flex flex-col gap-2", alignClass)}>
      <div className={cn("flex items-end gap-2 max-w-[80%]", isCurrentUser && "flex-row-reverse")}>
        {!isCurrentUser && (
            <Link href={userLink} className={cn(!isLink && "pointer-events-none")}>
                <Avatar className="h-8 w-8">
                <AvatarImage src={avatarUrl} alt={senderName} />
                <AvatarFallback>{fallbackInitial}</AvatarFallback>
                </Avatar>
            </Link>
        )}
        <div
          className={cn("px-4 py-2 rounded-2xl", bubbleClass)}
        >
            {!isCurrentUser && (
                 <Link href={userLink} className={cn(!isLink && "pointer-events-none")}>
                    <p className="text-xs font-bold text-slate-400 mb-1 hover:underline">{senderName}</p>
                 </Link>
            )}
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    </div>
  );
}
