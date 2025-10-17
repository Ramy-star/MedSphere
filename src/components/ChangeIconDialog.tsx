
'use client';

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useState, useRef, useCallback } from 'react';
import type { Content } from '@/lib/contentService';
import { contentService } from '@/lib/contentService';
import { useToast } from '@/hooks/use-toast';
import { Progress } from './ui/progress';
import { AlertCircle, CheckCircle, UploadCloud } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

type ChangeIconDialogProps = {
  item: Content | null;
  onOpenChange: (open: boolean) => void;
};

export function ChangeIconDialog({ item, onOpenChange }: ChangeIconDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (file: File | null | undefined) => {
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
          variant: 'destructive',
          title: 'Invalid File Type',
          description: 'Please select an image file (e.g., PNG, JPG, SVG, WEBP).',
        });
        return;
      }
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setUploadStatus('idle');
      setError(null);
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(event.target.files?.[0]);
  };

  const handleClose = () => {
    if (uploadStatus === 'uploading') return;
    onOpenChange(false);
    // Reset state after dialog closes
    setTimeout(() => {
        setSelectedFile(null);
        setPreview(null);
        setUploadStatus('idle');
        setUploadProgress(0);
        setError(null);
        setIsDragging(false);
    }, 300);
  };
  
  const handleUpload = async () => {
    if (!selectedFile || !item) return;

    setUploadStatus('uploading');
    setUploadProgress(0);
    setError(null);

    await contentService.uploadAndSetIcon(item.id, selectedFile, {
      onProgress: (progress) => {
        setUploadProgress(progress);
      },
      onSuccess: (url) => {
        setUploadStatus('success');
        toast({
          title: 'Icon Updated',
          description: `The icon for "${item.name}" has been changed.`,
        });
        setTimeout(handleClose, 1500); // Close after success
      },
      onError: (err) => {
        setUploadStatus('error');
        setError(err.message || 'An unknown error occurred.');
        console.error("Icon upload failed:", err);
      },
    });
  };

  const triggerFileSelect = () => fileInputRef.current?.click();

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true); // Keep it true while dragging over
  };
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files?.[0]);
  };

  const open = !!item;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[70vw] sm:max-w-[425px] p-0 border-slate-700 rounded-2xl bg-slate-900/70 backdrop-blur-xl shadow-lg text-white">
        <div className="p-6">
          <DialogHeader>
            <DialogTitle>Change Folder Icon</DialogTitle>
            <DialogDescription>
              Upload a new icon for "{item?.name}". Drag & drop an image or click to select.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-6 space-y-4">
             <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileChange}
                accept="image/png, image/jpeg, image/jpg, image/svg+xml, image/webp, image/gif"
            />
            
            <div 
              className={cn(
                "w-full h-48 border-2 border-dashed border-slate-600 rounded-lg flex items-center justify-center text-center cursor-pointer hover:border-blue-500 hover:bg-slate-800/50 transition-all duration-300",
                isDragging && "border-blue-500 bg-slate-700/50 scale-105"
              )}
              onClick={triggerFileSelect}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              {preview ? (
                <div className="relative w-32 h-32">
                    <Image src={preview} alt="Icon preview" layout="fill" objectFit="contain" />
                </div>
              ) : item?.metadata?.iconURL ? (
                 <div className="relative w-32 h-32">
                    <Image src={item.metadata.iconURL} alt="Current icon" layout="fill" objectFit="contain" />
                </div>
              ) : (
                <div className="text-slate-400 pointer-events-none">
                    <UploadCloud className="mx-auto h-12 w-12" />
                    <p className="mt-2 text-sm font-semibold">{isDragging ? 'Drop the image here' : 'Click or drag file to this area'}</p>
                    <p className="text-xs">PNG, JPG, SVG, WEBP, GIF</p>
                </div>
              )}
            </div>

            {uploadStatus === 'uploading' && (
                <div className="space-y-1">
                    <Progress value={uploadProgress} className="w-full h-2" />
                    <p className="text-xs text-slate-400 text-center">{Math.round(uploadProgress)}%</p>
                </div>
            )}
             {uploadStatus === 'success' && (
                <div className="flex items-center justify-center gap-2 text-green-400">
                    <CheckCircle className="h-5 w-5" />
                    <p className="font-medium">Upload successful!</p>
                </div>
            )}
             {uploadStatus === 'error' && (
                <div className="flex items-center justify-center gap-2 text-red-400">
                    <AlertCircle className="h-5 w-5" />
                    <p className="font-medium">Upload failed: {error}</p>
                </div>
            )}

          </div>

          <DialogFooter className="pt-6">
            <Button type="button" variant="outline" className="rounded-xl" onClick={handleClose} disabled={uploadStatus === 'uploading'}>Cancel</Button>
            <Button type="button" className="rounded-xl" onClick={handleUpload} disabled={!selectedFile || uploadStatus === 'uploading' || uploadStatus === 'success'}>
              {uploadStatus === 'uploading' ? 'Uploading...' : 'Save Icon'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
