'use client';

import { useUserProfile } from '@/hooks/use-user-profile';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '../ui/skeleton';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth-store';
import { togglePostReaction, deletePost, updatePost, addComment, deleteComment, updateComment } from '@/lib/communityService';
import { useToast } from '@/hooks/use-toast';
import { useState, useMemo } from 'react';
import { Button } from '../ui/button';
import { ThumbsUp, Heart, Laugh, Sparkles, Frown, Angry, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Textarea } from '../ui/textarea';

interface CommentData {
  id: string;
  userId: string;
  postId: string;
  content: string;
  createdAt: any;
  reactions: { [key: string]: string };
}

const reactionIcons: { [key: string]: React.FC<any> } = {
  like: ThumbsUp,
  love: Heart,
  haha: Laugh,
  wow: Sparkles,
  sad: Frown,
  angry: Angry,
};
const reactionColors: { [key: string]: string } = {
  like: 'text-blue-500', love: 'text-red-500', haha: 'text-yellow-500',
  wow: 'text-indigo-400', sad: 'text-yellow-600', angry: 'text-orange-600'
};


export const Comment = ({ comment, onReply }: { comment: CommentData; onReply: () => void; }) => {
  const { user: currentUser } = useAuthStore();
  const { userProfile, loading } = useUserProfile(comment.userId);
  const postDate = comment.createdAt?.toDate ? comment.createdAt.toDate() : new Date(comment.createdAt);
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(comment.content);

  const userReaction = useMemo(() => currentUser && comment.reactions ? comment.reactions[currentUser.uid] : null, [currentUser, comment.reactions]);
  const totalReactions = useMemo(() => Object.keys(comment.reactions || {}).length, [comment.reactions]);
  const topReactions = useMemo(() => {
    if (!comment.reactions) return [];
    const counts = Object.values(comment.reactions).reduce((acc, r) => { acc[r] = (acc[r] || 0) + 1; return acc; }, {} as Record<string, number>);
    return Object.entries(counts).sort(([, a], [, b]) => b - a).slice(0, 3).map(([type]) => type);
  }, [comment.reactions]);

  const handleReaction = async (reactionType: string) => {
    if (!currentUser) return;
    await togglePostReaction(comment.id, currentUser.uid, reactionType, true);
  };
  
  const handleUpdateComment = async () => {
    if (editedContent.trim() === comment.content || !editedContent.trim()) {
      setIsEditing(false);
      return;
    }
    try {
        await updateComment(comment.postId, comment.id, editedContent);
        toast({ title: "Comment updated!" });
        setIsEditing(false);
    } catch(e) {
        toast({ title: "Error", description: "Could not update comment.", variant: "destructive" });
    }
  }

  const handleDeleteComment = async () => {
      try {
        await deleteComment(comment.postId, comment.id);
        toast({ title: "Comment deleted." });
      } catch (e) {
          toast({ title: "Error", description: "Could not delete comment.", variant: "destructive" });
      }
  }

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
        <div className="bg-slate-700/50 rounded-xl px-3 py-2 group/comment relative">
          <div className="flex items-center justify-between">
            <Link href={`/users/${userProfile?.username || ''}`}>
              <p className="font-bold text-sm text-white hover:underline">{getTruncatedName(userProfile?.displayName)}</p>
            </Link>
            {currentUser?.uid === comment.userId && !isEditing && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full opacity-0 group-hover/comment:opacity-100">
                    <MoreHorizontal size={14}/>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onSelect={() => setIsEditing(true)}>
                    <Edit className="mr-2 h-4 w-4" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={handleDeleteComment} className="text-red-400">
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
           {isEditing ? (
              <div className="mt-2">
                  <Textarea value={editedContent} onChange={e => setEditedContent(e.target.value)} className="text-sm" />
                  <div className="flex justify-end gap-2 mt-2">
                    <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>Cancel</Button>
                    <Button size="sm" onClick={handleUpdateComment}>Save</Button>
                  </div>
              </div>
           ) : (
             <p className="text-sm text-slate-200 whitespace-pre-wrap">{comment.content}</p>
           )}
          {totalReactions > 0 && (
            <div className="absolute -bottom-3 right-2 flex items-center bg-slate-800 rounded-full border border-slate-700 px-1 py-0.5">
                <div className="flex -space-x-1">
                    {topReactions.map(r => {
                        const Icon = reactionIcons[r];
                        return <Icon key={r} className={`${reactionColors[r]} h-3 w-3`} />
                    })}
                </div>
                <span className="ml-1.5 text-xs font-mono">{totalReactions}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400 mt-1 px-2">
            <p>{formatDistanceToNow(postDate, { addSuffix: true })}</p>
             <Popover>
                <PopoverTrigger asChild><button className="font-semibold hover:underline">Like</button></PopoverTrigger>
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
            <button onClick={onReply} className="font-semibold hover:underline">Reply</button>
        </div>
      </div>
    </div>
  );
};
