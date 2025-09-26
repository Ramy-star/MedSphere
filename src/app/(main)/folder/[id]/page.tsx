
'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { FolderGrid } from '@/components/FolderGrid';
import FileExplorerHeader from '@/components/FileExplorerHeader';
import { Content, contentService } from '@/lib/contentService';
import { allSubjectIcons } from '@/lib/file-data';
import { notFound } from 'next/navigation';
import { LucideIcon, Folder, Calendar } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useDoc } from '@/firebase/firestore/use-doc';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '@/hooks/use-toast';
import { UploadingFile, UploadCallbacks } from '@/components/UploadProgress';

function FolderPageContent({ id }: { id: string }) {
  const { data: current, loading: loadingCurrent } = useDoc<Content>('content', id);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const { toast } = useToast();
  
  useEffect(() => {
    if (!loadingCurrent && !current) {
        notFound();
    }
  }, [loadingCurrent, current]);

  const processFileUpload = useCallback((file: File) => {
    if (!current) return;

    const uploadId = uuidv4();
    const newUploadingFile: UploadingFile = {
        id: uploadId,
        name: file.name,
        size: file.size,
        progress: 0,
        status: 'uploading',
    };

    setUploadingFiles(prev => [...prev, newUploadingFile]);
    
    const callbacks: UploadCallbacks = {
        onProgress: (progress) => {
            setUploadingFiles(prev => prev.map(f => f.id === uploadId ? { ...f, progress } : f));
        },
        onSuccess: (content) => {
            setUploadingFiles(prev => prev.map(f => f.id === uploadId ? { ...f, progress: 100, status: 'success' } : f));
            toast({ title: "Upload Complete", description: `"${content.name}" has been uploaded.` });
            setTimeout(() => {
                setUploadingFiles(prev => prev.filter(f => f.id !== uploadId));
            }, 2000);
        },
        onError: (error) => {
            console.error("Upload failed in component:", error);
            setUploadingFiles(prev => prev.map(f => f.id === uploadId ? { ...f, status: 'error' } : f));
            toast({
                variant: 'destructive',
                title: 'Upload Failed',
                description: `Could not upload ${file.name}. Please try again.`
            })
        }
    };
    
    contentService.uploadFile(current.id, file, callbacks);
  }, [current, toast]);
  
  if (loadingCurrent || !current) {
      return <main className="flex-1 p-4 md:p-6 glass-card flex flex-col h-full overflow-hidden">
        <div className="mb-6 space-y-4">
            <Skeleton className="h-5 w-1/3" />
            <div className="flex items-center justify-between min-h-[40px]">
                <div className="flex items-center gap-4">
                    <Skeleton className="w-10 h-10 rounded-lg" />
                    <Skeleton className="h-8 w-48" />
                </div>
            </div>
        </div>
        <div className="relative flex-1 overflow-y-auto mt-4 pr-2 -mr-2 space-y-2">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
        </div>
      </main>
  }

  let Icon: LucideIcon = Folder;
  let iconColor = 'text-yellow-400';

  if (current.type === 'SUBJECT' && current.iconName) {
      Icon = allSubjectIcons[current.iconName] || Folder;
      iconColor = current.color || 'text-yellow-400';
  } else if (current.type === 'SEMESTER') {
      Icon = Calendar;
      iconColor = 'text-green-400';
  }

  const extendedCurrent = {
      ...current,
      icon: Icon,
      iconColor: iconColor
  }

  return (
    <main className="flex-1 p-4 md:p-6 glass-card flex flex-col h-full overflow-hidden">
       <FileExplorerHeader currentFolder={extendedCurrent} onFileSelected={processFileUpload} />
       <div className="relative flex-1 overflow-y-auto mt-4 pr-2 -mr-2">
          <FolderGrid parentId={id} uploadingFiles={uploadingFiles} setUploadingFiles={setUploadingFiles} onFileSelected={processFileUpload} />
       </div>
    </main>
  );
}


function FolderPage({ params }: { params: { id: string } }) {
  const { id } = params;

  return (
    <Suspense fallback={
        <main className="flex-1 p-4 md:p-6 glass-card flex flex-col h-full overflow-hidden">
            <div className="mb-6 space-y-4">
                <Skeleton className="h-5 w-1/3" />
                <div className="flex items-center justify-between min-h-[40px]">
                    <div className="flex items-center gap-4">
                        <Skeleton className="w-10 h-10 rounded-lg" />
                        <Skeleton className="h-8 w-48" />
                    </div>
                </div>
            </div>
            <div className="relative flex-1 overflow-y-auto mt-4 pr-2 -mr-2 space-y-2">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
            </div>
        </main>
    }>
        <FolderPageContent id={id} />
    </Suspense>
  );
}


export default FolderPage;
