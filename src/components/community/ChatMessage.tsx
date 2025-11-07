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
  isDM?: boolean;
}

const getTruncatedName = (name: string | undefined, count = 2) => {
    if (!name) return 'User';
    const nameParts = name.split(' ');
    return nameParts.slice(0, count).join(' ');
};

export function ChatMessage({ message, profile, isCurrentUser, isDM = false }: ChatMessageProps) {
  const alignClass = isCurrentUser ? 'items-end' : 'items-start';
  const bubbleClass = isCurrentUser
    ? 'bg-blue-600 text-white rounded-br-none'
    : 'bg-slate-700 text-slate-200 rounded-bl-none';

  const senderName = message.isAnonymous
    ? "Anonymous User"
    : isDM
    ? getTruncatedName(profile?.displayName)
    : profile?.displayName || '...';
    
  const avatarUrl = message.isAnonymous ? '' : profile?.photoURL;
  const fallbackInitial = message.isAnonymous ? 'A' : (profile?.displayName || 'U').charAt(0).toUpperCase();
  const username = profile?.username;

  const isLink = !isCurrentUser && !message.isAnonymous && username && !isDM;

  const AvatarComponent = (
    <Avatar className="h-8 w-8">
        <AvatarImage src={avatarUrl} alt={senderName} />
        <AvatarFallback>{fallbackInitial}</AvatarFallback>
    </Avatar>
  );

  return (
    <div className={cn("flex flex-col gap-2", alignClass)}>
      <div className={cn("flex items-end gap-2 max-w-[80%]", isCurrentUser && "flex-row-reverse")}>
        {!isCurrentUser && (
            isLink ? (
                <Link href={`/users/${username}`}>
                    {AvatarComponent}
                </Link>
            ) : (
                <div className="cursor-default">{AvatarComponent}</div>
            )
        )}
        <div
          className={cn("px-4 py-2 rounded-2xl", bubbleClass)}
        >
            {!isCurrentUser && (
                 <p className="text-xs font-bold text-slate-400 mb-1">{senderName}</p>
            )}
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    </div>
  );
}
