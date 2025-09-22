'use client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from './ui/button';
import FilePreview from './FilePreview';
import type { Content } from '@/lib/contentService';
import { getFile } from '@/lib/indexedDBService';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Maximize, Minimize, X } from 'lucide-react';
import { Separator } from './ui/separator';

export function FilePreviewModal({ item, onOpenChange }: { item: Content | null, onOpenChange: (open: boolean) => void }) {
  const [fileUrl, setFileUrl] = useState<string>('#');
  const [fileHandle, setFileHandle] = useState<File | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);

  useEffect(() => {
    if (!item || item.type !== 'FILE') {
        setFileUrl('#');
        setFileHandle(null);
        return;
    };

    let objectUrl: string | null = null;

    const loadFile = async () => {
        const file = await getFile(item.id);
        if (file) {
            objectUrl = URL.createObjectURL(file);
            setFileUrl(objectUrl);
            setFileHandle(file);
        } else {
             // Fallback for files without content in IndexedDB (e.g. seeded data)
            if (item.metadata?.mime?.startsWith('image/')) {
                setFileUrl(`https://picsum.photos/seed/${item.id}/800/600`);
            } else {
                setFileUrl('#');
            }
            setFileHandle(null);
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
    const urlToDownload = fileUrl === '#' && item?.metadata?.mime?.startsWith('image/') ? `https://picsum.photos/seed/${item.id}/800/600` : fileUrl;
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
    setIsFullScreen(false); // Reset fullscreen state on close
  }

  return (
    <Dialog open={!!item} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent 
        className={cn(
            "flex flex-col p-0 border-slate-700 shadow-lg shadow-blue-500/10 text-white transition-all duration-300 ease-in-out",
            isFullScreen 
                ? "fixed inset-0 w-full h-full max-w-full max-h-full rounded-none bg-slate-950 z-[9999]" 
                : "max-w-4xl h-[80vh] rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950"
        )}
        hideCloseButton={true}
      >
        <DialogHeader className="p-4 border-b border-slate-800 flex flex-row items-center justify-between shrink-0">
          <DialogTitle className="truncate">{item.name}</DialogTitle>
          <div className='flex items-center gap-2'>
            <Button variant="ghost" size="icon" onClick={() => setIsFullScreen(!isFullScreen)} className="text-slate-300 hover:text-white hover:bg-white/10">
                {isFullScreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </Button>
             <Separator orientation='vertical' className='h-6 bg-slate-700 mx-2' />
            <DialogClose asChild>
                <Button variant="ghost" size="icon" onClick={handleClose} className="text-slate-300 hover:text-white hover:bg-white/10">
                    <X className="w-5 h-5" />
                </Button>
            </DialogClose>
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-auto p-4">
           <FilePreview url={fileUrl} mime={item.metadata?.mime ?? 'application/octet-stream'} itemName={item.name} />
        </div>
        <DialogFooter className="p-4 border-t border-slate-800 bg-slate-900/50 rounded-b-2xl shrink-0">
          <Button variant="ghost" onClick={handleClose}>Close</Button>
          <Button onClick={handleDownload} disabled={fileUrl === '#'}>Download</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
