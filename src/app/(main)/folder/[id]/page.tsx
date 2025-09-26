
'use client';

import { useEffect, useState, useCallback, Suspense, use } from 'react';
import { FolderGrid } from '@/components/FolderGrid';
import FileExplorerHeader from '@/components/FileExplorerHeader';
import { Content } from '@/lib/contentService';
import { allSubjectIcons } from '@/lib/file-data';
import { notFound } from 'next/navigation';
import { LucideIcon, Folder, Calendar } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useCollection } from '@/firebase/firestore/use-collection';


function FolderPageContent({ id }: { id: string }) {
  const { data: current, loading: loadingCurrent } = useDoc<Content>('content', id);
  
  // This hook is not ideal for fetching a single document (the parent).
  // A dedicated `useDoc` for the parent would be better if we needed more than just the name for a breadcrumb.
  // For simplicity, we'll rely on the breadcrumb component's own fetching logic.
  
  useEffect(() => {
    if (!loadingCurrent && !current) {
        notFound();
    }
  }, [loadingCurrent, current]);


  const fetchFolderData = useCallback(async () => {
    // This function is kept for prop consistency but is now managed by hooks.
  }, []);
  
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
       <FileExplorerHeader currentFolder={extendedCurrent} onContentAdded={fetchFolderData} />
       <div className="relative flex-1 overflow-y-auto mt-4 pr-2 -mr-2">
          <FolderGrid parentId={id} onContentAdded={fetchFolderData} />
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
