'use client';
import React, { useState, useCallback, useMemo, useEffect, lazy, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Image as ImageIcon, Send, X, ThumbsUp, MessageSquare, MoreHorizontal, Trash2, Edit, Globe, Loader2, CornerDownRight, Heart, Laugh, Annoyed, HandHelping, Hand, ThumbsDown, Clapperboard, FileQuestion, MessageSquare as MessageSquareIcon, EyeOff, Angry, Sparkles, Frown, MessageCircleOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuthStore, type UserProfile } from '@/stores/auth-store';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { createPost, type Post, togglePostReaction, deletePost, updatePost, addComment, type Comment as CommentData, toggleComments } from '@/lib/communityService';
import { useToast } from '@/hooks/use-toast';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useUserProfile } from '@/hooks/use-user-profile';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { CommentThread } from '@/components/community/CommentThread';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { motion } from 'framer-motion';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

const getTruncatedName = (name: string | undefined, count = 2) => {
    if (!name) return 'User';
    const nameParts = name.split(' ');
    return nameParts.slice(0, count).join(' ');
};

const CreatePost = ({ onPostCreated }: { onPostCreated: () => void }) => {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [postContent, setPostContent] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handlePost = async () => {
    if (!user || (!postContent.trim() && !imageFile)) return;
    setIsSubmitting(true);
    try {
      await createPost(user.uid, postContent, imageFile, isAnonymous);
      toast({ title: 'Post created successfully!' });
      setPostContent('');
      setImageFile(null);
      setImagePreview(null);
      setIsAnonymous(false);
      onPostCreated();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error creating post',
        description: error.message || 'An unknown error occurred.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (!user) return null;

  const displayName = getTruncatedName(user.displayName);

  return (
    <div className="glass-card p-4 rounded-2xl mb-6">
      <div className="flex gap-4">
        <Avatar>
          <AvatarImage src={isAnonymous ? undefined : user.photoURL ?? undefined} alt={isAnonymous ? 'Anonymous' : user.displayName || 'User'} />
          <AvatarFallback>{isAnonymous ? <EyeOff/> : user.displayName?.[0]}</AvatarFallback>
        </Avatar>
        <textarea
          value={postContent}
          onChange={(e) => setPostContent(e.target.value)}
          placeholder={`What's on your mind, ${displayName}?`}
          className="w-full bg-transparent text-white placeholder-slate-400 focus:outline-none resize-none no-scrollbar text-lg"
          rows={postContent.length > 50 ? 3 : 2}
        />
      </div>
      {imagePreview && (
        <div className="mt-4 ml-16 relative w-32 h-32">
          <img src={imagePreview} alt="Post preview" className="rounded-lg object-cover w-full h-full" />
          <button onClick={() => { setImageFile(null); setImagePreview(null); }} className="absolute top-1 right-1 bg-black/50 rounded-full p-1 text-white">
            <X size={14} />
          </button>
        </div>
      )}
      <div className="flex justify-between items-center mt-4 ml-16">
        <div className="flex items-center gap-4">
            <label htmlFor="image-upload" className="cursor-pointer text-slate-400 hover:text-white p-2 rounded-full hover:bg-white/10">
              <ImageIcon size={20} />
              <input id="image-upload" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </label>
             <div className="flex items-center space-x-2">
                <Checkbox id="anonymous-post" checked={isAnonymous} onCheckedChange={(checked) => setIsAnonymous(!!checked)} />
                <Label htmlFor="anonymous-post" className="text-sm font-medium text-slate-300">Post anonymously</Label>
            </div>
        </div>
        <Button size="sm" className="rounded-full" disabled={isSubmitting || (!postContent.trim() && !imageFile)} onClick={handlePost}>
          <Send size={16} className="mr-2" />
          {isSubmitting ? 'Posting...' : 'Post'}
        </Button>
      </div>
    </div>
  );
};


const PostAuthor = ({ userId, isAnonymous }: { userId: string, isAnonymous?: boolean }) => {
    const { userProfile, loading } = useUserProfile(userId);

    if (isAnonymous) {
        return (
            <div className="flex items-center gap-3">
                <Avatar>
                    <AvatarFallback><EyeOff/></AvatarFallback>
                </Avatar>
                <div>
                    <p className="font-bold text-white">Anonymous User</p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                </div>
            </div>
        );
    }

    if (!userProfile) return null;

    return (
      <Link href={`/users/${userProfile.username}`} className="flex items-center gap-3 group/author">
          <Avatar>
              <AvatarImage 
                  src={userProfile.photoURL ?? undefined} 
                  alt={userProfile.displayName || 'User'} 
                  className="pointer-events-none select-none"
                  onDragStart={(e) => e.preventDefault()}
                  onContextMenu={(e) => e.preventDefault()}
                />
              <AvatarFallback>{userProfile.displayName?.[0]}</AvatarFallback>
          </Avatar>
          <div>
              <p className="font-bold text-white group-hover/author:underline">{getTruncatedName(userProfile.displayName)}</p>
              <p className="text-xs text-slate-400">@{userProfile.username}</p>
          </div>
      </Link>
    );
};

const EditPostDialog = ({ post, open, onOpenChange, onPostUpdated }: { post: Post | null, open: boolean, onOpenChange: (open: boolean) => void, onPostUpdated: () => void }) => {
    const [content, setContent] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (post) {
            setContent(post.content);
        }
        if (open) {
            setTimeout(() => {
                textareaRef.current?.focus();
                textareaRef.current?.select();
            }, 100);
        }
    }, [post, open]);

    const handleSave = async () => {
        if (!post) return;
        setIsSaving(true);
        try {
            await updatePost(post.id, content);
            toast({ title: 'Post updated successfully!' });
            onPostUpdated();
            onOpenChange(false);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not update post.' });
        } finally {
            setIsSaving(false);
        }
    };

    if (!post) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="glass-card sm:max-w-2xl p-0 rounded-2xl bg-slate-900/80 backdrop-blur-lg">
                <DialogHeader className="p-6 pb-4">
                    <DialogTitle className="text-xl">Edit Post</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-4 px-6 max-h-[70vh] overflow-y-auto no-scrollbar">
                    <div className="bg-slate-800/60 rounded-xl border border-slate-700 p-1">
                         <Textarea
                            ref={textareaRef}
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            className="w-full bg-transparent border-0 text-white placeholder-slate-400 focus:outline-none resize-none no-scrollbar text-base min-h-[90px] max-h-[200px]"
                        />
                    </div>
                    {post.imageUrl && (
                        <div className="overflow-hidden bg-black/20 rounded-xl p-2 max-h-[300px] w-full">
                            <img src={post.imageUrl} alt="Post image" className="rounded-lg w-full h-full object-cover max-h-[300px]" />
                        </div>
                    )}
                </div>
                <DialogFooter className="p-6 pt-4">
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">Cancel</Button>
                    <Button onClick={handleSave} disabled={isSaving} className="rounded-xl w-24">
                        {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Save'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};


const PostCard = ({ post, refetchPosts }: { post: Post, refetchPosts: () => void }) => {
    const { user: currentUser } = useAuthStore();
    const { toast } = useToast();
    const [itemToDelete, setItemToDelete] = useState<Post | null>(null);
    const [itemToEdit, setItemToEdit] = useState<Post | null>(null);
    const [showComments, setShowComments] = useState(false);


    const userReaction = useMemo(() => {
        if (!currentUser || !post.reactions) return null;
        return post.reactions[currentUser.uid];
    }, [currentUser, post.reactions]);
    
    const reactionCounts = useMemo(() => {
        if (!post.reactions) return {};
        return Object.values(post.reactions).reduce((acc, reaction) => {
            acc[reaction] = (acc[reaction] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
    }, [post.reactions]);
    
    const totalReactions = useMemo(() => Object.keys(post.reactions || {}).length, [post.reactions]);
    const commentCount = post.commentCount || 0;

    const topReactions = useMemo(() => {
        return Object.entries(reactionCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3)
            .map(([type]) => type);
    }, [reactionCounts]);

    const handleReaction = async (reactionType: string) => {
        if(!currentUser) return;
        const currentReaction = userReaction;
        if (currentReaction === reactionType) {
            await togglePostReaction(post.id, currentUser.uid, reactionType);
        } else {
            await togglePostReaction(post.id, currentUser.uid, reactionType);
        }
    }

    const handleDelete = async () => {
        if (!itemToDelete) return;
        try {
            await deletePost(itemToDelete);
            toast({ title: 'Post deleted successfully.' });
            setItemToDelete(null);
            refetchPosts();
        } catch(e: any) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not delete post.' });
        }
    }
    
    const handleToggleComments = async () => {
      try {
        await toggleComments(post.id, !post.commentsDisabled);
        toast({ title: `Comments ${!post.commentsDisabled ? 'disabled' : 'enabled'}.` });
        refetchPosts();
      } catch (e: any) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not change comment settings.' });
      }
    };

    const isOwner = currentUser?.uid === post.userId;
    
    const postDate = post.createdAt?.toDate ? post.createdAt.toDate() : new Date(post.createdAt);

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

    const CurrentReactionIcon = userReaction ? reactionIcons[userReaction] : ThumbsUp;

    return (
      <>
        <div className="glass-card p-4 rounded-2xl">
            <div className="flex items-center justify-between">
                <PostAuthor userId={post.userId} isAnonymous={post.isAnonymous} />
                <div className="flex items-center gap-1">
                    <p className="text-xs text-slate-400 select-none">{formatDistanceToNow(postDate, { addSuffix: true })}</p>
                    {isOwner && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-slate-400">
                                    <MoreHorizontal size={18} />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem onSelect={() => setItemToEdit(post)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    <span>Edit</span>
                                </DropdownMenuItem>
                                 <DropdownMenuItem onSelect={handleToggleComments}>
                                    <MessageCircleOff className="mr-2 h-4 w-4" />
                                    <span>{post.commentsDisabled ? 'Enable' : 'Disable'} Comments</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onSelect={() => setItemToDelete(post)} className="text-red-400 focus:text-red-400">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    <span>Delete</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
            </div>
            
            <p className="mt-4 text-white whitespace-pre-wrap select-text">{post.content}</p>
            
            {post.imageUrl && (
                <div className="mt-4 rounded-lg overflow-hidden max-h-[300px] w-full mx-auto flex items-center justify-center bg-black">
                    <img src={post.imageUrl} alt="Post image" className="w-full h-full object-cover" />
                </div>
            )}
             <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                <div className="min-w-0 flex-1">
                    {totalReactions > 0 && (
                        <div className="flex items-center gap-2">
                            <div className="flex -space-x-1">
                                {topReactions.map(reaction => {
                                    const Icon = reactionIcons[reaction];
                                    return <Icon key={reaction} className={`${reactionColors[reaction]} h-4 w-4`} />;
                                })}
                            </div>
                            <span>{totalReactions}</span>
                        </div>
                    )}
                </div>
                <div className="min-w-0 flex-1 text-right">
                    <button onClick={() => setShowComments(prev => !prev)} className="hover:underline">
                        {commentCount} {commentCount === 1 ? 'comment' : 'comments'}
                    </button>
                </div>
            </div>

             <div className="mt-2 flex items-center justify-between text-slate-400 border-t border-white/10 pt-2">
                 <Popover>
                    <PopoverTrigger asChild>
                         <Button variant="ghost" className={`flex-1 hover:bg-white/10 rounded-lg ${userReaction ? reactionColors[userReaction] : 'text-slate-400'}`}>
                            <CurrentReactionIcon className={`mr-2 h-4 w-4 ${userReaction ? 'fill-current' : ''}`}/> 
                             {userReaction ? userReaction.charAt(0).toUpperCase() + userReaction.slice(1) : 'Like'}
                         </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-1 rounded-full bg-slate-800 border-slate-700">
                        <div className="flex gap-1">
                           {Object.keys(reactionIcons).map(reaction => {
                                const Icon = reactionIcons[reaction];
                                return (
                                    <motion.button key={reaction} whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.9 }} className="p-2 rounded-full hover:bg-white/20" onClick={() => handleReaction(reaction)}>
                                        <Icon className={reactionColors[reaction]}/>
                                    </motion.button>
                                )
                           })}
                        </div>
                    </PopoverContent>
                 </Popover>
                 <Button variant="ghost" className="flex-1 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg" onClick={() => setShowComments(prev => !prev)}>
                    <MessageSquareIcon className="mr-2 h-4 w-4"/> Comment
                 </Button>
            </div>
             {showComments && (
                <div className="mt-4 border-t border-white/10 pt-4">
                    <CommentThread postId={post.id} commentsDisabled={!!post.commentsDisabled} />
                </div>
            )}
        </div>
         <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action will permanently delete this post. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        <EditPostDialog 
            post={itemToEdit} 
            open={!!itemToEdit} 
            onOpenChange={(open) => !open && setItemToEdit(null)}
            onPostUpdated={refetchPosts}
        />
      </>
    )
}

export default function FaceSpherePage() {
  const router = useRouter();
  const { data: posts, loading } = useCollection<Post>('posts', { orderBy: ['createdAt', 'desc']});

  return (
    <div className="p-4 sm:p-6 flex flex-col h-full">
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="icon" className="rounded-full h-9 w-9" onClick={() => router.push('/community')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-500 text-transparent bg-clip-text">
          FaceSphere
        </h1>
      </div>
      
      <div className="w-full max-w-2xl mx-auto">
        <CreatePost onPostCreated={() => {
          // Since useCollection is real-time, we don't need to manually refetch.
          // This function can be used for other side effects if needed.
        }} />
        <div className="space-y-4">
            {loading ? (
                <>
                    <Skeleton className="h-48 w-full rounded-2xl"/>
                    <Skeleton className="h-64 w-full rounded-2xl"/>
                </>
            ) : (
                posts?.map(post => <PostCard key={post.id} post={post} refetchPosts={() => {}} />)
            )}
            {!loading && posts?.length === 0 && (
                <div className="text-center py-16 text-slate-500">
                    <Globe className="w-12 h-12 mx-auto mb-4" />
                    <p className="text-lg font-medium">Be the first to post!</p>
                    <p>Share something with the community.</p>
                </div>
            )}
        </div>
      </div>

    </div>
  );
}
