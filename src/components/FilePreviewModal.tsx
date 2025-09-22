
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
import { getFile } from '@/lib/indexedDBService';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { X, Download, Share2, File as FileIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Input } from './ui/input';
import { useToast } from '@/hooks/use-toast';

export function FilePreviewModal({ item, onOpenChange }: { item: Content | null, onOpenChange: (open: boolean) => void }) {
  const [fileUrl, setFileUrl] = useState<string>('#');
  const { toast } = useToast();

  useEffect(() => {
    if (!item || item.type !== 'FILE') {
        setFileUrl('#');
        return;
    };

    let objectUrl: string | null = null;

    const loadFile = async () => {
        const file = await getFile(item.id);
        if (file) {
            objectUrl = URL.createObjectURL(file);
            setFileUrl(objectUrl);
        } else {
            if (item.metadata?.mime?.startsWith('image/')) {
                setFileUrl(`https://picsum.photos/seed/${item.id}/1280/720`);
            } else {
                setFileUrl('#');
            }
        }
    };

    loadFile();

    return () => {
        if (objectUrl) {
            URL.revokeObjectURL(objectUrl);
        }
    };
  }, [item]);


  if (!item) return null;

  const handleDownload = () => {
    const urlToDownload = fileUrl === '#' && item?.metadata?.mime?.startsWith('image/') 
        ? `https://picsum.photos/seed/${item.id}/1280/720` 
        : fileUrl;
        
    if (urlToDownload !== '#') {
        const link = document.createElement('a');
        link.href = urlToDownload;
        link.download = item.name;
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
        className={cn(
            "fixed inset-0 w-screen h-screen max-w-full max-h-full rounded-none p-0 flex flex-col",
            "bg-slate-900/80 backdrop-blur-sm"
        )}
        hideCloseButton={true}
      >
        <DialogHeader className='sr-only'>
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
            <Button variant="ghost" size="icon" onClick={handleDownload} disabled={fileUrl === '#'} className="text-slate-300 hover:text-white hover:bg-white/10">
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
        <div className="flex-1 overflow-auto p-4 md:p-8 flex items-center justify-center">
           <FilePreview url={fileUrl} mime={item.metadata?.mime ?? 'application/octet-stream'} itemName={item.name} />
        </div>

         {/* Footer could go here if needed for PDF controls etc. */}
      </DialogContent>
    </Dialog>
  );
}
