
'use client';

import { useEffect, useState, useCallback, Suspense, use } from 'react';
import { FolderGrid } from '@/components/FolderGrid';
import FileExplorerHeader from '@/components/FileExplorerHeader';
import { Content, contentService } from '@/lib/contentService';
import { allSubjectIcons } from '@/lib/file-data';
import { notFound } from 'next/navigation';
import { LucideIcon, Folder, Calendar } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useDoc } from '@/firebase/firestore/use-doc';
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

  const processFileUpload = useCallback(async (file: File) => {
    if (!current) return;

    // With IndexedDB, the "upload" is instant, so we can skip the progress UI
    // and just show a success message.
    const callbacks = {
        onSuccess: (content: Content) => {
            toast({ title: "File Saved", description: `"${content.name}" has been saved to your browser.` });
        },
        onError: (error: Error) => {
            console.error("Save failed in component:", error);
            toast({
                variant: 'destructive',
                title: 'Save Failed',
                description: `Could not save ${file.name}. Please try again.`
            })
        }
    };
    
    await contentService.createFile(current.id, file, callbacks);
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
          {/* We pass an empty array for uploadingFiles as IndexedDB is instant */}
          <FolderGrid parentId={id} uploadingFiles={[]} setUploadingFiles={() => {}} onFileSelected={processFileUpload} />
       </div>
    </main>
  );
}


function FolderPage({ params }: { params: { id: string } }) {
  const { id } = use(params);

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
