'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Smile, X, RefreshCw, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';

interface ImagePreviewDialogProps {
  file: File | null;
  onClose: () => void;
  onSend: (caption: string, file: File) => void;
}

export function ImagePreviewDialog({ file, onClose, onSend }: ImagePreviewDialogProps) {
  const [caption, setCaption] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [internalFile, setInternalFile] = useState<File | null>(file);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInternalFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setImagePreview(null);
      setCaption('');
    }
  }, [file]);

  const handleSend = () => {
    if (internalFile) {
      onSend(caption, internalFile);
    }
  };
  
  const handleReplaceImage = () => {
    imageInputRef.current?.click();
  }
  
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFile = e.target.files?.[0];
    if (newFile) {
        setInternalFile(newFile);
    }
  }


  return (
    <Dialog open={!!file} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="glass-card sm:max-w-md p-0">
        <DialogHeader className="p-4 border-b border-slate-800">
          <DialogTitle>Send an Image</DialogTitle>
        </DialogHeader>
        <div className="p-4 space-y-4">
          <div className="relative group">
            {imagePreview && (
                <Image
                    src={imagePreview}
                    alt="Image preview"
                    width={400}
                    height={300}
                    className="rounded-lg object-cover w-full max-h-80"
                />
            )}
             <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button size="icon" variant="secondary" className="h-8 w-8 rounded-lg bg-black/60 hover:bg-black/80" onClick={handleReplaceImage}>
                   <RefreshCw className="w-4 h-4" />
                   <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                </Button>
                <Button size="icon" variant="destructive" className="h-8 w-8 rounded-lg bg-black/60 hover:bg-black/80" onClick={onClose}>
                    <Trash2 className="w-4 h-4" />
                </Button>
             </div>
          </div>
          <div className="relative">
            <Input
              placeholder="Caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="bg-slate-800/60 border-slate-700 pr-10"
            />
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8">
                  <Smile className="w-5 h-5 text-slate-400" />
                </Button>
              </PopoverTrigger>
              <PopoverContent>
                <EmojiPicker onEmojiClick={(emojiData) => setCaption(prev => prev + emojiData.emoji)} theme={Theme.DARK} />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <DialogFooter className="p-4 border-t border-slate-800">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSend}>Send</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
