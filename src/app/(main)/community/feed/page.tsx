'use client';
import { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Image, Send, X, ThumbsUp, MessageCircle, MoreHorizontal, Trash2, Edit, Globe } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuthStore, type UserProfile } from '@/stores/auth-store';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { createPost, type Post, togglePostReaction, deletePost, updatePost } from '@/lib/communityService';
import { useToast } from '@/hooks/use-toast';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useUserProfile } from '@/hooks/use-user-profile';
import { formatDistanceToNow } from 'date-fns';
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
      await createPost(user.uid, postContent, imageFile);
      toast({ title: 'Post created successfully!' });
      setPostContent('');
      setImageFile(null);
      setImagePreview(null);
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
          <AvatarImage src={user.photoURL || ''} alt={user.displayName || 'User'} />
          <AvatarFallback>{user.displayName?.[0]}</AvatarFallback>
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
        <label htmlFor="image-upload" className="cursor-pointer text-slate-400 hover:text-white p-2 rounded-full hover:bg-white/10">
          <Image size={20} />
          <input id="image-upload" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
        </label>
        <Button size="sm" className="rounded-full" disabled={isSubmitting || (!postContent.trim() && !imageFile)} onClick={handlePost}>
          <Send size={16} className="mr-2" />
          {isSubmitting ? 'Posting...' : 'Post'}
        </Button>
      </div>
    </div>
  );
};


const PostAuthor = ({ userId }: { userId: string }) => {
    const { userProfile, loading } = useUserProfile(userId);

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
              <AvatarImage src={userProfile.photoURL || ''} alt={userProfile.displayName || 'User'} />
              <AvatarFallback>{userProfile.displayName?.[0]}</AvatarFallback>
          </Avatar>
          <div>
              <p className="font-bold text-white group-hover/author:underline">{getTruncatedName(userProfile.displayName)}</p>
              <p className="text-xs text-slate-400">@{userProfile.username}</p>
          </div>
      </Link>
    );
};

const PostCard = ({ post, refetchPosts }: { post: Post, refetchPosts: () => void }) => {
    const { user: currentUser } = useAuthStore();
    const { toast } = useToast();
    const [itemToDelete, setItemToDelete] = useState<Post | null>(null);

    const hasLiked = useMemo(() => {
        if (!currentUser || !post.reactions) return false;
        return post.reactions.hasOwnProperty(currentUser.uid);
    }, [currentUser, post.reactions]);
    
    const likeCount = useMemo(() => {
        if (!post.reactions) return 0;
        return Object.keys(post.reactions).length;
    }, [post.reactions]);

    const handleLike = async () => {
        if(!currentUser) return;
        await togglePostReaction(post.id, currentUser.uid);
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

    const isOwner = currentUser?.uid === post.userId;
    
    const postDate = post.createdAt?.toDate ? post.createdAt.toDate() : new Date(post.createdAt);

    return (
      <>
        <div className="glass-card p-4 rounded-2xl">
            <div className="flex items-center justify-between">
                <PostAuthor userId={post.userId} />
                <div className="flex items-center gap-1">
                    <p className="text-xs text-slate-400">{formatDistanceToNow(postDate, { addSuffix: true })}</p>
                    {isOwner && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-slate-400">
                                    <MoreHorizontal size={18} />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem>
                                    <Edit className="mr-2 h-4 w-4" />
                                    <span>Edit</span>
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
            
            {post.content && <p className="mt-4 text-white whitespace-pre-wrap">{post.content}</p>}
            
            {post.imageUrl && (
                <div className="mt-4 rounded-lg overflow-hidden max-h-[500px] flex items-center justify-center bg-black">
                    <img src={post.imageUrl} alt="Post image" className="w-full h-auto object-contain" />
                </div>
            )}

            <div className="mt-4 flex items-center justify-between text-slate-400 border-t border-white/10 pt-2">
                 <Button variant="ghost" className="text-slate-400 hover:text-white hover:bg-white/10 rounded-full" onClick={handleLike}>
                    <ThumbsUp className={`mr-2 h-4 w-4 ${hasLiked ? 'text-blue-500 fill-current' : ''}`}/> 
                    {likeCount > 0 ? `${likeCount} Like${likeCount > 1 ? 's' : ''}` : 'Like'}
                 </Button>
                 <Button variant="ghost" className="text-slate-400 hover:text-white hover:bg-white/10 rounded-full">
                    <MessageCircle className="mr-2 h-4 w-4"/> Comment
                 </Button>
            </div>
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
      </>
    )
}

export default function FaceSpherePage() {
  const router = useRouter();
  const { data: posts, loading, refetch } = useCollection<Post>('posts', { orderBy: ['createdAt', 'desc']});

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
        <CreatePost onPostCreated={refetch} />
        <div className="space-y-4">
            {loading ? (
                <>
                    <Skeleton className="h-48 w-full rounded-2xl"/>
                    <Skeleton className="h-64 w-full rounded-2xl"/>
                </>
            ) : (
                posts?.map(post => <PostCard key={post.id} post={post} refetchPosts={refetch} />)
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
