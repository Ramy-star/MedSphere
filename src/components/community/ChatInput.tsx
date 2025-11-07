'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, EyeOff } from 'lucide-react';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';

interface ChatInputProps {
  onSendMessage: (content: string, isAnonymous: boolean) => void;
}

export function ChatInput({ onSendMessage }: ChatInputProps) {
  const [content, setContent] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim()) {
      onSendMessage(content.trim(), isAnonymous);
      setContent('');
      // We keep the isAnonymous state as the user might want to send multiple anonymous messages.
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(e);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <div className="flex items-center gap-4">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message..."
          className="bg-slate-800/60 border-slate-700 text-white rounded-xl focus-visible:ring-blue-500"
          rows={1}
        />
        <Button type="submit" size="icon" className="rounded-full h-10 w-10 shrink-0" disabled={!content.trim()}>
          <Send className="w-5 h-5" />
        </Button>
      </div>
       <div className="flex items-center space-x-2 self-start">
        <Checkbox 
            id="anonymous" 
            checked={isAnonymous} 
            onCheckedChange={(checked) => setIsAnonymous(!!checked)}
        />
        <Label htmlFor="anonymous" className="text-xs text-slate-400 flex items-center gap-1.5 cursor-pointer">
            <EyeOff className="w-3.5 h-3.5" />
            Send anonymously
        </Label>
      </div>
    </form>
  );
}
