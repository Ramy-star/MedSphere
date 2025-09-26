
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
import { useState, useRef } from 'react';
import type { Content } from '@/lib/contentService';
import { contentService } from '@/lib/contentService';
import { useToast } from '@/hooks/use-toast';
import { Progress } from './ui/progress';
import { AlertCircle, CheckCircle, UploadCloud } from 'lucide-react';
import Image from 'next/image';

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
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

  const open = !!item;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px] p-0 border-slate-700 rounded-2xl bg-gradient-to-b from-slate-800/80 to-slate-900/70 backdrop-blur-lg shadow-lg shadow-blue-500/10 text-white">
        <div className="p-6">
          <DialogHeader>
            <DialogTitle>Change Folder Icon</DialogTitle>
            <DialogDescription>
              Upload a new icon for "{item?.name}".
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
              className="w-full h-48 border-2 border-dashed border-slate-600 rounded-lg flex items-center justify-center text-center cursor-pointer hover:border-blue-500 hover:bg-slate-800/50 transition-colors"
              onClick={triggerFileSelect}
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
                <div className="text-slate-400">
                    <UploadCloud className="mx-auto h-12 w-12" />
                    <p className="mt-2 text-sm font-semibold">Click to select an image</p>
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
            <Button type="button" variant="ghost" onClick={handleClose} disabled={uploadStatus === 'uploading'}>Cancel</Button>
            <Button type="button" onClick={handleUpload} disabled={!selectedFile || uploadStatus === 'uploading' || uploadStatus === 'success'}>
              {uploadStatus === 'uploading' ? 'Uploading...' : 'Save Icon'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
