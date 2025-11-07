'use client';

import { cn } from "@/lib/utils";
import type { Message } from "@/lib/communityService";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User as UserIcon, MoreHorizontal, Reply, Edit, Trash2 } from "lucide-react";
import Link from 'next/link';
import { AudioPlayer } from './AudioPlayer';
import { useAuthStore } from "@/stores/auth-store";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "../ui/button";

interface ChatMessageProps {
  message: Message;
  profile: any;
  isCurrentUser: boolean;
  isDM?: boolean;
  onReply: (message: Message) => void;
  onEdit: (message: Message) => void;
  onDelete: (message: Message) => void;
}

const getTruncatedName = (name: string | undefined, count = 2) => {
    if (!name) return 'User';
    const nameParts = name.split(' ');
    return nameParts.slice(0, count).join(' ');
};

export function ChatMessage({ message, profile, isCurrentUser, isDM = false, onReply, onEdit, onDelete }: ChatMessageProps) {
  const alignClass = isCurrentUser ? 'items-end' : 'items-start';
  const bubbleClass = isCurrentUser
    ? 'bg-blue-600 text-white rounded-br-none'
    : 'bg-slate-700 text-slate-200 rounded-bl-none';

  const senderName = message.isAnonymous
    ? "Anonymous User"
    : getTruncatedName(profile?.displayName);
    
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
    <div className={cn("flex flex-col gap-2 group", alignClass)}>
       {message.replyTo && (
        <div className="flex items-center gap-2 max-w-[80%] text-xs border-l-2 border-slate-500 pl-2 ml-10 mr-2">
            <p className="font-semibold text-slate-400">{message.replyTo.userName}:</p>
            <p className="text-slate-400 line-clamp-1">{message.replyTo.content}</p>
        </div>
      )}
      <div className={cn("flex items-end gap-2 max-w-[80%]", isCurrentUser && "flex-row-reverse")}>
        {!isCurrentUser && !isDM && (
            isLink ? (
                <Link href={`/users/${username}`}>
                    {AvatarComponent}
                </Link>
            ) : (
                <div className="cursor-default">{AvatarComponent}</div>
            )
        )}
        <div className="flex items-center gap-2">
             {isCurrentUser && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full opacity-0 group-hover:opacity-100">
                           <MoreHorizontal size={16}/>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem onSelect={() => onEdit(message)}><Edit className="mr-2 h-4 w-4"/>Edit</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => onDelete(message)} className="text-red-400"><Trash2 className="mr-2 h-4 w-4"/>Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )}
             {!isCurrentUser && (
                 <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full opacity-0 group-hover:opacity-100" onClick={() => onReply(message)}>
                    <Reply size={16}/>
                </Button>
            )}
            <div className={cn("px-4 py-2 rounded-2xl", bubbleClass)}>
                {!isCurrentUser && !isDM && (
                     <p className="text-xs font-bold text-slate-400 mb-1">{senderName}</p>
                )}
                {message.audioUrl ? (
                    <AudioPlayer src={message.audioUrl} />
                ) : (
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                )}
            </div>
        </div>
      </div>
    </div>
  );
}
