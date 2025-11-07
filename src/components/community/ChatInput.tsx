'use client';
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Mic, Trash2, Play, Pause, Smile, Paperclip } from 'lucide-react';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { EyeOff, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Message } from '@/lib/communityService';
import ChatQuote from '@/components/ChatQuote';
import { useAuthStore } from '@/stores/auth-store';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { ImagePreviewDialog } from './ImagePreviewDialog';


interface ChatInputProps {
  onSendMessage: (content: string, isAnonymous: boolean, media?: { file: File, type: 'image' | 'audio', duration?: number }, replyTo?: Message['replyTo']) => void;
  showAnonymousOption?: boolean;
  replyingTo: Message | null;
  onClearReply: () => void;
  onEditMessage: (message: Message, newContent: string) => Promise<void>;
  editingMessage: Message | null;
  onClearEditing: () => void;
  isDM?: boolean;
}

export function ChatInput({ 
  onSendMessage, 
  showAnonymousOption = true,
  replyingTo,
  onClearReply,
  onEditMessage,
  editingMessage,
  onClearEditing,
  isDM = false,
}: ChatInputProps) {
  const [content, setContent] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [imageToSend, setImageToSend] = useState<File | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuthStore();

  useEffect(() => {
    if (editingMessage) {
        setContent(editingMessage.content || '');
        textareaRef.current?.focus();
    } else {
        setContent('');
    }
  }, [editingMessage]);

  useEffect(() => {
    if (audioUrl) {
      audioRef.current = new Audio(audioUrl);
      audioRef.current.onloadedmetadata = () => {
        setAudioDuration(audioRef.current!.duration);
      };
    }
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = recorder;
      
      const audioChunks: BlobPart[] = [];
      recorder.ondataavailable = event => {
        audioChunks.push(event.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setIsRecording(true);
      
      setRecordingTime(0);
      recordingIntervalRef.current = setInterval(() => {
          setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error("Error accessing microphone:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if(recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    }
  };
  
  const handleDeleteRecording = () => {
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (editingMessage) {
        await onEditMessage(editingMessage, content);
        onClearEditing();
        setContent('');
        return;
    }
    
    let replyContext: Message['replyTo'] | undefined;
    if (replyingTo) {
        const senderName = isDM 
            ? getTruncatedName(user?.displayName)
            : (replyingTo.isAnonymous ? "Anonymous User" : getTruncatedName(replyingTo.userName));
        replyContext = {
            messageId: replyingTo.id,
            content: replyingTo.content || 'Media message',
            userId: replyingTo.userId,
            userName: senderName,
        };
    }

    if (audioBlob) {
        onSendMessage('', isAnonymous, { file: audioBlob as File, type: 'audio', duration: audioDuration }, replyContext);
        handleDeleteRecording();
    } else if (content.trim()) {
      onSendMessage(content.trim(), isAnonymous, undefined, replyContext);
      setContent('');
    }
    onClearReply();
  };
  
  const handleSendImage = (caption: string, file: File) => {
      let replyContext: Message['replyTo'] | undefined;
      if (replyingTo) {
          const senderName = isDM ? getTruncatedName(user?.displayName) : (replyingTo.isAnonymous ? "Anonymous User" : getTruncatedName(replyingTo.userName));
          replyContext = {
              messageId: replyingTo.id,
              content: replyingTo.content || 'Media message',
              userId: replyingTo.userId,
              userName: senderName,
          };
      }
      onSendMessage(caption, isAnonymous, { file, type: 'image' }, replyContext);
      setImageToSend(null);
      onClearReply();
  };

  
  const getTruncatedName = (name: string | undefined) => {
    if (!name) return 'User';
    const nameParts = name.split(' ');
    return nameParts.slice(0, 2).join(' ');
  };
  
  const handleCancelEdit = () => {
    onClearEditing();
    setContent('');
  }
  
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageToSend(file);
    }
    if(e.target) e.target.value = '';
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend(e);
    }
     if (e.key === 'Escape') {
      if (editingMessage) {
        handleCancelEdit();
      } else if (replyingTo) {
        onClearReply();
      }
    }
  }

  const formatTime = (time: number) => {
      const minutes = Math.floor(time / 60);
      const seconds = time % 60;
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (audioBlob && audioUrl) {
    return (
      <div className="flex items-center gap-2 p-2 bg-slate-800/60 border border-slate-700 rounded-xl">
        <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 shrink-0" onClick={handleDeleteRecording}>
            <Trash2 className="w-5 h-5 text-red-500"/>
        </Button>
        <div className="flex-1 text-center text-white font-mono">{formatTime(Math.round(audioDuration))}</div>
        <Button size="icon" className="rounded-full h-10 w-10 shrink-0" onClick={handleSend}>
            <Send className="w-5 h-5" />
        </Button>
      </div>
    )
  }

  if (isRecording) {
     return (
        <div className="flex items-center gap-4 p-2 bg-slate-800/60 border border-slate-700 rounded-xl">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
            <p className="flex-1 text-center font-mono text-white">{formatTime(recordingTime)}</p>
            <Button onClick={stopRecording} size="icon" className="rounded-full h-10 w-10 bg-red-600 hover:bg-red-700">
                <Pause className="w-5 h-5" />
            </Button>
        </div>
    )
  }

  return (
    <>
    <div className="flex flex-col gap-2">
      {replyingTo && <ChatQuote replyTo={{
          messageId: replyingTo.id,
          content: replyingTo.content || 'Media Message',
          userId: replyingTo.userId,
          userName: isDM ? getTruncatedName(user?.displayName) : (replyingTo.isAnonymous ? "Anonymous User" : getTruncatedName(replyingTo.userName))
      }} onClose={onClearReply} isDM={isDM} />}
      {editingMessage && <div className="text-xs text-yellow-400 px-3 py-1 bg-yellow-900/50 rounded-md">Editing message... (Press Esc to cancel)</div>}
      
      <form onSubmit={handleSend} className="flex items-center gap-2">
        <div className="flex items-center">
            <Popover>
                <PopoverTrigger asChild>
                    <Button type="button" variant="ghost" size="icon" className="rounded-full h-10 w-10 shrink-0 text-slate-400">
                        <Smile className="w-5 h-5" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent>
                    <EmojiPicker onEmojiClick={(emojiData: EmojiClickData) => setContent(prev => prev + emojiData.emoji)} theme={Theme.DARK} />
                </PopoverContent>
            </Popover>
            <Button type="button" variant="ghost" size="icon" className="rounded-full h-10 w-10 shrink-0 text-slate-400" onClick={() => imageInputRef.current?.click()}>
                <Paperclip className="w-5 h-5" />
                <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
            </Button>
        </div>
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message"
          className="bg-transparent border-0 text-white rounded-xl focus-visible:ring-0 focus-visible:ring-offset-0 flex-1 resize-none no-scrollbar py-2.5"
          rows={1}
        />
        {content.trim().length > 0 ? (
            <Button type="submit" size="icon" className="rounded-full h-10 w-10 shrink-0 ml-2" disabled={!content.trim() && !editingMessage}>
                <Send className="w-5 h-5" />
            </Button>
        ) : (
            <Button type="button" variant="ghost" size="icon" className="rounded-full h-10 w-10 shrink-0 text-slate-400 ml-2" onClick={startRecording}>
                <Mic className="w-5 h-5" />
            </Button>
        )}
      </form>
       {showAnonymousOption && (
        <div className="flex items-center space-x-2 self-start pl-2">
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
       )}
    </div>
     <ImagePreviewDialog
        file={imageToSend}
        onClose={() => setImageToSend(null)}
        onSend={handleSendImage}
      />
    </>
  );
}
