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
import type { ContentItem } from '@/lib/contentService';

export function FilePreviewModal({ item, onOpenChange }: { item: ContentItem | null, onOpenChange: (open: boolean) => void }) {
  if (!item) return null;

  // For mock purposes, we'll generate a placeholder URL.
  // In a real app, this would be a signed URL from your storage service.
  const getPreviewUrl = (item: ContentItem) => {
    if (item.metadata?.mime?.startsWith('image/')) {
      // Use a placeholder image service
      return `https://picsum.photos/seed/${item.id}/800/600`;
    }
    // For other types, we don't have content, so we'll just return a dummy link.
    return `#`;
  }
  
  const url = getPreviewUrl(item);

  return (
    <Dialog open={!!item} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 border-slate-700 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 backdrop-blur-lg shadow-lg shadow-blue-500/10 text-white">
        <DialogHeader className="p-4 border-b border-slate-800">
          <DialogTitle className="truncate">{item.name}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-auto p-4">
           <FilePreview url={url} mime={item.metadata?.mime ?? 'application/octet-stream'} />
        </div>
        <DialogFooter className="p-4 border-t border-slate-800">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
          <Button>Download</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
