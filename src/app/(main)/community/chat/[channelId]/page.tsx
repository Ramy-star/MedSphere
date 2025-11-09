'use client';
import { useState, useMemo, useEffect, useRef } from 'react';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useAuthStore } from '@/stores/auth-store';
import { type Channel, type Message, sendMessage, updateMessage, deleteMessage } from '@/lib/communityService';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ChatMessage } from '@/components/community/ChatMessage';
import { ChatInput } from '@/components/community/ChatInput';
import { useUserProfile } from '@/hooks/use-user-profile';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { isSameDay, isAfter, subMinutes } from 'date-fns';
import { useParams } from 'next/navigation';


export default function ChatPage() {
  const params = useParams();
  const channelId = params.channelId as string;
  const { user } = useAuthStore();
  const router = useRouter();
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);


  const { data: channel, loading: loadingChannel } = useDoc<Channel>('channels', channelId);
  const { data: messages, loading: loadingMessages } = useCollection<Message>(`channels/${channelId}/messages`, {
    orderBy: ['timestamp', 'asc']
  });

  const participantIds = useMemo(() => {
    if (!messages) return [];
    return [...new Set(messages.map(m => m.userId))];
  }, [messages]);

  const { data: profiles, loading: loadingProfiles } = useCollection<any>('users', {
    where: ['uid', 'in', participantIds.length > 0 ? participantIds : ['dummy-id']],
    disabled: participantIds.length === 0,
  });

  const profilesMap = useMemo(() => {
    const map = new Map<string, any>();
    profiles?.forEach(p => map.set(p.uid, p));
    return map;
  }, [profiles]);
  
  const scrollToBottom = (behavior: 'smooth' | 'auto' = 'auto') => {
    if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTo({
            top: messagesContainerRef.current.scrollHeight,
            behavior: behavior
        });
    }
  };

  useEffect(() => {
    // Scroll to the bottom when messages load for the first time
    if (!loadingMessages) {
        scrollToBottom();
    }
  }, [loadingMessages]);

  useEffect(() => {
    // Scroll to bottom when a new message is added, but only if user is near the bottom
     if (messagesContainerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
        // The threshold of 100px allows some space for the user to be slightly scrolled up
        if (scrollHeight - scrollTop <= clientHeight + 100) {
            scrollToBottom('smooth');
        }
    }
  }, [messages]);
  
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
        const { scrollTop, scrollHeight, clientHeight } = container;
        const isScrolledUp = scrollHeight - scrollTop > clientHeight + 150;
        setShowScrollToBottom(isScrolledUp);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);



  const handleSendMessage = async (content: string, isAnonymous: boolean, media?: { file: File, type: 'image' | 'audio', duration?: number }, replyTo?: Message['replyTo']) => {
    if (!user || !channelId) return;
    try {
        await sendMessage(channelId, user.uid, content, isAnonymous, media, replyTo);
    } catch (error) {
        console.error("Failed to send message:", error);
    }
  };
  
  const handleEditMessage = async (message: Message, newContent: string) => {
    if (!channelId) return;
    await updateMessage(channelId, message.id, newContent);
  }

  const handleDeleteMessage = async (message: Message) => {
    if (!channelId) return;
    await deleteMessage(channelId, message.id);
  }


  const LoadingSkeleton = () => (
    <div className="p-4 space-y-4">
      <Skeleton className="h-8 w-1/2" />
      <div className="flex items-center space-x-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-[250px]" />
          <Skeleton className="h-4 w-[200px]" />
        </div>
      </div>
      <div className="flex items-center space-x-4 justify-end">
        <div className="space-y-2 text-right">
          <Skeleton className="h-4 w-[250px] ml-auto" />
        </div>
        <Skeleton className="h-12 w-12 rounded-full" />
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full overflow-hidden relative">
      <header className="flex-shrink-0 flex items-center gap-2 p-3 border-b border-white/10 bg-black/20">
        <Button variant="ghost" size="icon" className="rounded-full h-9 w-9" onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        {loadingChannel ? (
            <Skeleton className="h-6 w-40" />
        ) : (
            <h1 className="text-lg font-bold text-white">{channel?.name}</h1>
        )}
      </header>

      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-1">
        {(loadingMessages || loadingProfiles) && (!messages || !profiles) ? (
          <LoadingSkeleton />
        ) : (
          messages?.map((message, index) => {
            const previousMessage = messages[index - 1];
            // A message is consecutive if it's from the same user, with the same anonymity status,
            // and sent within 5 minutes of the previous one.
            const isConsecutive = 
              previousMessage &&
              previousMessage.userId === message.userId &&
              previousMessage.isAnonymous === message.isAnonymous &&
              message.timestamp && previousMessage.timestamp &&
              isAfter(message.timestamp.toDate(), subMinutes(previousMessage.timestamp.toDate(), -5));

            return (
                <ChatMessage
                  key={message.id}
                  message={message}
                  profile={profilesMap.get(message.userId)}
                  isCurrentUser={message.userId === user?.uid}
                  isConsecutive={isConsecutive}
                  onReply={setReplyingTo}
                  onEdit={setEditingMessage}
                  onDelete={handleDeleteMessage}
                />
            );
          })
        )}
      </div>

       {showScrollToBottom && (
            <button
                onClick={() => scrollToBottom('smooth')}
                className="absolute bottom-24 right-6 z-20 w-9 h-9 rounded-full border border-white/20 bg-slate-800/80 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/10 transition-all active:scale-90"
                aria-label="Scroll to bottom"
            >
                <ChevronDown className="w-5 h-5" />
            </button>
        )}

      <div className="p-2 border-t border-white/10 bg-black/20">
        <ChatInput 
            onSendMessage={handleSendMessage} 
            showAnonymousOption={true}
            replyingTo={replyingTo}
            onClearReply={() => setReplyingTo(null)}
            editingMessage={editingMessage}
            onEditMessage={handleEditMessage}
            onClearEditing={() => setEditingMessage(null)}
        />
      </div>
    </div>
  );
}
