'use client';
import { useState, useMemo, useEffect, useRef, use } from 'react';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useAuthStore } from '@/stores/auth-store';
import { type DirectMessage, type Message, sendDirectMessage, updateDirectMessage, deleteDirectMessage } from '@/lib/communityService';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ChatMessage } from '@/components/community/ChatMessage';
import { ChatInput } from '@/components/community/ChatInput';
import { useUserProfile } from '@/hooks/use-user-profile';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User as UserIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ImagePreviewDialog } from '@/components/community/ImagePreviewDialog';

export default function DirectMessagePage({ params }: { params: { chatId: string } }) {
  const { chatId } = use(params);
  const { user: currentUser } = useAuthStore();
  const router = useRouter();
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);


  const { data: chat, loading: loadingChat } = useDoc<DirectMessage>('directMessages', chatId);
  
  const otherParticipantId = useMemo(() => {
    if (!chat || !currentUser) return null;
    return chat.participants.find(p => p !== currentUser.uid);
  }, [chat, currentUser]);

  const { userProfile: otherUser, loading: loadingOtherUser } = useUserProfile(otherParticipantId);
  
  const { data: messages, loading: loadingMessages } = useCollection<Message>(`directMessages/${chatId}/messages`, {
    orderBy: ['timestamp', 'asc']
  });

  const participantIds = useMemo(() => {
    if (!chat) return [];
    return chat.participants;
  }, [chat]);
  
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
    if (!loadingMessages) {
        scrollToBottom();
    }
  }, [loadingMessages]);

  useEffect(() => {
     if (messagesContainerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
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
    if (!currentUser || !chatId) return;
    await sendDirectMessage(chatId, currentUser.uid, content, media, replyTo);
  };
  
  const handleEditMessage = async (message: Message, newContent: string) => {
    if (!chatId) return;
    await updateDirectMessage(chatId, message.id, newContent);
  }

  const handleDeleteMessage = async (message: Message) => {
    if (!chatId) return;
    await deleteDirectMessage(chatId, message.id);
  }


  const isLoading = loadingChat || loadingOtherUser || (loadingMessages && !messages) || (loadingProfiles && !profiles);

  return (
    <div className="flex flex-col h-full overflow-hidden relative">
      <header className="flex-shrink-0 flex items-center gap-2 p-3 border-b border-white/10">
        <Button variant="ghost" size="icon" className="rounded-full h-9 w-9" onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        {isLoading || !otherUser ? (
          <div className="flex items-center gap-3">
             <Skeleton className="h-9 w-9 rounded-full" />
             <Skeleton className="h-6 w-40" />
          </div>
        ) : (
          <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarImage src={otherUser.photoURL || ''} alt={otherUser.displayName || 'User'} />
                <AvatarFallback>{otherUser.displayName?.[0] || <UserIcon />}</AvatarFallback>
              </Avatar>
              <h1 className="text-lg font-bold text-white">{getTruncatedName(otherUser.displayName)}</h1>
          </div>
        )}
      </header>

      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-6">
        {isLoading ? (
          <div className="p-4 space-y-4">
              <Skeleton className="h-8 w-1/2" />
          </div>
        ) : (
          messages?.map(message => (
            <ChatMessage
              key={message.id}
              message={message}
              profile={profilesMap.get(message.userId)}
              isCurrentUser={message.userId === currentUser?.uid}
              isDM={true}
              onReply={setReplyingTo}
              onEdit={setEditingMessage}
              onDelete={handleDeleteMessage}
            />
          ))
        )}
         {showScrollToBottom && (
            <button
                onClick={() => scrollToBottom('smooth')}
                className="absolute bottom-24 right-6 z-20 w-9 h-9 rounded-full border border-white/20 bg-slate-800/80 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/10 transition-all active:scale-90"
                aria-label="Scroll to bottom"
            >
                <ChevronDown className="w-5 h-5" />
            </button>
        )}
      </div>

      <div className="p-2 border-t border-white/10 flex-shrink-0">
        <ChatInput 
            onSendMessage={handleSendMessage} 
            showAnonymousOption={false}
            replyingTo={replyingTo}
            onClearReply={() => setReplyingTo(null)}
            editingMessage={editingMessage}
            onEditMessage={handleEditMessage}
            onClearEditing={() => setEditingMessage(null)}
            isDM={true}
        />
      </div>
    </div>
  );
}

const getTruncatedName = (name: string | undefined, count = 2) => {
    if (!name) return 'User';
    const nameParts = name.split(' ');
    return nameParts.slice(0, count).join(' ');
};
