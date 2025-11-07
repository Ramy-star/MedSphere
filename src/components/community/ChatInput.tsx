'use client';
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Mic, Trash2, Play, Pause } from 'lucide-react';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { EyeOff, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Message } from '@/lib/communityService';
import ChatQuote from '@/components/ChatQuote';

interface ChatInputProps {
  onSendMessage: (content: string, isAnonymous: boolean, audio?: { blob: Blob, duration: number }, replyTo?: Message['replyTo']) => void;
  showAnonymousOption?: boolean;
  replyingTo: Message | null;
  onClearReply: () => void;
  onEditMessage: (message: Message, newContent: string) => Promise<void>;
  editingMessage: Message | null;
  onClearEditing: () => void;
}

export function ChatInput({ 
  onSendMessage, 
  showAnonymousOption = true,
  replyingTo,
  onClearReply,
  editingMessage,
  onEditMessage,
  onClearEditing,
}: ChatInputProps) {
  const [content, setContent] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingMessage) {
        await onEditMessage(editingMessage, content);
        onClearEditing();
        setContent('');
        return;
    }

    const replyContext = replyingTo ? {
        messageId: replyingTo.id,
        content: replyingTo.content || 'Voice message',
        userId: replyingTo.userId,
        userName: useAuthStore.getState().user?.displayName || 'User', // This is a simplification
    } : undefined;

    if (audioBlob) {
        onSendMessage('', isAnonymous, { blob: audioBlob, duration: audioDuration }, replyContext);
        handleDeleteRecording();
    } else if (content.trim()) {
      onSendMessage(content.trim(), isAnonymous, undefined, replyContext);
      setContent('');
    }
    onClearReply();
  };
  
  const handleCancelEdit = () => {
    onClearEditing();
    setContent('');
  }

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
    <form onSubmit={handleSend} className="flex flex-col gap-2">
      {replyingTo && <ChatQuote text={replyingTo.content || 'Voice message'} onClose={onClearReply} />}
      {editingMessage && <div className="text-xs text-yellow-400 px-3 py-1 bg-yellow-900/50 rounded-md">Editing message... (Press Esc to cancel)</div>}
      <div className="flex items-center gap-2">
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message..."
          className="bg-slate-800/60 border-slate-700 text-white rounded-xl focus-visible:ring-blue-500"
          rows={1}
        />
        <Button type="button" variant="ghost" size="icon" className="rounded-full h-10 w-10 shrink-0" onClick={startRecording}>
            <Mic className="w-5 h-5" />
        </Button>
        <Button type="submit" size="icon" className="rounded-full h-10 w-10 shrink-0" disabled={!content.trim() && !editingMessage}>
          <Send className="w-5 h-5" />
        </Button>
      </div>
       {showAnonymousOption && (
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
       )}
    </form>
  );
}
