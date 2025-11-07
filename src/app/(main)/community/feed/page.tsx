'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Image, Send, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const CreatePost = () => {
  const { user } = useAuthStore();
  const [postContent, setPostContent] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImagePreview(URL.createObjectURL(file));
    }
  };
  
  if (!user) return null;

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
          placeholder={`What's on your mind, ${user.displayName}?`}
          className="w-full bg-transparent text-white placeholder-slate-400 focus:outline-none resize-none no-scrollbar text-lg"
          rows={2}
        />
      </div>
      {imagePreview && (
        <div className="mt-4 relative w-32 h-32">
          <img src={imagePreview} alt="Post preview" className="rounded-lg object-cover w-full h-full" />
          <button onClick={() => setImagePreview(null)} className="absolute top-1 right-1 bg-black/50 rounded-full p-1 text-white">
            <X size={14} />
          </button>
        </div>
      )}
      <div className="flex justify-between items-center mt-4">
        <label htmlFor="image-upload" className="cursor-pointer text-slate-400 hover:text-white">
          <Image size={20} />
          <input id="image-upload" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
        </label>
        <Button size="sm" className="rounded-full" disabled={!postContent.trim() && !imagePreview}>
          <Send size={16} className="mr-2" />
          Post
        </Button>
      </div>
    </div>
  );
};


const PostCard = () => {
    // This is a placeholder for now. It will be implemented with real data.
    return (
        <div className="glass-card p-4 rounded-2xl">
            <div className="flex items-center gap-3">
                <Avatar>
                    <AvatarImage src="https://i.pravatar.cc/150?u=a" alt="User" />
                    <AvatarFallback>U</AvatarFallback>
                </Avatar>
                <div>
                    <p className="font-bold text-white">Placeholder User</p>
                    <p className="text-xs text-slate-400">2 hours ago</p>
                </div>
            </div>
            <p className="mt-4 text-white">This is a sample post. The actual feed with interactions and comments will be built in the next steps.</p>
        </div>
    )
}

export default function CommunityFeedPage() {
  const router = useRouter();

  return (
    <div className="p-4 sm:p-6 flex flex-col h-full">
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="icon" className="rounded-full h-9 w-9" onClick={() => router.push('/community')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-500 text-transparent bg-clip-text">
          Community Feed
        </h1>
      </div>
      
      <div className="w-full max-w-2xl mx-auto">
        <CreatePost />
        <div className="space-y-4">
            <PostCard />
            <PostCard />
        </div>
      </div>

    </div>
  );
}
