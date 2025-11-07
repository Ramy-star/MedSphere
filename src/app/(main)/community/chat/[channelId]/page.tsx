'use client';
import { useState, useMemo, useEffect, useRef } from 'react';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useAuthStore } from '@/stores/auth-store';
import { type Channel, type Message, sendMessage } from '@/lib/communityService';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ChatMessage } from '@/components/community/ChatMessage';
import { ChatInput } from '@/components/community/ChatInput';
import { useUserProfile } from '@/hooks/use-user-profile';
import { Skeleton } from '@/components/ui/skeleton';

export default function ChatPage({ params }: { params: { channelId: string } }) {
  const { channelId } = params;
  const { user } = useAuthStore();
  const router = useRouter();
  const messagesContainerRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    // Scroll to the bottom when messages load or a new message is added
    if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages, loadingMessages]);


  const handleSendMessage = async (content: string, isAnonymous: boolean) => {
    if (!user || !channelId) return;
    try {
        await sendMessage(channelId, user.uid, content, isAnonymous);
    } catch (error) {
        console.error("Failed to send message:", error);
        // Optionally, show a toast to the user
    }
  };

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
    <div className="flex flex-col h-full overflow-hidden">
      <header className="flex-shrink-0 flex items-center gap-2 p-3 border-b border-white/10">
        <Button variant="ghost" size="icon" className="rounded-full h-9 w-9" onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        {loadingChannel ? (
            <Skeleton className="h-6 w-40" />
        ) : (
            <h1 className="text-lg font-bold text-white">{channel?.name}</h1>
        )}
      </header>

      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-6">
        {(loadingMessages || loadingProfiles) && (!messages || !profiles) ? (
          <LoadingSkeleton />
        ) : (
          messages?.map(message => (
            <ChatMessage
              key={message.id}
              message={message}
              profile={profilesMap.get(message.userId)}
              isCurrentUser={message.userId === user?.uid}
            />
          ))
        )}
      </div>

      <div className="p-4 border-t border-white/10">
        <ChatInput onSendMessage={handleSendMessage} />
      </div>
    </div>
  );
}
