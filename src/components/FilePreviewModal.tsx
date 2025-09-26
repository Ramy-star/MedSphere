
'use client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from './ui/button';
import FilePreview from './FilePreview';
import type { Content } from '@/lib/contentService';
import { useEffect, useState } from 'react';
import { X, Download, Share2, File as FileIcon, ExternalLink } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Input } from './ui/input';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from './ui/skeleton';

export function FilePreviewModal({ item, onOpenChange }: { item: Content | null, onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  
  const fileUrl = item?.metadata?.storagePath;
  const loading = false; // No loading needed for direct URL

  if (!item) return null;

  const handleDownload = async () => {
    if (!fileUrl || !item) return;
    try {
        const res = await fetch(fileUrl);
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = item.name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(blobUrl);
    } catch (error) {
        console.error("Download failed:", error);
        toast({
            variant: "destructive",
            title: "Download Failed",
            description: "Could not download the file.",
        });
        // Fallback to opening in new tab
        window.open(fileUrl, '_blank');
    }
  }

  const handleClose = () => {
    onOpenChange(false);
  }
  
  const handleOpenInNewTab = () => {
    if (!fileUrl) return;
    window.open(fileUrl, '_blank');
  };

  const handleCopyLink = () => {
    if(!fileUrl) return;
    navigator.clipboard.writeText(fileUrl).then(() => {
        toast({
            title: "Link Copied!",
            description: "A shareable link to this file has been copied.",
        })
    }).catch(err => {
        console.error('Failed to copy: ', err);
        toast({
            variant: "destructive",
            title: "Failed to Copy",
            description: "Could not copy the link.",
        })
    });
  }

  return (
    <Dialog open={!!item} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent 
        className="max-w-none w-screen h-screen rounded-none p-0 flex flex-col bg-slate-900/80 backdrop-blur-sm border-0"
        hideCloseButton={true}
      >
        <DialogHeader className="hidden">
            <DialogTitle>File Preview: {item.name}</DialogTitle>
            <DialogDescription>Content of the file {item.name}.</DialogDescription>
        </DialogHeader>

        {/* Header */}
        <header className="flex h-16 shrink-0 items-center justify-between px-4 bg-slate-950/70 border-b border-slate-800 z-10">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={handleClose} className="text-slate-300 hover:text-white hover:bg-white/10">
                <X className="w-6 h-6" />
            </Button>
            <div className='flex items-center gap-3'>
                <FileIcon className='w-5 h-5 text-slate-400' />
                <span className="font-medium text-white truncate">{item.name}</span>
            </div>
          </div>
          <div className='flex items-center gap-2'>
            <Button variant="ghost" size="icon" onClick={handleDownload} disabled={!fileUrl} className="text-slate-300 hover:text-white hover:bg-white/10" title="Download">
                <Download className="w-5 h-5" />
            </Button>
             <Button variant="ghost" size="icon" onClick={handleOpenInNewTab} disabled={!fileUrl} className="text-slate-300 hover:text-white hover:bg-white/10" title="Open in new tab">
                <ExternalLink className="w-5 h-5" />
            </Button>
             <Popover>
                <PopoverTrigger asChild>
                    <Button variant='default' className='rounded-full' disabled={!fileUrl}>
                        <Share2 className="w-5 h-5 mr-2" />
                        Share
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 border-slate-700 rounded-xl bg-slate-800 text-white shadow-lg mr-4">
                    <div className="grid gap-4">
                        <div className="space-y-2">
                            <h4 className="font-medium leading-none">Share File</h4>
                            <p className="text-sm text-slate-400">
                                Anyone with this link can view the file.
                            </p>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Input defaultValue={fileUrl} readOnly className="h-8"/>
                            <Button size="sm" className="px-3" onClick={handleCopyLink}>
                                <span className="sr-only">Copy</span>
                                <Share2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto flex items-center justify-center">
            {loading && <div className="w-full h-full flex items-center justify-center"><Skeleton className="h-64 w-96"/></div>}
            {!loading && fileUrl && <FilePreview url={fileUrl} mime={item.metadata?.mime ?? 'application/octet-stream'} itemName={item.name} />}
            {!loading && !fileUrl && (
              <div className="flex flex-col items-center justify-center h-full text-center text-slate-300 bg-slate-800/50 rounded-lg p-8">
                  <p className="text-xl mb-3">File content not available.</p>
                  <p className="text-sm text-slate-400">The file could not be loaded. It might have been deleted or there was a network issue.</p>
              </div>
            )}
        </div>

      </DialogContent>
    </Dialog>
  );
}

    