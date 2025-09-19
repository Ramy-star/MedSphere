'use client';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, FileText } from 'lucide-react';
import type { MedicalFile } from '@/lib/mock-data';
import { TagSuggester } from './tag-suggester';

interface PreviewModalProps {
  file: MedicalFile;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PreviewModal({ file, isOpen, onOpenChange }: PreviewModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card sm:max-w-[800px] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="font-headline text-2xl text-highlight">{file.title}</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {file.subject} - {file.year}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
          <div className="relative aspect-video w-full rounded-lg overflow-hidden border border-glass-border">
            <Image
              src={file.thumbnailUrl.replace('/600/400', '/800/600')}
              alt={file.title}
              fill
              className="object-cover"
              data-ai-hint={file.imageHint}
            />
          </div>
          <div className="flex flex-col space-y-4">
             <div>
                <h4 className="font-semibold text-highlight mb-2">File Content</h4>
                <div className="max-h-48 overflow-y-auto rounded-md border border-glass-border bg-black/20 p-3 text-sm text-muted-foreground">
                    <p>{file.content}</p>
                </div>
            </div>
            <TagSuggester fileContent={file.content} />
          </div>
        </div>
        <DialogFooter className="bg-black/20 p-6 flex-row justify-end space-x-2 rounded-b-lg">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
          <Button className="btn-gradient" asChild>
            <a href={file.fileUrl} download>
              <Download className="mr-2 h-4 w-4" /> Download Original
            </a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
