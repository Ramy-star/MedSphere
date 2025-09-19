'use client';
import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Eye } from 'lucide-react';
import type { MedicalFile } from '@/lib/mock-data';

interface FileCardProps {
  file: MedicalFile;
  onPreview: (file: MedicalFile) => void;
}

export function FileCard({ file, onPreview }: FileCardProps) {
  return (
    <div className="group relative transition-transform duration-300 ease-in-out hover:!scale-105">
      <Card className="glass-card overflow-hidden h-full flex flex-col">
        <CardHeader className="p-0">
          <div className="relative h-40 w-full">
            <Image
              src={file.thumbnailUrl}
              alt={file.title}
              fill
              className="object-cover"
              data-ai-hint={file.imageHint}
            />
          </div>
        </CardHeader>
        <CardContent className="flex-grow p-4">
          <CardTitle className="font-headline text-lg text-highlight mb-2 truncate" title={file.title}>
            {file.title}
          </CardTitle>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>Type: {file.metadata.type}</p>
            <p>Size: {file.metadata.size}</p>
          </div>
        </CardContent>
        <CardFooter className="p-4 pt-0 flex gap-2">
          <Button onClick={() => onPreview(file)} className="w-full btn-gradient">
            <Eye className="mr-2 h-4 w-4" /> Preview
          </Button>
          <Button variant="outline" className="w-full btn-outline-neon" asChild>
            <a href={file.fileUrl} download>
              <Download className="mr-2 h-4 w-4" /> Download
            </a>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
