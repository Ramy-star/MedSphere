'use client';

import { useUserProfile } from '@/hooks/use-user-profile';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '../ui/skeleton';
import Link from 'next/link';

interface CommentData {
  id: string;
  userId: string;
  content: string;
  createdAt: any;
}

export const Comment = ({ comment, onReply }: { comment: CommentData; onReply: () => void; }) => {
  const { userProfile, loading } = useUserProfile(comment.userId);
  const postDate = comment.createdAt?.toDate ? comment.createdAt.toDate() : new Date(comment.createdAt);

  if (loading) {
    return (
      <div className="flex items-start gap-3">
        <Skeleton className="h-8 w-8 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
    );
  }

  const getTruncatedName = (name: string | undefined) => {
    if (!name) return 'User';
    const nameParts = name.split(' ');
    return nameParts.slice(0, 2).join(' ');
  };

  return (
    <div className="flex items-start gap-3">
      <Link href={`/users/${userProfile?.username || ''}`}>
        <Avatar className="h-8 w-8">
          <AvatarImage src={userProfile?.photoURL || ''} />
          <AvatarFallback>{userProfile?.displayName?.[0] || 'U'}</AvatarFallback>
        </Avatar>
      </Link>
      <div className="flex-1">
        <div className="bg-slate-700/50 rounded-xl px-3 py-2">
          <Link href={`/users/${userProfile?.username || ''}`}>
            <p className="font-bold text-sm text-white hover:underline">{getTruncatedName(userProfile?.displayName)}</p>
          </Link>
          <p className="text-sm text-slate-200 whitespace-pre-wrap">{comment.content}</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400 mt-1 px-2">
            <p>{formatDistanceToNow(postDate, { addSuffix: true })}</p>
            <button onClick={onReply} className="font-semibold hover:underline">Reply</button>
        </div>
      </div>
    </div>
  );
};
