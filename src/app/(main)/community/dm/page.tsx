'use client';
import { useMemo } from 'react';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useAuthStore } from '@/stores/auth-store';
import { type DirectMessage } from '@/lib/communityService';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User as UserIcon, Loader2, Inbox, ArrowLeft } from 'lucide-react';
import { useUserProfile } from '@/hooks/use-user-profile';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

const getTruncatedName = (name: string | undefined, count = 2) => {
    if (!name) return 'User';
    const nameParts = name.split(' ');
    return nameParts.slice(0, count).join(' ');
};

const ChatListItem = ({ chat }: { chat: DirectMessage }) => {
  const { user: currentUser } = useAuthStore();
  const otherParticipantId = useMemo(() => {
    if (!chat || !chat.participants) return null;
    return chat.participants.find(p => p !== currentUser?.uid);
  }, [chat, currentUser]);

  const { userProfile: otherUser, loading } = useUserProfile(otherParticipantId);

  if (loading) {
    return (
      <div className="flex items-center gap-4 p-3 rounded-lg">
        <div className="w-12 h-12 rounded-full bg-slate-800 animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-1/3 rounded-md bg-slate-800 animate-pulse" />
          <div className="h-3 w-2/3 rounded-md bg-slate-800 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!otherUser) return null;

  return (
    <Link href={`/community/dm/${chat.id}`} className="block">
      <motion.div 
        className="flex items-center gap-4 p-3 rounded-lg transition-colors hover:bg-white/10"
        whileHover={{ x: 5 }}
      >
        <Avatar className="h-12 w-12">
          <AvatarImage src={otherUser.photoURL || ''} alt={otherUser.displayName || 'User'} />
          <AvatarFallback>{otherUser.displayName?.[0] || <UserIcon />}</AvatarFallback>
        </Avatar>
        <div className="flex-1 overflow-hidden">
          <div className="flex justify-between items-start">
            <h3 className="font-bold text-white truncate">{getTruncatedName(otherUser.displayName)}</h3>
            {chat.lastMessage?.timestamp && (
              <p className="text-xs text-slate-500 shrink-0 ml-2">
                {formatDistanceToNow(new Date(chat.lastMessage.timestamp.seconds * 1000), { addSuffix: true })}
              </p>
            )}
          </div>
          <p className="text-sm text-slate-400 truncate">
            {chat.lastMessage?.userId === currentUser?.uid && 'You: '}
            {chat.lastMessage?.text || 'No messages yet...'}
          </p>
        </div>
      </motion.div>
    </Link>
  );
};


export default function DirectMessagesPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const { data: chatsData, loading } = useCollection<DirectMessage>('directMessages', {
    where: ['participants', 'array-contains', user?.uid],
    disabled: !user?.uid,
  });

  const chats = useMemo(() => {
    if (!chatsData) return [];
    return [...chatsData].sort((a, b) => {
        const timeA = a.lastUpdated?.seconds || 0;
        const timeB = b.lastUpdated?.seconds || 0;
        return timeB - timeA;
    });
  }, [chatsData]);

  return (
    <div className="p-4 sm:p-6 flex flex-col h-full">
       <div className="flex items-center gap-2 mb-10">
            <Button variant="ghost" size="icon" className="rounded-full h-9 w-9" onClick={() => router.push('/community')}>
                <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-purple-400 to-indigo-500 text-transparent bg-clip-text">
                ChatSphere
            </h1>
        </div>
        <div className="flex-1 overflow-hidden">
            {loading ? (
                <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-8 h-8 animate-spin text-slate-500"/>
                </div>
            ) : chats && chats.length > 0 ? (
                <div className="space-y-1">
                    {chats.map(chat => (
                        <ChatListItem key={chat.id} chat={chat} />
                    ))}
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-500 h-full">
                    <Inbox className="w-16 h-16 mb-4" />
                    <p className="text-lg font-medium">Your inbox is empty.</p>
                    <p className="text-sm max-w-xs">Start a conversation by visiting someone's profile and clicking the "Message" button.</p>
                </div>
            )}
        </div>
    </div>
  );
}
