
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
import { X, Download, Share2, File as FileIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Input } from './ui/input';
import { useToast } from '@/hooks/use-toast';
import { getStorage, ref, getDownloadURL } from 'firebase/storage';
import { useFirebase } from '@/firebase/provider';
import { Skeleton } from './ui/skeleton';

export function FilePreviewModal({ item, onOpenChange }: { item: Content | null, onOpenChange: (open: boolean) => void }) {
  const { app } = useFirebase();
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!item || item.type !== 'FILE' || !item.metadata?.storagePath) {
        setFileUrl(null);
        setLoading(false);
        return;
    };
    
    setLoading(true);
    const storage = getStorage(app);
    const fileRef = ref(storage, item.metadata.storagePath);
    getDownloadURL(fileRef)
      .then(url => {
        setFileUrl(url)
      })
      .catch(error => {
        console.error("Error getting file URL:", error);
        toast({ variant: 'destructive', title: 'Error', description: "Could not load file from storage." });
        setFileUrl(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [item, app, toast]);


  if (!item) return null;

  const handleDownload = () => {
    if (fileUrl) {
        const link = document.createElement('a');
        link.href = fileUrl;
        link.download = item.name;
        link.target = '_blank'; // Open in new tab for direct download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
  }

  const handleClose = () => {
    onOpenChange(false);
  }

  const handleCopyLink = () => {
    const link = window.location.href;
    navigator.clipboard.writeText(link).then(() => {
        toast({
            title: "Link Copied!",
            description: "The link to this page has been copied to your clipboard.",
        })
    }).catch(err => {
        console.error('Failed to copy: ', err);
        toast({
            variant: "destructive",
            title: "Failed to Copy",
            description: "Could not copy the link to your clipboard.",
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
            <Button variant="ghost" size="icon" onClick={handleDownload} disabled={!fileUrl} className="text-slate-300 hover:text-white hover:bg-white/10">
                <Download className="w-5 h-5" />
            </Button>
             <Popover>
                <PopoverTrigger asChild>
                    <Button variant='default' className='rounded-full'>
                        <Share2 className="w-5 h-5 mr-2" />
                        Share
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 border-slate-700 rounded-xl bg-slate-800 text-white shadow-lg mr-4">
                    <div className="grid gap-4">
                        <div className="space-y-2">
                            <h4 className="font-medium leading-none">Copy Link</h4>
                            <p className="text-sm text-slate-400">
                                Anyone with the link can view this page.
                            </p>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Input
                                value={typeof window !== 'undefined' ? window.location.href : ''}
                                readOnly
                                className="h-9 bg-slate-700 border-slate-600"
                            />
                            <Button onClick={handleCopyLink} size="sm" className="px-3">
                                <span className="sr-only">Copy</span>
                                Copy
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
                  <p className="text-sm text-slate-400">The file could not be loaded from storage. It might have been deleted or there was a network issue.</p>
              </div>
            )}
        </div>

      </DialogContent>
    </Dialog>
  );
}

    