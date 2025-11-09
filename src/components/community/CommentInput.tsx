'use client';
import { useState } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { Send } from 'lucide-react';
import { cn } from '@/lib/utils';

export const CommentInput = ({ onSubmit, placeholder, isReply = false }: { onSubmit: (content: string) => Promise<void>; placeholder: string; isReply?: boolean; }) => {
  const { user } = useAuthStore();
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    await onSubmit(content.trim());
    setContent('');
    setIsSubmitting(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(e);
    }
  }

  return (
    <div className="flex items-start gap-3">
      <Avatar className={cn(isReply ? "h-8 w-8" : "h-9 w-9")}>
        <AvatarImage src={user?.photoURL || ''} />
        <AvatarFallback>{user?.displayName?.[0] || 'U'}</AvatarFallback>
      </Avatar>
      <form onSubmit={handleSubmit} className="flex-1">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="bg-slate-800/60 border-slate-700 text-white rounded-xl focus-visible:ring-blue-500 text-sm"
          rows={1}
          disabled={isSubmitting}
        />
         <div className="flex justify-end mt-2">
            <Button type="submit" size="sm" className="rounded-full" disabled={!content.trim() || isSubmitting}>
                <Send className="mr-2 h-3.5 w-3.5"/>
                {isSubmitting ? 'Posting...' : 'Post'}
            </Button>
         </div>
      </form>
    </div>
  );
};
