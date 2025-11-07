'use client';

import { cn } from "@/lib/utils";
import type { Message } from "@/lib/communityService";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User as UserIcon, MoreHorizontal, Reply, Edit, Trash2, Smile, ThumbsUp, Heart, Laugh, Sparkles, Frown, Angry } from "lucide-react";
import Link from 'next/link';
import { WaveformAudioPlayer } from './WaveformAudioPlayer';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "../ui/button";
import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useState, useMemo } from "react";
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { motion } from 'framer-motion';
import { toggleMessageReaction } from '@/lib/communityService';
import { useAuthStore } from '@/stores/auth-store';


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

const reactionIcons: {[key: string]: React.FC<any>} = {
    like: ThumbsUp,
    love: Heart,
    haha: Laugh,
    wow: Sparkles,
    sad: Frown,
    angry: Angry,
};

const reactionColors: {[key: string]: string} = {
    like: 'text-blue-500',
    love: 'text-red-500',
    haha: 'text-yellow-500',
    wow: 'text-indigo-400',
    sad: 'text-yellow-600',
    angry: 'text-orange-600'
};

export function ChatMessage({ message, profile, isCurrentUser, isDM = false, onReply, onEdit, onDelete }: ChatMessageProps) {
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const { user: currentUser } = useAuthStore();
  
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
  
  const messageTimestamp = message.timestamp?.toDate ? format(message.timestamp.toDate(), 'p') : '';
  const wasEdited = !!message.updatedAt;

  const reactionCounts = useMemo(() => {
    if (!message.reactions) return {};
    return Object.values(message.reactions).reduce((acc, reaction) => {
        acc[reaction] = (acc[reaction] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
  }, [message.reactions]);

  const topReactions = useMemo(() => {
    return Object.entries(reactionCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([type]) => type);
  }, [reactionCounts]);

  const handleReaction = async (reactionType: string) => {
    if(!currentUser) return;
    const chatId = message.chatId || message.channelId;
    if(!chatId) return;
    await toggleMessageReaction(chatId, message.id, currentUser.uid, reactionType, isDM);
  }


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
            {!isDM && <p className="font-semibold text-slate-400">{getTruncatedName(message.replyTo.userName)}:</p>}
            <p className="text-slate-400 line-clamp-1">{message.replyTo.content}</p>
        </div>
      )}
      <div className={cn("flex items-end gap-2 max-w-[80%]", isCurrentUser && "flex-row-reverse", isDM && "max-w-full")}>
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
            <div className={cn("flex items-center gap-1", isCurrentUser ? 'flex-row-reverse' : 'flex-row')}>
                <Popover>
                    <PopoverTrigger asChild>
                         <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full opacity-0 group-hover:opacity-100">
                           <Smile size={16}/>
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-1 rounded-full bg-slate-800 border-slate-700">
                        <div className="flex gap-1">
                           {Object.keys(reactionIcons).map(reaction => {
                                const Icon = reactionIcons[reaction];
                                return (
                                    <motion.button key={reaction} whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.9 }} className="p-1.5 rounded-full hover:bg-white/20" onClick={() => handleReaction(reaction)}>
                                        <Icon className={reactionColors[reaction]}/>
                                    </motion.button>
                                )
                           })}
                        </div>
                    </PopoverContent>
                 </Popover>
                {isCurrentUser && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full opacity-0 group-hover:opacity-100">
                               <MoreHorizontal size={16}/>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem onSelect={() => onEdit(message)}><Edit className="mr-2 h-4 w-4"/>Edit</DropdownMenuItem>
                            <AlertDialog onOpenChange={setIsDeleteAlertOpen} open={isDeleteAlertOpen}>
                              <AlertDialogTrigger asChild>
                                 <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-400"><Trash2 className="mr-2 h-4 w-4"/>Delete</DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action will permanently delete this message.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => onDelete(message)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
                 {!isCurrentUser && (
                     <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full opacity-0 group-hover:opacity-100" onClick={() => onReply(message)}>
                        <Reply size={16}/>
                    </Button>
                )}
            </div>
            <div className={cn("px-4 py-2 rounded-2xl relative", bubbleClass, message.audioUrl && "p-2")}>
                {!isCurrentUser && !isDM && (
                     <p className="text-xs font-bold text-slate-400 mb-1">{senderName}</p>
                )}
                {message.audioUrl ? (
                    <WaveformAudioPlayer src={message.audioUrl} isCurrentUser={isCurrentUser} />
                ) : (
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                )}

                 {topReactions.length > 0 && (
                    <div className={cn("absolute -bottom-3 flex items-center bg-slate-800 rounded-full border border-slate-700 px-1 py-0.5", isCurrentUser ? 'right-2' : 'left-2')}>
                        <div className="flex -space-x-1">
                            {topReactions.map(r => {
                                const Icon = reactionIcons[r];
                                return <Icon key={r} className={`${reactionColors[r]} h-3 w-3`} />;
                            })}
                        </div>
                        <span className="ml-1.5 text-xs font-mono">{Object.keys(message.reactions || {}).length}</span>
                    </div>
                )}
            </div>
        </div>
      </div>
      <div className={cn("text-xs text-slate-500 flex items-center gap-1.5", isCurrentUser ? 'mr-10' : (isDM ? '' : 'ml-10') )}>
          <span>{messageTimestamp}</span>
          {wasEdited && <span>(edited)</span>}
      </div>
    </div>
  );
}
