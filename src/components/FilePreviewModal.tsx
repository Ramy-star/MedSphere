
'use client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from './ui/button';
import FilePreview from './FilePreview';
import type { Content } from '@/lib/contentService';
import { getFile } from '@/lib/indexedDBService';
import { useEffect, useState } from 'react';

export function FilePreviewModal({ item, onOpenChange }: { item: Content | null, onOpenChange: (open: boolean) => void }) {
  const [fileUrl, setFileUrl] = useState<string>('#');
  const [fileHandle, setFileHandle] = useState<File | null>(null);

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
    if (fileUrl !== '#' && fileHandle) {
        const link = document.createElement('a');
        link.href = fileUrl;
        link.download = fileHandle.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
  }

  return (
    <Dialog open={!!item} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 border-slate-700 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 backdrop-blur-lg shadow-lg shadow-blue-500/10 text-white">
        <DialogHeader className="p-4 border-b border-slate-800">
          <DialogTitle className="truncate">{item.name}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-auto p-4">
           <FilePreview url={fileUrl} mime={item.metadata?.mime ?? 'application/octet-stream'} />
        </div>
        <DialogFooter className="p-4 border-t border-slate-800">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
          <Button onClick={handleDownload} disabled={!fileHandle}>Download</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
